# BOB-20261113-3VCGFP: mobile-first map chrome (Variant A) and Reset view map control

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-13

## Objective and user-visible outcome

On a phone the 3D map is hard to find: at 390×844 the top bar (256px) and the
always-open attribution footer (303px) leave a 245px map, and at 844×390 the map is
only 66px tall. This task implements the Captain-approved **Variant A** chrome
touch-up and the redesigned **Reset view** control so the map fills the screen under
one slim bar, without changing any behaviour, data or spoiler rule.

- Phone portrait and landscape: one 52px bar with "Star Map", the **Read through**
  select and a 44×44 menu button. The map fills everything below it.
- The menu drawer holds **Knowledge through**, Chapter/Date mode, **Browse objects**,
  **Inspect selection** (when something is selected), **Timeline and progress** and a
  secondary **Reset view** row.
- The attribution footer becomes a collapsed chip in the map's bottom-right corner
  that always shows the short backdrop credit "NASA/GSFC SVS · ESA/Gaia/DPAC".
  Tapping it expands a card with the same three blocks (catalogue line,
  acknowledgements, backdrop credit link).
- **Reset view** becomes a 44px round icon button in the map's top-right corner at
  every breakpoint, with a "Reset view" tooltip. The text button leaves the top bar.
- Desktop (≥ 1200px) keeps the three-pane workspace and timeline dock. The bar slims
  to one 52px row with a compact **Read through**; the footer becomes the same chip;
  shell padding drops to 0.5rem. The map gets taller and wider.

## Authorization

- The Captain approved Variant A on 2026-11-13 at 18:34 CET: "Go with Variant A".
- At 18:34 CET he also asked: "Do something about the ugly 'reset view' button". He
  approved the Reset view redesign at 18:40 CET: "Ok".
- Both approvals were relayed by Piotr Developer Manager, who asked for this work to
  start in parallel with PR #20.
- The design (spec, mockups and baseline measurements) was produced by Bobiverse UI
  Designer outside the repository. Its design note is summarised under Scope; the
  committed before/after screenshots are the visual record.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Section 10 (updated by this task)
- `../design/phase-2-desktop-ui.md`, Section 5 (updated by this task)
- `../visual-testing.md` (new section for this task)
- `BOB-003-visual-system-and-application-shell.md`
- `BOB-005-galactic-starfield-backdrop.md` (visible backdrop credit)
- `BOB-015-phase-2-desktop-integration-and-acceptance.md` (compact timeline reflow)
- `BOB-016-phase-2-mobile-design-and-responsive-adaptation.md` (remains Draft)

## Scope

1. Top bar (`src/App.tsx`, `src/styles.css`): one row of `--topbar-h: 52px` at all
   breakpoints. Eyebrow and "Star Map" share a baseline. The compact **Read through**
   select (new `TopbarReadThrough` in `src/components/ProgressControls.tsx`) sits in
   the bar; below 621px only its shield icon is visible, and the label stays as the
   accessible name. The visible view-status text moves to a visually hidden live
   region (the map badge already shows it). The empty reserved **Return to map** slot
   is removed; the button renders only in system mode.
2. A top-bar **Read through** choice opens the same confirmation dialog as the dock.
   The top-bar control renders it itself, because the desktop dock is hidden below
   1200px. Choices, confirmation and cancellation use the existing handlers and
   `pendingReadThrough` state.
3. Menu drawer: a new `menu` compact panel built on the existing `.mobile-panel`
   pattern (labelled Close, Escape, Tab containment). A backdrop click closes it and
   every panel it opens. All compact panels now return focus to the menu button,
   since their commands live in the drawer.
4. Astronomy notice chip inside `#map-stage`: collapsed by default at every
   breakpoint, showing the short backdrop credit `GALACTIC_STARFIELD_SHORT_CREDIT`
   (wrapping to two lines on narrow chips). `aria-expanded`, plus `aria-controls`
   while the card is mounted; second tap or Escape closes and returns focus to the
   chip. The expanded card has a max height and scrolls.
5. Reset view: a 44×44 icon button with the approved house glyph in a
   `.map-controls` stack at the map's top-right (inset 0.6rem, 0.45rem on short
   landscape). It keeps the accessible name "Reset view", the same handler, and is
   disabled in system mode. A CSS tooltip with `role="tooltip"` appears on hover
   (after a delay) and on keyboard focus. The drawer has a secondary text row.
6. Tokens: `--line-hair`, `--tap` and `--topbar-h`. Shared progress controls
   (`ShieldIcon`, `ReadThroughOptions`, `KnowledgeThroughSelect`,
   `TimelineModeToggle`, `ReadThroughConfirmation`) move out of `TimelineDock` with
   unchanged markup so the bar and the drawer reuse them.
7. Tests and documentation: update the component and e2e tests for the new command
   locations, add coverage for the new chrome, and update Section 10 of the technical
   design, Section 5 of the desktop UI design and the visual-testing guide.
8. Before/after screenshots at 390×844, 844×390 and 1440×900 in
   `../design/artifacts/BOB-20261113-3VCGFP-mobile-map-chrome/`.

## Out of scope

- Any behaviour, data, schema, projection, spoiler, persistence or 3D rendering
  change.
- Variant B, tablet-specific layouts and the rest of BOB-016's open design questions
  (date-axis gestures, richer containers, offline behaviour).
- Restyling the rails, dock, browser or inspector beyond the shell changes above.

## Acceptance criteria

1. At 390×844 and 844×390, the map canvas spans the full width and every pixel below
   the ≤ 52px bar. No page scrolling.
2. Read through is in the bar and readable at both phone sizes. The menu button, drawer
   rows, chip and Reset view are at least 44×44 CSS px.
