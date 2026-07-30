# BOB-034 review results

## Review target

- Task: `docs/tasks/BOB-034-expressive-starfield-visual-hierarchy.md`
- Review ledger: `docs/reviews/BOB-034-review-results.md`

## Review pass 1 - initial

### Snapshot

- Reviewer: `task-reviewer`
- Pass: `initial`
- HEAD: `5d9940b12d43db6f49a6fa07c990a9913ae5b06f`
- Working tree: BOB-034 task/index and selected design references in progress; no
  implementation changes

### Findings

#### F-001 - Medium: Per-component mesh constraint contradicts the current renderer

- Status: `Addressed - awaiting verification`
- Evidence: The initial task prohibited a second mesh per component while the accepted
  renderer already uses one visible shader mesh plus one independent invisible pick
  mesh.
- Correction: The task now names the exact accepted baseline as one visible shaded
  mesh and one invisible pick mesh, permits exactly two per-component render calls,
  and prohibits only additional visible/ray meshes or calls.

#### F-002 - Medium: Ray-bearing glyph bounds are ambiguous against accepted fixed-radius authority

- Status: `Addressed - awaiting verification`
- Evidence: ADR-0012 fixes visible radii at `0.09` for ordinary components and `0.05`
  for accepted brown dwarfs, but the initial task did not bind the ADR or constrain
  the complete ray footprint.
- Correction: ADR-0012 is now binding. The complete nonzero core, halo, and ray
  footprint must remain inside the accepted fixed radius and fade to zero at its
  boundary; visible-plane growth and reinterpretation of `marker_radius` are
  prohibited.

#### F-003 - Medium: Shader-performance acceptance has no relevant measurable gate

- Status: `Addressed - awaiting verification`
- Evidence: `npm run performance` measures chapter-transition latency rather than
  sustained WebGL orbit cost, while the initial task used only subjective smoothness
  for the new fragment-work risk.
- Correction: The task now specifies a new production `performance:map` authority,
  exact Chapter 1.11 context, viewport/DPR/browser/host conditions, warm-up and
  measured orbit protocol, three-run before/after evidence, `15%` median and p95
  regression limits, long-frame limits, failure behaviour, and required environment
  reporting. It explicitly records that the command does not exist yet and must be
  added during implementation before it can be claimed or added to the executable
  validation list.

### Validation performed

- `git diff --check` - exit 0.
- Binding task/design/ADR paths - present.
- No implementation or runtime validation was performed during task preparation.

### Reviewer conclusion

`Blocking findings remain pending independent verification.`

## Review pass 2 - verification and closure

### Snapshot

- Reviewer: `task-reviewer`
- Pass: `verification and closure`
- HEAD: `5d9940b12d43db6f49a6fa07c990a9913ae5b06f`
- Working tree: BOB-034 task/index, review ledger, and selected design references in
  progress; no implementation changes

### Finding status

- F-001: `Resolved`
- F-002: `Resolved`
- F-003: `Resolved`

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 3 - fresh closure

### Snapshot

- Reviewer: fresh `task-reviewer`
- Pass: `fresh closure`
- HEAD: `5d9940b12d43db6f49a6fa07c990a9913ae5b06f`
- Working tree: BOB-034 task/index, review ledger, and selected design references in
  progress; no implementation changes

### Findings

#### F-004 - Medium: Map benchmark pins a stale chapter context

- Status: `Reopened and re-addressed - awaiting verification`
- Evidence: The task called Chapter 1.11 the latest context, but committed Chapter
  1.12 introduces mapped Epsilon Eridani.
- Correction: The fixture now uses Chapter 1.12 and asserts exact narrative-known
  astronomy anchors `sol` and `stellar-system-005582` in addition to printing rendered
  system/component counts. A verification pass found one stale Chapter 1.11 reference
  in acceptance criterion 12; that criterion now also requires Chapter 1.12.

#### F-005 - Medium: Orbit benchmark protocol is not reproducible enough to enforce its performance gate

- Status: `Addressed - awaiting verification`
- Evidence: The task did not define pointer coordinates/button/cadence, reset between
  sweeps, or an objective damping-settle rule.
