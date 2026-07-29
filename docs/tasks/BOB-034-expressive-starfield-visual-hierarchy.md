# BOB-034: expressive starfield visual hierarchy

Status: Blocked
Phase: 2 (map visual refinement)
Last updated: 2026-07-29

## Objective

Make the true-scale nearby-system map feel deeper and more visually expressive while
preserving its accurate Milky Way backdrop, catalogue authority, canonical geometry,
interaction model, and responsive performance.

Replace the repeated fuzzy-ball appearance of ordinary stellar components with one
coherent but varied expressive-hybrid shader family: sharp luminous cores, compact
colour-temperature halos, and restrained diffraction rays whose prominence varies
between stars. Reduce the visual weight of astronomy-only context subtly, remove the
universal narrative-known segmented ellipse, and turn the Galactic-plane grid into a
quiet orientation aid rather than a foreground mesh.

## User-visible outcome

The reader sees a layered stellar field in which nearby catalogue systems remain
distinct from the permanent real-sky background. Individual stars vary visibly in
core, halo, ray length, and colour without looking like unrelated icons or repeated
recoloured textures. Narrative-known systems retain their collision-managed captions
and receive a subtle prominence advantage over astronomy-only context. Ordinary
known-system ellipses are absent; the rarer active, selected, and hovered states remain
clear. The Galactic-plane grid is continuously present nearby but uniformly faint and
fades away before it competes with the Milky Way.

## Prerequisites

- BOB-005 supplies the accepted, aligned Deep Star Maps 2020 backdrop and
  distance-faded Galactic-plane grid.
- BOB-014 supplies the contextual astronomy union, narrative-known and active state,
  caption collision priorities, selection frame, and hover behaviour.
- BOB-026 supplies the accepted smaller/dimmer false-infrared presentation for
  ultracool objects.

BOB-034 is blocked because committed Chapter 1.12 introduces Epsilon Eridani
(`stellar-system-005582`) as a mapped narrative anchor without the reviewed astronomy
bootstrap, pinned per-anchor acquisition coverage, and regenerated validated catalogue
required by the astronomy pipeline. The exact current command
`./.venv/bin/python scripts/validate_data.py` fails in
`validate_acquisition_queries` with `KeyError: 'stellar-system-005582'`; `npm run
build` and the required production performance baseline therefore cannot pass.

Resolve that astronomy acquisition/coverage defect through a separate owning
prerequisite task. It must review/bootstrap Epsilon Eridani, acquire and pin the
required source coverage, regenerate the catalogue, and pass the normal astronomy
validation path. Those changes are outside BOB-034. After that prerequisite closes,
amend BOB-034 with the exact validated Chapter 1.12 rendered-system and component
fixture described under **Map-render performance authority**, rerun independent task
review, and only then restore `Ready`.

Neither `Blocked` nor a later `Ready` status authorizes implementation; the Captain
must still explicitly say `proceed` or `make it so`.

## Binding references

- `../design/README.md`
- `../design/reference/starfield-expressive-hybrid-stars.png`
- `../design/reference/starfield-subtle-narrative-hierarchy.png`
- `../design/reference/starfield-whisper-grid.png`
- `../technical-design.md`, especially Sections 8.3 through 8.5, 9, and 11
- `../design/phase-2-desktop-ui.md`, especially Sections 8.2 through 8.4
- `../implementation-plan.md`, Phases 1B and 2
- `../visual-testing.md`
- `../adrs/0012-20pc-census-identity-and-substellar-presentation.md`
- `BOB-005-galactic-starfield-backdrop.md`
- `BOB-014-narrative-aware-map-integration.md`
- `BOB-026-ultracool-dwarf-identity-and-presentation.md`
- `../../AGENTS.md`

The three selected starfield images define visual direction only. Their star names,
positions, density, apparent luminosities, grid perspective, exact dimensions, and
generated image artefacts are illustrative and non-canonical. The implementation must
use the current validated catalogue, render coordinates, narrative projection, and
existing real-sky asset rather than copying facts or pixels from the references.

## Contract change and document precedence

