# BOB-20261116-TB1C66: two-ceiling projection

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-20

## Objective and user-visible outcome

Make `generateNarrativeWorld` follow the constitution's two ceilings
(`../design-principles.md`, ADR-0031): Read through is the hard ceiling, and the
world is shown as of a soft ceiling, the selected chapter's latest date (§3.1) in
chapter view or the selected date in date view. State shows as of the soft
ceiling; description and name follow Read through only; entities show from their
earliest known date. This is the projection part of constitution §5 items 2, 3, 5
and 6 and §6 step 2 (plan T3). Readers see chapter view change at non-linear
chapters: later-dated state and later-dated entities wait for their date.

## Authorization

- Plan T3 approved by the Piotr Developer Manager on 2026-11-16 (Europe/Warsaw),
  relaying the Captain's authorisation: after T1 and T2, start T3, the
  two-ceiling projection (constitution §5 item 5 projection part, §6 step 3 /
  plan T3).

## Binding references

- `../design-principles.md` §1, §2.3–§2.5, rules (a)–(g), §3.1, §5 items 1–6
- `../adrs/0031-design-principles-constitution.md`
- `../adrs/0028-backdated-updates.md`, `../adrs/0026-calendar-precision-narrative-dates.md`
- `src/narrative/ceiling.ts` (BOB-20261116-8HRK93)

## Scope

1. `generateNarrativeWorld(corpus, { readThrough, softCeiling, chapter? })`:
   - only chapters at or before `readThrough` in reading order;
   - `softCeilingProperties` (`state`, `current_state`, `colony_of`,
     `possible_colony_target`, `death_date`, `death_event_id`) take the
     latest-dated write known at the soft ceiling (`isKnownAtCeiling`, rule
     (e)), the later-read write winning ties and overlapping dates; writes
     dated after the soft ceiling are ignored, and with none the property is
     absent (rule (b));
   - every other property (name, aliases, description, visual_description,
     picture_id, structural fields such as kind, parent_location_id or
     orbital_order, and every event field) takes the latest-read write (rule
     (f));
   - an entity is in `entities` only from its earliest known date
     (`entityEarliestDates`, rule (a)); an event from its current date, an
     undated event from its revealing chapter's date (rule (c)); zero-state
     entities always; the ancestors of a shown location are shown too.
2. Compatibility form `generateNarrativeWorld(corpus, chapter, date)` for the
   current UI: the selected chapter is Read through, and the soft ceiling is its
   latest date (`chapterSoftCeiling`) or the requested meaningful date.
3. Exports for T4/T5: `chapterSoftCeiling`, `narrativeWorldCeilings`,
   `narrativeEntitiesBeforeExistence` (rule (g)), `narrativeStateAsOf`
   (`{ state: null, asOf }` when nothing is known, rule (b)),
   `softCeilingProperties`.
4. Last-known locations and travel histories use the world's two ceilings.
5. Location-constraint validation projects at every reachable soft ceiling with
   the same rules.

## Out of scope

- Wiring Read through into the app (T4), card labels and "no known state as of
  …" (T5), timeline and map labels (T6).
- Chapter data and schema.

## Acceptance criteria

- An earlier-dated write read later does not become current at a later soft
  ceiling; a later-dated write is ignored at an earlier soft ceiling; ties go to
  the later-read write.
- Description and name ignore the soft ceiling.
- An entity is hidden before its earliest known date and shown from it; an
  event uses its current date; an undated event its revealing chapter's date.
