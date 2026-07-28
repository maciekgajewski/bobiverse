# ADR-0013: chapter ordering for equal year-only narrative moments

Status: Accepted
Date: 2026-07-28

## Context

ADR-0009 accepts canonical chapter order as the chronological tie-breaker for
competing state-property writes whose effective dates are both year-only and equal.
It deliberately excludes appearances, events, generated activity, and other
chapter-authored facts.

That narrower scope makes a repeated character appearance lose its generated
`last_known_location` as soon as two reader-visible chapters place the character in
the same year. Bob appears in New Handeltown throughout chapters 1.2 through 1.11,
whose effective dates are all `2133`; the generic date comparator therefore treats
the sightings as tied and emits no last-known location. Without that projected
relationship, selecting Bob cannot focus the mapped Solar System even though New
Handeltown has valid ancestry through Earth and Sol.

The project accepts the same chapter-order chronology for every fact authored by a
canonical chapter when both effective dates are equal year-only values. This must not
make a requested display date into an authored fact or weaken explicit indexed-date
semantics.

## Decision

- A dated chapter-authored narrative fact has an ordering moment consisting of its
  effective story `date` and source `chapter`.
- Different years remain ordered numerically by year.
- When both dates in the same year have explicit indices, their numeric indices are
  authoritative. Equal explicit indices remain tied; chapter order does not override
  them.
- When both dates are year-only in the same year, canonical numeric chapter order
  breaks the tie.
- A year-only date and an indexed date in the same year remain incomparable.
- The narrative-moment comparator applies wherever two chapter-authored facts are
  ordered, including state writes, appearances, events, and generated narrative
  activity.
- Chronologically unplaced event activity has no narrative moment. It remains
  available only to Chapter-mode reader-order context and never participates in
  Date-mode fact-to-fact recency.
- Generic date comparison remains date-only for requested display dates, temporal
  eligibility against a display date, meaningful-date coordinates, and any other
  value that has no source chapter.
- Zero-state facts remain the pre-book baseline and do not acquire a synthetic chapter
  moment.

This ADR supersedes ADR-0009 where it limits chapter-order fallback to state-property
writes. It supersedes ADR-0002 where that ADR prohibits reader order from breaking
equal story-time ties for chapter-authored facts. The independent reader-visibility
gate, story-time eligibility gate, indexed-date authority, and mixed-precision
incomparability remain unchanged.

## Consequences

- Repeated year-only character appearances have a deterministic latest sighting in
  canonical chapter order, so `last_known_location` remains available.
- Equal year-only activity and event facts use the same ordering rule as state writes
  instead of each consumer inventing a local fallback.
- Undated event activity remains explicitly outside story-time ordering; deterministic
  generated-array placement does not make it chronologically placed.
- A later canonical chapter is an accepted chronological fact for equal year-only
  narrative moments. Authors use indexed dates when chapter order would not match the
  intended within-year chronology.
- Equal indexed moments and mixed year-only/indexed moments remain ambiguous wherever
  a unique ordering is required.
- Date-mode filtering still compares authored fact dates with the requested display
  date without inventing a source chapter for the control value.
- Validation, projection, browser recency, map focus, and documentation must share one
  narrative-moment contract.

## Alternatives considered

1. Coalescing only tied appearances at the same location was rejected because it
   leaves different fact types with inconsistent ordering semantics.
2. Adding mechanical within-year indices to existing chapters was rejected because
   canonical chapter order already carries the accepted chronology for equal
   year-only facts.
3. Applying chapter order to equal indexed dates was rejected because it would
   override explicit authored precision.
4. Making mixed year-only and indexed dates comparable was rejected because no
   principled placement exists for the less precise value.
5. Giving requested display dates synthetic chapter positions was rejected because a
   UI control is not a chapter-authored narrative fact.

## Follow-up

- BOB-027 implements one shared narrative-moment comparator across validation,
  projection, activity, browser recency, event ordering, and map focus.
- Update the integrated technical design, data-model definition, chapter-extraction
  workflow, visual-testing guidance, and affected completed-task notes.
- Add focused real-corpus and browser coverage for Bob at chapter 1.11 resolving
  through New Handeltown and Earth to Sol.
