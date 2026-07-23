# Implementation plan

Status: Initial approved roadmap  
Last updated: 2026-07-23

## 1. How to use this plan

This file defines delivery order and phase boundaries. It is not the live task
tracker. Before a phase is implemented, derive a self-contained task in `docs/tasks/`
with exact scope, dependencies, acceptance criteria, and validation commands.

The technical baseline is `technical-design.md`. Material deviations require an ADR.

## 2. Delivery principles

- Build cohesive vertical slices that can be inspected in a browser.
- Establish astronomy correctness before adding narrative complexity.
- Keep runtime deployment static and data generation offline.
- Validate generated data and domain logic automatically.
- Preserve true linear geometry at every phase.
- Apply one centralized spoiler policy to every narrative view.
- Introduce LLM assistance only after manual data proves the schema.
- Treat manual remote-browser visual acceptance as part of completion.

## 3. Phase 0: design and repository workflow

Status: Complete

Goal: establish a self-contained foundation for implementation.

Deliverables:

- Technical design.
- Initial implementation plan.
- Repository agent guidance.
- Task and ADR workflows.
- Ready task for the first astronomy vertical slice.

Exit criteria:

- Ratified decisions are consistent across repository documents.
- An agent can begin Phase 1A without conversation history.

## 4. Phase 1A: 20-system astronomy map

Status: Complete

Goal: deliver the complete astronomy-only map experience using the 20 nearest stellar
systems.

The active work item is `docs/tasks/BOB-001-nearby-star-map.md`.

Workstreams:

1. Application foundation
   - Create the React, TypeScript, React Three Fiber, and Vite application.
   - Pin Node.js and npm expectations and commit the lockfile.
   - Add custom CSS design tokens and the responsive application shell.
   - Configure `0.0.0.0:5173` with strict-port trusted-LAN behavior.

2. Astronomy data pipeline
   - Create the pinned Python and Astropy import environment.
   - Acquire a documented CNS5 snapshot through an explicit operator action.
   - Model reviewed component-to-system grouping.
   - Transform ICRS source data into canonical Galactic Cartesian coordinates.
   - Validate and emit deterministic static JSON with provenance.

3. Domain model and correctness
   - Implement system identifiers, units, coordinate types, and runtime validation.
   - Add known-axis and known-distance fixtures.
   - Implement light-year/parsec formatting and 3D separation.

4. Interactive map
   - Render Sol, systems, Galactic plane, orientation aids, and scale.
   - Add rotate, zoom, pan, focus, and reset interactions.
   - Add selection and a DOM-based system detail panel.
   - Add WebGL capability and error states.

5. Quality and documentation
   - Add unit, component, and Playwright coverage.
   - Retain Playwright failure artifacts on the headless server.
   - Verify supported desktop browsers manually from the remote workstation.
   - Verify responsive usability and document the development workflow.

Exit criteria:

- All BOB-001 acceptance criteria pass.
- The Captain accepts the real-browser visual result.
- No narrative or backend scope has entered the phase.

Completion note: Windows Chrome, Firefox, and Edge plus mobile Chrome passed the
available manual review on 2026-07-22, and the Captain accepted the visual result.
Safari was unavailable without an Apple test workstation and remains an explicit
pre-publication acceptance gap.

Rebaseline note: BOB-003 retires the two-system distance-measurement user interface
after this completed slice. BOB-001 remains the historical record of its former
acceptance; later work must not restore the tool without a new approved task.

## 5. Phase 1B: catalogue expansion toward 100 systems

Goal: expand the accepted Phase 1A pipeline without redesigning the map.

Planned work:

- Increase the reviewed system set from 20 to 100 nearest systems.
- Replace the fixed 20-system validation and fixture count with one documented,
  easily modifiable catalogue-size parameter. The parameter must still make Sol
  explicit and preserve the reviewed system-count invariant across generation,
  validation, runtime schema checks, and tests.
- Reconcile additional multi-star membership, aliases, and uncertain source records.
- Measure rendering, labeling, picking, and search performance at the expanded size.
- Introduce label-density rules without changing true positions.
- Add richer component and planet details only to selected systems.
- Record catalogue acknowledgements and refresh instructions.
- Add the BOB-005 permanent Galactic-coordinate starfield backdrop as a separate
  visual refinement: use a documented, locally derived real-sky texture with required
  attribution, preserve the canonical coordinate frame and all interaction behavior,
  and do not distort geometry or introduce runtime astronomy requests.

