# ADR-0031: design principles as the app's constitution

Status: Accepted
Date: 2026-11-16

## Context

Maciej's governing design principles separate a hard ceiling (Read through), which
bounds everything the app may use, from a soft ceiling (a chosen chapter or date),
which picks the story-time point the world is shown at. Several earlier rules in the
ADRs and docs conflicted with them.

## Decision

`../design-principles.md` is the app's constitution. Maciej accepted it and its
rules on 2026-11-16, relayed by the manager: "Yes to all, including suggestions on
the document." It supersedes every earlier rule, document or ADR that conflicts with
it.

The conflicting earlier rules were removed from the ADRs and docs rather than kept
as superseded text (Maciej: "Remove all the superseded decisions so that they don't
clutter the context"). Where a removal would leave a gap, one line points to the
constitution.

## Consequences

- New decisions must agree with the constitution or change it with Maciej's
  approval.
- Code and data still differ from it in the places listed in
  `../design-principles.md` §5; those are open work, not choices.
- Property classification for the soft ceiling (§2.5, §5 item 3): structural
  fields (`kind`, `parent_location_id`, `orbital_order`, `species_id`,
  `parent_id`) follow Read through, like name, picture and description; only
  state-like properties follow the soft ceiling (`softCeilingProperties` in
  `src/narrative/model.ts`). This was the manager's call on 2026-11-16
  (BOB-20261116-TB1C66); Maciej may override it.

## Alternatives considered

- Keeping the old rules marked as superseded was rejected: it clutters the context
  that agents and developers read.

## Follow-up

- The tasks in `../design-principles.md` §6.
