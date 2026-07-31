# BOB-20260731-ACPTAB: guided schematic stellar-system view

Status: Ready
Phase: 3 (exploration tools)
Last updated: 2026-07-31

## Delivery decomposition

This document remains the complete reference scope and final integrated behavior for
the guided schematic system view. It is intentionally too large for one implementation
change and will be delivered through smaller, independently reviewable tasks rather
than implemented atomically.

The first delivery task is
`BOB-20260731-MCVXSZ-zoomed-stellar-system-mode.md`. It establishes entry, exit,
camera continuity, browser history, breadcrumbs, dimmed map context, and selectable
astronomy-component stars only. Later tasks will add narrative-star association,
orbital bodies, guided hierarchy focus, surface assets, activity navigation, and the
remaining behavior specified here. This decomposition does not authorize
implementation of this reference task or any child task.

## Objective

Add a guided, spoiler-safe local-system view that renders the projected hierarchical
location composition of an eligible mapped stellar system. Preserve visual continuity
with the true-scale interstellar map while making the local view explicitly
schematic, selection-driven, responsive, and usable without free camera controls.

Implement the complete vertical slice: hierarchy projection, entry and exit state,
guided focus and breadcrumbs, body and orbital-region rendering, generic and optional
custom surface-texture contracts, responsive and accessible interaction, regression
coverage, directly affected documentation, and real-browser visual acceptance.

## User-visible outcome

After selecting a narrative-known stellar system on the interstellar map or through a
DOM surface, the reader sees **Enter system** when that system has meaningful
reader-visible composition. Activating it appears to continue toward the selected
star while retaining the Galactic backdrop and dimming other interstellar systems.

The resulting local view uses predefined compositions:

- a system overview presents component stars as interactive objects and their
  immediate orbital children as reduced non-interactive previews;
- selecting a star reveals its planets, dwarf planets, asteroid belts, Kuiper belts,
  and Oort cloud as interactive children, with moons as reduced previews;
- selecting a planet reveals its moons;
- selecting any leaf provides a close inspection composition with restrained parent
  context.

Breadcrumbs move back through the hierarchy, **Return to map** restores the exact
interstellar view, and browser Back exits system mode without replaying every internal
focus step. The reader cannot pan, rotate, wheel-zoom, or pinch-zoom the schematic.
Planets and moons are textured spheres; belts and clouds have distinct region
treatments; active narrative locations remain visible without timeline changes
forcing camera motion.

## Prerequisites and authorization

- BOB-014 supplies reader-safe map projection, map selection, active-system state,
  DOM selection, and automatic mapped-system focus.
- BOB-015 supplies the current simultaneous desktop and compact map-first shell.
- BOB-029 supplies the single prepared-corpus and projection boundary.
- BOB-034 supplies the accepted interstellar stellar glyph, Galactic backdrop,
  caption hierarchy, picking, and map-performance authority.
- BOB-037 supplies the moon-complete ordered Solar-System baseline.
- BOB-20260730-PEMMHF supplies spoiler-projected surveyed bodies and body observations.
- ADR-0020 records the Captain-approved schematic ordering, rendering-authority, and
  body-surface boundary.

BOB-016 remains a separate broader mobile-workspace design task. This task must make
its own system-view surface first-class at compact and phone sizes inside the current
shared map-first shell, without attempting to complete or pre-empt BOB-016.

`Ready` status does not authorize implementation. The Captain must explicitly say
`proceed` or `make it so`.

## Binding references

- `../design/guided-system-view.md`
- `../technical-design.md`, especially Sections 8.4, 8.5, 9, 10, 11, and 12
- `../data-model-definition.md`
- `../implementation-plan.md`, Phase 3
- `../visual-testing.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0018-spoiler-projected-system-survey-observations.md`
- `../adrs/0020-guided-system-view-and-orbital-presentation.md`
- `BOB-014-narrative-aware-map-integration.md`
- `BOB-015-phase-2-desktop-integration-and-acceptance.md`
- `BOB-029-responsive-chapter-projection-pipeline.md`
- `BOB-034-expressive-starfield-visual-hierarchy.md`
- `BOB-037-seed-largest-planetary-moons.md`
- `BOB-20260730-PEMMHF-system-survey-body-observations.md`
- `../../AGENTS.md`

