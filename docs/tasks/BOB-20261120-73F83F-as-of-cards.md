# BOB-20261120-73F83F: cards as of the soft ceiling

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-20

## Objective and user-visible outcome

Make entity cards follow the constitution's soft ceiling (§2.5, rules (b) and
(g), §5 item 7, §6 step 3; plan T5). A card's current state is shown as of the
soft ceiling and says so ("as of Chapter X" in chapter view, "as of" the selected
date in Date view); when nothing is known at the soft ceiling it reads "No known
state" with the same line. The card of an entity read but not existing yet at
the soft ceiling still opens, with its description, picture and "No known state",
never anything past Read through. In chapter view, browser recency follows story
time, so an item's latest activity is the latest in story time at the soft
ceiling.

## Authorization

- The Piotr Developer Manager relayed approval on 2026-11-20 (Europe/Warsaw)
  to proceed with T5 under the approved constitution plan, after T4
  (BOB-20261120-C3EY9W) and the scene Suspense task (BOB-20261120-Y9W13K)
  landed. The manager also decided that chapter-view recent activity is ordered
  by story date with reading order as the tie-break, folded into T5.

## Binding references

- `../design-principles.md` §2.5, rules (b), (c) and (g), §5 item 7, §6 step 3
- `../adrs/0031-design-principles-constitution.md`
- `BOB-20261116-TB1C66-two-ceiling-projection.md` (follow-up for T5)
- `BOB-20261120-C3EY9W-read-through-knowledge.md` (chapter-view recency risk)

## Scope

1. `narrativeSoftCeilingLabel(world)` (`src/narrative/model.ts`): "Chapter X"
   for a chapter-view world (the selected chapter, not its latest date, §3.1),
   the formatted soft ceiling in Date view, null for the zero state and
   hand-built worlds.
2. The inspector's "Current state" row for characters, locations,
   organizations and vessels shows the state with a muted "as of …" line, or
   "No known state" with it (rule (b)). Worlds without ceilings (the pre-book
   zero state, hand-built test worlds) keep the bare state row.
3. Rule (g): `narrativeItemBeforeExistence(world, id)`
   (`src/narrative/browser.ts`) gives the card item of an entity in
   `narrativeEntitiesBeforeExistence`. Such a selection stays eligible in the
   app (`isSelectionEligibleInProjection`), so the card stays open when the
   soft ceiling moves before its earliest date and survives history restore;
   card links (relationships and inline links in entity and chapter cards)
   reach it; its header picture resolves. It stays out of the browser, map,
   search and activity.
4. Chapter-view recency: `latestActivity` and item ordering compare story
   dates with `compareNarrativeMoments` (reading order breaks ties and
   overlapping dates); undated activity takes its source chapter's date
   (`narrativeActivityStoryDate`, rule (c)).

## Out of scope

- T6: the map badge and selector "Knowledge through" wording.
- The `death_date` write-dating validator (T3 review nit 1).
- The recency line's "chronologically unplaced" wording for undated activity.

## Acceptance criteria

- A card's current state names the selected chapter in chapter view and the
  selected date in Date view.
- With no state known at the soft ceiling, the card shows "No known state" and
  the same "as of …" line.
- A card selected at a later soft ceiling stays open, with description and "No
  known state", when the view moves before the entity's earliest date; it
  never resolves an entity past Read through.
- In chapter view an item's latest activity and the list order follow story
  date, then reading order.

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
check, since what cards show changes.

## Documentation and generated artifacts

`docs/technical-design.md` (cards before existence, the as-of label,
chapter-view recency), `docs/design/phase-2-desktop-ui.md` (inspector
sections, chapter-mode ordering) and constitution §5 item 7.

## Known risks or unresolved decisions

- Wording and placement follow the constitution and the existing "Last seen"
  context line; no UI Designer spec exists. "as of" uses the app's date format,
  so a month-precision Date-view date reads "as of March 2165" rather than "as
  of year Y".
- Rule (b) is applied literally: every character, location, organization and
  vessel card shows the row, so cards with no state ever written now read "No
  known state as of …".
- Links to entities that do not exist yet at the soft ceiling are now live
  buttons in cards (previously plain fallback text); they open the rule (g)
  card.

## Log

### 2026-11-20 (Europe/Warsaw)

- Created on master `fb01f93` on local branch `bob-20261120-as-of-cards` in
  the `~/src/bobiverse-t5` worktree.
- Marked BOB-20261120-C3EY9W and BOB-20261120-Y9W13K Done (`48a1c73`);
  implemented in `290dc9b`. A first full run at `290dc9b` passed every
  non-e2e check and e2e on chromium and firefox; webkit was stopped part-way to
  free the e2e ports for the book 2 landing.
- Merged master `62828f6` (book 2 chapters 2.1–2.10) without conflicts in
  `8ceb250`; no test or code changes were needed. Full validation on
  `8ceb250` passed: `tasks.py check`, format:check, lint, typecheck, test
  (64 files, 835 tests), data:test, data:validate, narrative:validate, build
  and `git diff --check`; e2e with one worker and no retries on chromium (95
  passed, 4 skipped), firefox (95 passed, 4 skipped) and webkit (96 passed, 3
  skipped); the CSP check (3 passed).
- Awaiting manager review.
