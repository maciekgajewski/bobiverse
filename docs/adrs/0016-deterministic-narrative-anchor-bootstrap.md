# ADR-0016: deterministically bootstrap unambiguous narrative astronomy anchors

Status: Accepted
Date: 2026-07-29

## Context

The astronomy pipeline requires every mapped non-Sol narrative stellar-system anchor
to have an exact GCNS or CNS5 source identity before it plans or validates the
anchor's context sphere. The initial implementation represented every such bootstrap
as a manually reviewed record in `data/source/system-review.json`.

Chapter 1.12 exposed a gap in that workflow. Its approved narrative location maps
Epsilon Eridani to the already accepted system `stellar-system-005582`. The accepted
astronomy candidate, effective reviewed name, adopted component, exact GCNS source
identity, and GCNS geometry are all unambiguous, but no separate anchor-bootstrap
record was added. Canonical astronomy validation and generation consequently fail.

Requiring another manual identity decision when the accepted astronomy data already
determines one exact result adds process without resolving uncertainty. Conversely,
fuzzy name matching, positional inference, or automatic selection among multiple
systems would weaken the source and identity boundary.

## Decision

The pipeline may derive a non-Sol narrative-anchor bootstrap automatically when all
of the following are true:

1. The narrative `astronomy_object_id` identifies exactly one accepted candidate
   system.
2. Every narrative location name using that anchor exactly matches the accepted
   effective system name or one of its accepted aliases after normalization, and the
   same normalized name is not accepted for any other candidate system.
   The name-to-anchor pairs are discovered by replaying effective narrative location
   state from zero state through chapter introductions and updates in reading order;
   name-only and astronomy-ID-only updates therefore cannot evade or break the
   pairing.
3. Normalization consists only of Unicode-aware case folding, trimming, and
   collapsing runs of whitespace. It does not remove punctuation, expand
   abbreviations, or perform fuzzy, partial, phonetic, or positional matching.
4. The candidate has no unresolved review requirement or identity ambiguity; an
   accepted adopted-component override may resolve a candidate's original position
   review requirement.
5. Its adopted position component is selected unambiguously through an accepted
   review override or the candidate's deterministic adopted-component rule.
6. That component has source-backed geometry and an exact GCNS or CNS5 identifier
   consistent with the adopted position derivation.

The derived bootstrap uses the mapped anchor ID as both `anchor_id` and `system_id`
and records the exact catalogue and source ID selected by the established
GCNS-then-CNS5 geometry precedence. It is deterministic derived data and is not
written to `system-review.json`.

`system-review.json` retains optional explicit anchor-bootstrap records for genuine
exceptions that the deterministic rule cannot resolve. Those records require the
existing Captain-authorized review. Every explicit record must keep
`system_id == anchor_id`; an exception may authorize only a non-automatic narrative
name-to-system link. Its catalogue and source ID must still identify the accepted
adopted position component and follow that component's GCNS-then-CNS5 position
derivation. It may not redirect the narrative mapping, select a secondary component,
or change source precedence. Duplicate records, records for unmapped anchors,
mismatched system IDs, source mismatches, and malformed records fail validation. An
explicit reviewed record and an automatic result must never produce two bootstraps
for one anchor.

If exact resolution fails, chapter promotion, acquisition planning, validation, and
generation stop with an actionable error. The pipeline must not fall back to fuzzy
matching, a prior runtime coordinate, a book-derived coordinate, or an invented
identity.

Routine chapter extraction and promotion run astronomy validation against the staged
temporary narrative root before writing the approved candidate canonically. This
preflight may derive an unambiguous bootstrap without separate Captain approval. A
candidate requiring an explicit reviewed exception or new source acquisition remains
blocked for an authorized astronomy task.

Source refresh remains an explicit operator action. Automatic identity resolution
does not authorize accepting unrelated live-catalogue drift or silently changing an
accepted system identity.

## Consequences

- Unambiguous existing systems such as Epsilon Eridani do not require redundant
  manual bootstrap records.
- The automatic decision is reproducible from committed narrative names, accepted
  system names and aliases, candidate identity, and source-backed geometry.
- Exact punctuation and alias differences matter. A plausible but non-exact name
  stops for review instead of being guessed.
- New anchors absent from the accepted astronomy candidates still require explicit
  acquisition and review work.
- A shared resolver must be used by refresh, validation, generation, and staged
  promotion checks so their behavior and diagnostics cannot drift.
- Review metadata continues to describe actual human decisions only; it is not
  rewritten to imply review of deterministic derived records.

## Alternatives considered

1. Requiring a manual bootstrap for every mapped system was rejected because it
   duplicates an already deterministic accepted identity decision and allowed an
   otherwise complete chapter promotion to break the build.
2. Fully automatic fuzzy or partial name matching was rejected because uniqueness in
   one snapshot does not establish astronomical identity.
3. Trusting `astronomy_object_id` without verifying the narrative name was rejected
   because an incorrect authored system ID could otherwise silently map a named
   location to the wrong star.
4. Using coordinates from the previous runtime was rejected because it creates a
   circular, non-source-backed acquisition authority.

## Follow-up

BOB-030 implements the shared deterministic resolver, temporary-root preflight,
Epsilon Eridani acquisition artifacts, regression coverage, and integrated
documentation. `docs/technical-design.md`, `docs/data/astronomy-pipeline.md`, and
`docs/chapter-extraction.md` must incorporate this decision.
