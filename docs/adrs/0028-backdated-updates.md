# ADR-0028: backdated updates revealed by a later chapter

Status: Proposed
Date: 2026-11-13

## Context

A chapter can reveal a fact that happened earlier in story time. For example, a
death that happened during an earlier chapter's events is only reported later.
Maciej's requirement (2026-11-13 18:05 CET): "Use the real event date, but it should
only be visible if user set this chapter, or later one, as their read-through. Data
model should support it".

Under ADR-0002 the chapter file already gates reveal. However, every non-event
update took effect at its enclosing chapter's date, so in Date mode the revealed
fact appeared only from the reveal chapter's date and not from the real date.

## Decision

- Character, species, technology, organization and vessel updates may carry an
  optional `effective_date`, which must be on or before the chapter's own `date`.
- Reader order alone decides reveal: an update is never visible to a knowledge
  chapter earlier than its own chapter.
- Story time is `effective_date ?? chapter date`. It drives Date-mode eligibility,
  state-write ordering (ADR-0013 moments, with the source chapter as before) and
  update activity, so the date joins the meaningful-date options only once the
  update is revealed.
- The reveal chapter's date is never a filter for such an update; it is only the
  default effective date.
- Events keep their own `date`. Location updates and introductions are unchanged.

## Consequences

- A backdated write is ordered by its effective date. A later-dated write of the
  same property from an earlier chapter therefore still wins after that date.
- `effective_date` applies to the whole update object, because a chapter has at most
  one update per entity.

## Alternatives considered

- A reveal-chapter field on facts. Rejected: the chapter file already is the reveal
  key.
- Encoding every backdated fact as an event. Rejected as the only mechanism: entity
  fields such as `death_date` and `current_state` would still change at the chapter
  date.

## Follow-up

- `docs/data-model-definition.md` and the schema record the field.
- Extraction guidance for when to backdate is the Extractor's.
