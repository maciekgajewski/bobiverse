# BOB-20261113-3HBNVF: follow-up nits from PRs #4–#6

Status: In progress
Phase: 1 (verification infrastructure and process hygiene)
Last updated: 2026-11-13

## Objective and user-visible outcome

Fold in the small follow-up nits queued during the reviews of PRs #4, #5 and #6, and
record the merges of PRs #5 and #6 in their task files. No behaviour, data, schema or
design change.

## Binding references

- `../../AGENTS.md`
- `README.md`
- `BOB-20261110-M3AMGW-e2e-flake-stabilisation.md`
- `BOB-20261110-845KTJ-astronomy-staging-context.md`
- `BOB-20261112-1TWD9T-extraction-contract.md`
- `BOB-20260805-HS0NZP-plot-style-date-timeline.md`

## Scope

1. Mark 1TWD9T (merged as `0433761`) and 845KTJ (merged as `34f2a71`) Done, each with
   a merge log line.
2. 1TWD9T: add the missing paragraph break before the D2 options sentence in
   `docs/chapter-extraction.md`, and the optional one-line `technical-design.md`
   Section 13 pointer to the contract, stating that the boundary stays
   provider-independent.
3. `source_evidence.py prepare-corpus`: parse `git status --porcelain -z` so that
   `dirty_paths` is exact for renames (both paths), spaces and non-ASCII names.
4. `docs/visual-testing.md`: note that a bare `npx playwright test` needs a display
   (Firefox is `headless: false`) and that headless hosts use `xvfb-run -a`.
5. M3AMGW: repo-relative validation commands using the in-repo `playwright.config.ts`.
6. 845KTJ: correct the Risks base wording (rebased onto `3053e95`, 93/93 e2e with
   zero retries, merged as `34f2a71`).
7. HS0NZP: correct the log wording that called the pushed, merged review fixes
   local-only or unpushed. Its status is unchanged.

## Out of scope

Any other content, behaviour, data, schema or ADR change. Port 5173 and the
acceptance checkout are not touched.

## Acceptance criteria

1. The edits above are made and nothing else changes.
2. A unit test covers rename, space and non-ASCII `dirty_paths` and fails on the
   previous line-based parser.
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
git diff --check
```

No e2e run is required: no application code or test configuration changes.

## Log

### 2026-11-13 (Europe/Amsterdam)

- Created under the manager-relayed authorisation and moved straight to In progress.
  A task is needed because `source_evidence.py` is tooling (AGENTS.md).
- Validation (Node 22.23.1, fresh `npm ci` and `.venv`): tasks check (60 files),
  format:check, lint, typecheck, Vitest 247/247 in 29 files, Python data tests
  85/85, data:validate (277 systems, six pinned sources), build (zero state and 42
  chapters) and `git diff --check` all passed. The new `dirty_paths` test fails
  against the previous line-based parser. No e2e was run: no application code or
  test configuration changed.
- 1TWD9T's mapping-count nit had no target: no file in the repository, the PR #6
  body or the squash commit states a row count; the table has 62 rows. Left
  unchanged and reported.
