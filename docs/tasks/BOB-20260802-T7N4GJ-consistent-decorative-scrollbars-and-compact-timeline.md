# BOB-20260802-T7N4GJ: consistent decorative scrollbars and compact timeline

Status: In progress
Phase: 2 (visual-system refinement)
Last updated: 2026-08-02

## Objective

Apply the established decorative scrollbar treatment consistently to every
application-owned scrollable surface and reduce unnecessary horizontal space between
Chapter-mode timeline dots.

## User-visible outcome

Every application scrollbar has the same restrained visual treatment, including the
horizontal Chapter-mode timeline scrollbar. Chapter dots sit closer together so the
timeline is easier to scan and requires less horizontal scrolling.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially the visual language and responsive layout
  contracts
- `../implementation-plan.md`, Phase 2
- `../design/phase-2-desktop-ui.md`, especially the bottom progress and timeline dock
- `../visual-testing.md`
- `BOB-011-reader-progress-and-temporal-navigation.md`
- `BOB-036-chapter-inspector-and-compact-timeline.md`

No ADR is required: the change refines the existing visual system without changing
application architecture, timeline behavior, persisted state, data, or interaction
semantics.

## In scope

- Define one global CSS treatment for application-owned scrollbars, including thin
  Firefox scrollbars and decorative WebKit track, thumb, and hover states.
- Remove redundant component-specific scrollbar declarations superseded by the
  global treatment.
- Reduce Chapter-mode timeline entry width from `8.5rem` to `5.5rem` for both chapter
  entries and the zero-state entry.
- Reduce the Chapter-mode centerline's left and right endpoint insets from `4.25rem`
  to `2.75rem` so it remains centered on the first and last dots.
- Update current integrated design and visual-testing documentation.
- Add focused regression coverage for the global scrollbar contract and compact
  chapter spacing.

## Out of scope

- Styling browser-owned UI such as native select popups.
- Changing scrollbar behavior, overflow ownership, timeline interaction, labels,
  data, persisted progress, or responsive breakpoints.
- Changing Date-mode timeline scale or pan behavior.
- Rewriting historical task acceptance criteria or completion evidence.

## Acceptance criteria

1. Every application-owned scrollable surface inherits one decorative scrollbar
   treatment without requiring a component-specific selector.
2. The decorative treatment provides a thin scrollbar in Firefox and a styled track,
   thumb, and thumb-hover state in WebKit-derived browsers.
3. The horizontal Chapter-mode timeline uses the decorative treatment.
4. Chapter and zero-state timeline entries reserve `5.5rem` each instead of
   `8.5rem`, and the centerline uses matching `2.75rem` endpoint insets so it remains
   centered on the first and last dots; book dividers and timeline behavior remain
   unchanged.
5. Current technical design, Phase 2 desktop design, and visual-testing guidance
   require consistent decorative scrollbars and verify the denser timeline.
6. Focused tests, static validation, task-metadata validation, and an independent
   implementation review pass. The task remains `In progress` until the Captain
   manually accepts the visual result in a supported browser.

## Documentation and generated artifacts

- Update `docs/technical-design.md`, `docs/design/phase-2-desktop-ui.md`, and
  `docs/visual-testing.md` as current integrated contracts.
- Do not modify historical completed task records.
- No runtime data or generated artifact is expected to change.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test -- tests/unit/styles.test.ts
npm run test:e2e -- --grep "timeline"
git diff --check
```

From a remote workstation in each available supported browser, inspect the horizontal
Chapter-mode timeline, both side rails, a compact panel, and a long relationship list.
Confirm that their scrollbars share the decorative treatment and that chapter dots
are visibly denser, the centerline still terminates at the first and last dot centers,
and controls do not clip or overlap. Record unavailable browsers as an acceptance
gap.

## Risks and unresolved decisions

- Native scrollbar rendering varies by browser and operating system, so automated
  checks verify the CSS contract while final appearance requires manual browser
  inspection.
- `5.5rem` intentionally increases title truncation; full accessible labels remain
  available and chapter inspection remains the detail surface.
- No product decision remains unresolved. The Captain selected `5.5rem`, global
  application-owned scrollbar styling, and authorized implementation on 2026-08-02.
