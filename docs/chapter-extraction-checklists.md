# Chapter extraction checklists

Short run sheets for operators. Each item cites the governing section of the
[extraction contract](chapter-extraction.md) by its heading, in the form §Heading;
the contract holds the rules. Any failed item stops the run; never bypass it.

## A. Manual preflight (before reading source text)

1. Profile: the conforming Codex profile can be requested for both passes, or the
   Captain's explicit approval of provider, model, and workflow for this run is
   recorded, labelled NON-CONFORMING (§Prerequisite check to §Approved alternative;
   D1 open).
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
7. Commit run outputs, never book text, to the approved-chapters repository after
   approval and tag it `chapter-<ref>-approved` (§Checksum provenance).

## C. Promotion and post-write

1. The Captain's approval names this exact candidate (§Approval).
2. Rebuild a fresh root from current canonical inputs plus the approved candidate,
   and rerun both validators (§Promotion).
3. Write canonically; confirm value identity and record both SHA-256 values if
   formatting changed bytes (§Checksum provenance and §Promotion).
4. Run the post-write validation (§Post-write validation).
5. Append one promotion-log row; the decision cell carries the approved SHA-256 when
   it differs, the approved-chapters commit and tag, and any NON-CONFORMING label
   (§Checksum provenance).
