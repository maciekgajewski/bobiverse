# BOB-20260801-MR10R3: classical and narrative star names

Status: Done
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-08-01

## Objective

Improve stellar-system names without weakening astronomical provenance or spoiler
safety. Add a pinned Bayer/Flamsteed cross-index as name-only astronomy enrichment,
prefer exact matched classical designations over technical catalogue fallbacks, and
let the current reader-visible narrative name override the astronomy name throughout
the application.

## User-visible outcome

Bright systems use familiar names such as `Beta Hydri` and `Delta Eridani` instead of
`GJ 19` and `GJ 150`. Once a mapped narrative star-system name is visible at the
selected reader progress, that narrative name is used consistently by map captions,
hover cards, selection frames, distance labels, breadcrumbs, object-browser results,
search, inspectors, and guided system view. Before reveal, the application shows only
the spoiler-safe astronomy name.

All source and fallback identifiers remain searchable and inspectable. Naming changes
do not alter stable IDs, inclusion, component membership, geometry, distance, or
coverage.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially Sections 8, 9, 10, and 12
- `../implementation-plan.md`, especially Phases 1B and 2
- `../data/astronomy-pipeline.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0022-classical-and-reader-visible-system-naming.md`
- `BOB-013-astronomy-neighbourhood-catalogue.md`
- `BOB-014-narrative-aware-map-integration.md`
- `BOB-030-mapped-anchor-bootstrap-integrity.md`
- `BOB-20260731-679GX9-map-eridani-destinations-and-expand-catalogue.md`

ADR-0022 accepts `IV/27A` as presentation-only naming authority and defines the
reader-visible narrative override while retaining GCNS/CNS5 geometry and established
identity authority. The astronomy-pipeline source contract and technical design must
be updated before the new source is acquired. If implementation would use position to
establish identity, change the stable system graph, or make narrative knowledge
visible before reader reveal, stop and propose the required architecture decision
instead.

## Ratified decisions

1. Pin VizieR catalogue `IV/27A`, the HD-DM-GC-HR-HIP-Bayer-Flamsteed Cross Index,
   as presentation-only enrichment. Record the exact table, projected fields, query,
   retrieval time, row count, checksum, publication reference, and acknowledgement.
2. Match a cross-index row only through an exact typed identifier unique on both
   source rows and retained on an accepted astronomy component. HIP is preferred for
   this source; an exact HD match may be used only when both sides retain that typed
   HD identifier. Coordinates may validate or diagnose a match but may not create one.
3. A source row never allocates, merges, splits, repositions, includes, excludes, or
   regroups an application object. Ambiguous identifiers create no accepted edge;
   validation fails if an ambiguous or contradictory edge is claimed.
4. Normalize catalogue Bayer and Flamsteed fields into reader-facing Latin-script
   forms using one documented deterministic transformation, including title-cased
   Greek names, single Latin letters and ordinals, and IAU three-letter constellation
   names. Retain the source spelling and typed identifiers for provenance.
5. Astronomy preferred-name precedence is: existing accepted reviewed proper/common
   name; exact Bayer designation; exact Flamsteed designation; existing reviewed or
   generated GJ/HIP/Gaia/CNS5 fallback. Existing accepted aliases and displaced
   preferred names remain alternates.
6. `Beta Hydri` and `Delta Eridani` must be derived from the pinned cross-index through
   exact HIP `2021` and HIP `17378` matches. Do not preserve `GJ 19` or `GJ 150` as
   preferred-name overrides merely to bypass the source precedence; retain them as
   searchable aliases and component identifiers.
7. Reader-visible narrative naming is a runtime presentation projection over the
   validated static astronomy catalogue. For an astronomy system mapped by the
   current reader-safe world, its narrative location name overrides the astronomy
   preferred name throughout all application presentation and search surfaces.
8. Before the narrative name is visible, use the astronomy preferred name. Changing
   chapter/date progress must update names without mutating the committed catalogue.
9. Search matches the effective display name, astronomy preferred name, astronomy
   alternates, retained component designations, and the mapped reader-visible
   narrative name. Hidden future narrative names must not enter search.
10. If one reader-visible projection maps multiple root star-system locations with
    different names to one astronomy system, fail deterministic projection rather
    than selecting by iteration order. Exact duplicate visible names may collapse to
    one display value.
11. Catalogue facts and provenance remain accessible in inspection even when the
    narrative name is the heading. The UI must distinguish the effective display name
    from the astronomy preferred name without inventing a second astronomy identity.

## In scope

- Add the pinned `IV/27A` source artifact, schema, manifest, acquisition, offline
  validation, and documentation.
- Add exact typed cross-index matching and deterministic Bayer/Flamsteed formatting.
- Apply the ratified astronomy preferred-name precedence during candidate generation
  while preserving displaced names as aliases.
- Regenerate the candidate checksum, update the accepted review artifact without
  changing unrelated review decisions, and regenerate the static runtime.
- Add one pure reader-safe display-name projection shared by all UI consumers.
- Update map, browser, search, inspectors, breadcrumbs, measurement labels, and guided
  system view to consume effective display names consistently.
- Preserve catalogue identifiers, aliases, source facts, and provenance.
- Add focused Python, TypeScript, component, and browser regression coverage.
- Update directly affected design, data-pipeline, attribution, and task documentation.

