# ADR-0028: backdated updates revealed by a later chapter

Status: Accepted
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
- Events keep their own `date`. Location updates and introductions are unchanged:
  they cannot be backdated (Maciej, Q2 = a, 2026-11-13).
- Chapter view at read-through N has no story-time cutoff (Maciej, Q3 = b,
  2026-11-13). It shows the latest known state from every revealed chapter (1.1
  through N), whatever their dates, so an earlier-dated chapter read after a
  later-dated one still shows both chapters' states. This covers entity fields,
  introductions, events, activity, last-known locations, travel history and the
  map. Chapter view is an explicit projection mode (no requested date); it is not
  a Date-mode request at the chapter's date.
- Date view keeps cutting at the requested date by
  `effective_date ?? chapter date`, among revealed chapters only. Its date options come only from revealed
  chapters, never from the whole book.
- Nothing from a chapter after N is visible at read-through N, in any view, even
  when it is dated earlier than chapters already read.
- An `effective_date` must not be earlier than the date of the chapter that
  introduced the entity.
- Competing writes to one property keep story-date order, then chapter (Maciej,
  Q1, 2026-11-13 19:12 CET: "Q1: story date wins, but extractor merges texts in
  the next write"). When a later-read chapter adds facts to a field, the Extractor
  merges the field's earlier text into that write at extraction time, so the
  story-date winner already carries everything known. The projection does not
  merge text.

## Consequences

- With Q3 = b, story-date order also decides chapter view: an earlier-dated write
  read later is shadowed there by a later-dated write read earlier. For example,
  if 1.51 (2174-01) and then 1.52 (2168-01) both wrote one field, at read-through
  1.52 the 2174-01 value from 1.51 would beat 1.52's own 2168-01 value, and 1.52's
  value would show only in Date view from 2168-01 until 2174-01. That is why the
  extraction-time merge matters.
- Existing data already has such pairs: `character:riker` and `character:homer`
  `current_state` at 1.22 (after 1.21), and `character:bill` `current_state` and
  `technology:vr` `description` at 1.42 (after 1.41 and 1.40). Applying the merge
  rule to them is a separate data follow-up.
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
- Extraction guidance for when to backdate, and the merge rule above, are the
  Extractor's. `docs/chapter-extraction.md` is not changed here because its open
  Captain decision D2 covers the same full-field update question.
- Apply the merge rule to the existing 1.22 and 1.42 pairs in a separate change.