BOB-014 and the current Phase 2 design require every narrative-known system to carry a
single segmented ellipse. BOB-034 deliberately supersedes only that ordinary
known-system marker requirement when implemented:

- ordinary narrative-known systems have no persistent ring, ellipse, arc, tick,
  reticle, or bracket;
- active systems retain the existing static double segmented ellipse and outward
  tick;
- selected systems retain the existing outer corner frame and adjacent selection
  label;
- hovered systems retain the existing tooltip;
- caption eligibility and collision priority remain unchanged.

BOB-005 and BOB-014 remain historical records of their accepted implementations.
Do not rewrite their acceptance criteria or completion evidence. Update the integrated
current contracts in `docs/technical-design.md`,
`docs/design/phase-2-desktop-ui.md`, `docs/implementation-plan.md`, and
`docs/visual-testing.md` in the BOB-034 implementation change.

No ADR is expected because this task refines presentation inside the accepted React
Three Fiber architecture and does not change data or coordinate authority. If
implementation would add a new rendering engine, post-processing architecture,
runtime astronomy source, physical luminosity claim, or persistent user preference,
stop and propose the required design/ADR change rather than expanding this task.

## Decisions

### Expressive-hybrid stellar glyphs

- Continue rendering each catalogue component as one camera-facing shader sprite.
  Generate the core, halo, and rays analytically in that existing sprite pass. Do not
  add a texture atlas, another visible/ray mesh per component, a scene-wide bloom
  pass, or another rendering engine. The accepted baseline is exactly one visible
  shaded stellar mesh plus one independent invisible pick mesh, for exactly two
  per-component render calls; BOB-034 may not increase that count.
- Use a tiny sharp luminous core, a compact smooth halo in the accepted component
  colour family, narrow primary rays, and shorter secondary rays with gently softened
  tips. Avoid the current broad fuzzy-ball silhouette, hard icon edges, oversized
  lens flares, and photographic bloom that obscures nearby markers.
- Create continuous, deterministic star-to-star variation in core size, core-to-halo
  ratio, halo falloff, primary-ray length, secondary-ray length/visibility, and
  ray-tip softness. The result must remain one recognizable shader family rather than
  a set of unrelated glyphs or one identical recoloured stamp.
- Existing accepted presentation inputs remain authoritative: component
  `marker_radius`, `pick_radius`, `intensity`, `color_family`, camera-distance
  attenuation, and the multi-component decorative offset contract. A stable
  component-identity seed may introduce bounded optical variation where existing
  inputs would otherwise be identical. That seed is decorative presentation only,
  must be deterministic across builds, and must not be exposed or documented as a
  physical stellar property.
- Prominence controls ray presence continuously. Faint components may be compact
  rayless points; ordinary components may have short primary rays; the most visually
  prominent components may have restrained primary and secondary rays. Do not create
  arbitrary named sprite classes that make equal input values jump between unrelated
  designs.
- Preserve the accepted ordinary and ultracool radius/intensity distinction from
  BOB-026. The new shader must not make brown dwarfs as large, bright, or ray-heavy as
  ordinary stars merely because rays were added.
- Preserve ADR-0012's complete visible-glyph radii: every nonzero core, halo, and ray
  fragment must remain inside the existing `marker_radius` footprint (`0.09` for
  ordinary components and `0.05` for accepted brown dwarfs) and fade to zero at its
  boundary. Do not enlarge the visible plane or reinterpret `marker_radius` as only
  the core/halo radius.
- Preserve the existing independent invisible pointer target. A smaller or dimmer
  visible glyph must not reduce picking usability.
- Keep the star field static. Do not add twinkling, pulsing, rotating rays, animated
  noise, or motion that needs a reduced-motion exception.

### Subtle narrative hierarchy

- Narrative-known state may adjust sprite presentation but may not change the
  component's accepted colour family, canonical coordinate, decorative component
  offset, measurement, picking, or catalogue facts.
- Use one explicit, testable context-emphasis constant or equivalent uniform. Start
  calibration with astronomy-only context at `0.70` of otherwise comparable
  narrative-known emphasis; the final reviewed value may remain within `0.65–0.80`.
  Record the selected constant in code and tests.
