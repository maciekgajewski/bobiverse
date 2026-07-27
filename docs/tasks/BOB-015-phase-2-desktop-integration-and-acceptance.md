# BOB-015: Phase 2 desktop integration and acceptance

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-27

## Dependency status

BOB-011 through BOB-014 must be complete. BOB-010 is an indirect prerequisite through
the browser and map tasks. All prerequisites are complete; the Captain authorized
implementation on 2026-07-27.

## Objective

Complete and validate the desktop Phase 2 narrative workspace as one coherent,
accessible four-surface experience.

## User-visible outcome

At desktop width, the reader can control spoiler progress, navigate by chapter or
meaningful story date, browse and search recently relevant objects, inspect a
selection, and understand its mapped context without any surface disagreeing about
the represented world.

## Binding references

- `../design/phase-2-desktop-ui.md`
- `../technical-design.md`, Sections 6 and 8 through 12
- `../visual-testing.md`
- BOB-011 through BOB-014
- `BOB-003-visual-system-and-application-shell.md`
- `BOB-005-galactic-starfield-backdrop.md`
- `../../AGENTS.md`

## In scope

- Integrate command bar, progressive browser, map, inspector, timeline dock, and
  attribution footer in the desktop viewport.
- Implement the approved interim compact reflow for desktop zoom: retain the existing
  map-first browser and inspector panels and add a command-bar **Timeline and
  progress** control that opens the shared dock content in a non-animated modal panel
  with Escape, close, focus containment, and focus return.
- Apply the existing design tokens and bundled Noto Sans fonts consistently.
- Add the compact map context badge.
- Resolve focus order and announcements across chapter/date, search, browser,
  selection, and inspector transitions.
- Provide loading, invalid projection, missing astronomy coverage, empty search,
  WebGL-unavailable, no-selection, unmapped, and ineligible-selection states.
- Verify 200% zoom/reflow and reduced motion at desktop and short-desktop viewports.
- Add end-to-end flows that prove every surface consumes the same projection.
- Update the user-facing README and visual-testing instructions for Phase 2.
- Complete manual Chrome, Firefox, Edge, and available Safari review from the remote
  workstation.

## Out of scope

- New narrative or astronomy contracts.
- Mobile Phase 2 composition or acceptance.
- Panel resizing, arbitrary date entry, fuzzy search, histories, paths, chronicles,
  genealogy, or publication.
- Treating automated WebKit as proof of real Safari coverage.

## Acceptance criteria

1. At `>=1200px`, browser, true-scale map, inspector, and timeline are simultaneously
   distinct, usable, and free of horizontal page scrolling.
2. The map remains the largest workspace surface across supported desktop and
   short-viewport test sizes.
3. The compact map badge, bottom dock, browser ordering, map markers, and inspector
   all report the same knowledge chapter and display date.
4. A complete flow can set progress, select an unlocked chapter, enter Date mode,
   choose a true-scale meaningful year, select an active object, inspect it, and
   return to Chapter mode without leaking later facts.
5. Search and map selection remain coordinated for narrative and astronomy-only
   systems.
6. All documented empty, error, unsupported, unmapped, and invalidation states provide
   actionable DOM content.
7. Keyboard users can traverse skip link, command bar, browser/search/groups, map
   fallback, inspector links, progress controls, timeline, and attribution in a
   visible logical order.
8. Known, active, selected, locked, last-seen, and unmapped states never depend on
   colour alone.
9. At 200% desktop zoom below the simultaneous-layout breakpoint, browser, map,
   inspector, and timeline/progress remain reachable sequentially through the
   approved compact panels. The page has no horizontal scroll, focus is contained and
   restored correctly, and the attribution footer remains reachable.
10. Reduced motion disables nonessential camera movement and no marker or timeline
    animation bypasses the preference.
11. Automated browser flows cover Chromium, Firefox, and WebKit and retain normal
    failure artifacts.
12. Manual current Chrome, Firefox, and Edge review passes. Real Safari is tested when
    available or remains an explicit pre-publication gap.
13. `README.md`, `technical-design.md`, `implementation-plan.md`,
    `visual-testing.md`, and task statuses accurately describe the delivered product.

## Validation commands

```bash
npm run narrative:validate
./.venv/bin/python scripts/validate_data.py
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run validate
git diff --check
```

Manual review uses `npm run dev` at the documented trusted-LAN address. Record browser,
viewport, zoom, motion, and any unavailable real-browser coverage in this task before
marking it `Done`.

## Implementation evidence

Implementation and automated validation completed on 2026-07-27. The compact command
bar now opens the shared `TimelineDock` as **Timeline and progress** with unique DOM
IDs, a non-animated modal surface, focus containment, Escape and close dismissal, and
focus return. The map context badge remains inside the map at desktop and compact
sizes. Invalid narrative projections and missing mapped astronomy anchors produce
actionable DOM states.

The narrative validator, astronomy validator, formatting, lint, typecheck, production
build, and `git diff --check` pass. `npm run validate` passes 41 Python tests and 115
unit/component tests. `npm run test:e2e` passes all 39 flows across Chromium, headed
Firefox, and WebKit. A fresh independent closure review after the regression fixes
returned `No findings.`

On 2026-07-27, the Captain completed and accepted the required remote visual review
in current Chrome, Firefox, and Edge. The review covered the simultaneous desktop
workspace, short desktop viewport, 200% zoom compact reflow, shared chapter/date
projection flow, modal focus containment and return, reduced motion, and attribution
reachability. Real Safari remains the existing explicit pre-publication gap because
no Apple test workstation is available.

## Risks and cautions

- Passing isolated task tests is not proof that all surfaces share the same
  projection; the end-to-end flows must change knowledge and story time together.
- The headless server cannot replace remote real-GPU inspection.
- BOB-016 remains required for first-class mobile Phase 2 completion.
