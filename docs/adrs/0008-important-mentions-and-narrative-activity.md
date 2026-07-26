# ADR-0008: important mentions and generated narrative activity

Status: Accepted
Date: 2026-07-26

## Context

The narrative model records introductions, updates, appearances, chapter locations,
and events. Those fields establish world state and some forms of chapter relevance,
but they do not consistently record an important reference to an already-known
technology, organization, vessel type, species, location, event, or absent character.

The Phase 2 object browser must sort each entity group by recent relevance. Treating
every cross-reference as activity would produce noise and false implications, while
using only character appearances would leave other entity types without a comparable
recency signal.

The extraction workflow already calls every source-local entity occurrence a
`mention`. Reusing the same word for a curated canonical chapter field without
changing that ledger would leave two materially different meanings under one name.

## Decision

- A chapter may contain an optional `mentions` array of unique stable narrative
  entity IDs.
- A canonical mention records an important, source-supported reference to an
  already-known object when no existing chapter field adequately represents that
  relevance.
- Mention targets may be locations or any direct narrative entity type supported by
  the shared registry.
- A mention does not assert presence, participation, ownership, membership, location,
  use, or state change. It creates no relationship and changes no entity property.
- Validation rejects unresolved, later-introduced, duplicate, or structurally
  redundant mention targets. Authors do not repeat an object already represented in
  that chapter by its introduction, update, appearance, chapter location, event
  participation, or event location.
- The generator derives read-only activity records from structural chapter facts and
  important mentions. Activity is a presentation index, not a second narrative
  authority.
- Activity records preserve their source chapter, effective story date when
  comparable, and one or more controlled reasons. They support Chapter-mode
  reader-order recency and Date-mode story-time recency without changing visibility
  or world-state projection.
- Activity for a mapped narrative location also contributes to its mapped
  stellar-system ancestry. It never supplies coordinates to an unmapped location.
- The extraction workflow renames its blind Pass 1 `mentions` collection to
  `source_mentions`. These are source-local identity anchors, not canonical important
  mentions.
- Pass 2 may promote a source-backed reference to a canonical important mention only
  after entity resolution and redundancy checks. The human review shows that
  classification and its sealed evidence explicitly.

## Consequences

- The shared schema, TypeScript source types, diagnostics, semantic validator,
  projector, generated projection schema, fixtures, and tests must change together.
- Canonical chapter files need not contain `mentions`; absence means that no
  additional important references were curated beyond structural chapter facts.
- The browser, map activity treatment, and inspectors consume the generated activity
  index rather than independently scanning chapter JSON.
- Recency cannot be used as evidence of continuous presence or a current location.
  Character location remains governed by eligible appearances.
- Extraction skill instructions, the claim-ledger contract, helper fixtures, and
  user-facing extraction documentation must distinguish `source_mentions` from
  canonical important mentions.
- Existing book-derived chapters are not retroactively edited merely to prove the
  field. Redacted fixtures prove the contract; future extraction or separate reviewed
  editorial work may add canonical mentions.

## Alternatives considered

1. Deriving activity only from existing structural fields was rejected because
   important references to several entity types would remain invisible to recency
   ordering.
2. Treating every entity reference as activity was rejected because fields such as
   species or homeworld links do not necessarily make their targets relevant in the
   chapter.
3. Adding type-specific mention lists was rejected because it duplicates one
   spoiler-safe identity union and makes extraction and projection inconsistent.
4. Keeping `mentions` for both the blind claim ledger and canonical chapter field was
   rejected because one would mean every source-local identity occurrence and the
   other only curated important references.

## Follow-up

- BOB-010 implements the source, validation, projection, extraction-skill, and
  documentation changes atomically.
- Integrate the accepted contract into `../technical-design.md`,
  `../data-model-definition.md`, and the Phase 2 desktop design.
- BOB-012 and BOB-014 consume the generated activity index for browser ordering and
  map emphasis.
