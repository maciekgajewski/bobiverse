# BOB-20261113-YRMT4T: review nits from PRs #16 and #17 and chapter promotion

Status: Done
Phase: 4 (LLM-assisted editorial pipeline; process hardening)
Last updated: 2026-11-13

## Objective and user-visible outcome

Record the merge of PR #17 (GTFZA1) and fold in small review nits for the
meaning-level tests (#16), the process-metadata lint (#17) and
`scripts/chapter_promotion.py`. These tighten the existing checks and tests. No
rule, data, schema, CI or design change.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `BOB-20261113-97Z771-meaning-regression-tests.md`
- `BOB-20261113-GTFZA1-process-metadata-lint.md`
- `BOB-20261113-RG3XYR-recoverable-promotion.md`

## Scope

1. Mark GTFZA1 (PR #17, merged as `d6742a6`) Done, with a merge log entry. 97Z771
   is already Done on master.
2. #16 nits:
   - (a) the introduction invariant takes chapters from the prepared, sorted index
     (new `preparedNarrativeChapters` accessor in `src/narrative/model.ts`), not the
     manifest order;
   - (b) "holds every pinned fact" asserts a non-empty fixture.
3. #17 nits:
   - (c) `check_adrs` also checks task-file references inside ADRs;
   - (d) synthetic cases: missing or duplicate `Status`, missing or duplicate
     `Date`, and a third file with an allow-listed number;
   - (e) the allow-list message pluralises correctly and names the files.
4. `chapter_promotion.py` nits:
   - (f) a workspace symlink given with a trailing `/` or `/.` is refused;
   - (g) tests for a symlinked or hard-linked approval file and a promotion log
     that is not valid UTF-8.

## Out of scope

Any other behaviour, rule, data, schema, CI or ADR change.

## Acceptance criteria

1. The edits above are made and nothing else changes.
2. Each nit has a test.
3. All validation commands pass, plus e2e chromium, because `src/` changes.

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
npx playwright test --project=chromium
npx prettier --check <changed Markdown>
git diff --check
```

## Log

### 2026-11-13 (Europe/Amsterdam)

- Created on origin/master `d6742a6` under the manager's authorisation of the nit
  bundle, relaying for the Captain. Moved straight to In progress.
- Implemented scope items 1–4:
  - (a) `canonicalIntroductions()` reads `preparedNarrativeChapters(narrativeCorpus)`.
    A new test prepares the corpus with its chapters reversed and checks reader
    order.
  - (b) the pinned-fact test asserts the fixture is non-empty.
  - (c) `check_adrs` takes the task filenames. The real ADRs have no broken
    task-file references, since they cite bare IDs such as `BOB-034`.
  - (d) and (e): six new ADR subcases, plus one test for task references inside an
    ADR. The allow-list message now reads "has 1 file: …" and names the files.
  - (f) not reproducible. `pathlib.Path` already folds `link/` and `link/.` to
    `link` (checked on Python 3.14), so the existing `is_symlink()` refusal holds.
    Regression tests now pin both suffixes; there is no code change.
  - (g) three new cases (symlinked and hard-linked approval, non-UTF-8 log).
- Validation (Node 22.23.1):
  - tasks check (70 files, 29 ADRs);
  - format:check, lint and typecheck;
  - Vitest 343/343 in 32 files;
  - Python data tests 90/90;
  - data:validate (277 systems);
  - build;
  - e2e chromium 31/31, run on a temporary port 5183 because 5173 is in use and
    left alone (an untracked, deleted config overrode the port);
  - prettier `--check` on the changed Markdown;
  - `git diff --check`.

  All passed.

- PR #18 was squash-merged to master as `baa4578` on Friday 2026-11-13. Status is now
  **Done**, recorded after that merge (in the chapters 1.44–1.50 promotion PR).
