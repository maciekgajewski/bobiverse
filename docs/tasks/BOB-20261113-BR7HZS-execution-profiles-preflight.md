# BOB-20261113-BR7HZS: versioned execution profiles and automated extraction preflight

Status: Draft
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-13

## Objective and user-visible outcome

Process item 4. Checklist A of `docs/chapter-extraction-checklists.md` is the manual
preflight that must pass before any model reads source text. Today an
operator ticks it by hand, and the conforming execution profile (BOB-028) exists only
as prose in the contract and the Codex adapter. This task adds two things:

- a small versioned, machine-readable record of the execution profile;
- one read-only preflight command that checks Checklist A, reports every item as
  pass or fail, and exits non-zero on any failure.

The operator, the Extractor bot and the Captain then see the same evidence before a
run. The command has no skip flag and fails closed. Not running it at all is still a
process failure under the contract's "never bypass" rule, which no local tool can
enforce. The task changes no rule, changes no profile value, approves no model or
provider, and does not decide D1.

## Binding references

- `../../AGENTS.md`: content and IP rules, the `--help` contract for user-facing
  scripts, task workflow.
- `../development-process.md`: roles (the Extractor has no GitHub write access),
  reserved Captain decisions (model, provider and privacy), merge gate.
- `../chapter-extraction.md`: §Execution profiles and prerequisites (Conforming
  profile, Prerequisite check, No silent substitution, Approved alternative,
  open decision D1), §Context isolation, §Candidate assembly and temporary corpus,
  §Astronomy preflight and isolated acquisition, §Checksum provenance.
- `../chapter-extraction-checklists.md`, Checklist A.
- `../data/astronomy-pipeline.md`, "Chapter-driven staging order" (exact prior-root
  validation; no substitution of the canonical corpus; uncovered-anchor diagnostic).
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md` and its
  `scripts/source_evidence.py` (`metadata`, `prepare-corpus`).
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`,
  `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`.
