# BOB-20260803-RJ2R0R: persistent depth-faded map captions

Status: Done
Phase: 2 (map visual refinement)
Last updated: 2026-08-03

## Objective

Replace collision-driven disappearance of caption-eligible narrative-known stellar-
system labels with stable, overlap-aware camera-depth fading.

## User-visible outcome

Narrative-known system labels remain present while the reader rotates, pans, and
zooms the interstellar 3D map. When labels overlap in screen space, the camera-nearest
label remains fully opaque and deeper ordinary labels fade progressively, never below
30% opacity, instead of popping out of view. Selected and active labels remain fully
opaque even when they are not nearest.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially the Phase 2 map caption and selection rules
- `../implementation-plan.md`, Phase 2
- `../design/phase-2-desktop-ui.md`, Sections 8.2 through 8.4
- `../visual-testing.md`
- `BOB-034-expressive-starfield-visual-hierarchy.md`
- `BOB-20260801-84GHPG-single-selected-system-caption.md`
- `../adrs/0018-narrative-known-star-footprint.md`
- `../adrs/0019-bob-034-software-renderer-performance-budget.md`
- `../adrs/0022-classical-and-reader-visible-system-naming.md`

This task supersedes the current integrated rule that ordinary colliding captions
may disappear. It does not rewrite the historical completion evidence in BOB-014 or
BOB-034. No ADR is required: caption eligibility, narrative visibility, canonical
geometry, selection identity, and the rendering architecture remain unchanged.

## In scope

- Keep every in-frustum, caption-eligible narrative-known system caption rendered on
  the interstellar map.
- Detect pairwise screen-space caption overlaps using the existing width and height
  thresholds. Treat every connected component of that overlap graph, including
  transitive overlaps, as one overlap group.
- Order every member of an overlap group by projected camera depth, nearest first,
  breaking equal-depth ties by stable system ID. Assign opacity by zero-based depth
  rank as `max(0.3, 1 - 0.35 * rank)`: `1` for the nearest member, `0.65` for the
  second, and `0.3` for every later member.
- Keep selected and active captions fully opaque regardless of overlap.
- Preserve the hovered system's reserved collision slot while its tooltip temporarily
  replaces its ordinary caption.
- Smooth opacity changes so camera movement produces fades rather than abrupt visual
  changes.
- Add domain regression coverage and update the current integrated caption and visual-
  testing contracts.

## Out of scope

- Adding persistent captions for astronomy-only systems.
- Moving captions, adding leader lines, clustering, changing label typography, or
  changing the existing screen-space collision footprint.
- Changing caption eligibility, narrative projection, reader-progress behavior,
  display-name precedence, marker geometry, canonical coordinates, picking, focus,
  selection, or camera controls.
- Changing entered-system labels or the rule that interstellar captions are absent in
  entered-system mode.
- Rewriting historical task acceptance criteria or completion evidence.

## Acceptance criteria

1. Every in-frustum caption-eligible narrative-known system has a rendered map label;
   ordinary labels are not removed because of screen-space collision.
2. Pairwise overlaps use the existing `144` by `26` pixel thresholds, and transitive
   overlaps form one connected group. Each group is ordered by projected camera depth,
   nearest first, with stable system ID as the equal-depth tie-break. Its zero-based
   ranks receive `max(0.3, 1 - 0.35 * rank)`, yielding `1`, `0.65`, and then the `0.3`
   floor. A non-overlapping caption is a one-member group and therefore has opacity
   `1`.
3. Selected, active, and hovered candidates participate in overlap grouping and depth
   ranks so their reserved slots keep surrounding ordinary-label treatment stable.
   Selected and active captions are then forced to opacity `1`; the hovered tooltip is
   the hovered system's sole name surface and its hidden ordinary caption's computed
   opacity is not displayed. A priority candidate behind a nearer ordinary caption
   therefore remains fully opaque without dimming that nearer caption.
4. Caption opacity changes use a short visual transition when reduced motion is not
   requested and never animate label position or change star-system geometry. Under
   `prefers-reduced-motion: reduce`, the existing global rule makes opacity changes
   effectively immediate.
