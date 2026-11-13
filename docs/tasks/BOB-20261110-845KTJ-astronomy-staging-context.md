# BOB-20261110-845KTJ: clarify astronomy staging context failures

Status: In progress
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-11-12

## Objective and user-visible outcome

Distinguish a staged narrative anchor requiring fresh acquisition from a tampered
pinned query plan, with a fail-closed, actionable preflight diagnostic. Reconcile
historical Chapter 1.40–1.41 staging evidence without treating coherent master as
broken. No astronomy refresh or data change is authorized in this task.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, section 8
- `../implementation-plan.md`, Phase 2
- `../data/astronomy-pipeline.md`
- `../chapter-extraction.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`
- `BOB-20260805-XHVN3V-refresh-runtime-provenance-integrity.md`

## Scope and implementation plan

1. Reproduce old astronomy inputs plus the exact staged prior chain through 1.41;
   identify every changed query and why it differs.
2. Keep exact-plan comparison strict. Diagnose missing narrative anchor acquisition
   separately only when a coherent old plan explains the mismatch; malformed or
   tampered plans retain the exact-plan error.
3. Add small synthetic offline Python regressions for matched inputs, missing anchor
   acquisition, and tampering, including tampering alongside a new anchor.
4. Clarify exact-prior-chain preflight, isolated refresh, independent acceptance,
   generation, and combined-package approval in the affected operator documents.
5. Run the validation below, record evidence, commit locally and prepare a PR body.

Out of scope: pinned source/runtime/narrative changes, book text, source-text/,
network acquisition, provider/model/privacy decisions, UI changes, PR #4 flake fixes,
pushes and PR creation. Do not touch the 5173 acceptance server or its process.
If a defect requires changing pinned data or architectural authority, stop first.

## Acceptance criteria

- The precise historical query mismatch and source/root pairing are recorded.
- Matched inputs still pass; uncovered anchors fail with sorted stable IDs and a
  refresh instruction linking to the pipeline documentation.
- Exact-plan checks still reject altered query bytes, metadata, ordering, and other
  unsupported changes; no bypass, extra retry, or acceptance is introduced.
- Synthetic regression fixtures need neither network nor source book text.
- Staging documentation clearly separates failing pre-refresh diagnostics from the
  mandatory green final promotion preflight and ADR-0023 acceptance gate.
- All validation results and any inherited flakes are reported without hiding them.
- The task remains In progress until merge; independent review and hosted CI are
  publication-time gates, not claims made by this local implementation.

