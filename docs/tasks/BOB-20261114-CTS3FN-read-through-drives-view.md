# BOB-20261114-CTS3FN: read-through drives the view

Status: Ready
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-14

## Objective and user-visible outcome

Today, confirming a new **Read through** chapter only moves the spoiler ceiling
(`furthestChapterRead`) once a ceiling exists. The universe on screen stays at the
old **Knowledge through** chapter (`viewChapter`) until the reader also changes
**Knowledge through**, so picking a chapter in the top-bar chip appears to do
nothing. On phones the separate **Knowledge through** select in the menu is the
only obvious way to catch up.

After this task, confirming a **Read through** chapter, forwards or backwards,
always shows that chapter's universe: `viewChapter` becomes the confirmed chapter,
in Chapter mode, at that chapter's story date. The compact (phone) menu no longer
has a **Knowledge through** select.

## Authorization

- The Captain decided this on 2026-11-14 at 22:30 (Europe/Warsaw), relayed by Piotr
  Developer Manager: "The 'knowledge through' selector in the mobile menu has no
  purpose. Selecting read-through chapter should automatically display universe
  state for the chapter."
- The manager authorised the implementation under the Captain's standing "deploy
  once ready" OK: a separate local branch, a SHA for review, then deployment after
  the manager approves it. The manager's instructions: confirming a read-through
  always sets `viewChapter` to that chapter with Chapter mode and the chapter date,
  forwards and backwards; remove `KnowledgeThroughSelect` from the compact menu;
  leave the desktop and timeline-dock knowledge controls as they are and report any
  inconsistency; keep the spoiler ceiling semantics intact; add tests.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md`, Sections 6, 10 and 12 (Section 12's Read through rule is
  updated by this task)
- `../design/phase-2-desktop-ui.md`, Section 10.1 (updated)
- `../visual-testing.md` (BOB-20261113-3VCGFP section updated, new section added)
- `BOB-011-reader-progress-and-temporal-navigation.md` (Acceptance criterion 3 is
  superseded by this task; lowering the ceiling, criterion 13, is unchanged)
- `BOB-20261113-3VCGFP-mobile-map-chrome.md` (compact menu contents)
- `BOB-20261114-MXBDTM-compact-chapter-selector.md` (top-bar chip and confirmation)

## Scope

1. `src/narrative/progress.ts`: `confirmReadThrough` sets `furthestChapterRead` and
   `viewChapter` to the confirmed chapter, `mode` to `chapter` and `displayDate` to
   that chapter's date, whether the ceiling is absent, higher, lower or equal, and
   whether the reader was in Date mode or the zero-state knowledge view.
   Returning to the pre-book zero state through **Read through** is unchanged
   (`returnToZeroState`).
2. `src/App.tsx`: remove `KnowledgeThroughSelect` from the compact menu; confirming
   a read-through also clears a stale date-context selection.
3. Tests: unit tests for forward, backward, equal, first read-through, Date mode and
   zero-state knowledge view, and that the ceiling still bounds navigation; App
   component tests for the top-bar and dock flows and the menu without the select;
   e2e tests that picking a read-through chapter on a phone and on desktop shows
   that chapter's universe. Existing tests that used the removed menu select or the
   old "view stays behind" behaviour are updated.
4. Docs: technical design, phase-2 desktop UI and visual-testing notes.

## Out of scope

- The desktop timeline dock's and the compact **Timeline and progress** panel's
  **Knowledge through** select, chapter track and Zero-state button: unchanged, and
  still able to look back at an earlier chapter or the zero state without lowering
  the ceiling.
- Any data, schema, projection, persistence or spoiler-model change; the stored
  record keeps both fields.
- Re-designing or removing the dock's own **Read through** select.

## Acceptance criteria

1. Confirming a different **Read through** chapter from the top-bar chip, the
   desktop dock or the compact **Timeline and progress** panel shows that chapter's
   universe: the status reads `Latest known · Knowledge through Chapter N`, the
   timeline is in Chapter mode, and the map and browser show that chapter's
   projection.
2. This holds going forwards and backwards, from Date mode and from the zero-state
   knowledge view.
3. `furthestChapterRead` remains the only spoiler ceiling: only a confirmed
   **Read through** choice changes it, lowering it lowers the ceiling, nothing after
   it is ever projected, and **Knowledge through**/chapter-track navigation still
   cannot pass it.
4. Cancel leaves progress and the view unchanged.
5. The compact menu has no **Knowledge through** select; it keeps Chapter/Date mode,
   **Browse objects**, **Inspect selection**, **Timeline and progress**,
   **Reset view** and **What is this?**.
6. All validation commands below pass.

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
npx playwright test --project=chromium --workers=1 --retries=0
npx playwright test --project=firefox --workers=1 --retries=0   # via xvfb-run
npx playwright test --project=webkit --workers=1 --retries=0
npx prettier --check <changed Markdown>
git diff --check
```

Manual: the Captain picks a read-through chapter on a phone and on desktop after
deployment and checks that the map, browser and status move to that chapter.

## Risks and decisions

- **Looking back is still possible.** The dock and the compact **Timeline and
  progress** panel keep **Knowledge through** and the chapter track, so a reader can
  still view an earlier chapter or the zero state without lowering the ceiling. The
  next **Read through** confirmation brings the view back to the ceiling.
- **Re-confirming the same chapter.** The chip and picker close without a
  confirmation for the current value, so nothing changes there; the transition
  itself treats an equal chapter like any other and resets the view to it.
- **Remaining inconsistency.** Desktop still shows a separate **Knowledge through**
  select in the dock, and the compact **Timeline and progress** panel still shows the
  same dock with its own select; only the compact menu loses it. Reported to the
  manager for a design decision.

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on origin/master `5c2d9d7` after the Captain's decision of 2026-11-14 22:30,
  relayed and authorised by Piotr Developer Manager.
- Implemented and validated locally: tasks check, format, lint, typecheck, Vitest
  (471, up from 458), data tests (90), data and narrative validation, build, diff
  check and Markdown prettier passed. Playwright with one worker and no retries:
  Chromium and Firefox 46 passed, 3 skipped (Enter system flag); WebKit 44 passed and
  2 failed under concurrent load from another worktree ("canvas picking selects a
  known map system after framing settles", "the permanent local backdrop preserves
  responsive map interaction"); both then passed in isolation with
  `--repeat-each=3` (6/6). Neither test touches Read through or the menu.