Exit criteria:

- Expanded data passes the same provenance and coordinate validations.
- The map remains legible and responsive on supported hardware.
- Any level-of-detail optimization preserves canonical positions.

## 6. Phase 2: narrative foundation and chapter timeline

Goal: manually encode a representative set of early chapters and prove spoiler-safe
navigation.

Planned work:

- Define JSON Schema Draft 2020-12 contracts for the zero-state Solar-System source,
  authored chapter records, introductions, updates, appearances, events, locations,
  assets, and generated projections.
- Store the zero-state Solar-System tree and each authored chapter in validated source
  JSON; derive the ordered chapter manifest from chapter files and the minimal
  `books.json` catalogue.
- Manually encode a small, representative chapter set.
- Generate stable entity registries and selected-chapter state from the zero-state
  source plus authored chapter patches; add cross-reference, location-tree, child-order,
  and provenance validation.
- Implement guarded reader progress and the shared reader-knowledge visibility
  service with a freely selectable earlier view chapter.
- Add the book/chapter timeline and selected-chapter persistence in localStorage.
- Highlight the selected chapter's visible locations, characters, and events.
- Represent ambiguous locations as explicitly unmapped.
- Add regression fixtures for non-chronological chapters and later revelations about
  earlier events.

Exit criteria:

- Selecting a chapter cannot expose any fact first revealed later.
- Earlier views remain stable when later data is added.
- Timeline, map, and details use the same visibility result.
- Original book text is absent from the repository and built assets.

## 7. Phase 3: exploration tools

Goal: build reader tools on the same entities and spoiler boundary.

Candidate slices, each requiring its own task:

- Searchable character list and character history.
- Searchable stellar-system and planet list.
- Character travel path and per-leg measurements.
- System chronicle.
- Bob genealogical tree.
- Deep links that preserve chapter context without leaking hidden names in metadata.

Each tool must consume the centralized visibility service. A tool is not complete if
it implements an independent approximation of spoiler filtering.

## 8. Phase 4: LLM-assisted editorial pipeline

Goal: accelerate structured content creation without making model output authoritative.

Planned work:

- Define a provider-independent extraction interface.
- Accept source chapters outside version control.
- Request schema-constrained candidates with evidence and confidence.
- Resolve aliases and flag new or ambiguous entities.
- Run structural, referential, temporal, and spoiler validation.
- Produce a human-reviewable diff and require explicit approval.
- Add redacted fixtures that exercise extraction without copyrighted book prose.

Exit criteria:

- No source text or credentials enter commits, logs, or static builds.
- Unapproved model output cannot update canonical data.
- Manual and assisted content use the same schema and validation path.

## 9. Phase 5: publication readiness

Goal: prepare an accepted local application for public static hosting.

Planned work:

- Complete accessibility, performance, responsive, and cross-browser audits.
- Optimize static assets, caching, routing, and error recovery.
- Add astronomy attribution and source notices.
- Replace all placeholders with original, appropriately licensed assets.
- Review Bobiverse-derived summaries, naming, branding, assistant concepts, and fan
  project disclaimers with suitable intellectual-property guidance.
- Select a static host, configure HTTPS and optional custom domain, and document
  deployment and rollback.
- Add a privacy statement appropriate to the actual storage and analytics behavior.

Exit criteria:

- The production bundle contains no secrets, source text, or unlicensed assets.
- Deployment is reproducible from a clean checkout.
- Publication risks and remaining limitations are explicitly accepted.

## 10. Cross-cutting risks

| Risk | Mitigation |
| --- | --- |
| Catalogue objects are mistaken for systems | Maintain a reviewed component-to-system layer and system-level fixtures. |
| Rendering distorts reader understanding | Preserve canonical linear positions and calculate measurements outside the scene. |
| 3D canvas is hard to test headlessly | Separate domain tests from rendering; retain Playwright artifacts; perform remote manual review. |
| Narrative dates and reveal order are conflated | Model story time and reading-order visibility independently. |
| LLM output invents or merges facts | Schema constraints, evidence, entity resolution, validation, and mandatory review. |
| Public fan project copies protected expression | Use original summaries and assets; exclude source text; conduct publication review. |
| Static architecture accumulates accidental backend assumptions | Keep all runtime data local and require an ADR before adding server dependencies. |
