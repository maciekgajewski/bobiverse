# BOB-20261113-CS63EM: preflight on pending predecessors

Status: Done
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-13

## Objective and user-visible outcome

The Extractor extracts chapters back to back while earlier candidates wait for
approval or promotion. For example, 1.44 can start while 1.43 is approved but not yet
promoted. `scripts/extraction_preflight.py` currently fails closed when the target's
immediate predecessor isn't canonical (B5 of BR7HZS). This task adds an explicit
`--pending-predecessor <candidate.json>` mode, repeatable in chapter order, that
builds and validates the prior root from the canonical chapters plus those pending
candidates.

## Binding references

- `../chapter-extraction.md` §Candidate assembly and temporary corpus.
- `../chapter-extraction-checklists.md` Checklist A item 7.
- `BOB-20261113-BR7HZS-execution-profiles-preflight.md` (items 7–8, K7, B5).

## Scope

1. `--pending-predecessor` (repeatable). Item 7 fails closed unless:
   - every pending file is a readable JSON file outside the repository, with a
     valid `chapter` field;
   - their refs are exactly the chapters after the latest canonical chapter of the
     target's book, up to the target's predecessor, in order.
2. The prior root is built with `prepare-corpus`, using the first pending candidate
   as the stand-in. The later pending candidates are copied in at their chapter
   paths, and item 8 runs both validators on that root.
3. The report adds:
   - `prior_chain_basis: "PENDING"`;
   - `pending_predecessors`: each one's ref, path and SHA-256 (informational);
   - a limits note, which also appears in the stderr summary.

   Item 7's evidence carries `basis: "PENDING"`. Exit codes and the other checks are
   unchanged.

4. Without the flag, the behaviour and the report are unchanged. Only the
   missing-predecessor message now points to the flag.
5. Docs: one paragraph in §Candidate assembly and one line in Checklist A item 7.

## Out of scope

Book boundaries and zero state (still fail closed); approval or promotion of pending
chapters; isolated astronomy acquisition; any change to the helper or validators.

## Acceptance criteria

1. Preflight passes with one pending predecessor and with a chain of two.
2. A gap, the wrong order, a canonical predecessor passed as pending, an invalid or
   missing file, and a file inside the repository each fail item 7 (and item 8),
   with no prior-root validation run.
3. The report marks the PENDING basis and lists ref, path and SHA-256.
4. The existing tests pass unchanged, and a run without the flag has no PENDING
   fields.

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

## Log

### 2026-11-13 (Europe/Amsterdam)

- Maciej, relayed by the manager at 14:18: "Keep the extractions going. Don't block
  on me. I may approve in batches." The manager authorised this task under its
  delegation; status In progress.
- Worktree `~/src/bobiverse-pending` on `bob-cs63em-pending-predecessors`, from
  origin/master `f005b72`.
- Implemented the flag in `scripts/extraction_preflight.py`, with 10 new fixture
  test cases (52 in `extraction-preflight.test.ts`). The docs got a paragraph in
  §Candidate assembly and a line in Checklist A item 7.
- Validation on piotr (Node 22.23.1):
  - `tasks check` passed (65 files); `format:check`, `lint` and `typecheck` passed;
  - `test` passed (30 files, 300 tests); `data:test` passed (85 tests);
  - `data:validate` passed (277 systems); `build` passed;
  - `prettier --check` on the changed Markdown and `git diff --check` passed.
- Real-usage check (read-only, writes only under `/tmp`): I ran preflight for 1.44
  with the 1.43 scratch candidate as pending and a synthetic placeholder source (no
  source text read). Item 7 passed: PENDING basis, 43 chapters, `inputs_clean: true`.
  Item 8 passed: narrative valid over 43 chapter files, and `data:validate` 277
  systems. Item 1 failed (no `codex` launcher and no approval file passed) and item
  5 failed (uncommitted work at the time); both are unrelated to this mode.
- PR #14 was squash-merged to master as `3b87545` on Friday 2026-11-13. Status is now
  **Done**, recorded after that merge (in BOB-20261113-ARAQFT). The squash dropped
  the executable bit on `scripts/extraction_preflight.py`; ARAQFT restores it.