- Apply the context treatment as a bounded presentation multiplier after the base
  component variation is derived. Preserve meaningful relative differences among
  astronomy-only systems: they must not collapse into identical grey dots.
- Astronomy-only context remains clearly visible and retains its accepted stellar or
  false-infrared colour family. The hierarchy must not imply that narrative-known
  stars are physically larger, nearer, hotter, or more luminous.
- Hovering or selecting an astronomy-only system must keep it readable with its
  existing tooltip, selection frame, inspector, and DOM access path. The subtle
  context treatment must not make discovery depend on captions.

### Narrative marker and caption hierarchy

- Do not render the ordinary known-system segmented ellipse.
- Continue rendering the existing active double ellipse and outward tick unchanged
  in meaning, centred on the canonical system node and excluded from raycasting.
- Preserve the selected outer corner frame, selected label, hover tooltip, and all
  existing focus and selection behaviour.
- Preserve current caption priority:
  1. selected;
  2. hovered;
  3. active at the selected chapter/date;
  4. ordinary narrative-known.
- Selected, hovered, and active captions remain guaranteed. Ordinary known captions
  remain collision-managed and return as the view changes. Equal-priority ordinary
  captions retain a stable deterministic tie-break; do not introduce an invented
  narrative-importance score.
- Astronomy-only systems remain without persistent captions unless their existing
  hover or selection state calls for a temporary label/tooltip.

### Whisper Galactic-plane grid

- Retain the existing one-unit grid spacing, canonical orientation, double-sided
  visibility, non-raycastable ownership, and planar-distance fade.
- Make ordinary grid lines uniformly faint and thin. Do not add a major/minor cell
  hierarchy. The two zero axes may remain modestly stronger than ordinary lines but
  must stay subordinate to stars and captions.
- Reduce the maximum ordinary-line contribution to approximately one fifth of the
  current visual strength. Expose the final maximum line and axis opacity/strength as
  named, testable constants or an equivalent pure contract rather than hiding them in
  shader literals.
- Retain smooth planar-distance fading and add smooth grazing-angle suppression so
  the grid dissolves instead of accumulating into a dense horizon. It must not develop
  a hard radial boundary, pop between levels, or disappear solely because the camera
  crosses to the other Galactic hemisphere.
- The grid remains an effectively large orientation surface rather than a small local
  patch. Do not change its spacing, coordinate meaning, or use it to imply distance
  compression.

### Backdrop and map truth

- Preserve `src/assets/galactic-starfield.avif`, its source EXR, conversion script,
  provenance, attribution, colour treatment, equirectangular mapping, brightness,
  orientation, camera-following position, and non-raycastable behaviour unchanged.
- Do not add procedural stars, decorative dust, invented nebulae, routes, or
  foreground particles to manufacture depth. Every interactive foreground star
  remains a validated catalogue component.
- Preserve `scene.x = Xg`, `scene.y = Zg`, `scene.z = -Yg`, the one-system/one-node
  model, true linear interstellar geometry, canonical parsec storage, light-year
  presentation, camera framing/focus, measurements, and scale.

### Map-render performance authority

- Add an isolated production map-interaction benchmark and package command during
  implementation. The intended command name is `npm run performance:map`; it does not
  exist at task-definition time and must not be reported as passing until added.
- Build and serve the exact production bundle on strict `127.0.0.1:4174`. Use the
  repository-pinned Playwright Chromium in headless mode at `1440 × 1000` CSS pixels,
  device scale factor `1`, and reduced motion. Do not run another repository build,
  test, browser benchmark, DevTools recording, or CPU-throttled workload concurrently.
- Use Chapter mode with **Read through** and **Knowledge through** set to Chapter 1.12,
  the latest current committed narrative map context. Assert that the projected
  narrative-known astronomy anchors include Solar System (`sol`) and Epsilon Eridani
  (`stellar-system-005582`).
- After the blocking prerequisite produces a valid catalogue, record in this task the
  exact expected sorted rendered-system ID set and sorted rendered-component ID set,
  or a committed deterministic hash plus exact count for each set. The benchmark must
  assert those fixture identities before timing and print them with the two anchor IDs.
  Baseline and final runs must use identical asserted fixture identities; merely
  printing unasserted counts is insufficient. BOB-034 cannot return to `Ready` until
  these exact fixture expectations are present.
