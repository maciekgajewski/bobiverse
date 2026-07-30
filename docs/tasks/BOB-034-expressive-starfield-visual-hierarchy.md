# BOB-034: expressive starfield visual hierarchy

Status: Done
Phase: 2 (map visual refinement)
Last updated: 2026-07-30

## Objective

Make the true-scale nearby-system map feel deeper and more visually expressive while
preserving its accurate Milky Way backdrop, catalogue authority, canonical geometry,
interaction model, and responsive performance.

Replace the repeated fuzzy-ball appearance of ordinary stellar components with one
coherent but varied expressive-hybrid shader family: sharp luminous cores, compact
colour-temperature halos, and restrained diffraction rays whose prominence varies
between stars. Reduce the visual weight and footprint of astronomy-only context,
remove the
universal narrative-known segmented ellipse, and turn the Galactic-plane grid into a
quiet orientation aid rather than a foreground mesh.

## User-visible outcome

The reader sees a layered stellar field in which nearby catalogue systems remain
distinct from the permanent real-sky background. Individual stars vary visibly in
core, halo, ray length, and colour without looking like unrelated icons or repeated
recoloured textures. Narrative-known systems retain their collision-managed captions
and receive a clear brightness-and-size prominence advantage over astronomy-only
context. Ordinary known-system ellipses are absent; the rarer active, selected, and
hovered states remain clear. The Galactic-plane grid is continuously present nearby
but uniformly faint and fades away before it competes with the Milky Way.

## Prerequisites

- BOB-005 supplies the accepted, aligned Deep Star Maps 2020 backdrop and
  distance-faded Galactic-plane grid.
- BOB-014 supplies the contextual astronomy union, narrative-known and active state,
  caption collision priorities, selection frame, and hover behaviour.
- BOB-026 supplies the accepted smaller/dimmer false-infrared presentation for
  ultracool objects.

BOB-030 resolved the former Chapter 1.12 Epsilon Eridani astronomy blocker. It
deterministically bootstraps `stellar-system-005582`, pins the required per-anchor
source coverage, regenerates the validated catalogue, and makes the normal astronomy
validation path pass. The validated, immutable BOB-034 visual benchmark fixture is
recorded under **Map-render performance authority**.

`Ready` status does not authorize implementation; the Captain must still explicitly
say `proceed` or `make it so`.

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
- `../adrs/0018-narrative-known-star-footprint.md`
- `../adrs/0019-bob-034-software-renderer-performance-budget.md`
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

ADR-0018 records the Captain-authorized narrative-known footprint expansion. It
supersedes ADR-0012 only where `marker_radius` was interpreted as the complete final
visible footprint for every narrative state; ADR-0012's base presentation values,
source authority, identity, classification, false-colour, intensity, and independent
picking contracts remain binding.

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
- Preserve ADR-0012's `marker_radius` values as the base astronomy-only footprint:
  `0.09` for ordinary components and `0.05` for accepted brown dwarfs. Under
  ADR-0018, narrative-known components use a `2×` visible plane from that base, so
  the complete normalized core/halo/ray family grows proportionally and still fades
  to zero at the enlarged plane boundary.
- Preserve the existing independent invisible pointer target. A smaller or dimmer
  visible glyph must not reduce picking usability.
- Keep the star field static. Do not add twinkling, pulsing, rotating rays, animated
  noise, or motion that needs a reduced-motion exception.

### Subtle narrative hierarchy

- Narrative-known state may adjust sprite presentation but may not change the
  component's accepted colour family, canonical coordinate, decorative component
  offset, measurement, picking, or catalogue facts.
- Use one explicit, testable context-emphasis constant or equivalent uniform.
  Astronomy-only context uses `0.25` of otherwise comparable narrative-known
  emphasis. The Captain rejected `0.70` as insufficiently distinct in real desktop
  Chrome and Firefox on 2026-07-30 and explicitly authorized recalibration to `0.55`.
  After further real-browser review the Captain rejected both `0.55` treatments and
  explicitly selected `0.25`. Record the selected constant in code and tests.
