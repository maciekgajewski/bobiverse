# BOB-007: additional narrative entity types

Status: Done
Phase: 2 (narrative foundation)
Last updated: 2026-07-25

## Objective

Extend the spoiler-safe narrative data model with direct `technology`,
`organization`, and `vessel_type` entities. Each type represents a named narrative
concept with an original plain-text description, and follows the established
zero-state, chapter-introduction, and chapter-update lifecycle.

## User-visible outcome

The validated narrative corpus and generated selected-chapter world can contain
reader-visible technology, organization, and vessel-type records. A record becomes
known only when it is seeded in the pre-book zero state or introduced in a
reader-visible chapter; later reader-visible updates project by the existing
story-time rules. The task adds no book-derived canonical records or UI surfaces.

## Binding references

- `../data-model-definition.md`, especially Entity and location schemas, zero-state,
  chapter introductions, and updates
- `../technical-design.md`, Section 12
- `../implementation-plan.md`, Phase 2
- `../adrs/README.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0006-generalized-narrative-zero-state.md`
- `BOB-002-narrative-data-model-definition.md`,
  `BOB-004-narrative-zero-state-and-projection.md`, and
  `BOB-006-generalized-narrative-zero-state.md` (completed foundations)
- `../../AGENTS.md`

An accepted ADR must define the expanded entity-identity union and explicitly
supersede ADR-0006's narrower zero-state entity-union wording before implementation.
If it conflicts with another binding reference, stop and resolve the conflict rather
than silently changing the model.

## Decisions recorded so far

- `technology`, `organization`, and `vessel_type` use the existing narrative entity
  lifecycle: each may appear in the atomic pre-book zero state or in a chapter's
  ordered `introducing` array, is introduced exactly once, and may receive ordinary
  later chapter updates.
- Their stable type-prefixed IDs are `technology:*`, `organization:*`, and
  `vessel_type:*`. The underscore in `vessel_type` is deliberate and is already
  permitted by the shared entity-ID grammar.
- The initial contracts are deliberately small. Apart from immutable `id`, each type
  has a reader-visible `name` and optional original plain-text `description`.
  Organization alone also has optional reader-visible `current_state`. Both optional
  fields may be cleared by a later ordinary update. The task adds no relationship,
  ownership, membership, location, appearance, asset, physical, or rendering fields.
- The types share the existing reader-order visibility gate, story-time projection,
  update uniqueness, temporal-write ordering, source/generated boundary, and no
  compatibility-schema-version rules.

## In scope

- Propose and accept an ADR that expands the narrative entity identity model with
  these three types, explicitly supersedes the affected entity-union decision in
  ADR-0006, and integrates that decision into the technical design and data-model
  definition.
- Add dedicated Draft 2020-12 schema definitions, ID definitions, introduction
  contracts, and update contracts for the three types.
- Extend the zero-state entity union, chapter `introducing` union, chapter `updates`
  union, TypeScript entity-type union, validation, generated projection, diagnostics,
  and fixtures so all three types work consistently.
- Enforce the direct contracts and reject unsupported properties, wrong ID prefixes,
  duplicate introductions, unresolved references, invalid update fields, and
  unsupported entity IDs.
- Add focused tests proving zero-state seeding, chapter introduction, update
  projection, reader-order hiding, story-time handling, and rejection behavior for
  each new type.
- Update directly affected source-layout, schema, validation, and task-index
  documentation.

## Out of scope

- Adding canonical technologies, organizations, vessel types, or any other
  book-derived facts to `data/narrative`.
- New fields or cross-entity links such as technology users, organization members,
  vessel ownership, vessel instances, locations, maps, appearances, images, or
  physical specifications.
- UI, search, timeline, reader-progress, map-rendering, extraction, or external
  service changes.
- A generic catch-all entity type, a second entity registry, manually edited generated
  projections, source-level schema versions, or backward-compatibility shims.

## Acceptance criteria

1. An accepted ADR establishes `technology`, `organization`, and `vessel_type` as
   first-class narrative entity types with the recorded lifecycle and explicitly
   supersedes ADR-0006's character/species/event-only zero-state entity-union wording.
   The integrated technical design and data-model definition agree with the new ADR.
2. The schema has dedicated `technology_id`, `organization_id`, and `vessel_type_id`
   definitions; it accepts only the corresponding canonical prefixes and rejects
   cross-type IDs.
3. Each direct introduction contract has immutable `id`, a nonempty reader-visible
   `name`, and optional original plain-text `description`, with no additional
   properties. The `technology` and `vessel_type` contracts have no other fields.
   The `organization` contract additionally permits optional reader-visible
   `current_state`. Their update contracts permit a nonempty replacement value or
   `null` to clear either optional field.
4. The zero-state `entities` union and chapter `introducing` union accept exactly the
   existing supported non-location types plus these three direct contracts; the
   chapter `updates` union accepts their dedicated update contracts. No second source
   form or registry is introduced.
5. Corpus validation and generated projection derive the correct `entity_type` for
   all three prefixes, retain the existing unique-ID and reference-order rules, and
   reject an otherwise schema-valid unsupported entity prefix.
6. An entity of each type may be seeded, may be introduced in a chapter, and may be
   updated only by a later chapter. Projection preserves the existing reader-order
   gate and story-time rules for its visible properties.
7. Tests cover valid and invalid records for every new type, including invalid IDs,
   unexpected fields, duplicate introduction, same-chapter update rejection,
   unsupported update fields, unknown-prefix rejection, a projected later update, and
   clearing `description` or an organization's `current_state`.
8. The canonical narrative corpus remains valid without adding book-derived records;
   generated test outputs remain outside version control.
9. The documented validation commands pass, and the task index records the completed
   work when the task status changes.

## Validation commands

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run narrative:validate
npm run test
npm run build
git diff --check
```

## Risks and unresolved decisions

- No unresolved product-contract decisions remain. The task is specified but still
  requires the Captain's explicit authorization before implementation begins.
- A vessel type is a classification, not an individual vessel. If individual vessels
  or ownership/member relationships are later needed, they require a separate task
  with their own explicit contracts and spoiler behavior.
- This changes the entity identity union across schema, semantic validation, and
  projection. Implement it as one cohesive migration; partial prefix support would
  make valid source data fail at a later layer.

## Completion evidence

Completed on 2026-07-25. ADR-0007 established the expanded direct-entity union; the
schema, validator, projection, diagnostics, documentation, and focused regression
coverage were updated as one migration. The canonical corpus remains unchanged.

Validation passed: `npm ci`, `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run narrative:validate`, `npm run test`, `npm run build`,
and `git diff --check`. The fresh task-review closure recorded no open blocking
findings in `docs/reviews/BOB-007-review-results.md`.
