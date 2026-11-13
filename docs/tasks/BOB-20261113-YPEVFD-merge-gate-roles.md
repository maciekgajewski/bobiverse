# BOB-20261113-YPEVFD: merge gate and roles in AGENTS.md

Status: Done
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
- `../adrs/README.md`: process rules are not listed as an ADR trigger, although "a
  core technology or ownership boundary" could arguably cover the authority split.
  Q6 decides: no ADR.
- `BOB-20261112-1TWD9T-extraction-contract.md`: recent example of the task format and
  of how open Captain decisions are recorded.
- `BOB-20261110-M3AMGW-e2e-flake-stabilisation.md`: the flake policy and the retry
  allowance that this task records.

## Authorisation

The manager relayed this scope on 2026-11-13 as process item 3, "Merge gate and roles
in AGENTS.md" (items 1 and 5 of the earlier process review). It was agreed with the
Captain. The retry-drop rule (three consecutive clean hosted runs on `master`, as
defined in Q3) is already approved. The Captain answered Q1–Q6 on 2026-11-13
(relayed by the manager; see Captain decisions and the log). The task-doc review
approved `bd7c9ab`, and the manager authorised implementation under the 2026-11-09
delegation (Q5).

## Scope

1. **Process document.** A new `docs/development-process.md` holds the details. It
   follows the existing pattern of one topical document under `docs/`, like
   `visual-testing.md` and `chapter-extraction.md`. It has these sections:
   - **Roles and authority.**
     - Captain (Maciej): design reviews and final browser acceptance. He has given a
       standing merge OK (Q1). Reserved to him: design decisions,
       model/provider/privacy changes, disputed book facts, chapter approval and
       visual acceptance.
     - Manager bot: assigns and coordinates tasks. It may authorise routine,
       in-design tasks (Q5), relays Captain decisions, posts the reviewer's approval
       record (Q2), and merges PRs that pass the merge gate without asking each time
       (Q1).
     - Developer bot: one task, one branch, one PR. Its work includes tests and a
       manual browser checklist. It pushes only its own task branch (through the
       repo-scoped deploy key on piotr) and opens that PR itself. It never pushes to
       `master` and never force-pushes a published branch.
     - Independent one-off reviewer: a fresh context for each review, pinned to one
       SHA, read-only. This is the same independence model as ADR-0023, without
       widening ADR-0023's astronomy-acceptance authority.
     - Extractor bot: chapter extraction under `chapter-extraction.md` only. Chapter
       approval stays with the Captain. It has no GitHub write access (unwritten
       practice, like C6).
   - **Relayed approvals.** An approval relayed by an agent counts as the Captain's
     only when the relaying role is defined for that kind of decision. Record the
     approval in the task log or PR, with its date and the quoted wording when
     available.
   - **Merge gate.** A PR merges only when all of these hold:
     - an independent one-off reviewer has approved its exact head SHA, and the
       approval is recorded on the PR as `Approved <full sha>` with the reviewer,
       date and scope (Q2);
     - every required CI check is green on that same SHA;
     - if the PR implements a reserved decision, the Captain's decision is recorded
       in the task or PR.

     The manager then merges without asking (Q1), with a squash pinned to the
     reviewed SHA: `gh pr merge <n> --squash --match-head-commit <sha>`, or the REST
     merge call with `sha`. Re-review rules:
     - any push after approval needs a new full review of the new head;
     - a master merge into the branch, including the update merges that strict
       up-to-date requires (Q4), gets a merge-only re-review. That review confirms
       the merge adds nothing beyond master and any conflict resolution. PR #6's
       published merge `8ae1aef1d9e3af63ee5a86d7de99b5f1a7a87517` is the example; it
       also carried a semantic link fix, so it was not purely conflict-only, but the
       rule stands. CI must then pass on the new head;
     - stale approvals never carry over.

   - **Flaky tests.** Fix them; never retry, skip or extend deadlines to get past
     them. CI's `--retries=1` is a temporary allowance. It is dropped by a separate
     small change after three consecutive clean hosted runs on `master`: all four
     jobs green on attempt 1, no flaky tests, no re-runs (Q3).
   - **Task status.** A task becomes `Done` only after its PR merges, and after any
     extra acceptance its own criteria require, for example the Captain's visual
     acceptance (HS0NZP stays In progress for that reason).
   - **No relaxation.** A short pointer that the document relaxes neither the
     `AGENTS.md` content and IP rules (source text never committed or copied off the
     host; book text only to a Captain-approved provider) nor the extraction
     preflight, which is never bypassed.
   - **Draft `master` ruleset** (an appendix, marked as a proposal that Maciej applies
     himself; see the next section).
