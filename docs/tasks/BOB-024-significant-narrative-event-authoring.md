# BOB-024: significant narrative event authoring

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-27

## Objective

Reserve canonical `event:` entities for major, memorable turning points whose
consequences shape the fate of many beings, while preserving foundational inciting
incidents whose long causal chain produces that scale of consequence.

## User-visible outcome

The event browser contains consequential story landmarks rather than every scene,
conversation, exercise, selection process, convention, accident, or local clash.
Important source facts that do not meet the event threshold remain available through
chapter summaries and appropriate character, technology, organization, or location
records.

## Binding references

- `../technical-design.md`, Sections 12 and 13
- `../implementation-plan.md`, Phases 2 and 4
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0007-additional-narrative-entity-types.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

This is an editorial-authoring restriction within the existing event schema. It does
not remove the event entity type, alter field ownership, change projection or
activity semantics, or create a new data authority, so it does not require an ADR.

## Decisions

- A canonical event is a major, memorable turning point in the book timeline whose
  durable consequences shape the fate of many beings, not only the principal
  characters.
- Qualifying examples include battles, first contact, consequential discoveries or
  technological breakthroughs, revolutions, and natural or artificial disasters.
- A foundational inciting incident may qualify when its immediate scale is personal
  but its long causal chain produces series-wide consequences affecting many beings.
- `event:bob-road-incident` is retained under that foundational-inciting-incident
  exception. Its reader-facing description remains spoiler-safe at its introduction
  boundary.
- Conversations, confrontations, conventions, routine operations, training,
  selection processes, personal realizations, isolated attacks, accidents, and
  temporary setbacks do not become events unless their lasting consequence and scale
  meet the threshold.
- Blind Pass 1 still captures every source-supported event claim. Pass 2 applies the
  significance gate and classifies rejected event claims as `not-modeled`, preserving
  useful facts in the chapter summary or an appropriate entity description or state.
- The retroactive audit retains `event:bob-road-incident` and removes
  `event:the-vortex`, `event:replicant-candidate-selection`, and
  `event:project-complex-raid`.

## In scope

- Add the event-significance gate and foundational-inciting-incident exception to
  the repository-local extraction skill.
- Keep named project exceptions in a Pass-2-only skill reference that is excluded
  from the blind Pass 1 context.
- Add Pass 1 and Pass 2 handling guidance to the claim-ledger reference.
- Document the same rule in `docs/chapter-extraction.md`.
- Remove the three rejected canonical events and every later update or reference to
  them from chapters `1.1`, `1.2`, `1.6`, `1.8`, and `1.10`.
- Preserve Robert Johansson's road-incident event, `death_event_id`, and important
  Chapter `1.2` event mention.
- Preserve useful rejected-event facts in existing chapter summaries and durable
  character or technology state where already represented.
- Update focused regression coverage for the retained exception and removed events.
- Rebuild and validate the canonical corpus through Chapter `1.10`.
- Rebuild the review-only Chapter `1.11` candidate against the remediated prior state
  and retain the Captain-directed omission of a separate Old Handeltown event.
- Forward-test the revised skill in a fresh Terra Medium context and obtain an
  independent closure review.

## Out of scope

- Removing the event entity type from the schema, validator, projector, browser, or
  activity model.
- Changing event field ownership, chronology, or spoiler semantics.
- Rewriting historical completed-task records that accurately describe earlier
  decisions at the time they were made.
- Editing raw source text or immutable sealed evidence ledgers.
- Promoting Chapter `1.11` without separate approval of its exact rebuilt candidate.
- Reading later chapters to justify event descriptions or other reader-visible facts.

## Acceptance criteria

1. The skill and user-facing extraction documentation define the significance,
   durability, scale, and memorability requirements for canonical events.
2. The guidance lists representative qualifying events and explicit non-qualifying
   scene-level examples.
3. The guidance permits foundational inciting incidents with long, many-being causal
   consequences while keeping descriptions spoiler-safe at the reader boundary.
4. Blind Pass 1 continues to capture event claims without applying canonical
   significance filtering or seeing named project exceptions.
5. Pass 2 records rejected event claims as `not-modeled` and preserves useful facts
   in non-event narrative surfaces.
6. `event:bob-road-incident`, Robert's `death_event_id`, and its Chapter `1.2`
   important mention remain canonical.
7. The Vortex, replicant candidate selection, and project-complex raid event entities,
   updates, and references are absent from the canonical corpus and generated world.
8. Canonical summaries and surviving entity records preserve the useful source facts
   formerly carried by the rejected event records.
9. The canonical corpus, rebuilt Chapter `1.11` temporary corpus, focused tests, and
   standard static checks pass.
10. A fresh Terra Medium forward test applies the threshold correctly, and an
    independent review returns no unresolved findings.

## Validation commands

```bash
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py --help
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter 1.10 --output /tmp/bobiverse-world-1.10.json
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /tmp/bobiverse-1.11-pass2-I51BX9/corpus-event-threshold-final
npm run test -- --run tests/unit/narrative.test.ts
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

## Risks and cautions

- Event significance is an editorial judgment. Apply the explicit scale and durable
  consequence tests rather than treating violence, novelty, or scene length as
  sufficient by themselves.
- The foundational exception must not become a loophole for ordinary personal
  incidents. Require a clear, durable causal chain that eventually affects many
  beings.
- Apply the foundational exception only from explicit project-level editorial
  guidance. Extraction must not read later chapters to discover or justify it, and
  the reader-facing description contains only facts visible at the selected chapter
  boundary.
- Removing an introduced event requires removing every later update and reference;
  validation must prove that no dangling identity or activity record remains.
- Reclassification must not erase useful source knowledge that belongs in summaries
  or other entity records.

## Validation status

Completed on 2026-07-27.

- All commands in `Validation commands` passed. The focused narrative suite reported
  22 passing tests.
- The generated Chapter `1.10` world contains only
  `event:bob-road-incident`; the three rejected event IDs are absent from both
  canonical entities and generated activity.
- The rebuilt Chapter `1.11` temporary corpus validates against the remediated
  history. Its review-only candidate remains unchanged at SHA-256
  `2fc8e0bd9c4053c41e243d60334841228e7aa12f5236e96cf6ecbb56fba2ce32`.
- Fresh Terra Medium forward tests correctly rejected a convention and an isolated
  deadly raid, accepted a civilization-changing first contact, and retained a
  project-ratified foundational incident without exposing named exceptions to blind
  Pass 1.
- A fresh independent closure review returned `No findings.`
