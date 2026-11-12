# Chapter extraction checklists

Short run sheets for operators. Each item points to the governing section of the
[extraction contract](chapter-extraction.md), which holds the rules. Any failed item
stops the run; never bypass it.

## A. Manual preflight (before reading source text)

1. Profile: the conforming Codex profile can be requested for both passes, or the
   Captain's explicit approval of provider, model, and workflow for this run is
   recorded, labelled NON-CONFORMING (§3.2–3.4; D1 open).
2. Source: one readable UTF-8 file outside the repository, named
   `<book>.<chapter>.txt` or `<book>.<chapter> - <title>.txt`;
   `source_evidence.py metadata` passes and its SHA-256 is recorded (§2).
3. Workspace: a new `mktemp -d` directory under `/tmp` is writable (§4).
4. Approved-chapters repository `~/bobiverse-approved-chapters` is writable, with no
   remote (§11.2).
5. Repository: clean worktree; record `git rev-parse HEAD` as the base revision
   (§8, §11.2).
6. Tooling: Node 22.23.1 via nvm, `node_modules` installed, `.venv` present;
   `npm run narrative:validate` passes (§8).
7. Prior chain: build a root of the chapters before the target with
   `prepare-corpus`, using the last prior chapter as the stand-in candidate, and
   check that its provenance shows `inputs_clean: true` (§8).
8. Run both §8 validators on that prior root. An astronomy failure here is a
   baseline problem: stop and report it (§9).
9. Isolation plan: separate fresh contexts for Pass 1 and Pass 2, and the exact Pass
   1 staging list (§4).

## B. Run and handoff

1. Pass 1 runs the blind brief, seals the ledger, and records its SHA-256 (§5).
2. Pass 2 reads the exception registries only after verifying fingerprints (§6.1).
3. Build the candidate and root with `prepare-corpus`, keeping its JSON output (§8).
4. Both §8 validators pass; resolve astronomy under §9.
5. Freeze the candidate and record its SHA-256 before any comparison (§8, §11.2).
6. Assemble the review package (§10), including the D2 list (§7).
7. Commit run outputs, never book text, to the approved-chapters repository after
   approval and tag it `chapter-<ref>-approved` (§11.2).

## C. Promotion and post-write

1. The Captain's approval names this exact candidate (§11.1).
2. Rebuild a fresh root from current canonical inputs plus the approved candidate,
   and rerun both validators (§11.3).
3. Write canonically; confirm value identity and record both SHA-256 values if
   formatting changed bytes (§11.2–11.3).
4. Run the post-write validation (§11.4).
5. Append one promotion-log row; the decision cell carries the approved SHA-256 when
   it differs, the approved-chapters commit and tag, and any NON-CONFORMING label
   (§11.2).
