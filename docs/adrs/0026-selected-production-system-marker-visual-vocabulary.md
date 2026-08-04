# ADR-0026: selected production system-marker visual vocabulary

Status: Superseded by ADR-0027
Date: 2026-08-04

## Context

ADR-0025 established the narrative semantics, projection, aggregation, and initial
visual vocabulary for system-status markers. Its accepted concept sheet contains only
small raster examples for four subjects and no abandoned-world master artwork. Direct
traces and the initial original abandoned-world construction did not meet the
Captain's compact visual-quality threshold.

The icon-authoring task therefore presented clean project-owned vector
reconstructions and explicit alternatives on the real application surface. The
Captain selected the final production subjects at 16, 20, and 24 CSS-pixel sizes.

## Decision

Preserve every narrative, projection, aggregation, ordering, overflow, collision,
colour, and accessibility decision in ADR-0025. Refine only its exact production
status-icon shapes:

- colony: the selected twin-domes settlement;
- homeworld: a globe with a distinct stellar home spark;
- abandoned or destroyed homeworld: the selected barred decommissioned-world globe,
  replacing ADR-0025's cracked planet with broken orbital arc;
- possible colony target: a clean ringed candidate planet;
- prominent installation: a balanced four-axis hub.

The registered SVGs below `public/assets/system-markers/` are the authoritative
geometry. Downstream consumers use those assets and must not redraw approximations.
The existing ice-white, gray, bright-green, and pale-violet presentation colours stay
unchanged. Shape and accessible text, not colour alone, communicate status.

## Consequences

- The later map-marker task consumes the reviewed production assets directly.
- The abandoned-world symbol communicates unavailable or decommissioned status
  rather than depicting one specific physical failure mode.
- The asset revision does not change what qualifies as abandoned or destroyed, how
  status is projected, or how marker rails aggregate and render.
- Visual testing names the selected shapes instead of the rejected trace subjects.

## Alternatives considered

1. Keep direct traces of the small concept examples. Rejected because their raster
   geometry produced poor compact vectors.
2. Use bitmap markers. Deferred because clean vectors met the quality threshold while
   preserving monochrome masks and scaling.
3. Keep the cracked abandoned-world construction. Rejected after visual review in
   favor of the selected barred decommissioned-world globe.
4. Use dome-cluster, command-dome, or linked-habitat colony variants. Rejected in
   favor of the selected twin-domes settlement.

## Follow-up

- Complete visual acceptance in `BOB-20260803-G3N1GQ`.
- Consume the registered production SVGs without reinterpretation in
  `BOB-20260803-X52E0D`.