3. The drawer opens from the menu, holds Knowledge through, Chapter/Date mode,
   Browse objects, Timeline and progress and Reset view, contains focus, and closes
   on Close, Escape and backdrop click with focus back on the menu button.
4. The chip is collapsed by default and shows "NASA/GSFC SVS · ESA/Gaia/DPAC" in full
   at every viewport. It expands to the full credits including the backdrop credit
   link, and collapses on second tap or Escape.
5. Reset view is a labelled icon button inside the map's top-right corner at all
   three viewports, resets the camera, is disabled in system mode, and no text
   Reset view button remains in the bar.
6. Desktop at 1440×900 keeps both rails and the dock; the bar is ≤ 52px and the map
   is taller than master's 523px.
7. A top-bar Read through choice still requires confirmation before revealing.
8. All validation commands below pass; existing e2e tests pass apart from the known
   pre-existing failure noted in the Log.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run build
npx playwright test --project=chromium
npx playwright test --project=firefox   # via xvfb-run, as npm run test:e2e does
npx playwright test --project=webkit
npx prettier --check <changed Markdown>
git diff --check
```

Manual: the Captain's visual acceptance on a phone and on desktop after deployment.

## Risks and decisions

- **Attribution visibility.** BOB-005 and Section 10 of the technical design required
  the backdrop credit and the attribution footer to stay visible, and BOB-016 asks
  not to regress attribution behaviour while it is Draft. Variant A, as approved,
  collapses the credits into an always-visible chip that expands on one tap. After
  review, the collapsed chip itself carries the short backdrop credit
  "NASA/GSFC SVS · ESA/Gaia/DPAC", so NASA and ESA/Gaia/DPAC are credited without a
  tap; the prescribed full sentence and its source link stay one tap away. This task
  updates Section 10, Section 5 and a note on BOB-005 acceptance criterion 8. The
  Captain should confirm this satisfies the NASA/Gaia credit requirements in
  `../data/galactic-starfield-backdrop.md`.
- **Two Read through controls on desktop.** The bar and the dock both show it, as in
  the approved mockup. Both are labelled "Read through"; tests address the dock by its
  id.
- BOB-016 remains Draft. This task resolves only its invocation question for phones
  (commands live in a menu drawer).

## Log

### 2026-11-13 (Europe/Warsaw)

- Created on origin/master `7d52c3f` under the approvals above. Moved straight to In
  progress. Rebased onto `ed5fc0f` (PR #20, ADR-0028) before validation; no conflicts.
- Implemented scope items 1 to 7. The menu drawer, chip and Reset view follow the
  approved mockups. While checking the screenshots, map captions (drei `<Html>`, with
  z-indexes up to 16777271) were found drawing over the menu drawer, because nothing
  contained their stacking. `.map-frame` now uses `isolation: isolate`, and the map
  controls and chip sit above the caption range. The chip width is a token
  (`--notice-chip-w`), and the scale and orientation overlay stops short of it so the
  two never overlap.
- Screenshots (scope item 8): `before-landing-*`, `after-collapsed-*`,
  `after-expanded-*`, `after-menu-390x844`, `after-menu-844x390` and
  `after-reset-tooltip-*` at 390×844, 844×390 and 1440×900 in
  `../design/artifacts/BOB-20261113-3VCGFP-mobile-map-chrome/`. The "before" set is
  master `ed5fc0f`; the "after" set is this branch's production build. Measured map
  heights:

  | Viewport | master: top bar / map | branch: top bar / map |
  | -------- | --------------------- | --------------------- |
  | 390×844  | 256px / 245px         | 52px / 792px          |
  | 844×390  | 130px / 66px          | 52px / 338px          |
  | 1440×900 | 89px / 523px          | 52px / 684px          |

- Validation: `python3 scripts/tasks.py check`, `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm run test` (364 passed),
  `npm run data:test` (90 passed), `npm run data:validate` and `npm run build` all
  passed. `npx prettier --check` on the changed Markdown and `git diff --check`
  passed.
- E2E on a spare dev-server port, on `ed5fc0f` plus this branch: chromium, firefox
  and webkit each passed 35/35. An earlier firefox run failed both new phone-chrome
  tests on a sub-pixel tap-target height (43.99998px against 44); those assertions
  now allow 0.5px of rounding. The lineage test that was red on `7d52c3f` (fixed in
  PR #20) passed in every browser.
- The e2e run rewrites `../design/artifacts/icon-asset-specimen-chromium.png`; that
  change was discarded.
- PR #21 review fixes (after head `2f22b67`):
  - WebKit CI failed the system-mode dolly e2e test with "Operation did not complete
    within 4s of frames". Root cause is a test-harness race, not this chrome:
    `withAnimationFrames` pumped the paused clock while `page.waitForFunction` polled on the browser's real animation
    frames, so a slow WebKit renderer could miss the transient
    `cameraTransitionActive` state or spend the frame budget while a click or resize
    was still in flight. On WebKit pinned to 2 CPUs, master `ed5fc0f` and `2f22b67`
    both failed 4/4 with the CI error. The test now completes each action first,
    then steps the clock one 16ms frame at a time and checks the map bridge after
    each frame (`advanceFramesUntil`): same 250-frame budget, same assertions.
  - The collapsed credits chip shows "NASA/GSFC SVS · ESA/Gaia/DPAC"
    (`GALACTIC_STARFIELD_SHORT_CREDIT`). `aria-controls` is set only while the card
    is mounted. Menu Knowledge through also shows in Date mode. A backdrop click
    closes Browse, Timeline and Inspect as well as the menu. Stale "attribution
    footer" wording updated, with a note on BOB-005 acceptance criterion 8.
  - Merged origin/master (`a7017da`) as merge commits; no rebase.
- Remains In progress until the Captain's visual acceptance on a phone and desktop
  after deployment.
