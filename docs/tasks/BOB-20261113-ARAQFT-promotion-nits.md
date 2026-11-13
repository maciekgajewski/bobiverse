# BOB-20261113-ARAQFT: chapter promotion review nits (PR #12)

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-13

## Objective and user-visible outcome

Fold the manager's review nits on PR #12 (`scripts/chapter_promotion.py`, merged as
`ef01c2e`) into one small follow-up. The safety nit comes first: `record` must never
let an allowlisted name pull in other bytes, such as source text.

## Binding references

- `BOB-20261113-RG3XYR-recoverable-promotion.md` (scope, allowlist, transactions).
- `../chapter-extraction-checklists.md` Checklists A and C.

## Scope

1. `record` refuses a symlinked workspace directory, and any workspace entry that is
   not a regular file (symlink, directory or FIFO), checked with `lstat`. It also
   refuses a hard-linked file (`st_nlink` greater than 1). It reads each file once
   with `O_NOFOLLOW` and writes those bytes, so nothing follows a link. The approval
   file is read the same way.
2. `promote` checks that `docs/chapter-promotion-log.md` exists and has a table with
   an insertion point before it writes the chapter file.
3. `promote` saves the previous chapter and log bytes in `<workspace>/saved/` before
   writing. An unconfirmed restore exits 3 and names that directory.
4. Tests:
   - each refusal in item 1, with no commit or tag created;
   - a missing log and a log with no table (the chapter file is not created);
   - the exit-3 path.
5. Checklist A item 1 no longer requires a per-run approval, so the D1 standing
   approval satisfies it. Checklist C describes the log row inside the fail-closed
   transaction, before post-write validation.

## Out of scope

Any other change to `record`, `promote` or `verify`; the contract text in
`chapter-extraction.md`.

## Acceptance criteria

1. The refusals in scope item 1 exit 1, leaving the approved-chapters repository
   untouched.
2. With a missing or table-less log, `promote` exits 1, with no chapter file and no
   Prettier call.
3. A restore that can't be confirmed exits 3 and names the saved copies.
4. Validation passes.

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

- The manager asked for this follow-up at 14:32, relaying its PR #12 review nits,
  and authorised it under its delegation; status In progress.
- Worktree `~/src/bobiverse-pnits` on `bob-20261113-araqft-promotion-nits`, from
  origin/master `ef01c2e`.
- Implemented scope items 1–5. `chapter-promotion.test.ts` has 22 tests (9 new,
  all failing against the old script).
- Validation on piotr (Node 22.23.1):
  - `tasks check` passed (66 files); `format:check`, `lint` and `typecheck` passed;
  - `test` passed (31 files, 315 tests); `data:test` passed (85 tests);
  - `data:validate` passed (277 systems); `build` passed;
  - `prettier --check` on the changed Markdown and `git diff --check` passed.
- Rebased onto origin/master `f06ecec` (PR #13; 1.43 is canonical) with no conflicts.
- Ride-along: CS63EM is marked Done (PR #14, `3b87545`). The executable bit on
  `scripts/extraction_preflight.py`, dropped by #14, is restored (`100755`).
- Check on master: preflight for 1.44 without `--pending-predecessor` (synthetic
  source, `/tmp` only) passes items 7 and 8 on the canonical chain.
- Kept on the parent's direction: the hard-link and symlinked-approval refusals, as
  deliberate safety additions. A symlinked parent above the workspace is accepted.
- `chapter-extraction.md` §Approved alternative now opens with "per run or standing
  (D1)" instead of "for the run".
- Done only after merge.