- Correction: The protocol now specifies the Reset-view precondition; camera and
  target tolerance; 12-consecutive-frame settle rule; 3-second failure timeout;
  primary-button pointer identity; canvas-relative start, midpoint, and return
  coordinates; 240 one-per-animation-frame move steps; two excluded warm-ups; five
  measured sweeps; and capture from pointer down through objectively settled damping.

### Reviewer conclusion

`Blocking findings remain pending independent verification.`

## Review pass 4 - verification

### Snapshot

- Reviewer: retained fresh-closure `task-reviewer`
- Pass: `verification`
- HEAD: `5d9940b12d43db6f49a6fa07c990a9913ae5b06f`
- Working tree: BOB-034 task/index, review ledger, and selected design references in
  progress; no implementation changes

### Finding status

- F-004: `Resolved`
- F-005: `Resolved`

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 5 - final fresh closure

### Snapshot

- Reviewer: new independent `task-reviewer`
- Pass: `final fresh closure`
- HEAD: `5d9940b12d43db6f49a6fa07c990a9913ae5b06f`
- Working tree: BOB-034 task/index, review ledger, and selected design references in
  progress; no implementation changes

### Findings

#### F-006 - Medium: BOB-034 is Ready against an invalid Chapter 1.12 astronomy context

- Status: `Addressed - awaiting verification`
- Evidence: Chapter 1.12 maps Epsilon Eridani as `stellar-system-005582`, but the
  required reviewed bootstrap and pinned per-anchor source coverage are absent.
  `./.venv/bin/python scripts/validate_data.py` was rerun by both reviewer and calling
  agent and fails in `validate_acquisition_queries` with
  `KeyError: 'stellar-system-005582'`.
- Correction: BOB-034 and its task-index entry are now `Blocked`. The task records the
  exact failure and requires a separate owning astronomy acquisition/coverage task to
  close before BOB-034 can return to `Ready`; that work remains explicitly outside
  this visual task.

#### F-007 - Medium: Map benchmark does not enforce the complete rendered fixture

- Status: `Addressed - awaiting verification`
- Evidence: Exact anchor assertions plus printed counts would still permit a truncated
  catalogue and a smaller rendering workload.
- Correction: Before BOB-034 can return to `Ready`, it must record and assert the exact
  validated sorted rendered-system and component ID sets, or deterministic hashes plus
  exact counts. Baseline and final runs must use identical asserted fixture identities;
  unasserted printed counts are explicitly insufficient.

### Reviewer conclusion

`Blocking astronomy prerequisite remains; task-definition corrections await independent verification.`

## Review pass 6 - verification

### Snapshot

- Reviewer: retained final-closure `task-reviewer`
- Pass: `verification`
- HEAD: `5d9940b12d43db6f49a6fa07c990a9913ae5b06f`
- Working tree: blocked BOB-034 task/index, review ledger, and selected design
  references in progress; no implementation changes

### Finding status

- F-006: `Resolved`
- F-007: `Resolved`

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 7 - final fresh closure

### Snapshot

- Reviewer: new independent `task-reviewer`
- Pass: `final fresh closure`
- HEAD: `5d9940b12d43db6f49a6fa07c990a9913ae5b06f`
- Working tree: blocked BOB-034 task/index, review ledger, and selected design
  references in progress; no implementation changes

### Independent assessment

The reviewer independently inspected the complete current repository state, blocked
task and index, review ledger, selected visual references, binding design and ADR,
current renderer and tests, Chapter 1.12 narrative anchor, astronomy acquisition
coverage, validation commands, prerequisite boundary, Ready-restoration gates, and
performance protocol.

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 8 - Ready restoration

### Snapshot

- Reviewer: new independent `task-reviewer`
- Pass: `Ready restoration`
- HEAD: `8955a75`
- Working tree: BOB-034 task/index and this review-ledger update; no implementation
  changes

### Independent assessment

The reviewer inspected the current repository state, BOB-030 prerequisite closure,
BOB-034's transition from `Blocked` to `Ready`, task-index consistency, the
Chapter 1.12 projected anchors, and the deterministic rendered-system and
rendered-component count/hash fixtures.

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 9 - immutable visual benchmark fixture

### Snapshot

