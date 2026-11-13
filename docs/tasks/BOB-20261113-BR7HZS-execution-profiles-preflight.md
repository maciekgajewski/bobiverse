# BOB-20261113-BR7HZS: versioned execution profiles and automated extraction preflight

Status: Draft
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-13

## Objective and user-visible outcome

Process item 4. Checklist A of `docs/chapter-extraction-checklists.md` is the manual
preflight that must pass before any extraction run reads source text. Today an
operator ticks it by hand, and the conforming execution profile (BOB-028) exists only
as prose in the contract and the Codex adapter. This task adds two things:

- a small versioned, machine-readable record of the execution profile;
- one read-only preflight command that checks Checklist A, reports every item as
  pass or fail, and exits non-zero on any failure.

The operator, the Extractor bot and the Captain then see the same evidence before a
run, and a failed preflight cannot be skipped by omission. The task changes no rule,
approves no model or provider, and decides neither D1 nor any question below.

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

Not yet authorised. This draft records the scope for manager review and the Captain
questions below. Profile content is a reserved Captain decision (model, provider and
privacy), so the manager cannot authorise any change to it; the tooling itself is
in-design.

## Proposed scope (narrow)

1. **Profile record.** A versioned file (location: Q2) that records the conforming
   profile exactly as BOB-028 pins it: Codex launcher, `model: gpt-5.6-terra`,
   `reasoning_effort: high`, `fork_turns: none`, separate spawns for Pass 1 and
   Pass 2, no inheritance. It has a schema version and the decision reference
   (BOB-028). It lists no alternative profile while D1 is open.
2. **One-source rule.** A unit test asserts that the profile record, the adapter's
   tested BOB-028 sentences and the contract's §Conforming profile agree. The record
   adds no second, divergent statement of the profile.
3. **Preflight command.** A new read-only subcommand (placement: Q3), with `--help`
   per `AGENTS.md`. It takes the target chapter, the source path, the workspace, the
   approved-chapters repository path and, for a NON-CONFORMING run, a path to the
   recorded Captain approval. It checks Checklist A items 1–8:
   1. Profile: the launcher is on `PATH` and reports a version. The proof that it
      can set the model, reasoning level and non-forked spawning is Q1. If the check
      fails, the run needs a recorded per-run approval file (current rule; D1 open).
      The command records that file's path and checksum but cannot verify that the
      approval is genuine.
   2. Source: name form and `metadata` fingerprint; it prints only the fingerprint,
      never content.
   3. Workspace is a new, writable `mktemp -d` directory.
   4. The approved-chapters repository is writable and has no remote.
   5. The worktree is clean, and the base revision is recorded.
   6. Node 22.23.1, `node_modules` and `.venv` are present, and
      `npm run narrative:validate` passes.
   7. A `prepare-corpus` prior-chain root shows `inputs_clean: true`.
   8. Narrative and astronomy validation pass on that exact prior root. The
      uncovered-anchor diagnostic is reported as its own failure class pointing to
      §Astronomy preflight and isolated acquisition. It never triggers a refresh or
      network access.

   Checklist item 9 (the isolation plan) stays manual (Q4).

4. **Report.** JSON plus a short human summary: each item with pass or fail,
   evidence, and the governing §Heading; the base revision; the profile-record
   checksum; and the overall verdict. There is no `--force` or skip flag.
5. **Docs.** Checklist A states that the command automates items 1–8, with item 9
   still manual. The contract's §Prerequisite check names the command. The adapter
   references the profile record. These are link-level edits only.
6. **Tests.** Fixture-based unit tests for each item, both pass and fail: a fake
   launcher on `PATH`, a temporary git repository with and without a remote, a dirty
   worktree, a missing `.venv`, and a stand-in prior root. No source text and no
   network are used.

## Out of scope

- Approving, adding or changing any model, provider or profile; deciding D1.
- Running any extraction, reading `source-text/`, or sending book text anywhere.
- Automating Pass 1 or Pass 2 spawning, review packages, promotion or the
  approved-chapters repository (later queued tasks).
- Changing validators, the astronomy pipeline, acquisition staging or ADR-0016/0023
  authority. The preflight only calls the existing validators.
- CI changes. The preflight needs local inputs and is not a CI job.

## Conflicts and gaps in the current documents (surfaced, not resolved)

