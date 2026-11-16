# BOB-20261116-8HRK93: ceiling date helpers

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-16

## Objective and user-visible outcome

Add the pure story-time helpers the soft-ceiling projection (T3) needs, from the
design principles (`docs/design-principles.md`, ADR-0031): rule (e) calendar
precision, §3.1 a chapter's latest date (the chapter soft ceiling, rule (d)), and
rule (a) an entity's earliest known story date. This implements §5 item 4 as
helpers; the projection does not use them yet, so nothing changes for readers.

## Authorization

- Plan approved by the Piotr Developer Manager on 2026-11-16 (Europe/Warsaw),
  relayed: start T1 and T2 now and send each commit for review. T2 is the date
  helpers only, with no projection changes (those are T3).

## Binding references

- `../design-principles.md` rules (a), (c), (d), (e), §3.1, §5 item 4
- `../adrs/0026-calendar-precision-narrative-dates.md`
- `../adrs/0031-design-principles-constitution.md`
- `src/narrative/model.ts` (`compareNarrativeDates`, `compareNarrativeMoments`,
  `isNarrativeDateEligible`)

## Scope

1. Add `src/narrative/ceiling.ts` with exported pure helpers:
   - `isKnownAtCeiling(factDate, ceiling)`: rule (e). Known when the fact's
     calendar range starts on or before the end of the ceiling's range; identical
     ranges compare ordering suffixes as ADR-0026 does.
   - `chapterLatestDate(chapter)`: §3.1. Latest of the header date, introduced
     event dates, event dates supplied by updates (a clearing `null` does not
     count) and update `effective_date`s, by range end, then start, then suffix.
   - `entityEarliestDates(chapters, readThrough)` and
     `entityEarliestDate(chapters, entityId, readThrough)`: rule (a), from
     chapters up to Read through.
2. Export `narrativeDateRange` and `NarrativeDateRange` from `model.ts` so the
   helpers share the memoized ADR-0026 calendar ranges.
3. Unit tests in `tests/unit/narrative-ceiling.test.ts`.

## Out of scope

- Projection, view, card or label changes (T3 onwards).
- `isNarrativeDateEligible` and validation, which stay strict.
- Chapter data, schema and sentence-preservation changes.

## Acceptance criteria

- `2185` is known at a `2185-04` ceiling, `2185-04` at a `2185` ceiling, and
  `2185-05` is not known at a `2185-04` ceiling; suffix ties follow ADR-0026.
- Canonical chapter 1.24 resolves to the date of event `four-asteroid-diversion`
  as read from its data (currently `2157`), which is later than its header; a
  chapter without dated events or effective dates resolves to its header date.
- A backdated update lowers an entity's earliest date once its chapter is read,
  and never before.
- `isNarrativeDateEligible` behaviour is unchanged.

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

## Risks and decisions

- `entityEarliestDates` takes chapter records rather than a prepared corpus, so T3
  can pass `preparedNarrativeChapters(corpus)` and a Read-through chapter and build
  the map once per projection. Zero-state entities exist at every ceiling and are
  in the map only when a chapter writes about them.
- One earliest date per entity is exact under `isKnownAtCeiling` except for
  suffixed dates sharing a start with a coarser date (for example `2185-01.2` and
  `2185` against a `2185-01.1` ceiling), which canonical data does not contain.
- Facts are dated as the projection dates them: event writes use the event's own
  date, other updates `effective_date ?? chapter date`, appearances the chapter
  date; undated facts take the revealing chapter's date (rule (c)).

## Log

### 2026-11-16 (Europe/Warsaw)

- Created on master `29f8274` on local branch
  `bob-20261116-ceiling-date-helpers` in the `~/src/bobiverse-t2` worktree.
- Added `src/narrative/ceiling.ts` and 50 unit tests. Validation passed:
  `tasks.py check`, format:check, lint, typecheck, test (60 files, 788 tests),
  data:test (90 tests), data:validate, narrative:validate, build and
  `git diff --check`. No e2e (no UI change). Sent to the manager for review.
- Approved by the manager at `e9f5961`. Per the manager, the canonical 1.24 test
  now reads the `four-asteroid-diversion` date from the chapter data instead of
  a literal (`9fae5f4`). Merged master `3be3086` (T1, BOB-20261116-E87SYK) into
  the branch without conflicts, revalidated, and landed with the no-ff merge
  "Merge BOB-20261116-8HRK93: ceiling date helpers". Done.
