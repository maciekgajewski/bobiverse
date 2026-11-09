# BOB-20260805-HS0NZP: plot-style Date-mode timeline

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-09

## Objective

Replace Date mode's clickable date-label clusters with a plot-style calendar axis:
a horizontal line with regular adaptive tick labels and individually clickable event
dots. Preserve the calendar point under the mouse while wheel zoom changes scale.

## User-visible outcome

Date mode reads as a conventional time plot. Regular calendar labels appear below the
line at the detail that fits: centuries or decades when far away, then years, months,
and ISO `YYYY-MM-DD` ticks when close. Each visible story state is a dot on the line,
and only dots select a story state. Multiple states at one calendar coordinate stack
as separate dots that remain independently clickable. Wheel zoom keeps the calendar
coordinate under the pointer stationary. Activating a dot opens a transient Date
context in the existing inspector: the selected date, its reader-visible source
chapter(s), and reader-safe activity at that date.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially Sections 6, 10, and 12
- `../implementation-plan.md`, Phase 2
- `../design/phase-2-desktop-ui.md`, especially Sections 4 through 6, 9, and 10.3
- `../visual-testing.md`, especially BOB-011 reader progress and temporal navigation
- `../adrs/0026-calendar-precision-narrative-dates.md`
- `BOB-011-reader-progress-and-temporal-navigation.md`
- `BOB-20260804-JSSM85-calendar-precision-narrative-dates.md`

No ADR is required: this preserves the existing persisted viewport, calendar axis,
story-date selection, and spoiler-projection contracts while refining their UI.

## In scope

- Render Date mode as one horizontal axis line with regular calendar ticks and labels
  below it.
- Choose tick granularity from rendered label spacing, without collisions: century,
  decade, year, month, then ISO day precision as available scale permits.
- Render every meaningful story state as a dot at its existing start-of-range axis
  coordinate. Make dots, and only dots, selectable.
- Stack dots with the same coordinate vertically in a dense, snowman-like treatment
  while retaining independent keyboard and pointer activation. The plot point itself
  is the compact control; it is a narrow exception to the general 44 CSS-pixel phone
  target rule because expanding it would obscure adjacent points. Give suffix-distinct
  states that share a reader-facing date unique spoiler-safe accessible source context
  while keeping suffixes hidden.
- Preserve the exact calendar coordinate beneath the pointer on mouse-wheel zoom by
  adjusting the normalized timeline pan with the changed scale.
- Retain drag panning, centered keyboard zoom, keyboard panning, responsive shared
  desktop/compact rendering, reader-order gating, and date precision semantics.
- Show a transient Date context in the shared inspector when a Date-mode dot is
  activated. It lists the formatted date, reader-visible source chapter identity, and
  reader-safe activity at that exact meaningful date; it is not a chapter selection,
  does not enter inspector history, and does not persist.
- Make unselected stacked dots read as distinct circles by avoiding overlapping halo
  treatments.
- Add focused component/unit and cross-browser interaction coverage.
- Update the integrated desktop design and visual-testing guidance.

## Out of scope

- Changing narrative date parsing, Gregorian range semantics, axis coordinates,
  meaningful-date eligibility, selected-date projection, or persisted state schema.
- Adding a second timeline implementation, scrollbars, touch pinch zoom, a chapter
  selection in Date mode, or label-click selection.
- Changing Chapter-mode chapter-selection eligibility, the map, object browser,
  responsive breakpoint, reader progress ownership, or persisted state.

## Acceptance criteria

1. Date mode renders a visible horizontal plot axis with regular ticks and labels
   below the line; no date label is a selection control.
2. Tick labels use spacing-driven calendar detail: distant views show centuries or
   decades, intermediate views show years or months, and close views show ISO
   `YYYY-MM-DD` labels without overlap.
3. Every visible meaningful date is represented by an accessible, individually
   clickable dot at its existing linear start-of-range coordinate. Same-coordinate
   dates stack visibly and each selects its own state; their accessible names retain
   unique spoiler-safe source context without exposing an ordering suffix. Dot centers
   are densely spaced just beyond one visible-dot diameter, and the dock grows when
   needed to keep a dense stack visible.
