# BOB-20261122-TC01E3: candidate-entity dataset

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-22

## Objective and user-visible outcome

Implement accepted ADR-0032: a candidate-entity dataset for minor first mentions,
kept outside the narrative data, and the `first_mentioned` introduction field that a
promotion writes. An entity exists from the earliest story date of any fact read
about it, mentions included (`../design-principles.md` §2.3, rule (a)).

User-visible outcome:

- A promoted entity's card shows "First mentioned in Chapter X" as a chapter link.
- Entities exist at soft ceilings from their earliest supplemental mention or first
  mention, not only from their introduction, updates and appearances.
- Unpromoted candidates never appear anywhere in the app.

## Authorization

The Captain (Maciej) accepted ADR-0032 and the §2.3 and rule (a) change on
2026-11-22 ("ok, accept"), and authorised this implementation task on 2026-11-22
11:55 (Europe/Warsaw), relayed by the manager.

The Captain approved the constitution edit (`../design-principles.md` §5 item 5) on
2026-11-22 at 14:38 CET, relayed by the manager, verbatim: "Yes, remove "Mentions do
not count yet." from §5 item 5". The manager relayed the independent review's
approval of c4cc54d, with the review nits fixed in b6cd459, and gave the go to land.

## Binding references

- `../../AGENTS.md`
- `../design-principles.md` §2.3, §3 rule (a), §5 item 5
- `../adrs/0032-candidate-entity-dataset.md`
- `../adrs/0017-supplemental-mention-completeness.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md` (exact-name rule)
- `../data-model-definition.md` §Introductions, §Supplemental mentions
- `../chapter-extraction.md` §Classification, §Review package, §Promotion

## Scope

1. `data/candidates/candidate-entities.json` and its schema
   `data/schema/candidate-entities.schema.json` (ADR-0032 §1).
2. `scripts/candidate_entities.py validate`, run by `npm run narrative:validate`
   after the narrative corpus check: ADR-0032 §4 validation, with Python tests.
3. A structural check that no `src/` module and not the narrative manifest
   references `data/candidates/`.
4. Optional introduction field `first_mentioned` (a chapter): schema, TypeScript
   validation, data-model doc. It must name a chapter in the corpus that is earlier
   than the introducing chapter. Zero-state entities cannot carry it.
5. `entityEarliestDates` counts `first_mentioned` (the named chapter's header
   date) and supplemental mentions (the mentioning chapter's header date).
   Constitution: remove "Mentions (§2.3) do not count yet." from §5 item 5 and
   bump its Last updated line; no other constitution edit.
6. The card line "First mentioned in Chapter X" (ADR-0032 S5) and the glossary
   note on the term "candidate".
7. Extraction contract: the `candidate` classification, the review row, and
   promotion. No promotion script yet: ADR-0032 §2 says it is proved by hand on
   the first promotion, then committed.
8. Seed the candidate file with Axler (2.11), the Maldives (2.14), Archimedes' son
   (2.19) and the Camelot attack (2.19), names and chapters only.

## Out of scope

- Editing chapter JSON or any Extractor data.
- A promotion script (ADR-0032 §2: after the first hand-proved promotion).
- Activity for first mentions (ADR-0032 Decided 5) and chapter-card back-references
  (Decided 4).

## Acceptance criteria

- `npm run narrative:validate` fails on a schema, uniqueness, chapter, name-match,
  promotion or `first_mentioned` violation, and passes on the seeded file.
- The structural check fails if a `src/` module or the manifest references
  `data/candidates/`.
- `entityEarliestDates` dates `first_mentioned` and supplemental mentions; unit tests
  cover both, and the hard ceiling still applies.
- The card shows the first-mention line only for an entity with `first_mentioned`.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
git diff --check
```

Before review, once: the three-browser Playwright suite and the CSP suite.

## Documentation

`../data-model-definition.md`, `../chapter-extraction.md`, `../technical-design.md`
§12 and `../design-principles.md` §5 item 5 change with this task.

## Risks and decisions

- Seeded candidates reference chapters 2.11–2.19, which are catalogued in
  `books.json` but not yet in `data/narrative/chapters/`. ADR-0032 requires
  canonical chapters; the validator accepts any chapter inside the book catalogue
  and checks the name rule against the entities visible at the first mention in the
  chapters that exist.

## Validation results

Full run on 5d2d4c7, 2026-11-22. The fast checks and the Chromium run read the tree
of 9cd4309 plus 5d2d4c7's only change (a unit-test expectation), which the unit-test
re-run covers.

- `python3 scripts/tasks.py check`, `format:check`, `lint`, `typecheck`,
  `data:test` (127 tests), `data:validate`, `narrative:validate` (71 chapters,
  4 candidates), `build`, `git diff --check`: pass.
- `npm run test`: 66 files, 856 tests passed (re-run after 5d2d4c7).
- Playwright, one worker, no retries: Chromium 95 passed, 4 skipped; Firefox 95
  passed, 4 skipped; WebKit 96 passed, 3 skipped.
- CSP suite: 3 passed.
