# ADR-0006: generalized narrative zero state

Status: Accepted
Date: 2026-07-24

## Context

ADR-0003 established a pre-book Solar-System location tree, but its location-only
source cannot make universally known non-location entities reader-visible before a
chapter. Keeping those entities in chapter 1 creates duplicate introduction pressure
and prevents the initial world from being one complete registry snapshot.

## Decision

- The canonical zero-state source is `data/narrative/baseline/zero-state.json`.
  It is a closed object with exactly `locations` and `entities`.
- `locations` is the existing one-root nested Solar-System authoring tree. `entities`
  is an array of characters, species, and events using the shared direct introduction
  contracts. It cannot contain a second flat location form.
- The complete record is one atomic pre-book snapshot. References from an entity may
  resolve to any zero-state location or entity regardless of array order; asset
  references remain in the separate asset registry.
- Seeded IDs are reader-visible before chapter selection and cannot be introduced by a
  chapter, but chapters may update them under the established reader-order and
  story-time rules.
- The initial record seeds `species:human`, named `Human`, with Earth as its
  homeworld. Chapter 1.1 therefore no longer introduces humanity.
- This ADR supersedes ADR-0003 only for its location-only zero-state ownership and
  `baseline/solar-system.json` source-layout wording. Its Solar-System topology,
  non-metric rendering, and chapter-patch decisions remain accepted.

## Consequences

- Validation must combine nested locations and direct entities into a unique,
  whole-snapshot registry before checking references.
- The browser-safe projector, Node CLI, diagnostics, fixtures, and documentation use
  one generalized zero-state source without a legacy filename or fallback path.
- The zero state remains pre-book reader-visible content, not a staging source for
  later revelations.

## Alternatives considered

1. Retaining a location-only zero state and introducing Human in chapter 1 was
   rejected because it duplicates universally known setting information across the
   initial registry boundary.
2. Adding a second entity-baseline file was rejected because it would split one atomic
   pre-book snapshot into order-sensitive sources.
3. Permitting flat zero-state locations was rejected because it would duplicate the
   nested Solar-System topology contract.

## Follow-up

- Update the narrative schema, source corpus, projection, CLI, diagnostics, and tests.
- Integrate this record shape and authority boundary into the technical design,
  implementation plan, data-model definition, and source-layout documentation.
