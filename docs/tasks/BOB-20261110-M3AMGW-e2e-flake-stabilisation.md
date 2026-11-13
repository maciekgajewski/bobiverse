# BOB-20261110-M3AMGW: Stabilise cross-browser map interaction tests

Status: Done
Phase: 1 (verification infrastructure; supports Phase 2 interactions)
Last updated: 2026-11-13

## Objective and user-visible outcome

Remove the hosted dolly clock race/time-budget failures and Firefox phone canvas
startup failure without hiding regressions. Reliable browser gates still exercise
real selection, camera direction, interpolation, restoration and responsive loading.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, sections 5.3 and 7
- `../implementation-plan.md`, verification and remote-browser acceptance
- `../adrs/0019-bob-034-software-renderer-performance-budget.md`
- `../adrs/0020-guided-system-view-and-orbital-presentation.md`
- `../visual-testing.md` and `README.md`

## Scope

Investigate and fix `tests/e2e/atlas.spec.ts` dolly and phone flakes, including app
startup if necessary. Preserve every assertion and numerical bound. Add regression
coverage for identified causes. Record the XHVN3V post-merge status rule.

Out of scope: data, extraction, source book text, design changes, dependency upgrades,
CI retry policy changes, publishing, and the acceptance checkout/server on port 5173.
All automated servers use a strict-port wrapper outside the repo on port 5174.

## Acceptance criteria

1. Explain and reproduce the clock race and investigate the Firefox startup failure
   with retained diagnostics; distinguish proved causes from hypotheses.
2. No extra retries, raised timeouts, weakened assertions, or skipped tests.
3. Both affected tests pass at least 20 repetitions per browser with one worker,
   software GL and zero retries. Preserve failure evidence outside version control.
4. Task check, format:check, lint, typecheck, test, data:test, data:validate, build,
   and full three-browser e2e (`CI=1 --workers=1 --retries=0`) pass.
5. Local commit and external PR body draft only. Independent review, hosted CI,
   merge and manual real-GPU acceptance remain outstanding; do not mark Done.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run build
CI=1 LIBGL_ALWAYS_SOFTWARE=1 npm run test:e2e -- --config playwright.config.ts --workers=1 --retries=0 --grep 'phone browser opens|system-mode dollies' --repeat-each=20
CI=1 LIBGL_ALWAYS_SOFTWARE=1 npm run test:e2e -- --config playwright.config.ts --workers=1 --retries=0
 git diff --check
