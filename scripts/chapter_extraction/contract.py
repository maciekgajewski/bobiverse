from __future__ import annotations

import re
from typing import Any


CHAPTER_RE = re.compile(r"^[1-9][0-9]*\.[1-9][0-9]*$")
CLAIM_ID_RE = re.compile(r"^claim:[0-9]{3,}$")
MENTION_ID_RE = re.compile(r"^mention:[a-z0-9][a-z0-9-]*$")
CHUNK_ID_RE = re.compile(r"^chunk:[0-9]{3,}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
TOKEN_RE = re.compile(r"^[a-z][a-z0-9_]*$")
CONFIDENCE_VALUES = ("high", "medium", "low")


class ContractError(ValueError):
    """A source-free description of an invalid draft ledger."""


STRING_OR_NULL = {"type": ["string", "null"]}
MENTION_ID_ARRAY = {
    "type": "array",
    "items": {"type": "string", "pattern": MENTION_ID_RE.pattern},
    "uniqueItems": True,
}
CLAIM_ID_ARRAY = {
    "type": "array",
    "items": {"type": "string", "pattern": CLAIM_ID_RE.pattern},
    "uniqueItems": True,
}
CHUNK_ID_ARRAY = {
    "type": "array",
    "items": {"type": "string", "pattern": CHUNK_ID_RE.pattern},
    "uniqueItems": True,
}
EVIDENCE_SCHEMA = {
    "type": "object",
    "required": ["quote"],
    "properties": {
        "quote": {"type": "string", "minLength": 1, "maxLength": 500},
        "occurrence": {"type": "integer", "minimum": 1},
    },
    "additionalProperties": False,
}
LEDGER_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "chapter",
        "source_sha256",
        "chapter_metadata",
        "source_mentions",
        "summary_draft",
        "unresolved_questions",
        "processed_chunks",
        "claims",
    ],
    "properties": {
        "chapter": {"type": "string", "pattern": CHAPTER_RE.pattern},
        "source_sha256": {"type": "string", "pattern": SHA256_RE.pattern},
        "chapter_metadata": {
            "type": "object",
            "required": [
                "source_title",
                "canonical_title",
                "lead_mentions",
                "location_mentions",
                "date_claims",
            ],
            "properties": {
                "source_title": STRING_OR_NULL,
                "canonical_title": {"type": "string", "minLength": 1},
                "lead_mentions": MENTION_ID_ARRAY,
                "location_mentions": MENTION_ID_ARRAY,
                "date_claims": CLAIM_ID_ARRAY,
            },
            "additionalProperties": False,
        },
        "source_mentions": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["mention_id", "kind", "label", "uncertainty"],
                "properties": {
                    "mention_id": {
                        "type": "string",
                        "pattern": MENTION_ID_RE.pattern,
                    },
                    "kind": {"type": "string", "pattern": TOKEN_RE.pattern},
                    "label": {"type": "string", "minLength": 1},
                    "uncertainty": STRING_OR_NULL,
                },
                "additionalProperties": False,
            },
        },
        "summary_draft": {"type": "string", "minLength": 1},
        "unresolved_questions": {
            "type": "array",
            "items": {"type": "string", "minLength": 1},
        },
        "processed_chunks": CHUNK_ID_ARRAY,
        "claims": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "required": [
                    "claim_id",
                    "claim_type",
                    "statement",
                    "subject_mentions",
                    "confidence",
                    "uncertainty",
                    "evidence",
                ],
                "properties": {
                    "claim_id": {
                        "type": "string",
                        "pattern": CLAIM_ID_RE.pattern,
                    },
                    "claim_type": {
                        "type": "string",
                        "pattern": TOKEN_RE.pattern,
                    },
                    "statement": {"type": "string", "minLength": 1},
                    "subject_mentions": MENTION_ID_ARRAY,
                    "confidence": {"enum": list(CONFIDENCE_VALUES)},
                    "uncertainty": STRING_OR_NULL,
                    "evidence": {
                        "type": "array",
                        "minItems": 1,
                        "items": EVIDENCE_SCHEMA,
                    },
                },
                "additionalProperties": False,
            },
        },
    },
    "additionalProperties": False,
}


def _object(
    value: Any,
    label: str,
    required: set[str],
    optional: set[str] = frozenset(),
) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ContractError(f"{label} must be an object.")
    missing = sorted(required - value.keys())
    if missing:
        raise ContractError(f"{label} is missing fields: {', '.join(missing)}.")
    extra = sorted(value.keys() - required - optional)
    if extra:
        raise ContractError(f"{label} has unsupported fields: {', '.join(extra)}.")
    return value


def _string(
    value: Any,
    label: str,
    pattern: re.Pattern[str] | None = None,
) -> str:
    if not isinstance(value, str) or not value:
        raise ContractError(f"{label} must be a nonempty string.")
    if pattern is not None and pattern.fullmatch(value) is None:
        raise ContractError(f"{label} has an invalid identifier format.")
    return value


def _nullable_string(value: Any, label: str) -> str | None:
    if value is None:
        return None
    return _string(value, label)


def _string_array(
    value: Any,
    label: str,
    pattern: re.Pattern[str] | None = None,
) -> list[str]:
    if not isinstance(value, list):
        raise ContractError(f"{label} must be an array.")
    result = [
        _string(item, f"{label}[{index}]", pattern)
        for index, item in enumerate(value)
    ]
    if len(result) != len(set(result)):
        raise ContractError(f"{label} must not contain duplicates.")
    return result


