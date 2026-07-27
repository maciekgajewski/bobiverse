# BOB-014: narrative-aware map integration

Status: Blocked
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-27

## Prerequisites

- BOB-010 provides generated activity.
- BOB-012 provides generic selection, browser, and inspectors.
- BOB-013 provides the validated astronomy neighbourhood catalogue and radius
  configuration.

BOB-013 was reopened under ADR-0011 after the Gaia-only catalogue failed recognizable
local-completeness review. This task remains blocked until the reconciled
GCNS/Gaia/CNS5/WDS catalogue passes BOB-013.

## Objective

Join the selected narrative world state to the guaranteed astronomy context and make
known, active, hovered, selected, and astronomy-only systems visually and
interactively distinct on the true-scale map.

## User-visible outcome

The map shows every mapped system known in the chosen world state with a readable
narrative marker, surrounds it with unlabeled local astronomy context, and coordinates
selection with the browser and inspector.

## Binding references

- `../design/phase-2-desktop-ui.md`, especially Sections 6 through 9 and 11
- `../design/reference/desktop-narrative-map-markers.png`
- `../technical-design.md`, Sections 8 through 12
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `BOB-010-important-mentions-and-narrative-activity.md`
- `BOB-012-progressive-object-browser-and-inspectors.md`
- `BOB-013-astronomy-neighbourhood-catalogue.md`
- `BOB-005-galactic-starfield-backdrop.md`
- `../../AGENTS.md`

The reference image contains illustrative, non-canonical labels and values, including
both real astronomy designations and invented examples. It specifies marker hierarchy
and atmosphere only.

## In scope

- Join eligible mapped narrative star systems to validated astronomy nodes.
- Filter the static catalogue to the union of configured-radius neighbourhoods around
  currently eligible known systems.
- Render astronomy-only, narrative-known, active, selected, and hovered states using
  the approved geometric hierarchy.
- Keep catalogue-derived component colour families, the fixed marker radius, and
  existing decorative component clusters intact.
- Implement collision-managed captions with guaranteed selected, hovered, and active
  priorities.
- Keep narrative rings and captions screen-readable, non-raycastable, and centred on
  canonical system coordinates.
- Derive active systems from generated mapped activity ancestry.
- Add the temporary **Nearby astronomy** search group for matching in-scope context
  systems.
- Add the final query-only astronomy DOM path after BOB-012 removed the legacy
  full-catalogue directory. Do not restore that directory as an interim solution.
- Search astronomy preferred names and alternate designations only inside the current
  rendered context.
- Add the astronomy-only inspector and **Not story-known at this view** status.
- Coordinate browser, map, inspector, hover, selection, deselection, and camera focus.
- Automatically focus non-system objects only when they provide one unambiguous
  mapped context.
- Keep unmapped and locationless selections inspectable without moving the camera.
- Preserve existing camera interpolation, cancellation, viewing angle, reset,
  reduced-motion, scale, units, picking, grid, and backdrop behavior.
- Update directly affected documentation in the same change:
  - `README.md` for narrative marker, contextual astronomy search, and selection use;
  - `docs/technical-design.md` for map/join/selection behavior;
  - `docs/visual-testing.md` for every marker state, collisions, search, mapped and
    unmapped focus, WebGL fallback, backdrop hierarchy, and reduced motion;
  - `docs/data/astronomy-pipeline.md` only if consumption, provenance, or coverage
    validation changes;
  - this task's completion evidence and any documented deviations.

## Generated-artifact expectations

- This task consumes the BOB-013 generated astronomy catalogue and configuration plus
  BOB-010/BOB-011 narrative activity and projections. It does not hand-edit or create
  a second authority for any of them.
- Normal ignored browser build output is not committed.
- If a deterministic render-ready astronomy/narrative join artifact becomes
  necessary, define its path, schema, generator, freshness validation, and ownership
  in the integrated design before adding it. The normal build must reproduce it, and
  this task's validation commands and documentation must be updated.
- Source coverage or catalogue corrections remain BOB-013 work; narrative source
  corrections remain separately reviewed narrative work.

## Out of scope

- New narrative source fields or activity inference.
- Catalogue acquisition or coverage generation.
- Searching outside the currently rendered context.
- User-adjustable context radius.
- Routes, paths, ownership links, current-character-location inference, or invented
  coordinates.
- Mobile composition.

## Acceptance criteria

1. Every eligible mapped narrative system renders with a persistent single segmented
   known ring.
2. Systems active in the selected chapter/date render the distinct static double ring
   and outward tick; no animation is required.
3. Selected state retains its separate outer corner frame and does not obscure the
   component sprite or narrative rings.
4. Astronomy-only context systems have no persistent caption or narrative ring.
5. Selected, hovered, and active captions are never collision-suppressed; other known
   captions are suppressed only on collision and return as the view changes.
6. Narrative decoration does not change canonical coordinates, catalogue-derived
   marker presentation, measurement, camera targeting, or raycast priority.
7. Context filtering uses the one validated radius configuration and includes the
   deduplicated union around all eligible known-system anchors.
8. Astronomy search covers only that rendered union, appears only for a nonempty
   query, and does not alter the map scope.
9. Astronomy-only selection opens catalogue facts and provenance with an explicit
   non-narrative status.
10. Event, location, character-last-seen, unmapped, locationless, and astronomy-only
    selections follow the focus rules in the design.
11. Changing chapter/date removes out-of-scope context systems and atomically clears
    an ineligible selection.
12. Keyboard and WebGL-fallback paths expose equivalent selection and status
    information through DOM controls.
13. Every currently in-scope context system is searchable, selectable, and
    inspectable through the final DOM path without restoring the legacy
    full-catalogue astronomy directory.
14. Tests cover marker state geometry, label priorities, radius-union filtering,
    contextual search, focus/no-focus cases, selection invalidation, and unchanged
    true-coordinate behavior.
15. README, technical design, visual-testing instructions, affected astronomy
    pipeline documentation, and completion evidence accurately describe the final
    behavior and generated-artifact ownership.

## Validation commands

```bash
./.venv/bin/python scripts/validate_data.py
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

Manual desktop review must rotate, zoom, pan, select each marker state, create label
collisions, search an astronomy-only system, change chapter/date, test an unmapped
selection, reset the camera, and verify the Galactic backdrop remains subordinate.

## Risks and cautions

- Selection brackets, active rings, and component sprites occupy different semantic
  layers; merging them into one recoloured marker would violate the approved design.
- Label collision must not make a known system undiscoverable from keyboard/DOM
  controls.
- Context-system names are astronomy facts, not narrative knowledge. Their
  astronomy-only status must remain explicit wherever a name is revealed.