## Out of scope

- Changing system/component IDs, astronomy inclusion, coordinates, distances,
  membership, context radius, or source precedence for non-naming facts.
- Using SIMBAD as a runtime service or as the pinned cross-index authority.
- Treating Bayer or Flamsteed designations as IAU proper names.
- Fuzzy, partial, punctuation-insensitive, phonetic, or positional identity matching.
- Exposing narrative names from chapters beyond the selected reader progress.
- Renaming unmapped narrative locations or authoring new narrative facts.
- Redesigning the visual hierarchy, inspector layout, search grouping, or system-view
  interaction beyond the text and provenance needed for consistent naming.

## Acceptance criteria

1. The committed source snapshot and manifest reproducibly identify the exact VizieR
   `IV/27A` projection and pass independent offline checksum, count, schema, and
   identifier validation.
2. Every accepted cross-index enrichment has exactly one compatible typed-identifier
   match. Duplicate, ambiguous, or malformed candidates create no accepted edge, and
   validation rejects any candidate artifact that claims one with stable diagnostics.
3. Existing reviewed proper/common names remain preferred; otherwise Bayer precedes
   Flamsteed, which precedes GJ/HIP/Gaia/CNS5 fallbacks.
4. Runtime systems `stellar-system-003557` and `stellar-system-003918` are named
   `Beta Hydri` and `Delta Eridani`; `GJ 19` and `GJ 150` remain searchable aliases.
5. Stable IDs, adopted components, canonical positions, distances, component
   membership, context coverage, and non-naming source facts remain unchanged except
   for deterministic metadata consequences of the added source.
6. At any reader progress, every astronomy system has one deterministic effective
   display name. A visible mapped narrative root overrides the astronomy name; an
   unrevealed name has no presentation or search effect.
7. Map captions, hover cards, selection frames, measurement labels, breadcrumbs,
   browser results, search results, inspector headings, and guided system view use the
   same effective display name.
8. Astronomy preferred names, aliases, component designations, and visible narrative
   names all remain searchable; hidden narrative names do not match.
9. Astronomy inspection exposes the underlying catalogue preferred name and aliases
   when its heading is overridden by narrative presentation.
10. Focus, selection identity, measurement geometry, spoiler projection, and browser
    group membership remain keyed by stable IDs rather than display strings.
11. Directly affected technical-design, pipeline, source-attribution, and task
    documentation describe the implemented source and precedence accurately.
12. All documented validation commands pass and an independent completion review has
    no open findings.

## Validation commands

```bash
python3 scripts/tasks.py check
npm run data:test
npm run data:validate
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

`npm run data:refresh` is the sole networked acquisition command and must be run once
after the source contract and importer are implemented. Review its full diff before
accepting generated artifacts; unrelated upstream drift is not authorized by this
task.

## Generated artifacts and documentation

- Commit the normalized cross-index source snapshot and manifest data required for
  repeatable offline validation.
- Regenerate all deterministic candidate, review-checksum, and runtime artifacts
  affected by naming.
- Update `docs/data/astronomy-pipeline.md`, `docs/technical-design.md`, and any existing
  source-credit surface consumed by the application.
- Record exact validation evidence and final review closure in this task before
  changing its status to `Done`.

## Risks and cautions

- `IV/27A` is a historical cross-index, not geometry or system-membership authority.
- Multiple-star component scope can differ between catalogues; a system-level name
  must not be inferred from an incompatible component match.
- Existing review overrides may intentionally protect proper/common names; automated
  precedence must not erase them.
- Narrative naming is progress-dependent. Caching or mutating astronomy objects can
  leak later names into earlier reader states.
- The current UI reads `system.name` directly in several independent components;
  partial adoption would produce inconsistent captions, search, and inspectors.

## Completion evidence

- The pinned `IV/27A/catalog` snapshot contains 3,569 HIP-bearing rows retrieved at
  `2026-08-01T15:04:09+00:00`; its normalized SHA-256 is
  `64279ff81b83e607afa56b3655cad56baf1afea7c115461fb617f28c1d9f6faf`.
- Reconciliation accepted 246 unambiguous exact HIP naming matches. The generated
  systems retain 242 markers and unchanged stable identities and geometry.
- `stellar-system-003557` is `Beta Hydri` with `GJ 19` retained as an alternate;
  `stellar-system-003918` is `Delta Eridani` with `23 Eridani` and `GJ 150`
  retained as alternates.
- Imported classical labels use deterministic ASCII Latin forms. Every Drei text
  node is also bound to the bundled Noto Sans asset, and the browser gate blocks and
  records attempted cross-origin requests so Troika cannot silently fall back to an
  external glyph service.
- Pipeline validation passed 78 Python tests and validation of 242 systems against
  six pinned astronomy sources. Application validation passed 24 Vitest files with
  183 tests, the production build, and all 63 Playwright scenarios across Chromium,
  Firefox, and WebKit.
- Formatting, lint, type checking, task metadata validation, narrative validation,
  and `git diff --check` passed. The sixth independent completion-review pass
  verified all prior findings resolved and closed with no open findings.
- A live refresh may contain unrelated catalogue drift from continuously updated
  sources. Stop for Captain review if the diff exceeds the new source and its
  deterministic naming consequences.
