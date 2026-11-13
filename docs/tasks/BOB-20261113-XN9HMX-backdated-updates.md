# BOB-20261113-XN9HMX: backdated updates revealed by a later chapter

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-11-13

## Objective

Maciej, 2026-11-13 18:05 CET: "Use the real event date, but it should only be visible
if user set this chapter, or later one, as their read-through. Data model should
support it".

Chapter order decides what is revealed. `effective_date ?? chapter date` decides when
a revealed write shows in story time. In Date mode at date D, a revealed write whose
effective date is on or before D shows, even if its reveal chapter's own date is later
than D. The reveal chapter's date is never a filter for such a write; it is only the
default effective date. The first user is chapter 1.51, which reveals that Milo died
in 2165-08.

## Binding references

- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`,
  `../adrs/0013-chapter-order-for-narrative-moments.md`,
  `../adrs/0026-calendar-precision-narrative-dates.md`
- `../adrs/0028-backdated-updates.md` (new, Accepted)
- `../data-model-definition.md` §Reader progress and projection, §Updates

## Scope

1. Schema: optional `effective_date` on character, species, technology,
   organization and vessel updates. It is not an entity property.
2. Semantics: it must be on or before the chapter's date, which is checked when the
   corpus is prepared. It drives world projection, state-write ordering and update
   activity, so it adds an option to the date list only once its chapter is
   revealed.
3. Docs: ADR-0028; data-model definition (schema listing, projection, Updates); the
   technical design's projection paragraph.
4. Synthetic tests in `tests/unit/narrative-effective-date.test.ts`.
5. Chapter view latest known state (Q3 = b): Chapter mode is an explicit projection
   mode with no story-time cutoff, applied together to entity fields,
   introductions, events, activity, last-known locations, travel history and the
   map. Date mode keeps its cutoff. Chapter detail accepts only a Chapter-mode
   world.
6. An `effective_date` earlier than the entity's introduction is rejected.

## Out of scope

- Events, which already have `date`; location updates, which feed separate location,
  orbital and sighting paths; introductions. Backdating these is out of scope by
  decision (Q2 = a).
- Changing how competing writes are ordered: story date, then chapter, is kept
  (Q1). The extraction-time merge is the Extractor's; existing 1.22 and 1.42 data is
  a separate follow-up.
- Extraction-contract wording, and the 1.51 candidate itself.
- Python pipeline: `scripts/common.py` reads only location updates.

## Design choices (Maciej, relayed 2026-11-13 18:33 CET)

1. **Q1: story date wins** (Maciej, 19:12 CET: "Q1: story date wins, but extractor
   merges texts in the next write"). Ordering is unchanged. A later-read chapter
   that adds facts to a field merges the earlier text into its write at extraction
   time, so the story-date winner already carries everything. ADR-0028 is
   Accepted.
2. **Q2 = a.** No backdating of introductions or location updates now.
3. **Q3 = b.** Chapter view shows the latest known state from all revealed chapters,
   with no date cutoff. Nothing from an unread chapter shows anywhere. Date view
   still filters by `effective_date ?? chapter date` among revealed chapters.

## Acceptance criteria

1. A backdated write is hidden before its reveal chapter in both views and at every
   date option, and its date is not an option there.
2. At its reveal chapter, and later, it shows in Chapter mode, and in Date mode from
   its effective date onwards but not before.
3. An out-of-order pair projects by effective date in Date view. In Chapter view,
   read-through N shows the states of every chapter up to N, including an
   earlier-dated chapter read after a later-dated one, and conflicts follow story
   order. Chapter view at N never includes a change from a chapter after N, even
   one dated earlier, in world, date options, activity or chapter detail.
   Last-known location and travel history agree in both views.
4. An `effective_date` later than the chapter date, or a coarser one containing it, or
   earlier than the entity's introduction, is rejected. It is also rejected on events, on locations and when it is an update's
   only field.
5. Full validation passes, plus e2e chromium.

## Validation

`python3 scripts/tasks.py check`, `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run test`, `npm run data:test`, `npm run data:validate`,
`npm run build`, e2e chromium on a throwaway port-5183 config, `prettier --check` on
changed Markdown, `git diff --check`.

## Log

### 2026-11-13 (Europe/Warsaw)

- Created and moved to In progress on the manager's authorisation (critical path;
  the Extractor is paused), relaying Maciej's 18:05 requirement. Branch
  `bob-20261113-xn9hmx-backdated-updates`, from origin/master `baa4578`.
- Implemented scope 1–4:
  - `updateEffectiveDate()` in `src/narrative/model.ts` feeds world projection,
    `assertTemporalWrites` and update activity;
  - `effective_date` is excluded from copied properties;
  - the date-format check covers it;
  - preparation rejects a date later than the chapter's.
- Tests: 10 synthetic tests. Against the old projection, 5 fail: the reveal and date
  views, the out-of-order pair, the shadowing rule, and the two late-date
  rejections.
- No canonical chapter uses `effective_date` yet, so until 1.51 lands only the tests
  verify it.
- Validation (Node 22.23.1):
  - tasks check (71 files, 30 ADRs);
  - format:check, lint and typecheck;
  - Vitest 353/353 in 33 files;
  - Python data tests 90/90;
  - data:validate (277 systems);
  - build;
  - e2e chromium 31/31 on a throwaway port-5183 config (5173 left alone);
  - prettier `--check` on the changed Markdown, except
    `docs/data-model-definition.md`, whose date table already fails on master and
    is unchanged;
  - `git diff --check`.

  All passed.

- Merged origin/master `7d52c3f` (PR #19, chapters 1.44–1.50) into the branch as
  `8831bf0`, without rebasing; no conflicts.
- Recorded Maciej's answers (relayed 18:33 CET): Q2 = a, Q3 = b, Q1 pending with
  story-date ordering kept.
- Implemented Q3 = b in `src/narrative/model.ts`: a Chapter-mode world (no
  requested date) carries no story-time cutoff for world updates, introductions,
  last-known locations and travel history; location validation also checks the
  uncut projection. `projectNarrativeChapterDetail` accepts only a Chapter-mode
  world. Map, browser and `App.tsx` call sites were audited; they are already
  mode-aware.
- Added the introduction-date check on `effective_date`.
- Tests: updated the chapter-cutoff expectations in `tests/unit/narrative.test.ts`
  (each now also checks the Date-mode cutoff), flipped the out-of-order Chapter-view
  case and added no-leak, earlier-dated-later-chapter, location-agreement,
  chapter-detail-mode and introduction-date tests.
- Q1 data search over master and the held 1.51 and 1.52 candidates (read-only)
  found one 1.51/1.52 conflict (`technology:kudzu-gardens` `description`) and four
  on master (`character:riker` and `character:homer` `current_state` at 1.22;
  `character:bill` `current_state` and `technology:vr` `description` at 1.42). In
  each, chapter view at the later-read chapter now shows the earlier-read,
  later-dated value.
- Validation on the merged state (Node 22.23.1): tasks check (71 files, 30 ADRs);
  format:check, lint and typecheck; Vitest 360/360 in 33 files; Python data tests
  90/90; data:validate (277 systems); build; e2e chromium 31/31 on a throwaway
  port-5183 config (5173 left alone); prettier `--check` on the changed Markdown,
  except the date table already failing on master in
  `docs/data-model-definition.md`; `git diff --check`. All passed.
- Q1 decided (Maciej, 19:12 CET, relayed): story date wins and the Extractor merges
  texts in the next write. ADR-0028 is now Accepted; the "Q1 pending" markers are
  gone. The 1.51 v3 candidate drops the kudzu write; the 1.22 and 1.42 data stay
  for a separate follow-up.
- Chapter-view status line now reads "Latest known · Knowledge through Chapter N",
  because chapter view has no date cutoff; Date view keeps its wording.
- CI chromium failure in the lineage and travel-history e2e test: the test ran
  both viewports in one 30 s budget and timed out on the slower CI runner (it
  takes 16–19 s locally, the CI run is about 1.9 times slower, and it failed the
  same way on master `7d52c3f`). Split into one test per viewport with unchanged
  assertions.
