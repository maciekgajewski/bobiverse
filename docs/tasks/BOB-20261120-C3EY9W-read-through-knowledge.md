# BOB-20261120-C3EY9W: Read through as the knowledge bound

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-20

## Objective and user-visible outcome

Make Read through the app's knowledge bound (constitution §1, §5 item 1, §6
step 2; plan T4). The app builds every world from all chapters up to Read
through (`furthestChapterRead`), and the selected chapter or date is only the
soft ceiling. Readers who go back to an earlier chapter, or pick a date, after
reading further see that moment filled in with what later chapters revealed
about it, never past Read through. Activity (the browser's active and recent
items, the map's active systems and the date card's activity) is cut at the soft
ceiling, so it never names something that does not exist yet.

## Authorization

- The Piotr Developer Manager relayed approval on 2026-11-20 (Europe/Warsaw)
  to continue with T4 under the approved constitution plan, after T3
  (BOB-20261116-TB1C66) landed.

## Binding references

- `../design-principles.md` §1, §2.3, rules (a), (c), (d), (e), §5 items 1, 4
  and 6, §6 step 2
- `../adrs/0031-design-principles-constitution.md`
- `BOB-20261116-TB1C66-two-ceiling-projection.md` (follow-up for T4 and review
  nit 2)

## Scope

1. `projectReaderProgress` (`src/App.tsx`) passes
   `{ readThrough: furthestChapterRead, softCeiling, chapter }` to
   `generateNarrativeWorld`: in chapter view the soft ceiling is the selected
   chapter's latest date (`chapterSoftCeiling`) and `chapter` is the selected
   chapter; in Date view it is the selected date. The zero-knowledge view
   (no selected chapter) stays the pre-book zero state.
2. Date-view options come from `meaningfulNarrativeDateOptions` for Read
   through, both for progress normalization and the date selector, so a date
   revealed after the selected chapter can be chosen and stays selected.
3. A world's `activity` keeps activity through Read through whose date is known
   at the soft ceiling (`isKnownAtCeiling`, rule (e)) and whose entity the world
   shows; undated activity takes its source chapter's date (rule (c)).
4. The browser's and map's Date-view activity filters compare against the
   world's soft ceiling (`narrativeWorldSoftCeiling`) with `isKnownAtCeiling`
   instead of the strict `isNarrativeDateEligible` (§5 item 4).
5. Last-known locations and travel histories follow automatically: they already
   use the world's two ceilings.

## Out of scope

- T5: "as of chapter X" / "as of year Y", "no known state as of …" and cards for
  entities that do not exist yet (rules (b) and (g)).
- T6: view labels; the map badge and selector still say "Knowledge through
  Chapter X" naming the selected chapter.
- Arbitrary dates in the date selector; validation's strict
  `isNarrativeDateEligible` (`effective_date` against the chapter date); the
  generated `effective_date: null` on activity for undated events.
- Chapter data and schema.

## Acceptance criteria

- With Read through ahead of the selected chapter, the world uses every chapter
  up to Read through, with the selected chapter's latest date as soft ceiling,
  and still resolves that chapter's detail (every canonical chapter, Read
  through the last chapter).
- Date options are those of Read through; a stored date revealed after the
  selected chapter is kept in Date view.
- World activity holds nothing dated after the soft ceiling and names only
  entities the world shows; undated activity is dated by its chapter.
- A year- or month-precision activity counts for its whole period in the
  browser and map Date-view filters.
- Nothing from a chapter after Read through appears.

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

Plus e2e on chromium, firefox and webkit (one worker, no retries) and the CSP
check, since what the app shows changes.

## Documentation and generated artifacts

`docs/technical-design.md` (projection coordination, Date mode options,
activity) and `docs/data-model-definition.md` (what regenerates a world)
describe the wiring; constitution §5 items 1, 4 and 6 record what is done. The
equivalence snapshot is regenerated: chapter-view and Date-view worlds lose
activity dated after their soft ceiling (deletions only, 472 records).

## Known risks or unresolved decisions

- Until T6, the badge "Universe in Y · Knowledge through Chapter X" names the
  selected chapter although the world now uses everything read; T6 drops that
  wording. Steps 2–4 of the plan ship together (§6 step 5), so readers never
  see the interim label.
- The zero-knowledge view stays the pre-book zero state rather than a world
  built from Read through: it has no story date to serve as soft ceiling.
- Chapter-view browser recency still orders activity by reading order, so an
  item's latest activity can come from a chapter read after the selected one
  when it is dated at or before the soft ceiling.

## Log

### 2026-11-20 (Europe/Warsaw)

- Created on master `1b1fdbd` on local branch
  `bob-20261120-read-through-knowledge` in the `~/src/bobiverse-t4` worktree.
- Committed `a3fdf27`; marked BOB-20261116-TB1C66 Done (`d38e281`). Full
  validation at `d38e281` passed: `tasks.py check`, format:check, lint,
  typecheck, test (63 files, 824 tests), data:test, data:validate,
  narrative:validate, build and `git diff --check`; e2e with one worker and no
  retries on chromium (94 passed, 4 skipped), firefox (94 passed, 4 skipped)
  and webkit (95 passed, 3 skipped); the CSP check (3 passed).
- With Read through at the last chapter, chapter view shows entities the
  chapter's own Read through does not at 1.12, 1.15, 1.19, 1.21, 1.23, 1.24,
  1.27, 1.28, 1.30, 1.32, 1.34, 1.35, 1.37, 1.39, 1.40, 1.44, 1.48, 1.50,
  1.51, 1.52 and 1.54 (for example 32 more at 1.27), and current state differs
  at more chapters.
- Awaiting manager review.