- Reviewer: new independent `task-reviewer`
- Pass: `immutable visual benchmark fixture`
- HEAD: `ad6f166`
- Working tree: BOB-034 task and this review-ledger update; no production
  implementation changes

### Independent assessment

The reviewer inspected the BOB-034 task-document change that replaces the moving
latest-chapter dependency with a fixed Chapter 1.14-reproduced visual fixture. The
fixture asserts the exact narrative-known, active-system, rendered-system, and
rendered-component counts and sorted-ID hashes while keeping Chapter 1.14 only as its
reproduction selector.

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 10 - implementation review

### Snapshot

- Reviewer: new independent `task-reviewer`
- Pass: `implementation review`
- HEAD: `ad6f166`
- Working tree: complete BOB-034 implementation, tests, benchmark authority,
  integrated documentation, and evidence; Captain visual acceptance pending

### Findings

#### F-008 - Medium: Baseline changes parent camera behaviour before capture

- Status: `Resolved by Captain decision - awaiting verification`
- Evidence: The parent `0.08` damping reached the required delta but accumulated only
  10 of 12 stable frames within the fixed 3-second protocol. The implementation used
  `0.09` damping and exact-reset draining before baseline capture.
- Resolution: On 2026-07-30 the Captain selected option 1 and explicitly approved this
  narrow benchmark prerequisite. The task, technical design, visual testing, and
  evidence now bind the calibration while preserving framing, focus targets, gesture
  mapping, distance limits, reset pose, and canonical coordinates.

#### F-009 - Medium: Stored baseline identity and environment were not enforced

- Status: `Addressed - awaiting verification`
- Resolution: The benchmark now asserts the complete fixture, exactly three runs with
  five measured sweeps each, finite sample structure, renderer, browser, Node, CPU,
  host, platform, and unchanged Galactic backdrop asset before applying budgets.

#### F-010 - Medium: Responsive state coverage was declarative rather than interactive

- Status: `Addressed - awaiting verification`
- Resolution: The browser test now performs real known, active, hover, narrative
  selection, and astronomy-only selection assertions at desktop, compact, and phone
  viewports. The full Chromium, Firefox, and WebKit suite passes.

#### F-011 - Low: Benchmark output omitted required anchor IDs

- Status: `Resolved`
- Resolution: Fixture output and runtime assertions include `sol`,
  `stellar-system-005582`, and the active-system ID.

#### F-012 - Medium: Validation evidence became stale after corrections

- Status: `Addressed - awaiting verification`
- Resolution: Validation, all 48 cross-browser tests, chapter-transition performance,
  and the three-run map benchmark were rerun against production bundle
  `/assets/index-BKG-XE5B.js`; current evidence is recorded in the task.

### Reviewer conclusion

`Corrections await fresh independent verification.`

## Review pass 11 - implementation verification

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `implementation verification`
- HEAD: `ad6f166`
- Working tree: current BOB-034 implementation and refreshed evidence; Captain
  real-browser visual acceptance pending

### Finding status

- F-008: `Resolved`
- F-009: `Resolved`
- F-010: `Resolved`
- F-011: `Resolved`
- F-012: `Resolved`

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 12 - 0.55 recalibration review

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `0.55 recalibration review`
- HEAD: `ad6f166`
- Working tree: current BOB-034 implementation recalibrated to `0.55`; current-bundle
  map benchmark and Captain real-browser visual acceptance pending at review time

### Findings

#### F-013 - Medium: Map-performance evidence is stale after the `0.55` recalibration

- Status: `Addressed - awaiting verification`
- Evidence: The task called automated validation complete and presented the
  `/assets/index-BKG-XE5B.js` result as accepted final evidence even though that bundle
  contained the Captain-rejected `0.70` calibration.
- Resolution: The task now labels that result historical, records the terminated and
  concurrent-load attempts without treating either as authority, and records the
  subsequent isolated passing run against the current
  `/assets/index-BZ0F0ZP3.js` bundle.

#### F-014 - Low: Acceptance criterion overstates manual approval of recalibrated hierarchy

- Status: `Addressed - awaiting verification`
- Evidence: Acceptance criterion 4 called `0.55` Captain-approved even though the
  Captain authorized the recalibration but has not yet accepted its appearance.
