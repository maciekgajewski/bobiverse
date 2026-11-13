# BOB-20261113-9C9QV9: follow-up nits from PR #10 (extraction preflight)

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline; process hardening before Chapter 1.43)
Last updated: 2026-11-13

## Objective and user-visible outcome

Record the merge of PR #10 (BR7HZS) and fold in its review nits for
`scripts/extraction_preflight.py` and its docs. These tighten the existing checks
and messages. No rule, profile value, data, schema or design change.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../chapter-extraction.md` (§Prerequisite check)
- `../chapter-extraction-checklists.md` (Checklist A)
- `BOB-20261113-BR7HZS-execution-profiles-preflight.md`

## Scope

1. Mark BR7HZS (PR #10, merged as `9651689`) Done, with a merge log entry.
2. Review nits for `scripts/extraction_preflight.py`:
   - N1: refuse (exit 2) when the working directory's checkout is not the
     script's own checkout.
   - N2: reword the "not inside a git checkout" usage message.
   - N3: item 3 also fails for a workspace inside the repository.
   - N4: relay only the last line of helper error output, bounded to 300
     characters.
   - N8: show the K5 caveat only when an approval file is passed.
   - N9: refuse (exit 2) a `--report` whose parent directory does not exist,
     before any check runs.
3. Docs:
   - N6: `--help`, Checklist A and §Prerequisite check say that item 1 runs
     `codex --version`.
   - N7: the Checklist A heading drops "Manual", and its pointer repeats the K1
     limit for item 1.
4. Tests (N5 and the above): missing `node_modules`, an existing `--report`, a
   non-writable workspace, a leak check on item 2's failure paths, and cases for N1,
   N3, N4, N6, N8 and N9. The fixture repository now carries a copy of the
   preflight, the helper and the profile record, because of N1.

## Out of scope

Any other behaviour, rule, profile value, data, schema, CI or ADR change.
`source_evidence.py` is unchanged.

## Acceptance criteria

1. The edits above are made and nothing else changes.
2. Each nit has a test, or a doc check for the wording-only nits (N2, N7).
3. All validation commands pass.

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
npx prettier --check docs/chapter-extraction.md docs/chapter-extraction-checklists.md docs/tasks/BOB-20261113-9C9QV9-preflight-followup-nits.md docs/tasks/BOB-20261113-BR7HZS-execution-profiles-preflight.md
git diff --check
```

No e2e run is required: no application code or test configuration changes.

## Log

### 2026-11-13 (Europe/Amsterdam)

- Created on origin/master `9651689` under the manager's authorisation of a routine,
  in-design follow-up, and moved straight to In progress.
- Implemented scope items 1–4. Each nit maps to one change:
  - N1: `repository_root()` refuses a checkout other than `SCRIPT_REPOSITORY`.
  - N2: the message now reads "the working directory is not inside a git
    checkout; run from the repository root".
  - N3: item 3 adds "is inside the repository".
  - N4: `helper_error()` keeps the last non-empty line, capped at 300 characters.
  - N6: `--help`, Checklist A and §Prerequisite check name `codex --version`.
  - N7: the heading is "A. Preflight (before any model reads source text)", and
    the pointer repeats the K1 limit.
  - N8: the report lists K5 only with `--approval-file`; item 1's own limits
    already did.
  - N9: a `--report` with a missing parent directory is a usage error, before any
    check.
  - N5: 11 new tests (44 in the file, up from 33).
- Because of N1, the fixture repository now carries copies of the preflight, the
  helper and the profile record, and tests run the copy. This refines a BR7HZS
  implementation choice ("the repository is the git top level of the working
  directory") without contradicting it.
- Validation (Node 22.23.1, fresh `npm ci`):
  - tasks check (64 files);
  - format:check, lint and typecheck;
  - Vitest 292/292 in 30 files;
  - Python data tests 85/85;
  - data:validate (277 systems);
  - build;
  - `extraction_preflight.py --help`;
  - prettier `--check` on the changed Markdown;
  - `git diff --check`.

  All passed. No e2e: no application code or test configuration changed.
