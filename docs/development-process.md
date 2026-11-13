# Development process: roles and merge gate

This document governs how a change reaches `master` and who may decide what. Other
documents point here rather than restating these rules: [`AGENTS.md`](../AGENTS.md)
and [`tasks/README.md`](tasks/README.md). If this document conflicts with another
authoritative document, stop and surface the conflict; do not silently choose one.

This document relaxes none of these rules:

- the content and intellectual-property rules in [`AGENTS.md`](../AGENTS.md): source
  text is never committed or copied off the development host, and book text goes only
  to a provider the Captain has explicitly approved;
- the extraction preflight in [`chapter-extraction.md`](chapter-extraction.md) and
  its [checklists](chapter-extraction-checklists.md), which is never bypassed.

## Roles and authority

| Role                         | May decide or do                                                                                                                                                                                                                                                      | May not                                                                                                                                      | Recorded in                                  |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Captain (Maciej)             | Design reviews; final acceptance in a real browser; a standing OK for merges that pass the merge gate. Reserved decisions (below).                                                                                                                                    | —                                                                                                                                            | Task log or PR, with date and quoted wording |
| Manager bot                  | Assigns and coordinates tasks; authorises routine, in-design tasks outside the reserved decisions; relays Captain decisions; posts the reviewer's approval record; merges PRs that pass the merge gate without asking each time.                                      | Make or pre-empt a reserved decision; merge a PR that fails any gate item                                                                    | Task log; PR approval record; merge commit   |
| Developer bot                | Code only, plus content-specific UI when a chapter warrants it. One task, one branch, one PR, with tests and a manual browser checklist. Pushes only its own task branch (through the repository-scoped deploy key on the development host) and opens that PR itself. | Push to `master`; force-push a published branch; amend or rebase published commits; mark a task Done before merge                            | Task log; PR body                            |
| Independent one-off reviewer | Reviews one exact SHA in a fresh context, read-only; approves or requests changes.                                                                                                                                                                                    | Edit what it reviews; carry an approval to another SHA; approve a PR that implements a reserved decision without a recorded Captain decision | Review report; approval record on the PR     |
| Extractor bot                | Chapter extraction under [`chapter-extraction.md`](chapter-extraction.md). Once the Captain approves a chapter, it pushes its own data branch and opens a data-only PR for it (below).                                                                                | Approve a chapter; merge its own PR; change code                                                                                             | Review package; data PR body                 |

Reserved to the Captain: design decisions; model, provider and privacy changes;
disputed book facts; chapter approval; visual acceptance. A PR that implements a
reserved decision must carry his recorded decision.

The reviewer follows the same independence model as
[ADR-0023](adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md) (fresh
context, read-only, explicit evidence). This document does not widen ADR-0023's
delegated astronomy-acceptance authority.

## Relayed approvals

An approval relayed by an agent counts as the Captain's only when the relaying role
is defined for that kind of decision. For example, the manager relays Captain
decisions; a developer or reviewer does not. Record each relayed approval in the task
log or PR with its date, the relaying role, and the Captain's quoted wording when
available.

## Lifecycle of a change

1. A task file is `Ready`. The Captain, or for a routine, in-design task outside the
   reserved decisions the manager, authorises implementation. The task becomes
   `In progress`.
2. The developer works on one branch and opens one PR with tests, validation results
   and a manual browser checklist.
3. An independent one-off reviewer reviews the exact head SHA. When it approves, the
   manager posts the approval record (below) and keeps the review report's path in
   the task log.
4. CI runs on that SHA.
5. When every merge-gate item holds, the manager squash-merges, pinned to the
   approved SHA.
