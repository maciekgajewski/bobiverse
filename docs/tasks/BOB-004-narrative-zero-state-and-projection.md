# BOB-004: narrative zero state and chapter projection

Status: Done
Phase: 2 (narrative foundation)
Last updated: 2026-07-23

## Objective

Make the zero-state Solar System a complete, valid pre-book narrative world and
provide the shared browser-safe TypeScript path that validates authored chapter sources
and generates a deterministic world state for a selected chapter.

## Binding references

- `../data-model-definition.md`
- `../technical-design.md`, Section 12
- `../implementation-plan.md`, Phase 2
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../../AGENTS.md`

## Scope

- Publish the shared Draft 2020-12 JSON Schema as a machine-readable source and
  validate it directly with Ajv.
- Implement a browser-safe TypeScript narrative validation and projection module.
- Implement a Node CLI wrapper that reads the authored corpus, validates it, and
  writes an explicitly requested, uncommitted projection file.
- Add the complete nested zero-state Solar-System source, the empty asset registry,
  and an empty `books.json` catalogue. The zero state alone must validate before a
  book or chapter is authored.
- Validate source structure plus cross-record semantic rules: IDs, source ordering,
  references, updates, date comparability, Solar-System inventory, and astronomy IDs.
- Generate a selected chapter's reader-safe, story-time-correct entity state and
  derived location child lists from the same module the browser will later use.
- Add fictional test-only multi-chapter fixtures and regression coverage. They are not
  canonical narrative data and must not contain book-derived facts.
- Update the normal build and directly affected documentation.

## Out of scope

- Any canonical book, chapter, character, event, species, or later narrative source
  record beyond the pre-book Solar-System zero state.
- Timeline, progress controls, spoiler UI, chapter browsing, data loading UI, or map
  rendering changes.
- Committed generated world snapshots, source-text extraction, images, or assets.

## Acceptance criteria

1. `data/schema/narrative-data-model.schema.json` is the unversioned Draft 2020-12
   contract documented by `docs/data-model-definition.md`, and Ajv evaluates it
   directly.
2. The zero-state source contains exactly the documented Solar-System root, Sol, eight
   ordered planets, asteroid belt, Kuiper belt, and Oort cloud; it contains no copied
   astronomy measurements or book-derived facts.
3. `data/narrative/books.json` may be empty before the first chapter, but a chapter
   whose book is absent from that catalogue is rejected.
4. `npm run narrative:validate` validates the actual zero-state corpus, including the
   empty asset registry and known astronomy system IDs.
5. `npm run narrative:generate -- --output <file>` emits the deterministic pre-book
   world state; a supplied `--chapter <book.chapter>` emits that selected projection
   after validation. Generated output is never committed or treated as authored input.
6. The shared module is independent of Node filesystem APIs; the CLI is its thin Node
   wrapper and the future browser uses the same validation/projection implementation.
7. The validator rejects malformed schema records, invalid zero-state topology,
   duplicate or out-of-order records, unresolved references, duplicate updates,
   same-chapter update targets, missing lead appearances, unknown book or astronomy
   IDs, and equal or incomparable competing story-time writes.
8. Tests use a fictional multi-chapter fixture to prove reader-order visibility and
   story-time projection are distinct. No book-derived chapter data is committed.

## Validation commands

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run narrative:validate
npm run narrative:generate -- --output /tmp/bobiverse-world.json
npm run test
npm run build
git diff --check
```

The normal build runs narrative validation. The generated file is an operator-selected
artifact and must be written outside version control (for example, under `/tmp`).

## Completion evidence

Completed on 2026-07-23.

- `npm run narrative:validate` validates the canonical zero state with zero authored
  chapters and the intentionally empty asset and book catalogues.
- `npm run narrative:generate -- --output /tmp/bobiverse-world.json` writes the
  13-entity pre-book projection without creating a repository artifact.
- `npm run validate` passes formatting, linting, strict TypeScript, astronomy-data
  validation, all 31 Vitest tests, narrative validation, and the production build.
- The shared schema file is JSON-valid and exactly matches the normative schema
  listing in `docs/data-model-definition.md`.
