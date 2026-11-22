"""Validate the ADR-0032 candidate-entity dataset.

The candidate file (`data/candidates/candidate-entities.json`) records minor
first mentions outside the narrative data. Only validation and extraction
tooling read it; the app never does. This script checks the file against its
schema and the narrative corpus (ADR-0032 §4).
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any, Iterable

from jsonschema import Draft202012Validator

from common import ROOT, normalize_astronomy_name, read_json

CANDIDATES_FILE = ROOT / "data" / "candidates" / "candidate-entities.json"
CANDIDATES_SCHEMA = ROOT / "data" / "schema" / "candidate-entities.schema.json"
NARRATIVE_ROOT = ROOT / "data" / "narrative"
MANIFEST_FILE = ROOT / "generated" / "narrative" / "chapter-manifest.json"
SOURCE_ROOT = ROOT / "src"

# The structural check (ADR-0032 §4, principle 2): no runtime path may read
# candidate data.
FORBIDDEN_REFERENCES = ("data/candidates", "candidate-entities")
# ADR-0016 anchor tooling: it derives narrative anchors from narrative data only.
ANCHOR_TOOLING = (
    ROOT / "scripts" / "common.py",
    ROOT / "scripts" / "astronomy_pipeline.py",
    ROOT / "scripts" / "extraction_preflight.py",
    ROOT / "scripts" / "generate_nearby_systems.py",
    ROOT / "scripts" / "refresh_gaia_snapshot.py",
    ROOT / "scripts" / "validate_data.py",
)
SOURCE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".html"}

_CHAPTER = re.compile(r"^([1-9][0-9]*)\.([1-9][0-9]*)$")


class CandidateError(Exception):
    pass


def chapter_order(chapter: str) -> tuple[int, int]:
    match = _CHAPTER.fullmatch(chapter)
    if match is None:
        raise CandidateError(f"invalid chapter reference {chapter!r}")
    return int(match.group(1)), int(match.group(2))


def catalogued(chapter: str, books: dict[str, Any]) -> bool:
    """A canonical chapter: inside the book catalogue (`books.json`).

    The chapter's data need not have landed yet: a candidate may name a
    catalogued chapter whose record is still on its way.
    """
    book, number = chapter_order(chapter)
    entry = books.get(str(book))
    return isinstance(entry, dict) and 1 <= number <= int(entry.get("chapter_count", 0))


def load_chapters(narrative_root: Path) -> list[dict[str, Any]]:
    chapters = [read_json(path) for path in (narrative_root / "chapters").glob("*/*.json")]
    return sorted(chapters, key=lambda chapter: chapter_order(chapter["chapter"]))


def _names(record: dict[str, Any]) -> Iterable[str]:
    name = record.get("name")
    if isinstance(name, str):
        yield name
    for alias in record.get("aliases", []) or []:
        if isinstance(alias, str):
            yield alias


def visible_names(
    narrative_root: Path, chapters: list[dict[str, Any]], through: str
) -> dict[str, str]:
    """Normalized name -> entity ID for every entity visible at `through`.

    Visible means seeded in the zero state or written by a chapter at or before
    `through` in reading order. Every name and alias an entity has held counts.
    """
    names: dict[str, str] = {}

    def record(entity: dict[str, Any], entity_id: str) -> None:
        for name in _names(entity):
            names.setdefault(normalize_astronomy_name(name), entity_id)

    def walk(location: dict[str, Any]) -> None:
        record(location, location.get("id", ""))
        for child in location.get("children", []) or []:
            if isinstance(child, dict):
                walk(child)

    zero_state = read_json(narrative_root / "baseline" / "zero-state.json")
    walk(zero_state["locations"])
    for entity in zero_state.get("entities", []):
        record(entity, entity.get("id", ""))
    limit = chapter_order(through)
    for chapter in chapters:
        if chapter_order(chapter["chapter"]) > limit:
            break
        for introduced in chapter.get("introducing", []) or []:
            if isinstance(introduced, dict):
                walk(introduced)
        for update in chapter.get("updates", []) or []:
            if isinstance(update, dict):
                record(update, update.get("entity_id", ""))
    return names


def anchor_names(narrative_root: Path, chapters: list[dict[str, Any]]) -> dict[str, str]:
    """Normalized name -> location ID for every narrative anchor (ADR-0016).

    An anchor is a narrative location that carries an `astronomy_object_id` in
    the zero state or in any chapter. Every name and alias it has held counts.
    """
    names: dict[str, set[str]] = {}
    anchored: set[str] = set()

    def note(location: dict[str, Any], location_id: str) -> None:
        names.setdefault(location_id, set()).update(_names(location))
        if location.get("astronomy_object_id"):
            anchored.add(location_id)

    def walk(location: dict[str, Any]) -> None:
        location_id = location.get("id")
        if isinstance(location_id, str) and location_id.startswith("location:"):
            note(location, location_id)
        for child in location.get("children", []) or []:
            if isinstance(child, dict):
                walk(child)

    walk(read_json(narrative_root / "baseline" / "zero-state.json")["locations"])
    for chapter in chapters:
        for introduced in chapter.get("introducing", []) or []:
            if isinstance(introduced, dict):
                walk(introduced)
        for update in chapter.get("updates", []) or []:
            target = update.get("entity_id") if isinstance(update, dict) else None
            if isinstance(target, str) and target.startswith("location:"):
                note(update, target)
    return {
        normalize_astronomy_name(name): location_id
        for location_id in sorted(anchored)
        for name in sorted(names.get(location_id, ()))
    }


def validate_candidates(
    document: Any,
    *,
    schema: dict[str, Any],
    narrative_root: Path,
) -> list[str]:
    errors = [
        f"{'/'.join(str(part) for part in error.absolute_path) or '(root)'}: {error.message}"
        for error in sorted(
            Draft202012Validator(schema).iter_errors(document),
            key=lambda error: list(error.absolute_path),
        )
    ]
    if errors:
        return errors

    books = read_json(narrative_root / "books.json")["books"]
    chapters = load_chapters(narrative_root)
    by_chapter = {chapter["chapter"]: chapter for chapter in chapters}
    candidates: list[dict[str, Any]] = document["candidates"]

    ids = [candidate["id"] for candidate in candidates]
    if ids != sorted(ids):
        errors.append("candidates must be sorted by id")
    duplicates = sorted({id_ for id_ in ids if ids.count(id_) > 1})
    if duplicates:
        errors.append(f"duplicate candidate ids: {', '.join(duplicates)}")

    anchors = anchor_names(narrative_root, chapters)
    promoted: dict[tuple[str, str], str] = {}
    for candidate in candidates:
        cid = candidate["id"]
        mentions: list[str] = candidate["mentions"]
        for chapter in mentions:
            if not catalogued(chapter, books):
                errors.append(f"{cid}: mention {chapter} is not a canonical chapter")
        orders = [chapter_order(chapter) for chapter in mentions]
        if orders != sorted(set(orders)):
            errors.append(f"{cid}: mentions must be in reading order without duplicates")
        first = mentions[0]
        visible = visible_names(narrative_root, chapters, first)
        for name in _names(candidate):
            match = visible.get(normalize_astronomy_name(name))
            if match is not None:
                errors.append(
                    f"{cid}: name {name!r} matches {match}, visible at {first}; "
                    "record a supplemental mention or an update instead"
                )

        promotion = candidate["promotion"]
        if promotion is None:
            # ADR-0032 §4: a candidate location never becomes a narrative anchor;
            # astronomy acquisition happens with its promotion chapter.
            if candidate["kind"] == "location":
                for name in _names(candidate):
                    anchor = anchors.get(normalize_astronomy_name(name))
                    if anchor is not None:
                        errors.append(
                            f"{cid}: unpromoted candidate location {name!r} matches "
                            f"narrative anchor {anchor}; promote it in the chapter "
                            "that acquires its astronomy instead"
                        )
            continue
        chapter, entity_id = promotion["chapter"], promotion["entity_id"]
        if not entity_id.startswith(f"{candidate['kind']}:"):
            errors.append(f"{cid}: promotion entity {entity_id} is not a {candidate['kind']}")
        if not catalogued(chapter, books):
            errors.append(f"{cid}: promotion chapter {chapter} is not a canonical chapter")
            continue
        if any(chapter_order(chapter) <= order for order in orders):
            errors.append(f"{cid}: promotion chapter {chapter} must follow every mention")
        record = by_chapter.get(chapter)
        introduced = [
            entity
            for entity in (record or {}).get("introducing", []) or []
            if isinstance(entity, dict) and entity.get("id") == entity_id
        ]
        if len(introduced) != 1:
            errors.append(f"{cid}: {entity_id} is not introduced in chapter {chapter}")
            continue
        if introduced[0].get("first_mentioned") != first:
            errors.append(
                f"{cid}: {entity_id} first_mentioned must equal the first mention {first}"
            )
        key = (chapter, entity_id)
        if key in promoted:
            errors.append(
                f"{cid}: duplicate promotion; {promoted[key]} is already promoted "
                f"to {entity_id} in chapter {chapter}"
            )
            continue
        promoted[key] = cid

    for chapter in chapters:
        for introduced in chapter.get("introducing", []) or []:
            if not isinstance(introduced, dict) or "first_mentioned" not in introduced:
                continue
            key = (chapter["chapter"], introduced.get("id"))
            if key not in promoted:
                errors.append(
                    f"Chapter {key[0]} introduces {key[1]} with first_mentioned "
                    "but no promoted candidate names it"
                )
    return errors


def structural_violations(
    source_root: Path = SOURCE_ROOT,
    manifest: Path = MANIFEST_FILE,
    anchor_tooling: Iterable[Path] = ANCHOR_TOOLING,
) -> list[str]:
    """Files under `src/`, the narrative manifest, and the anchor tooling that
    reference candidate data."""
    files = [
        path
        for path in sorted(source_root.rglob("*"))
        if path.is_file() and path.suffix in SOURCE_SUFFIXES
    ]
    files += [path for path in (manifest, *anchor_tooling) if path.is_file()]
    violations = []
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        if any(reference in text for reference in FORBIDDEN_REFERENCES):
            violations.append(str(path.relative_to(ROOT) if path.is_relative_to(ROOT) else path))
    return violations


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="candidate_entities.py",
        description=(
            "Validate data/candidates/candidate-entities.json (ADR-0032) against its "
            "schema and the narrative corpus, and check that no src/ module or the "
            "narrative manifest references candidate data."
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)
    validate = sub.add_parser("validate", help="validate the candidate file")
    validate.add_argument("--file", type=Path, default=CANDIDATES_FILE)
    validate.add_argument("--root", type=Path, default=NARRATIVE_ROOT, help="narrative root")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        errors = validate_candidates(
            read_json(args.file),
            schema=read_json(CANDIDATES_SCHEMA),
            narrative_root=args.root,
        )
    except CandidateError as error:
        errors = [str(error)]
    errors += [
        f"{path} references candidate data; only validation and extraction tooling may read it (ADR-0032 S1, §4)"
        for path in structural_violations()
    ]
    if errors:
        for error in errors:
            print(f"candidate-entities: {error}", file=sys.stderr)
        return 1
    count = len(read_json(args.file)["candidates"])
    print(f"Candidate entities are valid: {count} candidate(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
