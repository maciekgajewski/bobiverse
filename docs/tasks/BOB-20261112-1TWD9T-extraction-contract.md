# BOB-20261112-1TWD9T: One authoritative chapter-extraction contract

Status: Ready
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-12

## Objective and user-visible outcome

Replace the overlapping extraction guidance with one authoritative,
provider-independent extraction contract plus short operator checklists. Close the
gaps found by the 1.42 verification run: unchecked execution prerequisites, no
documented approved-model alternative, leaky blind staging, a temporary corpus that
omits the species presentation registry, undefined reading-order versus story-date
rules for full-field updates, and ambiguous checksum provenance. Add a minimal manual
preflight that an operator completes before any extraction. The Captain and
extraction operators then read one rulebook, and each normative rule has one home.

Chapter `1.43` waits for this task and BOB-20261110-845KTJ to merge (Captain:
"Wait for the extraction docs and astronomy check fixes before 1.43.").

## Binding references

- `../../AGENTS.md`: authoritative documents, content and IP rules, task workflow,
  routine-promotion exception
- `../technical-design.md`, Section 13 (provider-independent extraction boundary) and
  the ADR-0023 paragraph in the astronomy section
- `../implementation-plan.md`, Phase 4
- `../data-model-definition.md`: field ownership and schema authority (referenced by
  the contract, not restated)
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0009-year-only-state-write-chapter-order.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`
- `../adrs/0026-calendar-precision-narrative-dates.md` (cite by filename; ADR number
  0026 is duplicated until the process-metadata lint task)
- `../adrs/0015-omit-disclosure-gaps-from-entity-descriptions.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0017-supplemental-mention-completeness.md`
- `../adrs/0021-qualitative-survey-planet-aggregates.md`
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`
- `BOB-008-codex-assisted-chapter-extraction-pilot.md`,
  `BOB-028-pin-chapter-extraction-agent-configuration.md`,
  `BOB-20260802-4HD54D-stage-chapter-astronomy-acquisition.md`,
  `BOB-20260805-XHVN3V-refresh-runtime-provenance-integrity.md`
- Out-of-repo evidence (piotr only, no book text):
  `~/extraction-scratch/1.42-verify/merged/report.md`, section "Suggested
  documentation/tooling fixes"

This task reorganises and clarifies the workflow inside the existing design. It must
not change spoiler semantics, data authority, the schema, the approved model or
provider, or the privacy boundary. Where a fix would need one of those, record it
under Unresolved decisions and stop rather than deciding it.

## Authorisation

Manager-relayed Captain authorisation (2026-11-09/10): item (c) of the agreed process
work, covering the extraction contract with dedup and short operator checklists, the
Codex prerequisite check plus approved-model alternative, blind-context isolation,
the missing presentation stage, reading order versus story dates (no backdating),
checksum provenance, and a minimal manual preflight checklist. The manager may
authorise routine in-design tasks; the Captain keeps design, model/provider/privacy,
disputed book facts, chapter approval and visual acceptance.

## Proposed structure

1. `../chapter-extraction.md` becomes the single authoritative, provider-independent
   contract, with stable numbered sections:
   1. Scope, authority and non-goals (links to AGENTS.md for roles; no new roles).
   2. Inputs and source naming.
   3. Execution profiles and prerequisites: the conforming Codex profile
      (`gpt-5.6-terra`, `reasoning_effort: high`, `fork_turns: none`, separately
      spawned passes); the stop-before-substitution rule; an approved alternative
      that runs only with explicit Captain approval naming the provider, model and
      workflow, labelled NON-CONFORMING, with requested-versus-actual configuration
      recorded and no claim of unverifiable settings.
   4. Context isolation: the Pass 1 blind allowlist and denylist, the Pass 2
      allowlist, a fresh separate context for each pass under every profile, and
      Pass-2-only exception registries.
   5. Pass 1 claim capture (rules only; ledger format stays in `claim-ledger.md`).
   6. Pass 2 reconciliation: classifications, names, events, location granularity,
      surveys, descriptions, summaries, supplemental mentions and lineage.
   7. Reading order and story dates: ordering moments (pointing to the ADRs); the
      current full-field-update rule kept verbatim; D2 recorded as an open Captain
      decision. No new baseline.
   8. Temporary corpus assembly (including the species presentation registry,
      manifest regeneration and recorded base revision) and validation.
   9. Astronomy preflight and isolated acquisition staging, stated once.
   10. Review package contents.
   11. Approval, promotion and provenance: checksum labelling, approved versus
       canonical bytes, the local approved-chapters repository, the promotion log.
2. A new `../chapter-extraction-checklists.md` holds short operator checklists that
   cite contract sections and restate no rules: (A) manual preflight, (B) run and
   handoff, (C) promotion and post-write.