- If canonical content changes that maximum before BOB-034 implementation begins,
  update this task and fixture explicitly rather than silently choosing another
  projection.
- Before each sweep, invoke the visible **Reset view** control and wait for camera
  position and controls-target changes to remain below `1e-5` scene units for 12
  consecutive animation frames, with a `3 s` timeout that fails the run. Assert that
  the reset pose is identical to the first sweep's pose within that tolerance.
- Derive input coordinates from the current map canvas bounds. Use one primary-button
  mouse pointer (`button = 0`, `buttons = 1`, stable pointer ID): pointer down at
  `(70% canvas width, 50% canvas height)`, move linearly to `(30%, 50%)` over 120
  animation-frame steps, then return linearly to `(70%, 50%)` over another 120 steps,
  dispatching exactly one pointer move through the canvas's real `OrbitControls`
  listener path per animation frame, then release at the start point.
- Perform two excluded warm-up sweeps followed by five measured sweeps with that exact
  trajectory. Capture every `requestAnimationFrame` interval from pointer down through
  post-release damping. Damping is settled only when both camera-position and
  controls-target changes remain below `1e-5` scene units for 12 consecutive frames;
  use the same `3 s` timeout and fail rather than truncating a non-settled sample.
- Before changing production rendering, record three baseline runs from the current
  BOB-034 parent implementation on the same development host and pinned browser.
  After implementation, record three final runs under the identical fixture. Compare
  the median of each run's median and 95th-percentile frame interval.
- The final median and 95th-percentile frame intervals may each regress by no more
  than `15%` from baseline. The median number of intervals above `50 ms` may not
  increase by more than two per measured run, and no final interval may exceed
  `100 ms`. The gate must fail on a budget violation.
- Print the baseline budgets, all final run metrics, rendered counts, production
  bundle assets, WebGL renderer, browser version, Node version, CPU identity, host,
  and platform. Record the baseline and accepted final evidence in this task's
  completion evidence.
- This repeatable software-WebGL comparison is the automated regression authority.
  It complements rather than replaces smooth orbit/pan/zoom review on the Captain's
  real supported GPU/browser.

## In scope

- Refactor the existing star-sprite shader and its pure presentation helpers/uniforms
  to implement the selected expressive-hybrid core, halo, rays, deterministic
  variation, distance attenuation, and subtle narrative emphasis.
- Thread the existing narrative-known state into sprite presentation without creating
  a second narrative projection or marker-ownership path.
- Remove ordinary known-ring rendering and simplify marker geometry helpers/tests
  while preserving active geometry.
- Recalibrate the existing Galactic-plane shader to the whisper treatment, including
  grazing-angle suppression and named/testable visual constants.
- Preserve or improve render ordering, additive-blending correctness, alpha
  application, colour-space handling, depth behaviour, and picking.
- Add focused unit, component, and browser regression coverage for deterministic
  variation, shader contracts, context emphasis, marker-state geometry, grid fades,
  interaction, and preserved map truth.
- Update directly affected documentation in the same implementation change:
  - `README.md` for the current map hierarchy;
  - `docs/technical-design.md` for stellar sprites, narrative emphasis, marker
    states, and whisper-grid behaviour;
  - `docs/design/phase-2-desktop-ui.md` for the superseded known-ring treatment and
    preserved active/selection/caption hierarchy;
  - `docs/implementation-plan.md` for this Phase 2 visual-refinement slice;
  - `docs/visual-testing.md` for desktop, compact, phone, real-browser, state,
    backdrop, grid, and interaction checks;
  - `docs/design/README.md` if final implementation evidence needs a clarification
    beyond the already indexed selected references;
  - this task's completion evidence and any documented deviations.

## Generated-artifact expectations

- The selected design-reference PNGs remain design documentation and are not bundled
  into the application or treated as runtime assets.
- No generated star texture, texture atlas, noise map, lookup image, or alternate
  Milky Way asset is expected.
