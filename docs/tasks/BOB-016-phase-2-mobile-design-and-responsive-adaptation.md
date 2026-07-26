# BOB-016: Phase 2 mobile design and responsive adaptation

Status: Draft
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-26

## Objective

Design and implement the phone and tablet composition for the complete Phase 2
narrative workspace using the same domain state and components as desktop.

## User-visible outcome

Phone and tablet readers retain first-class map exploration, object lookup, timeline
navigation, spoiler-progress control, and detail reading without attempting to show
all desktop surfaces at once.

## Binding references

- `../design/phase-2-desktop-ui.md`
- `../technical-design.md`, Section 10
- `../visual-testing.md`
- `BOB-003-visual-system-and-application-shell.md`
- `BOB-015-phase-2-desktop-integration-and-acceptance.md`
- `../../AGENTS.md`

## Unresolved design work

Before this task becomes `Ready`, conduct a separate Captain-guided mobile design pass
that decides:

- how browser, inspector, and timeline are invoked from the map-first composition;
- whether the existing browser dialog and inspector bottom panel remain the correct
  containers for the richer content;
- how **Read through**, Chapter mode, and Date mode fit short phone viewports;
- how true-scale date navigation zooms and pans without relying on fine drag gestures;
- how switching among open surfaces preserves selection and focus return;
- tablet and compact-desktop breakpoints;
- offline/WebGL-unavailable and 200% zoom behavior.

## Required boundaries

- Use the same React components, projection, search, selection, and persisted state as
  desktop.
- Do not create a separate mobile application or parallel spoiler implementation.
- Keep the map first and never display browser, map, inspector, and timeline
  simultaneously on a phone.
- Preserve labelled close controls, Escape where a keyboard exists, focus
  containment, focus return, visible focus, reduced motion, and 44-by-44 CSS-pixel
  phone targets.
- Do not regress the current BOB-003 mobile map, browser, inspector, or attribution
  behavior or BOB-015's compact timeline/progress reflow while this task remains
  Draft.

## Provisional scope

- Record the approved mobile interaction design and reference visuals.
- Recompose shared desktop surfaces for compact, tablet, and phone viewports.
- Implement the approved surface navigation and focus model.
- Add component and Playwright coverage for touch-sized and keyboard interaction.
- Complete manual mobile Chrome and available mobile Safari review.
- Update technical design and visual-testing documentation.

## Out of scope

- New narrative, astronomy, search, or timeline domain semantics.
- Native mobile applications.
- Swipe-only controls or gestures without an accessible control equivalent.
- Treating desktop browser shrinkage as a designed mobile composition.

## Acceptance criteria

Exact acceptance criteria and validation commands must be finalized after the mobile
design interview and before this task becomes `Ready`. They must cover, at minimum:

- first-class access to exploration, lookup, timeline navigation, and details;
- shared projection and selection with desktop;
- map-first phone composition;
- focus containment and return;
- short-viewport and 200% zoom behavior;
- reduced motion and 44-by-44 CSS-pixel targets;
- Chromium, Firefox, and WebKit automation;
- manual mobile Chrome and available mobile Safari review;
- preservation of browser failure artifacts.

## Dependencies and risks

- BOB-015 must establish the accepted desktop behavior to be recomposed.
- Mobile design may expose component boundaries that should be corrected
  systematically rather than patched with duplicated markup or state.
- Safari remains a required pre-publication real-browser check when no Apple
  workstation is available during implementation.
