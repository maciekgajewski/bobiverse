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

Use stable, ordered `claim:NNN` and source-local `mention:*` IDs in
`source_mentions`. These source-local identity anchors are distinct from a reviewed
canonical chapter `mentions` array, whose entries are stable narrative entity IDs.
Beginning with Chapter `1.14`, canonical entries exhaustively record source-supported
references to previously visible objects that are absent from all other typed direct
narrative references in the chapter. Use only these
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
- `character_parent`;
- `state_change`;
- `event`;
- `event_participant`;
- `introduction_clue`.

Capture source locations and movement even when they occur inside a room, corridor,
laboratory, office, floor, individual building, or other internal facility space.
Pass 1 must preserve those facts and their evidence without deciding canonical
location eligibility. During Pass 2, settlement scale is the minimum ordinary
location granularity. Cities, towns, settlements, and durable, independently useful
bases or stations may become locations; ordinary stations and bases use `locale`,
while `megastructure` is reserved for exceptional physical scale. Incidental,
unnamed, short-lived, and finer internal places are explicitly classified
`not-modeled` and retained as prose context where relevant. Structured location
references fall back to the nearest established reader-visible parent when the finer
locale is unavailable or omitted.

For every source-described system survey, Blind Pass 1 must include a complete body
inventory and separate evidence-backed claims for every supported:

- surveyed planet, dwarf planet, and moon occurrence;
- exact or qualitative moon count and aggregate system/body fact;
- broad body class and colour;
- visible, atmospheric, weather, surface, ring, and neighbourhood description;
- numeric or qualitative gravity statement, retaining the numeric source value and
  unit without conversion;
- other measurement or descriptive fact.

Do not apply importance, habitability, location-curation, or rendering thresholds in
Pass 1. Missing checklist evidence must remain an explicit uncertainty. During Pass
2, beginning with Chapter `1.16`, every surveyed planet and dwarf planet is a
location, every claim is represented or explicitly reviewed, and moon children follow
the repository's four-child cap and deterministic count-only rules.

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
Pass 2 keeps that gap in reconciliation, uncertainty, and human-review artifacts; it
must not turn the absence into a reader-facing description sentence.

A relationship such as who uses, owns, mentions, or discusses an entity is not by
itself an `entity_definition`. Keep that relationship as its own claim so Pass 2
cannot mistake narrative context for an encyclopedic explanation.

Capture direct character lineage as `character_parent` only when the source supports
the parent and child identities. For a replicant, the parent is the source character
state or backup from which the child was copied, not merely the operator who ran the
creation process. The same claim type may represent biological genealogy. Do not
infer a parent from matching names, similar behavior, shared species, possession of a
backup, or operation of cloning machinery. Record ambiguous lineage in
`unresolved_questions`.

Pass 2 states capabilities in entity-centered general language such as `It can` or
`It is used to`; named-character usage is not the definition unless the relationship
is itself defining. A capability belongs to an entity only when the evidence assigns
it there; querying an interface for documentation or observing a capability through
an interface does not assign that capability to the interface. Pass 2 omits all
semantic disclosure-gap statements from descriptions, including unknown, unrevealed,
unexplained, unavailable, and unspecified detail notices. A `current_state` contains
only one or two concise sentences about the latest condition. A unified `vessel:*`
record may describe a named ship, its design, or the ship family associated with the
first ship and may own optional brief `current_state`.

Claims describe only what the source says. They do not say `introducing`, `update`, or
`already-known`; Pass 2 owns those classifications.

Each evidence object contains an exact, short excerpt and may contain
`"occurrence": N` when the same bytes occur more than once. Occurrences are one-based.
The sealing helper rejects missing, nonexact, or ambiguous evidence and replaces
quotes with fingerprinted byte ranges.

The sealed ledger preserves all claim and mention fields, adds source metadata, marks
the ledger sealed, and contains no source quotations. Do not edit it after sealing.