- Resolution: The criterion now calls `0.55` the Captain-authorized candidate and
  explicitly keeps real-browser visual acceptance pending.

### Reviewer conclusion

`Corrections await fresh independent verification.`

## Review pass 13 - recalibration evidence verification

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `recalibration evidence verification`
- HEAD: `ad6f166`
- Working tree: current BOB-034 implementation and isolated `0.55` benchmark
  evidence; Captain real-browser visual acceptance pending

### Finding status

- F-013: `Resolved`
- F-014: `Resolved`

### New findings

#### F-015 - Medium: Long-frame gate rounds before enforcing the absolute budget

- Status: `Addressed - awaiting verification`
- Evidence: Each sweep maximum was rounded to two decimal places before the final
  assertion enforced the absolute `100 ms` ceiling. The latest displayed result was
  exactly `100 ms`, so its raw interval could have been slightly over budget.
- Resolution: Sweep maxima now retain the raw measured interval for run aggregation,
  emitted evidence, and the absolute assertion. Median and p95 reporting remain
  rounded to two decimal places.

### Reviewer conclusion

`Correction awaits a fresh authoritative benchmark and independent verification.`

## Review pass 14 - raw maximum benchmark evidence

### Snapshot

- Reviewer: calling agent awaiting independent verification
- Pass: `raw maximum benchmark evidence`
- HEAD: `ad6f166`
- Working tree: current BOB-034 implementation, corrected raw-maximum assertion, and
  fresh isolated `0.55` benchmark evidence

### Finding status

- F-015: `Addressed - awaiting verification`

### Validation

- `npm run performance:map`: passed against production bundle
  `/assets/index-BZ0F0ZP3.js`;
- aggregate median/p95/long-frame-count/raw maximum:
  `16.8/66.7/23/100 ms`;
- the raw maximum, not a rounded surrogate, satisfied the absolute `100 ms` ceiling.

### Reviewer conclusion

`Fresh independent verification pending.`

## Review pass 15 - raw maximum verification

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `raw maximum verification`
- HEAD: `ad6f166`
- Working tree: current BOB-034 implementation, corrected benchmark, and refreshed
  evidence; Captain real-browser visual acceptance pending

### Finding status

- F-015: `Resolved`

### New findings

#### F-016 - Low: Review ledger is no longer chronological

- Status: `Addressed - awaiting verification`
- Evidence: Passes 13 and 14 were inserted before passes 11 and 12, leaving the
  ledger's final entry with a stale review state.
- Resolution: Passes 11 through 15 are now ordered chronologically, and this latest
  pass records the resolved raw-maximum finding before the ledger-order correction.

### Reviewer conclusion

`Ledger-order correction awaits fresh independent verification.`

## Review pass 16 - final implementation closure

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `final implementation closure`
- HEAD: `ad6f166`
- Working tree: complete BOB-034 implementation, corrected benchmark authority,
  refreshed automated evidence, and chronological review ledger; Captain
  real-browser visual acceptance pending

### Finding status

- F-013: `Resolved`
- F-014: `Resolved`
- F-015: `Resolved`
- F-016: `Resolved`

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 17 - post-clamp hierarchy correction

### Snapshot

- Reviewer: calling agent awaiting independent review
- Pass: `post-clamp hierarchy correction`
- HEAD: `ad6f166`
- Working tree: BOB-034 implementation updated after the Captain rejected the
  pre-clamp `0.55` visual hierarchy

### Correction

- The shader now bounds composed base alpha before applying the single `0.55`
  astronomy-context multiplier.
- This preserves the accepted narrative-known rendering while preventing bright
  astronomy-context cores from saturating past the intended hierarchy.
- Unit coverage binds the shader ordering.

### Validation

- `npm run validate`: passed; 73 Python and 162 Vitest tests passed;
- `npm run test:e2e`: passed; all 48 Chromium, Firefox, and WebKit tests passed;
- `npm run performance`: passed; unselected median/maximum `51.1/57.6 ms` and
  selected-object-replacement median/maximum `50.3/52.3 ms`;
- `npm run performance:map`: passed against `/assets/index-CrXhUFN4.js` with
  aggregate median/p95/long-frame-count/raw maximum
  `16.8/83.2/24/83.5 ms`;
