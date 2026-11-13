# BOB-20261113-RG3XYR: recoverable chapter promotion via the approved-chapters repository

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-13

## Objective and user-visible outcome

Process item 5. Recording an approved run in `~/bobiverse-approved-chapters` and
promoting it into the canonical tree are done by hand today (the contract calls the
approved-chapters commit "an interim manual step"). This task adds one small local
script, `scripts/chapter_promotion.py`, with three subcommands:

- `record` commits an approved run's outputs to the approved-chapters repository and
  creates an annotated tag `chapter-<ref>-approved`;
- `promote` writes that tagged candidate into the canonical tree, appends the
  promotion-log row, and restores everything if any step fails;
- `verify` checks, read-only, that each tagged chapter is still value-identical to
  its canonical file.

No editorial rule, approval authority, model, provider or schema changes. Chapter
approval stays with the Captain.

## Binding references

- `../../AGENTS.md` (no book text in commits, logs or artifacts; routine-promotion
  exception; `--help` contract).
- `../development-process.md` (roles, reserved decisions, merge gate).
- `../chapter-extraction.md` §Approval, promotion, and provenance; §Candidate
  assembly and temporary corpus; §Astronomy preflight and isolated acquisition.
- `../chapter-extraction-checklists.md` Checklists B and C;
  `../chapter-promotion-log.md`.
- `BOB-20261112-1TWD9T-extraction-contract.md` (queued this task) and
  `BOB-20261113-BR7HZS-execution-profiles-preflight.md` (fixture-test pattern).

## Scope

1. **`record --chapter <ref> --workspace <dir> --approval <file> [--repo <path>]`**
   (run by the Extractor). `--repo` defaults to `~/bobiverse-approved-chapters`.
   - Refuses, writing nothing (exit 1), when:
     - the workspace is not under `/tmp`, or is inside the bobiverse checkout or
       the approved-chapters repository;
     - the repository is not a git top level, has a remote, or is dirty;
     - the tag or `chapters/<ref>/` already exists;
     - any workspace file is not on the allowlist, or a required file is missing;
     - `candidate.json` is not JSON for `<ref>`;
     - the approval file lacks `chapter`, `date`, `captain_approval_quote` or
       `relaying_role`.
   - It then copies the workspace files and the approval (as `APPROVAL.json`) into
     `chapters/<ref>/`, commits, and creates the annotated tag.
   - If the commit or tag fails, it deletes any new tag, resets to the starting
     `HEAD` and removes `chapters/<ref>/`. It exits 1 once `HEAD`, the tags and a
     clean status are confirmed, and exits 3, naming what is left, if not.
2. **Allowlist.** No other file is accepted, so free-form or excerpt-bearing files
   cannot enter the record by accident.

   | File                                                    | Required |
   | ------------------------------------------------------- | -------- |
   | `candidate.json`                                        | yes      |
   | `narrative-validation.log`, `narrative-validation.exit` | yes      |
   | `astronomy-validation.log`, `astronomy-validation.exit` | yes      |
   | `projection.log`, `projection.exit`                     | no       |
   | `provenance.json` (`prepare-corpus` output)             | no       |
   | `preflight-report.json` (`extraction_preflight.py`)     | no       |
   | `canonical.diff`                                        | no       |

   Free-form review notes (for example `human-review.md`, `report.md` and
   `change-note.txt` in the 1.42 record), ledgers, `source_evidence.py review`
   excerpts, `*.txt` files and the approval file itself, if placed in the workspace,
   are refused.

