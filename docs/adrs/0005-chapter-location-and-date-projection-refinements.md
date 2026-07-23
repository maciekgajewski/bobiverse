# ADR-0005: chapter, location, and date-projection refinements

Status: Accepted
Date: 2026-07-23

## Context

ADR-0001 and ADR-0002 established chapter-authored narrative state and its two-stage
spoiler-safe projection. Subsequent contract decisions made the chapter record more
useful as a reader-visible source and made location mapping more precise. They also
allow a future date-exploration UI without treating story time as a spoiler gate.

Those decisions conflict with specific earlier wording: ADR-0001 describes typed
`introducing` collections and permits arbitrary narrative astronomy references, while
ADR-0002 requires appearances in every chapter. The accepted record must identify the
current rules without rewriting those historical ADRs.

## Decision

- A chapter requires `chapter`, title, original plain-text summary, story date, and
  default `location_id`. Its `introducing`, `appearances`, and `updates` arrays are
  optional and nonempty when present. An authored appearance array contains at least
  one `lead`.
- `introducing` is one ordered heterogeneous array. An introduction may reference
  seeded entities or earlier entries in that array; an update targets only a seeded or
  earlier-chapter entity.
- Baseline and chapter locations share one closed kind vocabulary and explicit parent
  relations. Only a mapped root `star_system` directly references an astronomy-system
  record; mapped descendants inherit that system context. Transit locations and
  explicitly unknown locations are unmapped under the documented rules.
- A normal chapter view projects reader-visible facts to `viewChapter.date`. A future
  date-exploration UI may substitute any requested story date only for that second
  projection stage. It retains the selected reader-visible chapter set and therefore
  presents reader-inferred state, never unrevealed in-universe facts.

This ADR supersedes ADR-0001 only for its typed-collection and arbitrary
astronomy-reference wording, and ADR-0002 only for its mandatory-appearance wording.
All other decisions in those ADRs remain accepted.

## Consequences

- Validation must enforce the complete chapter and location contracts, introduction
  ordering, update-target ordering, and mapped/unmapped location rules.
- A date-exploration control cannot load, derive, or display a later chapter merely
  because its story date is earlier than the requested date.
- Generated projections remain the sole runtime representation of reader-visible
  state; source files and generated output remain separate.

## Alternatives considered

1. Retaining the earlier mandatory-appearance and typed-collection wording was
   rejected because it conflicts with the ratified authoring contract.
2. Treating an arbitrary requested date as a reader-visibility key was rejected
   because it would reveal facts before their introducing chapters.
3. Allowing every mapped location to carry an astronomy reference was rejected because
   it duplicates inherited system context and weakens ancestry validation.

## Follow-up

- Keep `../data-model-definition.md` and `../technical-design.md` aligned with these
  refined rules.
- Validate the zero-state root, chapter source records, and derived projections under
  the complete current contract in BOB-002.
