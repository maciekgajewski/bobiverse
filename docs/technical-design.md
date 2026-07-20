# Bobiverse visual companion: technical design

Status: Approved baseline  
Last updated: 2026-07-20

## 1. Purpose

The product is a browser-based visual companion for readers of the Bobiverse books.
Its primary purpose is to help a reader understand the relative orientation and
distance of nearby stellar systems and, in later phases, connect that geography to
characters, travel, events, and reading progress without revealing future facts.

The initial delivery is an astronomy-only vertical slice containing the 20 nearest
stellar systems. It establishes the complete map interaction and data pipeline before
book-derived content is introduced. The same pipeline can later expand the map toward
100 systems.

## 2. Goals

- Display nearby stellar systems in an interactive, rotatable, zoomable 3D map.
- Preserve true relative orientation and linear interstellar distance.
- Make distance understandable through orientation aids, a persistent scale, unit
  selection, and an explicit two-system measurement tool.
- Run as a static site with no application server or database.
- Produce astronomy data through a reproducible, offline import pipeline.
- Support later chapter timelines, character histories, travel paths, system
  chronicles, and Bob genealogy.
- Enforce a reader-position spoiler boundary consistently across all later tools.
- Remain usable from current desktop browsers, with a responsive reduced layout for
  phones and tablets.

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
- Versioned JSON Schema for astronomy and book-data validation.
- Generated static JSON for browser consumption.

The Python environment and source catalogue versions must be pinned when the importer
is implemented. Generated records must include provenance sufficient to reproduce or
audit each value.

### 5.3 Verification

- Unit tests for coordinate transforms, unit conversions, measurements, visibility
  rules, and other domain logic.
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
Marker glyphs may have a minimum screen-readable size and are therefore not literal
stellar diameters; this presentation exception must not affect positions or
measurements.

### 8.5 Stellar-system model

One interstellar map node represents one stellar system. A system contains zero or
more component stars and, for selected detailed systems, zero or more planets. Basic
Phase 1 fields include:

- Stable system ID.
- Preferred display name and alternate designations.
- Canonical and render coordinates.
- Distance from Sol.
- Basic display properties supported by source data.
- Component references.
- Provenance.

Most systems intentionally have only basic data. Rich descriptions and planets are
added selectively when story relevance or product needs justify them.

## 9. Phase 1 interaction design

The map must provide:

- Rotate, zoom, pan, focus, and reset controls.
- Sol as a visible origin reference.
- A visible Galactic plane and labeled orientation references.
- A persistent scale indication.
- Selection of a system and a basic detail panel.
- Light-year and parsec display modes.
- A two-system measurement mode.
- Clear empty, loading, unsupported-WebGL, and error states.

Measurement is a domain operation: select endpoints A and B, compute Euclidean 3D
separation from canonical Galactic coordinates, and format the result in the active
display unit. The UI distinguishes straight-line separation from any later route or
travel-path length.

Camera controls must not modify domain coordinates. A reset returns to a documented,
repeatable orientation so readers can regain spatial context.

## 10. Responsive and accessible behavior

Phase 1 is desktop-first and targets current Chrome, Firefox, Safari, and Edge.
Automated browser projects cover the Chromium, Firefox, and WebKit engines; manual
acceptance covers the corresponding real browsers on available remote workstations.
Any real-browser coverage unavailable in the development environment must be recorded
as an explicit acceptance gap rather than silently treated as tested. Mouse and
trackpad interaction on a larger display provide the primary experience.

Phones and tablets must still provide a usable responsive layout. At minimum, system
selection and details must not depend exclusively on precise 3D picking. Controls need
accessible labels, visible keyboard focus, sufficient contrast, and non-color-only
state cues. Reduced-motion preferences must disable nonessential camera animation.

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
Canonical authoring uses JSON validated by versioned JSON Schema. Chapter files
reference stable IDs; they do not duplicate canonical character or location records.

Spoiler safety has two independent dimensions:

1. Reading order determines which claims the reader is permitted to know.
2. Story time determines the in-universe moment represented by the selected chapter.

Selecting a chapter therefore creates a reader-knowledge view of the universe at that
chapter's story date. A fact first revealed later must not alter an earlier view, even
if the fact was already true in-universe. Spoiler-sensitive attributes must be modeled
as revealed claims or state transitions rather than mutable timeless fields.

All later views—map, search, characters, systems, paths, chronicles, and genealogy—use
one shared visibility policy. A UI component may not implement an independent spoiler
filter.

Unknown or ambiguous book locations remain valid narrative entities with an explicit
unmapped state. They may appear in timelines and lists but not at invented map
coordinates.

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
