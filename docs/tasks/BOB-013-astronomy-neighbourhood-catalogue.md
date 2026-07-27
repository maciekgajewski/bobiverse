# BOB-013: guaranteed astronomy neighbourhood catalogue

Status: Ready
Phase: 1B (required by Phase 2)
Last updated: 2026-07-27

## Objective

Replace the Gaia-only intermediate catalogue with a reproducible, reconciled static
catalogue that:

- guarantees every source-available stellar system within a configurable context
  radius around each mapped narrative stellar-system anchor;
- includes recognizable major stars and correct known component membership in the
  local solar neighbourhood; and
- preserves true-scale canonical geometry, explicit provenance, and offline runtime
  operation.

## User-visible outcome

Every mapped story system sits in an honest local stellar neighbourhood. Around Sol,
science-fiction readers see the major systems they reasonably expect—including
Sirius, Procyon, and the three-component Alpha Centauri system—rather than a
technically consistent but visibly incomplete Gaia subset.

## Product requirements

Scientific precision is secondary to recognizable astronomical completeness. The
intended readers are likely to know basic nearby-star astronomy and will notice
missing landmark systems or incorrect component membership.

- Every system in the complete reviewed landmark roster defined by
  `../data/astronomy-pipeline.md` must be present. That roster is the testable product
  definition of major, widely recognized stars in the configured local vicinity.
- Major multiple systems must retain recognizable membership. Alpha Centauri must
  contain Alpha Centauri A, Alpha Centauri B, and Proxima Centauri.
- Approximate but defensible positions and presentation properties are acceptable
  when more precise values are unavailable.
- Omitting a major system because one catalogue has no qualifying record is not
  acceptable.
- Multiple sources are allowed and required where their roles differ. Their authority,
  precedence, joins, reconciliation, provenance, and refresh inputs must be explicit.

Narrative or spoiler-dependent mutation of astronomy facts is deliberately excluded.
Fictional changes such as a star becoming a supernova belong to a separate task.

## Binding references

- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../data/astronomy-pipeline.md`
- `../design/phase-2-desktop-ui.md`, especially Section 8.1
- `../technical-design.md`, Sections 4, 5, 8, and 12
- `../implementation-plan.md`, Phases 1B and 2
- `BOB-001-nearby-star-map.md`
- `../../AGENTS.md`

ADR-0010 records the superseded Gaia-only decision and is historical context, not
current authority.

## Decisions

- Context coverage is a generation-time guarantee, not a best-effort runtime filter.
- One explicit validated static configuration value defines the radius in
  light-years and defaults to `20`.
- One map node remains one stellar system; components belong to the system model.
- Runtime remains static and makes no astronomy request.
- CNS5 controls recognizable local inclusion inside 25 pc.
- GCNS controls source selection from 25 to 100 pc and supplies preferred Bayesian
  distance and Cartesian geometry for matched sources.
- Gaia DR3 supplies optional enrichment through a left join using the shared
  GCNS/EDR3 and DR3 `source_id`.
- CNS5 grouping fields provide the initial local system model; WDS supplements known
  double and multiple systems; ambiguous membership requires project review.
- Inside 25 pc, inclusion is the union of CNS5 and GCNS. Missing Gaia enrichment never
  removes a CNS5 or GCNS source.
- A required neighbourhood crossing the 100 pc GCNS boundary fails validation.
- Stable application IDs do not encode catalogue identifiers.
- A project-owned review layer records accepted cross-source identities, component
  membership, names, adopted positions, conflicts, and landmark status.
- A project-owned landmark roster makes recognizable local completeness testable
  without becoming a coordinate source.
- Presentation values are approximate, nullable, and derived through documented
  source precedence.
- The generated-data budget remains at most 2,000 system nodes and 5 MiB of committed
  runtime JSON. Exceeding either requires a reviewed performance change.

## In scope

- Inventory mapped astronomy anchors across the complete canonical corpus without
  making later narrative knowledge visible earlier.
- Plan conservative source acquisition envelopes for every required context sphere.
- Pin normalized CNS5, GCNS, Gaia DR3, and WDS extracts with source-specific
  manifests, exact selections, row counts, acknowledgements, and checksums.
- Implement the exact GAVO, Gaia, and WDS services, tables, files, and release
  contracts pinned by `../data/astronomy-pipeline.md`; changing one requires reviewed
  documentation before code changes.
- Bootstrap every non-Sol anchor by exact source identity before planning its
  neighbourhood; do not depend on a coordinate from the previous runtime catalogue.
- Preserve CNS5-only sources that lack a GCNS/Gaia match.
- Join GCNS/EDR3 to Gaia DR3 directly by `source_id` and record unmatched enrichment.
- Build deterministic cross-catalogue identity edges and reject positional-only
  identity inference.
- Allocate and preserve catalogue-independent stable IDs through the append-only
  identity registry, with a singleton component and system fallback for otherwise
  ungrouped retained source records.
- Derive deterministic source-backed fallback names and propose the sole component
  as the position of an automatically retained singleton system.
- Bind the complete reconciled candidate document into the review layer by checksum;
  refresh must never accept that checksum implicitly.
- Reconcile CNS5 and WDS component membership into stable application systems.
- Establish the complete initial landmark roster enumerated by the pipeline document,
  including its explicit multiple-system membership expectations.
- Select component geometry through the accepted GCNS-then-CNS5 precedence and
  select the system node through the reviewed adopted component or source-supplied
  system position.
- Preserve canonical Sun-centred Galactic Cartesian parsec coordinates and the
  existing right-handed scene mapping.
- Derive approximate component presentation through the documented source
  precedence, with an explicit neutral fallback.
- Deduplicate overlapping neighbourhoods by stable system identity.
- Emit source provenance and per-anchor coverage proof.
- Replace the Gaia-only raw schema, runtime schema, generators, validators, fixtures,
  tests, attributions, and directly affected documentation.
- Measure generated size and map interaction performance.

## Generated-artifact expectations

The target logical inputs and outputs are defined in
`../data/astronomy-pipeline.md`. Implementation must provide:

- one normalized extract and manifest per external source;
- the complete pinned WDS catalogue in deterministic compressed form plus its format
  contract, so candidate selection is independently reproducible;
- project-owned stable-identity registry, deterministic system candidates, reviewed
  candidate-snapshot acceptance and overrides, and landmark records;
- schemas covering source-specific nullability and provenance;
- one deterministic runtime astronomy document; and
- independent validation that reconstructs source selection, joins, membership,
  geometry, presentation derivation, and coverage.

Exact artifact names may change only when the task, pipeline documentation, schemas,
and package commands change together.

## Out of scope

- Runtime catalogue APIs.
- Narrative overlays, fictional stellar state, supernova transitions, or spoiler
  behavior.
- Coordinates invented from book text, names, aliases, or unreviewed positional
  matches.
- Literal component or orbital positions on the interstellar map.
- Dynamic orbital propagation.
- Planets or rich descriptions beyond what is necessary for system identity.
- Narrative marker rings, contextual search, or inspector integration owned by
  BOB-014.
- Silently accepting a partial sphere at any source boundary.

## Acceptance criteria

1. ADR-0011, the technical design, and the astronomy-pipeline documentation agree on
   source roles, boundaries, precedence, joins, reconciliation, and refresh.
2. One validated configuration value defaults the context radius to exactly `20 ly`
   and no production radius literal is duplicated elsewhere.
3. Source refresh uses the exact pinned GAVO `gcns.main` and `cns5update.main`, Gaia
   DR3, and WDS file contracts and produces independently pinned extracts and
   manifests. The complete compressed WDS catalogue and format file are committed,
   checksum-validated inputs rather than discarded downloads.
4. Inside 25 pc, expected inclusion equals the CNS5/GCNS union; between 25 and 100 pc,
   expected inclusion follows GCNS; no missing Gaia enrichment removes a selected
   record.
5. GCNS/EDR3-to-DR3 joins use decimal-string `source_id` with complete matched,
   unmatched, and duplicate accounting.
6. CNS5/WDS/review reconciliation assigns every emitted component to exactly one
   stable system and records the reason for each accepted cross-source identity.
   Every otherwise ungrouped retained source becomes a singleton component and
   system rather than disappearing.
7. The identity registry deterministically reuses existing IDs, allocates monotonic
   opaque IDs only during explicit refresh, tombstones removed identities, and
   rejects unreviewed merge or split churn.
8. Every automatically retained singleton receives a deterministic source-backed
   preferred-name candidate and proposes its sole mapped component as its system
   position without requiring a hand-authored per-system override.
9. Every system and named component in the complete initial landmark roster is
   present, including Sirius A/B, Procyon A/B, and Alpha Centauri
   A/B/Proxima as one three-component system.
10. The landmark roster is schema-validated, provenance-neutral, and enforced by
   independent validation.
11. Generation emits the deduplicated system union for every promised neighbourhood
   and fails if a required sphere crosses the 100 pc GCNS boundary.
12. Every non-Sol anchor is bootstrapped from an exact GCNS or CNS5 source record
    before query-envelope planning; prior runtime coordinates are comparison evidence
    only.
13. The review layer accepts the exact complete system-candidate document by SHA-256;
    generation rejects a stale checksum, unresolved ambiguity, or invalid override,
    and refresh never accepts its own candidates implicitly.
14. Component-position precedence is GCNS median Bayesian Cartesian geometry, then a
    reviewed CNS5 astrometry candidate transformed by Astropy; explicit overrides are
    required for conflicts and ambiguous multiple-system positions, and no position
    is invented.
15. Canonical coordinates, unit conversion, scene mapping, nominal system-level
    inclusion, and true linear geometry retain regression coverage.
16. Every component retains applicable catalogue identifiers, system membership,
    enrichment, presentation derivation, and provenance; missing optional values
    remain explicit nulls.
17. Runtime output is deterministic, committed, static, free of network requests, and
    within the 2,000-node and 5 MiB budgets.
18. Camera reset, selection, picking, and limited label density remain usable at the
    generated catalogue size.
19. Source acknowledgements and operator refresh instructions cover all active
    catalogues.

## Validation commands

Implementation must preserve these existing user-facing command contracts:

```bash
npm run data:refresh
npm run data:generate
npm run data:test
npm run data:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

