# ADR-0027: final production system-marker visual vocabulary

Status: Accepted
Date: 2026-08-04

## Context

ADR-0026 recorded clean vector replacements for status icons that could not be traced
faithfully from the small concept examples. Subsequent compact review rejected its
ringed possible-colony-target world because the silhouette still read as an eye. Four
new project-owned vector alternatives were reviewed at 20, 32, and 48 CSS pixels, and
the Captain selected the crosshair world.

## Decision

Supersede ADR-0026 while preserving every narrative, projection, aggregation,
ordering, overflow, collision, colour, and accessibility decision in ADR-0025. The
final production status-icon shapes are:

- colony: the selected twin-domes settlement;
- homeworld: a globe with a distinct stellar home spark;
- abandoned or destroyed homeworld: the selected barred decommissioned-world globe;
- possible colony target: the selected crosshair world;
- prominent installation: a balanced four-axis hub.

The registered SVGs below `public/assets/system-markers/` are authoritative.
Downstream consumers use those assets and do not redraw approximations. Existing
ice-white, gray, bright-green, and pale-violet presentation colours remain unchanged.
Shape and accessible text, not colour alone, communicate status.

## Consequences

- The possible-colony-target icon communicates an explicitly designated candidate
  and no longer resembles an eye or an ordinary ringed planet.
- The later map-marker task consumes the reviewed production assets directly.
- No narrative qualification, spoiler projection, aggregation, or rendering behavior
  changes.

## Alternatives considered

1. Keep ADR-0026's ringed candidate planet. Rejected because its compact silhouette
   read as an eye.
2. Use a bracketed world. Rejected in favor of the Captain-selected crosshair world.
3. Use a surveyed orbit or candidate beacon. Rejected because their extra marks were
   less direct at compact size.

## Follow-up

- Complete visual acceptance in `BOB-20260803-G3N1GQ`.
- Consume the registered production SVGs without reinterpretation in
  `BOB-20260803-X52E0D`.
