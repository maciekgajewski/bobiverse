# Bobiverse visual companion: technical design

Status: Approved baseline  
Last updated: 2026-07-24

## 1. Purpose

The product is a browser-based visual companion for readers of the Bobiverse books.
Its primary purpose is to help a reader understand the relative orientation and
distance of nearby stellar systems and, in later phases, connect that geography to
characters, travel, events, and reading progress without revealing future facts.

The initial delivery is an astronomy-only vertical slice containing the 20 nearest
stellar systems. It establishes the map interaction and data pipeline before
book-derived content is introduced. The same pipeline can later expand the map toward
100 systems.

## 2. Goals

- Display nearby stellar systems in an interactive, rotatable, zoomable 3D map.
- Preserve true relative orientation and linear interstellar distance.
- Make distance understandable through orientation aids, a persistent scale, and unit
  selection without distorting canonical geometry.
- Run as a static site with no application server or database.
- Produce astronomy data through a reproducible, offline import pipeline.
- Support later chapter timelines, character histories, travel paths, system
  chronicles, and Bob genealogy.
- Enforce a reader-position spoiler boundary consistently across all later tools.
- Provide first-class exploration, lookup, timeline navigation, and detail reading
  on phones and tablets through the same responsive React application as desktop.

## 3. Non-goals for the initial delivery

- User accounts, shared progress, server-side persistence, or collaboration.
- Book chapters, story events, characters, genealogy, or travel paths.
- Live astronomy API calls from the browser.
- Runtime LLM features.
- A detailed orbital simulator or physically sized stellar bodies.
- Pixel-identical 3D rendering across different GPUs and browsers.
- Public Internet deployment.

## 4. System context

```text
Astronomy catalogues                 Manually reviewed book data (later)
        |                                         |
        v                                         v
Python + Astropy importer                 JSON Schema validation
        |                                         |
        +----------> validated static JSON <------+
                              |
                              v
                 Vite static production build
                              |
                              v
           React UI + React Three Fiber map
                              |
                              v
               browser localStorage only
```

Build-time tooling may access pinned external datasets when an operator deliberately
runs an import. The built application must be self-contained and make no runtime
astronomy request.

## 5. Technology choices

### 5.1 Frontend

- TypeScript for application and domain code.
- React for panels, timeline, search, selection state, and later tools.
- Three.js through React Three Fiber for WebGL rendering.
- Vite for development and static production builds.
- Custom CSS with centralized design tokens and purpose-built components.
- npm with a committed lockfile and an explicitly documented Node.js version.

React Three Fiber keeps the 3D scene inside the same declarative state model as the
surrounding UI. A second UI framework or 3D engine would create unnecessary ownership
and synchronization boundaries.

### 5.2 Data tooling

- Python for catalogue ingestion and reproducible data generation.
- Astropy for coordinate frames, transformations, and units.
- JSON Schema Draft 2020-12 for astronomy and book-data validation.
- Generated static JSON for browser consumption.

The Python environment and source catalogue versions must be pinned when the importer
is implemented. Generated records must include provenance sufficient to reproduce or
audit each value.

### 5.3 Verification

- Unit tests for coordinate transforms, unit conversions, visibility rules, and other
  domain logic.
- Component tests for selection and coordinated UI state.
- Playwright for critical browser interactions and responsive behavior.
- Manual visual review in real remote-workstation browsers.

The exact test runner and component-testing library will be selected in the Phase 1
task implementation without weakening these required test layers.

## 6. Static deployment architecture

The application compiles to HTML, JavaScript, CSS, assets, and JSON. It requires no
backend. Local and eventual public deployment serve the same build output.

Reader progress and preferences are stored in the namespaced, versioned localStorage
record `bobiverse.app-state.v1`. A future incompatible shape uses a new versioned key
and an explicit migration or safe reset. Cookies are not used because there is no
server consumer and cookies would be sent unnecessarily with HTTP requests.

Opening the application directly with a `file:` URL is unsupported. Development and
local production use must serve the files over HTTP so modules, asset loading,
routing, and localStorage have consistent origins.

