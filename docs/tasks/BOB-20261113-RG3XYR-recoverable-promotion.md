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
- promotes exactly that tagged candidate into the canonical tree under §Promotion,
  failing closed and leaving canonical files and the promotion log byte-for-byte
  unchanged on any failure;
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

1. **One script, `scripts/chapter_promotion.py`**, with `--help` per `AGENTS.md`,
   three subcommands, no skip or `--force` flag, and no network access or model
   call. It is not staged into Pass 1.
   - **`record`**: copies an allowlisted set of run outputs from a workspace
     directory under `/tmp` into `chapters/<ref>/` of the approved-chapters
     repository, writes `APPROVAL.json` and a `SHA256SUMS` manifest, commits, and
     tags `chapter-<ref>-approved`.
     - `APPROVAL.json` has the chapter, the candidate SHA-256, the Captain's quoted
       approval, the date, the relaying role, the base revision and any
       NON-CONFORMING label. It reuses the approval-record field style from BR7HZS.
     - It refuses when the repository has a remote, the tag or directory already
       exists, a file is outside the allowlist, or the approval does not name the
       candidate SHA-256 being recorded.
   - **`promote`**: from a tag, checks that the tag's commit, `SHA256SUMS` and
     `APPROVAL.json` agree with the candidate, then follows §Promotion steps 1–7:
     - it builds a fresh root with `prepare-corpus` and runs both validators;
     - on any failure it exits non-zero and leaves canonical chapter files and the
       promotion log byte-for-byte unchanged;
     - on success it writes the candidate to `data/narrative/chapters/<b>/<n>.json`
       with standard Prettier formatting and confirms JSON value identity;
     - it runs the §Post-write validation commands, and appends one
       promotion-log row with both SHA-256 values when the bytes differ, the
       approved-chapters commit and tag, and any NON-CONFORMING label. The
       material editorial decisions are passed in as text written by a person.

     It needs a clean worktree, and it never commits, pushes or opens a PR. Those
     stay with the role that owns the change under the merge gate.

   - **`verify`** (read-only): for every tag `chapter-<ref>-approved`, it checks
     that the canonical chapter file is value-identical to the tagged candidate and
     that the promotion log's latest row for that chapter cites the matching
     SHA-256 values. It reports, and never repairs.
2. **Review package.** `record` takes the committable part of the §Review package
   (profile, fingerprints, provenance output, candidate and SHA-256,
   claim-to-classification table, mention table, D2 list, validator output, exact
   canonical diff) as files in the workspace. The script does not generate
   editorial content. Evidence excerpts from `source_evidence.py review` and the
   sealed ledger contain book text and stay on the extraction host: they are never
   on the allowlist (K2).
3. **Docs.** Pointers only:
   - §Checksum provenance and Checklists B–C name the script;
   - the "interim manual step" sentence is updated;
   - the post-write command block is fixed (K4).
4. **Tests** (fixtures only; see the test plan).

## Out of scope

- Approving a chapter, or deciding what counts as approval. The script records an
  approval that already exists; chapter approval is reserved to the Captain.
- Running an extraction, reading `source-text/` or any source file, or sending book
  text anywhere. The script never opens the source; it uses only SHA-256 values
  already recorded.
- Generating editorial review content (claim tables, decisions) or automating Pass 1
  or Pass 2.
- Committing to, pushing or opening PRs on the bobiverse repository; any remote for
  the approved-chapters repository.
- Backfilling approved-chapters records for chapters `1.3`–`1.41`, or rewriting
  historical promotion-log rows or the existing `chapter-1.42-approved` record.
- Isolated astronomy acquisition or refresh (§Astronomy preflight and isolated
  acquisition stays manual), and validator, schema, CI or ADR changes.

## Safety properties

1. **No book text leaves or enters the record.** The allowlist excludes the sealed
   ledger, rendered excerpts, source files and any `*.txt` source pattern. `record`
   refuses unknown files rather than skipping them.
2. **Approved bytes only.** `promote` writes only the candidate whose SHA-256 is in
   both `APPROVAL.json` and `SHA256SUMS` at the tagged commit.
3. **Fail closed, byte-for-byte unchanged.** Any validation, identity or
   post-write failure leaves canonical chapter files and the promotion log as they
   were. A post-write failure restores the pre-write bytes and reports this.
4. **Append-only.** The promotion log only gains rows; historical rows are never
   rewritten. Approved-chapters tags are never moved or deleted.
5. **No remote, no network.** `record` refuses a remote, and nothing calls the
   network or a model.
