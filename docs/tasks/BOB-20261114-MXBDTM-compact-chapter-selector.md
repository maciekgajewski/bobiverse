# BOB-20261114-MXBDTM: compact chapter selector (Variant A)

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-14

## Objective and user-visible outcome

The top-bar **Read through** control is a native `<select>` whose option labels
(`Book 1 · Chapter N`) make it about 185px wide on a 390px phone bar, where it
crowds the title and the menu button. This task replaces it with the approved compact
chapter selector, Variant A:

- a pill-shaped chip with an original cyan book glyph, a compact label such as
  `1 · Ch 43` (or `Pre-book` in the zero state) and a chevron; the gold shield stays
  beside it, and desktop keeps the gold `READ THROUGH` caption;
- a chapter picker titled **Read through**: a bottom sheet on compact layouts, a
  right-anchored popover under the chip on desktop and a full-height right drawer on
  short landscape screens. It holds a full-width **Pre-book zero state** row, book
  tabs (today only **Book 1**) and a 5-column grid of 44px chapter cells with the
  current one highlighted.

Only the UI changes. A different choice, including a return to the pre-book zero
state, still goes through the existing **Confirm read progress** dialog before the
spoiler ceiling changes. State, persistence, URLs, Knowledge through, Chapter/Date
mode and the timeline dock's own Read through select are unchanged.

## Authorization

- The Captain approved the design on 2026-11-14 at 16:00 (Europe/Warsaw), relayed by
  Piotr Developer Manager: "Chapter selector, variant A", with the bottom sheet on
  mobile and a popover on desktop.
- The spec is the "Compact chapter selector" section of Bobiverse UI Designer's
  design note (Variants, Book glyph SVG, Picker, Behaviour and accessibility, Tokens,
  Files to change) with mockups `closed-A-390x844.png`, `closed-A-1440x900.png`,
  `picker-A-390x844.png` and `picker-1440x900.png`. The note and mockups live outside
  the repository; the developer worked from an approved snapshot of them.
- The manager asked for a separate local branch, a SHA for review and local
  validation. The Captain's standing "deploy once ready" (2026-11-14 16:02, relayed by
  the manager) covers deployment after the manager approves the SHA.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md`, Section 10 (updated by this task)
- `../design/phase-2-desktop-ui.md`, Sections 5 and 10.1 (Section 5 updated)
- `../visual-testing.md` (new section for this task)
- `BOB-20261113-3VCGFP-mobile-map-chrome.md` (Variant A top bar and the top-bar
  Read through confirmation)
- `BOB-20261114-DA3Y3B-mobile-detail-fixes.md` (X close icon and `--tap` targets)

## Scope

1. `src/components/ChapterPicker.tsx` (new): the picker, rendered in a portal on
   `document.body` with a backdrop. `role="dialog"`, `aria-modal="true"` and
   `aria-labelledby` on the **Read through** heading; a 44×44 X named **Close**.
   **Pre-book zero state** and the chapter cells are `role="radio"` buttons in one
   `role="radiogroup"` labelled **Read through**, with a roving tabindex; the book
   tabs are a `role="tablist"` whose selected tab controls the grid's `tabpanel`.
   Keys: arrows move in the 5-column grid (Up from the first row and Left from the
   first cell reach Pre-book; Down and Right from Pre-book reach the first cell),
   Home and End jump to the first and last chapter of the current book, Enter or
   Space chooses, Left/Right/Home/End move between book tabs. Tab and Shift+Tab stay
   inside; Escape and a backdrop click close it. It opens focused on the current
   radio, scrolled into view.
2. `src/components/ProgressControls.tsx`: `TopbarReadThrough` renders the chip, a
   `<button type="button" id="topbar-read-through">` with `aria-haspopup="dialog"`,
   `aria-expanded` and the verbose accessible name `Read through, Book 1 Chapter 43`
   (or `Read through, Pre-book zero state`). Choosing the current value just closes
   the picker; any other choice closes it and calls the existing
   `onReadThroughChoice`, so the same `ReadThroughConfirmation` opens and focus
   returns to the chip afterwards. Closing without a choice also returns focus to the
   chip. `ReadThroughOptions` (dock select) is kept and shares the new label helper.
3. `src/components/icons.tsx` (new): the shield, reset-view and close icons move here
   (re-exported from `ProgressControls`), plus the design note's book glyph SVG and
   the chevron.
4. `src/narrative/progress.ts`: `PRE_BOOK_LABEL`, `chapterBook`, `chapterNumber`,
   `readThroughLabel` and `compactReadThroughLabel` label helpers.
5. `src/components/useReadThroughConfirmationFocus.ts`: accepts any focusable Read
   through control (select or chip).
6. `src/App.tsx`: the app shell is `inert` while the picker is open (as for the About
   dialog), and the breakpoint focus fallback targets the chip.
7. `src/styles.css`: chip (44px hit area around a 34px desktop / 36px compact pill),
   glyph, chevron, popover, bottom sheet, landscape drawer, Pre-book row, tabs and
   grid, using the note's tokens: chip fill `rgb(10 24 42 / 92%)`, border
   `rgb(125 233 255 / 40%)`, 0.75rem `--text-primary` text with a `--text-muted`
   separator, opaque picker surface `#0a1220` with a `--line-hair` border, `--tap`
   cells and Close, and the existing cyan focus outline.
