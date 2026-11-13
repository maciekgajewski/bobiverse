# BOB-20261113-VN808E: fix master chapter-view flip tests after the 1.22 drop

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-11-13

## Objective

Make master's Repository checks green again. PR #23 added chapter-view flip cases
that assumed chapter 1.22 still writes `current_state` for `character:riker` and
`character:homer`. PR #24 removed those writes, so the two cases fail on master
`90dab38` (CI run 43501022111).

## User-visible outcome

Nothing in the app changes. The two redundant flip cases are removed; the 1.22
no-write and the 1.21 states at read-through 1.22 and 1.23 stay pinned by
FSHPA9's meaning fixtures. CI's Repository checks job is expected to go green.

## Binding references

- `../adrs/0028-backdated-updates.md` (decision (c))
- `BOB-20261113-WZGAM4-chapter-view-reading-order.md` (added the flip tests)
- `BOB-20261113-FSHPA9-canonical-data-fixes.md` (dropped the 1.22 writes; already
  pins `no_write` and the 1.21 field values at 1.22 and 1.23)

## In scope

1. Remove the two now-redundant cases in
   `tests/unit/narrative-chapter-view-flips.test.ts` (`character:riker` and
   `character:homer` `current_state` at read points 1.22 and 1.23). FSHPA9 already
   pins the same facts in `tests/fixtures/narrative-meaning.json`.
2. This task file.

## Out of scope

- Canonical data, meaning fixtures, projection code, or the remaining flip cases
  (`character:bill` at 1.42–1.44 and `technology:vr` at 1.42).
- Marking this task or FSHPA9 Done.
- e2e (test-only change).

## Acceptance criteria

1. The two riker and homer cases are gone from the flip test. The bill and VR
   cases remain.
2. `npm test` is green, including `narrative-chapter-view-flips.test.ts`.
3. No canonical data or other production files change.
4. No book text in the repository, commits or PR body.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run build
npx prettier --check <changed Markdown>
git diff --check
```

e2e is not required (test-only change).

## Documentation and generated artifacts

No doc or generated-artifact updates. The flip-test comment still describes the
remaining cases.

## Risks and unresolved decisions

None. The deleted cases are already covered by FSHPA9's `no_write` and `field`
entries at 1.22 and 1.23.

## Log

- 2026-11-13: implemented on a branch from master `90dab38`.
