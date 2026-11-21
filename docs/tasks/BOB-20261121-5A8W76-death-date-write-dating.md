# BOB-20261121-5A8W76: date death_date writes no later than the death

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-21

## Objective and user-visible outcome

`death_date` and `death_event_id` are soft-ceiling properties
(`docs/design-principles.md` §2.5, ADR-0031): each shows from the story date of
the write that sets it. A write dated after the death therefore shows the
character alive between the death and that date (T3 review follow-up, nit 1).
`narrative:validate` now rejects such a write.

- Every chapter write that sets `death_date` (introduction or update) must
  satisfy `isKnownAtCeiling(writeDate, death_date)`: it is known at a soft
  ceiling equal to its own death date. Dates compare as calendar ranges (rule
  (e), ADR-0026): the write's range must start no later than the end of the
  death period, and within the same period its ordering suffix must not be
  higher.
- `writeDate` is the date the projection uses: an update's
  `effective_date ?? chapter date`; an introduction's chapter date.
- The error names the pointer and suggests `effective_date`.

Also, approved by the manager on 2026-11-21: sentence-preservation exception
rows may excuse only `description` and `visual_description`; `state` and
`current_state` have only the `supersedes` marker route
(BOB-20261121-3KH6B2). No state rows remain on master.

No reader-visible change: all current chapter data already passes.

## Authorization

- The manager relayed Maciej's T3 review follow-up (nit 1) on 2026-11-20
  (Europe/Warsaw). Maciej approved the 1.2 `character:robert-johansson` data fix
  (`effective_date` 2016), which landed in `88fcb9c`; the manager then approved
  this rule with no exemption, and the exception-field narrowing, on
  2026-11-21.
- Chapter data is out of scope.

## Binding references

- `../design-principles.md` §2.5, rules (c) and (e)
- `../adrs/0031-design-principles-constitution.md`
- `../adrs/0028-backdated-updates.md`
- `../adrs/0026-calendar-precision-narrative-dates.md`
- `BOB-20261121-3KH6B2-preservation-supersedes.md`

## Scope

1. `src/narrative/model.ts`: the rule in the semantic validator.
2. `src/narrative/sentence-preservation.ts`: exception fields limited to
   `description` and `visual_description`.
3. Behaviour tests: `tests/unit/narrative-death-date-dating.test.ts`, and
   `tests/unit/sentence-preservation.test.ts` for the field list.
4. Docs: `docs/data-model-definition.md`, `docs/chapter-extraction.md`, the
   extraction skill, and the exceptions file's `about` text.
5. Mark BOB-20261121-3KH6B2 Done in a separate commit.

## Out of scope

- Chapter data and `docs/design-principles.md`.
- Deploy and a production tag.

## Acceptance criteria

- An update dated within its death period passes; a back-dated
  `effective_date` on or before the death passes.
- An update dated after the death period fails, including one whose
  `effective_date` is after it; partial dates compare as periods.
- An introduction is checked by its chapter date and fails outside its period.
- An exception row for `state` or `current_state` is rejected.
- `npm run narrative:validate` passes on master data.

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

Validator-only change, so no e2e and no CSP run (Maciej's rule, 2026-11-21).

Manual check: no UI change; `npm run narrative:validate` passes on master data.

## Documentation and generated artifacts

The docs in scope item 4. No generated artifact changes.

## Known risks or unresolved decisions

- An introduction can't carry `effective_date`, so a character introduced
  after its death must take `death_date` from a later back-dated update. No
  current data does this.

## Log

### 2026-11-21 (Europe/Warsaw)

- Created on master `88fcb9c` on local branch
  `bob-20261120-death-date-dating` in the `~/src/bobiverse-deathdate`
  worktree (fast-forwarded from `1cce5d4`).
- Before the 1.2 data fix, the only failing write was the 1.2
  `character:robert-johansson` update (death 2016, dated 2133-06-24); all 11
  current `death_date` writes now pass.
- One existing fixture (`narrative-effective-date.test.ts`, "accepts an
  effective_date equal to the chapter date") set a 2165-09 death dated
  2174-01; it now writes `current_state` instead, keeping what it tests.
- `narrative-two-ceilings.test.ts` 1.7 wrote a 2190-01 death dated 2190-02,
  the case this rule forbids; its death is now 2190-02, which keeps the test
  (hidden at the 2190-01 and 2185 soft ceilings, shown at 2190-02).
- Marked BOB-20261121-3KH6B2 Done in a separate commit.
- Approved by the manager and landed on master with the no-ff merge `607b55d`
  ("Merge death_date write-dating validator"). Done. Landed as `607b55d`.
