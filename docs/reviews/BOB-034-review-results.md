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
