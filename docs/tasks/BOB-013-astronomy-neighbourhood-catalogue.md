# BOB-013: guaranteed astronomy neighbourhood catalogue

Status: Draft
Phase: 1B (required by Phase 2)
Last updated: 2026-07-26

## Objective

Replace the fixed nearest-20 astronomy scope with a reproducible static catalogue that
guarantees every available stellar system within a configurable context radius around
each mapped narrative stellar system.

## User-visible outcome

Every narrative-known mapped system sits in an honest local stellar neighbourhood.
The default map shows astronomy context out to 20 light-years around each known
system, rather than becoming empty or misleading away from Sol.

## Binding references

- `../design/phase-2-desktop-ui.md`, especially Section 8.1
- `../technical-design.md`, Sections 4, 5, 8, and 12
- `../implementation-plan.md`, Phases 1B and 2
- `../data/astronomy-pipeline.md`
- `BOB-001-nearby-star-map.md`
- `../../AGENTS.md`

## Decisions

- Context coverage is a generation-time guarantee, not a best-effort runtime filter.
- One explicit validated static configuration value defines the radius in light-years
  and defaults to `20`.
- The same value drives import coverage, validation, runtime filtering, tests, and UI
  wording.
- One map node remains one stellar system. Catalogue components must be reviewed into
  system membership before rendering.
- Runtime remains static and makes no astronomy request.

## Unresolved decisions

- Select and document one or more pinned astronomy sources capable of providing
  coverage around every currently mapped narrative system. CNS5's local-volume limit
  may be insufficient for later anchors.
- Define the operator acquisition action, source licence/acknowledgement, refresh
  procedure, stable identifiers, uncertainty policy, and component-to-system review
  method for any added source.
- Define the explicit configuration file path and schema. The preferred direction is
  one project-owned JSON record such as `data/config/map-display.json`, not duplicated
  Python and TypeScript constants.
- Establish performance and label/picking budgets after measuring the generated union
  for current mapped anchors.

These decisions require Captain review. This task cannot become `Ready` until they are
resolved and any source-authority change is recorded in an accepted ADR.

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

This section must be finalized before the task becomes `Ready`. At minimum:

1. An accepted source decision documents coverage, identifiers, provenance, rights,
   acquisition, and refresh.
2. One validated configuration value defaults the context radius to exactly `20 ly`
   and no production radius literal is duplicated elsewhere.
3. Generation emits the deduplicated union of every promised neighbourhood.
4. Validation independently proves every emitted system's inclusion and every
   anchor's source-available completeness.
5. Canonical coordinates, unit conversion, scene mapping, and true linear geometry
   retain regression coverage.
6. Every rendered component retains reviewed spectral class and radius provenance.
7. Runtime output remains deterministic, committed, static, and free of network
   requests.
8. Camera reset and map interaction remain usable at the measured catalogue size.
9. Source acknowledgements and refresh instructions are updated.

## Validation commands

Final source-specific acquisition and coverage commands must be established before
`Ready`. The minimum existing validation path remains:

```bash
./.venv/bin/python scripts/validate_data.py
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

## Risks

- A catalogue boundary can create a visually plausible but incomplete context sphere.
- More distant catalogues may have different component identity, uncertainty, and
  licensing constraints from CNS5.
- The union can grow sharply as mapped anchors spread through the narrative.
- Performance optimization may add level-of-detail rendering, but it must preserve
  canonical positions, system identity, searchability, and picking.
