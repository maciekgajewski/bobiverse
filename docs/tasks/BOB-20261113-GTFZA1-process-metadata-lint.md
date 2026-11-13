# BOB-20261113-GTFZA1: process-metadata lint

Status: Ready
Phase: 4 (LLM-assisted editorial pipeline; process hardening)
Last updated: 2026-11-13

## Objective

Process item 7 from `BOB-20261112-1TWD9T-extraction-contract.md` §Out of scope:
"process-metadata lint and ADR renumbering". Extend `scripts/tasks.py check`, which
CI already runs, so that broken ADR metadata and dangling process references fail
fast. Keep it small; no new tool, no CI workflow change.

## Binding references

- `BOB-20261112-1TWD9T-extraction-contract.md` (queued this task).
- `../adrs/README.md` (ADR naming and statuses).
- `../development-process.md` (task statuses; Done only after merge).

## What exists today

- `tasks.py check` validates task filenames, headings, IDs, uniqueness and one
  top-level `Status` from the allowed set. It does not look at ADRs or references.
- ADRs 0001–0027 are contiguous. Filenames match headings and statuses are all
  valid. Two numbers are used twice: 0018 (narrative-known star footprint;
  spoiler-projected system-survey observations) and 0026 (calendar-precision
  narrative dates; selected system-marker vocabulary, superseded by ADR-0027).
- 28 legacy Done tasks have no `## Log` and no merge SHA. Every Done task with a
  `## Log` cites a backticked SHA.
- One Done task, `BOB-20260803-X52E0D-spoiler-projected-system-status-markers.md`,
  cites four ADR filenames that never existed.

## Scope

1. **ADR checks**: filename `NNNN-<slug>.md`; heading `# ADR-NNNN: <title>` whose
   number matches the filename; exactly one `Status` of Proposed, Accepted,
   Rejected or `Superseded by ADR-NNNN` (the successor must exist); exactly one
   valid `Date`; numbers contiguous from 0001; no duplicate numbers except the
   grandfathered 0018 and 0026 (two files each; a stale allowlist entry fails).
2. **References** in task docs and ADRs: every `ADR-NNNN` number exists; every
   `adrs/<file>.md` path exists; every task filename resolves (paths under other
   directories, such as `docs/reviews/`, are skipped).
3. **Done evidence**: a Done task that has a `## Log` must cite the merge commit as
   a backticked SHA there. Legacy Done tasks without a Log are exempt.
4. `--adrs-dir` option (default `docs/adrs`; ADR checks are skipped when only
   `--tasks-dir` is given, so existing fixture tests are unaffected). Unit tests
   in `tests/python/test_tasks.py`.
5. Fix real violations minimally (X52E0D's four ADR paths). One line in
   `../adrs/README.md`.

## Out of scope

- **ADR renumbering.** The duplicates are real, but both 0018s and the 0026
  calendar ADR are Accepted, the README forbids rewriting accepted ADRs, and 55
  bare `ADR-0018` plus 12 `ADR-0026` mentions would each need a judgement about
  which ADR they mean (many in Captain-reviewed BOB-034 records). Proposal only, below; it
  needs the Captain.
- Back-filling merge SHAs into legacy tasks; checking that a cited SHA exists in
  git (CI clones are shallow); section-heading or log-format rules (headings vary
  widely across 67 tasks, and a rule would mean churn without accuracy value).

## Renumbering proposal (for the Captain)

Keep the current numbers and freeze the two duplicates (done here via the
allowlist). Cite 0018 and 0026 by filename, as 1TWD9T already does. New ADRs take
0028 onward; the lint rejects any new collision. Alternative: renumber the later
file of each pair to 0028/0029 and disambiguate every reference; the cost is high
and it rewrites accepted history.

## Acceptance criteria

1. `python3 scripts/tasks.py check` passes on the repository and reports task and
   ADR counts.
2. Each check above has a failing synthetic case in `tests/python/test_tasks.py`.
3. No CI workflow change; the full validation set passes.

## Validation

`python3 scripts/tasks.py check`, `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run test`, `npm run data:test`, `npm run data:validate`,
`npm run build`; `prettier --check` on changed Markdown; `git diff --check`.

## Log

### 2026-11-13

- Created on the manager's 15:50 instruction: item 7 the same way as item 6, a
  short task doc plus the implementation in one PR, with no separate doc review.
  Status Ready. Worktree `~/src/bobiverse-item7` on
  `bob-20261113-gtfza1-process-metadata-lint`, from origin/master `279b626`.
