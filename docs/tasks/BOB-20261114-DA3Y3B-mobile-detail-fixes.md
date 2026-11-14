# BOB-20261114-DA3Y3B: mobile detail-window fixes and disabled Enter system

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-14

## Objective and user-visible outcome

The Captain tried the deployed mobile layout (BOB-20261113-3VCGFP) on a phone and
asked for three fixes to the mobile detail window (the compact "Selected object"
panel):

- The big text **Close** button is replaced by a standard X close icon in the
  panel's top-right corner.
- The inspector's **Back** and **Forward** history arrows become proper tap-sized
  buttons on the same header row as the X.
- **Enter system** is hidden for now, because the guided system view is not
  finished. Its code stays behind a feature flag so it can come back easily.

Nothing else about behaviour, data, spoilers or persistence changes.

## Authorization

- Requested by the Captain on 2026-11-14 and relayed by Piotr Developer Manager as
  three numbered fixes: replace the Close button with an X icon, make the history
  buttons tap-sized and aligned with the header row, and disable Enter system behind
  a flag (on desktop too if it is the same half-finished flow).
- The manager asked for a separate local branch, a SHA for review and local
  validation under the no-PR flow in `../development-process.md`.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md`, Section 10 (updated by this task)
- `../design/phase-2-desktop-ui.md`, inspector history (updated by this task)
- `../design/guided-system-view.md`, Section 6.1 (disabled note added)
- `../visual-testing.md` (new section for this task)
- `BOB-20261113-3VCGFP-mobile-map-chrome.md` (the compact chrome this builds on)

## Scope

1. Close icon (`src/App.tsx`, `src/components/ProgressControls.tsx`,
   `src/styles.css`): every compact panel gets one sticky header row
   (`.compact-panel-header`). Its close control is a 44×44 round icon button
   (`CloseIcon` SVG, `aria-label="Close"`, `title="Close"`) at the top right. It stays
   first in the DOM, so it still takes initial focus. The close behaviour is
   unchanged: the X, Escape and the backdrop close the panel, and focus returns to
   the menu button.
2. History controls: in the compact inspector, `InspectorHistoryControls` renders in
   that header row, left of the X, with 44×44 buttons that keep their **Back** and
   **Forward** names. `ObjectInspector` gains `showHistoryControls` (default `true`),
   and the compact instance turns its in-body copy off, so there is one control. The
   desktop right-rail controls are unchanged.
3. Enter system: the new `src/features.ts` exports `ENABLE_ENTER_SYSTEM`, set to
   `false`. `ObjectInspector` renders the **Enter system** button only when the flag
   is on, and `enterSystemMode` in `App.tsx` returns early when it is off. Desktop and
   compact share the same `ObjectInspector` button and the same system-mode flow, so
   both are hidden. The system-view code, styles and tests are kept.
4. Tests:
   - The component tests that cover the system-view flow turn the flag on through a
     `vi.mock` of `src/features.ts`, so they keep running.
   - The three e2e system-mode tests call
     `test.skip(!ENABLE_ENTER_SYSTEM, ...)`, so they run again once the flag is on.
   - New tests check that the X closes the detail window and returns focus, that the
     history controls are in the header row, that the history buttons and X are at
     least 44px with aligned centres, and that Enter system is absent on phone and
     desktop.
5. Docs: technical design Section 10, the phase-2 inspector-history note, a disabled
   note in the guided system view design, and a new visual-testing section.

## Out of scope

- The chapter selector (**Read through**). A compact "#1 Ch 43" redesign is pending
  the Captain's approval.
- Removing or changing the guided system-view flow itself.
- Desktop inspector sizing, and any data, schema, projection or spoiler change.

## Acceptance criteria

1. At 390×844 the detail window shows no text Close button. A 44×44 X named
   **Close** sits in its top-right corner and closes the window, with focus returning
   to the menu button. Escape and backdrop dismissal still work.
2. **Back** and **Forward** are each at least 44×44 CSS px, keep their accessible
   names, sit left of the X, and have vertical centres within 1px of the X's.
3. No **Enter system** button appears on phone or desktop while
   `ENABLE_ENTER_SYSTEM` is `false`. Setting it to `true` restores the flow, and the
   kept tests cover it.
4. The desktop inspector keeps its small framed history arrows, and the layout is
   otherwise unchanged.
5. The chapter selector is unchanged.
6. All validation commands below pass.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
npx playwright test --project=chromium --workers=1
npx playwright test --project=firefox --workers=1   # via xvfb-run, as npm run test:e2e does
npx playwright test --project=webkit --workers=1
npx prettier --check <changed Markdown>
git diff --check
```

Manual: the Captain checks the detail window in a phone browser after deployment.

## Risks and decisions

- **All compact panels.** The X replaces the shared close control, so the menu,
  browser and timeline panels get it too, for consistency. Their close behaviour is
  unchanged.
- **Desktop Enter system hidden too.** The desktop button is the same component and
  starts the same half-finished flow, so the flag hides both, as the request allowed.
- **Flag form.** This is a compile-time constant, not a runtime or URL switch, so it
  cannot be toggled in production. Tests that need the flow on mock the module.
- **Focus order.** The X comes before the history arrows in the DOM, so it takes
  initial focus as before. The row is visually reversed (arrows left, X right).

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on origin/master `c825272` as the Captain's requested fixes of 2026-11-14,
  relayed by Piotr Developer Manager. Moved straight to In progress.
- Screenshots: `docs/design/artifacts/BOB-20261114-DA3Y3B-mobile-detail-fixes/`
  holds `phone-390x844-before.png` (master), `phone-390x844-after.png`,
  `phone-390x844-after-history.png` (Back enabled) and `desktop-1280x800-after.png`.