3. A new facts-free Pass 1 brief,
   `../../.codex/skills/extract-bobiverse-chapter/references/pass1-blind-brief.md`,
   is the only contract text staged to blind Pass 1, alongside `claim-ledger.md`.
4. `../../.codex/skills/extract-bobiverse-chapter/SKILL.md` becomes a thin Codex
   adapter: invocation, the conforming profile and spawning mechanics, staging lists,
   and links to contract sections. The duplicated editorial rules are removed. The
   BOB-028 contract sentences stay, or move with their regression test updated in
   the same change.

### Deduplication inventory (on master 3053e95)

| Duplicated content                                                              | Locations                                                                         | Single home after this task                             |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Summary, description, event-significance, location-granularity and survey rules | `docs/chapter-extraction.md` 56–279; `SKILL.md` 224–445                           | Contract section 6                                      |
| Narrative-moment ordering                                                       | `docs/chapter-extraction.md` 144–164; `SKILL.md` 395–402                          | Contract section 7 (pointing to the ADRs)               |
| Isolated astronomy acquisition staging (ten steps)                              | `docs/chapter-extraction.md` 324–369; `SKILL.md` 487–521                          | Contract section 9                                      |
| Promotion preflight and post-write validation                                   | `docs/chapter-extraction.md` 293–322, 371–392; `SKILL.md` 447–476, 550–558        | Contract section 8, Checklist C                         |
| Chapter-threshold rules (1.14 mentions, 1.16 surveys)                           | `claim-ledger.md` 48, 110; both documents above                                   | Contract sections 5 and 6; the ledger keeps format only |
| Invocation and approval summary                                                 | `README.md` 212–218; `docs/chapter-extraction.md` 7–19, 281–291; `SKILL.md` 11–34 | Contract sections 2 and 11; the README links to them    |
| Routine-promotion exception                                                     | `AGENTS.md` 33–38; `docs/tasks/README.md` 83–86                                   | Unchanged authority; links fixed only if anchors move   |

## Scope

- Restructure the documents above as proposed. Preserve every current normative rule
  and its meaning. Rules may move, be merged with an exact duplicate or be reworded
  for clarity; none may be weakened, dropped or added beyond the in-scope gaps below.
  Record a rule-mapping table (old location to new section) in this task's log.
- Prerequisite check: document what makes a run conforming, how an operator verifies
  it before reading source text, and the stop-and-ask path. Record that piotr
  currently has no `codex` binary, so a conforming run is not possible there today.
- Approved-model alternative: document only the approval mechanism, the
  NON-CONFORMING labelling and the provenance that must be recorded. The task does
  not itself approve any provider or model (see D1).
- Blind isolation: write the facts-free Pass 1 brief. The Pass 1 staging list
  becomes exactly `references/pass1-blind-brief.md`, `references/claim-ledger.md`,
  the source file, and `scripts/source_evidence.py`, which is invoked rather than
  read as guidance. Nothing else is staged: not `SKILL.md`, the contract, the
  exception registries, `agents/openai.yaml`, nor any other repository file. Keep
  book-derived examples, canonical entity names and chapter facts out of the staged
  files, removing or relocating examples such as `SKILL.md` 338 (`Bob uses it to`).
  Require separate fresh contexts for Pass 1 and Pass 2 under every profile.
- Presentation stage: make `source_evidence.py prepare-corpus` copy
  `data/presentation/species.json` into the temporary root's
  `presentation/species.json`, which `scripts/narrative-cli.ts` `loadCorpus`
  requires for a root not named `narrative`. Report in its JSON output the base Git
  commit, whether the canonical inputs were clean, and the SHA-256 of every copied
  file. Document regenerating the narrative manifest after manual staging.
- Reading order versus story dates: consolidate the existing ordering-moment rules
  into one section that cites the ADRs. Keep the current full-field-update rule as
  the rule, worded as it is now (`chapter-extraction.md` 140–142, `SKILL.md`
  385–388). State D2 as an open Captain decision beside it. Do not encode a new
  update baseline while D2 is open. The review package lists every update whose
  prior entry contains a fact first established at a later story date than the
  target chapter's, so the Captain can see the D2 cases. This is reporting only and
  changes no authoring rule.
- Checksum provenance: label every hash by kind (file SHA-256 of exact bytes, Git
  commit, Git blob). Record the source, sealed-ledger, approved-candidate and
  canonical SHA-256 separately when they differ. Freeze and hash a candidate before
  any comparison with an existing target. Record the base revision and the
  approved-chapters repository commit and tag (an interim manual step until the
  recoverable-promotion task automates it).
- Minimal manual preflight (Checklist A): the execution profile is available or an
  explicit approval is recorded; source readability and file naming; writable
  scratch and approved-chapters repository; a clean worktree at a recorded base
  revision; Node and Python environments; and narrative plus astronomy validation of
  the exact prior chapter chain. Any failure stops the run; never bypass it. The
  execution-profile task later automates this checklist.