def validate_ledger(
    value: Any,
    *,
    chapter: str,
    source_sha256: str,
    expected_chunks: list[str],
) -> dict[str, Any]:
    ledger = _object(
        value,
        "Draft ledger",
        {
            "chapter",
            "source_sha256",
            "chapter_metadata",
            "source_mentions",
            "summary_draft",
            "unresolved_questions",
            "processed_chunks",
            "claims",
        },
    )
    if ledger["chapter"] != chapter:
        raise ContractError("Draft ledger chapter does not match the request.")
    if ledger["source_sha256"] != source_sha256:
        raise ContractError("Draft ledger source fingerprint does not match.")

    metadata = _object(
        ledger["chapter_metadata"],
        "chapter_metadata",
        {
            "source_title",
            "canonical_title",
            "lead_mentions",
            "location_mentions",
            "date_claims",
        },
    )
    _nullable_string(metadata["source_title"], "chapter_metadata.source_title")
    _string(metadata["canonical_title"], "chapter_metadata.canonical_title")

    mentions = ledger["source_mentions"]
    if not isinstance(mentions, list):
        raise ContractError("source_mentions must be an array.")
    mention_ids: list[str] = []
    for index, raw_mention in enumerate(mentions):
        mention = _object(
            raw_mention,
            f"source_mentions[{index}]",
            {"mention_id", "kind", "label", "uncertainty"},
        )
        mention_ids.append(
            _string(
                mention["mention_id"],
                f"source_mentions[{index}].mention_id",
                MENTION_ID_RE,
            )
        )
        _string(mention["kind"], f"source_mentions[{index}].kind", TOKEN_RE)
        _string(mention["label"], f"source_mentions[{index}].label")
        _nullable_string(
            mention["uncertainty"], f"source_mentions[{index}].uncertainty"
        )
    if len(mention_ids) != len(set(mention_ids)):
        raise ContractError("source_mentions contains duplicate mention_id values.")
    known_mentions = set(mention_ids)

    for field in ("lead_mentions", "location_mentions"):
        references = _string_array(
            metadata[field], f"chapter_metadata.{field}", MENTION_ID_RE
        )
        unresolved = sorted(set(references) - known_mentions)
        if unresolved:
            raise ContractError(
                f"chapter_metadata.{field} contains unresolved mention IDs."
            )

    _string(ledger["summary_draft"], "summary_draft")
    _string_array(ledger["unresolved_questions"], "unresolved_questions")
    processed_chunks = _string_array(
        ledger["processed_chunks"], "processed_chunks", CHUNK_ID_RE
    )
    if processed_chunks != expected_chunks:
        raise ContractError(
            "processed_chunks must exactly match the ordered manifest chunk IDs."
        )

    claims = ledger["claims"]
    if not isinstance(claims, list) or not claims:
        raise ContractError("claims must be a nonempty array.")
    claim_ids: list[str] = []
    normalized_statements: set[str] = set()
    for index, raw_claim in enumerate(claims):
        claim = _object(
            raw_claim,
            f"claims[{index}]",
            {
                "claim_id",
                "claim_type",
                "statement",
                "subject_mentions",
                "confidence",
                "uncertainty",
                "evidence",
            },
        )
        claim_id = _string(
            claim["claim_id"], f"claims[{index}].claim_id", CLAIM_ID_RE
        )
        expected_id = f"claim:{index + 1:03d}"
        if claim_id != expected_id:
            raise ContractError(
                f"claims must use consecutive ordered IDs; expected {expected_id}."
            )
        claim_ids.append(claim_id)
        _string(claim["claim_type"], f"{claim_id}.claim_type", TOKEN_RE)
        statement = _string(claim["statement"], f"{claim_id}.statement")
        normalized = " ".join(statement.casefold().split())
        if normalized in normalized_statements:
            raise ContractError("claims contains duplicate normalized statements.")
        normalized_statements.add(normalized)
        subjects = _string_array(
            claim["subject_mentions"], f"{claim_id}.subject_mentions", MENTION_ID_RE
        )
        if set(subjects) - known_mentions:
            raise ContractError(f"{claim_id} contains unresolved subject mention IDs.")
        if claim["confidence"] not in CONFIDENCE_VALUES:
            raise ContractError(f"{claim_id}.confidence is invalid.")
        _nullable_string(claim["uncertainty"], f"{claim_id}.uncertainty")
        evidence = claim["evidence"]
        if not isinstance(evidence, list) or not evidence:
            raise ContractError(f"{claim_id}.evidence must be a nonempty array.")
        for evidence_index, raw_evidence in enumerate(evidence):
            item = _object(
                raw_evidence,
                f"{claim_id}.evidence[{evidence_index}]",
                {"quote"},
                {"occurrence"},
            )
            quote = _string(
                item["quote"], f"{claim_id}.evidence[{evidence_index}].quote"
            )
            if len(quote) > 500:
                raise ContractError(f"{claim_id} contains an overlong evidence quote.")
            occurrence = item.get("occurrence")
            if occurrence is not None and (
                not isinstance(occurrence, int)
                or isinstance(occurrence, bool)
                or occurrence < 1
            ):
                raise ContractError(f"{claim_id} evidence occurrence is invalid.")

    date_claims = _string_array(
        metadata["date_claims"], "chapter_metadata.date_claims", CLAIM_ID_RE
    )
    if set(date_claims) - set(claim_ids):
        raise ContractError("chapter_metadata.date_claims contains unresolved IDs.")
    return ledger
