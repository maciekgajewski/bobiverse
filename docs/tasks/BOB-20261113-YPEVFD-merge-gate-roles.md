# BOB-20261113-YPEVFD: merge gate and roles in AGENTS.md

Status: Ready
Phase: Cross-cutting (development process and governance)
Last updated: 2026-11-13

## Objective and user-visible outcome

Write down how a change reaches `master` and who may decide what. Today these rules
live partly in `AGENTS.md`, partly in `docs/visual-testing.md`, and partly in
conversation. After this task:

- one process document states the merge gate and the role and authority split;
- `AGENTS.md` keeps a short pointer to it;
- Maciej has a draft `master` ruleset that he can apply himself.

The Captain, the bots and any one-off reviewer then work from the same written gate.
The change is documentation only. No code, CI, data, schema or GitHub settings change.

## Binding references

- `../../AGENTS.md`, in particular:
  - "Before implementation": Ready plus explicit Captain authorisation;
  - "Content and intellectual property": the Captain approves external models;
  - "Validation and completion": the CI-green merge rule;
  - "Task and ADR workflow": the `[$review-agent]` review loops.
- `README.md` (the task statuses and the definition of `Ready`).
- `../visual-testing.md`, "GitHub Actions CI" and the flake/retry paragraph.
- `../../.github/workflows/ci.yml`: job names `Repository checks` and
  `Playwright (chromium|firefox|webkit)`, plus the e2e `--retries=1`.
- `../../playwright.config.ts`: `retries: process.env.CI ? 2 : 0`.
- `../technical-design.md`, the ADR-0023 paragraph (Captain-delegated independent
  agent review) and Section 13 (human approval of extraction results).
- `../chapter-extraction.md`, §Scope and authority and §Approval, promotion, and
  provenance (chapter approval stays with the Captain).
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`: the existing
  precedent for a fresh, read-only, independent reviewer under delegated authority.
- `../adrs/README.md`: process rules are not an ADR trigger, so no ADR is needed
  unless the Captain decides otherwise (Q6).
- `BOB-20261112-1TWD9T-extraction-contract.md`: recent example of the task format and
  of how open Captain decisions are recorded.
- `BOB-20261110-M3AMGW-e2e-flake-stabilisation.md`: the flake policy and the retry
  allowance that this task records.

## Authorisation

The manager relayed this scope on 2026-11-13 as process item 3, "Merge gate and roles
in AGENTS.md" (items 1 and 5 of the earlier process review). It was agreed with the
Captain. The retry-drop rule (about three clean hosted runs on `master`) is already
approved. This file is `Ready` for manager review; implementation needs that review
and the authorisation required by `AGENTS.md` (see conflict C1).

## Scope

1. **Process document.** A new `docs/development-process.md` holds the details. It
   follows the existing pattern of one topical document under `docs/`, like
   `visual-testing.md` and `chapter-extraction.md`. It has these sections:
   - **Roles and authority.**
     - Captain (Maciej): design reviews, final browser acceptance and merge approval.
       Reserved to him: design decisions, model/provider/privacy changes, disputed
       book facts, chapter approval and visual acceptance.
     - Manager bot: assigns and coordinates tasks. It may authorise routine,
       in-design tasks, relays Captain decisions, and merges once review and CI pass
       and the Captain has given his OK.
     - Developer bot: one task, one branch, one PR. Its work includes tests and a
       manual browser checklist. It pushes only its own task branch (through the
       repo-scoped deploy key on piotr) and opens that PR itself. It never pushes to
       `master` and never force-pushes a published branch.
     - Independent one-off reviewer: a fresh context for each review, pinned to one
       SHA, read-only. This is the same independence model as ADR-0023, without
       widening ADR-0023's astronomy-acceptance authority.
     - Extractor bot: chapter extraction under `chapter-extraction.md` only. Chapter
       approval stays with the Captain.
   - **Relayed approvals.** An approval relayed by an agent counts as the Captain's
     only when the relaying role is defined for that kind of decision. Record the
     approval in the task log or PR, with its date and the quoted wording when
     available.
   - **Merge gate.** A PR merges only when all of these hold:
     - an independent one-off reviewer has approved its exact head SHA;
     - every required CI check is green on that same SHA;
     - the Captain has given his OK (see Q1).

     The merge is a squash pinned to the reviewed SHA (`gh pr merge <n> --squash
