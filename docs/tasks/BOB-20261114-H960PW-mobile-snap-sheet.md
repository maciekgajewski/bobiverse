# BOB-20261114-H960PW: mobile snap-sheet detail view with object trail

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

On a phone the selected-object detail view no longer covers the map. It becomes a
bottom sheet over the live, interactive map:

- **Snap heights.** Peek (about 150px: grabber, header row, and the object's type and
  name), half (half the screen) and full (everything below the top bar). A map tap
  opens the sheet at peek; the object browser, the timeline and **Inspect selection**
  open it at half. A sheet that is already open keeps the height the reader chose.
- **Map stays usable.** There is no backdrop. The map above the sheet stays pannable
  and tappable: tapping another object replaces the sheet's content, and tapping empty
  space clears the selection and closes the sheet.
- **Object trail.** The sheet header carries the 44px **Back** / **Forward** history
  buttons, then a breadcrumb built only from real, projected parent links (for
  example `Solar System › Sol › Earth`), then the 44px X **Close**. Ancestor crumbs
  navigate like relationship links and join the inspector history.
- **Landscape phones** (the existing `max-width: 1199px` and `max-height: 500px` cut)
  get a right-hand drawer about 320px wide below the top bar instead of a sheet, so
  the map stays a usable pane beside it.
- **Gestures and alternatives.** Dragging the grabber or the header row's empty space
  moves between snaps. The grabber is also a button: a tap, Enter or Space cycles
  peek → half → full → peek, and the arrow keys step up and down. Nothing depends on
  dragging.

Desktop (≥ 1200px) is unchanged. The menu, object browser, timeline and About panels
keep their current behaviour.

## Authorization

- The Captain approved the design on 2026-11-14 at 16:00 (Europe/Warsaw), relayed by
  Piotr Developer Manager: "Mobile navigation, option 1 combined with option 3: the
  detail view becomes a snap sheet (peek about 120px, then half, then full) with the
  map visible and interactive above it. The sheet header gets option 3's
  breadcrumb/history trail (e.g. 'Sol › Earth'), and landscape uses a side drawer. No
  peek cards."
- The manager asked for a separate local branch, a SHA for review and local validation
  under the no-PR flow in `../development-process.md`. The Captain's standing "deploy
  once ready" (2026-11-14 16:02, relayed by the manager) covers deployment after the
  manager approves the SHA.
- The design (spec and mockups) was produced by Bobiverse UI Designer outside the
  repository ("Mobile navigation options" section of its design note, options 1 and 3
  and the recommendation; option 2, peek cards, is not part of this task).

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md`, Section 10 (updated by this task)
- `../design/phase-2-desktop-ui.md`, inspector history (updated by this task)
- `../visual-testing.md` (new section for this task)
- `BOB-20261114-DA3Y3B-mobile-detail-fixes.md` (the X close, 44px history and
  `ENABLE_ENTER_SYSTEM` flag that this keeps)
- `BOB-20261113-3VCGFP-mobile-map-chrome.md` (the compact chrome this builds on)

## Scope

1. `src/domain/sheet-snap.ts`: the snap model (peek, half, full), the cycle and step
   rules, and `settleSnap`, which picks the snap nearest to where a drag ended and
   moves one snap for a deliberate drag (≥ 40px) that would otherwise stay put.
2. `src/components/DetailSheet.tsx`: the sheet. It is a non-modal `dialog` named
   **Selected object** with `data-snap`, a grabber button (**Expand details** /
   **Collapse details**), a drag zone over the grabber and header row (header
   controls keep their own taps; a press becomes a drag after 6px), and a scrolling
   body. A drag tracks the pointer and then jumps to the chosen snap. Drags are off in
   the landscape drawer.
3. `src/narrative/breadcrumb.ts` and `src/components/InspectorBreadcrumb.tsx`: the
   object trail. A narrative location walks its `parent_location_id` chain through the
   current projected world (so an unrevealed parent never appears, and cycles stop);
   other narrative entities, chapters and astronomy systems show their own name, and a
   component shows its system and designation. The last three crumbs show; earlier
   ones collapse into "…" with their names kept for screen readers. The current object
   is `aria-current="page"`.
4. `src/App.tsx`: the compact inspector renders in `DetailSheet` instead of the modal
   `mobile-panel`, with no backdrop. Map taps open it at peek; other entry points open
   it at half. An empty map tap closes it. The header DOM order now matches the visual
   order (history, trail, X) in every compact panel, and the X still takes initial
   focus, which also settles the DA3Y3B review nit about tab order versus the reversed
   row. Tab and Shift+Tab stay inside the sheet, as for every compact panel. The menu,
   browser and timeline panels are otherwise unchanged.
5. `src/styles.css`: snap heights (`--sheet-peek: 9.5rem`, `--sheet-half: 50svh`,
   `--sheet-full: calc(100svh - var(--topbar-h))`), the opaque `#0a1220` sheet
   surface, the grabber, the trail and the landscape drawer.
