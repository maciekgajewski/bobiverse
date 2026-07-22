# ADR-0001: chapter-authored narrative state and generated projections

Status: Accepted
Date: 2026-07-22

## Context

The approved baseline said that chapter files reference stable IDs and do not
contain canonical character or location records. That would require a separately
authored entity registry. The project instead needs one book-data source in which
each chapter explicitly introduces entities and states their visible changes.

The application must materialize a spoiler-safe world for a selected chapter without
allowing a manually edited snapshot to diverge from the book source. Astronomy data
is a separate authority for physical facts and must not be copied into book data.

## Decision

- Chapter records are the canonical authored narrative source. They contain typed
  `introducing` collections, human-readable `updates`, appearances, and events.
- An introduction contains the complete minimum valid state for its entity type.
  An entity is introduced once, remains visible in every later projection, and is
  never deleted from the narrative model.
- Entity registries, selected-chapter entity state, reverse relationship lists,
  location children, and render-ready hierarchies are deterministic generated
  outputs. They must not be edited by hand.
- An update has one object per entity per chapter. Its ordinary JSON properties
  replace the corresponding visible values; omitted properties are unchanged,
  `null` clears a value, and a list value replaces the complete list.
- A guarded `furthestChapterRead` is the spoiler ceiling. A freely selected
  `viewChapter` renders any chapter at or before that ceiling.
- Locations form a one-parent tree. Each non-root location has one parent; child
  lists are generated. Transit locations are roots with explicit origin and
  destination references.
- Book locations may reference astronomy nodes. The visual layer receives a
  generated join of the physical astronomy hierarchy and the visible narrative
  location tree; book data never duplicates physical render facts.
- Image files remain manually curated assets. Their assignment to an entity is a
  chapter-controlled narrative value.

## Consequences

- Validation must verify introduction uniqueness, minimum type state, reference
  validity, update-field ownership, one update object per entity per chapter,
  location-tree integrity, and astronomy-ancestry agreement for mapped locations.
- Rendering and UI code consume generated projections, never source chapter records
  directly as mutable state.
- Rebuilding generated data must reproduce the same result from the same authored
  chapter, asset, and astronomy inputs.
- A chapter source format becomes the central editorial review surface. It must
  remain readable and use original structured facts only.

## Alternatives considered

1. A separately authored canonical entity registry with chapter files containing
   only references was rejected. It creates a second manually maintained book-data
   surface and obscures the chapter that first reveals an entity's state.
2. A generated full dataset for every chapter as the source of truth was rejected.
   Such snapshots duplicate state, grow with every chapter, and invite accidental
   manual edits.
3. Copying astronomy hierarchy and physical rendering values into narrative records
   was rejected because it violates astronomy-source authority and risks drift.

## Follow-up

- Update `../technical-design.md` Section 12 with the accepted source and
  projection boundaries.
- Update `../implementation-plan.md` Phase 2 and `../project-idea.md` so their
  narrative-model wording matches this decision.
- Expand `../data-model-definition.md` and the active BOB-002 task with the source
  records, generated outputs, visibility rules, location hierarchy, assets, and
  validation requirements.
