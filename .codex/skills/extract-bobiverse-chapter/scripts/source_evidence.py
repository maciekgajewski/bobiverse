#!/usr/bin/env python3
"""Prepare and verify transient evidence for Bobiverse chapter extraction."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path
from typing import Any


FILENAME_RE = re.compile(
    r"^(?P<book>[1-9][0-9]*)\.(?P<chapter>[1-9][0-9]*)"
    r"(?: - (?P<title>.+))?\.txt$"
)
CHAPTER_RE = re.compile(r"^[1-9][0-9]*\.[1-9][0-9]*$")
CONFIDENCE_VALUES = {"high", "medium", "low"}
RESERVED_DRAFT_KEYS = {"format_version", "sealed", "source"}


class EvidenceError(ValueError):
    """A human-actionable source or evidence error."""


def read_utf8(source: Path) -> tuple[bytes, str]:
    try:
        data = source.read_bytes()
    except OSError as error:
        raise EvidenceError(f"Could not read source file: {error}") from error
    try:
        return data, data.decode("utf-8")
    except UnicodeDecodeError as error:
        raise EvidenceError(
            f"Source must be valid UTF-8; decoding failed at byte {error.start}."
        ) from error


def parse_chapter(chapter: str) -> tuple[int, int]:
    if not CHAPTER_RE.fullmatch(chapter):
        raise EvidenceError(
            f'Chapter must use positive "book.chapter" form, got: {chapter!r}.'
        )
    book_text, chapter_text = chapter.split(".", 1)
    return int(book_text), int(chapter_text)


def metadata_for(source: Path, chapter: str) -> tuple[dict[str, Any], bytes, str]:
    expected_book, expected_chapter = parse_chapter(chapter)
    match = FILENAME_RE.fullmatch(source.name)
    if not match:
        raise EvidenceError(
            "Source filename must be <book>.<chapter>.txt or "
            "<book>.<chapter> - <source title>.txt."
        )
    actual_book = int(match.group("book"))
    actual_chapter = int(match.group("chapter"))
    if (actual_book, actual_chapter) != (expected_book, expected_chapter):
        raise EvidenceError(
            f"Explicit chapter {chapter} does not match source filename "
            f"{actual_book}.{actual_chapter}."
        )
    source_title = match.group("title")
    if source_title is not None:
        source_title = source_title.strip()
        if not source_title:
            raise EvidenceError("Source title in filename must not be blank.")
    data, text = read_utf8(source)
    chapter_number = str(actual_chapter)
    canonical_title = (
        f"{chapter_number} - {source_title}" if source_title else chapter_number
    )
    metadata = {
        "chapter": chapter,
        "chapter_number": chapter_number,
        "source_file": source.name,
        "source_title": source_title,
        "canonical_title": canonical_title,
        "source_sha256": hashlib.sha256(data).hexdigest(),
        "byte_length": len(data),
    }
    return metadata, data, text


def align_boundary(data: bytes, index: int) -> int:
    index = min(max(index, 0), len(data))
    while index < len(data) and index > 0 and data[index] & 0xC0 == 0x80:
        index -= 1
    return index


def chunk_ranges(
    data: bytes, chunk_bytes: int, overlap_bytes: int
) -> list[tuple[int, int]]:
    if chunk_bytes < 256:
        raise EvidenceError("--chunk-bytes must be at least 256.")
    if overlap_bytes < 0 or overlap_bytes >= chunk_bytes:
        raise EvidenceError(
            "--overlap-bytes must be nonnegative and smaller than --chunk-bytes."
        )
    if not data:
        return [(0, 0)]
    ranges: list[tuple[int, int]] = []
    start = 0
    while start < len(data):
        end = align_boundary(data, min(start + chunk_bytes, len(data)))
        if end <= start:
            raise EvidenceError("Could not produce a valid UTF-8 chunk boundary.")
        ranges.append((start, end))
        if end == len(data):
            break
        next_start = align_boundary(data, max(end - overlap_bytes, start + 1))
        if next_start <= start:
            raise EvidenceError("Chunk overlap prevented forward progress.")
        start = next_start
    return ranges


def emit_json(value: Any, output: Path | None) -> None:
    serialized = json.dumps(value, indent=2, ensure_ascii=False) + "\n"
    if output is None:
        sys.stdout.write(serialized)
        return
    output.write_text(serialized, encoding="utf-8")


def load_json(path: Path, label: str) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except OSError as error:
        raise EvidenceError(f"Could not read {label}: {error}") from error
    except json.JSONDecodeError as error:
        raise EvidenceError(
            f"{label} is not valid JSON at line {error.lineno}, column {error.colno}."
        ) from error


def command_metadata(arguments: argparse.Namespace) -> None:
    metadata, _, _ = metadata_for(arguments.source, arguments.chapter)
    emit_json(metadata, arguments.output)


def command_manifest(arguments: argparse.Namespace) -> None:
    metadata, data, _ = metadata_for(arguments.source, arguments.chapter)
    ranges = chunk_ranges(data, arguments.chunk_bytes, arguments.overlap_bytes)
    manifest = {
        "source": metadata,
        "chunk_bytes": arguments.chunk_bytes,
        "overlap_bytes": arguments.overlap_bytes,
        "chunks": [
            {
                "chunk_id": f"chunk:{index:03d}",
                "start_byte": start,
                "end_byte": end,
            }
            for index, (start, end) in enumerate(ranges, start=1)
        ],
    }
    emit_json(manifest, arguments.output)


def command_chunk(arguments: argparse.Namespace) -> None:
    metadata, data, _ = metadata_for(arguments.source, arguments.chapter)
    ranges = chunk_ranges(data, arguments.chunk_bytes, arguments.overlap_bytes)
    if arguments.index < 1 or arguments.index > len(ranges):
        raise EvidenceError(
            f"--index must be between 1 and {len(ranges)}, got {arguments.index}."
        )
    start, end = ranges[arguments.index - 1]
    value = {
        "source_sha256": metadata["source_sha256"],
        "chunk_id": f"chunk:{arguments.index:03d}",
        "start_byte": start,
        "end_byte": end,
        "text": data[start:end].decode("utf-8"),
    }
    emit_json(value, arguments.output)


def find_occurrences(data: bytes, quote: bytes) -> list[int]:
    positions: list[int] = []
    offset = 0
    while True:
        found = data.find(quote, offset)
        if found < 0:
            return positions
        positions.append(found)
        offset = found + 1


def validate_draft(draft: Any, chapter: str, source_sha256: str) -> list[dict[str, Any]]:
    if not isinstance(draft, dict):
        raise EvidenceError("Draft ledger must be a JSON object.")
    reserved_keys = sorted(RESERVED_DRAFT_KEYS.intersection(draft))
    if reserved_keys:
        raise EvidenceError(
            "Draft ledger must not define reserved sealed fields: "
            f"{', '.join(reserved_keys)}."
        )
    if draft.get("chapter") != chapter:
        raise EvidenceError("Draft ledger chapter does not match the explicit chapter.")
    if draft.get("source_sha256") != source_sha256:
        raise EvidenceError("Draft ledger source fingerprint does not match the source.")
    claims = draft.get("claims")
    if not isinstance(claims, list) or not claims:
        raise EvidenceError("Draft ledger claims must be a nonempty array.")
    seen_ids: set[str] = set()
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict):
            raise EvidenceError(f"Claim {index + 1} must be an object.")
        claim_id = claim.get("claim_id")
        if not isinstance(claim_id, str) or not claim_id:
            raise EvidenceError(f"Claim {index + 1} requires a nonempty claim_id.")
        if claim_id in seen_ids:
            raise EvidenceError(f"Duplicate claim_id: {claim_id}.")
        seen_ids.add(claim_id)
        if not isinstance(claim.get("claim_type"), str) or not claim["claim_type"]:
            raise EvidenceError(f"{claim_id} requires a nonempty claim_type.")
        if not isinstance(claim.get("statement"), str) or not claim["statement"]:
            raise EvidenceError(f"{claim_id} requires a nonempty statement.")
        if claim.get("confidence") not in CONFIDENCE_VALUES:
            raise EvidenceError(
                f"{claim_id} confidence must be high, medium, or low."
            )
        evidence = claim.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            raise EvidenceError(f"{claim_id} requires nonempty evidence.")
    return claims


def seal_evidence_item(
    data: bytes,
    claim_id: str,
    raw_evidence: Any,
    evidence_id: str,
) -> dict[str, Any]:
    if not isinstance(raw_evidence, dict):
        raise EvidenceError(f"{claim_id} evidence entries must be objects.")
    quote = raw_evidence.get("quote")
    if not isinstance(quote, str) or not quote:
        raise EvidenceError(f"{claim_id} evidence requires a nonempty exact quote.")
    quote_bytes = quote.encode("utf-8")
    occurrences = find_occurrences(data, quote_bytes)
    if not occurrences:
        raise EvidenceError(f"{claim_id} evidence quote was not found exactly.")
    occurrence = raw_evidence.get("occurrence")
    if occurrence is None:
        if len(occurrences) != 1:
            raise EvidenceError(
                f"{claim_id} evidence quote occurs "
                f"{len(occurrences)} times; specify occurrence."
            )
        occurrence = 1
    if not isinstance(occurrence, int) or isinstance(occurrence, bool):
        raise EvidenceError(f"{claim_id} evidence occurrence must be an integer.")
    if occurrence < 1 or occurrence > len(occurrences):
        raise EvidenceError(
            f"{claim_id} evidence occurrence must be between "
            f"1 and {len(occurrences)}."
        )
    start = occurrences[occurrence - 1]
    return {
        "evidence_id": evidence_id,
        "start_byte": start,
        "end_byte": start + len(quote_bytes),
    }


def command_seal(arguments: argparse.Namespace) -> None:
    metadata, data, _ = metadata_for(arguments.source, arguments.chapter)
    draft = load_json(arguments.draft, "draft ledger")
    claims = validate_draft(draft, arguments.chapter, metadata["source_sha256"])
    sealed_claims: list[dict[str, Any]] = []
    evidence_counter = 0
    evidence_errors: list[str] = []
    for claim in claims:
        sealed_evidence: list[dict[str, Any]] = []
        for raw_evidence in claim["evidence"]:
            evidence_counter += 1
            try:
                sealed_evidence.append(
                    seal_evidence_item(
                        data,
                        claim["claim_id"],
                        raw_evidence,
                        f"evidence:{evidence_counter:03d}",
                    )
                )
            except EvidenceError as error:
                evidence_errors.append(str(error))
        sealed_claim = dict(claim)
        sealed_claim["evidence"] = sealed_evidence
        sealed_claims.append(sealed_claim)
    if evidence_errors:
        raise EvidenceError("; ".join(evidence_errors))
    passthrough = {
        key: value
        for key, value in draft.items()
        if key
        not in {
            "chapter",
            "source_sha256",
            "claims",
            *RESERVED_DRAFT_KEYS,
        }
    }
    sealed = {
        "format_version": 1,
        "sealed": True,
        "source": metadata,
        **passthrough,
        "claims": sealed_claims,
    }
    emit_json(sealed, arguments.output)


def safe_context_range(data: bytes, start: int, end: int) -> tuple[int, int]:
    start = max(start, 0)
    end = min(end, len(data))
    while start < end and data[start] & 0xC0 == 0x80:
        start += 1
    while end > start and end < len(data) and data[end] & 0xC0 == 0x80:
        end -= 1
    return start, end


def command_review(arguments: argparse.Namespace) -> None:
    metadata, data, _ = metadata_for(arguments.source, arguments.chapter)
    ledger = load_json(arguments.ledger, "sealed ledger")
    if not isinstance(ledger, dict) or ledger.get("sealed") is not True:
        raise EvidenceError("Review requires a sealed ledger.")
    source = ledger.get("source")
    if not isinstance(source, dict):
        raise EvidenceError("Sealed ledger is missing source metadata.")
    if source.get("source_sha256") != metadata["source_sha256"]:
        raise EvidenceError("Sealed ledger fingerprint does not match the source.")
    claims = ledger.get("claims")
    if not isinstance(claims, list):
        raise EvidenceError("Sealed ledger claims must be an array.")
    rendered: list[dict[str, Any]] = []
    for claim in claims:
        if not isinstance(claim, dict):
            raise EvidenceError("Sealed ledger contains an invalid claim.")
        if arguments.claim_id and claim.get("claim_id") != arguments.claim_id:
            continue
        evidence_items: list[dict[str, Any]] = []
        for evidence in claim.get("evidence", []):
            if not isinstance(evidence, dict):
                raise EvidenceError("Sealed evidence must be an object.")
            start = evidence.get("start_byte")
            end = evidence.get("end_byte")
            if (
                not isinstance(start, int)
                or isinstance(start, bool)
                or not isinstance(end, int)
                or isinstance(end, bool)
                or start < 0
                or end < start
                or end > len(data)
            ):
                raise EvidenceError("Sealed evidence byte range is invalid.")
            context_start, context_end = safe_context_range(
                data,
                start - arguments.context_bytes,
                end + arguments.context_bytes,
            )
            evidence_items.append(
                {
                    **evidence,
                    "excerpt": data[start:end].decode("utf-8"),
                    "context_start_byte": context_start,
                    "context_end_byte": context_end,
                    "context": data[context_start:context_end].decode("utf-8"),
                }
            )
        rendered.append(
            {
                "claim_id": claim.get("claim_id"),
                "statement": claim.get("statement"),
                "confidence": claim.get("confidence"),
                "evidence": evidence_items,
            }
        )
    if arguments.claim_id and not rendered:
        raise EvidenceError(f"Claim not found: {arguments.claim_id}.")
    emit_json({"source": metadata, "claims": rendered}, arguments.output)


def chapter_key(chapter: str) -> tuple[int, int]:
    return parse_chapter(chapter)


def command_prepare_corpus(arguments: argparse.Namespace) -> None:
    repository_root = arguments.repository_root.resolve()
    output_root = arguments.output_root.resolve()
    if output_root == repository_root or output_root.is_relative_to(repository_root):
        raise EvidenceError("Temporary corpus root must be outside the repository.")
    if output_root.exists():
        raise EvidenceError("Temporary corpus root already exists; choose a new path.")
    candidate = load_json(arguments.candidate, "candidate chapter")
    if not isinstance(candidate, dict) or candidate.get("chapter") != arguments.chapter:
        raise EvidenceError("Candidate chapter does not match the explicit chapter.")
    narrative_root = repository_root / "data" / "narrative"
    shutil.copytree(narrative_root / "baseline", output_root / "baseline")
    shutil.copy2(narrative_root / "assets.json", output_root / "assets.json")
    shutil.copy2(narrative_root / "books.json", output_root / "books.json")
    target_key = chapter_key(arguments.chapter)
    copied_prior: list[str] = []
    chapters_root = narrative_root / "chapters"
    if chapters_root.exists():
        for chapter_file in sorted(chapters_root.glob("*/*.json")):
            relative = chapter_file.relative_to(chapters_root)
            candidate_id = f"{relative.parts[0]}.{chapter_file.stem}"
            try:
                candidate_key = chapter_key(candidate_id)
            except EvidenceError:
                continue
            if candidate_key >= target_key:
                continue
            destination = output_root / "chapters" / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(chapter_file, destination)
            copied_prior.append(candidate_id)
    book, chapter_number = arguments.chapter.split(".", 1)
    target = output_root / "chapters" / book / f"{chapter_number}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(arguments.candidate, target)
    emit_json(
        {
            "temporary_root": str(output_root),
            "candidate": arguments.chapter,
            "prior_chapters": copied_prior,
        },
        arguments.output,
    )


def add_source_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--chapter", required=True)
    parser.add_argument("--output", type=Path)


def add_chunk_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--chunk-bytes", type=int, default=6000)
    parser.add_argument("--overlap-bytes", type=int, default=512)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Fingerprint UTF-8 chapter sources, expose bounded chunks, seal exact "
            "evidence as byte ranges, render review excerpts, and prepare a temporary "
            "candidate corpus."
        )
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    metadata = subparsers.add_parser("metadata", help="Validate and fingerprint input.")
    add_source_arguments(metadata)
    metadata.set_defaults(handler=command_metadata)

    manifest = subparsers.add_parser(
        "manifest", help="List deterministic chunk byte ranges without source text."
    )
    add_source_arguments(manifest)
    add_chunk_arguments(manifest)
    manifest.set_defaults(handler=command_manifest)

    chunk = subparsers.add_parser("chunk", help="Render one bounded source chunk.")
    add_source_arguments(chunk)
    add_chunk_arguments(chunk)
    chunk.add_argument("--index", type=int, required=True)
    chunk.set_defaults(handler=command_chunk)

    seal = subparsers.add_parser(
        "seal", help="Resolve draft evidence excerpts to sealed byte ranges."
    )
    add_source_arguments(seal)
    seal.add_argument("--draft", type=Path, required=True)
    seal.set_defaults(handler=command_seal)

    review = subparsers.add_parser(
        "review", help="Render temporary excerpts from a sealed evidence ledger."
    )
    add_source_arguments(review)
    review.add_argument("--ledger", type=Path, required=True)
    review.add_argument("--claim-id")
    review.add_argument("--context-bytes", type=int, default=120)
    review.set_defaults(handler=command_review)

    prepare = subparsers.add_parser(
        "prepare-corpus",
        help="Create a temporary corpus containing prior chapters and a candidate.",
    )
    prepare.add_argument("--repository-root", type=Path, required=True)
    prepare.add_argument("--chapter", required=True)
    prepare.add_argument("--candidate", type=Path, required=True)
    prepare.add_argument("--output-root", type=Path, required=True)
    prepare.add_argument("--output", type=Path)
    prepare.set_defaults(handler=command_prepare_corpus)

    return parser


def main() -> int:
    parser = build_parser()
    arguments = parser.parse_args()
    try:
        arguments.handler(arguments)
    except EvidenceError as error:
        parser.exit(2, f"error: {error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