- Apply the context treatment once, after the composed base alpha is bounded to
  `[0, 1]`. The Captain rejected the pre-clamp `0.55` implementation because bright
  analytic cores could still exceed `1.0` before framebuffer clamping and therefore
  appear as bright as narrative-known cores. Preserve meaningful relative differences
  among astronomy-only systems: they must not collapse into identical grey dots.
- Apply the explicit ADR-0018 scales to narrative-known components: `2×` visible
  plane and proportional ray reach, plus the retained `1.25` internal core/halo scale
  for effective `2.5×` core/halo size. Astronomy-only visible planes, core/halo
  radii, and ray lengths remain at `1.0`; independent pick targets remain unchanged.
  This is a screen-space narrative encoding and not a physical or canonical size.
- Astronomy-only context remains clearly visible and retains its accepted stellar or
  false-infrared colour family. The hierarchy must not imply that narrative-known
  stars are physically larger, nearer, hotter, or more luminous; documentation and
  user-facing presentation treat the scale solely as reading-progress emphasis.
- Hovering or selecting an astronomy-only system must keep it readable with its
  existing tooltip, selection frame, inspector, and DOM access path. The subtle
  context treatment must not make discovery depend on captions.

### Narrative marker and caption hierarchy

- Do not render the ordinary known-system segmented ellipse.
- Continue rendering the existing active double ellipse and outward tick unchanged
  in meaning, centred on the canonical system node and excluded from raycasting.
- Preserve the selected outer corner frame, selected label, hover tooltip, and all
  existing focus and selection behaviour.
- Preserve current caption collision priority:
  1. selected;
  2. hovered tooltip reservation;
  3. active at the selected chapter/date;
  4. ordinary narrative-known.
- The hover tooltip is the hovered system's sole map-name surface. Suppress that
  system's ordinary map caption while hovered, but keep its priority slot reserved so
  nearby captions do not jump underneath the tooltip; restore the caption when hover
  ends. Selected and active caption guarantees otherwise remain unchanged. Ordinary
  known captions remain collision-managed and return as the view changes.
  Equal-priority ordinary captions retain a stable deterministic tie-break; do not
  introduce an invented narrative-importance score.
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

- The Captain approved one narrow implementation prerequisite on 2026-07-30:
  calibrate OrbitControls damping from `0.08` to `0.09` and drain pending damping
  before restoring the exact reset pose. The original control could not satisfy the
  then-current 3-second/12-stable-frame protocol. This approval does not
  authorize changes to framing, focus targets, gesture mapping, distance limits, or
  canonical coordinates.
- Add an isolated production map-interaction benchmark and package command during
  implementation. The intended command name is `npm run performance:map`; it does not
  exist at task-definition time and must not be reported as passing until added.
- Build and serve the exact production bundle on strict `127.0.0.1:4174`. Use the
  repository-pinned Playwright Chromium in headless mode at `1440 × 1000` CSS pixels,
  device scale factor `1`, and reduced motion. Do not run another repository build,
  test, browser benchmark, DevTools recording, or CPU-throttled workload concurrently.
- Use Chapter mode with **Read through** and **Knowledge through** set to Chapter 1.14
  solely to reproduce the immutable BOB-034 visual benchmark fixture. Later chapter
  additions do not move this benchmark. Changing the reproducing chapter or any
  asserted fixture identity requires an explicit task update rather than silently
  following the latest narrative content.
- Assert the following complete visual-state fixture before timing and print every
  count, hash, and the two narrative-known anchor IDs. Hashes are lowercase SHA-256
  over the lexicographically sorted IDs, encoded as UTF-8 with one ID and one
  terminating newline per entry:
  - narrative-known systems: `sol` and `stellar-system-005582`; count `2`, SHA-256
    `a6ade58e82a771675324c2e62a61ffc7e9e53a14e76d7017f39466a04110a18d`;
  - active systems: `stellar-system-005582`; count `1`, SHA-256
    `27fd4d5893c7c9f362b80ae7e7ecb9608251b0f0b6e4a7b2c9cba529c17b52ff`;
  - rendered systems: count `119`, SHA-256
    `59edd1bf20f11470559a370948c28b8226afe9f9b902e18a6a3dd1ba6f312ac0`;
  - rendered components: count `144`, SHA-256
    `53a6aa4570f19c575cdbcbf7e0f71139fc98ad46c1abd99e83c516d597096fe1`.
    Baseline and final runs must use these identical asserted fixture identities;
    merely printing unasserted counts is insufficient.
