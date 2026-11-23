# BOB-20261123-6E912S: ADR-0033 life-status follow-ups

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-23

## Objective and user-visible outcome

Close the two non-blocking follow-ups from the ADR-0033 implementation review:

1. The mechanical migration script drops writes that clear `death_date` (and
   `death_event_id`) to `null`, matching ADR-0033, instead of erroring.
2. Equal-date status events in the same chapter are ordered by the write's
   position in the chapter, then by array index, consistently in the validator
   and the projector.

No reader-visible change on current narrative data. No chapter JSON edits.

## Authorization

The Piotr Developer Manager assigned these two follow-ups after the ADR-0033
implementation landed, and confirmed they remain open after the Book 2
chapter-count fix landed on 2026-11-23. This file is the small follow-up
task; [BOB-20261123-E3JBNR](BOB-20261123-E3JBNR-character-life-status.md)
stays Done.

## Binding references

- `../adrs/0033-character-life-status.md` (§3 Migration, §4 Validator)
- `BOB-20261123-E3JBNR-character-life-status.md`
- `../../scripts/migrate_death_date_to_status_events.py`
- `../../src/narrative/model.ts`

## Scope

1. Align `scripts/migrate_death_date_to_status_events.py` with ADR-0033: a
   write that sets `death_date` or `death_event_id` to `null` drops those
   fields and does not add `status_events`. A `death_event_id` without a
   `death_date` key remains an error. Files that only had null-clearing
   writes must still be rewritten. Add tests.
2. Order equal-date status events within a chapter by write position
   (introducing, then updates, in array order), then by the event's index
   in that write. Keep the validator and projector consistent. Add a unit
   test with two writes for the same character in one chapter. Update the
   ADR text if it describes the old per-write array order.

## Out of scope

- Chapter data JSON, source text, Extractor restore authoring, and LAN
  deploy.
- Playwright e2e or CSP (no rendered-output change).
- New status-event kinds or schema fields.

## Acceptance criteria

- `death_date: null` (with or without `death_event_id`, including a null
  `death_event_id`) is dropped by the migrate script; no `status_events`
  entry is added; a chapter that only had such writes is still rewritten.
- A `death_event_id` present without a `death_date` key still errors.
- Two same-character writes in one chapter, with equal event dates, are
  accepted in chapter write order by the status-event checks and project
  the later write's event at that date. (The corpus still rejects two
  writes for one character in one chapter; the unit test exercises the
  status-event path directly.)
- Validator and projector use the same chapter-global write order.
- ADR-0033 describes write position, then array index, for same-chapter
  equal dates.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:manifest
npm run narrative:validate
npm run build
git diff --check
```

No e2e (no rendered-output change).

## Documentation and generated artifacts

Update `docs/adrs/0033-character-life-status.md` §4 if the equal-date order
wording changes, and §3 if null-clearing write-drop behaviour is specified.
The migrate script's `--prove --base cf219fb` only reproduces at the original
migration commit. No generated artifact changes.

## Known risks or unresolved decisions

None. Current narrative data has no null `death_date` writes and no
same-chapter two-write status sequences for one character; the follow-ups
close the review gaps and keep the script and ordering rules ready.

## Log

### 2026-11-23 (Europe/Warsaw)

- Created on branch `bob-20261123-life-status-followups` in worktree
  `~/src/bobiverse-lifestatus-followups`, off `origin/master` `fc47128`.
- Implemented both follow-ups. The migrate script drops null `death_date` /
  `death_event_id` clearing writes and still rewrites chapters that only had
  those writes. Equal-date events in one chapter are ordered by write
  position (introducing, then updates) then array index; ADR-0033 §4 wording
  updated. The corpus still rejects two writes for one character in one
  chapter, so the unit tests call `assertAccumulatedStatusEventsInChapter`
  and `projectedStatusEventFromChapterWrites`.
- Fast checks, 22:06 (Europe/Warsaw), logs in
  `~/lifestatus-followups-verify/`: `python3 scripts/tasks.py check`
  (125 task files, 35 ADRs), `format:check`, `lint` (0 errors; the
  pre-existing AboutDialog react-refresh warning only), `typecheck`,
  `data:test` (140 tests), `data:validate` (337 reconciled systems),
  `narrative:manifest` then `narrative:validate` (111 chapter source
  files, 32 candidates), `build`, and `git diff --check` passed.
  `npm test`: 66 files, 869 tests passed. No e2e (no rendered-output
  change).

- Review of `a81cc70` requested changes (one blocker, six nits). All fixed
  in this follow-up. `migrate_tree` writes a file only when a death field
  was removed, a died event was added, or a now-empty update was dropped,
  not when re-dumped JSON differs from Prettier. A scratch rerun on a copy
  of the current 111-chapter corpus in `~/lifestatus-followups-verify/scratch-corpus/`
  reported "migrated 0 death_date write(s) in 0 file(s)" with unchanged
  hashes; the worktree data was not modified. Fast checks, 22:22
  (Europe/Warsaw), logs in `~/lifestatus-followups-verify/` (`*-review.log`):
  `python3 scripts/tasks.py check` (125 task files, 35 ADRs),
  `format:check`, `lint` (same pre-existing AboutDialog warning),
  `typecheck`, `data:test` (144 tests), `data:validate` (337 reconciled
  systems), `narrative:manifest` then `narrative:validate` (111 chapters,
  32 candidates), `build`, and `git diff --check` passed. `npm test`: 66
  files, 870 tests passed. No e2e.
