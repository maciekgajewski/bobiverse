# BOB-007 review results

## Review target

- Task: `docs/tasks/BOB-007-additional-narrative-entity-types.md`
- Review ledger: `docs/reviews/BOB-007-review-results.md`

## Review pass 1 - initial

### Snapshot

- Reviewer: `task-reviewer`
- Pass: `initial`
- HEAD: `f93bb8dc76fd59e38d2bf0d0476cd7cfccb2cfd9`
- Working tree: `Staged: none. Unstaged: 9 modified files (schema, narrative model/diagnostics, tests, task/design documentation). Untracked: docs/adrs/0007-additional-narrative-entity-types.md.`
- Task: `docs/tasks/BOB-007-additional-narrative-entity-types.md`

### Findings

#### F-001 - Medium: Required direct-entity story-time regression coverage is missing

- Status: `Open`
- Evidence: `tests/unit/narrative.test.ts:45-52` is the only non-chronological story-time assertion and exercises only `character:fixture-alex`. The new-type projection test at `tests/unit/narrative.test.ts:163-225` selects chapters `1.1` and `1.2`, whose dates are chronologically ordered, while `tests/unit/narrative.test.ts:227-262` verifies only reader-order hiding. It never proves that a reader-visible future-story update to a `technology`, `organization`, or `vessel_type` property is excluded from an earlier story-time projection.
- Violated requirement: `docs/tasks/BOB-007-additional-narrative-entity-types.md:76-78` requires focused story-time tests for each new type; acceptance criterion 6 requires their visible properties to preserve story-time rules (`docs/tasks/BOB-007-additional-narrative-entity-types.md:116-118`).
- Impact: A later change could apply a new direct entity’s update by reader order rather than effective story date, exposing a future in-universe state without a regression test detecting it.
- Required correction: Add focused assertions for all three new types that distinguish reader visibility from story-time eligibility, proving their later-story properties are absent from an earlier selected story-time view and apply at the eligible view.
- Verification required: `./node_modules/.bin/vitest run tests/unit/narrative.test.ts` must pass with the new non-chronological assertions; `npm run test` must pass in an environment that permits its child-process tests.

### Suggestions

No suggestions.

### Validation performed

- `git diff --check` - exit 0; no whitespace errors.
- `npm run format:check` - exit 0; all matched files use Prettier code style.
- `npm run lint` - exit 0.
- `npm run typecheck` - exit 0.
- `npm run narrative:validate` - exit 1; sandbox denied `tsx` creation of its IPC pipe (`EPERM` at `/tmp/tsx-1000/25.pipe`), so canonical-corpus validation was not assessed.
- `./node_modules/.bin/vitest run tests/unit/narrative.test.ts` - exit 0; 13 tests passed.
- `npm run test` - exit 1; 52 tests passed and 8 unrelated CLI/script-help tests failed because the sandbox denied child-process spawning or `tsx` IPC (`EPERM`).
- Not run: `npm ci` - replaces installed dependencies and is not compatible with this read-only review.
- Not run: `npm run build` - creates build output and is not compatible with this read-only review.

### Reviewer conclusion

`Blocking findings remain: F-001.`

## Implementation response 1

### Findings addressed

#### F-001

- Response status: `Addressed - awaiting verification`
- Changes: `tests/unit/narrative.test.ts` now projects all three direct entity types at chapter `1.3`, where reader order includes the chapter-`1.2` updates but story time precedes them; it verifies each original property remains projected until its later story date.
- Tests added or updated: Focused direct-entity projection regression coverage for `technology`, `organization`, and `vessel_type` now distinguishes reader visibility from story-time eligibility.
- Verification: `./node_modules/.bin/vitest run tests/unit/narrative.test.ts` - exit 0, 13 tests passed; `npm run format:check` - exit 0; `npm run lint` - exit 0; `npm run typecheck` - exit 0; `npm run narrative:validate` - exit 0, canonical zero state and 1 chapter source file valid; `npm run test` - exit 0, 14 files and 60 tests passed; `npm run build` - exit 0, including data and narrative validation; `git diff --check` - exit 0.
- Limitations: `npm run build` reports Vite's non-failing existing advisory that one generated chunk exceeds 500 kB after minification.