- Normal ignored Vite, Playwright, and generated narrative output remains uncommitted.
- If implementation discovers that a new generated runtime asset is necessary, stop
  and revise the owning design, reproducibility, provenance, build-validation, and
  task contracts before adding it.

## Out of scope

- Replacing, recolouring, rotating, dimming, or reprocessing the accepted Milky Way
  backdrop.
- Changes to astronomy catalogue acquisition, reconciliation, generated JSON,
  presentation-source precedence, component membership, canonical coordinates, or
  narrative content.
- Changing active-system derivation, caption collision thresholds/priorities,
  selection semantics, focus motion, context radius, contextual astronomy search,
  inspectors, timeline behaviour, or spoiler projection.
- Removing or redesigning the active double ring/tick, selected corner frame, selected
  label, or hover tooltip.
- Adding routes, travel paths, constellations, sectors, planets, animated particles,
  twinkling, global bloom, depth of field, lens-flare assets, or user-facing visual
  settings.
- A second 3D engine, new runtime dependency, runtime service, remote asset request,
  or new localStorage field.
- Rewriting historical completion evidence in BOB-005, BOB-014, or BOB-026.

## Acceptance criteria

1. Every rendered stellar component still uses one camera-facing sprite draw path and
   the existing independent pick target: exactly one visible shaded mesh and one
   invisible pick mesh, for two per-component render calls. The implementation adds no
   further per-component meshes, texture lookups, global post-processing pass,
   animation loop state, new 3D engine, or runtime dependency.
2. Ordinary stars render with a sharp compact core, bounded colour-family halo, and
   restrained analytic rays. Across a representative field, deterministic differences
   in core/halo/ray proportions are visibly present; rerendering the same component
   inputs and stable ID produces the same result.
3. Faint components may be rayless and accepted ultracool objects remain smaller and
   dimmer than ordinary stars. The complete nonzero core/halo/ray footprint remains
   within ADR-0012's existing `0.09` ordinary or `0.05` brown-dwarf visible radius.
   Additive blending applies component intensity and distance attenuation exactly
   once each and does not reintroduce the prior double-intensity defect.
4. Narrative-known and astronomy-only systems preserve their accepted component
   colours and relative base variation. The final context-emphasis constant is within
   `0.65–0.80`, is applied once, and produces the selected subtle hierarchy rather
   than hiding astronomy context.
5. Ordinary narrative-known systems render no persistent ellipse, ring, arc, tick,
   reticle, or bracket. Their eligible captions retain the current collision-managed
   behaviour and stable priority/tie-break rules.
6. Active systems retain the static double segmented ellipse and outward tick.
   Selected systems retain the outer corner frame and selected label. Hover tooltips,
   raycasting, closest-hit resolution, selection, deselection, inspector coordination,
   and camera focus remain unchanged.
7. The Galactic-plane grid retains one-unit canonical spacing and two-sided
   visibility, uses named/tested line and axis strength contracts, remains faint near
   the camera, fades smoothly with planar distance and grazing angle, and does not
   accumulate into a dense horizon or show a hard fade boundary.
8. The accepted Deep Star Maps 2020 texture, source/conversion hashes, colour,
   orientation, attribution, runtime request behaviour, and camera-following
   non-raycastable dome remain unchanged.
9. Canonical coordinates, render mapping, true linear scale, displayed light-year
   values, system/component ownership, decorative component offsets, map scale,
   measurement results, camera reset, and focus targets are unchanged.
10. Automated tests cover deterministic optical variation, bounded narrative
    emphasis, shader intensity/attenuation application, ordinary-known versus active
    geometry, caption priority preservation, grid distance/angle fades, two-sided
    grid visibility, backdrop invariants, and unchanged picking/selection behaviour.
11. Playwright covers narrative-known, active, astronomy-only, selected, and hovered
    states through semantic/interaction assertions at desktop, compact, and phone
    viewports. It does not use fragile pixel-perfect WebGL comparisons.
12. The existing production chapter-transition performance gate remains within its
    documented budgets. The new production map benchmark uses the exact fixture and
    protocol in **Map-render performance authority**, records the required before/after
    evidence, stays within every relative and long-frame budget, and fails on a budget
    violation. Orbit/pan/zoom also remain smooth on the current remote-workstation
    browser at the same Chapter 1.12 context.
