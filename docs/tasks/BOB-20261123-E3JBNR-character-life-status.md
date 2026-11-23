# BOB-20261123-E3JBNR: character life status events

Status: Ready
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
3. Projection: accumulate revealed `status_events` up to Read through;
   apply those whose `date` is known at the soft ceiling; current status is
   the latest remaining event. Remove `death_date` and `death_event_id` from
   `softCeilingProperties`. Replace the BOB-20261121-5A8W76 write-dating
   check with the ADR-0033 event-date and merged-list checks.
4. UI: in `src/components/ObjectInspector.tsx`, replace "Death date" /
   "Death event" with the current-status row from ADR-0033 §5 ("Died" /
   "Restored from backup"). No history on the card.
5. Docs and Extractor-facing guidance listed under Consumers, including a
   wording-only update to constitution §3.1 (`death_date` → status-event
   dates; same rule).
6. Tests for the validator, projection (including a die/restore cycle),
   migration of existing data, and the card labels.

## Out of scope

- Extractor-authored `restored_from_backup` events for Elmer in 2.34 and
  Hal in 2.39. That follow-up happens after this task lands (and, for Hal,
  after 2.31–2.40 has landed). Until then, those characters remain showing
  as dead after the migration.
- A `retired` kind, an authored `effective_chapter`, status history on the
  card, or a per-entity chronicle.
- Any constitution rule change.
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

- `src/narrative/model.ts` — `collectReferences` (`death_event_id`),
  `assertDeathDateWriteDating`, Gregorian date walk (`death_date`),
  `softCeilingProperties`
- `src/narrative/schema-diagnostics.ts` — character property allow-list
- `src/components/ObjectInspector.tsx` — "Death date" and "Death event"
  rows (the only UI consumer)

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
  `death_date` / `death_event_id` on `character:robert-johansson`
- `tests/unit/source-evidence-helper.test.ts` — quotes the structural
  reference list that names `death_event_id`
- `tests/python/test_extraction_check.py` — sample log line
  `"Error: death_date write is dated after the death"` used only to test
  excerpt selection; change it only if that string is confusing after the
  validator messages change

No e2e file currently asserts "Death date".

### Live docs and Extractor-facing guidance

- `docs/data-model-definition.md` — schema excerpts, character field table,
  death-date / death-event identity and write-dating rules, validator list
- `docs/technical-design.md` — `softCeilingProperties` list
- `docs/design-principles.md` §3.1 — `death_date` in the "do not count"
  list (wording only)
- `docs/chapter-extraction.md` — structural mention targets
  (`death_event_id`); write-dating paragraph
- `.codex/skills/extract-bobiverse-chapter/SKILL.md` — write-dating
  guidance for updates that set `death_date`
- `docs/adrs/0017-supplemental-mention-completeness.md` — structural
  reference list names `death_event_id` (update to `event_id` on a `died`
  event, in line with chapter-extraction.md)

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