3. **`promote --chapter <ref> --workspace <dir> --decisions <text> [--repo <path>]`**
   (run by the developer bot, which then opens the PR). It needs a clean bobiverse
   worktree and an empty workspace under `/tmp`.
   - It reads the tagged `candidate.json` and `APPROVAL.json` with `git show`.
   - It builds a fresh root with `prepare-corpus` and runs the two offline
     validators: `npm run narrative:validate -- --root` and
     `npm run data:validate -- --narrative-root`. A failure exits 1 with nothing
     written. Isolated astronomy acquisition (§Promotion step 3) stays manual.
   - Then, inside one transaction, it:
     - writes the candidate to `data/narrative/chapters/<b>/<n>.json`, formats it
       with Prettier and checks JSON value identity;
     - inserts one row at the end of the promotion-log table. The row has the
       Europe/Amsterdam date, the canonical SHA-256 (the log's existing column),
       the decisions text, the approved-chapters commit and tag, the approved
       SHA-256 when formatting changed bytes (§Checksum provenance) and any
       NON-CONFORMING label (`"label": "NON-CONFORMING"` in the approval);
     - runs the §Post-write validation commands.

     Before writing, it saves the chapter file (or notes its absence) and the log.
     Any failure restores both and re-runs `narrative:manifest`. It exits 1 once the
     restored bytes are confirmed, and exits 3, naming the saved copies, if not.

   - It never commits, pushes or opens a PR.
4. **`verify [--repo <path>]`** (read-only). For each `chapter-*-approved` tag, it
   checks that the canonical file is value-identical to the tagged candidate, and
   fails on a mismatch or a missing file. It also reports, without failing, how
   many chapters' latest promotion-log row cites no approved-chapters tag.
5. **Docs.** Pointers in §Checksum provenance and in Checklists B (item 7) and C.
6. **Tests.** `tests/unit/chapter-promotion.test.ts`, using temporary git
   repositories, a stand-in `npm`, synthetic JSON and no book text:
   - allowlist refusal;
   - record success with an annotated tag;
   - record rollback on a commit failure and on a tag failure;
   - promote success, with the log row placed in the table;
   - promote with a validator failure (nothing written);
   - promote restore on a post-write failure and on a log-write failure;
   - verify, both passing and failing;
   - `--help` in `tests/unit/script-help.test.ts`.

## Out of scope

- Approving chapters; running extraction; automating Pass 1 or Pass 2; isolated
  astronomy acquisition.
- Checksum binding between the approval and the candidate, `SHA256SUMS` manifests
  and checksum checks in `verify`. Git's commit and tag history is the record
  (Q-C2).
- A source-overlap scan in `record` (Q-C1; possible later).
- Backfilling records for `1.3`–`1.41`, rewriting promotion-log history, a remote
  for the approved-chapters repository, and CI, schema or validator changes.

## Decisions

- **Q-C1 (Captain, relayed by the manager on 2026-11-13):** "It's ok to read the
  text as many time as required, as long as it stays on the box. Accuracy of
  extraction is the primary goal." Reading source text on piotr is fine. A
  source-overlap scan in `record` is skipped for now and noted as possible later
  (manager direction).
- **Q-C2 (Captain, same message):** "I see no reason for checksum checks, we don't
  need this level of formality. We need lightweight agile process and should get
  moving." The approval does not name a candidate SHA-256, and `record`, `promote`
  and `verify` do no hash binding.
- **Q-M1–Q-M5 (manager, 2026-11-13):**
  - the Extractor runs `record`, and the developer runs `promote` and opens the PR;
  - `promote` appends the log row inside the transaction;
  - it is one script;
  - the approved-chapters README gets a one-off manual correction ("process item
    3" to "item 5"), as a follow-up step outside this repository;
  - `verify` checks tagged chapters only and reports the untagged count.

## Known gaps (not resolved here)

- **K3.** Checklist B item 7 says to commit "after approval", but approval is
  Checklist C item 1. The checklist pointer places `record` after C1.
- **K4.** §Post-write validation splits the `narrative:generate` command's
  `--output` path onto its own line. The script runs the corrected command.
- **K6.** The historical 1.42 records disagree; they are left as they are. `verify`
  compares values, not bytes.

## Acceptance criteria

1. `scripts/chapter_promotion.py` implements `--help`, `record`, `promote` and
   `verify` as scoped, with no network or model call.
2. `record` refuses non-allowlisted files and the other listed cases without
   writing. It creates one commit and one annotated tag, and it rolls back a failed
   commit or tag (exit 3 if the rollback can't be confirmed).
3. A validator failure in `promote` writes nothing. Any later failure leaves the
   chapter file and the promotion log byte-identical (exit 3 if that can't be
   confirmed). On success, one row is added to the log table.
4. `verify` fails on a value mismatch and reports the untagged count.
5. The tests above pass on synthetic fixtures only, and all validation commands
   pass.

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
git diff --check
```

No e2e: no application code changes.

## Log

### 2026-11-13 (Europe/Amsterdam)

- Drafted as process item 5 on origin/master `9651689` in `~/src/bobiverse-promotion`.
  This is a task document only: no implementation and no push.
- Read `AGENTS.md`, `development-process.md`, the implementation plan §8,
  technical design §13–§14, the ADR index and the promotion and approval passages of ADRs 0001, 0016 and 0023,
  the extraction contract and checklists, the promotion log and 1TWD9T. In
  `~/bobiverse-approved-chapters` I read only the README, the file list,
  `APPROVAL.md`, `NON-CONFORMING.txt`, `candidate.sha256` and
  `validation-results.json`. Nothing was written there, and no book text was read.
- Status Draft: Q-C1 and Q-C2 need the Captain, and Q-M1–Q-M5 needed the manager
  (decided below).
- Published as PR #12 at `c58ff86`. Merged origin/master `f005b72` (PR #11) into the
  branch with a normal merge commit (`ac060cf`).
- Task-doc review of `c58ff86` requested changes:
  - B1: added the exact record allowlist, with an include or exclude reason for
    each 1.42 file. `human-review.md`, `report.md` and `change-note.txt` are
    excluded because the docs do not rule out excerpts in them. Names came from a
    directory listing; those files were not opened.
  - B2: `promote` no longer claims §Promotion steps 1–7. It runs only the offline
    validators, fails closed when astronomy needs isolated acquisition, and leaves
    step 3 and a task's validation commands manual.
  - B3: specified the `promote` transaction (saved bytes, restore and SHA-256
    check, covering the log-append failure) and the `record` rollback (no
    leftover `chapters/<ref>/`, commit or tag). Both are in the acceptance criteria
    and the test plan.
- Manager decisions on Q-M1–Q-M5 are recorded above under Decisions, under its
  delegation. K5 is resolved by Q-M1. Q-C1 and Q-C2 stay open for the Captain, so
  the status stays Draft.
- Ride-along from the PR #11 review: 9C9QV9 is marked Done (`f005b72`); the
  Checklist A pointer no longer says "repository root"; the non-writable-workspace
  test restores the mode in a `finally`.
- The task-doc re-review approved `f17893c`. A local, unpushed commit with the round
  2 nits was then dropped in favour of the leaner scope above.
- Maciej answered Q-C1 and Q-C2, relayed verbatim by the manager on 2026-11-13: "It's
  ok to read the text as many time as required, as long as it stays on the box.
  Accuracy of extraction is the primary goal. I see no reason for checksum checks,
  we don't need this level of formality. We need lightweight agile process and
  should get moving."
- Manager direction on the same day:
  - Q-C2: no; the approval names no SHA-256;
  - Q-C1: skip the overlap scan for now;
  - simplify the task; keep the allowlist, rollback and restore, and basic tests;
  - drop `SHA256SUMS` and hash binding.

  The doc was trimmed to match. The r2 nits kept for correctness are annotated
  tags, the workspace refusal and exit 3 for an unconfirmed rollback.

- Status Ready on the manager's authorisation, relaying the Captain's answers.
  Implementation follows in the same PR.
- Status In progress. Implemented `scripts/chapter_promotion.py` (`record`,
  `promote`, `verify`) with 13 fixture tests in `tests/unit/chapter-promotion.test.ts`
  and a `--help` entry in `script-help.test.ts`. Pointers were added in
  §Checksum provenance and Checklists B7 and C.
- Validation on piotr (Node 22.23.1):
  - `tasks check` passed (65 files); `format:check`, `lint` and `typecheck`
    passed;
  - `test` passed (31 files, 306 tests); `data:test` passed (85 tests);
  - `data:validate` passed (277 systems); `build` passed;
  - `prettier --check` on the changed Markdown and `git diff --check` passed.
- Read-only smoke: `verify` against the real approved-chapters repository reports
  `1.42: matches chapter-1.42-approved` and 41 untagged latest rows, and leaves it
  clean. `record` and `promote` were not run against the real repositories.
- Done only after merge.