--match-head-commit <sha>`, or the REST merge call with `sha`). Re-review rules:
     - any push after approval needs a new full review of the new head;
     - a master merge that only resolves conflicts gets a conflict-only re-review of
       the merge commit, as with PR #6 (`7885e91`);
     - stale approvals never carry over.

   - **Flaky tests.** Fix them; never retry, skip or extend deadlines to get past
     them. CI's `--retries=1` is a temporary allowance. It is dropped by a separate
     small change after about three clean hosted runs on `master` (already approved;
     "clean" is defined in Q3).
   - **Task status.** A task becomes `Done` only after its PR merges, and after any
     extra acceptance its own criteria require, for example the Captain's visual
     acceptance (HS0NZP stays In progress for that reason).
   - **Draft `master` ruleset** (an appendix, marked as a proposal that Maciej applies
     himself; see the next section).
2. **`AGENTS.md`.** Make small edits only:
   - add a short "Roles and merge gate" pointer section of at most about six lines;
   - adjust "Before implementation" so that manager authorisation of routine,
     in-design tasks is allowed (C1);
   - replace the two `[$review-agent]` loops with one line that points to the
     process document (C2);
   - extend the CI line in "Validation and completion" with "on the reviewed head
     SHA" and a pointer (C3).
3. **`docs/tasks/README.md`.** Align the `Done` definition with "only after merge"
   (C5), and add a one-line pointer.
4. **`docs/visual-testing.md`.** Make the retry paragraph point to the flake rule and
   the retry-drop condition in the process document. Its facts stay the same (C4).
5. **Log.** Record any conflict resolution the Captain decides in this task's log.

## Out of scope

- Changing `.github/workflows/ci.yml`, `playwright.config.ts` or any retry count.
  Dropping `--retries=1` is a separate follow-up once its condition is met.
- Applying branch protection or rulesets, changing repository settings, creating bot
  accounts or GitHub Apps, or changing tokens and deploy keys.
- Changing ADR-0023's delegated astronomy authority, the extraction contract's
  approval rules, or the editorial routine-promotion exception.
- Rewriting the history or status of existing tasks.
- Any code, data or schema change.

## Proposed text outline (not the final text)

`docs/development-process.md`:

1. Purpose and authority: this document governs how changes reach `master`;
   `AGENTS.md` points here; conflicts are surfaced, not silently resolved.
2. Roles and authority: a table of role, may decide, may not decide, and how its
   decisions are recorded.
3. Relayed approvals: when they count, and how to record them (quoted wording, date,
   relaying role).
4. Lifecycle of a change: task (Ready, then authorised, then In progress), branch, PR
   with tests and a manual browser checklist, independent review at a SHA, CI on that
   SHA, Captain OK, pinned squash merge, then Done.
5. Merge gate checklist: five checkable items, each answerable from the PR page and
   the review record.
6. Re-review rules: a new push needs a full review; a conflict-only master merge
   needs a conflict-only review of the merge commit; approvals go stale.
7. Flaky tests and the temporary retry allowance, with its drop condition.
8. Appendix: draft `master` ruleset.

`AGENTS.md` pointer section, as a draft of about four lines: "Changes reach `master`
only through the merge gate and role split in `docs/development-process.md`:
independent review of the exact head SHA, green required CI on that SHA, the
Captain's OK, and a squash merge pinned to that SHA. Agents act only within their
role; a relayed approval counts only when the relaying role is defined for it."

## Draft `master` ruleset (proposal for Maciej to apply)

Repository ruleset "master protection", targeting the default branch:

| Setting                                                  | Proposed value                                                                                                         | Single-account note                                                                                                                                                                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enforcement                                              | Active                                                                                                                 | Keep the bypass list empty so the owner account, which the bots also use, cannot skip the rules. Maciej can still edit or disable the ruleset in an emergency.                                                                                                                  |
| Restrict deletions                                       | On                                                                                                                     | Fits.                                                                                                                                                                                                                                                                           |
| Block force pushes                                       | On                                                                                                                     | Fits.                                                                                                                                                                                                                                                                           |
| Require linear history                                   | On                                                                                                                     | Fits squash-only.                                                                                                                                                                                                                                                               |
| Require a pull request before merging                    | On; allowed merge method squash only                                                                                   | Fits. Also turn off merge commits and rebase merging under Settings → General.                                                                                                                                                                                                  |
| Required approvals                                       | 0 (see Q2)                                                                                                             | Does not fit: GitHub does not let a PR's author approve it, and every PR here is authored by the owner account. Requiring one approval would block every merge, or need a bypass. The reviewer's SHA-pinned approval is recorded as a PR comment or review record instead (Q2). |
| Dismiss stale approvals on push                          | On                                                                                                                     | Has no effect while required approvals are 0. The written re-review rule is the real control.                                                                                                                                                                                   |
| Require approval of the most recent push                 | Off                                                                                                                    | Does not fit: the pusher is always the owner account.                                                                                                                                                                                                                           |
| Require conversation resolution                          | On (optional)                                                                                                          | Fits.                                                                                                                                                                                                                                                                           |
| Require status checks to pass                            | On: `Repository checks`, `Playwright (chromium)`, `Playwright (firefox)`, `Playwright (webkit)`; source GitHub Actions | Fits. Check names must match the job names in `ci.yml` exactly.                                                                                                                                                                                                                 |
| Require branches to be up to date before merging         | Off (see Q4)                                                                                                           | If on, every master advance forces a master merge into the branch and so a conflict-only re-review.                                                                                                                                                                             |
| Require signed commits; require deployments; merge queue | Off                                                                                                                    | Not needed for this repository.                                                                                                                                                                                                                                                 |
| Restrict who can push to `master`                        | Not used                                                                                                               | Cannot separate Maciej from the bots on one account; "require a PR" already blocks direct pushes.                                                                                                                                                                               |

The pinned SHA is enforced by the merge command (`--match-head-commit`), not by a
ruleset setting.

## Conflicts with the current documents (record, do not resolve silently)

- **C1. Authorisation.** `AGENTS.md` "Before implementation" requires that "the
  Captain has explicitly authorized implementation". The agreed role split lets the
  manager authorise routine, in-design tasks. Recent tasks already record
  "manager-relayed authorisation" (845KTJ, 1TWD9T, 3HBNVF). Proposed fix: allow both,
  with the manager's authority limited to routine, in-design work (Q5).
- **C2. Review loop.** `AGENTS.md` refers to `[$review-agent]` twice. No such skill
  exists in the repository; `.codex/skills/` holds only `extract-bobiverse-chapter`.
  The loops say "repeat the review until it comes clean" but do not pin a SHA, require
  independence or a fresh context, or define re-review after a push. The second loop
  says "review the document" after implementation, which is ambiguous.
- **C3. CI rule.** `AGENTS.md` and `visual-testing.md` require all four CI jobs green
  before merge, but not on the reviewed SHA. No reviewer approval or Captain OK is
  required, and the merge method is not named.
- **C4. Retries.**
  - CI runs e2e with `--retries=1`, and `playwright.config.ts` sets `retries: 2`
    whenever `CI` is set, which the CLI flag overrides in CI.
  - `visual-testing.md` calls the one retry "diagnostic" and says that dropping it
    "should be a separately reviewed follow-up once hosted no-retry evidence confirms
    stability". This agrees with the approved rule, but the threshold is not stated.
  - The config's `2` would apply to any local `CI=1` run without `--retries`; local
    instructions always pass `--retries=0`.
  - Proposed: document the allowance and its drop condition. Leave both values
    unchanged in this task.
- **C5. Done.** `docs/tasks/README.md` defines `Done` as "acceptance criteria and
  validation are complete", without requiring the merge. Recent practice (M3AMGW,
  845KTJ, 1TWD9T) marks Done only after merge.
- **C6. Who pushes.** Not a conflict, but unwritten: current practice is that the
  developer bot pushes its own task branch through a repo-scoped deploy key on piotr
  and opens the PR itself; only merges to `master` go through the manager. The
  process doc writes this down as the developer role.
- **C7. Approvals on GitHub.** PRs #4–#6 have no GitHub reviews or review comments;
  the approvals were recorded only in conversation and task logs. A SHA-pinned
  approval rule needs a record that can be checked (Q2).
- **No conflict:** ADR-0023 already uses the same fresh, read-only, independent
  reviewer model, and the technical design keeps chapter approval with the Captain.
  The process document cites both and does not restate them.

## Open questions for the Captain

- **Q1. What does the Captain's merge OK cover?**
  - (a) An explicit OK for every PR.
  - (b) Every PR except routine, in-design PRs that the manager authorised and that
    need no browser acceptance.
  - (c) A standing OK once review and CI pass, with the Captain reserving PRs that
    touch reserved decisions.
- **Q2. Where is the reviewer's approval recorded?**
  - (a) A PR comment in a fixed format: `Approved <full sha>`, reviewer, date, scope.
  - (b) A GitHub "Comment" review carrying the same text. GitHub forbids an "Approve"
    review from the author account.
  - (c) A separate bot account or GitHub App for reviewers, so that one required
    approval becomes enforceable.
  - (d) The task log only.
- **Q3. What counts as a "clean" hosted run for dropping `--retries=1`?**
  - (a) All four jobs green on a `master` push with zero flaky annotations.
  - (b) The same, plus no re-run attempts.
  - (c) The same over three consecutive runs rather than any three.
- **Q4. Require branches to be up to date before merging?**
  - (a) Off (proposed). The pinned squash merge plus green CI on the head is enough.
  - (b) On, accepting a conflict-only re-review whenever `master` moves.
- **Q5. Manager authorisation of routine, in-design tasks (C1).**
  - (a) Write it into `AGENTS.md` as proposed.
  - (b) Allow it only for task types listed in the process document.
  - (c) Keep Captain-only authorisation and stop the current practice.
- **Q6. ADR or not?**
  - (a) No ADR. `docs/adrs/README.md` does not list process rules as an ADR trigger.
  - (b) A short ADR for the authority split, since it delegates Captain authority
    (as ADR-0023 did for astronomy).

## Acceptance criteria

1. `docs/development-process.md` exists. It has the outline sections above and states
   every scope bullet: the merge gate, re-review rules, flaky-test rule, Done-after-
   merge rule, roles and reserved decisions, and the relayed-approval rule.
2. The ruleset draft is marked as a proposal. It lists every setting in the table
   above with its single-account note. No GitHub setting is changed by the task.
3. `AGENTS.md` grows by at most about ten net lines. It points to the process
   document and no longer contains the unpinned `[$review-agent]` loops or a
   Captain-only authorisation rule that contradicts the agreed split, unless the
   Captain chooses otherwise in Q5.
4. `docs/tasks/README.md` and `docs/visual-testing.md` agree with the process document
   and keep their existing facts.
5. Each conflict C1–C7 is either resolved as the Captain decided, with the decision
   recorded in this task's log, or left visibly open in the process document.
6. No CI, config, code, data or schema file changes.
7. Validation passes.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npx prettier --check AGENTS.md docs/development-process.md docs/tasks/README.md docs/visual-testing.md docs/tasks/BOB-20261113-YPEVFD-merge-gate-roles.md
git diff --check
```

