# Chapter extraction checklists

Short run sheets for operators. Each item cites the governing section of the
[extraction contract](chapter-extraction.md) by its heading, in the form §Heading;
the contract holds the rules. Any failed item stops the run; never bypass it.

## A. Preflight (before any model reads source text)

[`scripts/extraction_preflight.py`](../scripts/extraction_preflight.py) checks items
1–8 against the profile record
[`profile.json`](../.codex/skills/extract-bobiverse-chapter/profile.json) and exits
non-zero on any failure; item 9 stays manual. Run it from inside the checkout that
contains it; any other checkout is refused (see `--help`). Its report never contains
source bytes. For item 1 it runs `codex --version`, which shows only that the
launcher is present, not that it can set the model, reasoning level, and non-forked
spawning for both passes; the run's own records attest those settings.

1. Profile: the conforming Codex profile can be requested for both passes, or a
   recorded Captain approval covers the provider, model, and workflow (such as the D1
   standing approval of 2026-11-13), labelled NON-CONFORMING (§Prerequisite check to
   §Approved alternative).
2. Source: one readable UTF-8 file outside the repository, named
   `<book>.<chapter>.txt` or `<book>.<chapter> - <title>.txt`;
   `source_evidence.py metadata` passes and its SHA-256 is recorded (§Inputs).
3. Workspace: a new `mktemp -d` directory under `/tmp` is writable (§Context
   isolation).
4. Approved-chapters repository `~/bobiverse-approved-chapters` is writable, with no
   remote (§Checksum provenance).
5. Repository: clean worktree; record `git rev-parse HEAD` as the base revision
   (§Candidate assembly and temporary corpus, §Checksum provenance).
6. Tooling: Node 22.23.1 via nvm, `node_modules` installed, `.venv` present;
   `npm run narrative:validate` passes (§Candidate assembly and temporary corpus).
7. Prior chain: build a root of the chapters before the target with `prepare-corpus`,
   using the last prior chapter as the stand-in candidate, and check that its
   provenance shows `inputs_clean: true` (§Candidate assembly and temporary corpus).
   If the chapters just before the target are not yet promoted, pass their candidates
   in order with `--pending-predecessor`; the report marks the run PENDING.
8. Run both validators from §Candidate assembly and temporary corpus on that prior
   root. An astronomy failure here is a baseline problem: stop and report it
   (§Astronomy preflight and isolated acquisition).
9. Isolation plan: separate fresh contexts for Pass 1 and Pass 2, and the exact Pass
   1 staging list (§Context isolation).

## B. Run and handoff

1. Pass 1 runs the blind brief, seals the ledger, and records its SHA-256 (§Pass 1
   blind claim capture).
2. Pass 2 reads the exception registries only after verifying fingerprints (§Pass 2
   inputs).
3. Build the candidate and root with `prepare-corpus`, keeping its JSON output
   (§Candidate assembly and temporary corpus).
4. Both validators from §Candidate assembly and temporary corpus pass; resolve
   astronomy under §Astronomy preflight and isolated acquisition.
5. Freeze the candidate and record its SHA-256 before any comparison (§Candidate
   assembly and temporary corpus, §Checksum provenance).
6. Assemble the review package (§Review package), including the D2 list (§Reading
   order and story dates). The list is reporting only: not a promotion gate, and
   never a reason to rewrite the candidate while D2 is open.
7. After C1, record the run outputs with `scripts/chapter_promotion.py record`
   (allowlisted files only, never book text; §Checksum provenance).

## C. Promotion and post-write

`scripts/chapter_promotion.py promote` runs items 2–5. Items 3–5 form one fail-closed
transaction: any failure restores the chapter. Isolated acquisition
(§Promotion step 3) stays manual. The Extractor runs this section on its own data
branch.

1. The Captain's approval names this exact candidate (§Approval).
2. Rebuild a fresh root from current canonical inputs plus the approved candidate,
   and rerun both validators (§Promotion).
3. Write canonically; confirm value identity and record both SHA-256 values if
   formatting changed bytes (§Checksum provenance and §Promotion).
4. No promotion-log row is needed; drop the one `promote` appends (§Checksum
   provenance).
5. Run the post-write validation (§Post-write validation); if it fails, restore the
   chapter. Check merged-text sentence preservation (§Post-write validation).
6. Open a data-only PR whose body quotes the Captain's approval with date and time,
   plus the provenance from §Checksum provenance, limited to the path allowlist in
   [§Data-only chapter PRs](development-process.md#data-only-chapter-prs).
   Per-chapter facts in `tests/fixtures/narrative-meaning.json` are not required.
   Existing facts stay; changing an existing one is a disputed book fact and needs
   the Captain's recorded decision.
