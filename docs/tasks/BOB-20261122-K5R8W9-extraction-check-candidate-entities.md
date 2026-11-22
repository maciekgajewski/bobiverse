# BOB-20261122-K5R8W9: extraction-check candidate-entities file option

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-11-22

## Objective and user-visible outcome

Add `--candidate-entities-file PATH` to `scripts/extraction_check.py` so a check
run installs the given `candidate-entities.json` into the review worktree
instead of the file on `--base`. The check then validates exactly the candidate
entity file that will land. Without the option, behaviour is unchanged. No
reader-visible change.

## Authorization

The manager authorised this work on 2026-11-22 at 15:45 (Europe/Warsaw), as a
small task before or alongside the 18:00 GJ 54 retry, so the Extractor's
2.11–2.20 rerun can be checked against the candidate-entities file that will
land.

The manager approved reviewed head `fbab04c8a36ffd9fe73760dada853a1167b0a829`
at 15:57 (Europe/Warsaw) on 2026-11-22 and gave the go to land.

## Binding references

- `../chapter-extraction.md` (§Final candidate-set check)
- `../adrs/0032-candidate-entity-dataset.md`
- `BOB-20261121-ZV3449-extraction-check-command.md`
- `BOB-20261122-TC01E3-candidate-entity-dataset.md`
- `../../scripts/extraction_check.py`

## Scope

1. Add `--candidate-entities-file PATH` to `scripts/extraction_check.py`.
2. When the option is set, copy the given file byte-for-byte into
   `data/candidates/candidate-entities.json` in the review worktree and include
   it in the single review commit, mirroring how chapter files and
   `--exceptions-file` are installed.
3. Validate that the path exists and is a file; fail clearly otherwise.
4. Leave behaviour unchanged when the option is omitted.
5. Document the option in `docs/chapter-extraction.md`, the script's `--help`,
   and the short usage note in the extraction skill.
6. Add tests for the install behaviour and for a missing path.

## Out of scope

- Landing or pushing the branch.
- Changing chapter data, candidate-entity data, exception rows, source text, or
  approval files.
- Playwright e2e or CSP.
- The GJ 54 refresh or the Extractor's 2.11–2.20 rerun.

## Acceptance criteria

- `--candidate-entities-file PATH` installs that file into
  `data/candidates/candidate-entities.json` on the review worktree, so the
  check sees its contents, including a candidate that exists only in the given
  file.
- A missing path, or a path that is not a file, is a usage error (exit 2) and
  does not create the review branch.
- Omitting the option leaves the `candidate-entities.json` from `--base`
  unchanged.
- `--help` and `docs/chapter-extraction.md` document the option.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
git diff --check
```

No e2e (no UI change).

## Documentation and generated artifacts

`docs/chapter-extraction.md` (§Final candidate-set check), the script's
`--help`, and a short usage note in
`.codex/skills/extract-bobiverse-chapter/SKILL.md`. No generated artifact
changes.

## Known risks or unresolved decisions

None. The option is additive and default-off.

## Log

### 2026-11-22 (Europe/Warsaw)

- Created on origin/master `4cd712e` on local branch
  `bob-20261122-check-candidates` in the `~/src/bobiverse-cand-check` worktree,
  authorised by the manager at 15:45.

- Implementation and tests added. Fast checks on this branch, 2026-11-22
  15:55 (Europe/Warsaw): `python3 scripts/tasks.py check` (121 task files,
  34 ADRs), `format:check`, `lint`, `typecheck`, `test` (857 tests in 66
  files), `data:test` (134 tests), `data:validate`, `narrative:validate`
  (71 chapters, 4 candidates), `build`, and `git diff --check` all passed.
  No e2e (no UI change). Not landed or pushed.

- The manager approved reviewed head `fbab04c8a36ffd9fe73760dada853a1167b0a829`
  at 15:57 (Europe/Warsaw) on 2026-11-22. Status set to Done in this docs-only
  recording commit; landing follows.
