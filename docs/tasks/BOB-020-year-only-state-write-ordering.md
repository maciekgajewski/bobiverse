# BOB-020: year-only state-write ordering

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-26

## Objective

Implement ADR-0009 so competing state-property writes with the same year-only date use
canonical chapter order, while explicit indices remain authoritative and mixed date
precision remains invalid.

## User-visible outcome

A later chapter can add newly revealed durable information to an existing entity
property in the same calendar year without inventing date indices. Story-time
projection remains deterministic and spoiler visibility remains reader-order guarded.

## Binding references

- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0009-year-only-state-write-chapter-order.md`
- `../technical-design.md`, Section 12
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## Decisions

- State writes are compared as `(effective date, source chapter)` moments.
- Different years use numeric year order.
- Same-year indexed dates use their numeric indices; an equal index is still a tie.
- Same-year year-only dates use canonical numeric chapter order.
- Mixed indexed and year-only precision in the same year remains incomparable.
- The fallback does not alter generic date, event-occurrence, activity, or display-date
  ordering.

## In scope

- Add one shared state-write moment comparator to the narrative model.
- Use it in cross-chapter temporal-write validation and projected property
  replacement.
- Preserve the existing date-only comparator for all non-state consumers.
- Add redacted tests for year-only chapter ordering, explicit indexed ordering, equal
  indexed rejection, and mixed-precision rejection.
- Update the integrated technical design, data-model definition, and extraction
  reconciliation instructions.
- Rebuild and validate the temporary chapter 1.4 candidate with the reviewed FAITH
  description update.

## Out of scope

- Changing the narrative date schema or its visible formatting.
- Treating chapter order as chronology for events, appearances, activity, or arbitrary
  requested display dates.
- Making mixed indexed and year-only values comparable.
- Editing or promoting canonical chapter 1.4.
- Retrospectively changing existing canonical chapter dates.

## Acceptance criteria

1. Two competing state writes with the same year-only date validate when their source
   chapters differ, and projection selects the later chapter's eligible value.
2. Differently indexed same-year writes retain explicit index order even when it
   differs from chapter order.
3. Equal indexed writes remain invalid.
4. Mixed indexed and year-only writes in one year remain invalid.
5. Different-year behavior and the generic `compareNarrativeDates` partial order do
   not change.
6. Reader visibility still limits candidate writes before story-time projection.
7. Directly affected ADR, technical-design, data-model, task-index, and extraction
   instructions agree.
8. The revised temporary chapter 1.4 candidate validates without changing canonical
   narrative data.

## Validation commands

```bash
./node_modules/.bin/vitest run tests/unit/narrative.test.ts
npm run narrative:validate
npm run narrative:generate -- --output /tmp/bobiverse-bob-020-world.json
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

## Validation status

All documented validation commands passed on 2026-07-26. The focused narrative suite
passed 21 tests; the full suite passed 99 tests across 20 files. The revised temporary
chapter 1.4 corpus validated with four chapter sources, and its generated projection
preserved FAITH's prior reviewed description while adding the newly revealed policy.
The production build retained its pre-existing advisory warning about a JavaScript
chunk larger than 500 kB.

ADR-0013 and BOB-027 subsequently promote this task's narrative-moment comparator
semantics to appearances, dated events, and generated activity. Indexed ties,
mixed-precision incomparability, and date-only display controls retain the boundaries
established here.

## Risks and cautions

- Reusing the generic date comparator would lose the source chapter required for the
  fallback and could accidentally change Date-mode behavior.
- Applying chapter order to indexed ties would override explicitly authored story
  chronology.
- Applying the fallback to activity or event dates would broaden this decision beyond
  state-property projection.
- Canonical chapter 1.4 remains review-only until the Captain separately approves the
  exact validated candidate.
