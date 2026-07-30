# ADR-0019: BOB-034 software-renderer performance budget

Status: Accepted
Date: 2026-07-30

## Context

ADR-0018 requires narrative-known star planes and their analytic rays to render at
twice the astronomy-only footprint. Its consequences originally required the existing
BOB-034 map-performance budgets to remain unchanged.

Repeated isolated runs of the faithful ADR-0018 implementation exposed a
software-renderer cadence boundary: valid SwiftShader invocations alternated between
approximately `16.8 ms` and `33.2 ms` median frame intervals. Selecting only the
faster invocations would not provide a defensible regression authority. Reducing the
approved visual footprint or simplifying its analytic rays would fail the Captain's
real-browser visual requirement.

The Captain selected preservation of the approved visual result with an explicit,
bounded software-renderer policy. Smooth interaction on a real supported GPU/browser
remains a separate mandatory acceptance surface.

## Decision

- For BOB-034's pinned Chapter 1.14 production map-interaction fixture, the headless
  SwiftShader median frame-interval ceiling is `33.4 ms`, representing the observed
  30-fps cadence boundary.
- The camera and controls-target settlement deadline is `4 s`.
- The baseline-relative p95 ceiling remains `95.68 ms`, the median count of intervals
  above `50 ms` remains capped at `26`, and no raw interval may exceed `100 ms`.
- The command must run three comparable measured runs against one asserted fixture
  and one shared reset pose. Conflicting valid invocations may not be cherry-picked.
- Two fresh consecutive completed command invocations are required after a benchmark
  authority correction.
- This software-WebGL authority does not replace the Captain's real-browser visual
  and smooth orbit, pan, zoom, selection, focus, and reset review.

This decision narrowly supersedes ADR-0018's consequence that the larger footprint
must retain every pre-ADR-0018 benchmark budget unchanged. It does not alter
ADR-0018's visual sizes, emphasis, picking, geometry, or map-truth decisions.

## Consequences

- The automated gate tolerates SwiftShader's stable 30-fps cadence while continuing
  to reject slower median rendering, p95 regressions, excess long frames, raw stalls,
  fixture drift, reset-pose drift, and non-settling controls.
- The exact benchmark policy is explicit rather than inferred from a selected fast
  invocation.
- Real GPU/browser smoothness remains necessary before BOB-034 can be completed.

## Alternatives considered

1. **Retain the `19.32 ms` median ceiling and select passing invocations.** Rejected
   because conflicting valid runs demonstrated that this would cherry-pick evidence.
2. **Reduce the known-star footprint or ray reach.** Rejected because it would undo
   the Captain-approved visual calibration.
3. **Remove the automated performance authority.** Rejected because the enlarged
   analytic footprint still requires reproducible regression coverage.

## Follow-up

BOB-034 records two consecutive passing invocations under the shared-pose authority,
retains the remaining budgets, and remains in progress until the Captain accepts
smooth real-browser interaction and the final visual hierarchy.
