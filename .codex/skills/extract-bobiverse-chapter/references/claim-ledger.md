# Claim ledger contract

This file defines the ledger format only. The Pass 1 capture rules are in
`pass1-blind-brief.md`.

Pass 1 writes a draft JSON object outside the repository:

```json
{
  "chapter": "7.12",
  "source_sha256": "<metadata SHA-256>",
  "chapter_metadata": {
    "source_title": "Example Chapter",
    "canonical_title": "12 - Example Chapter",
    "lead_mentions": ["mention:protagonist-1"],
    "location_mentions": ["mention:example-place-1"],
    "date_claims": ["claim:003"]
  },
  "source_mentions": [
    {
      "mention_id": "mention:protagonist-1",
      "kind": "character",
      "label": "Example Protagonist",
      "uncertainty": null
    }
  ],
  "summary_draft": "An original, concise reader-visible summary.",
  "unresolved_questions": [],
  "processed_chunks": ["chunk:001", "chunk:002"],
  "claims": [
    {
      "claim_id": "claim:001",
      "claim_type": "appearance",
      "statement": "The example protagonist is the chapter lead.",
      "subject_mentions": ["mention:protagonist-1"],
      "confidence": "high",
      "uncertainty": null,
      "evidence": [
        {
          "quote": "short exact source excerpt"
        }
      ]
    }
  ]
}
```

Use stable, ordered `claim:NNN` and source-local `mention:*` IDs in
`source_mentions`. These source-local identity anchors are distinct from a reviewed
canonical chapter `mentions` array, whose entries are stable narrative entity IDs
chosen in Pass 2.

Use the source's primary surface form for each mention `label` (see the Pass 1 blind
brief for acronyms).

Use only these confidence values:

- `high`: explicit and unambiguous in the source;
- `medium`: source-supported but identity, scope, or interpretation needs review;
- `low`: plausible but incomplete or ambiguous; never promote without review.

Useful claim types include:

- `chapter_date`;
- `chapter_location`;
- `entity_definition`;
- `entity_identity`;
- `entity_attribute`;
- `entity_function`;
- `acronym_expansion`;
- `capability`;
- `limitation`;
- `appearance`;
- `alias`;
- `location`;
- `movement`;
- `relationship`;
- `character_parent`;
- `state_change`;
- `event`;
- `event_participant`;
- `introduction_clue`.

Record unrevealed or uncertain checklist items in the mention's `uncertainty` or the
ledger's `unresolved_questions`. Do not manufacture a claim merely to complete an
entry. A relationship such as who uses, owns, mentions, or discusses an entity is not
by itself an `entity_definition`.

Claims describe only what the source says. They do not say `introducing`, `update`, or
`already-known`; Pass 2 owns those classifications.

Each evidence object contains an exact, short excerpt and may contain
`"occurrence": N` when the same bytes occur more than once. Occurrences are one-based.
The sealing helper rejects missing, nonexact, or ambiguous evidence and replaces
quotes with fingerprinted byte ranges.

The sealed ledger preserves all claim and mention fields, adds source metadata, marks
the ledger sealed, and contains no source quotations. Do not edit it after sealing.