- Rule mapping: go through `chapter-extraction.md`, `SKILL.md` and `claim-ledger.md`
  paragraph by paragraph and give every normative rule a row, unique or duplicated,
  with its old file and lines and its new location. Unique rules count as much as
  duplicates; examples are disclosure-gap omission (ADR-0015),
  introduction-versus-update ownership, the ADR-0021 lower-bound exception, dry-run
  comparison, and the deferred Kindle fallback.
- Update directly affected documents: `README.md` (link only),
  `docs/tasks/README.md` and `AGENTS.md` (link targets only, if anchors move), and
  `technical-design.md` Section 13. Section 13 gets at most a one-line pointer to the
  contract, which must say that the architecture boundary stays provider-independent;
  no semantic change.

## Out of scope

- Running any extraction, reading `source-text/`, sending book text anywhere, or
  copying any book text or evidence excerpt into the repository, logs or PR.
- Changing canonical narrative or astronomy data, schemas, validators' rules,
  spoiler projection or ADR decisions. No new ADR, unless D2 requires one (separate
  task).
- Approving or adding a model or provider, or changing the BOB-028 conforming
  profile.
- Versioned execution-profile configuration and automated preflight; scripts for the
  approved-chapters repository and generated review packages; meaning-level
  regression tests; process-metadata lint and ADR renumbering; AGENTS.md roles and
  merge gate. Each is a later queued task.
- Marking BOB-20261110-M3AMGW Done. That belongs to whichever PR the manager
  designates, to avoid a conflicting edit.
- Port 5173 and the acceptance checkout `~/src/bobiverse-accept`.

## Acceptance criteria

1. `docs/chapter-extraction.md` is the single authoritative contract with the
   sections above. `SKILL.md`, `claim-ledger.md`, `README.md` and the checklists
   contain no restated normative rule that is also stated in the contract; they link
   to it. One exception: strings asserted verbatim by
   `tests/unit/source-evidence-helper.test.ts` stay verbatim. The BOB-028
   orchestration sentences (fresh isolated Codex context; explicit Terra, high and
   `fork_turns: none`; no inheritance; Pass 2 staging; stop before substituting; the
   requested-configuration review line) stay in `SKILL.md`. Any other tested rule
   sentence may move to the contract only if its assertion moves with it, unchanged
   apart from the file it reads. The two gravity examples stay in
   `docs/chapter-extraction.md`.
2. The logged rule-mapping table covers every normative rule, unique or duplicated,
   in the pre-change `docs/chapter-extraction.md`, `SKILL.md` and `claim-ledger.md`,
   using the method in Scope. The independent reviewer finds no dropped or weakened
   rule.
3. The combined line count of `docs/chapter-extraction.md`,
   `docs/chapter-extraction-checklists.md` and the skill directory's Markdown files is
   lower than the pre-change combined count (1,171 lines: 392 + 563 + 178 + 16 + 22).
4. The files staged to Pass 1 (exactly the brief and `claim-ledger.md`; the helper is
   code) contain no chapter-specific fact. For the test this means none of the
   following, each matched case-sensitively as a whole token:
   - a canonical chapter reference (`<book>.<chapter>` for any file in
     `data/narrative/chapters/`);
   - a canonical entity ID from zero state or any chapter (any `id` value);
   - a name or alias introduced or set by any chapter (`introducing[].name`,
     `introducing[].aliases`, `updates[].name`, `updates[].aliases`).

   Zero-state names are not banned. The test reads the canonical corpus; the
   existing pilot-fact denylist (`Robert`, `Las Vegas`, `Bob Version`) stays.

5. The prerequisite check, stop-before-substitution, approved-alternative approval,
   NON-CONFORMING labelling and requested-versus-actual provenance are documented.
   The BOB-028 regression assertions still pass, or are updated in the same change
   without weakening them.
6. A temporary root built by `prepare-corpus` passes
   `tsx scripts/narrative-cli.ts validate --root <tmp>` and
   `npm run data:validate -- --narrative-root <tmp>`, verified with the canonical
   prior chain and an existing canonical chapter as the stand-in candidate, without
   manual copying. Its JSON output includes the base commit, the clean flag and the
   per-file SHA-256 values. Regression tests cover the presentation copy and the
   provenance fields.
7. The reading-order and story-date section consolidates the ordering rules. It cites
   ADR-0002, ADR-0009, ADR-0013 and the calendar-precision ADR-0026, keeps the current
   full-field-update wording as the rule, and records D2 as open, giving the current
   rule, the proposed alternative and the options. It introduces no new baseline.
8. Checksum labelling and the approved-versus-canonical rule are documented, and the
   promotion-log header explains what its SHA-256 column means. Historical rows are
   not rewritten.
