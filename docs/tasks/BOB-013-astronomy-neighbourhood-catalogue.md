# BOB-013: guaranteed astronomy neighbourhood catalogue

Status: Done
Phase: 1B (required by Phase 2)
Last updated: 2026-07-27

## Objective

Replace the fixed nearest-20 astronomy scope with a reproducible static catalogue that
guarantees every available stellar system within a configurable context radius around
each mapped narrative stellar system.

## User-visible outcome

Every narrative-known mapped system sits in an honest local stellar neighbourhood.
The default map shows astronomy context out to 20 light-years around each known
system, rather than becoming empty or misleading away from Sol.

## Product requirements amendment

Scientific precision is secondary to recognizable astronomical completeness. The
intended readers are likely to be science-fiction fans who know basic nearby-star
astronomy and will notice missing or incorrectly modelled landmark systems.

- All major, widely recognized stars and stellar systems in the configured local
  vicinity must be present. This explicitly includes Sirius, Procyon, and the Alpha
  Centauri system.
- Major multiple systems must retain their recognizable membership. Alpha Centauri,
  for example, must be represented as Alpha Centauri A, Alpha Centauri B, and Proxima
  Centauri rather than treating Proxima alone as the complete system.
- Approximate but defensible positions and presentation properties are acceptable
  when more precise data is unavailable. Omitting a major local system is not an
  acceptable consequence of applying one catalogue's quality filter.
- More than one astronomy source may be used when necessary. Every source must still
  have explicit provenance, authority, reconciliation rules, and reproducible pinned
  inputs.
- The static astronomy catalogue is the factual baseline, not the final story state.
  Its data model must support a separate spoiler-safe narrative overlay that can alter
  a star or system's fictional state and presentation without overwriting the
  underlying astronomy facts. This includes events such as a star being artificially
  turned into a supernova during the books.

## Binding references

- `../design/phase-2-desktop-ui.md`, especially Section 8.1
- `../technical-design.md`, Sections 4, 5, 8, and 12
- `../implementation-plan.md`, Phases 1B and 2
- `../data/astronomy-pipeline.md`
- `../adrs/0010-gaia-dr3-astronomy-authority.md`
- `BOB-001-nearby-star-map.md`
- `../../AGENTS.md`

## Decisions

- Context coverage is a generation-time guarantee, not a best-effort runtime filter.
- One explicit validated static configuration value defines the radius in light-years
  and defaults to `20`.
- The same value drives import coverage, validation, runtime filtering, tests, and UI
  wording.
- One map node remains one stellar system. An ungrouped Gaia source is treated as one
  conservative one-component system; explicit project review may group sources.
- Runtime remains static and makes no astronomy request.
- Gaia DR3 is the sole active external astronomy catalogue under ADR-0010.
- Source-relative completeness uses the exact Gaia astrometry-quality contract in
  ADR-0010 and does not claim a complete census of physical stars.
- `data/config/map-display.json`, validated by
  `data/schema/map-display.schema.json`, owns `context_radius_ly`.
- `data/source/gaia-dr3-neighbourhood.csv` is the committed raw acquisition result;
  `data/source/gaia-dr3-neighbourhood.json` records its query, checksum, and retrieval
  metadata.
- `data/source/system-review.json` remains the project-owned identity layer. Each
  ungrouped Gaia source becomes one conservative one-component system; reviewed
  records may group multiple Gaia IDs without introducing another astrometry source.
- Gaia `bp_rp` supplies an approximate colour family when present. Missing colour uses
  a neutral marker, and all components use one fixed readable glyph radius.
- The current generated-data budget is at most 2,000 system nodes and 5 MiB of
  committed runtime JSON. Exceeding either fails validation and requires a reviewed
  performance change.

## In scope

- Inventory mapped narrative stellar-system anchors across the complete canonical
  corpus without treating later systems as runtime-visible at earlier chapters.
- Select and pin sources after an explicit operator-approved acquisition step.
- Define deterministic source precedence and system identity reconciliation.
- Add the validated radius configuration.
- Import all available systems within the configured Euclidean radius of every anchor.
- Deduplicate overlapping neighbourhoods by stable system identity.
- Preserve canonical Sun-centred Galactic Cartesian parsec coordinates and the
  existing right-handed scene mapping.
- Preserve component provenance, visual-property provenance, and the one-node-per-
  system model.
- Emit provenance and coverage metadata sufficient to prove each anchor's
  neighbourhood.
- Fail generation and validation when a promised neighbourhood is incomplete for the
  pinned source contract.
- Replace fixed count assumptions across schema, loaders, validators, tests, camera
  framing, and documentation.
- Measure generated size and map interaction performance.

## Out of scope

