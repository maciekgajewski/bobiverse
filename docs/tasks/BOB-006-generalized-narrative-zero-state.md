# BOB-006: generalized narrative zero state

Status: Done
Phase: 2 (narrative foundation)
Last updated: 2026-07-24

## Objective

Replace the location-only Solar-System baseline with one validated, reader-visible
zero-state record that can seed every narrative entity type: locations, species,
characters, and events. The initial canonical content includes the complete Solar
System and the Human species, so a reader can know humanity and its homeworld before
opening chapter 1.1.

## User-visible outcome

Before a chapter is selected, the projected world contains the Solar-System location
tree and `species:human`. Chapter 1.1 introduces Robert Johansson, Las Vegas, and his
death event, but it does not introduce humanity again. The selected chapter projection
continues to resolve Robert's `species_id` against the zero-state entity registry.

## Binding references

- `../data-model-definition.md`, especially Zero-state and chapter-authored source
  records
- `../technical-design.md`, Section 12
- `../implementation-plan.md`, Phase 2
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `BOB-002-narrative-data-model-definition.md` and
  `BOB-004-narrative-zero-state-and-projection.md` (completed baseline)
- `../../AGENTS.md`

An accepted ADR must explicitly supersede the location-only zero-state ownership and
source-layout wording in ADR-0003 before implementation changes the schema or data.
If that ADR conflicts with any binding reference, stop and resolve the conflict.

## Decisions

- The canonical source path becomes `data/narrative/baseline/zero-state.json`.
  `data/narrative/baseline/solar-system.json` is retired; no compatibility filename,
  fallback path, or duplicate authored source remains.
- The zero-state record is pre-book reader-visible state, not a staging area for later
  revelations. A seeded entity is visible before any chapter and cannot subsequently
  be introduced by a chapter.
- The record has exactly two required fields: `locations`, one nested Solar-System root
  object, and `entities`, an array of zero-state species, characters, and events.
  Assets remain in `data/narrative/assets.json`; book and chapter metadata remain in
  their existing sources.
- `locations` retains its nested authoring form and the fixed Solar-System topology.
  `entities` uses the same direct character, species, and event contracts as chapter
  introductions. Factor those three contracts into one shared non-location definition;
  the chapter's `introduced_entity` definition composes that definition with its flat
  chapter-location branch. The zero-state record does not use the chapter-only field
  name `introducing` and does not permit a second flat location form.
- The entire zero-state record is one atomic initial snapshot. References from a
  zero-state entity may resolve to the nested location tree or any zero-state entity,
  regardless of `entities` array order; `picture_id` references continue to resolve
  through the separate asset registry.
- Seeded entities may be targets of normal later chapter updates, subject to the
  existing reader-order and story-time rules.
- Seed `species:human` with name `Human` and `homeworld_id: "location:earth"`.
  Remove that entity from chapter 1.1's `introducing` collection. Do not move Robert
  Johansson, Las Vegas, or the death event into the zero state.

## In scope

- Define a generalized zero-state source schema with exactly the required `locations`
  root and `entities` array, plus semantic validation of unique IDs, whole-snapshot
  references, and the existing fixed Solar-System location topology.
- Migrate the canonical source path, loader, validator, generator, test fixtures, and
  diagnostics from the Solar-System-only baseline to the generalized record.
- Seed Human as a zero-state species and adjust chapter 1.1 so all cross-record
  references remain valid without duplicate introduction.
- Ensure zero-state and selected-chapter projections deterministically include all
  seeded entity types; preserve existing chapter update, reader-visibility, and
  story-time projection behavior.
- Add focused regression coverage for valid seeded species, character, and event
  records; invalid typed records and references; duplicate zero-state/chapter IDs; a
  later update to a seeded entity; and the Human/Robert chapter-1 migration.
- Write the superseding ADR and update the data-model definition, technical design,
  implementation plan, source-layout documentation, validation diagnostics, and other
  directly affected documentation.

## Out of scope

- Adding any asset, book metadata, chapter metadata, reader-progress value, update,
  appearance, or generated projection to the zero-state authored record.
- Additional canonical book facts beyond the Human species and the required chapter
  1.1 removal.
- New UI, timeline, progress, map-rendering, asset, extraction, or remote-service
  behavior.
- Compatibility support for `baseline/solar-system.json`, automatic source migration,
  or retaining duplicate canonical data.
- Rewriting BOB-004's historical task record or completion evidence.

## Acceptance criteria

1. An accepted ADR and the integrated design documentation define the generalized
   zero-state record as the initial reader-visible entity registry and explicitly
   supersede the conflicting location-only wording in ADR-0003.
2. `data/narrative/baseline/zero-state.json` is the sole canonical zero-state source.
   The retired `solar-system.json` path is absent from runtime loading and canonical
   source validation.
3. The schema accepts only a closed zero-state object with required `locations` and
   `entities` fields. `locations` is exactly one nested Solar-System root; `entities`
   accepts only the shared character, species, and event introduction contracts. It
   rejects unsupported fields, malformed entities, and a second flat location form;
   corpus validation rejects duplicate IDs, unresolved whole-snapshot references, and
   invalid Solar-System topology.
4. The zero state retains the complete validated Solar-System location tree and adds
   exactly the canonical Human species record with `homeworld_id: "location:earth"`.
   It contains no assets, book/chapter metadata, updates, appearances, or copied book
   prose.
5. Chapter 1.1 no longer introduces `species:human`; its Robert Johansson record
   still resolves `species_id: "species:human"`, and canonical validation succeeds.
6. Pre-book projection exposes the Human species and the Solar-System tree. A chapter
   projection preserves every existing visibility and story-time invariant while
   allowing later chapter updates to seeded entities.
7. The shared browser-safe projection module, Node CLI, schema diagnostics, and test
   fixtures use the generalized source consistently. No Node filesystem API leaks into
   the shared module.
8. Regression tests prove each supported seeded entity type, order-independent
   whole-snapshot references, asset references, duplicate-introduction rejection, and
   the chapter-1 Human migration. Generated projections remain non-authored,
   non-committed outputs.
9. The normal validation path validates the migrated canonical corpus, and all
   documented validation commands pass.

## Validation commands

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run narrative:validate
./bin/narrative-generate.sh > /tmp/bobiverse-world.json
./bin/narrative-generate.sh --chapter 1.1 > /tmp/bobiverse-chapter-1-1.json
npm run test
npm run build
git diff --check
```

The generated files are diagnostic outputs only and must remain outside version
control.

## Risks and unresolved decisions

- No unresolved product or source-layout decisions remain for this task.
- The current schema and projection code assume a location-only root. Implementers
  must update schema, semantic validation, diagnostics, loaders, and fixtures as one
  cohesive migration; partial compatibility would leave two contradictory sources of
  truth.
- The Human record is book-derived structured data. Its wording remains limited to
  the reviewed ID, name, and Earth homeworld; do not add source text or unreviewed
  narrative details.
