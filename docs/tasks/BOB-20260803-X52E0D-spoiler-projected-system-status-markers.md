# BOB-20260803-X52E0D: spoiler-projected system status markers

Status: Done
Phase: 2 (narrative visual refinement)
Last updated: 2026-08-04

## Objective

Add spoiler-projected location facts for colonies, possible colony targets, and
prominent installations, then aggregate them with species homeworld relationships
into compact icon-only status rails on known-system map captions.

## User-visible outcome

At the selected reader boundary, a known stellar system can show up to three
species-and-role pairs beneath its name, followed by an exact `+N` overflow count.
Species identity uses the same icon and colour as the Species browser. Colony,
inhabited-homeworld, abandoned-homeworld, and prominent-installation roles have
distinct shapes. Bright-green possible-colony-target and neutral prominent-
installation indicators remain visible outside the species cap. Hover keeps the
status rail visible while moving the system name into the existing tooltip.

## Resolved prerequisite

`BOB-20260803-G3N1GQ` is Done. Its production species and system-status SVGs, asset
roles, species-presentation registry, runtime resolver, validation, and browser
specimen have been verified in the current checkout. This task is therefore Ready;
Ready status still does not authorize implementation.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially Sections 8.5, 10 through 12
- `../data-model-definition.md`, especially location introductions, updates,
  projection, and relationship validation
- `../chapter-extraction.md`
- `../implementation-plan.md`, Phase 2
- `../design/phase-2-desktop-ui.md`, Sections 8.2 and 8.3
- `../design/reference/system-status-icons-concept-v3.png`
- `../adrs/0002-reader-knowledge-visibility.md`
- `../adrs/0004-narrative-zero-state.md`
- `../adrs/0005-generalized-narrative-entity-model.md`
- `../adrs/0017-narrative-extraction-mention-completeness.md`
- `../adrs/0024-species-presentation-registry.md`
- `../adrs/0025-spoiler-projected-location-status-and-system-markers.md`
- `../adrs/0027-final-production-system-marker-visual-vocabulary.md`
- `BOB-20260803-G3N1GQ`

The accepted concept controls icon subjects and visual relationships only. Its
illustrative labels, systems, contents, dimensions, and generated pixels are not
runtime data or production assets.

## In scope

### Narrative contract and validation

- Add optional `colony_of`, `possible_colony_target`, and `prominent` properties to
  every non-transit location introduction and update path, including a mapped
  `star_system` location when no finer location is available.
- Define `colony_of` as an array of unique existing species IDs. Update presence
  replaces the whole list, `[]` clears it, and omission preserves it.
- Define `possible_colony_target` and `prominent` as booleans. `false` clears the
  corresponding state and omission preserves it.
- Reject these fields on transit locations. Otherwise keep kind validation
  lightweight: `prominent` may apply to any non-transit location kind and does not
  introduce an installation-specific kind.
- Reject any effective location that combines nonempty `colony_of` with
  `possible_colony_target: true`, including invalid states created across multiple
  updates. Allow separate descendants of one system to contribute colony and target
  indicators simultaneously.
- Resolve every `colony_of` species reference at its reader-visible authoring point,
  preserve the centralized spoiler boundary, and emit source-aware diagnostics.
- Project all three fields through the existing `NarrativeWorld`; do not add a
  generated status snapshot or a renderer-owned narrative authority.

### Editorial meaning and representative data

- Document for editorial agents that `colony_of` means a durable established
  presence such as a settlement, colony, or operated prominent installation. Visits,
  passing vessels, character appearances, surveys, and unstaffed transient activity
  do not qualify.
- Document that `possible_colony_target` includes worlds requiring substantial
  technological assistance, sealed habitats, or terraforming, not only immediately
  habitable worlds.
- Author only these representative canonical examples; do not audit the complete
  corpus in this task:
  - add `species:human` to Earth's `colony_of` in the narrative zero state;
  - add `species:delta-eridani-natives` to Delta Eridani 4's `colony_of` when that
    species and homeworld relationship become reader-visible in Chapter `1.27`;
  - set `possible_colony_target: true` on `location:ee-2` in Chapter `1.17`;
  - set `possible_colony_target: true` on `location:vulcan` and
    `location:romulus` in Chapter `1.19`;
  - introduce `location:bill-skunkworks` as a `locale` beneath Epsilon Eridani in
    Chapter `1.17`, with `prominent: true` and
    `colony_of: ["species:human"]`, plus a concise original reader-safe name and
    description supported by reviewed evidence.
- Cover abandoned/destroyed homeworld behavior with fixtures; do not invent a
  canonical example before the narrative corpus supports one.

### System-status projection

- Extend `NarrativeMapProjection` with one typed status aggregate keyed by astronomy
  system ID. Derive it only from the current projected world, projected
  `species.homeworld_id` relationships, and established location ancestry.