- Runtime catalogue APIs.
- Coordinates invented from book text or aliases.
- Dynamic orbital data, literal stellar radii, or separate component positions.
- Narrative visibility, marker rings, browser search, or inspector UI.
- Silently accepting a partial sphere at a catalogue boundary.

## Acceptance criteria

1. ADR-0010 and the astronomy-pipeline documentation define Gaia DR3 coverage,
   identifiers, provenance, acknowledgement, acquisition, and refresh.
2. One validated configuration value defaults the context radius to exactly `20 ly`
   and no production radius literal is duplicated elsewhere.
3. Generation emits the deduplicated union of every promised neighbourhood,
   including all reviewed major local stars and recognizable multiple-system
   membership even when the primary catalogue alone is incomplete.
4. Validation independently proves every emitted system's inclusion, every canonical
   mapped anchor's coverage, the raw snapshot checksum, and equality between expected
   and generated in-radius Gaia source IDs.
5. Canonical coordinates, unit conversion, scene mapping, and true linear geometry
   retain regression coverage.
6. Every rendered component retains its Gaia identifier and photometric provenance;
   colour families are explicitly approximate and missing colour uses the documented
   neutral presentation.
7. Runtime output remains deterministic, committed, static, and free of network
   requests.
8. Camera reset, selection, and picking remain usable within the 2,000-node and 5 MiB
   budgets; label density remains limited to persistent Sol and active interaction
   labels.
9. Source acknowledgements and refresh instructions are updated.
10. The astronomy model provides stable system and component identities that a
    separate narrative layer can reference when applying fictional state changes
    without mutating the factual baseline.

## Validation commands

```bash
./.venv/bin/python scripts/refresh_gaia_snapshot.py
./.venv/bin/python scripts/generate_nearby_systems.py
./.venv/bin/python scripts/validate_data.py
npm run format:check
npm run lint
npm run typecheck
npm run data:test
npm run test
npm run build
npm run test:e2e
git diff --check
```

The Gaia refresh is the only networked command and is an explicit operator action.
All remaining commands use committed inputs.

## Risks

- A catalogue boundary can create a visually plausible but incomplete context sphere.
- Gaia sources do not perfectly represent physical system membership; conservative
  one-source systems remain until explicit project review groups them.
- The union can grow sharply as mapped anchors spread through the narrative.
- Performance optimization may add level-of-detail rendering, but it must preserve
  canonical positions, system identity, searchability, and picking.

## Implementation and acceptance evidence

Completed on 2026-07-26:

- ADR-0010 records the Captain-approved Gaia-only source authority and the accepted
  source-relative completeness definition.
- The explicit network refresh retrieved 73 qualifying Gaia DR3 rows from the
  official ESA TAP service. The normalized raw snapshot SHA-256 is
  `042f769e6e6defcb9600c90daf4d8061e1cad41048aa054a11fb1d0b982116a8`.
- The project-owned review groups three additional Gaia component records into
  existing system nodes. The generated union contains 70 non-Sol systems plus Sol.
- `data/config/map-display.json` is the sole production owner of the `20 ly` radius.
  Generation, independent Python validation, TypeScript validation, tests, and the
  exported runtime configuration consume it.
- Independent validation reconstructs the Gaia source identity, quality contract,
  exact per-anchor ADQL, raw checksum and normalization, Astropy transformation,
  reviewed membership, mapped-anchor inventory, exact Euclidean inclusion, every
  emitted science and provenance field, nominal distance and uncertainty,
  component-ID equality, and per-anchor coverage counts and positions.
- Runtime JSON schema `2.0.0` retains Gaia astrometry, quality, photometry, source
  identifiers, snapshot provenance, and coverage proof. It is 125,729 bytes, below
  the 5 MiB budget; 71 nodes are below the 2,000-node budget.
- Approximate Gaia `bp_rp` colour families and a fixed marker radius replace the old
  multi-catalogue physical-property claims. Missing colour has an explicit neutral
  presentation.
- The active CNS5 refresh script and CNS5/auxiliary visual-property snapshots were
  removed. Their historical Phase 1A role remains in BOB-001 and version history.

Validation evidence:

- `npm run data:generate && npm run data:validate && git diff --check` passed and
  reproduced 71 nodes from 73 Gaia records with one complete mapped neighbourhood.
- `npm run validate` passed formatting, lint, strict TypeScript, four Python
  acquisition-contract regression tests, independent data validation, all 100
  unit/component tests across 20 files, narrative validation, and the production
  build.
- `npm run test:e2e` passed all 24 Chromium, Firefox, and WebKit flows on a fresh
  development server, including responsive selection, deselection, units, compact
  layout, and viewport containment against the expanded map and Gaia acknowledgement.
- The production bundle retains no Gaia runtime request; the browser consumes only
  committed static JSON.