9. Checklist A exists, fits on one screen (at most about 25 items) and links to each
   step's contract section.
10. The validation below passes. Independent exact-SHA review and hosted CI follow;
    the status becomes Done only after merge.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test -- --run tests/unit/source-evidence-helper.test.ts
npm run data:test
npm run data:validate
npm run build
PYTHONDONTWRITEBYTECODE=1 python3 \
  /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py --help
CI=1 LIBGL_ALWAYS_SOFTWARE=1 npm run test:e2e -- \
  --config /home/grok-developer/bobiverse-extract-artifacts/playwright.config.mts \
  --workers=1 --retries=0
git diff --check
```

The e2e wrapper lives outside the repository and uses loopback port 5175, never 5173.
`quick_validate.py` is read from the Captain's home and must not write there.

## Documentation and generated artifacts

- Changed: `docs/chapter-extraction.md`, the new
  `docs/chapter-extraction-checklists.md`, `.codex/skills/extract-bobiverse-chapter/`
  (`SKILL.md`, references, `scripts/source_evidence.py`), the related unit tests,
  `README.md`, the promotion-log header, and this task. Link-only edits to `AGENTS.md`
  and `docs/tasks/README.md` happen only if needed.
- No generated artifact is committed. Temporary roots, logs and the e2e wrapper stay
  in `/tmp` or `~/bobiverse-extract-artifacts/`.

## Risks and unresolved decisions

Captain decisions (record them here; do not decide them in implementation):

- D1 (model, provider, privacy): is the approved alternative a standing approval or
  per-run, and for which provider and model? AGENTS.md: "Never send book text to an
  external model unless the Captain has explicitly approved the provider and
  workflow." The recorded approval covered the 1.42 verification only. Because piotr
  has no `codex`, Chapter `1.43` cannot run conforming without either a Codex
  launcher or a new explicit approval.
- D2 (spoiler and temporal semantics): how a full-field update behaves when reading
  order and story dates diverge.
  - Current rule, which stays in force: "Description updates replace the complete
    field. Preserve useful prior reviewed knowledge and integrate the newly revealed
    information rather than emitting only the latest chapter fact."
    (`chapter-extraction.md` 140–142; `SKILL.md` 385–388: "start from the complete
    prior reviewed entry".)
  - The problem, shown with dates only: chapters are read as A (`2165-04`), B
    (`2162-05`) and C (`2162-04`). C's full-field update may then carry facts first
    established in A. ADR-0002 also makes the chronologically latest eligible write
    win, so at later story dates A's write hides whatever C newly revealed.
  - Proposed alternative, not adopted: build a full-field update on the value
    eligible at the target chapter's story date within the reader-visible set before
    it, so no fact from a later story date is carried back.
  - Options:
    (a) keep the current rule;
    (b) adopt the alternative and accept that later-dated writes hide newly revealed
    knowledge at later dates;
    (c) adopt (b), and require a later chapter to re-integrate what was hidden;
    (d) treat descriptions as reader knowledge rather than story-time state, which
    needs an ADR and a projection change outside this task.

Manager decisions, within design (accepted 2026-11-12):

- D3, accepted: the contract lives in `docs/chapter-extraction.md`, and the skill
  becomes an adapter. This explicitly supersedes the BOB-028 documentation note that
  the Codex model is "an orchestration detail rather than part of the
  provider-independent workflow contract presented to operators".
- D4, accepted: approved-versus-canonical checksums are recorded in the
  promotion-log decision cell, not in a new column.

Risks:

- Rule loss during the move; mitigated by the mapping table and review.
- The BOB-028 test asserts exact sentences, so the reorganisation must keep them or
  update the test deliberately.
- Overlap with later AGENTS.md and profile tasks; keep edits link-only.
- No review-agent tool is available to this executor, so the manager coordinates
  independent task and implementation review.

## Log

### 2026-11-12 (Europe/Amsterdam)

- Created Ready from the manager-relayed, Captain-authorised scope, on
  origin/master 3053e95 in `~/src/bobiverse-extract`. Preparation only: no
  implementation, no source-text access, no push.
- Task-doc review of a89bdf8 (draft PR #6) requested changes.
  - B1: the proposed new full-field-update baseline was removed from the scope, the
    structure and AC7. The current wording stays the rule, and D2 now records the
    current rule, the proposed alternative and the options.
  - Nit 1: the mapping method now covers unique rules as well as duplicates.
  - Nit 2: AC1 keeps the strings the test asserts verbatim.
  - Nit 3: the Pass 1 staging list is exact, and the test's definition of a
    chapter-specific fact is precise.
  - Nit 4: any Section 13 pointer must say the architecture boundary stays
    provider-independent.
- Recorded the manager's acceptance of D3 and D4. D1 and D2 stay open. Status stays
  Ready until implementation starts.