- Year and month facts count for their whole period.
- Nothing from a chapter after Read through appears in any form.
- Every canonical chapter view still resolves its chapter detail.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
git diff --check
```

Plus e2e on chromium, firefox and webkit (one worker, no retries) and the CSP
check, since chapter view output changes.

## Documentation and generated artifacts

`docs/technical-design.md` describes the projection API; the
`last_known_location` paragraph in `docs/data-model-definition.md` follows the
soft ceiling. The equivalence snapshot is regenerated (date-view descriptions
and names only).

## Known risks or unresolved decisions

- Property classification (decided): only the six `softCeilingProperties`
  follow the soft ceiling. Structural fields (`kind`, `parent_location_id`,
  `orbital_order`, `species_id`, `parent_id`) follow Read through, like name,
  picture and description, as do aliases and every event field; an entity that
  exists before its introduction's date (via a backdated update or an
  appearance) therefore keeps them. This was the manager's call on 2026-11-16,
  recorded in ADR-0031; Maciej may override it. In book 1 no structural field
  changes over story time. Moving a property between the sets is a one-line
  change.
- Rule (a) applies to chapter-introduced locations too, so at a non-linear
  chapter whole star systems revealed in a later-dated chapter leave the map
  (for example the `location:omicron2-eridani` system at 1.20). On the data at
  `c6db505` (unchanged from `adc77b1`), chapter view hides entities at 20 chapters: 1.20 (16), 1.22 (16),
  1.25 (19), 1.28 (14), 1.29 (21), 1.31–1.34 (25 each), 1.36 (29), 1.38 (31),
  1.40 (9), 1.41 (40), 1.42 (41), 1.43 (33), 1.45 (35), 1.46 (5) and 1.55–1.57
  (5 each).
- Canonical meaning pins for Riker and Homer at 1.22 and 1.23 now follow the soft
  ceiling (constitution §5 item 11 names this case).

## Follow-up for T4–T6

- T4: pass `{ readThrough: furthestChapterRead, softCeiling, chapter }` from
  `projectReaderProgress`; make `meaningfulNarrativeDateOptions`,
  `narrativeActivityThrough` and Date-view options use Read through; Date view
  may pass any date once the selector allows it. `map.ts` and `browser.ts` still
  filter activity by display date with the strict `isNarrativeDateEligible`;
  move them to the world's soft ceiling with `isKnownAtCeiling`.
- T5: label current state "as of chapter X" / "as of year Y" from
  `narrativeWorldCeilings`, show "no known state as of …" when
  `narrativeStateAsOf` returns `state: null`, and open cards for
  `narrativeEntitiesBeforeExistence` entities (rule (g)).
- T6: drop "Knowledge through" wording in the map badge and selector.
- T4/T5 (review nit 2): `world.activity` is cut at Read through but not at the
  soft ceiling, so activity can name entities that do not exist yet; cut it at
  the soft ceiling or gate it on existence.
- Later validator rule (review nit 1): a write carrying `death_date` should be
  dated no later than the `death_date` period, so the death is not hidden at its
  own date. No canonical case today.
- The constitution §5 list still describes items 2, 3, 5 and 6 as open.

## Log

### 2026-11-16 (Europe/Warsaw)

- Created on master `212b867` on local branch
  `bob-20261116-two-ceiling-projection` in the `~/src/bobiverse-t3` worktree.
- Committed `c58d167`; marked BOB-20261116-E87SYK Done (`97f94fb`); merged master
  `adc77b1` into the branch. Non-e2e validation passed: `tasks.py check`,
  format:check, lint, typecheck, test (61 files, 813 tests), data:test (93
  tests), data:validate, narrative:validate, build and `git diff --check`. E2e
  and the CSP check are still to run (chapter view output changes).

### 2026-11-17 (Europe/Warsaw)

- Approved by the manager at `c42af8e` after an independent review, confirming
  that structural fields follow Read through (recorded here and in ADR-0031).
- The Riker and Homer `current_state` meaning pins at 1.22 and 1.23
  (`tests/fixtures/narrative-meaning.json`, changed in `c58d167`) follow the soft
  ceiling, as constitution §5 item 11 requires: at 1.22 Riker shows 1.18's state
  and Homer 1.20's, at 1.23 Riker shows 1.19's and Homer 1.20's. The manager
  confirmed the change.
- Review nits: `worldCeilings` keeps its `display_date` fallback for hand-built
  worlds, with a comment explaining why `chapterLatestDate` would leak (nit 3);
  direct tests for `death_date`, `colony_of` and
  `narrativeEntitiesBeforeExistence` (nit 4); follow-ups for nits 1 and 2 above.
- Merged master `c6db505` (book 1 data fixes: 1.24 `four-asteroid-diversion`
  dated 2157-04, so the 1.24 soft ceiling is now 2157-04; 1.39 and 1.56) without
  conflicts or test changes; the hidden-entity chapters and counts are
  unchanged. Ticked constitution §5 items 2, 3 and 5, and the projection part of
  item 6.

### 2026-11-20 (Europe/Warsaw)

- Approved by the manager at `9cf63c2` (the location-constraint refactor and
  the dialog focus fix) and landed on master with the no-ff merge `1b1fdbd`
  ("Merge T3: two-ceiling narrative projection"). Done. The T4 follow-up is
  BOB-20261120-C3EY9W.
