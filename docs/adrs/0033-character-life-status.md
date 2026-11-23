# ADR-0033: character life status

Status: Accepted
Date: 2026-11-23

Accepted 2026-11-23 by Maciej ("Go with your recommendations on ADR-0033"),
relayed by the Piotr Developer Manager at 12:32 (Europe/Warsaw), as proposed at
`c585552` with these decisions:

1. Hal's 2.39 return is `restored_from_backup`. There is no new kind.
2. Drop `effective_chapter` entirely: the chapter file is the reveal key
   (ADR-0028).
3. Status-event dates do not count toward a chapter's latest date
   (constitution §3.1). No constitution change.
4. Drop `retired` until a real case exists. The only kinds are `died` and
   `restored_from_backup` (optional `backup_date`).
5. The card shows only the current status ("Died" / "Restored from backup"),
   with no history and no UI Designer spec.

## Context

A character now has at most one `death_date` (and optional `death_event_id`).
Those fields are soft-ceiling properties
(`docs/technical-design.md`, `softCeilingProperties` in `src/narrative/model.ts`):
the latest-dated write known at the soft ceiling wins, and a later write may set
`death_date` to `null` to clear it. A write that sets `death_date` must itself be
dated no later than the death (BOB-20261121-5A8W76), or the character would show
alive between the death and the write.

That model cannot record a life that continues after a death, or a second death
after a return, without forgetting the earlier event. Two cases already in the
narrative data, inspected on `origin/master` (`dadef16`) and read-only
`origin/chapters/book2-2.31-2.40` (`b57814c`), make this concrete:

- `character:elmer` is introduced in 1.60 (header date `2185-04`) with
  `death_date` `2185-04`. Chapter 2.34 (header date `2185-06`) updates
  `current_state` to describe a restore from backup into a new vessel, and does
  not clear `death_date`. Under the present schema he would still show as dead
  after 2.34.
- `character:hal` is introduced in 2.38 (header date `2188-05`) with
  `death_date` `2188-05`. Chapter 2.39 (header date `2188-08`) updates
  `current_state` to describe him as active again, and does not clear
  `death_date`. A further status change is expected in 2.53, which is not yet
  in the data, so the schema must allow a second cycle. Maciej decided that
  the 2.39 return is `restored_from_backup`.

`character:loki` is not such a case. He is introduced in 2.34 as a new
character with `parent_id` `character:khan`. That is the existing lineage
field: a replicant parent is the character state or backup from which the child
was copied (`docs/data-model-definition.md`, `docs/chapter-extraction.md`
§Lineage). Khan is not restored, and Loki is not a status event on Khan.

This ADR is the accepted design. Schema, data, validator, and UI changes are
the implementation task, which must land before chapter 2.53.

## Decision

Replace `death_date` and `death_event_id` with an ordered list of status
events on the character. Each event is `{ date, kind }`, with `kind` one of
`died` or `restored_from_backup`. `restored_from_backup` may carry an optional
`backup_date`. `died` may carry an optional `event_id`, which is the current
`death_event_id`.

The enclosing chapter file is the reveal key (ADR-0028). There is no authored
reveal-chapter field. When the projector accumulates events, it may remember
the source write's chapter internally for ordering and hard-ceiling filtering;
that chapter is not stored in the data.

### 1. Schema

A character introduction or update may include `status_events`, an array of
one or more events _that write reveals_. The write does not repeat earlier
events and cannot clear the list with `null`. Later corrections are made in
the revealing chapter.

```json
{
  "id": "character:elmer",
  "name": "Elmer",
  "status_events": [
    {
      "date": "2185-04",
      "kind": "died"
    }
  ]
}
```

A later update, in 2.34, adds the restore rather than rewriting 1.60:

```json
{
  "entity_id": "character:elmer",
  "status_events": [
    {
      "date": "2185-06",
      "kind": "restored_from_backup"
    }
  ]
}
```

`backup_date`, when present, is a `date` and is allowed only on
`restored_from_backup`. `event_id`, when present, is an `event_id` and is
allowed only on `died`.

The 2.34 dates above are the chapter header date already in the data; this
ADR does not invent a more precise restore or backup date. The Extractor
authors those dates from the chapter, as with any other fact, after the
implementation lands.

### 2. Projection

