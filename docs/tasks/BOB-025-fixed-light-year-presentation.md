# BOB-025: fixed light-year presentation

Status: Done
Phase: 2 (workspace refinement)
Last updated: 2026-07-28

## Objective

Remove the parsec/light-year selector from the application and make light-years the
sole user-facing interstellar distance unit. Preserve canonical parsec storage,
true-scale geometry, and conversion at presentation boundaries while eliminating the
unused selectable-unit state and UI contract.

## Authorization

The Captain selected fixed light-year presentation and authorized implementation with
`proceed` on 2026-07-27.

## Binding references

- `../technical-design.md`, especially Sections 2, 5.3, 8.3, 8.4, 9, and 10
- `../implementation-plan.md`, especially Phases 1A and 2
- `../design/phase-2-desktop-ui.md`, especially Sections 5 and 8
- `../visual-testing.md`
- `BOB-001-nearby-star-map.md` and
  `BOB-003-visual-system-and-application-shell.md` as historical completed-slice
  records
- `../../AGENTS.md`

## Decisions

- Light-years are the only user-facing interstellar distance unit.
- Parsecs remain the canonical storage and calculation unit.
- Parsec-to-light-year conversion remains domain logic at presentation boundaries.
- The application does not retain hidden unit-selection state, inactive controls, or
  selectable-unit component APIs.
- Completed task records and their acceptance evidence remain unchanged as historical
  records.
- This changes presentation policy only. It does not alter a data authority,
  coordinate frame, canonical unit, or true-scale geometry invariant, so no ADR is
  required.

## In scope

- Remove the command-bar distance-unit selector and its styling.
- Remove selectable-unit application state and component props.
- Make map scale labels, marker-to-selection hover distances, system details, and
  astronomy inspectors, including displayed Galactic coordinate components,
  consistently display light-years.
- Retain and test parsec-to-light-year conversion and readable map-scale calculation.
- Update component and browser tests to assert the absence of unit controls and fixed
  light-year output.
- Rebaseline `AGENTS.md`, the current technical design, implementation plan, Phase 2
  desktop design, and visual-testing instructions.

## Out of scope

- Changes to canonical astronomy JSON, parsec coordinates, catalogue generation, or
  source provenance.
- Changes to render coordinates, linear geometry, camera behavior, context-radius
  configuration, or measurement-domain calculations.
- Rewriting BOB-001, BOB-003, BOB-005, or other completed task evidence.
- Adding a new user preference, persistence field, or alternate display unit.
- Phase 2 mobile redesign work owned by BOB-016.

## Acceptance criteria

1. No parsec/light-year selector or other user-selectable distance-unit control is
   rendered at any supported viewport.
2. Map scale labels, system distances, displayed Galactic coordinate components,
   astronomy-only inspector facts, and marker-to-selection hover distances are always
   formatted in light-years.
3. `App` and presentation components no longer own or receive selectable-unit state;
   fixed light-year policy has one explicit domain-level presentation boundary.
4. Canonical coordinates and stored astronomy distances remain parsecs, and rendered
   geometry remains unchanged.
5. Domain tests retain parsec-to-light-year conversion and readable map-scale
   coverage without preserving a selectable parsec presentation mode.
6. Component and Playwright regressions prove that the unit selector is absent and
   light-year scale output remains available on desktop and phone layouts.
7. Governing repository policy and current design, roadmap, and visual-testing
   documentation describe fixed light-year presentation while completed task records
   remain historical.
8. The documented validation commands pass.

## Validation commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run validate
git diff --check
```

Manual visual verification should confirm that removing the selector leaves the
command bar balanced and usable at desktop, compact, and phone widths; the scale and
all displayed interstellar distances must use `ly`.

## Risks and mitigations

- **Risk:** A fixed-unit literal becomes duplicated across components.
  **Mitigation:** Keep one exported presentation-unit constant or fixed formatter in
  the domain unit module and consume it at presentation boundaries.
- **Risk:** Removing the control accidentally removes conversion coverage.
  **Mitigation:** Retain focused tests for parsec-to-light-year conversion and scale
  calculation.
- **Risk:** Historical completion evidence becomes inaccurate.
  **Mitigation:** Rebaseline current documents only and leave completed task records
  unchanged.

## Completion evidence

Implementation completed on 2026-07-27:

- Removed the command-bar unit selector, selectable-unit application state, obsolete
  CSS, `DistanceUnit`, and unit props across the map and inspector component tree.
- `src/domain/units.ts` now owns the fixed `ly` presentation contract,
  parsec-to-light-year conversion, distance formatting, and readable scale
  calculation.
- Map scale labels, hover separations, system distances, and displayed Galactic
  coordinate components use light-years. Canonical astronomy data and geometry remain
  in parsecs.
- Governing policy and current technical, roadmap, desktop-design, and visual-testing
  documentation now describe fixed light-year presentation. Historical completed task
  records remain unchanged.

Review and validation evidence:

- The pre-implementation task review identified the stale `AGENTS.md` contract.
  BOB-025 was amended to include that governing file, and the repeated independent
  task review returned `No findings.`
- Focused TypeScript and 18 unit/component regressions passed.
- `npm run validate` passed formatting, lint, TypeScript, 41 Python data tests,
  validation of 97 reconciled astronomy systems and four pinned sources, 116
  unit/component tests, validation of the zero state and 11 chapter files, and the
  production build.
- `npm run test:e2e` passed all 39 flows across Chromium, Firefox, and WebKit.
- `git diff --check` passed.
- Fresh headless-Chromium captures at 1440-by-900, 900-by-700, and 390-by-844 CSS
  pixels were visually inspected. The unit selector is absent, the remaining
  command-bar controls retain a balanced desktop, compact, and phone composition, and
  the map scale remains visibly labelled `ly`.
- On 2026-07-28, the Captain confirmed that the browser test passed and accepted the
  task. This closes the BOB-025 real-browser acceptance gap. The project-wide Safari
  pre-publication gap remains unchanged.

The independent implementation review identified a duplicated initial `1 ly` literal
and missing explicit desktop browser assertions. The initial label now consumes the
shared presentation-unit constant, desktop Playwright coverage verifies the same
fixed-unit contract as phone coverage, all current-tree validation was rerun, and the
repeated independent review returned `No findings.`
