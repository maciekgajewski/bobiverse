# ADR-0009: chapter ordering for year-only state writes

Status: Accepted
Date: 2026-07-26

## Context

ADR-0002 requires competing writes to one narrative entity property to have strictly
ordered effective story dates and forbids reader order from breaking a story-time tie.
That rule rejects a later chapter which adds newly revealed information to an existing
entity property when both chapters know only the same calendar year.

The chapter 1.4 extraction exposed this limitation: FAITH's description was introduced
in chapter 1.2 at year `2133`, and chapter 1.4 reveals durable additional descriptive
information in the same year. The project accepts that chapters whose effective dates
are both year-only and equal are chronologically ordered by canonical chapter order.

## Decision

- Every state-property write has an ordering moment consisting of its effective story
  `date` and its source `chapter`.
- Different years remain ordered numerically by year.
- When both dates in the same year have explicit indices, their indices are
  authoritative. Equal explicit indices remain an invalid tie; chapter order does not
  override them.
- When both dates are year-only in the same year, canonical numeric chapter order
  breaks the tie.
- A year-only date and an indexed date in the same year remain incomparable. Once
  explicit indices are needed for competing writes to one property in one year, those
  writes require consistent indexed precision.
- The chapter-order fallback applies only to competing state-property writes and their
  projection. Generic narrative-date comparison, requested display dates, event
  occurrence ordering, and activity ordering retain the existing partial date order.

This ADR supersedes ADR-0002 only where it says reader order must never break a
story-time tie and requires an explicit date index for every material within-year
state-write order. The independent reader-visibility gate, story-time eligibility
gate, and all other ADR-0002 decisions remain accepted.

## Consequences

- A later canonical chapter with the same year-only date may replace a property value
  established by an earlier chapter in that year.
- A later chapter that reveals an earlier within-year state must use explicit indexed
  dates for every competing write whose order would otherwise follow chapter order.
- Validation and projection must use the same state-write moment comparator.
- Existing year-only chapter records do not require mechanical date indexing merely
  to express chapter-ordered state enrichment.
- Date-mode consumers still cannot compare year-only and indexed values in one year or
  infer chronology for non-state activity from chapter order.

## Alternatives considered

1. Retaining the existing rule and adding indices to all affected chapters was
   rejected because equal-year chapter order is an accepted chronological fact for
   state enrichment, and mechanical indices would duplicate that ordering.
2. Letting chapter order break every date tie was rejected because it would override
   explicit story-time indices and conflate reader order with authored chronology.
3. Treating mixed indexed and year-only writes as comparable was rejected because no
   principled placement exists for the less precise value.

## Follow-up

- BOB-020 updates validation, projection, focused regression coverage, the integrated
  technical design, the data-model definition, and the chapter-extraction workflow.
- Revalidate the reviewed chapter 1.4 candidate after implementation; canonical
  promotion still requires separate approval.