2. **`AGENTS.md`.** Make small edits only:
   - add a short "Roles and merge gate" pointer section of at most about six lines;
   - adjust "Before implementation" so that the Captain or, for routine in-design
     tasks outside the reserved decisions, the manager may authorise implementation
     (C1, Q5);
   - replace the two `[$review-agent]` loops with one line that points to the
     process document (C2);
   - extend the CI line in "Validation and completion" with "on the reviewed head
     SHA" and a pointer (C3);
   - change "A task is complete only when its acceptance criteria and documented
     validation pass" so that completion also requires the merge (C5).
3. **`docs/tasks/README.md`.**
   - Change "`Ready` ... does not replace the requirement for explicit authorization
     from the Captain" so that it names the same Captain-or-manager authorisation as
     `AGENTS.md`, bounded by the reserved decisions (C1, Q5).
   - Align the `Done` definition with "only after merge" (C5).
   - Add a one-line pointer to the process document.
4. **`docs/visual-testing.md`.** Make the retry paragraph point to the flake rule and
   the retry-drop condition in the process document. Its facts stay the same (C4).
5. **Log.** Record in this task's log any further Captain decision made during
   implementation.

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
4. Lifecycle of a change: task (Ready, then authorised by the Captain or the
   manager, then In progress), branch, PR with tests and a manual browser checklist,
   independent review at a SHA, recorded approval, CI on that SHA, pinned squash
   merge by the manager, then Done.
5. Merge gate checklist: each item answerable from the PR page (approval record,
   checks on the head SHA, any recorded Captain decision, branch up to date).
6. Re-review rules: a new push needs a full review; a master merge into the branch
   needs a merge-only review of the merge commit; approvals go stale.
7. Flaky tests and the temporary retry allowance, with its drop condition.
8. Appendix: draft `master` ruleset.

`AGENTS.md` pointer section, as a draft of about four lines: "Changes reach `master`
only through the merge gate and role split in `docs/development-process.md`:
independent review of the exact head SHA, green required CI on that SHA, a recorded
Captain decision where one is reserved, and a squash merge pinned to that SHA. Agents act only within their
role; a relayed approval counts only when the relaying role is defined for it."

## Draft `master` ruleset (proposal for Maciej to apply)

Repository ruleset "master protection", targeting the default branch:

| Setting                                                  | Proposed value                                                                                                         | Single-account note                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enforcement                                              | Active                                                                                                                 | Keep the bypass list empty so the owner account, which the bots also use, cannot skip the rules. Maciej can still edit or disable the ruleset in an emergency.                                                                                            |
| Restrict deletions                                       | On                                                                                                                     | Fits.                                                                                                                                                                                                                                                     |
| Block force pushes                                       | On                                                                                                                     | Fits.                                                                                                                                                                                                                                                     |
| Require linear history                                   | On                                                                                                                     | Fits squash-only.                                                                                                                                                                                                                                         |
| Require a pull request before merging                    | On; allowed merge method squash only                                                                                   | Fits. Also turn off merge commits and rebase merging under Settings → General.                                                                                                                                                                            |
| Required approvals                                       | 0                                                                                                                      | Does not fit: GitHub does not let a PR's author approve it, and every PR here is authored by the owner account. Requiring one approval would block every merge, or need a bypass. The SHA-pinned approval is a comment review or PR comment instead (Q2). |
| Dismiss stale approvals on push                          | On                                                                                                                     | Has no effect while required approvals are 0. The written re-review rule is the real control.                                                                                                                                                             |
| Require approval of the most recent push                 | Off                                                                                                                    | Does not fit: the pusher is always the owner account.                                                                                                                                                                                                     |
| Require conversation resolution                          | On (optional)                                                                                                          | Fits.                                                                                                                                                                                                                                                     |
| Require status checks to pass                            | On: `Repository checks`, `Playwright (chromium)`, `Playwright (firefox)`, `Playwright (webkit)`; source GitHub Actions | Fits. Check names must match the job names in `ci.yml` exactly.                                                                                                                                                                                           |
| Require branches to be up to date before merging         | On (strict, Q4)                                                                                                        | Fits. Every master advance needs an update merge into the branch, which gets a merge-only re-review and fresh CI before merging.                                                                                                                          |
| Require signed commits; require deployments; merge queue | Off                                                                                                                    | Not needed for this repository.                                                                                                                                                                                                                           |
| Restrict who can push to `master`                        | Not used                                                                                                               | Cannot separate Maciej from the bots on one account; "require a PR" already blocks direct pushes.                                                                                                                                                         |

The pinned SHA is enforced by the merge command (`--match-head-commit`), not by a
ruleset setting.

