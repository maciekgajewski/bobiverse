# BOB-001: nearby stellar-system map

Status: Done
Phase: 1A  
Last updated: 2026-07-22

## Objective

Deliver an astronomy-only static web application that lets a reader explore the 20
nearest stellar systems, understand their true relative orientation and distances,
inspect basic system information, and measure straight-line separation between any
two displayed systems.

## Binding references

- `../technical-design.md`
- `../implementation-plan.md`, Phase 1A
- `../../AGENTS.md`
- Accepted ADRs created before or during implementation

## User-visible outcome

From a remote workstation on the trusted LAN, the user opens the development host in
a supported browser and sees an original, polished 3D map centered on Sol. The user
can navigate, select systems, regain orientation, switch distance units, and measure
the physical separation between two systems.

## In scope

- React, TypeScript, React Three Fiber, Three.js, and Vite application foundation.
- npm lockfile and explicit Node.js version documentation.
- Custom CSS tokens and a desktop-first responsive shell.
- Vite development access on `0.0.0.0:5173` with strict-port behavior.
- Pinned Python/Astropy astronomy import environment.
- Explicit, reproducible acquisition and transformation of a pinned CNS5 source.
- Reviewed grouping of catalogue components into the 20 nearest stellar systems.
- Generated, validated, deterministic static JSON with provenance.
- True-scale Galactic Cartesian rendering with Sol at the origin.
- Galactic plane, orientation labels, scale indication, and repeatable camera reset.
- Rotate, zoom, pan, smooth focus, and selection interactions.
- Reviewed stellar visual metadata: component stellar class and physical size, with
  source provenance.
- Camera-facing shader-sprite markers with fuzzy glowing cores and halos. Multi-star
  systems render their components as a small deterministic decorative cluster around
  the one canonical system position.
- DOM-based basic system details and alternate designations.
- Light-years by default and a parsec toggle.
- Two-system straight-line measurement.
- Unsupported-WebGL, loading, empty, and data-error states.
- Automated domain, UI-state, and browser interaction tests.
- Remote real-browser visual acceptance and responsive review.
- Developer, data-refresh, validation, and visual-testing documentation.

## Out of scope

- More than 20 stellar systems.
- Book, chapter, event, character, travel, genealogy, or spoiler data.
- Planets except when needed as a minimal schema demonstration; no planet UI is
  required.
- Search beyond what selection accessibility strictly requires.
- Runtime astronomy queries.
- Backend services, accounts, cookies, analytics, or synchronized state.
- Runtime LLM features or book-text processing.
- Public deployment.
- Assistant characters.

## Functional requirements

1. The map contains Sol and the 20 nearest reviewed stellar systems from the pinned
   source snapshot.
2. One marker represents one stellar system; close stellar components do not become
   overlapping interstellar markers.
3. All system positions share one linear scale in the approved Sun-centered Galactic
   coordinate frame.
4. The visible Galactic plane and direction labels make the fixed frame recoverable.
5. Reset returns to a documented default camera position and orientation.
6. Selecting a system visibly identifies it and exposes its basic details through
   ordinary DOM content.
7. The active distance unit is light-years on first use and can be toggled to parsecs.
8. Measurement mode accepts two system endpoints, visibly distinguishes them, and
   displays their Euclidean 3D separation in the active unit.
9. Measurement remains correct after camera movement, focus changes, and unit toggles.
10. The application performs no runtime network request for catalogue data.
11. A responsive layout retains system selection and details on a phone-sized
    viewport, even if desktop remains the preferred 3D experience.
12. Reduced-motion preference removes nonessential animated camera transitions.
13. Selecting a system moves the camera smoothly to its focus framing; reduced-motion
    preference makes that transition immediate.
14. Each component marker uses its reviewed stellar class for color and its physical
    size for non-linear visual scale. These marker choices and decorative component
    offsets must not affect canonical coordinates or measurements.
15. Focus moves retain the current camera viewing angle and zoom: translate the
    camera and focus target together so the selected system's canonical position is
    centered, without automatic zooming.
16. Focus-transition duration is distance-aware and bounded from 300 to 850 ms with
    ease-in-out interpolation.
17. Marker base colors follow conventional stellar spectral classes: O/B blue, A
    blue-white, F white, G yellow, K orange, M red, and white dwarfs cool-white.
18. Marker scale uses a square-root transform of reviewed physical radius with
    documented readability bounds; it is not a literal diameter scale.
19. Generated data and validation fail if any rendered component lacks a usable reviewed
    radius or SIMBAD spectral class; the map must not silently invent or omit a
    component visual encoding.
20. Any manual orbit, pan, or zoom input immediately cancels an in-progress automatic
    focus transition.
21. A new selection during a focus transition immediately retargets the animation
    from its current interpolated position to the latest selected system.
22. The square-root marker-scale transform uses fixed, documented map-space minimum
    and maximum glyph radii, calibrated once against the pinned dataset and stable
    across future source refreshes.
23. Sol has an explicit generated component with G2V class, one solar radius, and
    solar-reference provenance so it uses the same marker pipeline as catalogue stars.
24. No system is selected initially. Clicking empty map space clears only the current
    inspection selection and preserves any measurement endpoints.
25. The selection treatment is a non-obscuring corner frame around the selected system
    with its name positioned to the frame's right, rather than a marker-covering ring.
26. Sol alone has a persistent, slightly offset map label. It uses a normal selection
    frame only after explicit selection. Other labels appear only for selection or
    measurement state.
27. Hovering a marker shows a screen-size-stable tooltip with its name and, when a
    system is selected, canonical straight-line separation from that selected system.
28. The Galactic plane is substantially larger than the displayed star field and
    faint enough to read as an effectively infinite orientation aid. Axis labels are
    distant, smaller, and lower prominence; no standalone `+Yg` marker is shown.
