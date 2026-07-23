# BOB-002: narrative data-model definition

Status: In progress
Phase: 2 (design preparation)
Last updated: 2026-07-23

## Objective

Define the unversioned, JSON-Schema-backed data model for the zero-state Solar-System
baseline and later Phase 2 narrative records, beginning with shared scalar types. This
is documentation-only design work; it does not add book-derived data, a timeline, or
runtime behavior.

## Binding references

- `../technical-design.md`, especially Section 12
- `../implementation-plan.md`, Phase 2
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
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
- A future date-exploration projection may use any requested story date, but derives
  only from the reader-visible chapter state and never gains facts from later chapters.
- Every chapter requires canonical `chapter`, title, original plain-text summary, story
  date, and default location. Its optional `introducing`, `appearances`, and `updates`
  arrays are omitted when empty and nonempty when present; an appearance array contains
  at least one `lead`.
- Temporal validation rejects state writes whose effective dates cannot be ordered
  without inventing story chronology.
- The zero-state source owns the pre-book Solar-System location tree; chapters own
  later introductions and patches. Entity registries and all visible state are
  generated and explicitly prohibited from manual editing.
- Baseline and chapter locations share one closed kind vocabulary. Chapter locations
  have explicit parent relations, map-status and root rules, root transit locations,
  inherited mapped-system context, and no invented coordinates.
- The document distinguishes authored assets from their chapter-controlled picture
  assignments and prohibits copied astronomy render facts.
- `data/narrative/assets.json` is an unversioned direct registry that may be empty;
  each asset has a unique stable ID and path, a nonempty source note, and an existing
  safe static file beneath `public/assets/`. Asset metadata is not chapter chronology.
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
- `introducing` is a heterogeneous ordered array; entries may reference seeded
  entities or earlier entries only. Updates target seeded or earlier-chapter entities,
  never entities introduced by the current chapter.
- Every present or future narrative `description` or `state` field is an optional,
  nonempty plain string, without Markdown or a controlled vocabulary.
- Narrative source records and generated narrative outputs contain no `schema_version`
  field; the shared schema declares Draft 2020-12 and has one unversioned stable `$id`.
- ADR-0003 through ADR-0005 and directly affected integrated design documents reflect
  the same three-source authority boundary, unversioned schema contract, and
  spoiler-safe projection rules.
- The task index reflects this documentation work without changing BOB-001.

## Validation commands

```bash
git diff --check
rg -n '"date"|"chapter"|story time|reader order' docs/data-model-definition.md
rg -n 'effective story date|role: "lead"|minContains|introducing|parent_relation|map_status' \
  docs/data-model-definition.md
rg -n 'books.json|chapter-manifest|chapters/<book>/<chapter>.json' \
  docs/data-model-definition.md
rg -n 'zero-state|chapter-authored|generated|one-parent|furthestChapterRead|story-time' \
  docs/adrs/0001-chapter-authored-narrative-state.md \
  docs/adrs/0002-reader-order-visibility-and-story-time-projection.md \
  docs/adrs/0003-zero-state-solar-system-baseline.md \
  docs/adrs/0004-unversioned-narrative-schema-contract.md \
  docs/adrs/0005-chapter-location-and-date-projection-refinements.md \
  docs/technical-design.md docs/data-model-definition.md
awk 'BEGIN{inside=0; seen=0} /^```json$/{if(!inside && !seen){inside=1; seen=1; next}} /^```$/{if(inside){exit}} inside{print}' \
  docs/data-model-definition.md | jq empty
jq empty data/narrative/assets.json
! rg -n '"schema_version"[[:space:]]*:|required.*schema_version|versioned JSON Schema|narrative-data-model-[0-9]' \
  docs/data-model-definition.md docs/technical-design.md docs/implementation-plan.md
```

## Completion boundary

This task remains in progress while additional scalar and record definitions are
being ratified. It may be marked `Done` only after the agreed narrative record
schemas and their cross-reference rules are documented and reviewed.