- Captain real-browser visual acceptance of the corrected result remains pending.

### Reviewer conclusion

`Fresh independent review pending.`

## Review pass 18 - post-clamp hierarchy verification

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `post-clamp hierarchy verification`
- HEAD: `ad6f166`
- Working tree: complete post-clamp BOB-034 correction with refreshed automated
  evidence; Captain real-browser visual acceptance pending

### Finding status

- Post-clamp shader ordering and regression coverage: `Resolved`
- Automated evidence and manual-acceptance status: `Resolved`

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 19 - known-star core and halo scale

### Snapshot

- Reviewer: calling agent awaiting independent review
- Pass: `known-star core and halo scale`
- HEAD: `ad6f166`
- Working tree: BOB-034 implementation updated after the Captain requested that
  narrative-known stars appear larger as well as brighter

### Correction

- Narrative-known core and halo radii use one explicit `1.25` screen-space scale
  inside the unchanged fixed marker boundary.
- Astronomy-only optics, ray lengths, visible planes, coordinates, and independent
  pick targets remain unchanged.
- Unit and cross-browser contracts bind the new scale.

### Validation

- `npm run validate`: passed; 73 Python and 163 Vitest tests passed;
- `npm run test:e2e`: passed; all 48 Chromium, Firefox, and WebKit tests passed;
- `npm run performance`: passed; unselected median/maximum `51.05/58.8 ms` and
  selected-object-replacement median/maximum `51.25/52.5 ms`;
- `npm run performance:map`: passed against `/assets/index-OyZALixg.js` with
  aggregate median/p95/long-frame-count/raw maximum
  `16.8/83.2/24/83.5 ms`;
- Captain real-browser visual acceptance remains pending.

### Reviewer conclusion

`Fresh independent review pending.`

## Review pass 20 - known-star scale verification

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `known-star scale verification`
- HEAD: `ad6f166`
- Working tree: complete `1.25` narrative-known core/halo scale with refreshed
  automated evidence; Captain real-browser visual acceptance pending

### Finding status

- Scale implementation, fixed-boundary compliance, and regression coverage:
  `Resolved`
- Automated evidence and manual-acceptance status: `Resolved`

### New findings

`None.`

### Reviewer conclusion

`No findings.`

## Review pass 21 - ADR-0018 hierarchy recalibration

### Snapshot

- Reviewer: calling agent awaiting independent review
- Pass: `ADR-0018 hierarchy recalibration`
- HEAD: `ad6f166`
- Working tree: BOB-034 updated after the Captain selected complete `2×` known-star
  footprints, proportional rays, and `0.25` astronomy-context emphasis

### Correction

- Accepted ADR-0018 records the narrow narrative-footprint supersession of
  ADR-0012's base-radius interpretation.
- Narrative-known visible planes and rays use `2×`; their retained `1.25` internal
  core/halo scale yields effective `2.5×` size.
- Astronomy-only emphasis is `0.25`; its geometry remains unchanged.
- Canonical geometry, measurement, component offsets, and independent picking remain
  unchanged.
- `npm run validate`: passed; 73 Python and 163 Vitest tests passed.
- `npm run test:e2e`: passed; all 48 Chromium, Firefox, and WebKit tests passed.
- `npm run performance`: passed; unselected median/maximum `51/54.6 ms` and
  selected-object-replacement median/maximum `50.3/53.9 ms`.
- The first `npm run performance:map` attempt failed the median gate at `33.2 ms`.
  One unchanged idle-host confirmation passed against `/assets/index-D1eXO5FA.js`
  with aggregate median/p95/long-frame-count/raw maximum
  `16.8/83.3/24/100 ms`.
- Captain real-browser visual acceptance remains pending.

### Reviewer conclusion

`Fresh independent review pending.`

## Review pass 22 - benchmark repeatability

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `benchmark repeatability`
- HEAD: `ad6f166`
- Working tree: ADR-0018 implementation with one failed and one passing benchmark
  invocation on the same unoptimized bundle

### Findings

#### F-017 - Medium: Unexplained benchmark failure was discarded without an authorized rerun rule

