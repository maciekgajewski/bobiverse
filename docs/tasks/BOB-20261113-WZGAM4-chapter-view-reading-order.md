# BOB-20261113-WZGAM4: chapter view uses the last chapter read for competing writes

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-11-13

## Objective

Close the shadowing gap left by ADR-0028. With Q3 = b and the Q1 answer ("story
date wins"), a later-read chapter whose write has an earlier story date lost to an
earlier-read, later-dated write in chapter view. Maciej decided how to close it and
how texts are merged.

## Approvals (Maciej, relayed by the manager, 2026-11-13)

- 19:59 CET: "Gap: (c) chapter view uses last chapter read, date view keeps story
  date".
- 20:01 CET: "Merge: (a) keep full merged texts".

## Binding references

- `../adrs/0028-backdated-updates.md` (Accepted; amended here)
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`,
  `../adrs/0013-chapter-order-for-narrative-moments.md`
- `../chapter-extraction.md` §Reading order and story dates (D2)
- `BOB-20261113-XN9HMX-backdated-updates.md`

## Scope

1. Projection (`src/narrative/model.ts`): in Chapter mode (no requested date),
   competing writes to one entity property are ordered by reading order, so the
   latest-read chapter wins; writes within one chapter keep story-date order. Date
   mode keeps story-date order, then chapter. The same mode mechanism as
   XN9HMX covers entity fields, introductions and location writes (so the map and
   inspectors agree) and the uncut location-constraint check.
2. Docs: ADR-0028 records decisions (c) and (a) verbatim, replaces the Q1 wording
   for chapter view, notes the accepted Date-view limitation and fixes the uneven
   wrap in its Date-view bullet; `chapter-extraction.md` closes D2;
   `data-model-definition.md` and `technical-design.md` projection paragraphs match.
3. Synthetic tests in `tests/unit/narrative-effective-date.test.ts` for both views.

## Out of scope

- Any canonical data change, including the 1.22 `character:riker` and
  `character:homer` `current_state` writes; that needs its own task and the
  Captain's approval of the exact change.
- Last-known locations and travel history, which are derived from appearances and
  keep story-date order.
- Extraction tooling.

## Known, accepted limitation

Because merged writes carry full texts (decision (a)), Date view may show a fact
early, before the story date it belongs to.

## Acceptance criteria

1. In chapter view, a later-read chapter's write beats an earlier-read write with a
   later story date, for character fields and for location fields.
2. In Date view, story-date order holds for the same writes at every date option.
3. Nothing else in the effective-date suite changes.
4. Full validation passes, plus e2e chromium.

## Validation

`python3 scripts/tasks.py check`, `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run test`, `npm run data:test`, `npm run data:validate`,
`npm run build`, e2e chromium on a throwaway port-5185 config, `prettier --check` on
changed Markdown, `git diff --check`.

## Log

### 2026-11-13 (Europe/Warsaw)

- Created on the manager's relay of decision (c), from origin/master `ed5fc0f`.
  Branch `bob-20261113-wzgam4-chapter-view-reading-order`.
- Recorded decision (a), relayed at 20:01 CET.
- Implemented scope 1: `applyProperties` takes a write order; Chapter mode uses
  reading order (`compareChapter`, then the existing moment order within one
  chapter), Date mode keeps story order. `generateNarrativeWorld` and the uncut
  pass of `assertProjectedLocationConstraints` use it. Last-known locations, travel
  history and activity are unchanged.
- Tests: three new tests in `narrative-effective-date.test.ts` (chapter view,
  date view, locations in both views); the old story-order chapter-view test is
  replaced. Two of the new tests fail against the old projection. Three
  expectations in `narrative.test.ts` encoded story order in chapter view and are
  flipped, each now also checking Date view. A non-chronological location-kind
  fixture is now rejected, because chapter view would leave a survey colour on a
  locale; the test asserts that and adds a valid variant.
- Canonical impact (chapter-mode worlds at every read point, old against new, on
  master and on master plus the 1.51–1.53 candidates): only `character:riker` and
  `character:homer` `current_state` (1.22 over 1.21, read points 1.22–1.23),
  `character:bill` `current_state` (1.42 over 1.41, read points 1.42–1.44) and
  `technology:vr` `description` (1.42 over 1.40, read points 1.42 onward) change.
  Data validation still passes.
- 1.22 analysis (no data change here): under (c) the mention-only riker and homer
  writes in 1.22 now win in chapter view at read points 1.22 and 1.23, replacing
  1.21's later state with an older one. Dropping them is still recommended, in a
  separate task with the Captain's approval of the exact change.
- Validation (Node 22.23.1): tasks check (72 files, 30 ADRs); format:check, lint
  and typecheck; Vitest 362/362 in 33 files; Python data tests 90/90;
  data:validate (277 systems); build; e2e chromium 32/32 on a throwaway port-5185
  config (5173 left alone); prettier `--check` on the changed Markdown, except the
  date table already failing on master in `docs/data-model-definition.md`;
  `git diff --check`. All passed.
- Merged origin/master `916470b` (PR #22, chapters 1.51–1.53) with a merge
  commit, without rebasing; no conflicts. With 1.51–1.53 canonical, the same four
  pairs flip and no others; #22's meaning-regression facts and Milo tests pass
  with both the old and the new projection.
- Review nits from #23: the four canonical flips are pinned by IDs, fields and
  chapter refs in `tests/unit/narrative-chapter-view-flips.test.ts` (all four
  fail against the old projection); the first flipped `narrative.test.ts` case also
  checks Date view at 2200.2; a comparator test pins story-date order between
  writes from one chapter (`compareWriteMoments` is exported for it); the ADR-0028
  "Story time" bullet is re-wrapped; the D2 pointer to BOB-20261112-1TWD9T now says
  it records the options considered.
