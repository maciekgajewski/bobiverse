# Bobiverse visual companion: technical design

Status: Approved baseline  
Last updated: 2026-07-28

## 1. Purpose

The product is a browser-based visual companion for readers of the Bobiverse books.
Its primary purpose is to help a reader understand the relative orientation and
distance of nearby stellar systems and, in later phases, connect that geography to
characters, travel, events, and reading progress without revealing future facts.

The initial delivery is an astronomy-only vertical slice containing the 20 nearest
stellar systems. It establishes the map interaction and data pipeline before
book-derived content is introduced. Later expansion uses guaranteed configurable
neighbourhoods around mapped narrative stellar systems rather than an arbitrary fixed
system count.

## 2. Goals

- Display nearby stellar systems in an interactive, rotatable, zoomable 3D map.
- Preserve true relative orientation and linear interstellar distance.
- Make distance understandable through orientation aids, a persistent light-year
  scale, and consistent light-year formatting without distorting canonical geometry.
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

The current compatible extension stores optional `furthestChapterRead`, `viewChapter`,
and `displayDate`, plus mode, timeline zoom, and timeline pan. Malformed or stale values
safely reset to the pre-book zero state; a null `viewChapter` may intentionally select
the zero-state knowledge projection while retaining `furthestChapterRead`, and every
non-null view chapter is clamped to that confirmed ceiling before projection.

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

ADR-0011 and ADR-0012 assign complementary authority to GCNS, Gaia DR3, CNS5,
WDS, and the Kirkpatrick et al. 2024 full-sky 20-pc census:

- CNS5 controls recognizable local inclusion inside 25 pc and supplies the initial
  local component-to-system grouping.
- GCNS supplies source selection from 25 to 100 pc and the preferred Bayesian
  distance and heliocentric Galactic Cartesian coordinates for matched sources.
- Gaia DR3 left-joins optional astrophysical and observational enrichment by the
  shared EDR3/DR3 `source_id`.
- WDS supplements multiple-system membership, subject to deterministic
  reconciliation or explicit project review.
- The 20-pc census supplies identity, names, classification, temperature, and
  presentation enrichment for accepted matches inside its published Sun-centred
  boundary. It never controls inclusion, geometry, distance, or system membership.

Inside 25 pc the inclusion set is the union of CNS5 and GCNS, so a bright or multiple
CNS5 object is not lost merely because Gaia has no suitable source. Between 25 and
100 pc GCNS is the available census authority. A required context sphere that crosses
the 100 pc GCNS boundary fails validation rather than being presented as complete.
The binding acquisition contract is the one in
`docs/data/astronomy-pipeline.md`: GAVO TAP tables `gcns.main` and
`cns5update.main`, the explicitly projected Gaia DR3 tables, and the pinned precise
WDS catalogue plus its format file, and the exact VizieR `J/ApJS/271/55` Table 4,
notes, references, and ReadMe projections. The complete WDS input is committed in
deterministic compressed form so offline validation can repeat candidate selection;
builds do not choose alternate services or tables.

References:

