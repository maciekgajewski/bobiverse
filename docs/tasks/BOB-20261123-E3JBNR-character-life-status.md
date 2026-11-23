# BOB-20261123-E3JBNR: character life status events

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-23

## Objective and user-visible outcome

Implement accepted [ADR-0033](../adrs/0033-character-life-status.md): replace
the single `death_date` / `death_event_id` with an ordered `status_events`
list (`died` | `restored_from_backup`, optional `backup_date` on a restore,
optional `event_id` on a death). Migrate existing death writes mechanically,
project current status from the accumulated list at the two ceilings, and
show only that current status on the character card.

User-visible outcome:

- A character who has died, and whose death is known at the soft ceiling,
  shows "Died" and the event date (plus a "Death event" link when `event_id`
  is present), instead of "Death date".
- After a revealed restore, the same card shows "Restored from backup" and
  the restore date at a soft ceiling on or after that date, and "Died" when
  the view is between the death and the restore.
- A character with no status event known at the soft ceiling has no status
  row.
- The card never lists earlier status events.

This must land before chapter 2.53.

## Authorization

Maciej accepted ADR-0033 on 2026-11-23 at 12:32 (Europe/Warsaw), verbatim
"Go with your recommendations on ADR-0033", relayed by the Piotr Developer
Manager, with the five decisions recorded in the ADR. The manager asked for
this implementation task on the same day, status Ready, deadline before
chapter 2.53.

Ready means the work is specified. Start it when the manager gives the go.
Do not merge master into the ADR branch as part of this file's creation;
chapters 2.31–2.40 are landing in parallel.

## Binding references

- `../adrs/0033-character-life-status.md`
- `../design-principles.md` §1–§3, especially §2.5, rules (c) and (e), and
  §3.1 (status-event dates do not count toward a chapter's latest date; wording
  update only)
- `../adrs/0028-backdated-updates.md` (the chapter file is the reveal key;
  event `date` is on or before the chapter header date)
- `../adrs/0031-design-principles-constitution.md`
- `../data-model-definition.md` (character fields, death-date write-dating)
- `../technical-design.md` (`softCeilingProperties`)
- `../chapter-extraction.md`
- `BOB-20261121-5A8W76-death-date-write-dating.md` (replaced write-dating
  rule)

## Scope

1. Schema and data model: remove `death_date` and `death_event_id` from
   character introductions and updates; add `status_events` as specified in
   ADR-0033. No `effective_chapter` field and no `retired` kind.
2. Mechanical migration of every write that sets a non-null `death_date` to
   a `died` event on that same write (`date` from `death_date`, `event_id`
   from a present non-null `death_event_id`). Drop the old fields. Include
   whatever such writes are on the implementation branch at the time
   (master today: 1.2, 1.13, 1.47, 1.51, 1.60; 2.31–2.40, once landed:
   2.37, 2.38).
3. Projection and references: accumulate revealed `status_events` up to
   Read through; filter by `date` at the soft ceiling; set the projected
   optional `status_event` to the latest remaining event (the field the
   card and equivalence snapshots read). Keep authored `status_events` off
   `softCeilingProperties` and `applyRevealedWrite`. Remove `death_date`
   and `death_event_id` from `softCeilingProperties`. Replace the
   BOB-20261121-5A8W76 write-dating check with the ADR-0033 event-date and
   merged-list checks. In `src/narrative/model.ts`, add `backup_date` to
   the Gregorian date walk (~1738–1742) and walk `status_events[].event_id`
   in `collectReferences` (~1172).
4. UI: in `src/components/ObjectInspector.tsx`, replace "Death date" /
   "Death event" with the current-status row from ADR-0033 §5 ("Died" /
   "Restored from backup"), reading the projected `status_event`. No
   history on the card.
5. Docs and Extractor-facing guidance listed under Consumers, including
   the wording-only §3.1 swap (`death_date` → status-event dates, rule
   unchanged). This ADR and Maciej's 12:32 (Europe/Warsaw) decision already
   authorise that swap; it is not a reserved constitution edit and must not
   leave a dangling `death_date` mention. ADR-0017's structural list is
   updated by an Amendment citing ADR-0033, not by silently editing the
   2026-07-29 Decision bullet. Update the same list in
   `docs/data-model-definition.md` (~1255–1256, "death events").
6. Tests for the validator, projection (including a die/restore cycle),
   migration of existing data, and the card labels.

