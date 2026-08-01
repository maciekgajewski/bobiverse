# BOB-20260731-MCVXSZ: zoomed stellar-system mode

Status: In progress
Phase: 3 (exploration tools)
Last updated: 2026-07-31

## Objective

Introduce the first narrow vertical slice of the guided system view: a fixed-camera
zoomed mode for an eligible selected narrative-known stellar system. Preserve the
reader's map orientation and the existing multi-component star layout while allowing
individual astronomy catalogue components to be selected and inspected.

This task establishes only system entry, star-only local presentation, component
selection, breadcrumbs, history-aware exit, and exact restoration. It does not render
planets or any other orbiting body.

## User-visible outcome

When a reader selects an eligible narrative-known stellar system, its right-hand
inspector exposes **Enter system**. Activating it smoothly moves the camera closer to
the selected system without changing the viewing angle. Other stellar systems remain
stationary as strongly dimmed background context while the entered system's existing
star glyphs enlarge in their existing apparent arrangement.

The top bar reads **Star Map** during ordinary map use and becomes a breadcrumb such
as **Star Map / Sol** in zoomed mode. Each visible component star is independently
selectable and updates the right-hand inspector with that astronomy component's
catalogue details. The camera remains fixed and the scene offers no interaction
other than 2D component-star picking.

**Return to map**, the **Star Map** breadcrumb, or browser Back exits zoomed mode.
The camera moves back to its exact pre-entry pose, ordinary map presentation and
interaction return, and the entered stellar system—not an internal component—remains
selected.

## Prerequisites and authorization

- BOB-014 supplies reader-safe narrative-to-astronomy system mapping, selection,
  active-system state, and automatic mapped-system focus.
- BOB-015 supplies the current desktop and compact map-first shell.
- BOB-034 supplies the accepted stellar glyphs, component offsets, picking envelope,
  Galactic backdrop, captions, and map-performance authority.
- ADR-0020 and `BOB-20260731-ACPTAB` supply the final guided-system-view direction.
  This task deliberately implements only the star-only entry and exit foundation.

`Ready` status does not authorize implementation. The Captain must explicitly say
`proceed` or `make it so`.

## Binding references

- `../design/guided-system-view.md`, especially Sections 5, 6, and 7
- `../technical-design.md`, especially Sections 8.4, 8.5, 9.1, 9.2, 10, and 12
- `../implementation-plan.md`, Phase 3
- `../visual-testing.md`
- `../data-model-definition.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0018-spoiler-projected-system-survey-observations.md`
- `../adrs/0020-guided-system-view-and-orbital-presentation.md`
- `BOB-014-narrative-aware-map-integration.md`
- `BOB-015-phase-2-desktop-integration-and-acceptance.md`
- `BOB-034-expressive-starfield-visual-hierarchy.md`
- `BOB-20260731-ACPTAB-guided-schematic-system-view.md`
- `../../AGENTS.md`

## Decisions

### Incremental authority boundary

- Entry remains reader-safe and narrative-driven. Expose **Enter system** only for a
  selected, reader-visible narrative location with `kind: "star_system"` that maps
  to the rendered astronomy system and whose projected hierarchy contains either:
  - more than one direct `member_of_system` child with `kind: "star"`; or
  - at least one such star with a direct recognized renderable `orbits` child.
- Recognized orbital kinds for eligibility are `planet`, `dwarf_planet`, `moon`,
  `asteroid_belt`, `kuiper_belt`, and `oort_cloud`. Direct orbital children affect entry
  eligibility but receive no geometry, label, preview, or pick target in this task.
- Astronomy-only systems, single-star systems without recognized orbital children,
  and systems known only through non-renderable descendants do not expose the action.
- After entry, the visible and selectable stars are the entered astronomy system's
  existing catalogue components. Add an explicit astronomy-component selection
  identity rather than pretending each component is already mapped to a narrative
  star location.
- Component selection is an incremental presentation and inspection identity. It
  does not make astronomy components a second authority for planets, change the
  narrative hierarchy, or infer a narrative-star/component association. A later task
  must establish that association before orbital bodies can be attached to individual
  stars.
- Ordinary map behavior remains system-level: clicking any component glyph outside
  zoomed mode continues to select the whole stellar system.

### Entry state and browser history

- Represent zoomed mode separately from ordinary inspection selection. Capture the
  entered astronomy system ID, its narrative system selection, the exact camera
  position, exact controls target, and ordinary map interaction state needed for
  restoration.
- Entering creates exactly one browser-history state. Component selection does not
  push or replace browser-history entries.
- Browser Back exits zoomed mode in one step. **Return to map** and the **Star Map**
  breadcrumb use the same centralized exit behavior and must not create duplicate
  entries, history traps, or repeated restoration.