Status events are not a replacing soft-ceiling property. They accumulate from
every write at or before Read through (the hard ceiling). The view then keeps
only events whose `date` is known at the soft ceiling (`isKnownAtCeiling`,
rule (e)).

**Alive at the view** means: among those remaining events, the latest is not
`died`. A character with no remaining event, or whose latest event is
`restored_from_backup`, is alive. "Latest" is the last event in the list's
total order (section 4) among the events known at the soft ceiling.

That is the existing two-ceiling rule, applied to a list instead of a single
field: a later chapter cannot affect any view until it is inside Read through,
and a revealed event does not apply at a soft ceiling before its own date.
Description remains hard-ceiling only (rule (f)) and may mention a later fate
than the status row shows.

The event takes effect at its own `date` once its revealing chapter is inside
the hard ceiling. It does not take effect at the write's
`effective_date ?? chapter date`. That is a deliberate change from
BOB-20261121-5A8W76, whose write-dating rule existed only because `death_date`
became visible from the write's date. The new event date closes the same gap
directly.

### 3. Migration

Each existing write that sets a non-null `death_date` becomes one `died`
event on that same write:

- `date` is the current `death_date`;
- `event_id` is copied from a present, non-null `death_event_id`;
- `death_date` and `death_event_id` are then removed.

Writes that only clear `death_date` to `null` are dropped; a return to life
is a `restored_from_backup` event, not a cleared field. No current write on
master or on `origin/chapters/book2-2.31-2.40` clears `death_date`.

The migration is mechanical and incomplete for returns that today live only
in `current_state`. After it, `character:elmer` would still show as dead
after 2.34, and `character:hal` after 2.39, until the Extractor adds the
`restored_from_backup` events in those chapters. That is follow-up data work,
not part of the migration, and it must not rewrite earlier chapters. The
Extractor authors Elmer's 2.34 and Hal's 2.39 restore events after the
implementation lands (and, for Hal, after 2.31–2.40 has landed).

Master already has `died`-equivalent writes for
`character:robert-johansson` (1.2, with `event_id`
`event:bob-road-incident`), `character:dr-landers` (1.13),
`character:arthur` (1.47), `character:milo` (1.51), and the 1.60
introductions of `character:hannibal`, `character:tom`, `character:barney`,
`character:fred`, `character:elmer`, `character:jackson`, and
`character:hector`. The 2.31–2.40 branch adds writes for `character:homer`
(2.37), `character:bashful` (2.38), and `character:hal` (2.38).

### 4. Validator

`narrative:validate` checks each event on its write, then the merged list for
each character, in reading order.

On each event:

- `date` is a valid `date` and `kind` is `died` or `restored_from_backup`;
- `date` is on or before the enclosing chapter's header `date` (the same
  bound as ADR-0028 `effective_date`), so choosing the reveal chapter as the
  soft ceiling includes the event without changing constitution §3.1;
- `backup_date` appears only on `restored_from_backup`, and when present is a
  `date` on or before the event's `date`;
- `event_id` appears only on `died`, resolves to an already available event,
  and when that event has a `date`, the two canonical dates are identical
  (the current `death_date` / `death_event_id` rule).

On the merged list:

- it is totally ordered by `compareNarrativeMoments` on
  `{ date, sourceChapter: the revealing write's chapter }`, with authored
  order breaking ties at the same moment (including overlapping calendar
  ranges under rule (e));
- `restored_from_backup` is allowed only immediately after `died`;
- `died` is allowed when the list is empty so far, or immediately after
  `restored_from_backup`.

Repeated die/restore cycles are therefore valid. Hal's expected 2.53 event
can be another `died` after the 2.39 restore, when that chapter is authored.

A write may still carry `current_state` at its own date. The validator does
not couple that date to the status event. Extraction guidance should keep them
consistent when the state describes the same moment.

An `event_id` on a `died` event is a structural mention target, in the place
`death_event_id` occupies today.

### 5. UI

On current master, only the character Overview in
`src/components/ObjectInspector.tsx` reads `death_date` and
`death_event_id`, as "Death date" and "Death event". No other `src/` file
reads them. Genealogy uses `parent_id` only (`characterAncestors`). The
timeline and narrative activity come from chapter events, appearances and
mentions, not from `death_date`.