- For one species in one system, retain exactly one highest-priority role:
  inhabited homeworld, prominent installation, ordinary colony, then abandoned or
  destroyed homeworld. A colony elsewhere in the same system therefore outranks that
  species' abandoned homeworld.
- Treat a species homeworld as inhabited only when the same species appears in that
  effective location's `colony_of`. If it is absent, emit the abandoned/destroyed
  role. Preserve a different colonizing species' independent role.
- A prominent location with associated species emits the prominent role for those
  species instead of colony domes. A prominent location with omitted or empty
  `colony_of` emits one neutral standalone prominent-installation indicator.
- Deduplicate equivalent contributors. Sort visible species-role pairs by role
  priority and then canonical species ID, never translated display name.
- Retain at most three species-role pairs and expose the exact hidden-pair count for
  `+N`. Keep possible-colony-target and neutral-prominent indicators outside that cap
  so both remain visible whenever projected descendants contribute them.
- Test ancestry from every allowed non-transit location kind, multiple contributors,
  same-system mixed states, role priority, canonical ordering, exact overflow,
  generic species presentation, and reader-boundary changes.

### Map presentation and interaction

- Consume, without redrawing, the production assets and species-presentation
  resolver delivered by `BOB-20260803-G3N1GQ`.
- Attach a compact DOM-backed status rail to the existing known-system caption. Use
  the species icon plus colony domes for an ordinary colony; species icon plus
  homeworld for an inhabited homeworld; a smaller grayed species icon plus the
  abandoned-world icon for an abandoned homeworld; and species icon plus prominent-
  installation icon for an associated installation.
- Render possible colony targets with the accepted bright-green planet icon and
  neutral prominent installations with the accepted pale-violet station icon.
  Preserve shape distinction and machine-readable status text so colour is never the
  sole signal; decorative icon images remain hidden from assistive technology.
- Keep status icons visible on hover while the ordinary system name is suppressed in
  favor of the existing tooltip. Keep the rail visually associated with that
  tooltip and do not duplicate the system name.
- Treat each name and status rail as one caption/collision unit. Replace the fixed
  name-only collision assumption with a deterministic per-caption footprint derived
  from the rendered rail shape. Preserve depth ordering, stable system-ID tie-breaks,
  opacity progression `1`, `0.65`, and `0.3`, hover slot reservation, and full
  opacity for selected and active captions.
- Preserve caption eligibility, marker selection and picking, component sprites,
  active rings, selected frame, camera focus, measurements, true-scale geometry,
  astronomy-only treatment, reduced-motion behavior, and WebGL-unavailable DOM
  access.
- Expose the new raw projected location fields and species relationships in the
  ordinary selected-location inspector where applicable. Do not add a derived
  per-system status list.

## Out of scope

- Authoring, redesigning, or modifying species or system-status SVG assets.
- Adding presentation icon or colour fields to narrative species records.
- Creating a new installation entity or location kind, or inferring prominence from
  a location name, description, kind, character presence, vessel, event, or mention.
- Treating `possible_colony_target` as a measured astronomy habitability claim.
- A complete retrospective audit of every chapter or speculative future species,
  homeworld, colony, target, or installation.
- Detailed system-context rows such as `Earth - Human homeworld`; that context-panel
  feature requires a separate task.
- Expanding overflow into a list, changing browser grouping or species bullets, or
  changing the species presentation registry.
- Moving markers, distorting coordinates, or encoding physical extent in icon size.

## Acceptance criteria

1. The canonical schema, embedded documentation schema, TypeScript model, projector,
   update application, reference collection, and semantic validator agree on the
   three optional location fields and their exact replacement/clearing semantics.
2. Transit usage, unresolved or premature species references, duplicate species IDs,
   and every effective nonempty-colony/true-target conflict fail with source-aware
   diagnostics. Valid fields work on every non-transit kind without added
   kind-specific ownership rules.
3. The system aggregate is reader-safe and deterministic across ancestry,
   multi-species systems, cross-location mixed states, homeworld habitation,
   recolonized abandoned homeworlds, prominence, deduplication, priority, canonical
   ID ordering, three-pair cap, and exact overflow count.
4. Earth, Delta Eridani 4, EE-2, Vulcan, Romulus, and Bill's skunkworks contain only
   the agreed reader-visible fields at the agreed chapter boundaries. All canonical
   narrative data and projections validate. No unsupported abandoned-homeworld fact
   or broader corpus audit is introduced.
5. Known-system captions render the accepted role combinations and standalone
   indicators. Species styling matches the browser registry, abandoned species are
   smaller and gray, and every state remains understandable without colour alone.
6. Hover leaves the status rail visible and associated with the sole name tooltip.
   Selection, active state, focus, picking, measurements, ordinary star appearance,
   astronomy-only behavior, and reader-progress transitions remain unchanged.