6. **Recoverable.** Each promoted chapter can be rebuilt from its tag, and `verify`
   proves it without writing.
7. **No authority change.** The script never decides approval, merges, or bypasses
   the merge gate or preflight.

## Acceptance criteria

1. `scripts/chapter_promotion.py` implements `--help` and the three subcommands as
   specified, with no skip flag and no network or model access.
2. `record` refuses a remote, an existing tag or directory, a non-allowlisted file,
   and an approval whose candidate SHA-256 does not match; on success it creates one
   commit and one tag.
3. `promote` writes only the tagged, approved candidate. On a validator failure, an
   identity mismatch or a post-write failure, canonical files and the promotion log
   are byte-for-byte unchanged and the exit code is non-zero.
4. On success, the canonical file is value-identical to the candidate, and one
   promotion-log row is appended with the SHA-256 values, the commit and tag, and
   any NON-CONFORMING label.
5. `verify` is read-only and reports, per tag, value identity and promotion-log
   agreement.
6. No output, record or test fixture contains book text; tests use synthetic
   fixtures only.
7. The doc pointers are made and no rule changes. All validation commands pass.

## Test plan

Vitest fixture tests in `tests/unit/chapter-promotion.test.ts`, run by
`npm run test` and so by CI, following the BR7HZS fixture pattern:

- temporary git repositories for the bobiverse checkout (synthetic narrative tree
  and promotion log) and the approved-chapters repository;
- stand-ins for the validators, the formatter and the post-write commands;
- synthetic candidates and review files.

Cases, each pass and fail:

- `record`: success creates one commit and one tag; refusal on a remote, an
  existing tag, an unknown file, a ledger or excerpt file, and a SHA-256 mismatch.
- `promote`: success, with a formatted write, value identity and one appended row;
  narrative and astronomy validator failures, a tampered candidate, a dirty
  worktree and a post-write failure all leave the files byte-for-byte unchanged.
- `verify`: identical, drifted and missing canonical files; log agreement and
  disagreement; no writes.
- No book text in output: synthetic marker strings never appear.
- `--help` in `tests/unit/script-help.test.ts`.

Validation: `tasks check`, `format:check`, `lint`, `typecheck`, `test`,
`data:test`, `data:validate`, `build`, `git diff --check`. No e2e, because no
application code changes.

## Conflicts and gaps (surfaced, not resolved)

- **K1. Process-item numbering.** The approved-chapters `README.md` says "Until
  promotion scripts exist (process item 3)". This task is process item 5, and
  item 3 was the merge gate (YPEVFD). That README lives outside this repository;
  updating it would be a `record`-time or manual change (Q-M4).
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
- **K5. Who promotes?** The Extractor may not promote (`development-process.md`).
  `AGENTS.md` requires "explicit approval and application authority" for routine
  promotion but names no role. `promote` writes the bobiverse worktree, and the
  resulting PR goes through the merge gate (Q-M1).
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

## Open questions

### Captain-reserved (chapter approval, privacy, design)

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

### Manager-decidable (routine, in-design)

- **Q-M1. Roles** (K5). Options:
  - (a) the Extractor runs `record` locally, and the developer bot runs `promote`
    on a task-free promotion branch and opens the PR;
  - (b) the developer bot runs both.
- **Q-M2. Promotion-log row.** Options: (a) `promote` appends it; (b) `promote`
  prints it for a person to paste. Proposed: (a), with human-written decision text.
- **Q-M3. Script shape.** Options: (a) one script with three subcommands; (b)
  separate scripts. Proposed: (a).
- **Q-M4. Approved-chapters README** (K1). Options: (a) leave it; (b) `record`
  rewrites it; (c) a one-off manual correction recorded in the log. Proposed: (c).
- **Q-M5. `verify` scope.** Options: (a) only tagged chapters; (b) also report
  promotion-log rows with no tag. Proposed: (a), with a count of untagged rows.

## Risks

- **Book-text leak into the record.** Mitigation: an allowlist, refusal of unknown
  files, synthetic-only tests, and Q-C1.
- **False recovery claims.** `verify` covers only tagged chapters; `1.3`–`1.41`
  have no record. Mitigation: it reports untagged rows (Q-M5) and makes no claim
  for them.
- **Scope creep into automating extraction or approval.** Mitigation: the
  out-of-scope list.
- **Partial writes.** Mitigation: restore on failure, with tests for each failure
  point.

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
- Status Draft: Q-C1 and Q-C2 need the Captain, and Q-M1–Q-M5 need the manager.