- Do not persist zoomed mode or component selection in reader-progress
  `localStorage`.
- If reader projection invalidates entry eligibility while zoomed mode is active,
  exit safely through the same restoration path and announce the reason.

### Camera and visual continuity

- Entry starts from the current interstellar camera pose after ordinary system focus.
  Smoothly dolly toward the entered system while preserving the camera's orientation
  and the system's apparent screen direction. Do not orbit into a predefined angle.
- Capture the pre-entry pose before the zoomed-mode dolly. Exit reverses the visual
  travel and restores the captured camera position and controls target exactly.
- Reuse each component's existing `componentOffset(...)` value unchanged. Do not
  compute a second multi-star layout, rescale individual offsets independently, pair
  astronomy components with narrative stars by array order, or write presentation
  offsets into canonical astronomy data.
- Because the camera angle and offsets are preserved, a multi-star system must retain
  the same apparent component arrangement it had immediately before entry. The dolly
  only magnifies that arrangement.
- Reuse the existing BOB-034 star glyph and Galactic backdrop authority. Do not add
  local star spheres, a second shader family, a second sky texture, bloom, or a second
  rendering engine.
- Other interstellar systems retain their canonical positions and remain stationary,
  strongly dimmed, unlabeled, and non-pickable. Fade the Galactic grid, scale overlay,
  ordinary captions, hover surfaces, system selection frame, and other interstellar-
  only interaction affordances.
- Respect reduced motion from the first zoomed-mode frame. Replace camera travel with
  an immediate pose change or restrained fade while preserving all state and history
  semantics.

### Fixed camera and 2D star interaction

- Once entry completes, freeze the zoomed-mode camera and controls target. Disable
  pan, orbit rotation, mouse-wheel zoom, trackpad and touch pinch zoom, double-click
  zoom, and map keyboard-camera controls.
- Do not intercept browser magnification shortcuts or disable user scaling.
- Only the entered system's component-star glyphs are semantic scene pick targets.
  No background system, grid, backdrop, label, empty-space plane, future orbital
  placeholder, or decorative element is selectable.
- Component selection uses simple 2D screen picking against practical independent
  targets. It changes the selected astronomy component and right-hand inspector but
  never moves the camera, changes the breadcrumb, enters another focus level, or
  changes the entered system.
- The component inspector identifies the parent system and exposes only validated
  existing catalogue and visual facts. It must not invent narrative identity,
  physical component separation, orbit, or unvalidated measurements.
- Provide an equivalent labelled DOM selection path for every visible component so
  component inspection does not require precise canvas picking or a pointer device.

### Breadcrumb and exit controls

- Replace the current top-bar map title with a labelled breadcrumb surface.
- In ordinary map mode, display the single root **Star Map**.
- In zoomed mode, display **Star Map / `<entered astronomy system display name>`**.
  The system crumb reports context and is not a component-selection history.
- The root **Star Map** crumb is actionable only in zoomed mode and exits through the
  centralized restoration path. Provide a distinct **Return to map** action in the
  same top surface.
- Keep both controls keyboard-operable with visible focus and practical touch targets
  in desktop, compact, phone, short-height, and 200%-browser-zoom layouts.

### Test-only Alpha Centauri projection

- Use the validated astronomy record `stellar-system-005413` (**Alpha Centauri**) and
  its existing Alpha Centauri A, Alpha Centauri B, and Proxima Centauri components as
  the deterministic multi-component visual-acceptance fixture.
- Supply eligibility through a clearly synthetic test-only reader projection with a
  mapped narrative `star_system` and multiple direct `member_of_system` star children.
  The synthetic stars establish only entry eligibility; they do not claim individual
  associations with the three astronomy components.
- Provide an explicit, documented test/development-only way to run this projection in
  Playwright and manual visual review. It must be opt-in, side-effect-free, and
  unavailable from the ordinary production application and production build output.
- Do not add Alpha Centauri to canonical narrative source data, reader progress,
  generated canonical projections, or the ordinary narrative-known system set.
- Regression coverage must prove the fixture cannot change normal production
  projection or make canonical Alpha Centauri narrative-known at any reader position.

## In scope

- Zoomed-mode application state and exact camera/target capture.
- One-entry browser-history integration and centralized exit behavior.
- Narrative-driven entry eligibility and the right-inspector **Enter system** action.
- A fixed-camera dolly transition with reduced-motion behavior.
- Reuse of existing astronomy component glyphs and exact decorative offsets.
- Strongly dimmed, stationary, non-interactive interstellar background context.
- Astronomy-component selection identity, canvas picking, DOM access, and inspector.
- **Star Map** breadcrumb and **Return to map** controls.
- Focused unit, component, E2E, accessibility, and map-regression coverage.
- A deterministic test-only Alpha Centauri projection and documented manual fixture
  entry path that cannot affect canonical or production data.