6. The task becomes `Done` only after the merge, and only once any further acceptance
   its own criteria require (for example the Captain's visual acceptance) is
   complete.

## Data-only chapter PRs

Since 2026-11-13 (the Captain's decision of 21:43 CET, relayed by the manager), the
Extractor submits each Captain-approved chapter, or a short run of them, as its own
data-only PR, and the manager reviews and merges it. Such a PR needs no task file
and no manual browser checklist. Per-chapter facts in
`tests/fixtures/narrative-meaning.json` and a row in
[`chapter-promotion-log.md`](chapter-promotion-log.md) are not required. Existing
fixture facts stay; changing an existing one is a disputed book fact and needs the
Captain's recorded decision.

A data-only PR may change only this path:

- `data/narrative/chapters/` — the canonical chapter JSON that
  `scripts/chapter_promotion.py promote` writes, at
  `data/narrative/chapters/<book>/<number>.json`.

`npm run narrative:manifest`, which `promote` runs in post-write validation, also
rewrites `generated/narrative/chapter-manifest.json`. That file is gitignored and
must not be committed. Touching anything outside this list makes the change a
normal code PR, which needs a task file and follows the developer lifecycle above.

Its gate is the merge gate below, with item 4 met by the PR body. The body quotes
the Captain's approval of each chapter with its date and time, and the relay path when
relayed. The independent review checks that the data is exactly the approved
candidate, that the PR stays within the path allowlist, and that the required
safety nets in [`chapter-extraction.md`](chapter-extraction.md) pass: the generic
validators and the merged-text sentence-preservation check. A chapter that needs
code or content-specific UI goes to the developer as a separate task.

## Merge gate checklist

A PR merges only when every item holds for its current head SHA:

1. An independent reviewer approved this exact SHA. The approval is recorded on the
   PR as a comment review or PR comment reading `Approved <full sha>`, with the
   reviewer, date and scope.
2. Every required check is green on that same SHA: `Repository checks`,
   `Playwright (chromium)`, `Playwright (firefox)` and `Playwright (webkit)` (the job
   names in [`ci.yml`](../.github/workflows/ci.yml) are the source of truth).
3. The branch is up to date with `master`.
4. If the PR implements a reserved decision, the Captain's decision is recorded in the
   task or PR. For a data-only chapter PR, that is the quoted chapter approval.
5. The merge is a squash pinned to that SHA, for example
   `gh pr merge <n> --squash --match-head-commit <sha>`, or the REST merge call with
   `sha`.

## Re-review rules

- Any push after approval needs a new full review of the new head.
- A merge of `master` into the branch, including the update merges that up-to-date
  branches require, gets a merge-only re-review of the merge commit. It confirms that
  the merge adds nothing beyond `master` and any conflict resolution. CI must then
  pass on the new head. PR #6's published merge
  `8ae1aef1d9e3af63ee5a86d7de99b5f1a7a87517` is an example; it also carried a
  semantic link fix, which therefore needed review on its merits.
- Approvals never carry over to another SHA.

## Flaky tests and the retry allowance

Fix flaky tests. Never retry, skip, or extend deadlines to get past them; see
[`visual-testing.md`](visual-testing.md) for flake investigation.

CI's e2e `--retries=1` is a temporary allowance. A separate small change drops it
after three consecutive `master` runs in which all four jobs are green on attempt 1,
with no flaky tests and no re-runs.

## Appendix: draft `master` ruleset (proposal)

This is a proposal for Maciej to apply himself in the repository settings. Nothing
here changes a GitHub setting. Every PR is authored and pushed by the owner account,
which the bots also use, so some settings cannot be enforced.

| Setting                                                  | Proposed value                                                                                                         | Single-account note                                                                                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enforcement                                              | Active, targeting the default branch                                                                                   | Keep the bypass list empty so the owner account cannot skip the rules. Maciej can still edit or disable the ruleset in an emergency.                                                    |
| Restrict deletions                                       | On                                                                                                                     | Fits.                                                                                                                                                                                   |
| Block force pushes                                       | On                                                                                                                     | Fits.                                                                                                                                                                                   |
| Require linear history                                   | On                                                                                                                     | Fits squash-only.                                                                                                                                                                       |
| Require a pull request before merging                    | On; allowed merge method squash only                                                                                   | Fits. Also turn off merge commits and rebase merging under Settings → General.                                                                                                          |
| Required approvals                                       | 0                                                                                                                      | Does not fit: GitHub does not let a PR's author approve it, so one required approval would block every merge or need a bypass. The `Approved <full sha>` record is the control instead. |
| Dismiss stale approvals on push                          | On                                                                                                                     | No effect while required approvals are 0. The re-review rules are the real control.                                                                                                     |
| Require approval of the most recent push                 | Off                                                                                                                    | Does not fit: the pusher is always the owner account.                                                                                                                                   |
| Require conversation resolution                          | On (optional)                                                                                                          | Fits.                                                                                                                                                                                   |
| Require status checks to pass                            | On: `Repository checks`, `Playwright (chromium)`, `Playwright (firefox)`, `Playwright (webkit)`; source GitHub Actions | Fits. Names must match the job names in `ci.yml` exactly.                                                                                                                               |
| Require branches to be up to date before merging         | On (strict)                                                                                                            | Fits. Each `master` advance needs an update merge into the branch, which gets a merge-only re-review and fresh CI.                                                                      |
| Require signed commits; require deployments; merge queue | Off                                                                                                                    | Not needed for this repository.                                                                                                                                                         |
| Restrict who can push to `master`                        | Not used                                                                                                               | Cannot separate Maciej from the bots on one account; requiring a PR already blocks direct pushes.                                                                                       |

The pinned SHA is enforced by the merge command (`--match-head-commit`), not by a
ruleset setting.