- Status: `Addressed - awaiting verification`
- Evidence: The first valid isolated run failed at `33.2 ms`; an unchanged valid
  confirmation passed. Selecting the passing invocation did not establish the
  documented repeatable gate.
- Resolution: The passing confirmation is not accepted as final authority.
  Transparent-corner and polynomial-halo experiments did not establish a repeatable
  pass and were not retained. The visual implementation remains faithful to the
  Captain's requested calibration. The Captain selected the explicit ADR-0018
  software-renderer policy: a `33.4 ms` median ceiling and `4 s` settlement deadline,
  while the p95, long-frame, and raw `100 ms` limits remain unchanged. Fresh
  consecutive passes are required; invocation selection remains prohibited.

### Reviewer conclusion

`Fresh repeatability evidence and independent verification pending.`

## Review pass 23 - authorized performance-policy evidence

### Snapshot

- Reviewer: calling agent awaiting independent verification
- Pass: `authorized performance-policy evidence`
- HEAD: `ad6f166`
- Working tree: faithful ADR-0018 visual implementation, Captain-authorized
  software-renderer policy, and lifecycle-corrected benchmark harness

### Finding status

- F-017: `Addressed - awaiting verification`

### Validation

- The fixture loads once per command invocation and no navigation occurs during the
  three measured runs.
- The `4 s` timeout is passed explicitly into the browser settlement function.
- Two consecutive completed `npm run performance:map` invocations passed against
  `/assets/index-D1eXO5FA.js`.
- Invocation aggregates, as median/p95/long-frame-count/raw maximum:
  `16.8/66.7/24/99.89999999999418 ms` and `16.8/83.2/24/100 ms`.
- Both used the `33.4/95.68/26/100 ms` authorized budget set and identical fixture,
  renderer, browser, host, and platform identities.

### Reviewer conclusion

`Fresh independent verification pending.`

## Review pass 24 - cross-run reset-pose authority

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `cross-run reset-pose authority`
- HEAD: `ad6f166`
- Working tree: lifecycle-corrected ADR-0018 benchmark after two consecutive passes

### Findings

#### F-018 - Medium: Reset-pose equality is not enforced across all three runs

- Status: `Addressed - awaiting verification`
- Evidence: Each measured run captured a new local reset reference, so runs two and
  three could silently adopt a shifted pose.
- Resolution: The harness now captures one reference pose immediately after the
  single fixture load and passes it into all three runs. Every run-start, warm-up, and
  measured-sweep reset is asserted against that shared pose. Previous consecutive
  evidence is stale; two fresh completed passes are required.

### Reviewer conclusion

`Fresh repeatability evidence and independent verification pending.`

## Review pass 25 - shared reset-pose repeatability evidence

### Snapshot

- Reviewer: calling agent awaiting independent verification
- Pass: `shared reset-pose repeatability evidence`
- HEAD: `ad6f166`
- Working tree: final ADR-0018 visual implementation and shared-reset benchmark
  authority

### Finding status

- F-017: `Addressed - awaiting verification`
- F-018: `Addressed - awaiting verification`

### Validation

- The fixture loads once, then one reference reset pose is captured and passed into
  all three runs. Every run-start, warm-up, and measured-sweep reset is asserted
  against that shared reference.
- Two fresh consecutive completed `npm run performance:map` invocations passed
  against `/assets/index-D1eXO5FA.js`.
- Invocation aggregates, as median/p95/long-frame-count/raw maximum:
  `16.7/66.7/24/83.5 ms` and `16.7/66.8/24/83.5 ms`.
- Both used the `33.4/95.68/26/100 ms` authorized budget set and identical fixture,
  renderer, browser, host, and platform identities.

### Reviewer conclusion

`Fresh independent verification pending.`

## Review pass 26 - explicit performance-policy architecture

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `explicit performance-policy architecture`
- HEAD: `ad6f166`
- Working tree: final ADR-0018 visual implementation with ADR-0019 performance
  authority

### Findings

#### F-019 - Medium: The authorized median ceiling conflicts with accepted ADR-0018

- Status: `Addressed - awaiting verification`
- Evidence: ADR-0018 required the doubled footprint to retain all preceding benchmark
  budgets, while the Captain later selected a `33.4 ms` SwiftShader median ceiling.
