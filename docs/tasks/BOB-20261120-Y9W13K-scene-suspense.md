# BOB-20261120-Y9W13K: scene asset Suspense boundaries

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-20

## Objective and user-visible outcome

While the map scene loads its assets (the Galactic starfield texture and the
label font), React Three Fiber's `<Canvas>` rethrows the pending load to the app
root, which has no Suspense boundary, so no app update commits until the assets
arrive. Clicks during the first load (opening a dialog, the Read through picker)
take about 0.4 s, and over a second on a slow phone. Wrap the starfield and the
two axis labels in their own `<Suspense fallback={null}>` boundaries inside
`<Canvas>`, so the rest of the app stays responsive and each part appears once
loaded.

## Authorization

- Approved by the Captain on 2026-11-20 (Europe/Warsaw), relayed by the Piotr
  Developer Manager: the Suspense follow-up to BOB-20261116-TB1C66 goes on its
  own branch after T4, and the Captain checks the loading look on the LAN site
  before it lands.

## Binding references

- `src/components/MapScene.tsx` (`Scene`, `StarMap`)
- `src/components/GalacticStarfield.tsx` (`useLoader` texture)
- `src/components/useFocusAfterCommit.ts` and the BOB-20261116-TB1C66 log (root
  cause of the focus flake)
- `docs/technical-design.md` (loading states)

## Scope

1. In `Scene`, wrap `<GalacticStarfield />` in `<Suspense fallback={null}>`.
2. Wrap the two drei `<Text>` axis labels ("Galactic center · +Xg", "Galactic
   north · +Zg") in one `<Suspense fallback={null}>`.
3. Chromium-targeted e2e `tests/e2e/scene-loading.spec.ts`: with the starfield
   image and the label font held in flight, What's new opens, closes and
   returns focus.

## Out of scope

- Loading indicators or placeholders; the fallback is nothing.
- `useFocusAfterCommit`, which stays: focus after a closing commit is correct
  regardless of what suspends.
- Any change to the starfield, labels, stars, grid or routes once loaded.

## Acceptance criteria

- With the starfield image and label font requests held, a click on What's new
  opens the dialog, Close removes it and focus returns to the link (fails on
  master `1b1fdbd`).
- Click-to-commit latency during the first load, measured with 4x CPU
  throttling in Chromium, no longer includes the asset load.
- Stars, captions, grid and routes appear as before; the starfield and the axis
  labels may appear a moment later than the rest of the scene.

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
git diff --check
npm run test:e2e
npm run test:e2e:csp
```

## Risks and decisions

- While loading, the scene renders without the starfield and the axis labels
  instead of holding the whole app; they appear when ready. Before, the whole
  scene (stars, captions, grid, routes) waited behind `<Canvas>`'s own
  fallback and appeared at once when every asset had loaded.
- No unit or component test: jsdom has no WebGL and the component tests stub
  the canvas, so the regression test is the targeted e2e, which holds the two
  asset requests instead of relying on timing.

## Log

### 2026-11-20 (Europe/Warsaw)

- Created on master `1b1fdbd` on local branch `bob-20261120-scene-suspense` in
  the `~/src/bobiverse-suspense` worktree.
