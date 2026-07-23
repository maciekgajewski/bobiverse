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

## BOB-005 Galactic starfield backdrop

At desktop, compact, and phone widths, confirm that the permanent backdrop remains
subordinate to markers, labels, selected frames, the Galactic plane, orientation
aids, and the scale. The Galactic-plane grid should stay readable near the camera and
smoothly vanish in the distance rather than building visual density against the
backdrop. Orbit, pan, zoom, select, focus, reset, and switch both units; the
background and grid must not pick, obscure, clip, show a seam, or develop parallax.
At the documented reset pose, verify manually that the bright Galactic-centre feature
is in the `+Xg` direction. Verify the visible text-only source credit can receive
keyboard focus and opens the NASA source page. The backdrop does not animate, so
reduced-motion behaviour is unchanged.

## BOB-005 manual acceptance

On 2026-07-23, the Captain accepted manual desktop and mobile browser verification of
the Galactic backdrop. The review covered the Galactic-centre direction, visual
hierarchy, distant-grid fade, selection and camera interactions, and the visible
source credit. The existing Safari real-browser pre-publication gap remains unchanged
because no Apple test workstation is available.

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
