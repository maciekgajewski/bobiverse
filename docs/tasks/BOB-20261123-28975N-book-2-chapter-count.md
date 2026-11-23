# BOB-20261123-28975N: correct Book 2 chapter_count to 77

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-23

## Objective and user-visible outcome

`data/narrative/books.json` records Book 2, "For We Are Many", as having 57
chapters (set in `d00a440`). The book has 77 chapters; the Extractor verified
headings 58–77. Preflight item 7 therefore rejects every target from `2.58`
onward as past the catalogue count.

After this task, Book 2's `chapter_count` is 77. The candidate-entity checker,
narrative validator, and extraction preflight already read the count from
`books.json`; they keep doing so, with no hard-coded book length. There is no
visible change to the app until later chapters land.

## Binding references

- `BOB-20261116-6D7ER3-book-2-extraction-preflight.md` (added optional
  `chapter_count` and the Book 2 catalogue entry)
- `../data-model-definition.md` (book catalogue; no chapter may exceed its
  book's `chapter_count`)
- `../chapter-extraction-checklists.md` (Checklist A item 7)

## In scope

1. Set Book 2 `chapter_count` to 77 in `data/narrative/books.json`.
2. Confirm `scripts/candidate_entities.py`, the narrative validator, and
   `scripts/extraction_preflight.py` read the count from `books.json`, and
   remove any hard-coded book length found in that audit.
3. Add or adjust a cheap test that a chapter at the catalogue count (`2.77`) is
   accepted and the next number is rejected, and that `catalogued()` uses
   `books.json`.
4. This task file.

## Out of scope

- Editing chapter JSON or candidate entity records.
- Landing later Book 2 chapters, a LAN deploy, or e2e (no UI change).
- Changing the optional nature of `chapter_count`.

## Acceptance criteria

1. `books.json` records `chapter_count` 77 for book 2, and 61 for book 1.
2. Candidate validation, narrative validation, and preflight item 7 take the
   count from `books.json`, not a hard-coded 57 or 77.
3. Tests accept a fixture chapter `2.77` at count 77 and reject `2.78`.
4. Fast checks pass: `tasks.py check`, format, lint, typecheck, test,
   data:test, data:validate, narrative:manifest then narrative:validate, build,
   and `git diff --check`.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run narrative:manifest
npm run narrative:validate
npm run build
git diff --check
```

e2e is not required (no UI change).

## Documentation and generated artifacts

No doc or generated-artifact updates beyond this task file and a stale test
comment that still said the catalogue recorded 57 chapters for book 2.

## Risks and unresolved decisions

None. The 77-chapter figure comes from the Extractor's heading check on the
source text. Tooling already consulted `books.json`; only the stored count was
wrong.

## Log

- 2026-11-23: implemented on a branch from master `96bc6d4`.