An eventual public release can use any static host with HTTPS. It must not embed model
credentials or other secrets. A backend is reconsidered only if a concrete future
requirement needs protected credentials, accounts, synchronized progress, or mutable
shared data.

## 7. Headless development environment

The development host has no local graphical desktop. Vite must use:

```text
bind address: 0.0.0.0
port:         5173
port policy:  strict; fail if occupied
network:      trusted LAN only
```

The corresponding npm development script will invoke behavior equivalent to:

```bash
vite --host 0.0.0.0 --port 5173 --strictPort
```

The port must be reachable only from the trusted LAN. Public routing or Internet
exposure is prohibited. If developers access the server by hostname, Vite must list
the exact permitted hostname; `allowedHosts: true` is prohibited because it weakens
DNS-rebinding protection.

Automated Playwright runs execute headlessly on the server and retain failure
screenshots, traces, and videos. Manual visual testing opens
`http://<development-host>:5173` on the remote workstation. Domain behavior must be
testable independently of WebGL output because canvas pixels may vary by browser,
GPU, driver, and software renderer.

## 8. Astronomy data

### 8.1 Sources

The primary nearby-star source is the Fifth Catalogue of Nearby Stars (CNS5), which
combines Gaia EDR3, Hipparcos, and ground-based measurements. Gaia and other curated
catalogues may supplement identifiers or fields when their provenance is retained.

References:

- [CNS5 paper](https://doi.org/10.1051/0004-6361/202244250)
- [CNS5 service](https://dc.zah.uni-heidelberg.de/cns5/q/cone/form)
- [Gaia DR3 documentation](https://gea.esac.esa.int/archive/documentation/GDR3/)
- [Astropy coordinates](https://docs.astropy.org/en/stable/coordinates/)

The nearest catalogue objects are not automatically the nearest stellar systems.
Multiple-star components must be grouped through a small, reviewed system-membership
layer. Phase 1 ranks the resulting systems by their adopted system distance and emits
one map record per system.

### 8.2 Provenance

Every generated system record must identify:

- Source catalogue and release or snapshot.
- Source object identifiers.
- Imported astrometric values and units.
- Adopted distance and uncertainty when available.
- Transformation version and generation timestamp.
- Reviewed component-to-system grouping.

Generated data is committed so builds remain deterministic and the browser remains
offline. Refreshing a source is an explicit reviewed change, not an automatic build
side effect.

### 8.3 Coordinate frame

Canonical positions use a Sun-centered Galactic Cartesian frame in parsecs:

- `Xg`: toward Galactic longitude 0 degrees and latitude 0 degrees, approximately
  toward the Galactic center.
- `Yg`: toward Galactic longitude 90 degrees and latitude 0 degrees.
- `Zg`: toward Galactic north.

Source ICRS right ascension, declination, distance, reference epoch, and identifiers
remain alongside derived coordinates for auditability. Astropy performs the frame
conversion; application code must not duplicate astronomy transformation formulae.

Three.js uses a Y-up scene. The explicit right-handed render mapping is:

```text
scene.x =  Xg
scene.y =  Zg
scene.z = -Yg
```

This mapping places Galactic north upward without changing handedness. It must be
tested with known axis fixtures. Domain calculations operate on `Xg/Yg/Zg`, not the
scene mapping.

### 8.4 Units and scale

Parsecs are canonical storage units. The UI displays light-years by default and
offers a parsec toggle. Unit conversion occurs only at presentation boundaries.

System positions use a single linear scene scale. Camera projection can affect visual
perspective, but no logarithmic or piecewise distance compression is permitted.
Marker glyphs may have a minimum screen-readable size and use a non-linear visual
scale derived from reviewed stellar physical size. They are not literal stellar
diameters; this presentation exception must not affect positions or measurements.

Phase 1 markers are camera-facing shader sprites with a luminous core and soft radial
halo. Reviewed stellar class selects the base color. A multi-star system remains one
canonical map node, but renders its component stars as a small deterministic,
decorative cluster around that node. Its radial decorative offset is bounded to
0.036–0.0576 map units and its vertical offset to 0.0216 map units. Those offsets are
not component positions or orbital data, and must never be used for labels, camera
focus, or measurement.

The Phase 1 color mapping follows the conventional spectral sequence: O/B blue, A
blue-white, F white, G yellow, K orange, M red, and white dwarfs cool-white. It is a
visual classification aid, not a calibrated temperature display. Late L/T/Y
substellar classes share the red end of that palette rather than using a neutral
fallback color.

Marker scale uses a square-root transform of reviewed physical radius with explicit
minimum and maximum readability bounds. The transform makes visual variation legible
without representing literal stellar diameter or altering map geometry.
Those map-space bounds are calibrated once against the pinned dataset, documented,
and remain fixed across source refreshes.

Star-sprite brightness smoothly attenuates from 100% at 6 map units to 35% at
45 map units as a presentation aid. This does not affect marker position,
physical-size encoding, labels, or measurement.

Selection frames do not participate in raycasting, but every star-marker glyph,
including the selected one, does. Canvas picking explicitly resolves the closest
marker hit to the camera; this preserves selected-star tooltips and re-selection while
ensuring an overlapping closer system is selected instead of the decorative frame.

Every rendered component must have a usable reviewed radius and MK spectral class.
Generation and validation fail on missing or invalid visual properties; the browser
does not substitute a neutral marker or silently omit the component.

Sol is represented by an explicit generated component with G2V class, one solar
radius, and solar-reference provenance. It uses the same marker pipeline as catalogue
components rather than a rendering exception.

### 8.5 Stellar-system model

One interstellar map node represents one stellar system. A system contains zero or
more component stars and, for selected detailed systems, zero or more planets. Basic
Phase 1 fields include:

- Stable system ID.
- Preferred display name and alternate designations.
- Canonical and render coordinates.
- Distance from Sol.
- Basic display properties supported by source data.
- Reviewed stellar class and physical size for each rendered component, with source
  provenance and units.
- Component references.
- Provenance.

Most systems intentionally have only basic data. Rich descriptions and planets are
added selectively when story relevance or product needs justify them.

Component visual properties are imported from a pinned, reviewed component-properties
snapshot and joined to CNS5 component records through documented stable identifiers.
Each component has property-level radius and MK spectral-class provenance. TIC and
SIMBAD are preferred inputs where they separately identify the component; where they
do not, the snapshot records a component-specific catalogue or literature source. The
generated browser data retains the joined provenance; no browser request may resolve
or refresh visual properties at runtime.

## 9. Phase 1 interaction design

The map must provide:

- Rotate, zoom, pan, smooth focus, and reset controls.
- Sol as a visible origin reference.
- A visible Galactic plane and labeled orientation references.
- A persistent scale indication.
- Selection of a system and a basic detail panel; no system is selected initially.
- Light-year and parsec display modes.
- Clear empty, loading, unsupported-WebGL, and error states.

Camera controls must not modify domain coordinates. A reset returns to a documented,
repeatable orientation so readers can regain spatial context. Selection and other
programmatic focus changes interpolate both camera position and controls target;
reduced-motion preference makes these nonessential transitions immediate. A selection
focus retains the reader's current viewing angle and zoom by translating the camera
and target together until the selected system's canonical coordinate is centered; it
does not automatically reframe around decorative component markers. Focus duration is
distance-aware, uses ease-in-out interpolation, and is bounded from 300 to 850 ms.
Any manual orbit, pan, or zoom input immediately cancels a focus transition. A new
selection immediately retargets an in-flight transition from its current interpolated
position to the newly selected system.

Clicking empty map space clears the current inspection selection. Selection uses a
non-obscuring corner frame and an adjacent name label; it must not recolor or cover
the component-marker sprites. Sol has the
only persistent, slightly offset marker label in Phase 1 and uses a normal selection
frame only when explicitly selected. Hovering a marker reveals a screen-size-stable
tooltip with its name and, when there is a selected system, the Euclidean canonical
separation from that system.

The Galactic plane is a faint orientation aid several times larger than the displayed
star field so it reads as effectively infinite. Its labels sit well beyond the star
field in smaller, lower-prominence type; the standalone `+Yg` marker is omitted.

## 10. Responsive and accessible behavior

Desktop provides the richest layout and may present the browser, map, details, and
timeline simultaneously. Mobile is a first-class interface for exploration, lookup,
timeline navigation, and reading details, but must not attempt to present all of
those surfaces at once. Layout composition changes by viewport: it selects an
appropriate focused arrangement of the same domain state and UI components rather
than creating a separate mobile application or a parallel feature stack. The
application shell uses a map-first phone composition: the browser opens from a command
bar control and a selected item's inspector opens as a non-animated bottom panel.

Phase 1 is desktop-first and targets current Chrome, Firefox, Safari, and Edge.
Automated browser projects cover the Chromium, Firefox, and WebKit engines; manual
acceptance covers the corresponding real browsers on available remote workstations.
Any real-browser coverage unavailable in the development environment must be recorded
as an explicit acceptance gap rather than silently treated as tested. Mouse and
trackpad interaction on a larger display provide the primary experience.

Phones and tablets must still provide a usable responsive layout. At minimum, system
selection and details must not depend exclusively on precise 3D picking. Controls need
accessible labels, visible keyboard focus, sufficient contrast, 44-by-44 CSS-pixel
phone targets, and non-color-only state cues. Reduced-motion preferences must disable
nonessential camera animation. UI and display typography are bundled open-licensed
Noto Sans resources with Latin Extended, Greek, and Cyrillic coverage; no runtime font
service or browser fallback is the localization strategy for those scripts.

The application must expose selected system facts through ordinary DOM content so
screen readers and automated tests are not forced to interpret the canvas.

## 11. Visual language

The visual direction is an original strategic-space interface: dark layered space,
restrained luminous accents, readable overlays, depth, and clear selection states.
“Stellaris-like” describes mood and information density only. Third-party game assets,
layouts, character likenesses, fonts, audio, and copied visual treatments are outside
the design.

Assistant characters are deferred. Any public implementation must use original
visual designs rather than an Admiral Ackbar or John Cleese likeness.

## 12. Narrative data and spoiler model

Narrative features begin only after the astronomy vertical slice is accepted.
Canonical authoring uses JSON validated by JSON Schema Draft 2020-12, without
source-level schema-version fields or a compatibility contract. One generalized
zero-state source is the atomic, reader-visible entity registry before any book chapter
is selected: it contains the nested Solar-System location tree and any pre-book
characters, species, or events. Chapter records then introduce book-specific entities
and record ordered visible patches, appearances, and events. The stable entity registry
and every selected-chapter state are deterministic generated projections, never
manually edited snapshots. ADR-0001 establishes chapter-authored patches; ADR-0003
supersedes its sole-source boundary with the zero state; ADR-0004 establishes the
unversioned narrative schema contract; ADR-0005 refines the chapter, location, and
date-projection contracts; and ADR-0006 generalizes the zero-state record.

Spoiler safety has two independent dimensions:

1. Reading order determines which claims the reader is permitted to know.
2. Story time determines the in-universe moment represented by the selected chapter.

`furthestChapterRead` is a guarded reader-progress ceiling. `viewChapter` selects a
chapter at or before that ceiling. Both are absent before the reader selects a chapter,
when the zero state is rendered. Reader order first decides which facts the
reader may know; story time then decides which of those facts form the represented
world state at `viewChapter.date`. A future story-state change must not alter an
earlier in-universe view merely because its chapter was read first. Conversely, a fact
first revealed later must not alter an earlier reader-knowledge view, even if it was
already true in-universe. ADR-0002, as refined by ADR-0005, defines this two-stage
projection and its temporal validation rules.

A future date-exploration component may use an arbitrary requested story date for the
second stage, rather than `viewChapter.date`. It must retain the first stage's
reader-visible chapter set: no later chapter becomes available merely because its
story date precedes the requested date. The result is explicitly the state inferred
from selected reader knowledge at that date, not a claim about unrevealed in-universe
facts.

All later views—map, search, characters, systems, paths, chronicles, and genealogy—use
one shared visibility policy. A UI component may not implement an independent spoiler
filter.

Locations form a one-parent tree: every non-root location has exactly one parent and
child lists are generated. This supports systems, planets, moons, locales, and
megastructures without fixing a shallow hierarchy. The zero-state `locations` branch
uses nested JSON to seed this tree and its stable local child order; later chapter
records use `parent_location_id` to add locations beneath existing parents. The
generator flattens the zero-state location authoring tree before deriving runtime child
lists. Its fixed root is the mapped `location:solar-system`, with one `location:sol`
star child.
Zero-state and chapter locations share one closed kind vocabulary and explicit parent
relations. Nested zero-state locations declare whether they are members of the system,
orbit their parent, or are located on it; only the authored order of orbital siblings
asserts inner-to-outer order. Leaves omit `children`, and a planet has at most four
curated moon children. Chapter locations author the same relation directly, with
additional containment support for locales and megastructures. Transit locations are
explicitly unmapped roots with origin and destination references. Unknown or ambiguous
book locations remain valid only when explicitly unmapped; they may appear in timelines
and lists but not at invented map coordinates.

Astronomy remains authoritative for stellar and interstellar physical positions,
components, sizes, colours, and measured render facts. The zero-state source owns the
known Solar-System location topology and its pre-book character, species, and event
registry; its locations use a deliberately non-metric local render order and must not
contain coordinates, radii, distances, colours, or other measured astronomy facts. A
mapped narrative star system may reference an astronomy node; mapped
parent-child locations must agree with astronomy ancestry. Only mapped narrative star
systems carry that direct reference; descendants inherit the system context. The visual
layer receives a generated join of stellar astronomy data, the zero-state registry,
and selected narrative patches. Images are manually curated assets, while an entity's
`picture_id` assignment is zero-state or chapter-controlled narrative state and remains
subject to the shared visibility policy. The zero-state source contains no asset files;
any zero-state `description` or `state` value is original plain text, not measured
astronomy data or rich text.
The direct, unversioned asset registry maps each stable asset ID to one safe static path
below `public/assets/` and a plain-text provenance note; its metadata is not chapter
chronology, while `picture_id` assignments remain subject to the shared visibility
policy.

## 13. LLM-assisted extraction

The first representative chapters are encoded and reviewed manually. Only after the
schema and visibility semantics are proven may an offline developer tool assist with
extraction.

The later extraction workflow is:

1. Accept one lawfully obtained chapter outside the repository.
2. Produce schema-constrained candidate facts with evidence references and
   confidence.
3. Resolve names and aliases against canonical entities.
4. Validate schema, references, chronology, and spoiler metadata.
5. Present a human-reviewable diff.
6. Commit only approved structured facts and original summaries.

The tool is provider-independent at the architecture boundary. It is not part of the
published application, cannot publish source book text, and cannot commit credentials.
No extraction result is authoritative without human approval.

## 14. Security, privacy, and publication

- The local development server is trusted-LAN only.
- The static application contains no credentials or personal data.
- The initial product uses no analytics, accounts, cookies, or server storage.
- External links and dependencies must be reviewed; runtime catalogue calls are
  prohibited.
- Astronomy sources must receive their required attribution.
- A public fan-project release needs an intellectual-property review. Structured
  facts and original commentary must not become a substitute for the books.
- Original assistant artwork is required for publication.

Static hosts such as GitHub Pages are technically sufficient for the expected assets
and data. Hosting selection is intentionally deferred until publication work begins.

## 15. Architectural decision process

This document integrates the ratified baseline decisions. A future change that alters
an invariant, dependency boundary, data authority, coordinate frame, spoiler model, or
deployment model requires an ADR under `docs/adrs/` before implementation. Small
implementation details that remain within this design do not require ADRs.