`npm run format:check` does not cover Markdown, so the prettier command checks the
changed Markdown directly. There is no link checker in the repository. Check every
new or changed relative link by hand, and record the result in the log. CI job names
in the ruleset draft must match `ci.yml` exactly.

## Documentation and generated artifacts

Documentation only: `docs/development-process.md` (new), `AGENTS.md`,
`docs/tasks/README.md`, `docs/visual-testing.md` and this task file. No generated
artifacts.

## Risks

- **Bloat in `AGENTS.md`.** Mitigation: pointer only; the details live in one place.
- **Unenforceable rules on a single account.** Approval rules cannot be enforced by
  GitHub; the ruleset draft says so plainly, and Q2 chooses a record that can be
  checked.
- **Over-delegation.** The written manager authority could be read as wider than
  agreed. Mitigation: list the reserved decisions explicitly and cite ADR-0023's
  limits.
- **Drift.** The process document's job names could drift from `ci.yml`. Mitigation:
  name the source of truth and require an exact match.
- **Gate deadlock.** Nobody may merge if the Captain's OK has no written default.
  Mitigation: Q1.

## Log

### 2026-11-13 (Europe/Amsterdam)

- Created Ready from the manager-relayed scope (process item 3). This is a task
  document only: no implementation and no push. It was based on origin/master
  `0433761` in `~/src/bobiverse-gate`.
- Read `AGENTS.md`, `docs/tasks/README.md`, the 1TWD9T task, ADR-0023,
  `docs/adrs/README.md`, `visual-testing.md`, `ci.yml` and `playwright.config.ts`,
  and searched for merge, review, retries and Captain. Conflicts are recorded as
  C1–C7; open Captain questions are Q1–Q6.
