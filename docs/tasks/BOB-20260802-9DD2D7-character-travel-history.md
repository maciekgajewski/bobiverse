# BOB-20260802-9DD2D7: character travel history

Status: Done
Phase: 3 (character histories and travel tools)
Last updated: 2026-08-02

## Objective

Display a selected character's complete reader-visible travel history as a
newest-first inspector list and as a true-scale interstellar route on the star map.

## User-visible outcome

Selecting a character makes their explicit located appearances available in a
collapsible **Travel history** section in the shared desktop and compact inspector.
Every appearance remains a separate row, even when several appearances use the same
location. Each row shows the location, source chapter, and story date. The location
selects that location through the existing inspector history, while the chapter link
moves the reader view to that chapter through the existing guarded Chapter-mode
transition. The date is informational.

The character's mapped interstellar movements appear simultaneously on the true-scale
star map as layered luminous cyan-blue route beams inspired by the navigational
network atmosphere of the approved desktop concept. Subtle light pulses move from
departure to arrival; reduced-motion presentation replaces movement with static
direction chevrons. The visually most recent rendered segment is
brightest and older segments progressively fade. A leg's arrival appearance supplies
its visual age: definite story chronology wins, with chapter order used only as a
stable presentation fallback. Only movement between different stellar systems creates
geometry. Unmapped, temporally ambiguous, or historically indeterminate appearances
remain in the list and break the route rather than allowing the renderer to imply a
journey across missing evidence.

For character inspectors only, the existing details become a collapsible **Overview**
section, the ancestor list becomes **Lineage**, and the new list becomes **Travel
history**. Overview is initially expanded; Lineage and Travel history are initially
collapsed. Each section's expansion preference persists in the existing versioned,
namespaced application-state record.

## Prerequisites

- BOB-014 provides the narrative/astronomy map join and true-coordinate rendering.
- BOB-027 and ADR-0013 provide the shared narrative-moment ordering contract.
- BOB-20260801-6X1M7T provides the shared lineage inspector, guarded chapter links,
  and wide/compact character-inspector surface.
- Canonical chapter appearances provide the only travel-stop evidence.

