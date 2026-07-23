# Visual and browser testing

Run the automated browser interaction suite on the headless development host:

```bash
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

Playwright writes reports to `playwright-report/` and retains screenshot, trace, and
video artifacts for failed tests under `test-results/`. Tests within each browser
project run serially to avoid exhausting headless software-WebGL resources; Chromium,
Firefox, and WebKit projects still run as separate required targets. Chromium and
WebKit use their headless modes. This host's Firefox headless mode does not expose a
WebGL context, so the Firefox project runs headed inside the disposable Xvfb display
created by `xvfb-run -a`; `npx playwright install --with-deps` supplies that system
dependency.

For manual acceptance, start `npm run dev` and open
`http://<development-host>:5173` from a trusted-LAN workstation. Test current Chrome,
Firefox, Safari, and Edge where available. Check rotate, zoom, pan, marker picking,
directory selection, reset, unit conversion, command-bar browser opening,
selected-system inspector behavior, and the phone-sized layout. Verify reduced-motion
behavior with the operating-system setting.

The headless development environment cannot substitute for manual GPU/browser review.
Record each unavailable browser explicitly as an acceptance gap before publication.

## Phase 1A manual acceptance

Manual and visual testing passed on 2026-07-22 in current Windows Chrome, Firefox,
and Edge. Mobile Chrome was also functional; its imperfect navigation is accepted for
the desktop-first Phase 1A scope and deferred for later responsive polish. Safari was
unavailable because no Apple test workstation was available, so Safari remains an
explicit required check before publication. The Captain accepted the Phase 1A visual
result and spatial legibility.

## BOB-003 manual acceptance

On 2026-07-23, the Captain accepted the visual-system and application-shell review.
The review covered the desktop framed shell, responsive map visibility, compact
browser and inspector panels, selected-system details, and the visible VizieR
attribution footer. Chrome, Firefox, and WebKit automated coverage also passed; the
existing Safari real-browser publication gap remains unchanged.

## Default and reset camera

The repeatable default camera pose is expressed in Three.js scene coordinates:

- Position: `(10.5, 8, 12)`.
- Controls target: `(0, 0, 0)`, the Sol-centered scene origin.
- Up direction: scene `+Y`, which is canonical Galactic `+Zg` (Galactic north).
- Perspective field of view: 47 degrees.

Reset cancels any in-progress automatic focus motion and restores both the camera
position and controls target to this pose. It does not change the selected system,
or active distance unit. During manual acceptance, move and rotate the camera, press
Reset view, and confirm that Sol is targeted from this same repeatable orientation.