Where the older survey ADR or completed task describes anonymous moon order as
non-orbital presentation inventory, ADR-0020 and the integrated current design
supersede only that ordering statement. Completed task history and evidence remain
unchanged.

## Decisions

### One projected hierarchy

- Build local-system composition from the current `NarrativeWorld` location entities
  and their generated ordered child relationships. Do not scan raw zero-state or
  chapter JSON from React, add a committed generated system-view snapshot, or create
  a second narrative projection.
- Enter only a selected reader-visible `star_system` location that maps to the current
  astronomy context and has either multiple `member_of_system` star children or at
  least one star with a recognized renderable `orbits` child.
- Astronomy-only systems without a projected narrative hierarchy never expose
  **Enter system**.
- Component stars are the system's existing `member_of_system` children. A body stays
  beneath its authored parent star. Do not invent shared, circumbinary, or
  system-level bodies absent from the hierarchy.
- Add optional non-metric integer `orbital_order`, constrained inclusively to
  `1`–`9007199254740991`, to flat chapter location introductions and updates whose
  effective `parent_relation` is `orbits`.
- Assign every zero-state nested orbital child an implicit effective key in child
  array order: `1024`, `2048`, and so on.
- Require explicit and implicit effective sibling keys to be unique. Introduction or
  reparenting omission appends after the effective maximum in `1024` increments;
  define the maximum of an empty set as `0`, so its first omitted child receives
  `1024`. Stable location ID determines allocation order for simultaneous omissions,
  which receive successive `1024` increments. Ordinary update omission retains the
  effective key.
- An update may use any unused positive safe integer to insert or move a child. If no
  integer remains in the desired gap, the same authored change must renumber affected
  siblings explicitly. Leaving `orbits` removes the effective key. Reject
  non-integer, non-positive, unsafe, overflowing, or duplicate effective keys with
  source-aware diagnostics.
- Derive projected `child_ids` from effective orbital order before React consumes the
  hierarchy. The renderer must preserve that order and must not sort by name, kind,
  ID, source mention, generated texture, or layout convenience.
- Recognize exactly the entered `star_system`, its direct
  `member_of_system` children of kind `star`, and `orbits` descendants of kind
  `planet`, `dwarf_planet`, `moon`, `asteroid_belt`, `kuiper_belt`, or
  `oort_cloud` for local geometry and guided focus.
- Keep locales, megastructures, transit nodes, and all other relations
  DOM-inspectable but outside entry eligibility, local geometry, previews, and
  breadcrumbs. A selected or active non-rendered location resolves visual focus to
  its nearest recognized ancestor without changing the actual inspection selection.
- Preserve the complete reader-order and story-time eligibility boundary. A hidden
  location must not appear as a sphere, particle region, label, preview, breadcrumb,
  DOM control, asset request, or accessible name.

### Entry, local state, and exit

- Keep ordinary interstellar single-click selection unchanged. Add one explicit
  **Enter system** action to the narrative system inspector only when entry
  eligibility passes.
- Represent system-mode state separately from ordinary object selection. It must
  include the entered system, current eligible focus path, and the interstellar
  camera/target state required for exact restoration. Do not persist this transient
  focus path in reader-progress localStorage.
- Entry creates one browser-history state. Internal focus changes replace local UI
  state without pushing history entries. Browser or mobile Back exits system mode.
  Breadcrumbs handle internal ancestor navigation.
- **Return to map**, browser Back, projection invalidation, and controlled error
  recovery restore or safely reframe the interstellar map exactly once. They must not
  leave stale disabled controls, dimming, history traps, or background interaction.
- Selecting an eligible direct child inside the local scene or through a DOM
  relationship performs the same atomic operation: update shared narrative selection,
  update the focus path, announce the selection, and begin the predefined transition.
- Selecting a leaf still produces a focused composition. Selecting the already
  focused location retains that view and exposes or emphasizes its inspector.

