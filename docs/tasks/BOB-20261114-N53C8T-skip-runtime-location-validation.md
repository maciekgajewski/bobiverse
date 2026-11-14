# BOB-20261114-N53C8T: skip runtime location validation in production builds

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-14

## Objective and user-visible outcome

Page load currently re-runs `assertProjectedLocationConstraints` inside
`prepareNarrativeCorpus` on every visit. Profiling of the deployed build
(`~/tmp/chapter-perf/SUMMARY.md`) showed that pass costing about 4 s on
desktop and about 20 s on a 4×-throttled phone, mostly from repeated
structured clones. This task skips that one check in production browser
builds only. Development, tests, and `npm run narrative:validate` (which
`npm run build` already runs over the same corpus) still perform it. There
is no user-visible behaviour change: the production bundle is served only
after the build-time validator has accepted the corpus, and projection
behaviour is unchanged.

## Authorization

Piotr Developer Manager authorised this on 2026-11-14 at 18:02
(Europe/Warsaw) as routine in-design work with no behaviour change: skip
`assertProjectedLocationConstraints` in production builds only; keep it in
development and in all tests; make sure `narrative:validate` still covers
the same check in the build. The change goes on its own local branch with a
SHA for review, then deploys under the standing OK after review.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md` (narrative preparation boundary; this task updates
  the production-build exception)
- `../implementation-plan.md` (Phase 2)

## In scope

1. Gate `assertProjectedLocationConstraints` so production Vite builds skip
   it during `prepareNarrativeCorpus`, while development, Vitest, and the
   Node `narrative:validate` / `validateNarrativeCorpus` paths still run it.
2. Confirm `npm run narrative:validate` performs the same check over the
   same corpus, and extend that command only if it does not.
3. Keep or add a test that the build-time validator rejects a corpus that
   violates the constraint.
4. This task file, and the technical-design note for the production skip.
5. Page-load timings on a local production preview, before and after.

## Out of scope

- Changing projection behaviour, canonical data, or any other semantic check.
- Caching or rewriting `orderNarrativeActivity` (separate authorised work).
- Skipping `assertProjectedLocationConstraints` in development or tests.
- Marking this task Done (that happens after merge, in a later commit).

## Acceptance criteria

1. A production browser build does not run
   `assertProjectedLocationConstraints` during startup preparation.
2. Development, every unit/component/e2e test, `validateNarrativeCorpus`,
   and `npm run narrative:validate` still run the same check over the same
   corpus.
3. `tests/unit/narrative.test.ts` already proves the shared semantic
   validator rejects a violating corpus (survey properties on an ineligible
   effective kind, and more than four direct moon children), including cases
   that only appear under chapter-view reading order. That coverage is kept.
4. `npm run build` still runs `narrative:validate` before the Vite bundle
   is produced.
5. No canonical data, book text, or generated chapter bytes change.
6. Cold production page-load time drops by roughly the profiled cost of the
   skipped pass, measured on a local preview build.

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
npx prettier --check <changed Markdown>
git diff --check
```

Full e2e in chromium, firefox and webkit, one worker, no retries, on port
5191 with an untracked throwaway `playwright.alt5191.config.ts` that must
not be committed. Measure production page load on a local preview build
(desktop and 4×-throttled phone), before and after.

## Documentation and generated artifacts

`docs/technical-design.md` records that production browser preparation
skips the projected-location constraint pass because `npm run build` already
ran `narrative:validate` over the same corpus. No generated artifacts.

## Risks and unresolved decisions

- `import.meta.env.PROD` must not be treated as true when `tsx` runs
  `narrative-cli.ts` in Node, or the build-time validator would skip the
  check. The gate treats a missing `import.meta.env` as non-production.
- The production skip is safe only because `npm run build` keeps running
  `narrative:validate` first. Removing that step from the build would
  require this gate to be revisited.

## Log

- 2026-11-14: task opened as Ready after the manager authorised the skip as
  routine in-design work.
- 2026-11-14: implemented the production-only skip, confirmed
  `narrative:validate` still calls `prepareNarrativeCorpus` (and therefore the
  same constraint check) over the same corpus, and moved the task to In
  progress for review.
- 2026-11-14: validation on this branch (based on c8ce3cc): tasks check,
  format:check, lint, typecheck, test, data:test, data:validate,
  narrative:validate (zero state and 61 chapter source files), build,
  prettier on changed Markdown, and git diff --check all passed. Production
  preview load-to-badge timings, three cold repeats: desktop 6446/4985/6621
  ms before (median 6446) and 622/401/384 ms after (median 401); 4×-throttled
  phone 22572/22709/23854 ms before (median 22709) and 1087/1278/1395 ms
  after (median 1278). Full e2e, one worker, no retries, port 5191:
  chromium 39 passed and 3 skipped, with the known "permanent local
  backdrop" test flaking once then passing in isolation; firefox 40 passed
  and 3 skipped; webkit 39 passed and 3 skipped on the same set, but that
  same backdrop test failed repeatedly at varying assertions (also seen on
  the unrelated about-caption branch) and was not changed here. e2e uses the
  Vite dev server, so the production-only skip is not on that path.