- `BOB-028-pin-chapter-extraction-agent-configuration.md` (the pinned profile and
  its verbatim-tested sentences), `BOB-20261112-1TWD9T-extraction-contract.md` (which
  queued this task: "Versioned execution-profile configuration and automated
  preflight"), `BOB-20261110-845KTJ-astronomy-staging-context.md`.

## Authorisation

Not yet authorised; status Draft until the task-doc re-review approves. The manager
answered Q1–Q6 on 2026-11-13 under its delegation for routine, in-design work (see
Decisions). None of them changes a model, provider or privacy choice. After the
re-review approves, the task goes to Ready, and the manager may authorise the tooling
without a separate Captain sign-off (Q6). A Captain decision is needed only if a
profile value changes, a probe spawn is proposed, or D1 is decided; all three are out
of scope.

## Proposed scope (narrow)

1. **Profile record.** A small versioned file records the conforming profile exactly
   as BOB-028 pins it:
   - Codex launcher;
   - `model: gpt-5.6-terra`, `reasoning_effort: high`, `fork_turns: none`;
   - separate spawns for Pass 1 and Pass 2, with no inheritance.

   It has a schema version and the decision reference (BOB-028). It is a derived
   projection (Q2): the adapter's verbatim-tested sentences stay the source of truth.
   It lists no alternative profile while D1 is open.

2. **One-source test.** A unit test asserts that the record, the adapter's BOB-028
   sentences and the contract's §Conforming profile agree.
3. **Preflight command.** A new `scripts/extraction_preflight.py` (Q3) that calls the
   existing `source_evidence.py` subcommands (`metadata`, `prepare-corpus`) rather
   than adding to that file. It implements `--help` per `AGENTS.md`.
   - **Arguments:** the target chapter, the source path, the workspace, and the
     approved-chapters repository path. The path defaults to the contract's
     `~/bobiverse-approved-chapters`; the argument exists for fixtures and path
     expansion, not as a rule change. For a NON-CONFORMING run, an approval-file
     path is also passed. An optional report path must be outside the repository.
   - **Write boundary.** The command writes nothing to the repository or the
     canonical tree, makes no network access and no model call, and has no skip or
     `--force` flag. Its only writes are:
     - the disposable `prepare-corpus` prior root, created inside the workspace,
       outside the repository and not named `narrative`, as the helper already
       requires;
     - the report, written to stdout or to a path outside the repository and never
       committed.
   - **No source content in output.** Stdout, stderr and the JSON report carry only
     fingerprint fields: chapter, filename, title from the filename, SHA-256 and
     byte length. They never include source bytes or excerpts.
4. **Checklist A items checked.** Item 9, the isolation plan, stays manual (Q4).
   1. **Profile.** The launcher is on `PATH` and reports a version (Q1). The report
      states what this does not prove: that the launcher can set the model,
      reasoning level and `fork_turns: none` for both passes (K1).

      If the launcher is missing, item 1 passes only with a recorded NON-CONFORMING
      approval file. That file substitutes for item 1 alone; it never waives items
      2–8 and is not a global skip. Its format is checked, not its authenticity
      (K5). Required fields:
      - target chapter and date;
      - the `NON-CONFORMING` label;
      - the provider, model and workflow wording as approved;
      - the Captain's quoted approval;
      - the relaying role.

      The command records the file's path and SHA-256.

   2. **Source.** The name form matches and `source_evidence.py metadata` passes; the
      fingerprint is recorded.
   3. **Workspace.** A new `mktemp -d` directory under `/tmp`, checked as properties:
      it exists, is a directory, is writable, is empty when the command starts, and
      resolves under `/tmp`.
   4. **Approved-chapters repository.** It is a writable git repository with no
      remote.
   5. **Repository.** The worktree is clean, and `git rev-parse HEAD` is recorded as
      the base revision.
   6. **Tooling.** `node --version` reports 22.23.1. The check is the Node version,
      not the nvm mechanism. `node_modules` and `.venv` are present, and
      `npm run narrative:validate` passes.
   7. **Prior chain.** The command builds the prior root with `prepare-corpus`,
      using the last canonical chapter before the target as the stand-in candidate.
      For target `1.43`, the helper runs for `1.42` with
      `data/narrative/chapters/1/42.json` as the candidate. The last chapter of the
      previous book is used across a book boundary.

      Provenance must show `inputs_clean: true`. This is not a duplicate of item 5:
      provenance inspects only `data/narrative` and `data/presentation`.

      **First-chapter case.** When the target has no prior chapter, the prior chain
      is the zero state alone. The helper requires a candidate, so items 7 and 8
      report "not applicable: zero-state target" rather than inventing a root, and
      item 6's `narrative:validate` is the zero-state evidence. Extending the helper
      for this case is out of scope.

   8. **Validators.** Narrative validation and
      `npm run data:validate -- --narrative-root <prior-root>` run on that exact
      root only. The command never runs `data:refresh` or any other networked
      command (`data:validate` is offline).

      The diagnostic `Narrative anchors require a GCNS acquisition plan not covered
by the pinned sources` is reported as its own failure class, pointing to
      §Astronomy preflight and isolated acquisition. Any other astronomy failure is
      a baseline failure.
5. **Report.** JSON plus a short human summary. It covers each item with pass, fail
   or not applicable, its evidence, its governing §Heading, and its stated limits
   (K1, K5). It also records the base revision, the profile-record SHA-256 and the
   overall verdict. Any failure exits non-zero.
6. **Docs.** These are pointers plus agreed wording clarifications, not rule
   changes:
   - Checklist A says the command automates items 1–8 and item 9 stays manual.
   - The contract's §Prerequisite check names the command and the record.
   - The adapter references the record.
   - Q5 wording, "before any model reads source text", replaces the current phrasing
     in the Checklist A heading, the adapter's quick-start sentence and
     §Prerequisite check.
   - The approved-chapters path stays the contract default (K4).
7. **Tests.** Fixture-based unit tests for each item, pass and fail:
   - a fake launcher on `PATH`;
   - temporary git repositories with and without a remote, and a dirty worktree;
   - a missing `.venv` and a wrong Node version;
   - a stand-in prior root and a zero-state target;
   - an uncovered-anchor validator fixture;
   - an approval file that passes item 1 but must not waive a failing item 2–8;
   - a check that the report contains no source bytes.

   Tests may use synthetic source files only. They never use book text or the
   network.

## Out of scope

- Approving, adding or changing any model, provider or profile value; deciding D1.
- A probe spawn or any other model call (Q1(b)); it would need the Captain.
- Running any extraction, reading `source-text/`, or sending book text anywhere.
- Automating Pass 1 or Pass 2 spawning, review packages, promotion or the
  approved-chapters repository (later queued tasks).
- A preflight for staged, not-yet-canonical prior chains (K6); those stay manual
  under the astronomy staging order.
- Changing validators, the astronomy pipeline, acquisition staging, ADR-0016/0023
  authority or `source_evidence.py`.
- CI changes. The preflight needs local inputs and is not a CI job.

## Conflicts and gaps (surfaced, with resolutions)

- **K1. Presence does not prove launcher capability.** §Prerequisite check asks the
  operator to verify that a launcher "can explicitly set the model, reasoning level,
  and non-forked spawning for both passes". BOB-028 already recorded that Markdown
  cannot inspect the runtime-selected model.
  - Resolution (Q1(a)): presence plus version only, with the caveat stated in the
    item 1 result and the summary. Spawning settings remain attested by the run's
    own records. No probe spawn.
- **K2. "Before reading source text" versus `metadata`.** Checklist A's heading, the
  adapter ("Before reading source text, complete Checklist A") and §Prerequisite
  check ("Before any source text is read") all say this, but item 2 opens and hashes
  the source file.
  - Resolution (Q5(a)): reword all three to "before any model reads source text". The
    `metadata` fingerprint stays in Checklist A; when and whether the source is
    hashed does not change.
- **K3. A third statement of the profile.** The adapter sentences (tested verbatim)
  and §Conforming profile already state it. A machine-readable copy could drift.
  - Resolution (Q2(b)): the adapter sentences stay the source of truth. The record is
    derived, and one test ties it to both.
- **K4. Hard-coded approved-chapters path.** Checklist A item 4 and §Checksum
  provenance name `~/bobiverse-approved-chapters`.
  - Resolution: keep it as the contract default. The command takes the path as an
    argument, defaulting to it, for fixtures and path expansion only.
- **K5. Approval records are unverifiable.** A per-run NON-CONFORMING approval can be
  checked for presence and format only. Who may write it follows the relayed-approval
  rule in `development-process.md`, which a local command cannot enforce.
  - Resolution: format-only check of the fields listed in item 1. The approval
    substitutes for item 1 alone. The report says authenticity was not checked.
- **K6. A `preflight` subcommand would enter Pass 1 staging.** `source_evidence.py`
  is one of the four items staged into blind Pass 1 (§Context isolation, item 3; the
  adapter's staging sentence). A subcommand there would put profile values,
  approved-chapters checks, validator calls and prior-root logic on the Pass 1 tool
  surface, even if Pass 1 never calls it. That conflicts with isolation and with
  1TWD9T's one home per rule.
  - Resolution (Q3(b)): a separate `scripts/extraction_preflight.py` that calls the
    helper; `source_evidence.py` is unchanged.
- **K7. Staged prior chains.** The astronomy staging order allows the exact prior
  chain to include earlier staged chapters that are not yet canonical. Item 7 builds
  only the canonical prior chain.
  - Resolution: report the canonical-chain assumption in the report. Staged chains
    stay a manual check (out of scope).
- **No conflict:** the astronomy staging order already requires exact prior-root
  validation before extraction and says it is not a refresh. The command runs exactly
  that.

## Decisions (manager, 2026-11-13, under its routine in-design delegation)

None of these changes a model, provider or privacy choice.

- **Q1. What evidence of the conforming profile counts?** Options: **(a) launcher
  presence and version, with the K1 caveats in the JSON report — chosen**; (b) a
  book-free probe spawn, which is a model call needing Maciej (out of scope); (c) an
  operator attestation. Maciej may object to (a).
- **Q2. Which statement of the profile is the source of truth?** This is a
  documentation mechanic, not a reserved Captain decision. Options: (a) the new
  record; **(b) the adapter's verbatim sentences, with the record derived and tested
  against them and §Conforming profile — chosen**; (c) no record.
- **Q3. Where does the command live?** Options: (a) a `preflight` subcommand of
  `source_evidence.py`, rejected because of K6; **(b) a new
  `scripts/extraction_preflight.py` that calls the existing helper — chosen**.
- **Q4. Automate item 9?** **(a) keep it manual — chosen**; (b) check the staging
  list only.
- **Q5. Fix K2 how?** **(a) reword to "before any model reads source text" wherever
  needed — chosen**; (b) move `metadata` to Checklist B, rejected.
- **Q6. Status after review.** **Ready on the manager's authorisation once fixed and
  re-reviewed — chosen.** A separate Captain sign-off is needed only if profile
  values change or a probe spawn is proposed.

## Acceptance criteria

1. The profile record exists, lists exactly the BOB-028 fields and no alternative
   profile, and a unit test ties it to the adapter's verbatim sentences and
   §Conforming profile.
2. `scripts/extraction_preflight.py` implements `--help` and checks items 1–8 as
   specified in scope item 4. It keeps to the write boundary: no repository or
   canonical writes, no network, no model call, no `data:refresh`, and no skip
   flag. It exits non-zero on any failure.
3. A NON-CONFORMING approval file affects item 1 only. Its required fields are
   format-checked, and the report states that authenticity is not checked.
4. Stdout, stderr and the report contain only fingerprint fields for the source,
   never source bytes or excerpts.
5. Each item has fixture tests for pass and fail, covering every case listed in
   scope item 7.
6. The doc edits in scope item 6 are made. The approved-chapters default and every
   rule are unchanged, and `source_evidence.py` is unchanged.
7. All validation commands pass.

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
python3 scripts/extraction_preflight.py --help
git diff --check
```

The fixture tests run in `npm run test` or `npm run data:test`, matching wherever the
existing helper tests live. No e2e run is expected (no application code).

## Documentation and generated artifacts

`docs/chapter-extraction-checklists.md`, `docs/chapter-extraction.md`
(§Prerequisite check), `.codex/skills/extract-bobiverse-chapter/SKILL.md`, the profile
record, `scripts/extraction_preflight.py`, its tests and this task file. Preflight
reports are written outside the repository and never committed.

## Risks

- **False assurance.** A green preflight can be read as proof of a conforming run.
  Mitigation: the report states what item 1 and the approval file do not prove (K1,
  K5) and the canonical-chain assumption (K7).
- **Book-text exposure.** Mitigation: fingerprint-only output, no model call, and
  synthetic test files only.
- **Drift between profile statements.** Mitigation: Q2(b) and a single test.
- **Scope creep into automating the run.** Mitigation: the out-of-scope list.

## Log

### 2026-11-13 (Europe/Amsterdam)

- Drafted as process item 4 on origin/master `f89c9c4` in `~/src/bobiverse-profiles`.
  This is a task document only: no implementation, no source text, no push.
- Read the contract's profile and preflight sections, Checklist A, the astronomy
  staging order, the adapter, `source_evidence.py`'s subcommands,
  `development-process.md` and the 1TWD9T task that queued this item. No separate
  process-improvement plan exists in the repository. Conflicts are K1–K5; questions
  are Q1–Q6. Status is Draft because Q1 and Q2 are reserved Captain decisions.
- Publication correction: the entry above says "no push". This draft was then
  published as PR #10 at `f4103f3`.
- Task-doc review of `f4103f3` requested changes (report
  `~/bobiverse-review-pr10-taskdoc.md` on piotr).
  - B1: Q2 is recategorised as a manager documentation mechanic. The statement above
    that Q2 is a reserved Captain decision is superseded.
  - B2: K6 records that a `preflight` subcommand would be staged into Pass 1; this is
    a reason for the Q3 choice.
  - B3: scope now spells out the write boundary, the item 7 stand-in and the
    first-chapter case, the no-`data:refresh` rule, that the approval file covers
    item 1 only, and the "under `/tmp`" workspace properties.
  - N1–N8: N1 is the objective wording; N2 is AC 4; N3 is the tests bullet; N4 is
    the approval-file fields; N5 keeps the default path; N6 is the docs bullet; N7 is
    this publication correction; N8 is the Node-version check.
  - Added K7 (staged prior chains) while specifying item 7.
- Merged origin/master `9312a6f` (PR #9) into this branch with a normal merge
  commit. QRXD8V is marked Done in this PR (the manager agreed to it riding along).
- Manager decisions on Q1–Q6, recorded above under Decisions, under its routine
  in-design delegation. None changes a model, provider or privacy choice. Status
  stays Draft until the re-review approves; then the task goes to Ready on the
  manager's authorisation.