### Seamless visual transition

- Reuse the accepted `GalacticStarfield` orientation and local texture throughout
  entry, local navigation, and exit. Do not add a second sky authority or background
  texture.
- Keep non-entered interstellar systems only as strongly dimmed, non-pickable,
  unlabeled background context. Their canonical positions and existing map shader
  inputs remain unchanged; local view must not increase the accepted normal
  interstellar per-component render-call contract.
- Fade the interstellar grid, scale overlay, captions, hover surfaces, and selection
  frame as specified by the approved design. Transform the entered stellar marker
  into the local composition without a popup, modal, route replacement, or abrupt
  blank frame.
- Local positions use a separate schematic coordinate space or render-layer
  transform. They never enter canonical coordinates, interstellar focus math,
  displayed measurements, separation calculations, map scale, or astronomy JSON.
- Exit restores the exact pre-entry interstellar camera position, target, selection,
  and enabled controls.
- Respect reduced motion from the first rendered frame. Replace spatial camera travel
  and axial body rotation with immediate state changes or restrained fades.

### Guided views and progressive disclosure

- Provide predefined responsive compositions for system overview, star focus,
  planet/dwarf-planet focus, moon focus, and orbital-region focus. The renderer may
  share composition primitives but must not collapse these semantics into arbitrary
  camera distance.
- Disable local pan, orbit rotation, mouse-wheel zoom, trackpad or touch pinch zoom,
  and double-click zoom. Do not intercept browser magnification gestures or disable
  user scaling.
- Render recognized direct children at full local detail with interaction and
  attempted persistent labels. Render their recognized direct children at reduced
  scale as non-interactive unlabeled previews. Hide deeper recognized descendants.
- Reduced previews have no raycast target, hover state, selection frame, or ordinary
  label. An active preview may receive an active label and ancestor-path treatment,
  but reaching it still proceeds one hierarchy level at a time.
- Retain the immediate parent and nearby sibling context as dim non-interactive
  geometry. Compact layouts may remove distant sibling context before reducing the
  focused subtree or active path.
- Add a labelled top-panel breadcrumb and a distinct **Return to map** action.
  Breadcrumb items represent entered hierarchy, not inspector history.
- Direct interactive labels use collision priority:
  active, selected or keyboard-focused, hovered, then ordinary. Selection, active
  state, focus, and hover remain distinguishable without relying only on colour.
- Treat active locations as a set. Mark every recognized active location and map each
  non-rendered active location to its nearest recognized ancestor. When multiple
  targets collapse to one ancestor, show a count rather than selecting an arbitrary
  target.
- Derive that set from eligible location entities in the existing shared
  Chapter-mode or Date-mode narrative activity index. Do not create another activity
  projection, infer current character presence from last-seen data, or choose a
  location from `mapped_system_ancestry`.
- When exactly one active target is outside the current focus, provide
  **Focus active location**. When several are available, provide a labelled
  **Active locations** DOM list sorted by visible system name, hierarchy path, and
  display name solely for stable presentation. Do not infer chronology or priority
  from tied/incomparable activity or array order.
- Selecting an active-list entry follows its recognized local path, exits and invokes
  existing interstellar focus for another mapped system, or changes only inspection
  selection when no mapped/rendered destination exists. Timeline and reader-progress
  changes otherwise never move local focus automatically.
- If projection changes remove the focused location, retreat to its nearest eligible
  ancestor. If the entered system is no longer eligible, exit to the map and announce
  why. An active location in another mapped system uses existing interstellar focus
  after exit; unmapped activity never receives an invented destination.

### Schematic bodies and regions

- Render planets, dwarf planets, and moons as WebGL sphere meshes with local
  equirectangular surface textures. Do not use planet billboard sprites.
- Use bounded categorical visual sizes for stars, gas giants, ice giants, rocky or
  icy or dwarf bodies, and moons. These sizes and every layout radius are
  presentation only. Focus prominence comes from framing and state treatment rather
  than mutating the category size.
- Assign deterministic decorative orbit radii that preserve stored sibling order.
  Keep orbital phase fixed. Do not animate bodies around paths or imply physical
  period, inclination, phase, radius, or separation.
