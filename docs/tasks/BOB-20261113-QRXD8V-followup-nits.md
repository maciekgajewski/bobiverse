# BOB-20261113-QRXD8V: follow-up nits from PRs #7–#8

Status: In progress
Phase: 1 (verification infrastructure and process hygiene)
Last updated: 2026-11-13

## Objective and user-visible outcome

Record the merges of PRs #7 and #8 in their task files and fold in small follow-up
nits. No behaviour, data, schema or design change.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `BOB-20261113-3HBNVF-followup-nits.md`
- `BOB-20261113-YPEVFD-merge-gate-roles.md`
- `BOB-20260805-HS0NZP-plot-style-date-timeline.md`

## Scope

1. Mark 3HBNVF (PR #7, merged as `a20985f`) and YPEVFD (PR #8, merged as `f89c9c4`)
   Done, each with a merge log entry.
2. Add a newline-in-path case to the `dirty_paths` test in
   `tests/unit/source-evidence-helper.test.ts`.
3. HS0NZP: update its stale `Last updated`. Its status stays In progress, pending
   the Captain's visual acceptance.
4. `docs/visual-testing.md`: CI must be green on the reviewed head SHA before merge,
   as in `development-process.md`.
5. `AGENTS.md`: list `docs/development-process.md` among the authoritative documents.
6. YPEVFD log: append a publication correction to its stale "Nothing was pushed"
   line.

## Out of scope

Any other content, behaviour, data, schema or ADR change.

## Acceptance criteria

1. The edits above are made and nothing else changes.
2. The `dirty_paths` test covers a real untracked file whose name contains a newline.
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
npx prettier --check AGENTS.md docs/visual-testing.md docs/tasks/BOB-20261113-QRXD8V-followup-nits.md docs/tasks/BOB-20261113-3HBNVF-followup-nits.md docs/tasks/BOB-20261113-YPEVFD-merge-gate-roles.md docs/tasks/BOB-20260805-HS0NZP-plot-style-date-timeline.md
git diff --check
```

No e2e run is required: no application code or test configuration changes.

## Log

### 2026-11-13 (Europe/Amsterdam)

- Created under the manager's authorisation of a routine, in-design follow-up and
  moved straight to In progress.
- Implemented scope items 1–6. The newline case uses a real untracked file,
  `data/narrative/line\nbreak.txt`, which the Linux temporary filesystem and git
  accept. `porcelain_z_paths` reports it verbatim because `-z` output is unquoted
  and NUL-separated.
- Validation (Node 22.23.1, fresh `npm ci` and `.venv`):
  - tasks check (62 files);
  - format:check, lint and typecheck;
  - Vitest 247/247 in 29 files (the existing rename test gained the case);
  - Python data tests 85/85;
  - data:validate (277 systems, six pinned sources);
  - build (zero state and 42 chapters);
  - prettier `--check` on the changed Markdown;
  - `git diff --check`.

  All passed. No e2e was run.
