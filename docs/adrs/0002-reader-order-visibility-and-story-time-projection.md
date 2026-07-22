# ADR-0002: reader-order visibility and story-time projection

Status: Accepted
Date: 2026-07-22

## Context

ADR-0001 established chapter-authored narrative data and generated selected-chapter
state. Chapters are not necessarily chronological in story time. Applying every
reader-visible update in chapter order would let a future story-state change alter a
view representing an earlier in-universe moment.

The design already treats reader knowledge and story time as independent dimensions.
The generated projection must enforce that distinction while retaining later-reader
knowledge of facts about earlier story time.

## Decision

- Reader order is the spoiler-visibility gate. Only source records introduced at or
  before `viewChapter` may contribute knowledge to that view.
- Story time is the state-projection gate. An introduced entity or ordinary update
  has the effective story date of its enclosing chapter and contributes to temporal
  state only when that date is definitively at or before `viewChapter.date`.
- Within the reader-visible and temporally eligible set, the chronologically latest
  value for an entity property wins. Reader order must never break a story-time tie.
- An event's own `date`, when present, controls its in-universe occurrence. An event
  without one remains reader-visible but is not placed at a precise story-time point.
- Source data must not create ambiguous state writes: competing values for one entity
  property need strictly ordered, comparable effective dates. Authors use the date
  index when within-year ordering is material.
- Every chapter has one or more appearances, including at least one with
  `role: "lead"`. Multiple leads remain valid for a moot.

## Consequences

- The projection exposes reader knowledge and temporal state as distinct results;
  UI code must not treat knowledge of a later state as that state's presence at an
  earlier story time.
- Validation must reject a chapter without a lead appearance and temporal field
  conflicts that cannot be ordered from canonical date values.
- A view at a year-only date is valid only when its required state can be determined
  without ordering it against indexed dates in that year. Authors add a date index
  whenever the selected chapter must distinguish that ordering.

## Alternatives considered

1. Applying all reader-visible updates in chapter order was rejected because it
   conflates reveal sequence with the represented in-universe state.
2. Using story time alone was rejected because it would expose a fact before the
   reader reaches the chapter that reveals it.
3. Using reader order as a tie-breaker for equal or incomparable story dates was
   rejected because it silently invents chronology.

## Follow-up

- Update `../technical-design.md` and `../data-model-definition.md` with the
  two-stage projection algorithm and temporal validation rules.
- Update `../tasks/BOB-002-narrative-data-model-definition.md` so acceptance and
  validation require a lead appearance and independent reader/story ordering.