5. Astronomy-only systems remain without persistent captions, except for the existing
   temporary selected-state caption. Entered-system behavior remains unchanged.
6. Unit coverage verifies non-overlap, direct and transitive overlap groups, the exact
   opacity progression and floor, deterministic equal-depth handling, out-of-frustum
   exclusion, and selected, hovered, and active priority behavior. One fixture must
   combine a transitive group with selected, active, and hovered candidates and assert
   every resulting opacity.
7. Current technical design, Phase 2 design, and visual-testing guidance describe the
   persistent depth-faded collision behavior; historical task records remain
   unchanged.
8. Task metadata, formatting, lint, type checking, unit tests, the production build,
   and focused browser regression coverage pass. An independent implementation review
   reports `No findings.` A remote-workstation review confirms legibility and stable
   fades in every available supported browser; unavailable browsers are recorded as
   acceptance gaps.

## Documentation and generated artifacts

- Update `docs/technical-design.md`, `docs/design/phase-2-desktop-ui.md`, and
  `docs/visual-testing.md` as the current integrated contracts.
- No astronomy, narrative, manifest, or other generated runtime-data artifact is
  expected to change. Revert any incidental generated output before completion.

## Validation

```bash
python3 scripts/tasks.py check
npm run validate
npm run test:e2e -- --grep "caption|hover|selection"
npm run performance:map
git diff --check
```

From a remote workstation in every available supported browser, create dense caption
overlap by rotating, panning, and zooming the interstellar map. Confirm that every
narrative-known caption remains present, nearer ordinary labels dominate deeper ones,
no caption becomes unreadably faint or pops out, and transitions remain calm. Confirm
selected and active captions stay fully opaque, hover still provides the sole hovered
name surface, astronomy-only systems remain unlabeled, and entering and exiting a
system preserves the established interstellar-caption behavior. Repeat the overlap
check with reduced motion requested and confirm opacity changes become effectively
immediate without label disappearance. Record browser results and unavailable-browser
gaps in this task's completion notes.

## Implementation status

Implemented on 2026-08-03. The opacity resolver now builds connected screen-overlap
groups, assigns deterministic camera-depth ranks, and returns nonzero opacity for
every eligible in-frustum caption. Map rendering applies the opacity with the accepted
transition, keeps selected and active captions opaque, and checks current eligibility
at render time so temporary astronomy-only hover or selection state cannot leave a
stale caption. Unchanged star markers are memoized so caption-state updates do not
rerender the complete catalogue.

Automated validation passed:

- `python3 scripts/tasks.py check`: 48 task files;
- `npm run validate`: 78 Python tests and 203 frontend tests, data and narrative
  validation, formatting, lint, type checking, production build;
- `npm run test:e2e -- --grep "caption|hover|selection"`: 12 Chromium, Firefox, and
  WebKit cases;
- `npm run performance:map`: SwiftShader median `16.7 ms`, p95 `33.4 ms`, maximum
  `33.5 ms`, with all ADR-0019 budgets passing; and
- `git diff --check`.

The final independent implementation review reported `No findings.`

On 2026-08-03, the Captain visually approved the implemented label treatment from the
remote workstation. This closes the dense-overlap, transition, and legibility review;
the specific manual browser inventory was not separately enumerated. The task is
`Done`.

## Risks and resolved decisions

- On 2026-08-03, the Captain limited the change to currently caption-eligible
  narrative-known systems and chose fixed-position camera-depth fading rather than
  offset labels.
- The 30% floor trades some residual overlap for persistent identity and avoids
  making deeper labels effectively disappear.
- Depth means projected camera depth, not canonical Galactic `Zg`; rotating the view
  therefore changes visual hierarchy according to what is actually nearer the reader
  without changing stored geometry.
- Rapid overlap-boundary changes can flicker. A short opacity transition is required
  under ordinary motion preferences; the existing reduced-motion override makes the
  opacity change effectively immediate when reduced motion is requested.