- Permit very slow deterministic axial rotation only on full-detail spherical bodies.
  Reduced previews remain static, and reduced-motion preference disables rotation.
- Render `asteroid_belt` as a restrained uneven particle annulus, `kuiper_belt` as a
  broader and sparser cold annulus, and `oort_cloud` as a faint outer particle shell.
  The Oort treatment must fade during inner focus before it obscures the focused
  subtree.
- Use one efficient visual region representation plus one independent interaction
  target when a region is a direct interactive child. Individual decorative particles
  never become locations, labels, or pick targets.

### Generic and dedicated body surfaces

- Extend the existing direct asset registry with a required validated role that
  distinguishes at least `illustration` and `body_surface`.
- Preserve the current stable ID, safe local path, unique path, existing-file,
  provenance, and reader-projection rules. Update all existing illustration fixtures
  and semantics so `picture_id` rejects a `body_surface` asset.
- Define body-surface metadata sufficient to validate an equirectangular colour
  texture, its compatible body class or kind, and whether it participates in the
  deterministic generic pool. Keep presentation metadata outside astronomy
  authority.
- Add optional `surface_texture_id` to zero-state and chapter-introduced locations of
  kind `planet`, `dwarf_planet`, or `moon`, plus nullable update semantics. It must
  resolve only to a compatible registered `body_surface` asset. A kind change to an
  ineligible kind must null-clear the retained surface reference in the same update.
- When `surface_texture_id` is absent, select a generic texture deterministically from
  the effective reader-visible body class and stable location ID, with a safe
  kind-based fallback when `body_class` is absent.
- Adding generic assets in a later change must not silently reshuffle established
  appearances. Implement a stable versioned selection rule or record explicit
  selected generic IDs before extending a pool.
- A supplied `surface_texture_id` overrides automatic choice and may point to a
  generic preset or a dedicated custom surface. Do not add a second custom-texture
  field or embed paths in narrative data.
- Add at least two visibly distinct, project-owned generic equirectangular textures
  compatible with each supported `body_class`: `rocky`, `icy`, `dwarf_planet`,
  `gas_giant`, and `ice_giant`. Also provide kind-safe fallbacks for classless
  planets, dwarf planets, and moons.
- Record original provenance or generation notes for every texture. Validate safe
  paths, role compatibility, dimensions/projection expectations, colour space,
  mipmapping, and seam behavior through the normal data/build path. Make no external
  runtime asset request.
- Dedicated custom surfaces are supported but a complete named-body art pass is out
  of scope. One focused fixture must prove a dedicated override uses the same
  projection, loading, and sphere path as generic surfaces.
- If implementation adds any user-facing asset-generation or conversion script under
  `scripts/`, it must implement the repository-standard side-effect-free `--help`
  contract and receive regression coverage.

### Responsive and accessible behavior

- Use the same local system mode, focus path, projected hierarchy, and renderer on
  desktop, compact desktop, tablet, and phone. Do not create a second mobile scene,
  selection model, or spoiler filter.
- Fit predefined views from actual canvas/container dimensions. On compact screens,
  reduce distant sibling context, preview detail, and low-priority labels in that
  order while retaining the focused subtree and active path.
- Preserve the accepted current compact map-first browser and inspector panels. The
  breadcrumb, **Return to map**, **Enter system**, and **Focus active location**
  controls remain reachable without simultaneously showing every desktop surface.
- Provide practical independent pointer targets and equivalent ordinary DOM controls.
  Phone targets meet the accepted 44-by-44 CSS-pixel contract without visually
  enlarging small bodies or making reduced previews interactive.
- All local navigation and selection functions are operable by keyboard through
  labelled DOM controls with visible focus. Do not require a gesture, precise 3D
  picking, or spatial keyboard cursor.
- Keep status announcements concise for entry, focus, ancestor navigation, projection
  fallback, and exit. Avoid announcing decorative camera frames or axial rotation.
- At 200% browser zoom and short viewport heights, controls, breadcrumb, focused
  content, inspector access, and attribution remain reachable without horizontal page
  scrolling.
