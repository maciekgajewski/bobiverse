# BOB-20261116-ZBZF9F: in-app Back navigation

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-16

## Objective and user-visible outcome

- Device Back (Android Back, iOS swipe-back, desktop Back, Alt+Left, mouse
  Back) works inside the atlas: it closes About or What's new, steps back
  through the inspector cards, closes the card at the first one, and only
  then leaves the site.
- Soft ← / → in the inspector are the same steps as device Back / Forward.
- X, Escape and an empty map tap fully dismiss the card.
- A confirmed read-through change or Forget progress clears the card stack;
  neither Back nor Forward can bring the old cards back.
- The chapter stepper, chapter links over an open card, the menu, Search,
  the timeline and the pickers create no history entries.

## Spoiler gating

`history.state` never carries reader progress, and nothing on the Back path
writes `furthestChapterRead`. Entries from an older generation, or whose
selections are no longer eligible in the current projection, are never
shown; they are rewritten to the current UI.

## Authorization

- Maciej asked for in-app Back on 2026-11-15. The Piotr Developer Manager
  approved back-nav design revision 2 as matching his direction and
  assigned the implementation as a local branch for review: no push, no
  merge to master and no tag.
- Implementation order (manager): chapter links, screen-space picking, the
  chapter stepper, then this task.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md` (inspector history)
- [ADR-0030](../adrs/0030-in-app-back-via-browser-history.md)

## Scope

- `src/app-history.ts`: entry shape, projection, sync planner, the
  `AppHistorySync` controller (pending-walk guard, stale handling) and the
  per-tab generation.
- `src/App.tsx`: the `popstate` handler, projection sync, soft Back /
  Forward via `history.back()` / `forward()`, full dismiss on X / Escape /
  map deselect, dialog entries, generation-guarded clears and rewrites, and
  reload restore.
- `src/components/ProgressControls.tsx`: Back closes the open chapter
  picker.
- `docs/technical-design.md` and ADR-0030.
- Tests: `tests/unit/app-history.test.ts`, extensions to
  `tests/component/App.test.tsx`, and `tests/e2e/back-nav.spec.ts`.

## Out of scope

- URLs, hashes and deep links; storing progress in history.
- Enter system (disabled behind `ENABLE_ENTER_SYSTEM`); it keeps its own
  entry.
- Book text, `data/`, push, merge to master and tagging.

## Acceptance criteria

1. Each user selection (map tap, search or browser pick, caption,
   relationship, inline link, breadcrumb) pushes exactly one entry.
2. Soft Back calls `history.back()` once, and `popstate` applies the step.
   Device Back at index 0 closes the card.
3. X on the compact sheet calls `history.go(-(index + 1))` once and closes
   the card; nothing pops twice.
4. About and the auto-shown What's new push one entry each; Escape or
   device Back closes them without a second pop and without touching the
   cards.
5. A confirmed read-through change pushes nothing, closes the card, and
   neither Back nor Forward restores the old cards.
6. The stepper and `selectTimelineChapter` over an open card push nothing.
7. Reload restores the stack only for the current generation with every
   selection eligible, and never changes progress.
8. e2e on desktop and a 390px phone: Back closes What's new, walks the
   cards, closes the card, then leaves; Forward after one step restores it;
   the stepper adds no entries.

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
# e2e: chromium, firefox and webkit on port 5209, one worker, no retries,
# untracked playwright.alt5209.config.ts, deleted afterwards.
# CSP e2e on port 4209 with a matching temporary config, deleted afterwards.
```

## Risks and decisions

- Close controls (X, Escape, map deselect, dialog close) update the React
  state at once and let the browser catch up with `back()` / `go(-n)`; the
  landing `popstate` only finishes the browser side. The design had the
  `popstate` apply the close. Both apply the change exactly once; updating
  at once keeps the UI responsive if a `popstate` is slow or never comes
  (a 3 s fallback then rewrites the current entry).
- `selectTimelineChapter` with no card open opens a chapter card and pushes
  one entry, like any other selection, so device Back closes it rather than
  leaving the site. Over an open card it rewrites in place and pushes
  nothing.
- A stale `popstate` is rewritten to a copy of the current entry, so after
  a clear one Forward or Back press can appear to do nothing.
- The auto-shown What's new entry is pushed on the reader's first user
  activation (pointerdown or keydown), not at start-up. Chrome and Firefox
  skip entries pushed before any interaction, together with the entry they
  were pushed from, so a start-up push would make the first Back leave the
  site. Firefox e2e caught this: `goBack()` left the auto-shown notes open.
- The skip link's `#map-stage` fragment entry is not part of the projection
  and is ignored by the handler.

## Log

### 2026-11-16 (Europe/Warsaw)

- Implementation started on `bob-20261116-back-nav` in
  `~/src/bobiverse-backnav`, based on origin/master `5011537`.
- Firefox e2e showed that browsers skip history entries pushed before any
  user interaction; the auto-shown What's new entry now waits for the first
  activation (see Risks and decisions).
- `tests/e2e/atlas.spec.ts` `settleMapCamera` now waits for the map
  performance bridge, as `emptyMapClickPosition` already did; a cold dev
  server made `empty map clicks clear inspection selection` fail once on
  chromium with "Map performance bridge is unavailable".
- Full validation: `tasks.py check` (103 task files, 32 ADRs),
  format:check, lint (existing AboutDialog fast-refresh warning only),
  typecheck, 694 tests, 90 data tests, data:validate, narrative:validate,
  build, `git diff --check`, and Prettier on the changed Markdown.
- e2e at `fec1803` on chromium, firefox and webkit, one worker, no retries,
  temporary untracked `playwright.alt5209.config.ts` on port 5209: 274
  passed, 11 skipped, 0 failed (41.6m): chromium 91 passed / 4 skipped,
  firefox 91 / 4, webkit 92 / 3. All 15 back-nav runs passed. Port 5173
  was left untouched.
- CSP e2e on port 4209 with a matching temporary config: 3 passed (15.4s).
  Both temporary configs were deleted afterwards.
- Review-fix commits on top of `7fe2d1a` (`aabb55b`, `d7d04d9`, `92e6a23`,
  `60d1857`): stale-popstate reconcile from entry depth, lowered-progress
  reload test, What's new push on a real activation, and an idempotent
  StrictMode generation bump.
- Full validation at `60d1857`: `tasks.py check` (103 task files, 32 ADRs),
  format:check, lint (existing AboutDialog fast-refresh warning only),
  typecheck, 696 tests, 90 data tests, data:validate, narrative:validate,
  build, `git diff --check`, and Prettier on the changed Markdown.
- e2e at `60d1857` on chromium, firefox and webkit, one worker, no retries,
  temporary untracked `playwright.alt5209.config.ts` on port 5209: 274
  passed, 11 skipped, 0 failed (41.7m): chromium 91 passed / 4 skipped,
  firefox 91 / 4, webkit 92 / 3. All 15 back-nav runs passed. Port 5173
  was left untouched.
- CSP e2e on port 4209 with a matching temporary config: 3 passed (15.6s).
  Both temporary configs were deleted afterwards.
