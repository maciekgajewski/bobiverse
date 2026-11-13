# BOB-20261113-RG3XYR: recoverable chapter promotion via the approved-chapters repository

Status: Draft
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-13

## Objective and user-visible outcome

Process item 5. Today the approved-chapters record, the review package and the
canonical promotion are assembled by hand: the contract calls the approved-chapters
commit "an interim manual step [that] stands until the recoverable-promotion task
automates it" (§Checksum provenance). This task specifies one small local script
that:

- records an approved run's outputs, never book text, in the local no-remote
  repository `~/bobiverse-approved-chapters`, committed and tagged
  `chapter-<ref>-approved`;
- promotes exactly that tagged candidate into the canonical tree, covering the
  offline parts of §Promotion. Isolated astronomy acquisition stays manual. On any
  failure it leaves canonical files and the promotion log byte-for-byte unchanged;
- verifies, read-only, that each recorded canonical chapter can be recovered from
  its tag: it is value-identical to the tagged candidate, and its SHA-256 values
  match the promotion log.

The Captain, the manager and the operator then rely on one mechanical path instead
of hand copying. The task changes no editorial rule, no approval authority, no model
or provider, and no schema. Chapter approval stays the Captain's.

## Binding references

- `../../AGENTS.md`: content and IP rules (no book text in commits, logs or
  artifacts); the routine-promotion exception (no per-chapter task); the `--help`
  contract; "a task is still required when the work changes ... tooling".
- `../development-process.md`: roles (the Extractor produces candidates only, has no
  GitHub write access and may not approve or promote), reserved Captain decisions
  (chapter approval), relayed approvals, the merge gate.
- `../chapter-extraction.md`: §Review package; §Approval, promotion, and provenance
  (§Approval, §Checksum provenance, §Promotion, §Post-write validation); §Candidate
  assembly and temporary corpus; §Astronomy preflight and isolated acquisition.
- `../chapter-extraction-checklists.md`, Checklists B (items 6–7) and C.
- `../chapter-promotion-log.md`: the append-only log and its SHA-256 column.
- `../implementation-plan.md` §8 (Phase 4): "Produce a human-reviewable diff and
  require explicit approval"; "Unapproved model output cannot update canonical
  data"; "No source text or credentials enter commits, logs, or static builds."
- `../technical-design.md` §13 (commit only approved structured facts; no
  extraction result is authoritative without human approval) and §14.
