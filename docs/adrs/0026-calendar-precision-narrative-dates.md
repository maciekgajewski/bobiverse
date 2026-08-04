# ADR-0026: calendar-precision narrative dates

Status: Accepted
Date: 2026-08-04

## Context

The former `YYYY` and `YYYY.index` date scalar encodes a calendar year plus an
opaque ordering token. It cannot represent source-supported month or day precision,
and its partial ordering leaves an unnecessary ambiguity for chapter-authored facts.
The application needs one clean, Gregorian contract which retains deliberate source
vagueness while providing deterministic ordering and reader-safe presentation.

## Decision

- Canonical narrative dates use `YYYY[-MM[-DD]][.d+]`. Years are four positive
  decimal digits; month and day components are zero-padded Gregorian values,
  including Gregorian leap-year validity. A suffix is a non-negative base-10
  ordering integer without leading zeroes except `0`.
- A missing suffix has effective value zero. Canonical authoring omits `.0` unless
  retaining it makes source-backed ordering clearer. Suffixes are ordering values,
  not fractions of a calendar unit, and are never reader-visible.
- A year, month, and day represent their complete Gregorian calendar ranges.
  Non-overlapping ranges order by calendar position. Identical calendar portions
  order by effective suffix, then canonical numeric source-chapter order. Overlapping
  unequal-precision chapter-authored moments order by canonical numeric source
  chapter. A suffix never reverses non-overlapping calendar order.
- The same narrative-moment comparator applies to all chapter-authored facts,
  including state writes, appearances, dated events, activity, recency, locations,
  and travel history. Zero-state facts remain pre-book facts without a chapter.
- Display-date eligibility has no synthetic chapter. Earlier non-overlap, identical
  calendar portions with a qualifying suffix, and a display range that contains the
  fact are eligible; later non-overlap and a fact range that contains a less-precise
  display range are ineligible.
- Reader text formats a year as `2165`, a month as `August 2165`, and a day as
  `17 August 2165`. The Date-mode axis anchors each range at its first calendar day,
  using Gregorian elapsed-day fractions; this is presentation-only and does not
  narrow the fact's represented range.
- Persistence changes atomically from `bobiverse.app-state.v1` to
  `bobiverse.app-state.v2`. Initialization removes only the v1 key and begins with
  ordinary v2 defaults; no old value or state field is migrated or parsed.

This ADR supersedes the conflicting opaque-index, mixed-precision, and tie rules in
ADR-0002, ADR-0009, and ADR-0013. Their independent reader-order visibility boundary
and story-time separation remain in force.

## Consequences

- Schema, validation, projection, UI formatting, axis placement, and persistence
  must share the calendar parser and comparison rules.
- Canonical narrative records migrate in one atomic change. No compatibility parser
  or dual-write contract is retained.
- Source-backed top-level chapter-date audits may correct precision but never infer
  missing components.

## Alternatives considered

1. Retaining opaque indices was rejected because it cannot faithfully present known
   calendar precision.
2. Normalizing vague dates to first days was rejected because it invents chronology.
3. Retaining a legacy parser was rejected because it extends an ambiguous contract
   and weakens the clean migration boundary.

## Follow-up

BOB-20260804-JSSM85 updates the narrative schema, runtime, validation, presentation,
documentation, and the audited chapter corpus. Candidate and canonical application
authority remain separate from this architectural decision.