All prerequisites are Done. `Ready` does not authorize implementation; implementation
still requires explicit authorization from the Captain.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially Sections 8.5, 9.1, 10, and 12
- `../implementation-plan.md`, Phase 3 character-history and travel-path slices
- `../design/phase-2-desktop-ui.md`
- `../design/reference/desktop-concept.png` for route atmosphere only
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`
- `BOB-014-narrative-aware-map-integration.md`
- `BOB-027-generalized-narrative-moment-ordering.md`
- `BOB-20260801-6X1M7T-character-ancestor-lineage-inspector.md`

No new ADR is expected. This task adds a derived consumer of existing authoritative
appearance, location-ancestry, astronomy, coordinate, spoiler-projection, and
application-preference contracts. It must update the integrated technical design but
must not introduce a second travel source, spoiler filter, coordinate authority, or
runtime astronomy lookup.

## Ratified decisions

1. A travel stop is one explicit, reader-visible, temporally eligible character
   appearance with an explicit or enclosing chapter `location_id`. Introductions,
   updates, mentions, event participation, generated activity, and
   `last_known_location` do not independently create stops.
2. The complete history begins at the character's first qualifying located
   appearance, which may be later than the character's introduction. No location is
   inferred for an unlocated introduction.
3. Every qualifying appearance remains a separate inspector row. Repeated appearances
   at the same narrative location or within the same stellar system are not collapsed.
4. List ordering is newest first. Definite narrative-moment order is authoritative;
   canonical chapter order stabilizes entries whose story dates remain otherwise
   ambiguous. This fallback is presentation order only and must not be represented as
   a newly inferred precise story date.
5. A location name selects the projected location through existing transient
   inspector Back/Forward history. Its chapter is a separate accessible link using
   the existing guarded Chapter-mode transition, and its date is informational.
6. A Travel history section is available for a character with one qualifying stop.
   It shows the single row and produces no map segment.
7. Route construction uses the same history in oldest-first display order, but it
   treats two adjacent stops as travel-adjacent only when their narrative moments are
   definitely strictly ordered under the shared comparator. Equal year-only moments
   ordered by canonical chapter are definite under ADR-0013. Equal indexed moments
   and mixed-precision moments remain tied or incomparable and break the route before
   and after the ambiguous adjacency.
8. Consecutive stops within one stellar system remain separate list rows but produce
   no zero-length or intra-system map geometry. For example, Earth, Moon, then Alpha
   Centauri produces one interstellar segment from Sol to Alpha Centauri.
9. Each historical stop resolves location ancestry as effective at that stop's own
   narrative moment within the current reader-visible knowledge set. A later
   reparenting, `map_status`, or `astronomy_object_id` change must not retroactively
   relocate an earlier stop. If effective ancestry cannot be resolved uniquely at the
   stop's moment, the stop remains listed and has no map endpoint.
10. An unmapped or historically indeterminate stop remains visible in the list and
    breaks route continuity. No segment connects the mapped stops on either side of
    that gap.
11. When the same unordered pair of system endpoints is traversed more than once, the
    true-scale segment is drawn once using the visually latest traversal's age. Every
    traversal remains separately visible in the list.
12. Rendered segments use canonical system coordinates and do not alter positions,
    measurements, focus, picking, camera framing, or the stored narrative model.
13. A leg's arrival appearance determines visual age. Definite narrative-moment order
    is authoritative; canonical chapter order provides a stable fallback for tied or
    incomparable arrival moments. This total ordering controls only brightness and
    repeated-segment presentation. It never establishes travel adjacency, creates a
    leg, changes route continuity, or becomes narrative chronology. The visually
    newest leg has the strongest cyan-blue glow and progressively older legs fade.
    Route beams layer a diffuse aura, restrained glow, sharp core, and sparse animated
    light pulses moving from departure to arrival. Reduced-motion presentation removes
    pulse animation and supplies static direction chevrons. Every layer remains
    non-interactive, non-raycastable, and subordinate to star markers, captions,
    selection, and active states.
14. The desktop concept specifies atmosphere only. The implementation uses original
    project-owned styling and does not copy its illustrative geometry or assets.
15. Only a currently selected eligible character displays a route. Clearing or
    changing selection, changing the projection so the character becomes ineligible,
    or entering a map mode that cannot truthfully show the interstellar overlay removes
    it atomically.
16. Collapsible sections apply only to character inspectors. Other entity and
    astronomy inspectors retain their present information architecture.
17. Character sections are Overview, conditional Lineage, and conditional Travel
    history. Overview initially expands; Lineage and Travel history initially
    collapse. Their independent expansion values persist in
    `bobiverse.app-state.v1`, are normalized defensively, and are shared by the wide
    and compact inspector rather than duplicated per character.
18. Route geometry is not an interaction surface. Location selection and chapter
    navigation remain available through ordinary DOM controls in the list, including
    when WebGL is unavailable.
19. Historical travel endpoints for every eligible character are derived once per
    reader projection. Changing only the selected character performs an indexed
    history lookup and leg derivation; it must not regenerate a narrative world per
    appearance or block the main thread proportionally to the selected character's
    stop count.

## In scope

- Derive a character travel-history projection from eligible canonical appearances,
  retaining location ID, source chapter, and effective date for every stop.
- Centralize travel-stop eligibility and ordering in the narrative domain layer so
  inspector and map consume the same result without reading raw chapter JSON.
- Resolve each stop through location ancestry effective at that stop's narrative
  moment under the current reader-visible knowledge boundary, preserving unmapped or
  indeterminate stops as route-breaking gaps.
- Derive oldest-first interstellar legs only across definitely ordered adjacent
  stops, omit same-system legs, and deduplicate repeated endpoint pairs without
  using presentation fallback to create adjacency or route continuity.
- Recompose character-only inspector content into accessible collapsible Overview,
  Lineage, and Travel history sections on the existing shared wide/compact surface.
- Render every travel stop newest first with separate accessible location and chapter
  controls plus informational date text.
- Extend the existing `bobiverse.app-state.v1` preference model with normalized
  character-inspector section expansion state and preserve unrelated stored fields.
- Render non-pickable, true-coordinate layered route geometry for the selected
  character in the ordinary interstellar map view, with directional light pulses and
  reduced-motion static chevrons.
- Prederive all character histories and historical endpoints once per reader
  projection so selection changes are indexed lookups rather than per-stop world
  reconstruction.
- Define route colour, glow, width, opacity progression, depth behavior, and marker
  hierarchy using existing design tokens where possible.
- Add domain, persistence, component, map-rendering, accessibility, responsive,
  spoiler-boundary, and browser regression coverage.
- Update the README, integrated technical design, implementation plan, visual-testing
  guidance, and this task's completion evidence in the same implementation change.

## Out of scope

- Inferring travel from introductions, updates, mentions, event participation,
  current state, generated activity, or `last_known_location`.
- Adding or correcting canonical appearances or locations without a separately
  authorized editorial task.
- Inventing coordinates, using current-view ancestry to retroactively relocate a
  historical stop, or retaining a continuous route across an unmapped, indeterminate,
  tied, or incomparable stop adjacency.
- Intra-system paths among stars, planets, moons, stations, or other descendants.
- Per-leg distance labels, measurements, duration, speed, vehicle, interactive route
  controls, hover tooltips, selection, or a dedicated leg inspector. Direction
  indication is limited to the accepted pulses and reduced-motion chevrons.
- Parallel or offset geometry for repeated traversals.
- A full-screen character chronicle, playback mode, route filtering, or comparison
  between characters.
- Redesigning non-character inspectors or the left object-browser groups.
- Changing `furthestChapterRead`, browser URL/history semantics, canonical astronomy
  coordinates, map scale, or camera controls.
- New runtime services, network requests, generated route data, or committed build
  output.

## Acceptance criteria

1. The centralized projection returns exactly one travel stop for every eligible
   explicit located appearance of the selected projected character and no stop for
   any other narrative fact.
2. Reader order remains the visibility boundary and display story time remains the
   temporal boundary. Moving chapter/date never exposes a future stop, while later
   reader knowledge may reveal an earlier eligible stop under the existing two-stage
   projection contract.
3. Stops retain their projected location ID, source chapter, and effective date and
   render newest first. Definite narrative-moment comparisons govern chronology;
   chapter order produces stable presentation among otherwise ambiguous stops without
   claiming added date precision.
4. Repeated appearances at the same location or within one system remain separate
   rows. A selected character with one qualifying stop has a Travel history section
   and no route geometry.
5. Activating a location name selects that eligible projected location through the
   existing inspector history without changing reader progress.
6. Activating a chapter link from Chapter or Date mode switches to Chapter mode,
   changes `viewChapter` to that eligible chapter, opens the chapter inspector, and
   leaves `furthestChapterRead` unchanged. Dates are not interactive.
7. Each mapped stop resolves through the location state effective at its own
   narrative moment using only the current reader-visible knowledge set and the
   existing astronomy join. A later location reparenting, mapping, or astronomy-ID
   update cannot retroactively move an earlier stop.
8. A stop whose effective historical ancestry is unmapped or cannot be uniquely
   determined remains listed and divides the route into disconnected runs.
9. Only adjacent stops with a definite strict narrative-moment order whose mapped
   systems differ create an interstellar leg. Equal indexed or mixed-precision
   adjacency breaks the route; equal year-only appearances retain ADR-0013's definite
   canonical-chapter order. Same-system stops produce no geometry.
10. A repeated endpoint pair, regardless of traversal direction, produces one
    segment styled from the visually latest traversal under the arrival-moment and
    chapter-fallback rule. The list still contains every source appearance.
11. Every route endpoint uses the existing canonical render coordinate for its
    astronomy system. Route presentation neither displaces nodes nor changes distance
    calculations, picking, selection, focus, camera framing, or map scale.
12. Each leg's arrival appearance supplies its visual age. Definite story chronology
    wins; canonical chapter order supplies a stable fallback for tied or incomparable
    arrivals. The resulting visually newest unique leg is brightest and older legs
    fade monotonically. This fallback affects only styling and repeated-segment
    presentation, never geometry or narrative chronology. All route layers remain
    restrained cyan-blue, non-raycastable, and subordinate to system markers,
    captions, active rings, selection frames, and hover feedback. Sparse light pulses
    move from departure to arrival; reduced-motion mode replaces them with static
    direction chevrons without changing geometry.
13. Route appearance is original but visibly aligned with the approved desktop
    concept's fine luminous blue connection treatment. It remains legible without
    overwhelming the map in the canonical dense real-data fixture.
14. Selecting an eligible character shows the route in interstellar map mode.
    Selecting another object, clearing selection, losing character eligibility, or
    entering an incompatible map mode removes it without stale geometry.
15. Character inspectors expose accessible Overview, conditional Lineage, and
    conditional Travel history disclosure controls in both wide and compact layouts.
    Overview defaults open; the other two default closed.
16. Section expansion preferences are independent, persist in
    `bobiverse.app-state.v1`, survive reload, normalize malformed or missing values to
    the documented defaults, and remain shared when switching characters or between
    wide and compact layouts.
17. Non-character inspectors retain their existing structure and behavior.
18. Keyboard and screen-reader users can discover section names and expansion state,
    operate every location and chapter link, and access the complete travel list
    without interpreting the canvas. WebGL failure does not remove the DOM history.
19. Focused tests cover chronology and fallback list ordering; route breaks around
    equal-indexed and mixed-precision moments; repeated stops; same-system suppression;
    unmapped gaps; historical reparenting and remapping; indeterminate historical
    ancestry; repeated-leg deduplication with definite and incomparable traversals;
    arrival-based brightness with chapter fallback; proof that the fallback cannot
    create geometry; projection changes; persistence normalization;
    wide/compact rendering; navigation; route removal; animated pulse direction;
    reduced-motion chevrons; and proof that character selection does not regenerate a
    narrative world per stop.
20. Automated browser coverage exercises the shared desktop and compact workflows in
    Chromium, Firefox, and WebKit. Manual review covers real-browser route hierarchy,
    long-list scrolling, 200% desktop zoom, compact panels, reduced motion, dense
    starfield contrast, and a route containing old, recent, repeated, same-system,
    and unmapped stops.
21. README, technical design, implementation plan, visual-testing guidance, task
    completion evidence, and any recorded deviations accurately describe the shipped
    behavior.

## Validation commands

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

During implementation, add a focused Playwright invocation for the travel-history
scenario and record it here using the exact final test title or grep expression:

```bash
npm run test:e2e -- --grep "character lineage and travel history are responsive and support navigation"
npm run performance:travel
```
Manual visual acceptance by the Captain is required before this task may become
`Done`.

## Implementation evidence

- `python3 scripts/tasks.py check`, formatting, lint, type checking, the production
  data/narrative build, and `git diff --check` pass on 2026-08-02.
- The unit and component suite passes with 25 files and 198 tests.
- The focused direction/reduced-motion browser regression passes in Chromium,
  Firefox, and WebKit.
- The warmed production selection benchmark passes with a 73.6 ms median and
  74.7 ms maximum against the 100 ms median and 150 ms maximum budgets on Chromium
  149 running on the Ryzen 5 5600 development host.
- The full browser run passes 66 of 69 cases. Its only failure is the existing
  `Solar System enters and exits the fixed system mode` Alpha Centauri label
  assertion in Chromium, Firefox, and WebKit; all character-travel scenarios pass.
- Independent implementation closure review reports `No findings.` The Captain
  completed and approved manual visual acceptance on 2026-08-02.

## Generated-artifact expectations

- Travel stops and route legs are derived in memory from the prepared narrative
  corpus, current projection, and existing astronomy catalogue. Do not commit a route
  snapshot or introduce a second generated authority.
- Normal ignored narrative manifests, browser output, screenshots, traces, and videos
  follow their existing ownership and retention rules.
- Any implementation need for a new generated artifact is a design deviation that
  must be surfaced before implementation and documented with its schema, generator,
  freshness validation, and ownership.

## Risks and cautions

- Sorting mixed-precision dates into a stable list must not leak into route adjacency,
  route continuity, `last_known_location`, or other narrative-moment consumers as a
  false chronology rule. Its explicit reuse for route brightness and repeated-segment
  presentation must remain isolated from geometry derivation.
- A naive filter of generated activity would treat mentions or event participation as
  travel. Travel history must derive only from eligible explicit appearances.
- Flattening away unmapped appearances before leg construction would create false
  direct routes. Preserve gaps through route derivation.
- Resolving every stop through the current displayed location tree would let later
  reparenting or mapping changes rewrite earlier travel. Historical resolution must
  apply the reader-visible location state effective at each stop's own moment and
  preserve indeterminacy as a route gap.
- A naive consecutive-system deduplication can lose a later return journey. Preserve
  every appearance for the list, derive every interstellar traversal, then collapse
  repeated endpoint geometry using the documented arrival-based visual ordering.
- Additive glow can overwhelm captions and markers or vary across GPU/software
  renderers. Test semantic geometry separately from visual hierarchy and avoid
  fragile pixel-perfect assertions.
- Persisted disclosure state belongs to the shared application-state normalizer. A
  component-local or character-keyed copy would diverge across layouts and produce
  unbounded storage growth.
- Route updates and chapter-link navigation change projection and selection together.
  Avoid stale geometry, stale list entries, duplicate announcements, or transient
  future-stop exposure.
- Manual visual acceptance remains required before the task may become `Done`.