- [GCNS publication](https://doi.org/10.1051/0004-6361/202039498)
- [Gaia DR3 documentation](https://gea.esac.esa.int/archive/documentation/GDR3/)
- [CNS5 publication](https://doi.org/10.1051/0004-6361/202244250)
- [Washington Double Star Catalog](https://www.astro.gsu.edu/wds/)
- [Kirkpatrick et al. 2024 20-pc census](https://doi.org/10.3847/1538-4365/ad24e2)
- [Astropy coordinates](https://docs.astropy.org/en/stable/coordinates/)

Catalogue sources are not automatically stellar systems. Stable application system
and component IDs are catalogue-independent. CNS5 grouping fields provide the first
local model, WDS supplies specialist multiplicity evidence, and the project-owned
review layer resolves ambiguous or conflicting membership. Positional proximity
alone never creates a physical-system identity. A committed append-only identity
registry preserves IDs across source refreshes. Every retained source graph becomes
an application component; absent accepted grouping evidence it becomes a singleton
system rather than disappearing. Registry IDs are opaque and monotonic, tombstoned
IDs are not reused, and merge or split churn requires review. Automatically retained
singletons derive a source-backed fallback display-name candidate and propose their
sole mapped component as the system position. The review layer accepts the complete
normalized candidate snapshot by checksum and records explicit overrides for
conflicts, landmarks, and ambiguous multiple systems; refresh cannot accept its own
candidate checksum implicitly.

The checked-in runtime implements ADR-0011 and ADR-0012 through pinned GCNS, CNS5,
Gaia DR3, WDS, and 20-pc-census inputs, a reviewed stable-identity layer, and
independently validated static generation. BOB-013 records the neighbourhood
implementation; BOB-026 records the census enrichment.

### 8.2 Provenance

Every generated system record must identify:

- Every contributing source catalogue and release or snapshot.
- Source-specific object identifiers and accepted cross-match reason, including the
  content-derived census key for every accepted 20-pc match.
- Imported astrometric values and units.
- Adopted distance and uncertainty when available.
- Transformation version and generation timestamp.
- Position and presentation precedence.
- Reviewed component-to-system grouping and conflict resolution.

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

Parsecs are canonical storage and calculation units. The UI displays interstellar
distances and Galactic coordinate components in light-years only; it offers no
display-unit selector. Parsec-to-light-year conversion occurs only at presentation
boundaries.

System positions use a single linear scene scale. Camera projection can affect visual
perspective, but no logarithmic or piecewise distance compression is permitted.
Marker glyphs may have a minimum screen-readable size and use a non-linear visual
scale. Ordinary stellar components use presentation radius `0.09` and intensity
`1.0`; accepted brown dwarfs use radius `0.05` and intensity `0.25`. These fixed
values are not physical radius or luminosity and never affect positions or
measurements. Visible glyph radius and pointer hit radius are independent; every
component retains a minimum `0.09` hit target.

Markers are camera-facing shader sprites with a luminous core and soft radial halo.
An accepted 20-pc brown-dwarf classification first selects its dedicated
`infrared-cool` or `infrared-warm` false-colour treatment. Other presentation follows
accepted Gaia DR3 temperature or classification, then Gaia `bp_rp`, then an accepted
CNS5/WDS spectral value, then the neutral family. A reviewed multi-component system remains one
canonical map node, but renders its components as a small deterministic, decorative
cluster around that node. Its radial decorative offset is bounded to
0.036–0.0576 map units and its vertical offset to 0.0216 map units. Those offsets are
not component positions or orbital data, and must never be used for labels, camera
focus, or measurement.

The colour mapping is a visual orientation aid, not a precision stellar model. The
runtime retains the selected source fact and derivation. The neutral fallback is
explicit and never removes a selected source or component.

Star-sprite brightness smoothly attenuates from 100% at 6 map units to 35% at
45 map units as a presentation aid. Per-component intensity multiplies final shader
alpha exactly once and does not also scale RGB under additive blending. Neither
attenuation affects marker position, labels, or measurement.

Selection frames do not participate in raycasting, but every star-marker glyph,
including the selected one, does. Canvas picking explicitly resolves the closest
marker hit to the camera; this preserves selected-star tooltips and re-selection while
ensuring an overlapping closer system is selected instead of the decorative frame.

Every rendered catalogue component retains every applicable GCNS/Gaia, CNS5, WDS,
and accepted 20-pc-census identifier plus the fact and provenance used for
presentation. Sol is an explicit generated origin using the same marker pipeline.

### 8.5 Stellar-system model

One interstellar map node represents one stellar system. A system contains zero or
more component stars and, for selected detailed systems, zero or more planets. Basic
Phase 1 fields include:

- Stable system ID.
- Preferred display name and alternate designations.
- Canonical and render coordinates.
- Distance from Sol.
- Basic display properties supported by source data.
- Source-backed presentation facts and the derived approximate colour family for
  each rendered component.
- Component references.
- Provenance.

Most systems intentionally have only basic data. Rich descriptions and planets are
added selectively when story relevance or product needs justify them.

Marker presentation is deliberately approximate. It follows the documented
multi-source precedence and uses the neutral family when no accepted presentation
fact is available. Accepted census T/Y brown dwarfs use the two false-infrared
families and the smaller/dimmer fixed values above; other components retain the
ordinary values. The runtime retains the source value and derivation method and does
not promote an approximation into a more precise claim. No browser request resolves
or refreshes visual properties.

Phase 2 replaces a fixed nearest-system presentation with contextual neighbourhoods.
The offline pipeline must guarantee every source-available stellar system within one
configured Euclidean radius of every mapped narrative stellar-system anchor in the
canonical corpus. The default radius is 20 light-years. One explicit validated static
configuration record owns that value for generation, validation, runtime filtering,
tests, and relevant UI wording; it is not an end-user preference. Overlapping
neighbourhoods deduplicate by stable system identity. A source boundary must not be
silently presented as complete, and the browser still makes no runtime catalogue
request.

At runtime the map derives this rendered union directly from the validated static
catalogue, the current reader-safe narrative projection, and the shared configuration;
there is no separate narrative/astronomy join artifact. Every mapped eligible
narrative system receives a segmented screen-readable ring. Generated
`mapped_system_ancestry` activity makes a system active at the selected chapter or
date, drawing a distinct static double ring and outward tick. These decorations are
centred on the canonical node but are non-raycastable and do not alter component
sprites, coordinates, measurements, focus targets, or camera framing. Selected,
hovered, and active captions have collision priority; other known captions may hide
and return as the camera changes. Astronomy-only systems have no persistent caption.

The only DOM access path for astronomy-only systems is the temporary **Nearby
astronomy** search group. It appears for a nonempty query, searches preferred names
and alternate designations inside the current rendered union only, and does not change
that union. Its inspector exposes catalogue facts and provenance with **Not
story-known at this view**. Shared selection resolves an automatic map focus only for
a mapped system/location, an event with one mapped location, a character's uniquely
derived last-seen location, or an astronomy-only result; unsupported, unmapped, and
locationless selections leave the camera unchanged. A chapter/date change atomically
clears an astronomy-only selection that has left the rendered union.

A new non-Sol anchor is bootstrapped from an exact GCNS or CNS5 source identity before
its acquisition sphere is planned; a coordinate from the previous generated runtime
is comparison evidence only. A reviewed landmark roster makes recognizable local
completeness testable. The complete initial roster and its multiple-system membership
expectations are binding in `docs/data/astronomy-pipeline.md`; they include Sirius,
Procyon, and Alpha Centauri with Alpha Centauri A, Alpha Centauri B, and Proxima
Centauri. The roster validates stable IDs and membership; it is not an astrometry
source.

## 9. Phase 1 interaction design

The map must provide:

- Rotate, zoom, pan, smooth focus, and reset controls.
- Sol as a visible origin reference.
- A visible Galactic plane and labeled orientation references.
- A persistent light-year scale indication.
- Selection of a system and a basic detail panel; no system is selected initially.
- Fixed light-year presentation for displayed interstellar distances and coordinates.
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

Phase 2's approved desktop workspace is specified in
`design/phase-2-desktop-ui.md`. At `>= 1200px`, it presents the progressive grouped
object browser, true-scale map, selected-object inspector, and chapter/date timeline
dock together. Search lives at the top of the browser. The map remains the largest
surface, and the attribution footer remains visible. The shared application state and
components are later recomposed for mobile by BOB-016; desktop implementation must not
create a parallel domain or spoiler model.

Below the simultaneous-layout breakpoint, including when 200% desktop zoom reduces
the CSS viewport, the BOB-003 map-first browser and inspector panels remain in use.
The command bar additionally opens **Timeline and progress** as a non-animated modal
panel containing the same `TimelineDock` component and shared projection state as the
desktop dock. The compact panel provides a visible close control, Escape dismissal,
focus containment, and focus return. This is the BOB-015 desktop-zoom contract;
BOB-016 may later recompose the same components for a first-class phone and tablet
design without replacing their state or projection authority.

`ObjectBrowser` receives the centralized `NarrativeWorld` projection and its generated
activity array. It groups only projected entities, searches only projected names and
aliases, and applies mode-specific activity ordering without reading authored chapter
JSON. Group expansion preferences are a compatible field in the existing
`bobiverse.app-state.v1` record. Search expansion is transient and never rewrites
those preferences.

Selection is one tagged identity: a narrative entity ID, an astronomy catalogue
system ID, or an inspectable chapter reference. Chapters do not enter the narrative
entity registry. A chapter selection is eligible only in Chapter mode when it equals
the current non-null `viewChapter`; Date mode, zero state, a lower ceiling, or another
ineligible transition clears it through the shared accessible status. Chapter
selection never supplies a map-focus target. `ObjectInspector` resolves narrative
selections only against the current projected entity registry and renders sparse
type-specific fields and eligible relationship links. A projection change makes an
absent narrative selection ineligible immediately, clears it, and announces the
change. Inspector relationship traversal is recorded in a transient, unpersisted
selection stack shared by the wide and compact inspector. Relationship links append
after the current entry and discard any forward branch; Back and Forward restore only
eligible entries without changing reader progress. Map, browser, and timeline
selections start a new stack, while projection changes remove ineligible history
entries. Browser session history and URLs are unchanged. Type-specific
group SVGs and the shared row-bullet SVG are presentation-only and carry no selection
or domain semantics. The legacy astronomy directory is removed; catalogue selection
is map-driven until BOB-014 supplies the final query-only contextual astronomy DOM
path. Neither the browser nor inspector owns map markers, astronomy context coverage,
narrative schema facts, or a second spoiler filter.

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
characters, species, technologies, organizations, vessels, or events. Chapter
records then introduce book-specific entities and record ordered visible patches,
appearances, events, and optional important references in `mentions`. A mention
creates no relationship or state change. The stable entity registry
and every selected-chapter state are deterministic generated projections, never
manually edited snapshots. ADR-0001 establishes chapter-authored patches; ADR-0003
supersedes its sole-source boundary with the zero state; ADR-0004 establishes the
unversioned narrative schema contract; ADR-0005 refines the chapter, location, and
date-projection contracts; ADR-0006 generalizes the zero-state record; and ADR-0007
expands the direct narrative entity union. ADR-0008 defines important mentions and
the generated narrative-activity index. ADR-0009 first defined chapter ordering for
competing state-property writes whose effective dates are both year-only and equal;
ADR-0013 promotes that ordering to every dated chapter-authored narrative fact.
ADR-0014 replaces the former classification-only vessel type with one `vessel`
entity that can represent a named spacecraft, its reusable design, or the family
named after its first vessel. Vessel state is projected through the same ordered
chapter-patch rules as other mutable entity state.
ADR-0015 keeps disclosure gaps in extraction evidence and reconciliation rather than
reader-facing descriptions.

Every authored `current_state` is one or two concise sentences describing only the
latest known condition, not identity, history, a chapter synopsis, or an accumulated
adventure log. Every authored description is an entity-centered encyclopedia entry.
Capabilities use general language such as “It can” or “It is used to”; named-character
relationships remain only when defining or when a source-supported assessment needs
attribution. Descriptions omit statements whose purpose is to announce unrevealed,
unknown, unexplained, unavailable, unspecified, or otherwise missing knowledge. A
short positive description remains valid; authors must not invent completeness.

Spoiler safety has two independent dimensions:

1. Reading order determines which claims the reader is permitted to know.
2. Story time determines the in-universe moment represented by the selected chapter.

`furthestChapterRead` is a guarded reader-progress ceiling. Advancing it requires an
explicit confirmation. `viewChapter`, labelled **Knowledge through** in the Phase 2
UI, selects a chapter at or before that ceiling. Both are absent before the reader
selects a chapter, when the zero state is rendered. Reader order first decides which
facts the reader may know; story time then decides which of those facts form the
represented world state at `viewChapter.date`. A future story-state change must not alter an
earlier in-universe view merely because its chapter was read first. Conversely, a fact
first revealed later must not alter an earlier reader-knowledge view, even if it was
already true in-universe. ADR-0002, as refined by ADR-0005, ADR-0009, and ADR-0013,
defines this two-stage projection and its temporal validation rules.

Dated chapter-authored facts compare an effective story date together with their
source chapter. Different years use year order. Two indexed dates in one year use
their explicit indices, and equal explicit indices remain tied. Two equal year-only
dates use canonical numeric chapter order. A year-only date and an indexed date in the
same year remain incomparable. This fact-to-fact rule applies to state writes,
appearances, dated events, and generated narrative activity. Generic date comparison
remains date-only for temporal eligibility against a requested display date,
meaningful-date coordinates, and any value without a source chapter. Chronologically
unplaced event activity has no narrative moment and remains Chapter-mode context only.

The first confirmed **Read through** choice initializes `viewChapter` to that same
chapter and uses its story date, so onboarding moves from zero state to one complete
chapter view in one deliberate action. Later increases to `furthestChapterRead` do not
change an already valid `viewChapter`; lowering the ceiling below it clamps
`viewChapter` to the new ceiling and recomputes the projection.

Phase 2 Date mode may use a meaningful requested story date for the second stage,
rather than `viewChapter.date`. It retains the first stage's reader-visible chapter
set: no later chapter becomes available merely because its story date precedes the
requested date. The result is explicitly the state inferred from selected reader
knowledge at that date, not a claim about unrevealed in-universe facts. The UI exposes
only determinate dates derived from the permitted knowledge set; it does not provide
arbitrary date entry or expose within-year ordering indices. Its year axis preserves
linear elapsed-year scale.

All later views—map, search, characters, systems, paths, chronicles, and genealogy—use
one shared visibility policy. A UI component may not implement an independent spoiler
filter.

The generator also emits read-only narrative activity derived from introductions,
updates, appearances, chapter and event locations, event participation, important
mentions, and mapped stellar-system ancestry. Each record preserves its target, source
chapter, nullable comparable effective date, and one or more controlled reasons.
Reasons coalesce only for the same target, chapter, and effective date; unplaced event
activity remains available in Chapter mode but is never date-positioned. Activity
supports Chapter-mode reader-order recency and Date-mode narrative-moment recency.
Equal year-only activity facts use canonical chapter order; equal indexed or
mixed-precision moments do not gain a semantic fallback. The generated array uses a
deterministic topological order that preserves every definite moment relation;
stable placement among undated, tied, or incomparable records carries no story
chronology. Activity is not a source of entity state, relationships, continuous
presence, or coordinates, and UI code must not reconstruct it independently.
Important mentions target only an already visible direct narrative entity or location
not structurally represented in that chapter; they do not assert presence,
participation, ownership, membership, location, or use.

The same projection emits a character's `last_known_location` only when
reader-visible appearances at or before the displayed date have one uniquely latest
narrative moment. Equal year-only sightings use canonical chapter order. Equal
indexed or mixed-precision sightings remain tied or incomparable and produce no
singular result. The generated value records the sighting location, source chapter,
and effective date and never asserts current presence.

The normal development, test, and build paths first generate the ignored
`generated/narrative/chapter-manifest.json` from authored chapter paths. The manifest
contains only ordered chapter references and paths. The static runtime resolves bundled
source modules through it and rejects a missing, stale, out-of-order, or
path-inconsistent manifest with an actionable diagnostic. Selected world projections
remain deterministic in memory and are never committed as per-chapter snapshots.

The browser and CLI share one explicit narrative preparation boundary:
`raw authored sources -> prepared corpus -> reader-safe projection`. Preparation
evaluates every raw source once against the shared structural validators, completes
the cross-record semantic pass, clones the accepted data away from its mutable input,
deeply freezes it, and builds private chapter-order, chapter-lookup, meaningful-date,
and immutable chapter-detail source indexes. Projection APIs accept only this
prepared corpus. Prepared indexes are implementation state and never appear in a
public `NarrativeWorld`.

One Draft 2020-12 Ajv registry lives for the application or CLI module lifetime. Each
named schema validator is resolved and cached once, including the generated-world
validator; copied error arrays preserve diagnostics without exposing Ajv's mutable
`errors` property. The CLI supplies source-aware structural formatting to the same
preparation call, so file, line, and column diagnostics do not require a second
schema-validation pass.

Application-level projection coordination owns each reader-progress transition. It
normalizes progress, obtains prepared meaningful-date options, generates exactly one
world, resolves the selected Chapter-mode detail against that exact world, derives the
map projection and selection eligibility, and commits the coherent result atomically.
Chapter detail contains book/chapter identity, optional asset ID, the authored
summary, and resolved eligible relationship IDs; it is neither a second world nor a
committed snapshot. Timeline, browser, map, and inspector consume that shared result.
Search, group expansion, compact-panel state, timeline viewport, and map-scale changes
do not regenerate the narrative world.

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

`megastructure` is reserved for engineered structures exceptional in physical scale;
ordinary durable stations and bases use `locale`. Incidental, unnamed, or short-lived
places are omitted rather than promoted merely to supply a chapter or appearance
location. Authoring uses the most specific supported reader-visible location. If a
fine-grained locale is unavailable or intentionally omitted, it climbs the established
hierarchy to the nearest supported reader-visible parent without inventing a
placeholder or containment relation.

Astronomy remains authoritative for stellar and interstellar physical positions,
components, sizes, colours, and measured render facts. The zero-state source owns the
known Solar-System location topology and its pre-book character, species, technology,
organization, vessel, and event
registry; its locations use a deliberately non-metric local render order and must not
contain coordinates, radii, distances, colours, or other measured astronomy facts. A
mapped narrative star system may reference an astronomy node; mapped
parent-child locations must agree with astronomy ancestry. Only mapped narrative star
systems carry that direct reference; descendants inherit the system context. The visual
layer derives the current map join at runtime from validated stellar astronomy data,
the reader-safe projection of the zero-state registry, and selected narrative patches;
it does not create a second generated authority. Images are manually curated assets,
while an entity's `picture_id` assignment is zero-state or chapter-controlled
narrative state. A chapter source may also assign its own optional `picture_id`; both
references use the same registry, path, provenance, and validation rules. The
zero-state source contains no asset files;
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
