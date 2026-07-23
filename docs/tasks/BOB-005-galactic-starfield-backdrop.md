# BOB-005: Galactic starfield backdrop

Status: Ready
Phase: 1B (map enhancement)
Last updated: 2026-07-23

## Objective

Give the nearby-star map a permanent, restrained, Milky-Way-like distant background
that strengthens the established dark/cyan atmosphere without compromising the
astronomy map's coordinate truth, legibility, interaction, or static deployment.

The reader sees the real full-sky star field turn with the map. The Galactic centre
appears in the same direction as the map's `+Xg` axis, and Galactic north is `+Zg`.

## Binding references

- `../design/README.md` and its reference concepts (atmosphere and composition only)
- `../technical-design.md`, especially Sections 5, 7, 8.3, 8.4, and 9
- `../implementation-plan.md`, especially the Phase 1B geometry and performance
  constraints
- `../visual-testing.md`
- `BOB-001-nearby-star-map.md` and `BOB-003-visual-system-and-application-shell.md`
  (completed baseline behaviour)
- `../../AGENTS.md`

## Decisions

- Use only the NASA/Goddard Space Flight Center Scientific Visualization Studio
  **Deep Star Maps 2020** Galactic-coordinate Milky Way background. Do not add the
  colourful Spitzer GLIMPSE360 infrared-plane overlay.
- Use the exact `milkyway_2020_4k_gal.exr` Deep Star Maps 2020 background variant
  from <https://svs.gsfc.nasa.gov/4851/>. It omits the bright foreground Hipparcos and
  Tycho stars. The nearby-system map markers remain the only selectable and prominent
  stellar objects in the scene.
- Derive and commit one local, browser-compatible, optimized texture from the source;
  the browser must never fetch the source or an image from a third-party host at
  runtime. Preserve the source asset, conversion command/tool version, source URL,
  source checksum, dimensions, colour treatment, and output dimensions in a concise
  provenance record committed with the texture. At acquisition, record that the
  source page does not identify this asset as copyright-protected third-party material;
  stop and obtain rights-holder permission if that status changes.
- The backdrop is always on. There is no visibility setting, opacity control, quality
  selector, or alternate art direction in this task.
- Render the backdrop on an inward-facing, non-raycastable celestial dome. It follows
  the camera's position only, so it has no observable parallax or clipping during
  rotate, pan, zoom, focus, and reset. Its orientation remains fixed in the canonical
  Galactic frame; it must not inherit camera rotation.
- The texture is an equirectangular Galactic-coordinate map: its midpoint is Galactic
  longitude and latitude `(l, b) = (0°, 0°)`, and longitude increases to the image's
  left. Align it to the existing render mapping:

  ~~~text
  scene.x =  Xg
  scene.y =  Zg
  scene.z = -Yg
  ~~~

  Therefore the Galactic centre maps to `+scene.x`, Galactic north to `+scene.y`, and
  `l = 90°`, `b = 0°` to `-scene.z`. Account explicitly for the source image's
  left-increasing longitude; do not correct alignment by visual approximation.
- The backdrop is decorative only. It cannot change canonical coordinates, render
  positions, unit conversion, measurements, labels, camera-focus targets, scale,
  selection, hover behavior, or the visible Galactic plane/orientation aids.
- Preserve the quiet black, blue-grey, and restrained cyan visual system accepted in
  BOB-003. Calibrate the backdrop below the opacity/brightness at which labels,
  selected-system frames, orientation references, and warm stellar markers lose
  clarity. Do not recolour the source into a magenta/purple nebula treatment.
- Display this concise, visible UI credit in the existing astronomy/source-notice
  area: `Astronomy backdrop: NASA/Goddard Space Flight Center Scientific
  Visualization Studio, Deep Star Maps 2020; Gaia DR2: ESA/Gaia/DPAC.` It must link
  to the source page without causing a runtime asset fetch.