- Load and assert that immutable fixture once per command invocation, then use exact
  reset poses and excluded warm-ups between all three runs. Capture one reference
  reset pose after fixture load and assert every run and sweep against it. Do not
  navigate the page while a run or settlement observer is active.
- Before each sweep, invoke the visible **Reset view** control and wait for camera
  position and controls-target changes to remain below `1e-5` scene units for 12
  consecutive animation frames, with a `4 s` timeout that fails the run. Assert that
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
  use the same `4 s` timeout and fail rather than truncating a non-settled sample.
- Before changing production rendering, record three baseline runs from the current
  BOB-034 parent implementation on the same development host and pinned browser.
  After implementation, record three final runs under the identical fixture. Compare
  the median of each run's median and 95th-percentile frame interval.
- Under the Captain-authorized ADR-0019 software-renderer policy, the final median
  frame interval may not exceed `33.4 ms`, the observed 30-fps cadence boundary. The
  final 95th-percentile frame interval may regress by no more than `15%` from
  baseline. The median number of intervals above `50 ms` may not increase by more
  than two per measured run, and no final interval may exceed `100 ms`. The gate must
  fail on a budget violation.
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
  variation, distance attenuation, and explicit narrative hierarchy.
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
- Apply the approved `0.09` damping and exact-reset prerequisite without changing
  framing, focus targets, gesture mapping, or distance limits.
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
   dimmer than ordinary stars. Astronomy-only core/halo/ray footprints remain within
   ADR-0012's base `0.09` ordinary or `0.05` brown-dwarf visible radius;
   narrative-known footprints use ADR-0018's `2×` visible-plane scale.
   Additive blending applies component intensity and distance attenuation exactly
   once each and does not reintroduce the prior double-intensity defect.
4. Narrative-known and astronomy-only systems preserve their accepted component
   colours and relative base variation. The final context-emphasis constant is
   `0.25`, is applied once after base-alpha clamping, and produces the
   Captain-authorized candidate hierarchy without hiding astronomy context. Bright
   analytic cores cannot saturate before the multiplier and bypass the hierarchy.
   Narrative-known components use a `2×` visible plane and proportional ray reach;
   their retained `1.25` internal core/halo scale produces effective `2.5×`
   core/halo size. Astronomy-only optics remain at `1.0`, and picking is unchanged.
   Final visual acceptance remains pending the Captain's real-browser review of this
   corrected calibration.
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
   measurement results, camera reset pose, and focus targets are unchanged. The only
   control calibration is the Captain-approved `0.09` damping plus pending-damping
   drain before exact reset.
10. Automated tests cover deterministic optical variation, bounded narrative
    emphasis, shader intensity/attenuation application, ordinary-known versus active
    geometry, caption priority preservation, grid distance/angle fades, two-sided
    grid visibility, backdrop invariants, and unchanged picking/selection behaviour.
11. Playwright covers narrative-known, active, astronomy-only, selected, and hovered
    states through semantic/interaction assertions at desktop, compact, and phone
    viewports. While a system is hovered, its tooltip is visible and its duplicate map
    caption is absent; the caption returns when hover ends. It does not use fragile
    pixel-perfect WebGL comparisons.