- With WebGL unavailable, do not show a false local composition. Keep the same
  projected hierarchy, inspector relationships, active-location information, and
  selection eligibility available through DOM surfaces.

## In scope

- Shared application state and history integration for system mode.
- A projected hierarchy/view-model boundary derived once from `NarrativeWorld`.
- Guided system-view React Three Fiber components and pure layout/state helpers.
- Explicit inspector entry and active-location actions.
- Breadcrumb and return controls.
- Background continuity and interstellar/local transition.
- Spheres, local star treatment, orbit paths, belts, cloud, labels, previews, and
  reduced-motion presentation.
- Typed asset roles, body-surface metadata, optional surface assignment, validation,
  projection, deterministic generic selection, and project-owned generic textures.
- Optional `orbital_order`, deterministic append/reparenting semantics, ordered
  `child_ids`, validation, and current-corpus compatibility.
- Directly affected application, component, unit, data, E2E, and map-performance
  regression coverage.
- Integrated technical, data-model, asset/provenance, visual-testing, README, and task
  documentation.

## Out of scope

- Physical orbital coordinates, measured radii, orbital periods, inclinations,
  simulation, propagation, or time-varying orbital phase.
- Shared or circumbinary bodies absent from the current hierarchy.
- Narrative extraction workflow or sealed-evidence changes.
- More than the existing four-moon authoring cap.
- Custom dedicated art for every named or prominent body.
- Surface locales, megastructure interior views, character paths, system chronicles,
  or planet chronicles.
- Free local camera pan, orbit, wheel zoom, pinch zoom, or rotation.
- A popup, modal system diagram, new route stack, deep link, new rendering engine,
  backend, runtime service, remote texture, global bloom, or other post-processing
  framework.
- Completing the broader BOB-016 mobile workspace redesign.

## Acceptance criteria

1. A selected projected narrative star system exposes **Enter system** exactly when
   it has multiple recognized star children or at least one star with a recognized
   renderable orbital child. Astronomy-only, single-empty-star, and
   non-renderable-descendant-only systems do not expose the action.
2. Entry preserves the accepted Galactic backdrop, dims and disables other
   interstellar systems, removes interstellar-only overlays, and transitions without
   a popup or blank scene into a hierarchy-derived system overview.
3. Exit through **Return to map**, browser Back, or eligibility fallback restores the
   exact captured interstellar camera, target, selected system, overlays, picking,
   captions, and controls without adding duplicate history entries.
4. System overview, star focus, planet focus, moon focus, and orbital-region focus use
   predefined responsive compositions with no local pan, camera rotation, wheel
   zoom, pinch zoom, double-click zoom, or interception of browser magnification.
5. Recognized direct children are full-detail and selectable; recognized
   grandchildren are visibly reduced non-interactive previews; deeper recognized
   descendants are absent. Canvas and DOM selection reach the same resulting
   selection and focus path.
6. Zero-state arrays assign implicit `1024`-interval keys and optional flat
   `orbital_order` claims share the same positive-safe-integer order. Tests prove a
   later-introduced inner body and a reparented body occupy their authored positions,
   the first omitted child of an empty parent receives `1024`, simultaneous omissions
   receive successive keys in stable-ID order, ordinary updates retain keys, gap
   exhaustion requires explicit renumbering, invalid or colliding keys fail, and the
   renderer preserves derived `child_ids` exactly without sorting.
7. Multiple-star fixtures render every hierarchical star, place only that star's
   authored descendants beneath it, and create no shared or inferred bodies.
8. Planets, dwarf planets, and moons render as categorically sized textured spheres.
   Orbit positions remain fixed; full-detail bodies rotate slowly only when reduced
   motion is off.
9. Asteroid and Kuiper belts render as distinct annuli and the Oort cloud as a faint
   outer shell. Direct regions are selectable through one region target; preview
   regions are non-interactive; decorative particles are never semantic objects.
