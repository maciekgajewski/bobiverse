# BOB-001: nearby stellar-system map

Status: Ready  
Phase: 1A  
Last updated: 2026-07-20

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
- Rotate, zoom, pan, focus, and selection interactions.
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

## Data requirements

- Preserve source ICRS values, units, epoch, identifiers, and uncertainty when the
  source supplies them.
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

The application foundation does not yet exist, so the implementation must establish
and document stable npm commands for at least:

- Formatting or formatting verification.
- Linting and TypeScript checking.
- Data generation or explicit source refresh.
- Generated-data/schema validation.
- Unit and component tests.
- Playwright tests.
- Production build.
- Development server.

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
- Pixel snapshots are not authoritative across GPU environments. Assert domain and UI
  state where possible.
- Do not expand into narrative data while solving visual or schema questions.
- Any need for runtime server state or a different coordinate frame requires an ADR.