- Resolution: Accepted ADR-0019 now records that later authorization, narrowly
  supersedes only ADR-0018's unchanged-budget consequence, preserves the p95,
  long-frame, and raw-maximum limits, prohibits cherry-picking, requires shared-pose
  repeatability, and keeps real-browser smoothness mandatory. The task and visual
  testing guide now cite ADR-0019 as the policy authority.

### Reviewer conclusion

`Fresh independent verification pending.`

## Review pass 27 - implementation closure after ADR-0019

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `implementation closure after ADR-0019`
- HEAD: `ad6f166`
- Working tree: final BOB-034 implementation, shared-pose performance evidence, and
  accepted ADR-0019

### Finding status

- F-017: `Resolved`
- F-018: `Resolved`
- F-019: `Resolved`

### Validation

- The reviewer rechecked the complete current implementation and authoritative
  documents after ADR-0019 was added.
- ADR-0019 records the Captain-authorized software-renderer budget, narrowly
  supersedes ADR-0018's conflicting consequence, and preserves the remaining
  performance and real-browser acceptance constraints.
- The shared-pose harness and two fresh consecutive passing invocations close the
  outstanding benchmark-authority findings.

### Reviewer conclusion

`No findings.`

## Review pass 28 - hover caption deduplication

### Snapshot

- Reviewer: calling agent awaiting independent verification
- Pass: `hover caption deduplication`
- HEAD: `ad6f166`
- Working tree: final BOB-034 implementation with post-visual-review hover fix

### Change

- The scene now owns one hover state for both the tooltip and caption presentation.
- A hovered system keeps its collision-priority reservation but does not render its
  duplicate plain map caption; the caption returns when hover ends.
- README, technical design, visual-testing guidance, and the BOB-034 contract record
  the tooltip as the sole hover name surface.

### Validation

- `npm run validate`: passed; 73 Python tests and 163 Vitest tests passed.
- `npm run test:e2e`: passed; 48 Chromium, Firefox, and WebKit tests passed.
- The focused hover regression passed in all three browsers at desktop, compact, and
  phone viewports.
- Two fresh consecutive `npm run performance:map` invocations passed against
  `/assets/index-BdVN0B4y.js`; aggregate median/p95/long-frame-count/raw maximum:
  `16.7/66.7/24/83.5 ms` and `16.8/66.7/24/83.5 ms`.

### Reviewer conclusion

`Fresh independent verification pending.`

## Review pass 29 - integrated hover-caption contract

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `integrated hover-caption contract`
- HEAD: `ad6f166`
- Working tree: post-visual-review hover fix with integrated Phase 2 design

### Findings

#### F-020 - Low: Phase 2 design still requires a hovered map caption

- Status: `Addressed - awaiting verification`
- Evidence: The integrated Phase 2 design still said hovered systems always receive a
  caption, contradicting the sole-tooltip contract.
- Resolution: Section 8.3 now specifies that hover suppresses the plain map caption,
  retains its collision-priority reservation, restores the caption on hover exit, and
  uses the same tooltip-only behavior for astronomy-only systems.

### Reviewer conclusion

`Fresh independent verification pending.`

## Review pass 30 - hover caption fix closure

### Snapshot

- Reviewer: retained independent `task-reviewer`
- Pass: `hover caption fix closure`
- HEAD: `ad6f166`
- Working tree: final post-visual-review BOB-034 implementation and integrated docs

### Finding status

- F-020: `Resolved`

### Validation

- The reviewer rechecked the implementation, regression coverage, authoritative
  caption contracts, cross-browser results, and refreshed performance evidence.

### Reviewer conclusion

`No findings.`

## Review pass 31 - Captain acceptance and completion

### Snapshot

- Reviewer: Captain
- Pass: `real-browser acceptance and task completion`
- HEAD: `ad6f166`
- Working tree: final BOB-034 implementation after hover-caption closure

### Acceptance

- On 2026-07-30, the Captain verified the hover-caption fix in the real browser.
- The Captain explicitly accepted the fix and final visual result.
- BOB-034 is now `Done`; all automated acceptance, performance, documentation, and
  independent-review requirements are complete.

### Reviewer conclusion

`Accepted.`
