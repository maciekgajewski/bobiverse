# BOB-20261116-6D7ER3: Book 2 catalogue entry and book-boundary extraction preflight

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-16

## Objective and user-visible outcome

The Extractor can start book 2. Today the extraction preflight (Checklist A item 7)
refuses every book 2 target: `2.1` because it cannot establish a predecessor across
the book boundary (`books.json` records no chapter counts), and `2.2`+ because the
predecessor is not canonical and a pending chain needs a canonical chapter in book 2.
`books.json` also has no book 2 entry.

After this task, `books.json` records each book's chapter count and catalogues book 2,
"For We Are Many" (57 chapters). The preflight places the first chapter of a later
book after the previous book's last chapter (`1.61` precedes `2.1`), and pending
chains cross the boundary by the same rule. Within a book the rule is unchanged. There
is no visible change to the app: book 2 has no canonical chapters yet.

## Authorization

- Relayed by the Piotr Developer Manager on 2026-11-16 (Europe/Warsaw), passing on
  the Captain's request that the app handle book 2 (book 2 chapters have titles) and
  the Extractor's report that preflight item 7 blocks all of book 2. The manager's
  decisions: handle book boundaries in item 7 (`1.61` precedes `2.1`; the first
  chapter of a new book has the previous book's last canonical chapter as its
  predecessor), based on chapter counts in `books.json` or the canonical chapter
  list; never weaken the check within a book; add tests; add a book 2 entry titled
  "For We Are Many" with 57 chapters (the manager is telling the Captain about the
  title); check sorting across `1.61` → `2.1`. Fast-tracked as a separate small
  branch ahead of the chapter-titles work, under the standing local-branch review
  process: implement on a branch for review at a commit; do not merge or deploy in
  this task.

## Binding references

- `../../AGENTS.md`
- `../chapter-extraction.md`, §Inputs and §Candidate assembly and temporary corpus
- `../chapter-extraction-checklists.md`, Checklist A item 7
- `../data-model-definition.md` (the `books.json` catalogue and semantic validation)
- `../technical-design.md` (chapter reading order: book, then chapter)

## Scope

1. `data/narrative/books.json`: add an optional positive integer `chapter_count` to
   each entry; record book 1 as 61 and add book 2, "For We Are Many", 57.
2. `data/schema/narrative-data-model.schema.json` (`books_source`) and the narrative
   semantic validator: accept `chapter_count`; reject a chapter numbered past its
   book's count.
3. `scripts/extraction_preflight.py` item 7: the predecessor of `b.1` (`b > 1`) is
   `(b-1).chapter_count`; pending chains walk reading order across the boundary; a
   target whose book has no catalogue entry, a target past its book's count and a
   boundary without a recorded count fail closed with a clear problem.
4. Numeric reading order where the pipeline sorted chapter files by name:
   `source_evidence.py prepare-corpus` (its `prior_chapters` list) and
   `scripts/narrative-cli.ts` (the order it loads chapter files).
5. Tests: preflight cases for `2.1` → predecessor `1.61`-style (synthetic counts);
   `2.1` blocked when the previous book's last chapter is not canonical; no skipping
   across books; `2.2` requires `2.1`; `2.3` requires `2.2`; `1.3` still requires
   `1.2`; pending chains back to `2.1` and across the boundary; a book with no
   catalogue entry; a target past its count; a missing count; numeric prior order.
   A narrative validator test for `chapter_count`.
6. Docs: the book-boundary rule in `../chapter-extraction.md` and Checklist A item 7;
   `chapter_count` in `../data-model-definition.md`.

## Out of scope

- Any chapter data under `data/` other than `books.json`.
- Chapter titles in the UI (separate chapter-titles branch), including how book 2
  chapters and their book divider are presented.
- Requiring `chapter_count` for every book: it stays optional so a catalogue entry
  can precede the count; the preflight fails closed without it at a boundary.

## Acceptance criteria

- Preflight for `2.1` passes item 7 with predecessor `1.61` when `1.61` is canonical,
  and fails item 7 otherwise; it never accepts `1.60` in place of `1.61`.
- `2.2`+ pass item 7 with a canonical predecessor or with pending predecessors that
  are exactly the chapters after the latest canonical one, across the boundary.
- `1.5` still requires `1.4` and `2.3` still requires `2.2`.
- A target in a book with no `books.json` entry fails item 7 naming the missing entry.
- Chapter ids order numerically across books (`1.61` < `2.1` < `2.2` < `2.10`) in the
  validators and pipeline helpers.

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
npx prettier --check <changed Markdown>
git diff --check
```

No UI code changes, so no e2e run.

## Log

- 2026-11-16: Task created on branch `bob-20261116-book2-preflight` from master
  `37deb7e`.