### Rebuttals

`None.`

## Review pass 2 - verification

### Snapshot

- Reviewer: `task-reviewer`
- Pass: `verification`
- HEAD: `f93bb8dc76fd59e38d2bf0d0476cd7cfccb2cfd9`
- Working tree: `Staged: none. Unstaged: 9 modified task files. Untracked: ADR-0007 and the review ledger.`

### Finding status

#### F-001

- Status: `Resolved`
- Evidence: `tests/fixtures/narrative.ts:30-56` makes chapter `1.2` reader-visible before `1.3` but gives it later story time (`2200.2` versus `2200.1`). `tests/unit/narrative.test.ts:168-193` introduces all three direct types and writes their later properties in `1.2`; `tests/unit/narrative.test.ts:226-241` now asserts that the chapter-`1.3` projection retains each original property. `./node_modules/.bin/vitest run tests/unit/narrative.test.ts` exited 0 with 13 tests passed.
- Rationale: The new assertions distinguish reader-order visibility from story-time eligibility for `technology`, `organization`, and `vessel_type`, satisfying the missing focused regression coverage.

### New findings

`None.`

### Validation performed

- `./node_modules/.bin/vitest run tests/unit/narrative.test.ts` - exit 0; 13 tests passed.
- `git diff --check` - exit 0; no whitespace errors.
- `npm run format:check` - calling-agent evidence assessed: exit 0.
- `npm run lint` - calling-agent evidence assessed: exit 0.
- `npm run typecheck` - calling-agent evidence assessed: exit 0.
- `npm run narrative:validate` - calling-agent evidence assessed: exit 0; canonical zero state and one chapter source file valid.
- `npm run test` - calling-agent evidence assessed: exit 0; 14 files and 60 tests passed.
- `npm run build` - calling-agent evidence assessed: exit 0, including data and narrative validation.

### Reviewer conclusion

`No blocking findings.`

## Review pass 3 - fresh closure

### Snapshot

- Reviewer: `task-reviewer`
- Pass: `fresh-closure`
- HEAD: `f93bb8dc76fd59e38d2bf0d0476cd7cfccb2cfd9`
- Working tree: `Staged: none. Unstaged: 9 BOB-007 implementation/documentation files. Untracked: ADR-0007 and this review ledger.`

### Independent assessment

Independently reviewed the task, applicable `AGENTS.md`, binding ADRs, design records, current diff, schema, projection/diagnostics integration, and tests before consulting the ledger. ADR-0007 validly supersedes ADR-0006’s narrow entity union; schema contracts and unions cover the three typed records and updates; projection derives each supported prefix; and the documented schema listing exactly matches the machine-readable schema. The change remains within BOB-007 scope and adds no canonical book-derived records or UI behavior.

### Finding status

- F-001: `Verified resolved` — `tests/unit/narrative.test.ts:168-241` introduces all three types, applies chapter-1.2 updates, and confirms that the reader-visible chapter-1.3 projection retains the earlier-story-time properties.

### New findings

`None.`

### Validation assessed

- `npm run format:check` - exit 0.
- `npm run lint` - exit 0.
- `npm run typecheck` - exit 0.
- `node --import tsx scripts/narrative-cli.ts validate` - exit 0; canonical corpus valid.
- `./node_modules/.bin/vitest run tests/unit/narrative.test.ts` - exit 0; 13 tests passed.
- `npm run narrative:validate` - not runnable in this sandbox: `tsx` IPC pipe creation failed with `EPERM`; equivalent CLI validation above passed.
- `npm run test` - sandbox-limited: 52 tests passed; 8 unrelated CLI/script-help tests failed only on child-process `EPERM`.
- `git diff --check` and `git diff --cached --check` - exit 0.

### Final conclusion

`Review closed. No open blocking findings remain.`