## Conflicts with the current documents (record, do not resolve silently)

- **C1. Authorisation.** `AGENTS.md` "Before implementation" requires that "the
  Captain has explicitly authorized implementation". The agreed role split lets the
  manager authorise routine, in-design tasks. Recent tasks already record
  "manager-relayed authorisation" (845KTJ, 1TWD9T, 3HBNVF). `docs/tasks/README.md`
  says the same: `Ready` "does not replace the requirement for explicit authorization
  from the Captain". Resolved by Q5: both files allow the manager to authorise
  routine, in-design tasks, bounded by the reserved decisions.
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
  - The config's `2` would apply to any local `CI=1` run without `--retries`.
    Local runs without `CI` get zero retries from `playwright.config.ts` itself:
    `package.json`'s `test:e2e` does not pass `--retries=0`, and `visual-testing.md`
    passes it only on the flake-investigation command.
  - Proposed: document the allowance and its drop condition. Leave both values
    unchanged in this task.
- **C5. Done.** `docs/tasks/README.md` defines `Done` as "acceptance criteria and
  validation are complete", and `AGENTS.md` "Validation and completion" says "A task
  is complete only when its acceptance criteria and documented validation pass".
  Neither requires the merge. Recent practice (M3AMGW, 845KTJ, 1TWD9T) marks Done
  only after merge; both files are aligned to that.
- **C6. Who pushes.** Not a conflict, but unwritten: current practice is that the
  developer bot pushes its own task branch through a repo-scoped deploy key on piotr
  and opens the PR itself; only merges to `master` go through the manager. The
  process doc writes this down as the developer role.
- **C7. Approvals on GitHub.** PRs #4–#6 have no GitHub reviews or review comments;
  the approvals were recorded only in conversation and task logs. A SHA-pinned
  approval rule needs a record that can be checked; resolved by Q2.
- **No conflict:** ADR-0023 already uses the same fresh, read-only, independent
  reviewer model, and the technical design keeps chapter approval with the Captain.
  The process document cites both and does not restate them.

## Captain decisions (relayed by the manager on 2026-11-13)

- **Q1. Scope of the merge OK.** Options: (a) an explicit OK for every PR; (b) all
  except routine PRs; **(c) a standing OK — chosen**. The manager merges PRs with an
  exact-SHA independent approval and green CI on that SHA, without asking each time.
  Reserved decisions still need the Captain, and a PR that implements one must carry
  his recorded decision.
- **Q2. Where the approval is recorded.** Options: (a) a PR comment; **(b) a GitHub
  comment review, or a PR comment, reading `Approved <full sha>` with reviewer, date
  and scope, posted by the manager — chosen**; (c) a separate reviewer account; (d)
  the task log only. The review report's path is also kept in the task log.
- **Q3. A clean run for dropping `--retries=1`.** Options: (a) any green run; (b) no
  re-runs; **(c) three consecutive `master` runs, all four jobs green on attempt 1,
  no flakes, no re-runs — chosen**.
- **Q4. Require branches to be up to date.** Options: (a) off; **(b) on (strict) —
  chosen**, matching the ruleset draft already sent to Maciej. Update merges get the
  merge-only re-review.
- **Q5. Manager authorisation of routine, in-design tasks.** Options: **(a) write it
  into `AGENTS.md` and the tasks README, bounded by the reserved decisions —
  chosen**; (b) listed task types only; (c) Captain only.
- **Q6. ADR.** Options: **(a) no ADR — chosen**; (b) a short ADR.

## Acceptance criteria

1. `docs/development-process.md` exists. It has the outline sections above and states
   every scope bullet: the merge gate, re-review rules, flaky-test rule, Done-after-
   merge rule, roles and reserved decisions, and the relayed-approval rule.
2. The ruleset draft is marked as a proposal. It lists every setting in the table
   above with its single-account note. No GitHub setting is changed by the task.
3. The process document states the decided merge gate:
   - an exact-SHA approval recorded as `Approved <full sha>` with reviewer, date and
     scope (Q2);
   - green CI on that SHA;
   - a recorded Captain decision for reserved decisions;
   - the manager's standing authority to merge without asking (Q1);
   - strict up-to-date branches with merge-only re-review (Q4);
   - the three-consecutive-clean-runs retry-drop condition (Q3).
4. `AGENTS.md` grows by at most about ten net lines. It points to the process
   document and no longer contains the unpinned `[$review-agent]` loops. Its
   authorisation rule allows the manager to authorise routine, in-design tasks
   bounded by the reserved decisions (Q5). Its completion rule requires the merge
   (C5).