7. Caption collision uses the complete deterministic name-and-rail footprint. Dense
   overlaps retain every eligible caption, stable depth ordering and tie-breaking,
   the established opacity levels, hover reservation, and selected/active full
   opacity without layout jumps.
8. Location inspection exposes applicable raw projected values and relationship
   links. No derived star-system context list or `Earth - Human homeworld` row is
   added.
9. Automated tests cover schema failures, effective-state semantic failures,
   update clearing, reader boundaries, aggregation edge cases, marker DOM output,
   accessibility, collision footprints, hover, and unchanged astronomy-only labels.
10. The canonical data-model definition, technical design, Phase 2 desktop design,
    chapter-extraction guidance, visual-testing guide, and implementation plan agree
    with the implemented contract and explicitly preserve the deferred context-panel
    boundary.
11. All documented validation passes. A fresh independent implementation review
    reports `No findings.` The Captain accepts map legibility and role clarity in a
    remote supported browser before the task is marked Done.

## Documentation and generated artifacts

- Update `data/schema/narrative-data-model.schema.json`, its fixtures, runtime types,
  semantic validation, projection, and map-status tests.
- Update the agreed zero-state and chapter JSON sources. Regenerate and validate
  runtime narrative artifacts through the repository's normal commands; do not edit
  generated output by hand.
- Update `docs/data-model-definition.md`, `docs/chapter-extraction.md`,
  `docs/technical-design.md`, `docs/design/phase-2-desktop-ui.md`,
  `docs/implementation-plan.md`, `docs/visual-testing.md`, and user-facing guidance
  whose data-authoring or runtime contract changes.
- Do not add or modify production icon assets in this task.

## Validation

```bash
python3 scripts/tasks.py check
./.venv/bin/python scripts/validate_data.py
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --grep "system status|caption|hover|species"
npm run performance:map
git diff --check
```

From a remote workstation, inspect representative zero-state, Chapter `1.17`,
Chapter `1.19`, and Chapter `1.27` views in every available supported browser at
ordinary scale and 200% browser zoom. Confirm the expected progressive markers,
multi-state system behavior, dense-caption fading, hover stability, selected and
active opacity, non-colour differentiation, and generic fallback. Exercise a fixture
with more than three species pairs and an abandoned/recolonized homeworld. Record
browser results and unavailable-browser gaps before marking the task Done.

## Validation status

Implementation validation completed on 2026-08-04:

- `python3 scripts/tasks.py check`: passed; 51 task files validated.
- `./.venv/bin/python scripts/validate_data.py`: passed; 255 reconciled systems and
  six pinned astronomy sources validated.
- `npm run narrative:validate`: passed; zero state and 36 chapter source files
  validated.
- `npm run format:check`, `npm run lint`, and `npm run typecheck`: passed.
- `npm run test`: passed; 29 files and 225 tests.
- `npm run build`: passed; 809 modules transformed and the production bundle built.
- `npm run test:e2e -- --grep "system status|caption|hover|species"`: passed; 6
  tests across Chromium, Firefox, and WebKit in 51.9 seconds.
- `npm run performance:map`: passed the BOB-034 fixture and frame budgets in 3.4
  minutes. All three runs had a 16.7 ms median and 33.4 ms p95 frame interval; the
  median count of intervals over 50 ms was zero.
- `git diff --check`: passed with no output.
- The final independent implementation review reported `No findings.`
- Manual remote-browser result: on 2026-08-04 the Captain reported `manual checks
  passed` for the task's prescribed visual and interaction checks and accepted the
  result. This is an aggregate pass for every available supported browser; browser
  names were not separately recorded and no unavailable-browser gap was reported.
- The production build retained its existing advisory for a client chunk larger
  than 500 kB; it is not a task failure.

## Risks and resolved decisions

- The Captain selected explicit location facts rather than inference from prose or
  activity, and retained `colony_of` as the array field name.
- The Captain selected one highest-priority role per species per system, a three-pair
  cap, canonical species-ID ordering, and an exact `+N` overflow indicator.
- Inhabited homeworld outranks prominent installation, which outranks colony, which
  outranks abandoned homeworld. Both an ordinary colony and an abandoned homeworld
  are valid for one species in one system; the colony wins presentation priority.
- Target and neutral-prominent indicators remain outside the species cap. One system
  may display both a colony and a target when different descendant locations support
  them.
- Status icons remain visible during hover; the name alone moves into the tooltip.
- The map caption and rail form one collision and opacity unit.
- The detailed system-context list was explicitly removed from scope for a future
  task.
- The task deliberately authors only representative current facts. Editorial agents
  must apply the new fields as later source evidence warrants.
- Ready status records the completed and verified icon-asset dependency. It does not
  authorize this task's implementation.