10. Collision-managed direct-child labels preserve active, selected or focused,
    hovered, and ordinary priority. Reduced previews are unlabeled except for the
    active-location exception; all simultaneous active locations receive treatment;
    collapsed targets show a count; and semantic states remain distinguishable
    without colour alone.
11. Breadcrumbs contain only entered hierarchy levels, restore predefined ancestor
    views, and do not modify inspector history or push browser-history entries.
12. Timeline and progress changes update plural active treatment without moving
    focus. One target exposes **Focus active location**; several expose a complete
    stable presentation-only **Active locations** list. Selection follows the chosen
    recognized local path, exits and uses existing interstellar focus for another
    mapped system, or retains DOM inspection without inventing an unmapped
    destination.
13. Projection changes retreat from an ineligible focus to the nearest eligible
    ancestor or exit an ineligible system atomically, clear invalid selection/history
    entries, and announce the reason.
14. The asset schema and semantic validation distinguish illustration and
    body-surface roles. `picture_id` and `surface_texture_id` reject the wrong role,
    unknown IDs, incompatible body kinds/classes, unsafe paths, duplicate paths,
    missing files, and invalid null-clearing transitions with source-aware
    diagnostics.
15. Generic surface selection is deterministic, has at least two project-owned
    variants per supported body class plus safe classless-kind fallbacks, does not
    reshuffle under the documented extension path, and issues no external runtime
    request. A dedicated fixture proves explicit override behavior.
16. Desktop, compact, phone, short-height, and 200% browser-zoom coverage preserves
    focus, active path, labels according to priority, touch targets, inspector access,
    attribution, and freedom from horizontal page scrolling.
17. Every system-view action has a visible-focus keyboard/DOM path. WebGL-unavailable
    state preserves hierarchy inspection and selection without claiming a visual
    system view.
18. Reduced-motion mode removes spatial camera travel and axial rotation while
    preserving focus, breadcrumbs, history, activity, and status semantics.
19. Existing interstellar coordinates, measurements, scale, catalogue contents,
    stellar shader hierarchy, map picking, caption behavior, backdrop orientation,
    and BOB-034 render-call and performance gates remain unchanged.
20. README, technical design, data-model definition, asset/provenance guidance,
    implementation plan, visual-testing guidance, and any generated schema
    documentation describe the final implemented behavior without leaving the task
    design as the only authority.
21. A fresh independent implementation review returns `No findings.`, all documented
    validation passes, and the Captain accepts the real-browser desktop and mobile
    visual result before the task becomes `Done`.

## Required regression coverage

- Pure unit coverage for hierarchy construction, entry eligibility, stored-order
  layout, later inner insertion, reparenting, deterministic append, categorical
  sizes, deterministic texture choice, region geometry inputs, exact renderable-kind
  filtering, label priority, focus-path fallback, and history-state decisions.
- Narrative schema and semantic coverage for asset roles, `surface_texture_id`
  introduction/update/null-clearing, optional `orbital_order`, effective sibling
  uniqueness, introduction/reparenting projection, compatibility, source-aware
  diagnostics, spoiler projection, and older-view non-disclosure.
- Component coverage for **Enter system**, breadcrumbs, **Return to map**,
  singular **Focus active location**, plural **Active locations**, multiple active
  descendants collapsing to one ancestor, shared canvas/DOM selection, non-rendered
  descendant fallback, status announcements, timeline non-follow behavior, and
  compact controls.
- Cross-browser Playwright coverage for entry, one complete star/planet/moon
  drill-down, belts and Oort cloud, exact Back/exit restoration, multiple stars,
  active-location change, reduced motion, browser zoom reflow, touch-sized compact
  interaction, WebGL fallback, orbiting-megastructure and non-orbital-descendant
  exclusion, simultaneous same-system activity, multiple active systems, tied or
  incomparable activity, and absence of external surface requests.
- Existing map interaction and performance coverage to prove no regression to normal
  interstellar rendering, transition cancellation, reset, picking, captions,
  measurements, or BOB-034 budgets.
- Asset tests for dimensions/projection metadata, local existence, provenance,
  texture seams where automatable, correct colour space and mipmap setup, and role
  isolation.

## Validation commands