## Validation commands

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run build
CI=1 npm run test:e2e -- --config "$HOME/bobiverse-astro-artifacts/playwright.config.mts" --workers=1 --retries=0
git diff --check
```

Re-run the historical old-source/staged-root pairing in an external disposable
snapshot, before and after the code change, retaining logs outside the repository.
The Playwright wrapper must use a free 5174 (or 5175), absolute worktree paths and
reuseExistingServer: false. It must not use 5173 or modify committed port policy.

## Documentation and generated artifacts

Update only affected pipeline/promotion guidance, validator, synthetic tests and
this task. No generated or pinned artifacts should change. Draft PR body lives at
`~/src/bobiverse-astro-pr-body.md`; validation logs live in
`~/bobiverse-astro-artifacts/`, both outside version control.

## Risks and unresolved decisions

The unrefreshed pairing is expected to fail: an existing anchor row is not a coverage
proof. Avoid classifying arbitrary plan tampering as routine refresh advice. The
base is master 63bbd98, not the PR #4 worktree; inherited browser flakes may fail a
zero-retry run and must be reported, not fixed by expanding this task.

## Log

### 2026-11-10 (Europe/Amsterdam)

- Scope and local-only execution authorized by the manager under Maciej’s delegated
  routine in-design authority; no publishing authority is used.
- Read repository guidance, design, implementation plan, pipeline, staging contract,
  and ADRs 0011/0016/0023. Prepared the plan before implementation. Task-document
  self-review found no scope/design conflict; fresh independent task/code review is
  pending publication handoff (no review-agent launcher is available here).

- Historical reproduction: archived only scripts and structured astronomy/narrative
  artifacts from 8c108a0 outside the repository. With the prior-through-1.41 root,
  the original CLI exits 1 with the exact-plan error. Epsilon Indi
  (stellar-system-005631) resolves to existing GCNS row 6412595290592307840 at
  (2.2245862, -0.9827543, -2.7062633) pc. The old grouped bootstrap query omits that
  source ID and anchor ID; its per-anchor coverage query is also absent. Sol and
  prior coverage queries, and the CNS5 plan, are unchanged. This is correct
  rejection of an unrefreshed staging context, not a source/geometry defect.
- Extracted the existing exact-plan construction without changing its queries.
  Success still requires exact equality of both complete query lists and base ADQL.
  The new failure is used only when both plans exactly equal the derived plan for
  the covered subset. All other mismatches retain exact-plan failures.
- Added six synthetic regression tests (including GCNS and CNS5 new anchors,
  multiple uncovered anchors, every query and base-ADQL tampering with/without
  staged anchors, ordering, metadata, bootstrap accounting, unknown coverage and
  missing Sol). They pass on the new validator; the new diagnostic assertions fail
  on the original validator (three failing subcases), while tamper tests pass.
- No pinned data or generated runtime was changed; no astronomy refresh is needed
  or authorized. No design decision is requested.

- Task/document self-review caught a staging nuance: the exact-plan guard also
  rejects extra anchor queries. Clarified that a prior-chain preflight must retain
  its matching source/plan context; it cannot be rechecked against a full-chain
  refresh with a different anchor set. Added a synthetic regression for this
  reverse mismatch. This preserves the existing strict guard, not a new policy.

- Updated-validator historical controls: old 8c108a0 sources with their own canonical
  corpus still pass (271); refreshed 63bbd98 sources with the exact prior-through-1.41
  root pass (277). Old sources + that prior root still exit 1, now naming
  stellar-system-005631 and giving the isolated-refresh/acceptance/generation remedy.
  Before/after logs, exit files and exact query differences are retained externally.
- Non-browser checks pass: tasks (57), format:check, lint, typecheck, Vitest (240 in
  29 files), final Python data tests (85, including six new synthetic tests), normal
  data:validate (277 systems/six pinned sources), and build (42 narrative chapters).
  The normal build runs the unmodified fail-closed preflight path. Pinned source,
  config, schema, canonical narrative and generated runtime/manifest files are
  byte-identical to origin/master. npm ci used the unchanged lockfile; its existing
  audit findings were not expanded into this task.

- Full e2e completed on isolated loopback port 5174 using the external wrapper:
  `CI=1 npm run test:e2e -- --config
  "$HOME/bobiverse-astro-artifacts/playwright.config.mts" --workers=1 --retries=0`.
  Result: **91 passed, 2 failed, 0 skipped, 0 retried** (Chromium 29/31,
  Firefox 31/31, WebKit 31/31). Both failures are the unchanged expressive-map test
  at atlas.spec.ts:1062 (900x700 and 390x844), line 1216: immediate
  `astronomyCaption.count()` expected 0, received 1 after a click. This matches the
  caption-removal timing issue already reported in PR #4's scope. No retries or
  e2e/runtime fixes were added here, and the PR #4 worktree was not touched.
- The e2e failure is a publication/merge gate to revalidate after the independent
  flake fix lands; do not describe this branch as fully green. Trace, video,
  screenshots, JSON and HTML report remain in ~/bobiverse-astro-artifacts/.
- Final task/document self-review and diff checks found no additional findings.
  Fresh independent exact-SHA task/code review and hosted CI remain pending the
  owner's publication, not simulated here. Status remains In progress until merge.
  No design/data decision is needed. Prepared the local-only PR body and manual
  checklist at ~/src/bobiverse-astro-pr-body.md; no push or PR creation performed.

### 2026-11-12 (Europe/Amsterdam)

- Rebased the unpublished local commit onto origin/master `3053e95` (PR #4
  squash merge of reviewed head `3196b24`). The rebase completed with no
  conflicts.
- Marked M3AMGW Done in this worktree after that merge, with a short merge
  log line in its task file. This task remains In progress until its own PR
  merges.
- Re-validated the rebased worktree (Node 22.23.1 / npm 10.9.8). Tasks check
  58 files; format:check; lint; typecheck; Vitest 240/240 in 29 files; Python
  data tests 85/85; data:validate 277 systems / six pinned sources; production
  build (zero state and 42 chapter source files). All passed. npm ci was not
  rerun: package-lock.json is unchanged versus origin/master and the existing
  node_modules was sufficient.
- Full e2e **93/93 passed** (31 each in Chromium, Firefox and WebKit), zero
  retries, skips or flakes, 10.0m (Europe/Amsterdam). Invocation:
  `npm run narrative:manifest` then
  `CI=1 xvfb-run -a npx playwright test --config
  "$HOME/bobiverse-astro-artifacts/playwright.5175.config.mts" --workers=1
  --retries=0` on an external wrapper at `http://127.0.0.1:5175`. The
  icon-specimen test rewrote the tracked PNG; the generated copy was saved
  outside Git and the reviewed artifact was restored. Port 5173 was not used.
  Status remains In progress until merge.