8. Tests: component tests for the chip label and name, opening and closing, roles,
   keyboard navigation, the focus trap, choosing a chapter and Pre-book, re-choosing
   the current chapter and the book tabs (a fixture-only second book), and the
   top-bar confirmation flow in `App`; e2e tests for the desktop popover and the
   compact sheet at 390×844 and 844×390, including 44px cells and state updates. The
   existing mobile and desktop chrome e2e tests now expect the chip.
9. Docs: technical design Section 10, phase-2 desktop UI Section 5 and a new
   visual-testing section.

## Out of scope

- The timeline dock's and the **Timeline and progress** panel's Read through select;
  the note defers sharing the chip there to a follow-up.
- Variants B and C, any new book (only Book 1 exists in `data/narrative/books.json`),
  and any data, schema, projection, persistence or spoiler-model change.
- The snap-sheet mobile navigation (separate task).

## Acceptance criteria

1. The top bar shows the chip with the book glyph, `1 · Ch N` (or `Pre-book`) and a
   chevron, never `#0` or `Ch 0`. Its hit area is at least 44px tall; its accessible
   name includes the verbose value.
2. At < 1200px the chip opens a bottom sheet (a right drawer on short landscape
   screens); at ≥ 1200px it opens a right-anchored popover under the chip. Neither is
   a native `<select>`.
3. The picker shows **Pre-book zero state**, a **Book 1** tab with its chapter count
   and a 5-column grid; the Close X, Pre-book row, tab and every chapter cell are at
   least 44×44 CSS px, and the current value is `aria-checked="true"` and
   highlighted.
4. Keyboard and dismissal behave as in Scope 1, and focus returns to the chip.
5. Choosing a different chapter or Pre-book opens **Confirm read progress**; Cancel
   leaves progress unchanged, Confirm updates the chip and the dock together.
6. Date mode, Knowledge through, the dock and the timeline behave as before.
7. All validation commands below pass.

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
npx playwright test --project=chromium --workers=1
npx playwright test --project=firefox --workers=1   # via xvfb-run, as npm run test:e2e does
npx playwright test --project=webkit --workers=1
npx prettier --check <changed Markdown>
git diff --check
```

Manual: the Captain checks the chip and picker in a phone browser and on desktop
after deployment.

## Risks and decisions

- **Popover position.** The picker is portalled to `document.body` so that the
  sheet is never clipped by the top bar; on desktop it is placed from the chip's
  bounding box (right-aligned, 6px below) and re-placed on resize.
- **Short landscape.** The note does not specify it. A full-height right drawer
  keeps more of the grid visible than a 390px-tall bottom sheet would, and matches
  the approved landscape side drawer for mobile navigation.
- **Group structure.** The tablist sits inside the radiogroup so that Pre-book and
  the chapters form one group, as the note asks.
- **Pending value.** The old select showed the pending chapter while the
  confirmation was open; the chip keeps showing the confirmed ceiling, which is
  hidden behind the modal confirmation anyway.

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on origin/master `3c3d368` after the Captain's design approval of
  2026-11-14 16:00, relayed by Piotr Developer Manager. Moved straight to In
  progress.
