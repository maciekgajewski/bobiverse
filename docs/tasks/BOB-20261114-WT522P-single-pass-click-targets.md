# BOB-20261114-WT522P: single-pass, never-drawn star click targets

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-14

## Objective and user-visible outcome

At chapters with many rendered stars, the map keeps the main thread busy on
every frame, even when nothing moves. Profiling
(`~/tmp/shader-perf/SUMMARY.md` on piotr) traced this to the invisible
click-target material in `StarMarker`. three.js draws a transparent,
double-sided material in two passes unless `forceSinglePass` is set. Before
each pass it flags `needsUpdate`, so it re-derives that material's program
parameters (`getProgram`/`getParameters`) twice per star component per frame:
634 times per frame at 1.50 and 1.61. On a 4×-throttled phone this holds
1.50/1.61 at about 27 fps indefinitely. This task makes the click target
single-pass and never drawn, which leaves pixels and picking unchanged.

## Authorization

Piotr Developer Manager approved the finding and authorised the
implementation on 2026-11-14 at 22:33 (Europe/Warsaw), relaying the Captain's
standing authorisation: Patch A (`forceSinglePass`) plus Patch B
(`visible={false}`) plus a render-churn guard test, on one small branch. B
lands only if star clicks pass in chromium, firefox and webkit, including the
Sol canvas-click e2e and the other canvas-click tests; otherwise B is dropped
and A lands alone.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md` (§8.4 marker picking; this task adds the click-target
  rendering note)
- `../implementation-plan.md` (Phase 2)

## In scope

1. Add `forceSinglePass` to the click-target `meshBasicMaterial` and
   `visible={false}` to its mesh in `src/components/MapScene.tsx`, with a short
   comment explaining why.
2. A pure `src/domain/render-stats.ts` helper (distinct materials, sum of
   `material.version`, count of two-pass materials) with unit tests.
3. Add `renderStats()` and `componentScreenRadii()` to the existing
   `__bob034MapPerformance` bridge, with the same (ungated) availability as
   the rest of the bridge.
4. e2e: an idle map at 1.61 shows no change in material versions or program
   count over 60 rendered frames and has no two-pass materials; and a canvas
   click between a star's visible quad and its larger click target still
   selects it.
5. A brief technical-design note, and this task file.

## Out of scope

- Instancing stars or any other render restructuring.
- Changes to star visuals, picking radii, captions or data.
- Marking this task Done (that happens after merge, in a later commit).

## Acceptance criteria

1. No material in the map scene is transparent, double-sided and multi-pass,
   and an idle map has zero `material.version` growth and a stable program
   count over 60 rendered frames (frame count, not wall time).
2. Canvas picking is unchanged in all three browsers: the existing Sol and
   expressive-state canvas tests pass, and so does a new click in the ring
   between WISE 0855-0714's 0.05 visible quad and its 0.09 click target.
3. Rendered pixels are unchanged.
4. Idle render cost at 1.61 drops (4×-throttled phone fps; desktop main-thread
   busy share), measured on a local production build.
5. No canonical data, book text or generated chapter bytes change.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
npx prettier --check <changed Markdown>
git diff --check
```

Full e2e in chromium, firefox and webkit, one worker, no retries, on port
5193 with an untracked throwaway `playwright.alt5193.config.ts` that must not
be committed. Run the guard and ring tests against the old code too, to show
they discriminate. Measure idle fps and main-thread busy share at 1.61 on a
local production build, before and after.

## Documentation and generated artifacts

`docs/technical-design.md` §8.4 records that click targets are single-pass and
never drawn, and names the guard. No generated artifacts.

## Risks and unresolved decisions

- B relies on three.js and React Three Fiber raycasting regardless of
  `Object3D.visible`, which is current behaviour (three r185 `intersect()`
  checks layers only). The ring e2e pins it, so a library change that starts
  skipping invisible objects would fail that test rather than silently shrink
  click targets.
- `forceSinglePass` (A) is kept with B so the click target stays cheap even if
  it is ever made visible again.

## Log

- 2026-11-14: task opened as Ready after the manager authorised A + B + guard.
- 2026-11-14: implemented A (`forceSinglePass`) and B (`visible={false}`) on
  the click target, `src/domain/render-stats.ts` with unit tests, the
  `renderStats()` and `componentScreenRadii()` bridge methods, the two e2e
  tests and the technical-design note. Moved to In progress for review.
- 2026-11-14: discrimination, chromium. On the old code (no A, no B) the idle
  guard fails (317 two-pass materials) while the Sol and ring canvas clicks
  pass. With A alone both new tests pass. With the click target made
  unraycastable, the ring click fails.
- 2026-11-14: validation on this branch (based on 5c2d9d7): tasks check,
  format:check, lint, typecheck, test (460), data:test, data:validate,
  narrative:validate, build, prettier on changed Markdown and git diff --check
  all passed. Full e2e, one worker, no retries, port 5193: chromium 46 passed
  and 3 skipped; firefox 46 passed and 3 skipped; webkit 45 passed, 3 skipped
  and 1 failed, the known "permanent local backdrop" timeout under host load
  (piotr load average about 10), which then passed three times in isolation.
  Every canvas-click test (Sol pick, invisible click-target ring, expressive
  states at three viewports, empty-map clicks) passed in all three browsers,
  so B is kept.
- 2026-11-14: production preview at 1.61, idle, chromium with GPU, piotr
  loaded (load average about 8), master 5c2d9d7 vs this branch, clean pairs
  r1 and r3: 4x-throttled phone 15.4/15.0 fps -> 58.8/57.4 fps; desktop
  main-thread busy 71.1/84.9% -> 24.7/28.8%; per-frame getProgram time 0 on
  the branch. A third pair (r2) was disturbed by other jobs on the branch run.