5. `docs/tasks/README.md` states the same authorisation rule and the same
   Done-after-merge rule as `AGENTS.md`. Both `docs/tasks/README.md` and
   `docs/visual-testing.md` otherwise keep their existing facts.
6. No ADR is added (Q6). No CI, config, code, data or schema file changes.
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
- **Standing merge authority misread.** A PR that quietly implements a reserved
  decision could merge under the standing OK. Mitigation: the reviewer checks for
  reserved decisions and blocks approval without a recorded Captain decision.

## Log

### 2026-11-13 (Europe/Amsterdam)

- Created Ready from the manager-relayed scope (process item 3). This is a task
  document only: no implementation and no push. It was based on origin/master
  `0433761` in `~/src/bobiverse-gate`.
- Read `AGENTS.md`, `docs/tasks/README.md`, the 1TWD9T task, ADR-0023,
  `docs/adrs/README.md`, `visual-testing.md`, `ci.yml` and `playwright.config.ts`,
  and searched for merge, review, retries and Captain. Conflicts are recorded as
  C1–C7; open Captain questions are Q1–Q6.
- Task-doc review of PR #8 at `c07c3cc` requested changes. Before publishing, the
  manager amended the first commit: C6 is now unwritten practice, not a conflict,
  and Q7 was removed.
  - B1: scope item 3 now also changes the `docs/tasks/README.md` authorisation
    sentence, so C1 is fixed in both files.
  - B2: scope item 2 now also changes the `AGENTS.md` completion sentence, and C5
    cites both files.
- Captain answers, relayed by the manager on 2026-11-13:
  - Q1: standing merge OK. Maciej, 2026-11-13: "Merge PR 5 and PR 6, and propose a
    rule so you can merge reviewed, green bobiverse PRs without asking." Reserved
    decisions still need him.
  - Q2: option (b), a comment review or PR comment `Approved <full sha>` with
    reviewer, date and scope, posted by the manager; the report path stays in the
    task log.
  - Q3: three consecutive `master` runs, all four jobs green on attempt 1, no
    flakes, no re-runs.
  - Q4: strict up-to-date branches on, as in the ruleset draft already sent to
    Maciej; update merges get the merge-only re-review.
  - Q5: yes. On 2026-11-09 Maciej delegated authorisation of routine in-design tasks
    to the manager: "Do all, except keep approved chapters in local git repo." That
    quote is the source of the delegation. The operative bound is the
    reserved-decisions list (design, model/provider/privacy, disputed book facts,
    chapter approval, visual acceptance), not "Do all".
  - Q6: no ADR.
- Implementation started under the manager's authorisation (task-doc review approved
  `bd7c9ab`); status In progress. Folded in the review nits:
  - R1: the Q5 log keeps the 2026-11-09 quote as the source and states that the
    operative bound is the reserved-decisions list.
  - R2: PR #6's published merge is cited as
    `8ae1aef1d9e3af63ee5a86d7de99b5f1a7a87517`, noting that it also carried a
    semantic link fix.
  - R3: C4 now says where local zero retries come from.
  - R4: the ADR README reference is softened; Q6 is decided as no ADR.
  - R5: the Extractor role records that it has no GitHub write access.
  - R6: the process document states that it does not relax the content and IP
    rules or the extraction preflight.
- Added `docs/development-process.md` (120 lines). Edited `AGENTS.md` (+17/−8, net
  +9 lines), `docs/tasks/README.md` and the retry paragraph of
  `docs/visual-testing.md`. `ci.yml` and `playwright.config.ts` are unchanged; no ADR.
- Link check by hand (no checker exists): every relative Markdown link in the
  changed files resolves to an existing file. That is 11 links: 9 in
  `development-process.md` and 1 each in `docs/tasks/README.md` and
  `visual-testing.md`. The backticked paths in `AGENTS.md` and this task also exist.
- Validation (Node 22.23.1, fresh `npm ci` and `.venv`):
  - tasks check (61 files);
  - format:check, lint and typecheck;
  - Vitest 247/247 in 29 files;
  - Python data tests 85/85;
  - data:validate (277 systems, six pinned sources);
  - build (zero state and 42 chapters);
  - prettier `--check` on all five changed Markdown files;
  - `git diff --check`.

  All passed. No e2e was run, since the change is docs only. Nothing was pushed.
  Status stays In progress until merge.

### 2026-11-13 (Europe/Amsterdam; merge)

- Publication correction: the "Nothing was pushed" line above was true when written,
  but the implementation commit `0ed136f` was then pushed. CI run 43398318656 was
  green on it, and it was approved and merged.
- PR #8 was squash-merged to master as `f89c9c4` on Friday 2026-11-13. Status is now
  **Done**, recorded after that merge.