- Directly affected technical, interaction, visual-testing, and user documentation.

## Out of scope

- Rendering or selecting planets, dwarf planets, moons, asteroid belts, Kuiper belts,
  Oort clouds, orbit paths, previews, or orbital placeholders.
- Mapping narrative star locations to astronomy catalogue components.
- Star-focused camera views, hierarchy drill-down, internal breadcrumbs, active-
  location focus, or timeline-driven local navigation.
- New narrative fields, orbital ordering, body classes, surface textures, asset
  registry roles, body geometry, or particle regions.
- Physical stellar separation, orbital geometry, simulation, animation, measurement,
  or changes to canonical astronomy coordinates.
- Free camera controls in zoomed mode.
- Entry into astronomy-only or reader-hidden systems.
- Canonically marking Alpha Centauri as narrative-known or adding synthetic fixture
  entities to committed narrative source or generated runtime data.
- A modal, popup, route replacement, backend, runtime service, remote asset request,
  second renderer, or second sky authority.
- Completing the broader BOB-016 mobile workspace redesign.

## Acceptance criteria

1. A selected mapped, reader-visible narrative star system exposes **Enter system**
   exactly when its projected hierarchy contains multiple recognized star children or
   at least one recognized renderable direct `orbits` child beneath a recognized star.
2. Astronomy-only, reader-hidden, single-empty-star, and non-renderable-descendant-
   only systems never expose **Enter system**.
3. Entry preserves the current camera orientation and apparent system direction,
   smoothly dollies closer, and retains the aligned Galactic backdrop without a
   modal, blank frame, or route replacement.
4. Every entered astronomy component reuses its exact ordinary-map glyph inputs and
   `componentOffset(...)`; a multi-star fixture has the same apparent component
   arrangement immediately before and after the transition, differing only in
   magnification and zoomed-mode state treatment.
5. Other interstellar systems remain stationary at their canonical positions as
   strongly dimmed, unlabeled, non-pickable background. Interstellar overlays and
   interaction affordances are absent while zoomed mode is active.
6. The zoomed camera cannot pan, rotate, wheel-zoom, pinch-zoom, double-click-zoom, or
   move through map keyboard controls. Browser magnification remains available.
7. Only entered component stars are scene-selectable. Each component has an
   independent canvas target and equivalent labelled DOM control; background and
   decorative geometry never acquire semantic pick targets.
8. Selecting a component updates a distinct astronomy-component selection and the
   right-hand inspector without moving the camera, changing the entered system, or
   changing **Star Map / `<System>`**.
9. Component inspection uses only validated existing astronomy catalogue facts,
   identifies the parent system, and does not claim a narrative-star association or
   physical separation.
10. Ordinary map clicks remain system-level and existing narrative-known versus
    astronomy-only styling and picking behavior remain unchanged outside zoomed mode.
11. Ordinary mode shows **Star Map**. Zoomed mode shows
    **Star Map / `<entered system name>`** plus **Return to map**; both exit paths are
    accessible by keyboard and practical at compact and phone sizes.
12. Entry creates one browser-history state. Browser Back, **Return to map**, the root
    crumb, and projection invalidation each exit exactly once without stale disabled
    controls, duplicate entries, or history traps.
13. Exit restores the exact captured camera position and target, ordinary overlays,
    captions, hover, picking, controls, and the entered system as the current
    selection. Internal component selection does not survive as the map selection.
14. Reduced-motion mode removes spatial camera travel while preserving entry, fixed
    interaction, history, breadcrumbs, component selection, and exact restoration.
15. Desktop, compact, phone, short-height, 200% browser zoom, keyboard-only use, and
    WebGL fallback retain reachable inspection and exit paths without horizontal page
    scrolling or false claims that the zoomed scene is available.
16. Existing interstellar coordinate, measurement, scale, focus, reset, shader,
    picking, caption, and BOB-034 render-call and performance contracts do not regress.

17. Directly affected documentation describes the implemented incremental boundary,
    including that orbital bodies and narrative-star/component association remain for
    later tasks.
18. An opt-in test/development-only projection makes the existing
    `stellar-system-005413` Alpha Centauri record eligible without altering canonical
    narrative data. It renders the record's three real catalogue components, supports
    automated and manual visual review, and is absent from ordinary production
    behavior and build output.
19. A fresh independent implementation review returns `No findings.`, all documented
    validation passes, and the Captain accepts the real-browser desktop and mobile
    visual result before this task becomes `Done`.

