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
- `../adrs/0028-backdated-updates.md` (new, Proposed)
- `../data-model-definition.md` §Reader progress and projection, §Updates

## Scope

1. Schema: optional `effective_date` on character, species, technology,
   organization and vessel updates. It is not an entity property.
2. Semantics: it must be on or before the chapter's date, which is checked when the
   corpus is prepared. It drives world projection, state-write ordering and update
   activity, so it adds an option to the date list only once its chapter is
   revealed.
3. Docs: ADR-0028; data-model definition (schema listing, projection, Updates); one
   line in the technical design.
4. Synthetic tests in `tests/unit/narrative-effective-date.test.ts`.

## Out of scope

- Events, which already have `date`; location updates, which feed separate location,
  orbital and sighting paths; introductions.
- Extraction-contract wording, and the 1.51 candidate itself.
- Python pipeline: `scripts/common.py` reads only location updates.

## Open design choices (for Maciej)

1. **Shadowing.** Writes are ordered by story time, so a later-dated write of the same
   property from an earlier chapter still wins after its date over a backdated write.
   This is implemented, and a test pins it.
2. **Introductions and location updates** have no effective date yet.
3. **A flashback chapter's view** shows the world at that chapter's date, as before.

## Acceptance criteria

1. A backdated write is hidden before its reveal chapter in both views and at every
   date option, and its date is not an option there.
2. At its reveal chapter, and later, it shows in Chapter mode, and in Date mode from
   its effective date onwards but not before.
3. An out-of-order pair projects by effective date in both views.
4. An `effective_date` later than the chapter date, or a coarser one containing it, is
   rejected. It is also rejected on events, on locations and when it is an update's
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
