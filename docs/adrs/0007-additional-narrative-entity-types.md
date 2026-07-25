# ADR-0007: additional narrative entity types

Status: Accepted
Date: 2026-07-25

## Context

The established narrative model supports direct character, species, and event entities
in the atomic pre-book zero state and chapter introductions. The project also needs
small, spoiler-safe records for named technologies, organizations, and vessel types
without introducing relationships, a second entity registry, or book-derived records.

ADR-0006 narrows the zero-state entity union to characters, species, and events. That
wording must be superseded before the shared schema and projection may admit additional
direct entity types.

## Decision

- `technology`, `organization`, and `vessel_type` are first-class direct narrative
  entity types. Their stable IDs are respectively `technology:*`, `organization:*`,
  and `vessel_type:*`; the underscore is part of the canonical vessel-type prefix.
- Each type may be seeded in the atomic zero state or introduced exactly once in a
  chapter's ordered `introducing` array. They use the existing reader-order visibility,
  story-time projection, update uniqueness, and temporal-write rules.
- Each direct introduction requires immutable `id` and a nonempty reader-visible
  `name`. `technology` and `vessel_type` may additionally contain optional original
  plain-text `description`. `organization` may additionally contain optional original
  plain-text `description` and reader-visible `current_state`.
- Ordinary later updates may replace `name` and may replace or clear the optional
  fields with a nonempty value or `null`. No relationship, ownership, membership,
  location, appearance, asset, physical, or rendering fields are introduced.
- This ADR supersedes ADR-0006 only for its character/species/event-only zero-state
  entity-union wording. ADR-0006's single atomic source, location-tree, and other
  zero-state decisions remain accepted.

## Consequences

- The shared unversioned Draft 2020-12 schema, semantic validator, generated
  projection, diagnostics, fixtures, and tests must recognize the expanded identity
  union atomically.
- Unsupported prefixes and cross-type IDs remain invalid even when their object shape
  otherwise resembles a supported entity.
- The canonical corpus need not gain any technology, organization, or vessel-type
  records; test-only fixtures prove the contracts.

## Alternatives considered

1. Reusing a generic named-entity schema was rejected because it would weaken direct
   field ownership and diagnostics.
2. Adding a separate registry was rejected because it would split the spoiler-safe
   source of truth and duplicate introduction rules.
3. Modeling individual vessels or organization relationships now was rejected because
   those require separate contracts and spoiler behavior.

## Follow-up

- Update the integrated technical design and data-model definition.
- Extend the schema, validator/projector, diagnostics, fixtures, and tests in BOB-007.