- Add a repository documentation record at
  `docs/data/galactic-starfield-backdrop.md`. It must give the source title, exact
  source asset and URL, retrieval date, checksum, conversion information, output
  asset, UI credit, NASA media-usage-guidelines URL, and a factual non-endorsement
  statement. It must also reproduce the official Gaia DR2 acknowledgement in full:

  > This work has made use of data from the European Space Agency (ESA) mission Gaia
  > (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing and
  > Analysis Consortium (DPAC,
  > https://www.cosmos.esa.int/web/gaia/dpac/consortium). Funding for the DPAC has
  > been provided by national institutions, in particular the institutions
  > participating in the Gaia Multilateral Agreement.

  Link the official Gaia DR2 credit-and-citation instructions and include these
  requested citations:

  1. Gaia Collaboration, Prusti et al. (2016), *The Gaia mission*, *Astronomy &
     Astrophysics* 595, A1, <https://doi.org/10.1051/0004-6361/201629272>.
  2. Gaia Collaboration et al. (2018), *Gaia Data Release 2: Summary of the contents
     and survey properties*, *Astronomy & Astrophysics* 616, A1,
     <https://doi.org/10.1051/0004-6361/201833051>.

  Do not use NASA, ESA, or Gaia logos.

## In scope

- Source review, acquisition through an explicit operator action, deterministic local
  conversion/optimization, checksum, provenance record, and attribution for the
  selected Deep Star Maps 2020 Galactic background.
- A WebGL sky-dome/background implementation using the existing React Three Fiber and
  Three.js stack, with depth, render-order, colour-space, texture-wrap, and filtering
  choices appropriate to a quiet, seam-free distant field.
- A small, testable Galactic-sky orientation module or equivalent explicit mapping
  contract, including the source texture's longitude direction.
- Map-scene integration that keeps the backdrop behind every existing map element and
  makes it unavailable to raycasting/picking.
- Responsive and visual calibration across desktop, compact, and phone layouts;
  reduced-motion behavior must remain unchanged because the backdrop does not animate
  independently.
- Focused automated coverage for orientation, scene ownership, interaction safety,
  source/provenance contract, and the absence of third-party runtime asset requests.
- Directly affected source notices, README/visual-testing guidance, task index, and
  any build-asset documentation required to reproduce the committed texture.

## Out of scope

- Spitzer imagery, an infrared overlay, generated artwork, random procedural stars,
  animated twinkling, particles, nebula effects, constellations, planets, or a second
  sky asset.
- Changes to astronomy catalogue data, coordinate generation, canonical units,
  distance calculations, Galactic plane geometry, orientation aids, labels, marker
  classes, selection logic, focus behavior, UI layout, or reader-progress features.
- A user setting to show, hide, dim, replace, rotate, or otherwise configure the
  backdrop.
- Runtime APIs, remote asset delivery, analytics, new rendering engines, or new
  third-party runtime dependencies.
- Rewriting completed task records or their historical acceptance evidence.

## Acceptance criteria

1. The built application includes exactly one local derived Deep Star Maps 2020
   Galactic background texture and makes no runtime request to NASA, ESA, Gaia,
   Spitzer, or any other third-party image host.
2. The committed provenance record identifies the exact source asset, URL, retrieval
   date, checksum, source and output dimensions, conversion command/tool version,
   colour treatment, UI credit, and usage requirements. It records the source-page
   review confirming that the asset is not identified as third-party copyrighted
   material. Re-running the documented conversion on the same source recreates the
   committed output or records a deliberate tool-version deviation.
3. A pure, automated orientation test verifies the three cardinal mappings in the
   Decisions section, including the source texture's left-increasing longitude. A
   manual review verifies that the bright Galactic-centre feature lies in the `+Xg`
   direction at the documented reset orientation.
4. The backdrop is an equirectangular inward-facing dome or equivalent sky rendering
   that is centred on the camera position without inheriting its rotation. It has no
   visible seam, edge, parallax, clipping, or inversion through rotate, pan, zoom,
   focus, selection, and reset.
5. The background remains behind stars, labels, frames, orientation aids, scale, and
   DOM panels. It cannot produce a raycast hit, block selection, change hover targets,
   or modify camera focus, domain coordinates, or measurement/unit results.
6. No new user control, preference, localStorage field, feature flag, animation, or
   alternate backdrop is exposed. The backdrop is present in normal, compact, and
   phone map views and remains static when reduced motion is preferred.
7. At all supported layouts, accepted visual hierarchy remains intact: map stars,
   names, selection treatment, Galactic plane, orientation aids, scale, and error
   states remain readable. The background retains the concept's understated
   black/blue-grey/cyan mood and does not introduce an infrared magenta treatment.
8. The UI source notice exposes the prescribed visible credit and source-page link
   without logos or an implication of NASA, ESA, or Gaia endorsement. It remains
   readable and available to keyboard and screen-reader users at every responsive
   layout.
9. Automated tests cover texture/provenance loading, cardinal Galactic orientation,
   camera-following/non-rotating ownership, no backdrop raycasting, and preservation
   of existing selection, reset, and unit behavior. Playwright covers backdrop
   presence and map interaction at desktop, compact, and phone viewports without
   fragile pixel-perfect WebGL assertions.
10. `docs/data/galactic-starfield-backdrop.md` contains the complete credit and
    usage record specified in Decisions, including the full Gaia DR2 acknowledgement,
    required citations, source links, and non-endorsement statement. `README.md`,
    `visual-testing.md`, any asset-generation guidance, and `docs/tasks/README.md`
    accurately describe the local source, UI attribution, reproducible conversion, and
    manual visual checks.
11. Manual remote-browser review covers current Chrome, Firefox, Edge, and mobile
    Chrome. Any unavailable Safari review remains the existing recorded
    pre-publication gap.

## Validation commands

~~~bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run validate
git diff --check
~~~

For manual review, run `npm run dev`; inspect the backdrop at desktop, compact, and
phone widths, then orbit, pan, zoom, select, focus, reset, and use both display units.
Confirm the Galactic-centre direction against the documented reset orientation and
that labels, aids, and markers remain readable. Preserve normal Playwright failure
artifacts under `test-results/` and `playwright-report/`.

## Risks and cautions

- The visual source is a rendered astronomical map, not an authority for the nearby
  catalogue. Never derive, correct, or display system facts from the backdrop.
- Treat equirectangular UV orientation and Three.js sphere handedness as a tested
  astronomical contract. A visually attractive but mirrored or rotated sky is a
  defect.
- Do not use the earlier ESO panorama for this feature: its all-sky Aitoff projection
  is not appropriate for an accurately rotating celestial dome.
- Do not load the source EXR directly in the browser. Commit a reproducibly derived,
  appropriately sized browser texture and retain the source provenance necessary to
  regenerate it.
- NASA permits factual use of applicable imagery and asks to be acknowledged; its
  names, insignia, and logos are separately protected. Use text-only attribution,
  state no endorsement, and recheck the source page for a third-party copyright mark
  before committing the source asset.
- Gaia DR2 is open to use only with `ESA/Gaia/DPAC` credit. Preserve its complete
  acknowledgement and requested citations in project documentation even though the
  compact UI credit is necessarily shorter.
- Avoid blending the background into the stars strongly enough that readers mistake
  it for nearby-system markers or the Galactic plane aid.