```

## Documentation, artifacts and risks

Keep logs, reports, scripts and failure traces in `~/bobiverse-flakes-artifacts`.
Update this task and directly affected browser guidance. Manual checklist: Firefox
phone-size cold load; enter/exit system preserves exact pose and smooth direction
on a real GPU, with ordinary orbit restored. No automated claim replaces that check.
No new ADR is required. Local software rendering is not identical to hosted runners.

## Log

### 2026-11-10 (Europe/Amsterdam)

- Manager-relayed Captain authorisation: after PR #3 (63bbd98), implement flake
  stabilisation before astronomy staging and extraction docs. Scope is routine,
  in-design verification work. Parent directs local commit/draft only, no push/PR.
- Created task Ready from the authorised brief. Plan: inspect test/clock and startup,
  retain baseline diagnostics, make root-cause repairs, stress each browser, run
  full validation, then prepare a local handoff. Keep 5173 completely untouched.
- Independent task and implementation reviews are to be coordinated by the manager;
  no review-agent tool is available to this executor. Review is not claimed complete.

- Began implementation under the recorded authorisation; status In progress also
  covers local implementation awaiting independent review/hosted CI/merge.

- Root cause proved: the old dolly queried `Date.now()+100` then sent pauseAt in a
  separate protocol call while time continued. Injecting 250 ms of protocol latency
  reproduced Cannot fast-forward to the past in all three engines (0/3 pass).
  A fixed install epoch and fixed next-day pause boundary pass the same harness
  in all three engines (3/3), without changing the test's 30-second deadline.
- Continued explicit 16-ms frames through reset, resize and real mouse drag; kept
  all direction/step/exact-pose/restore/interaction assertions. Removed the final
  fixed 500-ms wait. Inspected installed Playwright 1.61.1: waitForTimeout uses a
  server-side timer, not the page's fake setTimeout, so it did not hang because time
  was paused; it consumed the remaining cumulative deadline. The old return to
  wall-clock rAF made that last phase unnecessarily renderer-cadence dependent.
- Interrupted the initial unmodified stress sample after 22 completed tests
  (11 phone + 11 dolly, Chromium); all 22 passed. The other 98 were not run, not
  disabled in code. Cold Firefox diagnostic: three fresh-context phone runs passed
  with two-core taskset affinity, software GL, forced Vite dependency reoptimisation
  and full traces. Startup took about 2.6 s and each WebGL2 context 37–144 ms.
- Phone investigation found no lazy import, overlay or onboarding mount gate. App
  performs a deferred WebGL probe then mounts R3F. The configured native headless
  Firefox path has an open upstream portability defect (Mozilla 1375585; linked
  by Playwright 21783). Select display-backed Firefox on existing Xvfb instead,
  without force-enabling unsupported driver capabilities. Local probe now reports
  llvmpipe; Chromium is explicitly SwiftShader in the external stress wrapper.
  Native-headless Firefox also happens to work on piotr, so the exact hosted phone
  failure was NOT reproduced and its driver diagnosis is provisional, not proved.
  Strengthened phone coverage to require the real renderer bridge; retained every
  prior assertion and attach startup/browser errors on failure. No speculative app
  code changes or startup retries. Hosted confirmation remains a review limitation.
- Sources checked: https://playwright.dev/docs/api/class-clock ;
  https://github.com/microsoft/playwright/issues/21783 ;
  https://bugzilla.mozilla.org/show_bug.cgi?id=1375585 .
- Kept CI's --retries=1 unchanged. Recommend a separately reviewed zero-retry CI
  gate once hosted verification confirms this change, rather than relying on retries.

- Final targeted stress: **120/120 pass**, no retries/skips/flakes, 13m31s.
  Both affected tests pass 20/20 in each of Chromium, display-backed Firefox and
  WebKit with CI=1, one worker and software GL. Dolly duration ranges: Chromium
  8.06–8.89 s, Firefox 6.40–6.58 s, WebKit 8.65–8.96 s, against unchanged 30 s.
  Required invocation, environment and wrapper are documented above; JSON/HTML
  results are stress.json and stress-report/ in the external artifact directory.
- npm ci installed the pinned dependencies; its 25 existing audit advisories
  (1 low, 16 moderate, 8 high) are recorded, not changed by this test task.

- First full validation: task/format/lint/typecheck, 240 Vitest tests, 79 Python
  tests, data validation (277 systems/six sources), build (42 chapters) and diff
  check passed. Full e2e was **91/93**, with two additional pre-existing immediate
  caption-count races in Chromium expressive-map compact/phone cases. No rerun
  was used to call that run green. Original evidence is retained in first-full/.
- Root cause of the newly exposed race: queryCount began 2.4 ms after the
  empty-canvas click completed and returned one; the later failure DOM snapshot says
  Selection cleared and contains no Sirius caption. Scene captions are published
  through frame/React state updates, so count() reads too early. Replace both
  immediate zero-caption snapshots in that test with the same web-first
  toHaveCount(0) condition, using the existing default assertion deadline; no
  threshold, test timeout, retry setting or expected state is changed. This small
  additional synchronisation repair is part of flake stabilisation, not app scope.
- The icon specimen test rewrote its tracked PNG; retained the generated copy
  outside git and restored the original reviewed artifact. It is not an intended
  visual change. No other worktree or acceptance process was touched.

### 2026-11-10 (Europe/Amsterdam; final local validation and handoff)

- Caption-removal regression stress: both affected compact Chromium cases pass
  **6/6** (three repetitions each), one worker, zero retries, 67 s.
- After that code correction, reran the entire repository validation pipeline:
  task check **57 files**, format:check, lint, typecheck, Vitest **240/240** across
  29 files, Python data tests **79/79**, data:validate **277 systems/six pinned
  sources**, production build (zero state/42 chapters) and git diff --check pass.
  Existing large-bundle and duplicate-Three import warnings remain; no new error.
- Final full e2e **93/93 pass** (31 per browser), **zero retries, skips or flakes**,
  9m37s; CI=1 --workers=1 --retries=0 through the external 5174 wrapper. No duplicate
  run was started when the parent resumed monitoring. Final validation.tsv records
  zero exit codes for every check; full.json/full-report/ retain the final evidence.
- The previously required targeted run remains **120/120**, 20 repetitions per
  affected test per engine. Its phone/dolly code is unchanged by the later two
  caption assertion repairs. Initial 91/93 full-run evidence remains in first-full/.
- Playwright config justification: the sole executable config change is Firefox
  headless true -> false, selecting the existing npm/Xvfb display-backed path for
  real WebGL rather than the upstream-problematic native-headless path. Added only
  explanatory comments besides that boolean. No retry value, timeout, browser
  assertion, CI command, port default, worker setting or other project changed.
  The precise hosted phone driver/startup cause remains unproved on piotr;
  native-headless local cold probes also pass. Independent review/hosted evidence
  must assess that provisional diagnosis rather than treating it as reproduced.
- The PNG rewrite is a test side effect, not an intentional visual update. Saved
  generated-icon-specimen-final.png outside git and restored the tracked reviewed
  PNG with git checkout as requested. Only the task, XHVN3V log, browser guidance,
  Playwright Firefox mode and e2e synchronisation/diagnostics belong in this change.
- No source-text/book text access, acceptance-server/5173 action, sudo, push, force
  push, PR creation or external message. The local PR body/checklist is
  ~/src/bobiverse-flakes-pr-body.md; artifact/harness directory is
  ~/bobiverse-flakes-artifacts/. Task remains In progress, not Done.
- Publication, fresh independent exact-SHA review, all hosted CI checks, Captain
  manual real-GPU/Firefox-phone acceptance and merge remain outstanding.

### 2026-11-12 (Europe/Amsterdam)

- PR #4 was squash-merged to master as `3053e95` on Tuesday 2026-11-10. The
  independently reviewed head was `3196b24`. Status is now **Done**, recorded
  after that merge.

### 2026-11-13 (Europe/Amsterdam)

- Made the validation commands repo-relative: they now use the in-repo
  `playwright.config.ts` instead of an out-of-repo wrapper config under the
  developer's home directory. Status stays Done.