13. README, technical design, Phase 2 desktop design, implementation plan, visual
    testing guidance, task index, and this task accurately describe the final
    starfield, marker, caption, backdrop, and grid contracts without rewriting
    historical task evidence.
14. The Captain completes and explicitly accepts remote real-browser visual review
    before the task is marked `Done`. The review compares the built implementation
    with all three selected references while treating generated labels, star facts,
    positions, and exact pixels as non-canonical.

## Validation commands

```bash
./.venv/bin/python scripts/validate_data.py
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run performance
npm run validate
git diff --check
```

The implementation must add the currently nonexistent `npm run performance:map`
authority specified above, update this validation list when the command exists, and
run it for both the required baseline and final production evidence. Do not claim that
command at task-definition time.

At task-definition time, `./.venv/bin/python scripts/validate_data.py` fails with
`KeyError: 'stellar-system-005582'` because the blocking Chapter 1.12 Epsilon Eridani
astronomy coverage prerequisite is unresolved. Do not interpret that known
pre-implementation failure as a BOB-034 visual regression or claim any downstream
build/performance command as passing until the prerequisite is closed.

For manual visual review, run `npm run dev` and use current real Chrome, Firefox, Edge,
and mobile Chrome where available. At desktop, compact, and phone widths:

- compare representative bright, ordinary, multi-component, neutral-fallback, and
  ultracool systems;
- compare narrative-known, astronomy-only, active, selected, and hovered states;
- create caption collisions and verify selected/hovered/active priority plus stable
  ordinary-caption suppression and return;
- orbit above and below the Galactic plane, pan, zoom through the supported range,
  select from map and DOM paths, focus, deselect, and reset;
- verify the whisper grid remains useful nearby, fades before the horizon, and never
  overtakes stars, captions, scale, or orientation aids;
- verify the unchanged Milky Way remains aligned, seam-free, non-pickable, and
  visually intact;
- confirm interaction remains smooth and no ray, halo, grid, or marker flickers,
  pulses, pops, clips, or aliases objectionably.

Preserve normal screenshots, traces, and videos for failed browser tests. Headless
software-WebGL evidence does not replace the Captain's real-browser visual acceptance.
Record unavailable Safari review as the existing pre-publication gap.

## Risks and cautions

- Diffraction rays and identity-seeded variation are presentation devices, not
  physical observations. Keep them bounded and never expose them as catalogue facts.
- Analytic core/halo/ray work can increase fragment cost even without adding draw
  calls. Keep halos compact and rays narrow inside the unchanged fixed-radius quad;
  enforce the production map-interaction budget and inspect dense/multi-component
  views on real GPU hardware.
- Additive blending can wash stellar colours toward white or apply intensity twice.
  Preserve one tested alpha/intensity path and calibrate cores separately from halos.
- Narrative emphasis can accidentally overwhelm physical presentation differences.
  Keep the selected subtle range and verify astronomy-only bright stars remain
  visually credible.
- Removing the ordinary ring makes captions the only persistent narrative-known
  identifier. Preserve collision behaviour, browser/keyboard discovery, and
  selected/active/hover priority.
- Grazing-angle grid suppression can make the plane disappear abruptly or asymmetrically
  across hemispheres. Use a smooth absolute-angle response and test above, below, and
  near the plane.
- The references were generated for exploration. Do not copy their invented star
  roster, relative brightness, grid geometry, or rendered Milky Way pixels into
  canonical/runtime data.

## Blockers and unresolved decisions

- Blocking prerequisite: valid reviewed astronomy bootstrap, pinned per-anchor source
  coverage, regenerated catalogue, and passing validation for Chapter 1.12 anchor
  `stellar-system-005582`.
- Before restoring `Ready`, record the exact validated Chapter 1.12 rendered-system
  and component fixture identities/counts required by the performance authority and
  rerun independent task review.

No visual decision remains unresolved. Any material deviation from the visual
decisions above requires Captain review before implementation continues.
