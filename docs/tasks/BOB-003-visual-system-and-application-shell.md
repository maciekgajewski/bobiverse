# BOB-003: visual system and application shell

Status: Done
Phase: 2 (visual foundation)
Last updated: 2026-07-23

## Objective

Establish an original, accessible visual system and responsive application shell for
the future spoiler-safe narrative interface. Preserve the accepted astronomy-map
exploration flow as the only live content, but retire the two-system distance
measurement tool. The shell must be ready for future content without pretending that
search, a timeline, or narrative data already exist.

## Binding references

- `../design/README.md` and its reference concepts (atmosphere and composition only)
- `../technical-design.md`, especially Sections 5, 7, 9, 10, and 11
- `../implementation-plan.md`, Phases 1A and 2
- `../visual-testing.md`
- `BOB-001-nearby-star-map.md` (historical completed-slice record)
- `../../AGENTS.md`

## Decisions

- Preserve the working astronomy map, system directory, selection, inspection facts,
  unit selection, and reset control. Restyle and recompose them; do not create a
  duplicate navigation or selection model.
- Retire the visible measurement mode, endpoints, line, labels, panel, controls, and
  test flows. Keep canonical coordinate and separation-domain logic for later use.
- Bundle local, open-licensed Noto Sans resources for UI and display typography, with
  Latin Extended, Greek, and Cyrillic coverage. Do not use a runtime font service or
  browser-selected substitute glyphs for those scripts. Commit the relevant licence.
- On phones, keep the map first. A command-bar control opens the browser panel; a
  selected system opens the inspector as a non-animated bottom panel. Both are real,
  accessible interaction states, not decorative mocks.

## In scope

- Centralized custom-CSS tokens for colour, semantic text, spacing, dimensions,
  borders, radii, shadows, glows, z-index layers, and motion.
- Local Noto Sans font-face declarations, licence asset, and role-based typography for
  display, commands, panel headings, metadata, body copy, and numerical facts.
- Layered dark surfaces, original border treatments, restrained cyan and warm stellar
  accents, and explicit hover, selection, disabled, error, and focus states.
- A desktop grid of command bar, browse rail, map stage, and inspector rail. Existing
  astronomy directory and selected-system facts are the only populated panel content.
- Labelled empty future-facing browser and inspector regions where needed, without
  fictional data, search, timeline controls, tabs, or inactive-looking actions.
- Responsive desktop (`>= 1200px`), compact (`768px–1199px`), and phone (`< 768px`)
  compositions; fluid CSS within those ranges is permitted.
- Phone browser and inspector behavior, including Escape, visible close controls,
  focus containment, and focus return to the invoker.
- Accessibility foundations: skip link, named landmarks, semantic headings, keyboard
  operation, visible focus, non-colour-only state cues, WCAG 2.2 AA text contrast,
  44-by-44 CSS-pixel phone targets, reduced motion, and zoom/reflow resilience.
- Measurement-UI removal and directly affected UI, tests, documentation, and
  accessibility behavior.

## Out of scope

- Search, filters, saved items, command palette, bookmarks, keyboard shortcuts, or
  query persistence.
- Narrative JSON, reader progress, spoiler logic, chapter navigation, timeline state,
  events, characters, locations, images, or book-derived content.
- New map geometry, catalogue records, astronomy generation, canonical-coordinate
  changes, or visual changes that impair true-scale map use.
- Elaborate animation, draggable or resizable panels, swipe gestures, a general
  drawer framework, new UI frameworks, a second 3D engine, runtime services, web-font
  services, copied assets, or resemblance-based recreation of the reference concepts.
- Rewriting BOB-001's historical acceptance evidence.

## Acceptance criteria

1. The CSS exposes a documented token system; shell components use no unscoped ad-hoc
   colour, spacing, border, z-index, or transition values.
2. UI and display type render from bundled, open-licensed Noto Sans resources with no
   runtime font request. Polish, Czech, Hungarian, Romanian, Greek, and Cyrillic test
   strings render from the declared font faces rather than browser fallback.
3. At 1200 CSS pixels or wider, command bar, browse rail, map stage, and inspector
   rail are distinct and the page has no horizontal scroll.
4. The existing directory still selects an astronomy system, and selected-system facts
   remain ordinary DOM content in the inspector.
5. The command bar contains only implemented controls: reset and distance-unit
   selection remain usable; no search or narrative action is presented as working.
6. The browser and inspector shells make their future capacity clear without
   fabricated narrative data or placeholder prose resembling book content.
7. Compact layouts keep the map dominant while browser and inspector content remain
   reachable without clipping or horizontal page scroll.
8. On phones, a labelled command-bar button opens/closes the browser; selection opens
   the inspector bottom panel. Escape and close controls close them, restore focus to
   their invoker, and prevent focus disappearing behind an open panel.
9. The phone inspector is absent before selection, exposes the same DOM facts as
   desktop when open, and dismisses without clearing selection.
10. Keyboard users can reach skip, command, directory, map fallback, inspector, and
    panel controls in a visible focus order. Hover is never the sole state signal.
11. Text and interactive states meet the documented contrast requirement; focus is
    visible on every surface; the page works at 200% zoom and with reduced motion.
12. No measurement button, endpoint state, line, marker label, panel, output, or
    user-facing wording remains. Selection and reset continue to work.
13. Unit/component and Playwright tests cover the shell, phone panel states,
    keyboard/focus paths, font-face contract, selection, units, reset, and absence of
    measurement UI.
14. `README.md`, `technical-design.md`, `implementation-plan.md`, and
    `visual-testing.md` describe the no-measurement product accurately, while BOB-001
    remains an explicit historical record.
15. Manual remote review covers current Chrome, Firefox, Edge, and mobile Chrome;
    unavailable Safari coverage remains the recorded pre-publication gap.

## Validation commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm run validate
git diff --check
```

For manual review, run `npm run dev`; inspect desktop, compact, and phone widths,
keyboard paths, 200% zoom, reduced motion, and local font rendering. Preserve normal
Playwright failure artifacts under `test-results/` and `playwright-report/`.

## Risks and cautions

- Reference images are mood and composition only: do not copy their text, data, icons,
  geometry, imagery, or controls.
- Replace BOB-001 measurement regression coverage with BOB-003 coverage; do not leave
  broken tests or silently delete evidence.
- Placeholders must not imply narrative facts or weaken the future spoiler boundary.
- Review font subsets and `unicode-range` declarations together; fallback rendering is
  a broken localization contract for the required scripts.
- The canvas is not accessibility content; selected-system facts stay in the DOM.

## Completion evidence

Automated evidence recorded on 2026-07-23:

- `npm run validate` passes formatting, linting, strict TypeScript, astronomy-data
  validation, 26 unit/component tests, and the production build.
- `npm run test:e2e` passes the browser, inspector, compact viewport, short-viewport,
  and desktop-footer flows in Chromium, Firefox, and WebKit.
- The browser suite verifies that the phone map canvas has nonzero height, compact
  selection opens an in-viewport inspector, short phone viewports do not create page
  scrolling, and the VizieR attribution footer remains in the desktop viewport.

Manual acceptance recorded on 2026-07-23:

- The Captain completed visual and manual inspection, including responsive map,
  inspector, framing, and footer behavior, and accepted the result.