4. A wheel zoom step preserves the axis coordinate at the mouse pointer, including at
   either data endpoint by allowing blank axis space beyond it. Keyboard `+`/`-` zoom
   remains centered and drag/arrow-key panning remains available.
5. Reader-facing date labels retain their authored precision and ordering suffixes
   remain hidden. Reader-order spoiler gating is unchanged.
6. The shared dock behaves equivalently in desktop and compact panel compositions.
7. Dot activation renders the transient Date context in the shared inspector, with a
   formatted date, reader-visible source chapter identity, and reader-safe same-date
   activity. A Date context neither changes reader progress nor creates a chapter
   selection, inspector-history entry, or persisted state.
8. A Date context temporarily replaces the visible inspector details while retaining
   the existing object selection and history unchanged. It dismisses on any object,
   map, browser, relationship, or history selection, on a different date selection,
   on Date-mode exit, and whenever a projection transition makes its date ineligible.
   It does not render Back/Forward controls while active.
9. Focused automated tests, task metadata validation, static validation, and an
   independent implementation review pass. The task remains In progress until the
   Captain accepts the visual result in a supported browser.

## Documentation and generated artifacts

- Update `docs/design/phase-2-desktop-ui.md` and `docs/visual-testing.md` as the
  integrated behavior contract.
- Do not change canonical narrative data, generated data, or historical task records.
- Preserve Playwright failure screenshots, traces, and videos when a visual or
  interaction test fails.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test -- --run tests/component/TimelineDock.test.tsx tests/component/App.test.tsx tests/unit/narrative-progress.test.ts
npm run test:e2e -- --grep "Date mode|timeline"
git diff --check
```

From a remote workstation in every available supported browser, confirm at desktop
and compact widths that the Date-mode axis is a labelled plot line; its labels step
through readable calendar granularities as the wheel zoom changes; dots alone select
states; coincident states stack; and a point under the pointer does not drift while
wheel zooming. Record unavailable browsers as an acceptance gap.

## Known risks and decisions

- Adaptive ticks must use actual rendered spacing rather than fixed zoom thresholds;
  CSS width, browser zoom, and compact composition affect available space.
- The viewport permits bounded blank space before and after the data so pointer-anchored
  wheel zoom remains exact at the first and last meaningful dates.
- The Captain selected regular plot-axis ticks, spacing-driven detail, dot-only
  selection, stacked coincident states, anchored wheel zoom, and a transient
  Date-context inspector on 2026-08-05.

## Log

### 2026-11-09

- Captured WIP onto `bob-20260805-hs0nzp-date-timeline` at `f86294d` (Captain had already
  committed the Date-timeline WIP onto master).
- Fixed `tsc -b` errors: `ObjectInspector` Date-context activity names now go through
  `stringValue` (`NarrativeEntity` index typing yields `unknown` for `name`);
  `TimelineDock` stack-height uses `Array.from(byPosition.values(), ...)` instead of
  calling `.map` on a `MapIterator`.
- Updated `narrative-equivalence` snapshot: Earth `colony_of: [species:human]` already
  present in zero-state and required by ADR-0025 / BOB-20260803-X52E0D; the snapshot was
  stale on `3c818b9` as well (not caused by this UI change).
- Fixed pre-existing chromium e2e `Solar System enters and exits the fixed system
mode` (also fails on `3c818b9`): `mouse.click(screenPoint(...))` only hovers
  astronomy-only stars, so `mouse.move(1,1)` cleared the Alpha Centauri label.
  After system-mode exit, select Alpha Centauri via the object browser (same path as
  the Sirius coverage) and assert the map label. Not a Date-timeline regression.
- Added App-level regression coverage for transient Date context (no inspector history;
  dismisses on object selection; spoiler ceiling unchanged).
- Status remains **In progress** until the Captain accepts the visual result in a
  supported browser (acceptance criterion 9).
