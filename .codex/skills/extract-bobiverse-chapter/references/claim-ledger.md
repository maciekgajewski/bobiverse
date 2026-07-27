# Claim ledger contract

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

Every top-level field shown above is required. Each `source_mentions` entry requires
exactly `mention_id`, `kind`, `label`, and nullable `uncertainty`. Each claim requires
exactly `claim_id`, `claim_type`, `statement`, `subject_mentions`, `confidence`,
nullable `uncertainty`, and nonempty `evidence`. Use empty arrays rather than omitting
known-empty collections.

The local provider receives the fact-free machine-readable form of this contract
through Ollama's structured-output field. The same project-owned validator checks the
returned object before `source_evidence.py seal`; provider validation never replaces
exact-evidence sealing.

Use stable, ordered `claim:NNN` and source-local `mention:*` IDs in
`source_mentions`. These source-local identity anchors are distinct from a reviewed
canonical chapter `mentions` array, whose entries are stable narrative entity IDs and
record only important non-redundant references. Use only these
confidence values:

Use the source's primary surface form for each source mention `label`. If the source
primarily uses an acronym, preserve the acronym exactly in `label`; capture any
source-supported expanded form as an entity-identity or entity-attribute claim so
Pass 2 can place it in the canonical description. Never silently expand the label or
invent an expansion.

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
- `state_change`;
- `event`;
- `event_participant`;
- `introduction_clue`.

Capture source locations and movement even when they occur inside a room, corridor,
laboratory, office, floor, individual building, or other internal facility space.
Pass 1 must preserve those facts and their evidence without deciding canonical
location eligibility. During Pass 2, settlement scale is the minimum ordinary
location granularity: cities, towns, settlements, and distinct bases or installations
may become locations, while finer internal spaces are explicitly classified
`not-modeled` for granularity and retained as prose context where relevant.

Capture every source-supported occurrence that may be an event, including separate
claims for its participants, cause, immediate outcome, durable consequences, affected
population, and source-stated significance. Blind Pass 1 must not discard an event
claim because it appears local, personal, routine, or insignificant.

Pass 2 applies the canonical event gate. An `event:` entity is reserved for a major,
memorable turning point with durable consequences that shape the fate of many beings
beyond the principal characters. A foundational inciting incident may qualify when a
clear long causal chain reaches that scale even though its immediate impact is
personal. Ordinary conversations, confrontations, conventions, operations, training,
selection processes, personal realizations, isolated incidents, and temporary
setbacks are normally `not-modeled` as events. Preserve their useful facts in summary
prose or appropriate entity state.

For every source mention that may become a durable entity with a `description`, Pass
1 should capture separate evidence-backed claims for the facts needed by a
mini-encyclopedia entry:

- entity kind or classification;
- function, purpose, or role;
- revealed operating principle or defining behavior;
- distinguishing characteristics, capabilities, and limitations;
- reader-visible significance;
- acronym expansion, when the source supplies one.

Record unrevealed or uncertain checklist items in the mention's `uncertainty` or the
ledger's `unresolved_questions`. Do not manufacture a claim merely to complete the
entry. If the source primarily uses an acronym and supplies no expansion, preserve the
acronym as the mention label and explicitly record that its expansion is unrevealed.
Pass 2 may then author a partial description that says so.

A relationship such as who uses, owns, mentions, or discusses an entity is not by
itself an `entity_definition`. Keep that relationship as its own claim so Pass 2
cannot mistake narrative context for an encyclopedic explanation.

Claims describe only what the source says. They do not say `introducing`, `update`, or
`already-known`; Pass 2 owns those classifications.

Each evidence object contains an exact, short excerpt and may contain
`"occurrence": N` when the same bytes occur more than once. Occurrences are one-based.
The sealing helper rejects missing, nonexact, or ambiguous evidence and replaces
quotes with fingerprinted byte ranges.

The sealed ledger preserves all claim and mention fields, adds source metadata, marks
the ledger sealed, and contains no source quotations. Do not edit it after sealing.