- **K1. Launcher capability cannot be proven by presence.** §Prerequisite check asks
  the operator to verify that a launcher "can explicitly set the model, reasoning
  level, and non-forked spawning for both passes". A preflight can show that a
  binary exists and its version. It cannot prove the in-agent spawning settings
  without starting an agent, which is part of the run itself. See Q1.
- **K2. "Before reading source text" versus `metadata`.** Checklist A is headed
  "before reading source text", but its item 2 runs `source_evidence.py metadata`,
  which opens and hashes the source file. This is consistent if "reading" means
  model reading. The wording should say so, or the item should move. See Q5.
- **K3. Two statements of the profile.** BOB-028's sentences are tested verbatim in
  `SKILL.md`, and the contract restates the profile. A third, machine-readable copy
  risks drift unless one of them is declared the source (Q2). This follows
  1TWD9T's "one home per rule" principle.
- **K4. Hard-coded operator path.** Checklist A item 4 names
  `~/bobiverse-approved-chapters`. Repo-relative commands are preferred (the M3AMGW
  nit), so the preflight takes the path as an argument and the checklist keeps the
  default only as an example.
- **K5. Approval records are unverifiable.** A per-run NON-CONFORMING approval can
  only be checked for presence and format. Who may write the record follows the
  relayed-approval rule in `development-process.md`, which the preflight cannot
  enforce.
- **No conflict:** the astronomy staging order already requires exact prior-root
  validation before extraction. The preflight runs exactly that and adds no rule.

## Open questions

Captain (reserved: model, provider and privacy):

- **Q1. What evidence of the conforming profile counts?**
  - (a) Launcher presence and version only, with spawning settings attested by the
    run's own records afterwards.
  - (b) A short, book-free probe spawn that reports its effective model and settings.
    This is a model call, so it needs the Captain's approval as a workflow.
  - (c) A manual operator attestation recorded in the report.
- **Q2. Which statement of the profile is the source of truth?**
  - (a) The new versioned record; the adapter sentences and the contract are tested
    against it.
  - (b) The adapter's BOB-028 sentences stay the source; the record is derived and
    tested against them.
  - (c) No record; the preflight parses nothing and only checks the launcher.

Manager (in-design):

- **Q3. Where does the command live?**
  - (a) A `preflight` subcommand of `source_evidence.py` (fits the existing helper).
  - (b) A new `scripts/extraction_preflight.py`.
- **Q4. Should item 9 (the isolation plan) be automated?**
  - (a) Keep it manual (proposed).
  - (b) Check only that the planned Pass 1 staging list equals the exact four items.
- **Q5. How should K2 be fixed?**
  - (a) Reword Checklist A to "before any model reads source text".
  - (b) Move the `metadata` fingerprint to Checklist B.
- **Q6. Status after review.** Once Q1–Q5 are answered, should this go to Ready for
  manager authorisation, or does the profile-record content need a separate Captain
  sign-off first?

## Acceptance criteria (provisional, pending Q1–Q6)

1. The profile record exists, matches BOB-028 exactly, lists no alternative profile,
   and a unit test ties it to the source chosen in Q2.
2. The preflight command implements `--help`. It checks every automated item listed
   above, reads no source content beyond the fingerprint, uses no network, offers no
   skip flag, and exits non-zero on any failure.
3. Each item has fixture tests for pass and fail. The uncovered-anchor case is
   reported as its own failure class.
4. Checklist A, §Prerequisite check and the adapter point to the command and record.
   No rule changes.
5. All validation commands pass.

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

The exact preflight `--help` and fixture-test commands are fixed once Q3 is decided.
No e2e run is expected (no application code).

## Documentation and generated artifacts

`docs/chapter-extraction-checklists.md`, `docs/chapter-extraction.md`
(§Prerequisite check pointer), `.codex/skills/extract-bobiverse-chapter/SKILL.md`
(pointer), the profile record and this task file. Preflight reports are written
outside the repository and never committed.

## Risks

- **False assurance.** A green preflight can be read as proof of a conforming run.
  Mitigation: the report states what each item does not prove (K1, K5).
- **Book-text exposure.** Mitigation: the command prints only fingerprints, makes no
  model call unless Q1(b) is approved, and its tests use synthetic files.
- **Drift between profile statements.** Mitigation: Q2 and a single test.
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
