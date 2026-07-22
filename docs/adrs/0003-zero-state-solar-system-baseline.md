# ADR-0003: zero-state Solar-System baseline and chapter patches

Status: Accepted
Date: 2026-07-22

## Context

ADR-0001 made chapter records the sole authored narrative source. That leaves no
reader-visible world before the first chapter and requires universally known Solar
System locations to be introduced as book revelations. It also makes the initial state
of the world depend on a chapter rather than on the known setting that every reader
starts with.

The product needs a zero state: a small pre-book snapshot of the Solar System as it is
known before the narrative begins. Chapters should behave as ordered commits that patch
that snapshot, including changes such as a destroyed moon, an altered planet, or a new
megastructure.

## Decision

- This ADR supersedes ADR-0001 only where it declares chapter records the sole
  authored narrative source. There are now three sources of domain truth:
  1. The astronomy source owns stellar and interstellar physical facts, including
     coordinates, stellar components, and their render facts. It remains stars-only.
  2. The zero-state location source owns the reader-visible, pre-book Solar-System
     location tree. It is a small nested JSON source seeded independently of the
     books.
  3. Chapter records own book revelations, new entities, and ordered patches to the
     zero state and to entities introduced by earlier chapters.
- The zero-state source is available before any book chapter has been read. Projection
  begins from it, then applies the selected reader-visible chapter patches. It is the
  initial commit of the world state, not a parallel timeline or a competing view.
- The zero-state source uses nested JSON. Nesting supplies the Solar-System parentage
  and the stable inner-to-outer child order used by the local renderer. It contains no
  coordinates, distances, sizes, colours, or other measured astronomy render facts;
  the local layout is deliberately non-metric and must not be presented as a distance
  measurement.
- Chapter files remain flat and additive: later chapters introduce locations beneath
  existing parents through `parent_location_id` and patch seeded locations through the
  normal update rules. Seeded location IDs cannot be introduced again by a chapter.
- Generated registries and selected-state projections remain non-editable runtime
  outputs. The baseline and chapter source files are both validated authored inputs.

## Consequences

- The initial interface can render the known Solar System before a reader selects a
  chapter, without exposing book-derived facts.
- A full planetary catalogue is not added to the astronomy dataset. The baseline covers
  the Solar System only; fictional bodies elsewhere in the books remain narrative
  locations until separately modeled.
- Validation must check the baseline tree, unique IDs across baseline and chapters,
  legal chapter patches to seeded entities, and deterministic local child ordering.
- Documentation and schemas must distinguish baseline entities from chapter
  introductions while preserving the same stable ID and update semantics.

## Alternatives considered

1. Introducing every Solar-System location in chapter 1 was rejected. It makes
   universally known setting facts depend on opening a book chapter and provides no
   zero state.
2. Adding every Solar-System body to the nearby-star astronomy dataset was rejected.
   The nearby-star dataset remains limited to stellar and interstellar facts, while the
   product needs no general exoplanet catalogue.
3. Storing orbital distances or physical render facts in the baseline was rejected.
   The local Solar-System layout is intentionally aesthetic rather than metric.

## Follow-up

- Update `../technical-design.md`, `../data-model-definition.md`,
  `../implementation-plan.md`, `../project-idea.md`, and the active BOB-002 task to
  describe the zero state and three authority boundaries.
- Define the baseline source schema and its generated projection rules in BOB-002
  before adding baseline data or runtime behavior.
