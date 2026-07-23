# BOB-002: narrative data-model definition

Status: In progress
Phase: 2 (design preparation)
Last updated: 2026-07-22

## Objective

Define the versioned, JSON-Schema-backed data model for the zero-state Solar-System
baseline and later Phase 2 narrative records, beginning with shared scalar types. This
is documentation-only design work; it does not add book-derived data, a timeline, or
runtime behavior.

## Binding references

- `../technical-design.md`, especially Section 12
- `../implementation-plan.md`, Phase 2
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../../AGENTS.md`

## Scope

- Document reusable scalar types and their JSON Schema definitions.
- Define canonical encodings, validation rules, comparison semantics, and examples.
- Define the zero-state Solar-System source and chapter-authored records:
  introductions, updates, appearances, events, locations, and image-asset references.
- Define the `books.json` catalogue, one-file-per-chapter source layout, and generated
  minimal chapter manifest.
- Define generated entity state, location children, reverse relationship lists, and
  the render-ready join with astronomy data as derived outputs only.
- Establish the document that future book, chapter, character, location, event, and
  revealed-claim schemas will reference.

## Out of scope

- Book-derived records, source text, summaries, or extraction evidence.
- Runtime application code, data loading, timeline UI, and spoiler-policy
  implementation.
- Changes to BOB-001 or its astronomy data pipeline.

## Acceptance criteria

- `docs/data-model-definition.md` defines `date` and `chapter` as reusable
  JSON Schema scalar types.
- The `date` definition supports canonical calendar-year and within-year-index
  strings, and states that a year-only value is not ordered against an indexed
  value in the same year.
- The `chapter` definition supports only canonical positive `book.chapter`
  strings, with both components visible to readers.
- The document distinguishes story time from reader order and does not make a
  date value a spoiler-visibility key.
- The document defines guarded `furthestChapterRead`, selectable `viewChapter`, and
  their visibility constraint, then applies story time independently to project state.
- Every chapter schema requires one or more appearances and at least one `lead`.
- Temporal validation rejects state writes whose effective dates cannot be ordered
  without inventing story chronology.
- The zero-state source owns the pre-book Solar-System location tree; chapters own
  later introductions and patches. Entity registries and all visible state are
  generated and explicitly prohibited from manual editing.
- Locations have one optional parent link, derived children, explicit unmapped
  locations, root transit locations, and optional validated astronomy-node links.
- The document distinguishes authored assets from their chapter-controlled picture
  assignments and prohibits copied astronomy render facts.
- `books.json` contains only numeric-keyed book titles; every chapter has a separate
  canonical source file, and the generator emits an ordered manifest containing only
  chapter references and source paths.
- The nested zero-state source supplies a stable local child order without copying
  measured astronomy render facts; chapters cannot re-introduce seeded IDs.
- The zero-state schema fixes the mapped Solar-System root and its single Sol child;
  validates its closed location-kind and parent-relation vocabulary; uses authored
  orbital sibling order without storing distances; and permits no assets or embedded
  source-version field.
- Separate semantic validation checks the eight-planet-through-Neptune Solar
  inventory, ordered asteroid/Kuiper/Oort regions, and the maximum of four curated
  moons per planet.
- Every present or future narrative `description` or `state` field is an optional,
  nonempty plain string, without Markdown or a controlled vocabulary.
- ADR-0003 and directly affected integrated design documents reflect the same
  three-source authority boundary.
- The task index reflects this documentation work without changing BOB-001.

## Validation commands

```bash
git diff --check
rg -n '"date"|"chapter"|story time|reader order' docs/data-model-definition.md
rg -n 'effective story date|role: "lead"|minContains' \
  docs/data-model-definition.md
rg -n 'books.json|chapter-manifest|chapters/<book>/<chapter>.json' \
  docs/data-model-definition.md
rg -n 'zero-state|chapter-authored|generated|one-parent|furthestChapterRead|story-time' \
  docs/adrs/0001-chapter-authored-narrative-state.md \
  docs/adrs/0002-reader-order-visibility-and-story-time-projection.md \
  docs/adrs/0003-zero-state-solar-system-baseline.md \
  docs/technical-design.md docs/data-model-definition.md
awk 'BEGIN{inside=0; seen=0} /^```json$/{if(!inside && !seen){inside=1; seen=1; next}} /^```$/{if(inside){exit}} inside{print}' \
  docs/data-model-definition.md | jq empty
```

## Completion boundary

This task remains in progress while additional scalar and record definitions are
being ratified. It may be marked `Done` only after the agreed narrative record
schemas and their cross-reference rules are documented and reviewed.