## Validation

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run format:check`
- `npm run build && ! rg -n 'development-alpha-centauri|system-fixture' dist`
- `npx playwright test tests/e2e/atlas.spec.ts --project=chromium --grep "development Alpha Centauri fixture"`
- `python3 scripts/tasks.py check`
- Remote supported-browser review following `docs/visual-testing.md` remains required
  before this task can move to `Done`.

## Required regression coverage

- Pure unit coverage for entry eligibility, component-selection identity, fixed-
  camera state, exact capture/restoration, component-offset reuse, dimming/picking
  decisions, reduced motion, and browser-history transitions.
- Component coverage for conditional **Enter system**, component DOM selection and
  inspection, unchanged breadcrumb during component selection, every exit surface,
  projection invalidation, status announcements, keyboard focus, and WebGL fallback.
- Cross-browser Playwright coverage for Sol, the test-only eligible Alpha Centauri
  projection,
  one ineligible astronomy-only fixture, fixed camera gestures, component selection,
  browser Back, repeated entry and exit, exact restoration, reduced motion, compact
  interaction, phone layout, short height, and 200% browser zoom.
- Existing map interaction and performance coverage proving ordinary system-level
  selection, narrative emphasis, focus, reset, captions, measurements, render-call
  count, and frame-time gates remain unchanged outside zoomed mode.
- Isolation coverage proving the Alpha Centauri projection is explicitly opt-in,
  cannot enter canonical narrative/generated data, is unavailable to the production
  application, and leaves ordinary Alpha Centauri astronomy-only.

## Validation commands

Run from the repository root:

```bash
python3 scripts/tasks.py check
npm run validate
npm run test:e2e
npm run performance:map
git diff --check
```

Run `npm run performance:map` without a concurrent build, test, benchmark, browser
recording, or CPU-throttled workload. The normal `npm run validate` path must cover
all new type, unit, component, build, and static-data contracts.

## Manual visual acceptance

Start the trusted-LAN development server with `npm run dev` and review from real
supported desktop and mobile browsers. At minimum:

- enter and exit Sol and the documented test-only Alpha Centauri projection;
- compare the multi-star apparent layout immediately before and after entry from
  several ordinary-map camera angles;
- verify that entry preserves the angle, the dolly reads as moving toward the system,
  and exit returns to the exact captured pose;
- select every component through both canvas and DOM controls and confirm that the
  inspector changes without camera or breadcrumb movement;
- verify that no background object or empty scene area is selectable and that no
  local camera gesture changes the view;
- test **Return to map**, the **Star Map** crumb, browser Back, repeated entry/exit,
  projection invalidation, and reduced motion;
- inspect dimmed background continuity and the breadcrumb at wide, compact, phone,
  short-height, and 200% browser zoom.

The headless host and automated screenshots cannot approve the final WebGL
transition. Record unavailable real browsers as explicit publication gaps. Keep the
task `In progress` until the Captain personally accepts the final visual result.

## Documentation and generated artifacts

During implementation:

- update `../technical-design.md` with zoomed-mode state, astronomy-component
  selection, camera restoration, and the incremental authority boundary;
- update `../design/guided-system-view.md` to record exact-offset reuse and clarify
  how the star-only precursor composes with the later narrative hierarchy;
- update `../implementation-plan.md` if Phase 3 ordering needs to name this delivered
  slice explicitly;
- add repeatable zoomed-mode checks and eventual acceptance evidence to
  `../visual-testing.md`;
- update `../../README.md` with entry, component inspection, breadcrumb, browser Back,
  fixed interaction, and exit behavior;
- document the exact test/development-only Alpha Centauri fixture entry path in
  `../visual-testing.md`, including its production-isolation guarantee;
- keep generated artifacts deterministic and validated through the normal repository
  path; do not commit exploratory screenshots or browser caches.

## Risks and resolved decisions

- **The magnified offset looks physical.** Preserve existing decorative offsets but
  expose no separation measurement or orbital claim; document that the layout is
  presentation-only.
- **Component selection is mistaken for narrative identity.** Use a distinct
  astronomy-component selection kind and catalogue-only inspector. Do not infer or
  pair narrative stars in this task.
- **The transition changes the apparent multi-star layout.** Preserve both camera
  orientation and exact existing component offsets; test from multiple entry angles.
- **Background interaction leaks through.** Centralize zoomed-mode scene picking so
  only entered component targets participate.
- **History or controls remain trapped after exit.** Centralize restoration and test
  repeated Back, root-crumb, explicit-return, and invalidation paths.
- **The first slice becomes a competing final system view.** Keep planets, hierarchy
  focus, and narrative-star/component association explicitly deferred to later tasks
  under `BOB-20260731-ACPTAB`.

No material decisions remain unresolved. Implementation is not authorized.