## Out of scope

- Extractor-authored `restored_from_backup` events for Elmer in 2.34 and
  Hal in 2.39. That follow-up happens after this task lands (and, for Hal,
  after 2.31–2.40 has landed). Until then, those characters remain showing
  as dead after the migration.
- A `retired` kind, an authored `effective_chapter`, status history on the
  card, or a per-entity chronicle.
- Any constitution rule change. The wording-only §3.1 swap is in scope and
  already authorised; it is not a reserved constitution edit.
- Landing or merging chapters 2.31–2.40, a LAN deploy, or a production tag.

## Acceptance criteria

- The schema rejects `death_date`, `death_event_id`, `effective_chapter`,
  and `retired`. A write may only add the events it reveals.
- Every previously valid non-null `death_date` write on the branch has
  become a `died` event; `npm run narrative:validate` passes.
- A `restored_from_backup` is accepted only immediately after a `died`
  event; a second `died` after a restore is accepted; a restore without a
  preceding death, a `backup_date` after the restore date, or an event date
  after the revealing chapter's header date, is rejected.
- At a soft ceiling before a revealed death, the card has no status row; at
  or after the death and before a restore, it shows "Died"; at or after a
  revealed restore, it shows "Restored from backup". A death from a chapter
  after Read through never appears.
- `character:robert-johansson` still links to `event:bob-road-incident`
  from the "Died" row.
- Description may still mention a later fate than the status row (rule (f)).
- Loki remains a separate character with `parent_id` `character:khan`, not
  a status event on Khan.
