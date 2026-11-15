# BOB-20261115-7FQJCG: Search rename and floating Search pill

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

The compact **Browse objects** command is renamed to **Search** everywhere it
appears in the UI (menu label, compact dialog title and tests). A floating
glass **Search** pill is added at the top of the map on compact widths, to the
right of the chapter badge and left of **Reset view**, with about 86px
clearance at 390×844 in the pre-book zero state. The pill is not docked to the
peek sheet. Clicking it opens the existing search/browse UI. The menu keeps a
**Search** row as a secondary entry, the same pattern as **Reset view**.

On desktop (≥ 1200px) the always-visible object-browser rail is unchanged; there
is no map pill.

## Authorization

- The Captain's design decision, relayed by the Piotr Developer Manager as
  Task E on 2026-11-15 (Europe/Warsaw): rename **Browse objects** to **Search**,
  and ship option B from the search-placement design note — a floating glass
  **Search** pill on the map (icon + "Search", 44px tall), not a top-bar icon
  (option A) and not a menu-only rename (option C). Placement: right of the
  chapter badge and well left of **Reset view** (~86px gap at 390×844); do not
  dock the pill to the peek sheet. Keep the **Search** row in the menu. Match
  the existing glass styling. Authorised under the standing local-branch review
  process: implement on a branch for review; do not merge to master or deploy
  in this task.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `BOB-20261113-3VCGFP-mobile-map-chrome.md` (Variant A compact chrome, menu
  drawer, Reset view map control)
- `BOB-20261114-H960PW-mobile-snap-sheet.md` (peek sheet; the Search pill must
  not be docked to it)
- `../visual-testing.md` (manual checklist updated by this task)

## Scope

1. Rename the compact menu command **Browse objects** to **Search**. The compact
   browser dialog's accessible name becomes **Search**. Desktop rail heading
   **Object browser** stays. Update component and e2e tests, and the Captain's
   visual-testing checklist, to the new labels.
2. `src/components/icons.tsx`: a `SearchIcon` magnifying-glass glyph, same
   stroke language as `ResetViewIcon`.
3. `src/App.tsx`: a compact floating **Search** pill on the map, in a top chrome
   row with the chapter badge and **Reset view**, so a longer badge cannot
   overlap the pill. The pill opens the existing compact browser panel. Closing
   that panel (Escape, Close, or backdrop) returns focus to the pill when the
   pill opened it, and to the Menu button when the menu row opened it. The pill
   is hidden while a modal compact panel (menu, search, or timeline) is open,
   and stays visible above the non-modal detail sheet.
4. `src/styles.css`: glass pill styling (`--tap` height, existing hairline and
   glass tokens) and the flex top-chrome layout.
5. Tests: component coverage for the pill and for the renamed menu/dialog;
   an e2e test at 390×844 that the pill does not overlap the badge or Reset
   view and that clicking it opens Search; a cheap 1280×800 check that the
   desktop rail still hosts search and the map has no pill.
6. Docs: `../visual-testing.md` checklist for the pill and the Search label.

## Out of scope

- Changing how a search result opens the detail sheet (it still opens at half,
  as today; the design note's "open at peek" line is recorded as a decision,
  not taken here).
- Restyling the search panel or adding an on-screen keyboard; the existing
  compact browser UI is reused, and the keyboard is the OS IME.
- Renaming the desktop **Object browser** rail.

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
# e2e: chromium, firefox and webkit on port 5197, one worker, no retries,
# untracked playwright.alt5197.config.ts, deleted afterwards.
```

Manual: the Captain's check on a phone and desktop after deployment (checklist
in `../visual-testing.md`).

## Risks and decisions

- **Option B, not the design note's recommended A.** The Captain picked the
  floating pill. The menu still has a Search row, as both A and B required.
- **Compact-only pill.** Desktop already shows the object browser; a map pill
  there would be a fifth piece of chrome next to an always-visible search
  field. The 1280×800 check confirms the rail, not a desktop pill.
- **Flex top chrome rather than a fixed left edge.** The design snapshot
  measured left: 130px at the pre-book badge. A longer "Latest known ·
  Knowledge through Chapter N" badge would overlap that fixed left edge. A
  flex row (badge, pill, Reset view) keeps the zero-state ~86px gap to Reset
  and ellipsizes a long badge instead of overlapping.
- **Result snap stays at half.** The design note said a Search result should
  open the sheet at peek, like a map tap. The current, tested behaviour (and
  H960PW) opens browser picks at half. This task opens the existing search UI
  and leaves that snap unchanged; changing it would also affect the menu path.
- **Focus return follows the opener.** Escape and backdrop already closed the
  compact browser and focused Menu, because every compact panel used to start
  from Menu. The pill is a second opener, so Search opened from the pill
  returns focus to the pill.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on origin/master `8cd0485` under the authorization above, on local
  branch `bob-20261115-7fqjcg-search-pill` in the `~/src/bobiverse-search`
  worktree.
- Implemented the rename and the compact Search pill in `2df6d2e`, with prettier
  follow-ups in `990bee1` and `800ac5b`. Validation, all passed:
  `python3 scripts/tasks.py check`, `npm run format:check`, `npm run lint`,
  `npm run typecheck`, `npm run test` (488 passed), `npm run data:test` (90
  passed), `npm run data:validate`, `npm run narrative:validate`,
  `npm run build`, `git diff --check` and `npx prettier --check` on the changed
  Markdown.
- Full e2e on a spare dev-server port 5197 (untracked throwaway config, deleted
  afterwards), one worker, no retries: chromium, firefox and webkit each 57
  passed and 3 skipped (the Enter system tests behind `ENABLE_ENTER_SYSTEM`).
  No icon-specimen PNG was rewritten. Screenshots at 390×844 and 1280×800,
  with search closed and open, were taken for review outside the repository.