12. The existing production chapter-transition performance gate remains within its
    documented budgets. The new production map benchmark uses the exact fixture and
    protocol in **Map-render performance authority**, records the required before/after
    evidence, stays within every relative and long-frame budget, and fails on a budget
    violation. Orbit/pan/zoom also remain smooth on the current remote-workstation
    browser with the same BOB-034 visual benchmark fixture.
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
npm run performance:map
npm run validate
git diff --check
```

The implementation adds the `npm run performance:map` authority specified above and
runs it for both the required baseline and final production evidence.

After BOB-030, `./.venv/bin/python scripts/validate_data.py` passes with 119
reconciled systems and five pinned astronomy sources. This readiness validation does
not establish a BOB-034 visual or performance baseline; run and record the complete
implementation validation below after implementation.

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

## Implementation evidence

Automated implementation and validation are complete for the ADR-0018 `0.25`/`2×`
result. On 2026-07-30, after the hover-caption deduplication fix, the Captain verified
the corrected real-browser result and explicitly accepted both the fix and the final
visual presentation.

Manual calibration evidence: the Captain inspected the `0.70` hierarchy in real
desktop Chrome and Firefox on 2026-07-30 and rejected it because narrative-known stars
were not perceptibly much brighter than unexplored context. The Captain then
authorized `0.55`, inspected the pre-clamp result, and again reported no significant
brightness difference. Investigation showed that composed alpha could exceed `1.0`
before emphasis, allowing both contexts to saturate at the framebuffer boundary. The
Captain authorized the systematic correction: bound base alpha first, then apply the
single `0.55` multiplier. The Captain then requested complete known stars twice their
current size with proportionally larger rays and selected `0.25` for much dimmer
astronomy context. ADR-0018 records that choice. These checks establish the rejected
calibrations; the accepted final result is recorded above.

Implemented contracts:

- one visible analytic shader sprite plus the unchanged independent pick mesh per
  component, with deterministic bounded core, halo, primary-ray, secondary-ray, and
  ray-tip variation;
- one `0.25` astronomy-context emphasis multiplier, applied after base variation and
  explicit base-alpha clamping;
- one `2×` narrative-known visible-plane scale with proportional ray reach and
  retained `1.25` internal core/halo scale for effective `2.5×` core/halo size;
- unchanged astronomy-only visible planes and independent pick targets;
- no ordinary narrative-known ring, with active double segmented ring/tick, selected
  corner frame/label, hover tooltip, and caption priority preserved;
- one-unit double-sided whisper grid with named `0.17` line and `0.26` axis strengths,
  planar-distance fade, and symmetric grazing-angle suppression;
- unchanged Galactic backdrop asset and component/catalogue geometry.

The required baseline was captured before changing star or grid rendering. The
current `0.08` OrbitControls damping narrowly failed the prerequisite 3-second settle
protocol with camera delta `4.422669375640286e-6`, target delta `0`, but only 10 of 12
required stable frames. The Captain explicitly approved calibrating damping to `0.09`
and draining pending damping before exact reset on 2026-07-30; the visual renderer
remained unchanged. This prerequisite correction is included in both baseline and
final measurements.

Baseline evidence:

- median of run medians: `16.8 ms`;
- median of run p95 values: `83.2 ms`;
- median intervals above `50 ms`: `24`;
- maximum interval: `83.4 ms`;
- production JS: `/assets/index-wWmUyeCg.js`;
- renderer: ANGLE SwiftShader Vulkan `1.3.0`, Chromium `149.0.7827.55`, Node
  `v22.23.1`, AMD Ryzen 5 5600, host `piotr`, Linux `7.0.0-28-generic x64`;
- the complete raw three-run evidence is committed in
  `tests/performance/fixtures/bob-034-map-baseline.json`.

Historical `0.70` automated evidence, superseded after the Captain rejected that
visual calibration:

- median of run medians: `16.8 ms` (`0%` regression; budget `19.32 ms`);
- median of run p95 values: `66.8 ms` (`19.7%` improvement; budget `95.68 ms`);
- median intervals above `50 ms`: `24` (change `0`; budget `26`);
- maximum interval: `83.5 ms` (budget `100 ms`);
- final runs, as median/p95/long-frame-count/maximum in milliseconds:
  `16.8/66.7/24/83.5`, `33.2/66.8/24/83.4`, and
  `16.8/83.3/24/83.4`;
- production JS: `/assets/index-BKG-XE5B.js`;
- the fixture asserted both narrative-known anchors, one active system, 119 rendered
  systems, 144 rendered components, and all four recorded hashes;
- renderer, browser, Node, CPU, host, and platform matched baseline.

The first `0.55` attempt was externally terminated before metrics. A completed retry
while an unrelated Ollama inference consumed roughly five CPU cores produced an
invalid `33.2 ms` aggregate median and was discarded under this task's required
no-concurrent-workload protocol, not treated as a pass or rendering regression.

Historical pre-clamp `0.55` automated evidence, superseded after the Captain rejected
that visual result:

- median of run medians: `16.8 ms` (`0%` regression; budget `19.32 ms`);
- median of run p95 values: `66.7 ms` (`19.8%` improvement; budget `95.68 ms`);
- median intervals above `50 ms`: `23` (change `-1`; budget `26`);
- raw, unrounded maximum interval: `100 ms` (budget `100 ms`);
- final runs, as median/p95/long-frame-count/maximum in milliseconds:
  `16.7/66.7/23/83.40000000000873`, `16.8/83.3/23/83.40000000000873`,
  and `16.8/66.7/23/100`;
- production JS: `/assets/index-BZ0F0ZP3.js`;
- the fixture asserted both narrative-known anchors, one active system, 119 rendered
  systems, 144 rendered components, and all four recorded hashes;
- renderer, browser, Node, CPU, host, and platform matched baseline;
- the absolute `100 ms` ceiling was enforced against raw intervals rather than
  rounded display values.

Historical post-clamp brightness-only `0.55` automated evidence, superseded by the
Captain-authorized known-star core/halo scale:

- median of run medians: `16.8 ms` (`0%` regression; budget `19.32 ms`);
- median of run p95 values: `83.2 ms` (`0%` regression; budget `95.68 ms`);
- median intervals above `50 ms`: `24` (change `0`; budget `26`);
- raw, unrounded maximum interval: `83.5 ms` (budget `100 ms`);
- final runs, as median/p95/long-frame-count/maximum in milliseconds:
  `16.8/83.2/23/83.5`, `16.8/83.3/24/83.40000000000873`, and
  `33.2/83.2/24/83.40000000000146`;
- production JS: `/assets/index-CrXhUFN4.js`;
- the fixture asserted both narrative-known anchors, one active system, 119 rendered
  systems, 144 rendered components, and all four recorded hashes;
- renderer, browser, Node, CPU, host, and platform matched baseline;
- the absolute `100 ms` ceiling was enforced against raw intervals.

Historical post-clamp `0.55` plus `1.25` known-star core/halo-scale automated
evidence, superseded by ADR-0018:

- median of run medians: `16.8 ms` (`0%` regression; budget `19.32 ms`);
- median of run p95 values: `83.2 ms` (`0%` regression; budget `95.68 ms`);
- median intervals above `50 ms`: `24` (change `0`; budget `26`);
- raw, unrounded maximum interval: `83.5 ms` (budget `100 ms`);
- final runs, as median/p95/long-frame-count/maximum in milliseconds:
  `16.75/83.2/23/83.5`, `16.8/83.2/24/83.5`, and
  `16.8/66.7/24/83.40000000000873`;
- production JS: `/assets/index-OyZALixg.js`;
- the fixture asserted both narrative-known anchors, one active system, 119 rendered
  systems, 144 rendered components, and all four recorded hashes;
- renderer, browser, Node, CPU, host, and platform matched baseline;
- the absolute `100 ms` ceiling was enforced against raw intervals.

The first isolated ADR-0018 benchmark completed but failed the median authority at
`33.2 ms` against the unchanged `19.32 ms` budget. No external process explained the
result. One unchanged idle-host confirmation passed, but independent review correctly
rejected selecting that pass because the conflicting valid invocations demonstrated
instability. A transparent-corner early-discard experiment also failed the median
gate and was not retained. A subsequent polynomial-halo experiment failed the camera
settlement prerequisite before metrics and was not retained. The Captain then
selected the explicit ADR-0019 software-renderer policy: a `33.4 ms` median ceiling
and `4 s` settlement deadline, with p95, long-frame, and `100 ms` hard limits
unchanged. Two repeated page-context failures then exposed a harness lifecycle defect:
the fixture navigation occurred inside each measured run and the browser-side settle
function did not receive its timeout argument explicitly. The fixture now loads once
per invocation, no navigation occurs during runs, and the timeout crosses the
Node/browser boundary explicitly. Independent review then found that each run still
captured its own reset reference. The harness now captures one reset pose after the
single fixture load and asserts every run, warm-up, and measured sweep against that
shared reference. Two fresh consecutive completed invocations under that policy and
shared-pose authority passed.

Accepted final ADR-0018 `0.25` context plus `2×` known-footprint automated evidence:

- median of run medians: `16.8 ms` (budget `33.4 ms`);
- median of run p95 values: `66.7 ms` (`19.8%` improvement; budget `95.68 ms`);
- median intervals above `50 ms`: `24` (change `0`; budget `26`);
- raw, unrounded maximum interval: `83.5 ms` (budget `100 ms`);
- final runs, as median/p95/long-frame-count/maximum in milliseconds:
  `16.8/66.7/24/83.5`, `16.8/66.7/23/83.40000000002328`, and
  `16.7/83.2/24/83.5`;
- production JS: `/assets/index-BdVN0B4y.js`;
- the fixture asserted both narrative-known anchors, one active system, 119 rendered
  systems, 144 rendered components, and all four recorded hashes;
- renderer, browser, Node, CPU, host, and platform matched baseline;
- the absolute `100 ms` ceiling was enforced against raw intervals;
- the immediately preceding completed invocation on the identical bundle also passed,
  with aggregate median/p95/long-frame-count/raw maximum
  `16.7/66.7/24/83.5 ms`.

The Captain's final visual review found that hover rendered both the plain map caption
and the tooltip for one system. The implementation now owns hover state once in the
scene, suppresses the hovered system's plain map caption while keeping its
collision-priority slot reserved, and restores the caption when hover ends. The
tooltip remains the sole hover name surface; coordinates, picking, selection, active
markers, and caption collision placement are unchanged.

Validation evidence:

- `npm run validate`: passed; 73 Python tests and 163 Vitest tests passed;
- `npm run test:e2e`: passed; 48 Chromium, Firefox, and WebKit tests passed;
- `npm run performance`: passed; unselected median/maximum `51/54.6 ms`,
  selected-object-replacement median/maximum `50.3/53.9 ms`;
- `npm run performance:map`: passed twice consecutively against
  `/assets/index-BdVN0B4y.js` with the
  final ADR-0018 evidence above;
- `python3 scripts/tasks.py check`: passed for 36 task files;
- `git diff --check`: passed before independent implementation review.

## Risks and cautions

- Diffraction rays and identity-seeded variation are presentation devices, not
  physical observations. Keep them bounded and never expose them as catalogue facts.
- Analytic core/halo/ray work and ADR-0018's doubled known-star planes can increase
  fragment cost even without adding draw calls. Keep halos and rays bounded inside
  their applicable plane; enforce the production map-interaction budget and inspect
  dense/multi-component views on real GPU hardware.
- Additive blending can wash stellar colours toward white or apply intensity twice.
  Preserve one tested alpha/intensity path and calibrate cores separately from halos.
- Narrative emphasis can accidentally overwhelm physical presentation differences.
  Keep the selected hierarchy explicit and verify astronomy-only bright stars remain
  visible and visually credible.
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

- None. BOB-030 supplied the reviewed astronomy bootstrap, pinned per-anchor source
  coverage, regenerated catalogue, and passing validation for Chapter 1.12 anchor
  `stellar-system-005582`.
- The exact validated Chapter 1.14-reproduced narrative-known, active-system,
  rendered-system, and rendered-component fixture identities/counts required by the
  performance authority are recorded above. Chapter 1.14 is a fixed fixture selector,
  not a moving dependency on the latest authored chapter.

No visual decision remains unresolved. Any material deviation from the visual
decisions above requires Captain review before implementation continues.