- Constitution §3.1 still does not use status-event dates when computing a
  chapter's latest date.

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
git diff --check
```

The inspector label changes, so also run the full three-browser e2e and the
CSP check once before review (temporary Playwright configs; never port
5173).

## Manual browser checklist (for Maciej)

After this task has landed (mechanical migration only; Elmer and Hal are
still dead until the Extractor follow-up):

1. Set Read through to chapter 1.2. Open `character:robert-johansson`. The
   Overview should show "Died" and 2016, with a "Death event" link to
   `event:bob-road-incident`, and no "Death date" row.
2. Set Read through to chapter 1.1 and open the same character (or lower
   only the chapter/date soft ceiling if he is already known). There should
   be no status row: the 1.2 death is not yet revealed, or not yet known at
   that earlier soft ceiling, as applicable. Raise Read through to 1.2
   again, then in Date view pick a date before 2016 if one is offered: no
   "Died" row. Pick 2016 or later: "Died" returns.
3. Set Read through to chapter 1.60. Open `character:elmer`: "Died" and
   April 2185, and no death-event link. Open `character:khan`: no status
   row.
4. Confirm the current-state "as of Chapter …" / "as of …" line is
   unchanged, and that the card does not list a history of status events.

After the Extractor follow-up (Elmer 2.34 and Hal 2.39
`restored_from_backup` events; 2.31–2.40 landed):

5. Set Read through to 2.34. Open Elmer at chapter 2.34 (or a date on or
   after June 2185): "Restored from backup". In Date or chapter view, go
   back to April 2185 / chapter 1.60: "Died". The description may still
   mention the restore (rule (f)).
6. Set Read through to 2.39. Open `character:hal` at 2.39 / August 2188:
   "Restored from backup". At 2.38 / May 2188: "Died". Open
   `character:loki`: no status row; his parent is still Khan, and Khan is
   not marked restored.

## Documentation and generated artifacts

The live docs and schema in Consumers below. Equivalence snapshots will
refresh. No other generated artifact is expected. Do not rewrite historical
Done task files or the alternatives text in accepted ADRs.

## Consumers

Every `death_date` and `death_event_id` occurrence found on
`bob-20261123-life-status-adr` at `c585552` (and the same hits on master
`dadef16`). Update the live ones; leave historical records alone.

### Schema and chapter data (migrate)

- `data/schema/narrative-data-model.schema.json` — character and
  character_update properties, and the update `anyOf` required-field list
- `data/narrative/chapters/1/2.json` — `character:robert-johansson`
  (`death_event_id` `event:bob-road-incident`)
- `data/narrative/chapters/1/13.json` — `character:dr-landers`
- `data/narrative/chapters/1/47.json` — `character:arthur`
- `data/narrative/chapters/1/51.json` — `character:milo`
- `data/narrative/chapters/1/60.json` — introductions of
  `character:hannibal`, `character:tom`, `character:barney`,
  `character:fred`, `character:elmer`, `character:jackson`,
  `character:hector`
- After 2.31–2.40 lands: `data/narrative/chapters/2/37.json`
  (`character:homer`) and `data/narrative/chapters/2/38.json`
  (`character:bashful`, `character:hal`)

No hits in zero-state or other `data/` files besides the schema and those
chapter files.

### Source

- `src/narrative/model.ts` — `collectReferences` walks
  `status_events[].event_id` (replacing `death_event_id`); the Gregorian
  date walk includes `backup_date` and drops `death_date` (~1738–1742);
  `assertDeathDateWriteDating` is replaced; `softCeilingProperties` drops
  `death_date` and `death_event_id`; projection sets `status_event` and
  keeps authored `status_events` off `applyRevealedWrite`
- `src/narrative/schema-diagnostics.ts` — character property allow-list
- `src/components/ObjectInspector.tsx` — "Death date" and "Death event"
  rows become the current-status row, reading projected `status_event`
  (the only UI consumer)

### Tests

- `tests/unit/narrative-death-date-dating.test.ts` — replace with
  status-event validator tests
- `tests/unit/narrative-two-ceilings.test.ts` — hides a death written after
  the soft ceiling; `softCeilingProperties` assertion
- `tests/unit/narrative-effective-date.test.ts` — back-dated death
  projection
- `tests/unit/narrative.test.ts` — `death_date` / `death_event_id` fixtures
- `tests/unit/narrative-meaning.test.ts` and
  `tests/fixtures/narrative-meaning.json` — meaning-regression field names
- `tests/unit/__snapshots__/narrative-equivalence.test.ts.snap` — projected
  `status_event` on `character:robert-johansson` (today `death_date` /
  `death_event_id`)
- `tests/unit/source-evidence-helper.test.ts` — quotes the structural
  reference list that names `death_event_id`
- `tests/python/test_extraction_check.py` — sample log line
  `"Error: death_date write is dated after the death"` used only to test
  excerpt selection; change it only if that string is confusing after the
  validator messages change

No e2e file currently asserts "Death date".

### Live docs and Extractor-facing guidance

- `docs/data-model-definition.md` — schema excerpts, character field table,
  death-date / death-event identity and write-dating rules (~1927–1934),
  validator list, and the supplemental-mention structural list
  (~1255–1256, "death events")
- `docs/technical-design.md` — `softCeilingProperties` list only (~852)
- `docs/design-principles.md` §3.1 — wording-only swap already authorised
  by ADR-0033 and Maciej's 12:32 (Europe/Warsaw) decision: replace
  `death_date` in the "do not count" list with status-event dates; not a
  reserved constitution edit; do not leave a dangling `death_date`
  mention
- `docs/chapter-extraction.md` — structural mention targets
  (`death_event_id`); write-dating paragraph
- `.codex/skills/extract-bobiverse-chapter/SKILL.md` — write-dating
  guidance for updates that set `death_date`
- `docs/adrs/0017-supplemental-mention-completeness.md` — add an Amendment
  citing ADR-0033 so the structural list names `event_id` on a `died`
  event; do not silently edit the 2026-07-29 Decision bullet
  (`docs/adrs/README.md`)

### Tooling that has no direct field reference

`scripts/extraction_check.py`, `scripts/extraction_preflight.py`,
`scripts/chapter_promotion.py`, and `scripts/validate_data.py` do not
mention `death_date` or `death_event_id`. They will pick up the new
validator through `narrative:validate`. `docs/chapter-extraction-checklists.md`
has no hits.

### Historical records (do not rewrite)

- `docs/adrs/0028-backdated-updates.md` — alternatives text mentions
  `death_date`
- Done tasks that describe the old fields:
  `docs/tasks/BOB-20261121-5A8W76-death-date-write-dating.md`,
  `docs/tasks/BOB-20261116-TB1C66-two-ceiling-projection.md`,
  `docs/tasks/BOB-20261120-73F83F-as-of-cards.md`,
  `docs/tasks/BOB-20261121-ZV3449-extraction-check-command.md`,
  `docs/tasks/BOB-008-codex-assisted-chapter-extraction-pilot.md`,
  `docs/tasks/BOB-019-correct-chapter-1-2-names-and-state.md`,
  `docs/tasks/BOB-024-significant-narrative-event-authoring.md`,
  `docs/tasks/BOB-038-supplemental-mention-completeness.md`

## Known risks or unresolved decisions

- Until the Extractor follow-up, Elmer after 2.34 and Hal after 2.39 will
  still show as dead. That is expected and should be called out in the
  review, not treated as a bug in this task.
- Implementation may land before or after 2.31–2.40. Migrate whatever
  `death_date` writes are on the branch at the time; do not block on that
  landing, and do not invent restore events in this task.
- A write can still date `current_state` independently of a status event.
  Extraction guidance should keep them consistent; the validator does not
  couple the two dates.
- Card label wording follows ADR-0033; there is no UI Designer spec.

## Log

### 2026-11-23 (Europe/Warsaw)

- Created on branch `bob-20261123-life-status-adr` in
  `~/src/bobiverse-lifestatus`, alongside the Accepted text of ADR-0033,
  after Maciej's 12:32 decision.
- Independent review APPROVED `741be4b` with six nits; all six fixed in
  the ADR and this task (docs only, master not merged).
- Implemented on branch `bob-20261123-life-status` from `origin/master`
  `cf219fb`, worktree `~/src/bobiverse-lifestatus-impl`, after the manager
  relayed "Go ahead with E3JBNR on its own branch". 2.31–2.40 had already
  landed, so the mechanical migration includes 2.37 and 2.38. Elmer 2.34
  and Hal 2.39 restore events were not authored.
- Status-event `date` (and restore `backup_date`) are checked with
  `isKnownAtCeiling` so a year-dated event is known throughout that year
  (rule (e)). That accepts the existing 1.13 write (`date` 2133, chapter
  header 2133-08-17), which `isNarrativeDateEligible` would reject.
- No new e2e specs. Temporary Playwright configs used ports 4211 and 4210,
  then were deleted.
- Review of `5155f22` requested changes (one blocker): the merged-list
  check now requires `compareNarrativeDates` to be non-null and ≤ 0, and
  projection takes the longest known prefix (tests include the 2185-06 /
  2185 repro). The `test_extraction_check.py` sample log line now uses a
  current validator message, and `migrate_record` raises if a write has
  only `death_event_id`. Optional Date-view stepper stops were skipped to
  keep the review-fix scope small.

## Validation results

Full run on this branch, 2026-11-23, worktree
`~/src/bobiverse-lifestatus-impl`, base `cf219fb`.

- `python3 scripts/tasks.py check`, `format:check`, `lint` (0 errors; the
  pre-existing AboutDialog react-refresh warning only), `typecheck`,
  `data:test` (134 tests), `data:validate` (337 reconciled systems),
  `narrative:manifest` then `narrative:validate` (101 chapter source
  files, 27 candidates), `build`, `git diff --check`: pass.
- `npm test`: 66 files, 864 tests passed.
- Playwright, one worker, no retries, temporary configs on ports 4211
  (e2e) and 4210 (CSP), never 5173: Chromium 95 passed, 4 skipped;
  Firefox 95 passed, 4 skipped; WebKit 96 passed, 3 skipped. CSP suite:
  3 passed. Temporary configs deleted afterwards.
- Migration proof
  (`scripts/migrate_death_date_to_status_events.py --prove --base cf219fb`):
  7 chapter files, 14 old non-null `death_date` writes and 14 `died`
  events, 1:1 mapping, no other chapter-data meaning changes. Files:
  `1/2.json`, `1/13.json`, `1/47.json`, `1/51.json`, `1/60.json`,
  `2/37.json`, `2/38.json`.

Review fix on the same branch, 2026-11-23, after `5155f22`:

- Fast checks: `python3 scripts/tasks.py check`, `format:check`, `lint`
  (same pre-existing AboutDialog warning), `typecheck`, `data:test`
  (136 tests), `data:validate`, `narrative:manifest` then
  `narrative:validate` (101 chapters, 27 candidates), `build`,
  `git diff --check`: pass. `npm test`: 66 files, 867 tests passed.
- Playwright, one worker, no retries, temporary configs on ports 4211
  and 4210, never 5173: Chromium 95 passed, 4 skipped; Firefox 95
  passed, 4 skipped; WebKit 96 passed, 3 skipped. CSP suite: 3 passed.
  Temporary configs deleted afterwards.
- Migration proof (`--prove --base cf219fb`): still 7 files, 14=14,
  PROOF OK.
