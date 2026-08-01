# BOB-20260801-84GHPG: single selected-system caption

Status: In progress
Phase: 2 (map visual refinement)
Last updated: 2026-08-01

## Objective

Remove the redundant adjacent text label from the selected-system corner frame. The
existing collision-managed caption below the selected star is the sole persistent
map-name surface for a selected system.

## User-visible outcome

Selecting a star system shows its corner frame and the existing small caption below
the star, without a second, larger caption to the right. Hovering still shows its
temporary tooltip as the system's sole name surface while hovered.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially the Phase 2 map caption and selection rules
- `../implementation-plan.md`, Phase 2
- `../design/phase-2-desktop-ui.md`, Sections 8.2 through 8.4
- `../visual-testing.md`
- `BOB-034-expressive-starfield-visual-hierarchy.md`

This task supersedes the current integrated selected-frame adjacent-label rule. It
does not alter BOB-034's historical task record or its accepted completion evidence.
No ADR is required: canonical geometry, data, rendering engine, selection identity,
spoiler visibility, and interaction model remain unchanged.

## In scope

- Render the selected corner frame without an adjacent text label.
- Retain the collision-managed below-star caption for selected systems.
- Retain that below-star caption when the selected system is astronomy-only; it is
  temporary selected-state UI, not a persistent astronomy-only caption.
- Retain hover-tooltip behavior, including suppression of the hovered system's map
  caption while its tooltip is visible.
- Remove obsolete selected-label CSS and assertions.
- Update current integrated design and visual-testing documentation.

## Out of scope

- Caption collision-priority changes.
- Selection-frame geometry, selection behavior, picking, focus, camera movement, or
  inspector changes.
- Active-ring, hover-tooltip, system-view, data, or narrative-model changes.
- Rewriting historical task acceptance criteria or completion evidence.

## Acceptance criteria

1. A selected system renders its existing outer corner frame without an adjacent
   selection text label.
2. The selected system's collision-managed map caption remains the only persistent
   selected-state map-name surface and appears below the star, including when the
   selected system is otherwise astronomy-only.
3. Hovering continues to use the tooltip as the hovered system's sole map-name
   surface; the plain caption returns after hover ends.
4. Browser regression coverage asserts the absence of the obsolete selection label
   and the presence of the selected system's below-star caption after selection.
5. Current technical design, Phase 2 design, and visual-testing guidance describe
   the single-caption behavior; historical BOB-027 and BOB-034 records remain
   unchanged.
6. Focused browser, static type, lint, formatting, and task-metadata validation
   pass, an independent implementation review reports `No findings.`, and a remote
   workstation review verifies the single below-star caption plus corner frame in
   each available supported browser. Any unavailable browser is recorded as an
   acceptance gap.

## Documentation and generated artifacts

- Update `docs/technical-design.md`, `docs/design/phase-2-desktop-ui.md`, and
  `docs/visual-testing.md` as the current integrated contracts. Do not modify the
  historical BOB-027 or BOB-034 task records.
- No runtime data, narrative manifest, or other generated artifact is expected to
  change. Revert any incidental generated output before completion.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test:e2e -- --grep "selection|caption|hover"
```

From a remote workstation in every available supported browser, select a
narrative-known and an astronomy-only system, move the pointer off each marker, and
confirm its only persistent map name is the collision-managed caption below the star
while the corner frame remains visible. Hover both systems and confirm the tooltip
temporarily replaces that caption. Record browser results and unavailable-browser
gaps in this task's completion notes.

## Risks and resolved decisions

- The Captain explicitly chose the under-star collision-managed caption as the
  selected system's single persistent name surface on 2026-08-01.
- The caption controller already reserves selected systems at the highest priority;
  this task does not alter that priority or collision behavior.
