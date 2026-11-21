# BOB-20261121-ZV3449: extraction check command for a candidate set

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-11-21

## Objective and user-visible outcome

Replace the Extractor's hand rebuild of a candidate-set review branch with one
command, `scripts/extraction_check.py`. It builds a local branch from a
directory of chapter candidates, runs the repository checks plus per-chapter
preflights once, and writes a stand-alone pass/fail `summary.txt` with log
paths. No reader-visible change.

## Authorization

- The manager approved the plan on 2026-11-21 (Europe/Warsaw), with three
  additions: include `npm run data:generate` and fail if it leaves a git
  diff; put the first ~20 relevant lines of any failed step in `summary.txt`;
  and prove the command on the Extractor's 2.11–2.20 candidates against
  master `607b55d` without changing their data.

## Binding references

- `../chapter-extraction.md` (§Final candidate-set check, §Candidate
  assembly and temporary corpus, §Post-write validation)
- `../engineering-principles.md` (build the lever; encode lessons in
  structure; test behavior)
- `../../scripts/extraction_preflight.py`
- `BOB-20261121-5A8W76-death-date-write-dating.md`
- `BOB-20261121-3KH6B2-preservation-supersedes.md`

## Scope

1. Add `scripts/extraction_check.py` and `tests/python/test_extraction_check.py`.
2. Document usage in `docs/chapter-extraction.md` and the extraction skill.
3. Mark BOB-20261121-5A8W76 Done in a separate commit (already landed as
   `607b55d`).

## Out of scope

- Changing chapter data, exception rows, source text, or approval files.
- Pushing, merging to master, or a LAN deploy.
- Playwright e2e or CSP.
- Replacing `scripts/chapter_promotion.py`.

## Acceptance criteria

- The command takes a directory of `B.N.json` candidates, an optional
  complete exceptions file, a source directory, and an approval directory,
  all outside the repository.
- It copies those files byte-for-byte onto a new worktree off `--base`,
  commits once on a new local branch, and never pushes.
- It runs `narrative:manifest`, `narrative:validate`, `format:check`,
  `data:validate`, `lint`, `typecheck`, `data:test`, `build`, `test`,
  `data:generate` (failing on any remaining git diff), `git diff --check`
  on the worktree and on `BASE..HEAD`, `scripts/tasks.py check`, and
  `extraction_preflight.py` once per chapter with no pending predecessors.
- `summary.txt`, written outside the repository, can be read on its own:
  each step has an `rc`, and a failed step includes the first ~20 relevant
  log lines, preferring errors, plus the log path.
- Exit 0 if every step passed, 1 if any check or preflight failed and the
  summary was written, 2 on a usage or setup error.
- `--cleanup` removes the worktree and keeps the local branch and the logs.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
git diff --check master HEAD
```

No e2e (no UI change).

Manual check: run the command on a candidate set and read `summary.txt`.

## Documentation and generated artifacts

`docs/chapter-extraction.md` (§Final candidate-set check) and a short usage
note in `.codex/skills/extract-bobiverse-chapter/SKILL.md`. No generated
artifact changes.

## Known risks or unresolved decisions

- A proof run against current master may fail `narrative:validate` or
  preflight item 8 on older candidates, because the preservation
  `supersedes` rule and the `death_date` write-dating rule landed after
  those candidates were written. Failures are reported; candidate bytes
  are not changed.

## Log

### 2026-11-21 (Europe/Warsaw)

- Created on master `607b55d` on local branch
  `bob-20261121-extraction-check` in the `~/src/bobiverse-extcheck`
  worktree.
- Marked BOB-20261121-5A8W76 Done in a separate commit.