6. Tests:
   - Unit: snap cycle, step and settle rules; the trail's parent walk, unprojected
     parent, cycle guard and non-location cases.
   - Component: sheet snaps from the grabber, keys and a pointer drag; header controls
     do not start a drag; the trail's links, current item and collapse; in the app, the
     non-modal sheet without backdrop, snaps kept across relationship navigation, Tab
     containment, peek for a map tap and close on an empty tap, the trail updating
     through crumbs and Back / Forward, and the X closing with focus back on the menu.
   - e2e at 390×844: the sheet opens at half with the map uncovered above it, a real
     pointer drag settles it at peek, a map caption tap above it changes the selection
     and keeps the snap, the grabber expands it to full under the top bar, following a
     relationship link and a crumb updates the trail, and the X closes it. At 844×390:
     the right-hand drawer beside an uncovered map, with 44px history and Close.
   - Existing tests for the old panel updated: the X corner check now allows for the
     grabber row above the header.
7. Docs: technical design Section 10, the phase-2 inspector-history note and a new
   visual-testing section.

## Out of scope

- Peek cards (design option 2).
- Moving the object browser into the sheet. The design marks it optional ("Browse can
  use the same sheet"); the browser stays a full-screen panel.
- The chapter selector (a separate task) and any desktop change.
- Turning **Enter system** back on: `ENABLE_ENTER_SYSTEM` stays `false`.
- Any data, schema, projection or spoiler change.
- Other map-picking changes beyond the caption-click fix recorded in the log.

## Acceptance criteria

1. At 390×844, selecting an object opens the **Selected object** sheet at peek (map
   tap) or half (browser, timeline, Inspect selection), with no backdrop and the map
   visible and tappable above it.
2. The grabber cycles peek → half → full → peek by tap, Enter or Space, the arrow keys
   step the snaps, and a drag on the grabber or header settles on a snap. At full the
   sheet starts at the bottom of the top bar.
3. The header shows **Back** and **Forward** (44px) on the left, the object trail in
   the middle and the 44px X **Close** on the right. The trail uses only projected
   parent links, marks the current object, and its ancestors navigate.
4. Following a relationship link or a crumb updates the trail and the history, and
   keeps the sheet's snap.
5. The X and Escape close the sheet with focus back on the menu button. An empty map
   tap clears the selection and closes it. Tab stays inside the sheet.
6. At 844×390 the detail view is a right-hand drawer of at most about 330px below the
   top bar, the map to its left is uncovered, and the grabber is hidden.
7. The sheet does not animate between snaps, so it behaves the same with
   `prefers-reduced-motion`.
8. **Enter system** stays hidden; the desktop layout and the menu, browser, timeline
   and About panels are unchanged.
9. All validation commands below pass.

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

Manual: the Captain checks the sheet and drawer in a phone browser after deployment.

## Risks and decisions

- **Non-animated, by the technical design.** Section 10 calls the phone inspector a
  non-animated bottom panel. The snaps therefore jump rather than slide, and a drag
  tracks the finger directly; there is no motion for `prefers-reduced-motion` to turn
  off. The mockups' gesture hints were annotation-only.
- **Focus containment kept.** The compact-panel contract (BOB-003, Section 10, the
  phase-2 design) keeps Tab inside an open panel. The sheet is non-modal for pointer
  input (the map stays usable, so it is not `aria-modal` and the page is not inert),
  but Tab and Shift+Tab still wrap inside it.
- **X on the right.** The mockups put the X at the header's left and the trail at the
  right. This keeps the just-landed DA3Y3B layout (X top-right in every compact panel,
  history at the left) and puts the trail between them.
- **Empty map tap closes the sheet.** The existing empty-tap behaviour clears the
  selection; with the map now reachable, the sheet closes with it instead of showing
  an empty inspector. Closing with the X still keeps the selection, as before.
- **Trail depth.** Locations can nest more than three deep (system, star, planet,
  moon). Only the last three crumbs show, so the header row fits a 390px phone.
- **Peek content.** The mock's key line ("star system · Mapped") is not an existing
  inspector line; peek shows the existing type label, name and status instead.

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on origin/master `3c3d368` from the Captain's design approval of 16:00,
  relayed by Piotr Developer Manager. Moved straight to In progress.
- Found while running the e2e suite: a real click on a map caption selected the system
  and then also reached R3F as a missed pointer, so `onPointerMissed` cleared the
  selection again (the old compact inspector opened empty; the new sheet closed). The
  caption click now stops propagation (`src/components/MapScene.tsx`). This also
  applies on desktop, where the same click no longer clears the selection it just
  made. The phone sheet e2e taps the caption with a real click as the regression test.
- Screenshots: `docs/design/artifacts/BOB-20261114-H960PW-mobile-snap-sheet/` holds
  `phone-390x844-peek.png`, `phone-390x844-half.png`, `phone-390x844-full.png`,
  `landscape-844x390-drawer.png` and `desktop-1280x800.png` (unchanged layout).

- 2026-11-15: Landed at `5c2d9d7` and live; awaiting Maciej's visual
  acceptance.