- ADRs: `0001` (chapter-authored narrative state), `0016` (deterministic anchor
  bootstrap) and `0023` (agent review of deterministic astronomy refreshes: exact
  chapter promotion still requires the Captain's approval).
- `BOB-20261112-1TWD9T-extraction-contract.md` (which queued this task as "scripts
  for the approved-chapters repository and generated review packages") and
  `BOB-20261113-BR7HZS-execution-profiles-preflight.md` (pattern for a local,
  fail-closed tool with fixture tests).
- Existing tooling: `source_evidence.py prepare-corpus` and `review`,
  `scripts/narrative-cli.ts` (`validate`, `manifest`, `generate`),
  `scripts/validate_data.py`, `scripts/extraction_preflight.py`.

## Current state (read on piotr, 2026-11-13; no book text read)

- `~/bobiverse-approved-chapters` has no remote, one commit (`b6ff548`) and one tag
  (`chapter-1.42-approved`). It holds `chapters/1.42/` with `candidate.json`,
  `candidate.sha256`, `APPROVAL.md`, `NON-CONFORMING.txt`, validation exit codes
  and logs, `validation-results.json`, `diff-summary.json`, a normalized diff,
  `human-review.md`, `report.md` and `change-note.txt`. I read only the README,
  the file list, `APPROVAL.md`, `NON-CONFORMING.txt`, `candidate.sha256` and
  `validation-results.json`.
- No promotion or approved-chapters script exists in the repository. Promotion
  follows Checklist C by hand. `prepare-corpus` already builds the fresh
  validation root.
- The promotion log records `1.42` twice: the 2026-08-06 row and the 2026-11-10
  replacement row, with a provenance section after the table.

## Proposed scope (narrow)

1. **One script, `scripts/chapter_promotion.py`** (Q-M3), with `--help` per
   `AGENTS.md`, three subcommands, no skip or `--force` flag, and no network access
   or model call. It is not staged into Pass 1.
2. **`record`** (run by the Extractor, Q-M1) copies the files named in the record
   allowlist below from a workspace directory under `/tmp` into `chapters/<ref>/` of
   the approved-chapters repository. It then writes `APPROVAL.json` and
   `SHA256SUMS`, commits, and tags `chapter-<ref>-approved`.
   - `APPROVAL.json` holds:
     - the chapter and the candidate SHA-256;
     - the Captain's quoted approval, its date and the relaying role;
     - the base revision;
     - for a NON-CONFORMING run, the label plus the provider, model and workflow
       fields, in the BR7HZS approval-record style.
   - **Checks before writing.** `record` refuses, without writing anything, when:
     - the approved-chapters repository has a remote, or its worktree is not
       clean;
     - the tag or `chapters/<ref>/` already exists;
     - a required file is missing, or any file in the workspace is not on the
       allowlist;
     - a JSON file does not parse, or an `.exit` file is not a single integer;
     - `candidate.json`'s SHA-256 differs from `candidate.sha256` or from the
       approval's candidate SHA-256.
   - **Transaction.** After the checks pass, `record` records the starting `HEAD`,
     copies the files, writes the two generated files, commits, then tags. If any
     later step fails, it rolls back:
     - it deletes the tag if it was created;
     - it returns the branch to the starting `HEAD` (the worktree was clean, so
       nothing else is lost);
     - it removes `chapters/<ref>/`;
     - it confirms that `HEAD`, the tag list and `git status --porcelain` match
       the start.

     It then exits non-zero. If the rollback cannot be confirmed, it exits 3 and
     names what is left, for a person to clean up (B3(b)).
3. **`promote`** (run by the developer bot on its promotion branch; the developer
   opens the PR, Q-M1) takes a tag and first checks that the tag's commit,
   `SHA256SUMS` and `APPROVAL.json` agree with `candidate.json`. It covers only
   part of §Promotion (B2):
   - **Steps 1–2:** it builds a fresh root with `prepare-corpus` (the current
     canonical tree plus the approved candidate) and runs both offline validators:
     narrative validation and `validate_data.py --narrative-root`.
   - **Step 3 stays manual.** `promote` never plans, acquires or refreshes
     astronomy. If `data:validate` fails, including the uncovered-anchor
     diagnostic, isolated acquisition has not been completed and landed yet.
     `promote` exits non-zero, names §Astronomy preflight and isolated
     acquisition, and writes nothing.
   - **Steps 4–5:** only after both validators pass does it write
     `data/narrative/chapters/<b>/<n>.json`, with standard Prettier formatting, and
     confirm JSON value identity with the candidate.
   - **Step 7, inside the transaction (Q-M2):** it appends one promotion-log row.
     The row has the chapter, the applied date and the canonical SHA-256. When the
     bytes differ, it also has the approved SHA-256. It adds the approved-chapters
     commit and tag, any NON-CONFORMING label, and the material editorial
     decisions, passed in as text written by a person. `promote` then re-reads the
     log and confirms that it ends with exactly that row.
   - **Step 6, post-write commands only:** it runs the §Post-write validation
     commands. It does not run any task's validation commands; that part of step 6
     stays with the developer.
   - **Transaction (B3(a)).** Before writing, `promote` saves the pre-write bytes
     (or the absence) of the canonical chapter file and of the promotion log in the
     workspace. Any failure of the write, the identity check, the log append, the
     log re-read or a post-write command restores both files from the saved copies
     and re-runs `narrative:manifest` (generated files are gitignored). It then
     confirms that both files' SHA-256 values match the saved values, and exits
     non-zero. If that confirmation fails, it exits 3 and names the saved copies.
   - It needs a clean worktree, and it never commits, pushes or opens a PR.
4. **`verify`** (read-only, Q-M5): for every tag `chapter-<ref>-approved`, it checks
   that the canonical chapter file is value-identical to the tagged candidate, and
   that the promotion log's latest row for that chapter cites the matching SHA-256
   values. A mismatch exits non-zero. It also reports, without failing, the count of
   chapters whose latest promotion-log row cites no approved-chapters tag. It never
   repairs.
5. **Docs.** Pointers only:
   - §Checksum provenance and Checklists B–C name the script;
   - the "interim manual step" sentence is updated;
   - Checklist B item 7 points to `record` after C1 (K3);
   - the post-write command block is fixed (K4).
6. **Tests** (fixtures only; see the test plan).

### Record allowlist (B1)

`record` accepts exactly these names in the workspace and nothing else; any other
file fails `record` (fail closed). A name is allowed only if its content is
machine-produced from JSON or validator output, or written by `record` itself, so it
cannot carry book text. The script and its tests check these names, not file
contents.

| File                                                    | Source                                                                       | Required  |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- | --------- |
| `candidate.json`                                        | the frozen approved candidate (structured facts and original summaries only) | yes       |
| `candidate.sha256`                                      | `sha256sum candidate.json` output                                            | yes       |
| `provenance.json`                                       | `prepare-corpus` JSON output (paths and SHA-256 values only)                 | yes       |
| `preflight-report.json`                                 | `extraction_preflight.py` report (source fingerprint fields only)            | yes       |
| `narrative-validation.log`, `narrative-validation.exit` | narrative validator on the candidate root                                    | yes       |
| `astronomy-validation.log`, `astronomy-validation.exit` | `validate_data.py --narrative-root` on that root                             | yes       |
| `projection.log`, `projection.exit`                     | `narrative-cli.ts generate` on that root                                     | no        |
| `canonical.diff`                                        | diff of the canonical chapter JSON that approval would create                | no        |
| `APPROVAL.json`, `SHA256SUMS`                           | written by `record`; refused if already present in the workspace             | generated |

Explicitly excluded, so `record` fails if any of them is present:

- **Free-form review files**, including the 1.42 tree's `human-review.md`,
  `report.md` and `change-note.txt`. They were written during human review, and
  the docs do not establish that they cannot contain book text: §Review package
  puts bounded evidence excerpts in the same package. Excluded conservatively.
- **Other free-form 1.42 files:** `NON-CONFORMING.txt` (its content belongs in the
  structured `APPROVAL.json` fields); `APPROVAL.md` (replaced by `APPROVAL.json`);
  and `validation-results.json` (hand-assembled with free-text fields; replaced by
  the `.log`/`.exit` pairs).
- **`diff-summary.json` and `merged-to-final.normalized.diff`** from 1.42. They
  have no specified generator, so `canonical.diff` takes their place.
- **Always excluded:** the sealed ledger and any draft ledger, whose claims quote
  the source; output of `source_evidence.py review` (excerpts); any source file or
  `*.txt` file; claim-to-classification and mention tables; the D2 list. The
  review package parts that are free-form or model-written stay on the
  extraction host with the review package (K2).

These names come from the 1.42 directory listing only. The free-form files were not
opened.

## Out of scope

- Approving a chapter, or deciding what counts as approval. The script records an
  approval that already exists; chapter approval is reserved to the Captain.
- Running an extraction, reading `source-text/` or any source file, or sending book
  text anywhere. The script never opens the source; it uses only SHA-256 values
  already recorded.
- Generating editorial review content (claim tables, decisions) or automating Pass 1
  or Pass 2.
- Having the script commit to, push or open PRs on the bobiverse repository (the
  developer does that by hand, Q-M1); any remote for the approved-chapters
  repository.
- Backfilling approved-chapters records for chapters `1.3`–`1.41`, or rewriting
  historical promotion-log rows or the existing `chapter-1.42-approved` record.
- Isolated astronomy acquisition or refresh (§Astronomy preflight and isolated
  acquisition stays manual), and validator, schema, CI or ADR changes.

## Safety properties

1. **No book text enters the record.** Only allowlisted names are accepted, and
   anything else fails `record` (B1). The script never opens a source file.
2. **Approved bytes only.** `promote` writes only the candidate whose SHA-256 is in
   both `APPROVAL.json` and `SHA256SUMS` at the tagged commit.
3. **Fail closed, byte-for-byte unchanged.** A validator failure, including any
   astronomy failure that needs isolated acquisition, writes nothing. A failure of
   the write, the identity check, the log append or a post-write command restores
   the canonical chapter file and the promotion log to their saved bytes, and the
   restore is checked by SHA-256 (B3(a)).
4. **A failed `record` leaves nothing behind.** There is no partial
   `chapters/<ref>/`, extra commit or tag; this is checked against the starting
   state (B3(b)).
5. **Append-only.** The promotion log only gains rows; historical rows are never
   rewritten. Approved-chapters tags are never moved or deleted, except to roll
   back the run that just created them.
6. **No remote, no network.** `record` refuses a remote, and nothing calls the
   network or a model.
7. **Astronomy stays manual.** `promote` runs only the offline validators and never
   attempts acquisition or a refresh (B2).
8. **Recoverable.** Each promoted chapter can be rebuilt from its tag, and `verify`
   checks it without writing.
9. **No authority change.** The script never decides approval, merges, or bypasses
   the merge gate or the preflight.

## Acceptance criteria

1. `scripts/chapter_promotion.py` implements `--help` and the three subcommands as
   specified, with no skip flag and no network or model access.
2. `record` accepts exactly the allowlisted names. It fails, writing nothing, on
   any of the following: a non-allowlisted or explicitly excluded file
   (`human-review.md`, `report.md`, `change-note.txt`, a ledger, a `*.txt` file); a
   missing required file; a remote; a dirty approved-chapters worktree; an existing
   tag or directory; a SHA-256 mismatch. On success it creates one commit and one
   tag.
3. If `record` fails after copying (commit or tag failure), `HEAD`, the tag list
   and `git status --porcelain` of the approved-chapters repository match the
   starting state, `chapters/<ref>/` is absent, and the exit code is non-zero.
4. `promote` runs §Promotion steps 1–2 (the offline validators only), 4–5, step 7
   (the log append) and the post-write commands of step 6. It does not claim step 3
   or a task's validation commands. A validator failure, including an astronomy
   failure, exits non-zero with no write and names §Astronomy preflight and
   isolated acquisition.
5. A failure of the write, the identity check, the log append, the log re-read or a
   post-write command leaves the canonical chapter file and the promotion log
   byte-identical to before, and exits non-zero. A rollback that cannot be
   confirmed exits 3.
6. On success, the canonical file is value-identical to the candidate, and exactly
   one promotion-log row is appended with the SHA-256 values, the commit and tag,
   and any NON-CONFORMING label.
7. `verify` is read-only. Per tag, it reports value identity and promotion-log
   agreement, failing on a mismatch. It reports, without failing, the count of
   chapters whose latest log row cites no tag.
8. No output, record or test fixture contains book text; tests use synthetic
   fixtures only.
9. The doc pointers are made and no rule changes. All validation commands pass.

## Test plan

Vitest fixture tests in `tests/unit/chapter-promotion.test.ts`, run by
`npm run test` and so by CI, following the BR7HZS fixture pattern:

- temporary git repositories for the bobiverse checkout (a synthetic narrative tree
  and promotion log, and a copy of the script) and for the approved-chapters
  repository;
- stand-ins for the validators, the formatter and the post-write commands;
- synthetic candidates and allowlisted files.

Cases:

- **`record` success:** one commit and one tag, and `SHA256SUMS` covers every
  recorded file.
- **`record` refusals (nothing written):** each excluded name (`human-review.md`,
  `report.md`, `change-note.txt`, `NON-CONFORMING.txt`, a ledger, a `*.txt`), an
  unknown name, a missing required file, a remote, a dirty worktree, an existing tag
  or directory, a SHA-256 mismatch, a pre-existing `APPROVAL.json`.
- **`record` rollback (B3(b)):** a fixture `pre-commit` hook that fails, and a
  `reference-transaction` hook that rejects `refs/tags/*` so the tag step fails
  after the commit. Both runs end with the starting `HEAD`, no new tag, a clean
  status and no `chapters/<ref>/`.
- **`promote` success:** a formatted write, value identity, exactly one appended
  row, and the log re-read.
- **`promote` validator failures (B2):** narrative, astronomy baseline and uncovered
  anchor. Each exits non-zero with no write, and the astronomy cases name
  §Astronomy preflight and isolated acquisition.
- **`promote` rollback (B3(a)):** a promotion log made read-only so the append
  fails (skipped when running as root); a stand-in that truncates the log during
  the re-read check; a failing post-write command; an identity mismatch from a
  stand-in formatter. Each leaves the chapter file and the log byte-identical (or
  the chapter absent) and exits non-zero.
- **`promote` refusals:** a tampered candidate, a disagreeing `SHA256SUMS` or
  `APPROVAL.json`, a dirty worktree.
- **`verify`:** identical, drifted and missing canonical files; log agreement and
  disagreement; the untagged-row count is reported without failing; no writes.
- **No book text in output:** synthetic marker strings never appear.
- **`--help`** in `tests/unit/script-help.test.ts`.

Validation: `tasks check`, `format:check`, `lint`, `typecheck`, `test`,
`data:test`, `data:validate`, `build`, `git diff --check`. No e2e, because no
application code changes.

## Conflicts and gaps (surfaced, not resolved)

- **K1. Process-item numbering.** The approved-chapters `README.md` says "Until
  promotion scripts exist (process item 3)". This task is process item 5, and
  item 3 was the merge gate (YPEVFD). That README lives outside this repository;
  per Q-M4 it gets a one-off manual correction as a follow-up step.
- **K2. The review package versus "never book text".** §Review package includes
  "evidence IDs with bounded excerpts rendered by `source_evidence.py review`; these
  stay on the extraction host". §Checksum provenance asks for "review notes" in the
  approved-chapters repository. The committed record must therefore be a subset of
  the review package: no excerpts and no sealed ledger, whose claims quote the
  source. Proposed resolution: an allowlist that excludes both (safety property 1).
- **K3. Checklist B item 7 versus approval order.** Checklist B (run and handoff)
  item 7 commits run outputs "after approval", but approval is Checklist C item 1.
  Proposed: `record` runs after C1 and before C2, and Checklist B item 7 points to
  it.
- **K4. Post-write command block.** In §Post-write validation, the
  `narrative:generate` command's `--output` path is split onto its own line, so the
  block does not run as pasted. Proposed: fix the line break (a doc fix, no rule
  change).
- **K5. Who promotes?** The Extractor may not promote (`development-process.md`), and
  `AGENTS.md` requires "explicit approval and application authority" for routine
  promotion without naming a role.
  - Resolved by Q-M1: the Extractor runs `record`, which is local-only and is not a
    promotion. The developer bot runs `promote` and opens the PR, which goes
    through the merge gate. Chapter approval stays with the Captain.
- **K6. Historical `1.42` record.** `APPROVAL.md` says "promote byte-for-byte" and
  records an astronomy preflight failure. The 2026-11-10 promotion-log row records a
  whitespace-formatted install and "astronomy passed locally", with the
  qualification in the provenance section. This task does not reconcile or rewrite
  that history. `verify` will report `1.42` against the `29da2c7f` canonical
  SHA-256 and the `8980ef57` approved SHA-256, and treat a whitespace-only
  difference as expected when value identity holds.
- **K7. Byte-for-byte versus formatting.** §Checksum provenance allows standard
  formatting at promotion, while the 1.42 `APPROVAL.md` says "promote
  byte-for-byte". The script follows the contract (format, then check value
  identity, record both SHA-256 values). Future approvals should not promise
  byte-for-byte (Q-C2).

## Open questions (Captain-reserved: chapter approval, privacy, design)

- **Q-C1. Privacy scan.** Should `record` also scan the files it commits for
  overlap with the source file on the host (for example, any 12-word run)?
  - (a) Allowlist only; the script never opens the source.
  - (b) Allowlist plus a local overlap scan; the script would read the source
    locally, like `metadata` does.

  This is a privacy design choice, so it is the Captain's. Proposed: (a), so the tool
  never touches book text.

- **Q-C2. Approval wording.** What must a recorded chapter approval name?
  - (a) The candidate SHA-256, as `record` requires.
  - (b) The chapter and run only.

  The contract's example ("Accept this candidate.json as chapter 1.2") names no
  SHA-256. Proposed: (a); the manager or Extractor attaches the SHA-256 to the
  quoted approval when relaying it.

## Decisions (manager, 2026-11-13, under its routine in-design delegation)

None of these changes a model, provider, privacy choice, book fact or chapter
approval.

- **Q-M1. Roles** (K5). **Chosen:** the Extractor runs `record`; the developer bot
  runs `promote` and opens the PR. Not chosen: the developer bot runs both.
- **Q-M2. Promotion-log row.** **Chosen:** `promote` appends the row inside the
  fail-closed transaction. Not chosen: print it for a person to paste.
- **Q-M3. Script shape.** **Chosen:** one script with three subcommands.
- **Q-M4. Approved-chapters README** (K1). **Chosen:** a one-off manual correction
  ("process item 3" to "process item 5") in the approved-chapters repository, with
  no tooling. This is a follow-up step outside this repository; it was not done
  here. Not chosen: leave it, or have `record` rewrite it.
- **Q-M5. `verify` scope.** **Chosen:** tagged chapters only. It also reports, and
  does not fail on, the count of chapters whose latest log row has no tag.

## Risks

- **Book-text leak into the record.** Mitigation: the exact allowlist, refusal of
  every other file, synthetic-only tests, and Q-C1.
- **False recovery claims.** `verify` covers only tagged chapters; `1.3`–`1.41`
  have no record. Mitigation: it reports untagged rows (Q-M5) and makes no claim
  for them.
- **Scope creep into automating extraction or approval.** Mitigation: the
  out-of-scope list.
- **Partial writes.** Mitigation: the `record` and `promote` transactions, rollback
  checked against saved state, and a test for each failure point (B3).

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