Run from the repository root:

```bash
python3 scripts/tasks.py check
npm run validate
npm run test:e2e
npm run performance:map
git diff --check
```

`npm run validate` remains the normal combined formatting, lint, type, Python/data,
narrative, unit/component, and production-build path. Any new asset registry or
generated presentation data must be validated from that path rather than through an
undocumented optional command.

Run `npm run performance:map` without a concurrent build, test, benchmark, browser
recording, or CPU-throttled workload. It protects the established interstellar
authority; smooth local transitions additionally require the manual real-browser
review below.

## Manual visual acceptance

Start the trusted-LAN development server with `npm run dev` and review from real
supported desktop and mobile browsers. At minimum:

- enter and exit Sol and one multiple-star fixture;
- traverse star, planet, moon, asteroid-belt, Kuiper-belt, and Oort-cloud focus;
- compare full children, reduced previews, active descendants, and dim parent
  context at wide, compact, phone, short-height, and 200% browser zoom;
- verify the Galactic backdrop and distant stars remain continuous, correctly
  oriented, subordinate, non-pickable, and free from abrupt parallax or seams;
- confirm decorative spacing reads clearly without suggesting measured geometry;
- inspect every generic texture family for sphere seams, flatness, repetition,
  lighting readability, and categorical scale;
- confirm slow axial rotation is subtle and disappears under reduced motion;
- verify no local drag, wheel, pinch, or double-click gesture moves the guided camera
  or blocks browser magnification;
- test breadcrumb, Return, browser Back, active-location action, timeline changes,
  eligibility fallback, keyboard focus, and compact inspector access;
- check that label collisions, belts, the Oort shell, and preview density remain
  readable without obscuring the focused subtree.

The headless host and automated screenshots cannot approve the final WebGL
composition. Record unavailable real browsers as explicit publication gaps. Keep the
task `In progress` until the Captain personally accepts the final visual result.

## Documentation and generated artifacts

During implementation:

- update `../technical-design.md` from approved intent to final component, state,
  asset, and fallback contracts;
- update `../data-model-definition.md` and the canonical schema documentation for
  asset roles and `surface_texture_id`;
- update `../implementation-plan.md` if delivered scope or ordering changes;
- add a dedicated section to `../visual-testing.md` with repeatable system-view
  manual checks and eventual acceptance evidence;
- update `../../README.md` with entry, guided navigation, browser Back, responsive,
  and surface behavior;
- document body-surface asset creation, provenance, format, colour-space, seam, and
  extension rules;
- commit generic runtime textures and any validated registry data, but do not commit
  exploratory references, prompts containing book text, temporary conversions,
  browser caches, screenshots that expose noncanonical source material, or remote
  URLs as runtime dependencies;
- keep generated files deterministic and format them through the normal repository
  path.

## Risks

- **The transition looks like a scene replacement.** Preserve the selected star's
  screen continuity, accepted backdrop, and dimmed interstellar context; tune in real
  browsers rather than approving headless frames alone.
- **Schematic geometry appears physical.** Keep local measurements absent, use
  consistent decorative spacing, and state the schematic nature in the interface and
  documentation.
- **The renderer becomes a second narrative authority.** Derive one view model from
  the projected `NarrativeWorld` and preserve `child_ids`; never scan or join raw
  chapter sources in React.
- **Small screens become crowded.** Remove distant context and lower-priority labels
  before hiding focused or active content; use DOM alternatives and independent touch
  targets.
- **The Oort shell obscures the system.** Keep it faint and fade it during inner
  focus.
- **Texture assets add seams, memory, or provenance risk.** Bound the library, use
  optimized local formats, validate metadata and files, document generation, and
  inspect every family on a rotating sphere.
- **Surface fields leak later knowledge.** Keep assignments inside the normal
  reader-projected location state and cover earlier views.
- **Browser Back or projection changes trap local mode.** Centralize exit and
  eligibility fallback and test repeated entry/exit/history sequences.
- **New local geometry regresses the interstellar renderer.** Keep system rendering
  inactive outside local mode and retain the BOB-034 map-performance authority.