`npm run data:refresh` is the only networked command and remains an explicit operator
action. Every remaining command uses committed inputs. Implementation may add focused
commands, but it must not remove these wrappers or claim commands that do not exist.

## Required negative coverage

Automated validation must reject:

- missing Sirius or Procyon;
- Alpha Centauri collapsed to Proxima alone;
- a CNS5-only source lost through an inner join;
- an ungrouped GCNS or CNS5 record silently omitted instead of emitted as a singleton
  system;
- a stable identity renumbered, reused after tombstoning, or merged/split without
  review;
- an automatically retained singleton without a fallback name or adopted
  system-position component;
- a stale or implicitly accepted system-candidate checksum;
- a WDS candidate selection that differs from a fresh derivation over the committed
  complete WDS snapshot;
- a new non-Sol anchor planned from a prior runtime coordinate without an exact
  source-backed bootstrap record;
- ambiguous WDS membership accepted without review;
- one component assigned to two systems;
- an unsupported cross-release Gaia `source_id` join;
- altered source manifests or checksums;
- an incomplete expected source union; and
- a required sphere crossing the 100 pc boundary.

## Risks

- Multiple catalogues increase acquisition and reconciliation complexity.
- GCNS and CNS5 use different selection goals near their boundaries.
- WDS pair records do not directly encode an unambiguous physical hierarchy.
- Continuously updated WDS data can cause membership churn unless snapshots and
  review decisions are pinned.
- Source-specific aliases and IDs can accidentally merge unrelated stars.
- The 100 pc GCNS boundary may block a future distant narrative anchor.
- The union can grow sharply as mapped anchors spread.
- Performance optimization may add level-of-detail rendering, but it must preserve
  stable identity, canonical positions, searchability, and picking.

## Current implementation gap

The 2026-07-26 Gaia-only implementation remains useful historical evidence but does
not satisfy this revised task:

- its source-relative snapshot contains 73 Gaia DR3 records grouped into 70 non-Sol
  systems plus Sol;
- Sirius and Procyon are absent;
- Alpha Centauri is represented only by the Proxima Gaia source; and
- its validators prove the obsolete Gaia-only contract rather than the ADR-0011
  source union.

No implementation of ADR-0011 is authorized merely by this task becoming Ready. The
Captain must explicitly say `proceed` or `make it so`.