Replace those two Overview rows with one status row, as of the soft ceiling:

- no event known at the soft ceiling: omit the row (the character is alive);
- `died`: "Died" and the event date, plus a "Death event" link when
  `event_id` is present;
- `restored_from_backup`: "Restored from backup" and the event date.

The card does not list earlier status events. A per-entity chronicle is
already a later feature (constitution §2.6). There is no UI Designer spec.
The existing "as of Chapter X" / "as of …" line on current state is
unchanged. Status events do not become timeline or activity items; a death
that should appear there remains an ordinary `event:` entity, linked from
`event_id` when it qualifies under the event-significance rules.

`parent_id` and lineage are unchanged. Loki stays a child of Khan. A restore
never creates a new character id.

### 6. Loki is not a restore

A new replicant made from someone else's backup is a new character whose
`parent_id` is the character who was copied. That is already how 2.34
authors `character:loki` (`parent_id` `character:khan`). It is not a
`restored_from_backup` event on Khan, and it is not a `died` event on Khan.
`restored_from_backup` is only for the same character id continuing after a
`died` event, as with Elmer in 2.34 and Hal in 2.39.

## Consequences

- Die/restore cycles become first-class, spoiler-gated facts.
- `death_date` and `death_event_id` go away; BOB-20261121-5A8W76's
  write-dating rule is replaced by the event-date and merged-list checks
  above.
- `softCeilingProperties` loses `death_date` and `death_event_id`. Current
  status is derived from the accumulated, date-filtered list.
- Constitution §3.1 is unchanged: status-event dates do not count toward a
  chapter's latest date, the same as `death_date` today, because each event
  date is required to be on or before the revealing chapter's header date.
  When `death_date` is removed, §3.1's wording should name status-event dates
  instead; that is a wording update, not a rule change.
- Mechanical migration is not enough for Elmer 2.34 or Hal 2.39; the
  Extractor authors those `restored_from_backup` events after the
  implementation lands.
- Clearing a death with `null` is no longer a way to return a character to
  life.
- `retired` is not in the schema. If a real case appears, a later ADR can
  add it.

## Alternatives considered

- **Keep a single `death_date` and clear it with `null` on restore.** A later
  `death_date` could start a second cycle, and projection would already do
  the right thing at earlier soft ceilings. Rejected: the earlier death
  disappears, and there is no restore date or `backup_date`. The chronicle
  would have nothing to show.
- **Make each status change a narrative `event:` entity.** Rejected as the
  only mechanism. Most character deaths and restores fail the event
  significance tests (they are a personal status change). A major death can
  still be an `event:`, linked from `event_id`.
- **A fourth kind for any return to activity, or a generic `restored`.**
  Rejected: Maciej decided Hal's 2.39 return is `restored_from_backup`, with
  no new kind.
- **An authored `effective_chapter` on each event.** Rejected: ADR-0028
  already makes the chapter file the reveal key. The projector may remember
  the source chapter internally; it is not authored.
- **`retired` as a third kind.** Dropped until a real case exists.
- **Repeating the full list on every later write.** Rejected: it rewrites
  earlier facts and invites drift. Writes only add the events they reveal.
- **Listing status history on the card, or keeping the "Death date" label.**
  Rejected: the card shows only the current status, labelled "Died" or
  "Restored from backup", with no UI Designer spec. History waits for the
  chronicle.

## Follow-up

Implementation is [BOB-20261123-E3JBNR](../tasks/BOB-20261123-E3JBNR-character-life-status.md),
to land before chapter 2.53:

- `docs/data-model-definition.md`, `data/schema/narrative-data-model.schema.json`,
  `docs/chapter-extraction.md`, the extraction skill, and
  `docs/technical-design.md` (`softCeilingProperties` and the death-date
  write-dating paragraph);
- a wording-only update to constitution §3.1, replacing the `death_date`
  mention with status-event dates (same rule);
- `src/narrative/model.ts`, `src/narrative/schema-diagnostics.ts`,
  `src/components/ObjectInspector.tsx`, and the death-date validator tests;
- a mechanical migration of existing `death_date` writes, then Extractor
  authoring of the 2.34 Elmer and 2.39 Hal `restored_from_backup` events
  (the latter after 2.31–2.40 has landed).
