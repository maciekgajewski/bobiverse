# BOB-20261116-E87SYK: dated-state write rules

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-16

## Objective and user-visible outcome

Make the chapter-data write rules follow the constitution
(`../design-principles.md`, ADR-0031) for dated state, so that a non-linear
chapter can record an entity's state as of its own story date. This is
constitution §6 step 2's write-rule groundwork (T1 of the approved plan): §5
items 9 and 10, and the validator half of item 5. It unblocks book 2 chapters
such as 2.6, where Bill's state is dated 2171-04 and is read after his 1.60
state dated 2185-04.

- The sentence-preservation check treats each `state` / `current_state` write as
  a snapshot as of its story date (`effective_date ?? chapter date`). A write is
  compared only with the latest-read earlier write of the same property whose
  date is equal or overlapping (`compareNarrativeDates` returns `0` or `null`).
  When every earlier-read write is strictly earlier or strictly later, the write
  is not checked. `description` and `visual_description` stay `always`.
- An update's `effective_date` may be earlier than the date of the chapter that
  introduced the entity (rule (a): entities show from their earliest known story
  date). It must still be on or before the update's own chapter date.
- The schema's `state` / `current_state` text says "condition as of the write's
  effective date".

No reader-visible change: projection is unchanged (dated-state selection is a
later task).

## Authorization

- The manager relayed approval of the soft-ceiling plan on 2026-11-16 (Europe/
  Warsaw) and asked to start T1 now and send the commit for review.
- Book 1 chapter data changes are out of scope; they need Maciej's verbatim OK
  and are the Extractor's to propose.

## Binding references

- `../../AGENTS.md`
- `../design-principles.md` §3 rules (a), (e), (f); §5 items 5, 9, 10; §6 step 2
- `../adrs/0028-backdated-updates.md`, `../adrs/0031-design-principles-constitution.md`
- `../data-model-definition.md` §Updates, `../chapter-extraction.md`
  §Post-write validation

## Scope

1. `src/narrative/sentence-preservation.ts`: the `same-date` policy for `state`
   and `current_state` (replacing `when-not-later`), keeping each property's
   earlier writes in reading order and choosing the latest-read equal or
   overlapping one.
2. `src/narrative/model.ts`: remove the "is before … was introduced" check;
   keep "must be on or before the chapter date".
3. `data/schema/narrative-data-model.schema.json` and its listing in
   `docs/data-model-definition.md`: `state` and the character `description`
   wording; `docs/data-model-definition.md` §Updates and ADR-0028: backdating
   before the introduction is allowed.
4. `data/narrative/sentence-preservation-exceptions.json`: delete the three
   entries the new rule leaves unused (`character:bill` `current_state` at 1.42
   and 1.56, `location:ee-2` `state` at 1.56); `narrative:validate` reported
   exactly these three as excusing nothing.
5. `docs/chapter-extraction.md` §Post-write validation: one sentence on which
   earlier value a state write is compared with.
6. Unit tests in `tests/unit/sentence-preservation.test.ts` and
   `tests/unit/narrative-effective-date.test.ts`.

## Out of scope

- Projection: dated-state selection at the soft ceiling, Read through as the
  knowledge bound, entity existence from the earliest known date (later tasks).
- `data/narrative/chapters/**` and the existing state writes listed in
  constitution §5 item 11 (Extractor work).
- Updating constitution §5 itself.
- Push, merge, deploy, port 5173 and other worktrees.

## Acceptance criteria

1. A state write dated earlier than the earlier-read one (2171-04 after
   2185-04) is not checked; neither is a later-dated one.
2. A same-date state write that drops sentences fails; so does one with an
   overlapping date of different precision (`2185` and `2185-04`, both ways).
3. A state write is compared with the latest-read write of an equal or
   overlapping date, skipping later-read writes of other dates.
4. `description` and `visual_description` are checked whatever the dates.
5. `prepareNarrativeCorpus` accepts an `effective_date` before the entity's
   introduction and still rejects one after the update's chapter date.
6. `narrative:validate` passes with the three exceptions removed and reports no
   new violations.

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
# prettier on changed Markdown
```

No e2e: no UI change.

## Documentation and generated artifacts

The schema text and its listing in `docs/data-model-definition.md` change
together. No generated artifact is committed.

## Known risks or unresolved decisions

- Until projection selects dated state (later tasks), chapter view still shows
  the latest-read write, so at 2.6 it would show a 2171-04 state for Bill as his
  current state. Validation now accepts such writes; how they display changes
  with the projection task.
- Constitution §5 items 5, 9 and 10 still describe this work as open; updating
  that list is left to the manager.

## Log

### 2026-11-16 (Europe/Warsaw)

- Approved by the manager at `a735024` and landed on master with the no-ff merge
  `3be3086` ("Merge BOB-20261116-E87SYK: dated-state write rules"), which also
  ticked constitution §5 items 5, 9 and 10. Deployed to the LAN site. Done.