29. The Clear endpoints action uses the same first-class button treatment and sizing
    as the other measurement controls.
30. The persistent Sol name is plain, slightly offset text with no label box or frame.
31. Star-sprite brightness attenuates from 100% at or nearer than 6 map units to
    35% at or beyond 45 map units, without changing marker geometry, labels, or
    measurement.
32. Selection decoration must not capture pointer hits. Every star marker, including
    the selected one, remains hoverable and selectable. When glyphs overlap,
    selecting from the canvas chooses the closest one to the camera.

## Data requirements

- Preserve source ICRS values, units, epoch, identifiers, and uncertainty when the
  source supplies them.
- Preserve reviewed stellar-class and physical-size values for each rendered
  component, including their source provenance and units.
- Acquire visual properties from a pinned, reviewed component-properties snapshot.
  Each CNS5 component receives its own radius, MK spectral class, stable join evidence,
  and property-level provenance. TIC and SIMBAD are preferred inputs where they
  identify that component, with component-specific catalogue or literature values for
  cases they cannot represent separately.
- Store derived Galactic `Xg/Yg/Zg` coordinates canonically in parsecs.
- Emit the explicit Three.js render mapping specified by the technical design without
  using scene coordinates as domain truth.
- Document the pinned catalogue release or snapshot and required acknowledgement.
- Commit generated runtime JSON, its schema version, and enough metadata to audit its
  generation.
- Make source refresh an explicit command. Ordinary application builds must neither
  download nor silently regenerate catalogue data.
- Fail validation for duplicate IDs, missing required provenance, non-finite
  coordinates, invalid component references, or unexpected schema versions.

## Acceptance criteria

- A clean checkout can install dependencies and build the static application using
  documented commands.
- The documented development command binds exactly to `0.0.0.0:5173` and fails if
  that port is unavailable.
- The generated dataset contains exactly 20 non-Sol system markers plus Sol and passes
  schema and referential validation.
- Known-axis fixtures verify the canonical-to-scene mapping and handedness.
- Known system fixtures verify catalogue transformation and unit conversion.
- Displayed measurements agree with separations calculated from canonical coordinates
  to within `0.01 ly` after rounding.
- Unit, component/state, and Playwright suites pass on the headless server.
- Playwright retains screenshot, trace, and video artifacts for failures.
- Automated Playwright projects pass using Chromium, Firefox, and WebKit engines.
- Manual review passes in current Chrome, Firefox, Safari, and Edge on available
  remote workstations. Any browser that cannot be exercised in the available
  environment is recorded as an explicit Phase 1 acceptance gap and remains required
  before publication.
- The main selection and measurement flows remain usable at a representative
  phone-sized viewport.
- The production bundle contains no credentials, source book text, or runtime
  catalogue endpoints.
- The Captain accepts the visual result and spatial legibility.

## Validation commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run data:refresh              # explicit networked source refresh only
npm run data:generate
npm run data:validate
npm run test
npm run test:e2e
npm run build
npm run dev
npm run validate
```

`npm run validate` runs formatting, lint, TypeScript, generated-data validation,
unit/component tests, and production build. Browser binaries are installed separately
with `npx playwright install --with-deps chromium firefox webkit`; failure artifacts
are retained under `test-results/`.

The task must update this section with the exact commands before its status can become
`Done`. CI is not required in this task; all validation must run locally on the
headless development server.

## Manual verification

- Open `http://<development-host>:5173` from the trusted-LAN workstation.
- Confirm spatial navigation is smooth and the default view communicates depth.
- Confirm labels, orientation aids, and scale remain legible at useful zoom levels.
- Select several systems and compare displayed distances with generated source data.
- Measure multiple pairs, move and reset the camera, and toggle units.
- Inspect responsive layout and reduced-motion behavior.
- Inspect the production build through a local static preview, not a `file:` URL.

## Risks and implementation cautions

- CNS5 describes objects; the reviewed grouping layer is essential to system-level
  ranking.
- Marker glyph size may be screen-relative for legibility, but position and
  measurement may not be altered.
- Decorative offsets for multi-star component markers are stable presentation-only
  values. Their radial extent is 0.036–0.0576 map units, with vertical extent capped
  at 0.0216 map units. They must not be represented as orbital data, used for focus
  framing, or used for measurement.
- Pixel snapshots are not authoritative across GPU environments. Assert domain and UI
  state where possible.
- Do not expand into narrative data while solving visual or schema questions.
- Any need for runtime server state or a different coordinate frame requires an ADR.

## Implementation and acceptance evidence

Automated evidence recorded on 2026-07-22:

- `npm run validate` passes formatting, linting, strict TypeScript, generated-data
  schema/referential validation, 26 unit/component tests, and the production build.
- `npm run test:e2e` passes responsive selection, unit-toggle, measurement, and
  empty-map deselection while preserving endpoints in Playwright Chromium, Firefox,
  and WebKit projects.
- The generated runtime dataset contains Sol and exactly 20 non-Sol reviewed system
  markers. The CNS5 input snapshot and reviewed component visual-properties snapshot
  are committed separately from browser data; validation confirms all 28 rendered
  components have sourced radius and spectral-class properties.

Manual acceptance recorded on 2026-07-22:

- Current Chrome, Firefox, and Edge passed manual and visual testing on Windows.
- Mobile Chrome remained functional. Its navigation is imperfect but accepted for
  this desktop-first phase and deferred from the current scope.
- Safari was unavailable because no Apple test workstation was available. This is an
  explicit acceptance gap and remains required before publication.
- The Captain accepted the spatial legibility and visual result.

All locally available BOB-001 acceptance criteria are complete. The Safari publication
gap does not block completion of the local Phase 1A vertical slice.
