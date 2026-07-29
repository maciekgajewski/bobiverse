# ADR-0017: supplemental mention completeness

Status: Accepted
Date: 2026-07-29

## Context

ADR-0008 introduced optional canonical `mentions` for curated important references to
already-visible narrative objects that were not otherwise represented by a chapter's
structured facts. Those references generate narrative activity so the object browser
can report recent relevance without inventing state, presence, relationships, or
location.

The subjective importance threshold makes extraction incomplete and inconsistent.
Two source-supported references with the same structural role may receive different
editorial treatment even though `mentions` has one narrow product purpose: advance an
otherwise-absent object's **last mentioned in** chapter indicator.

Some structural chapter data already generates activity: introductions, updates,
appearances, chapter locations, event participants, and event locations. Other typed
relationships, such as species and homeworld references, are authored chapter data
without independent activity. Neither category belongs in `mentions`: the field
records only references otherwise absent from authored chapter data, preserving a
clear boundary between supplemental activity and structured facts.

## Decision

- Keep the canonical field name `mentions`, and call its records **supplemental
  mentions** in current contracts, diagnostics, extraction reviews, and tests.
- Beginning with Chapter `1.14`, extraction must add every source-supported reference
  to a direct narrative entity or location that:
  1. is reader-visible before the chapter;
  2. resolves to one stable canonical ID; and
  3. is absent from every other typed direct narrative-entity or location reference
     in the authored chapter record.
- `mentions` remains an optional, nonempty, duplicate-free set of stable IDs. Each
  qualifying object appears once regardless of how many times the source references
  it.
- A supplemental mention adds `mention` as its only direct activity reason at the
  enclosing chapter's effective date. Existing mapped-location activity continues to
  derive `mapped_system_ancestry`; that ancestry is not another fact asserted by the
  mention. A mention does not assert presence, participation, ownership, membership,
  location, use, relationship, or state.
- Structural nonredundancy remains mandatory. Beginning with Chapter `1.14`, an
  object already represented by another typed direct narrative reference in the
  chapter must not also appear in `mentions`. This includes introduction and update
  targets, appearances, chapter locations, event participants and locations,
  character `species_id` and `death_event_id`, species `homeworld_id`, and location
  `parent_location_id`, `origin_location_id`, and `destination_location_id`. Asset
  and astronomy IDs are outside the direct narrative mention-target union. Explicitly
  enumerated typed fields, not arbitrary ID-shaped strings in prose, define this
  boundary. Chapters `1.1` through `1.13` retain ADR-0008's accepted validator
  boundary so the non-retroactive decision does not invalidate historical data.
- Objects introduced in the same chapter are not previously visible and must not
  appear in `mentions`.
- The extraction and human-review workflow enforces source completeness from sealed
  evidence. Runtime validation cannot prove exhaustiveness because source book text
  remains outside the repository.
- Chapters `1.1` through `1.13` retain their reviewed data and are not retroactively
  audited. The completeness rule applies to Chapter `1.14` and later extractions.

This ADR supersedes ADR-0008 where ADR-0008 makes importance or discretionary
curation a prerequisite for a canonical mention and where it limits structural
nonredundancy to activity-producing target roles. ADR-0008's stable-ID union,
prior-visibility rule, underlying nonredundancy principle, state-neutrality, generated
activity, and `source_mentions` distinction remain binding.

## Consequences

- Pass 2 must audit every resolved source mention against prior visibility and
  structural coverage. A qualifying omitted reference is an extraction defect, not an
  editorial option.
- Human review tables record all qualifying and rejected source mentions, their
  stable IDs, evidence, structural-redundancy decisions, and final classifications.
- Schema descriptions, integrated design documents, extraction guidance, skill
  instructions, diagnostics, and tests use supplemental-mention terminology.
- Runtime projection must conform to the existing integrated contract: each accepted
  `mentions` entry generates one coalescible `mention` activity reason, and a mentioned
  mapped location also derives `mapped_system_ancestry`. The current projector omits
  that ancestry for mention-only locations; BOB-038 corrects the deviation without
  changing the established design semantics.
- Chapter `1.14` records GUPPI, ROAMers, nanites, and the SURGE drive as supplemental
  mentions. Bob, Epsilon Eridani, SUDDAR, and Heaven-1 remain absent from `mentions`
  because appearances, locations, and updates already generate their chapter
  activity.
- Historical ADRs, completed tasks, promotion-log rows, and review evidence retain
  their original terminology as records of the decisions in force at the time.

## Alternatives considered

1. Keeping the curated importance threshold was rejected because it makes the
   **last mentioned in** signal depend on subjective omission.
2. Adding every source reference even when the target is structurally represented
   was rejected because `mentions` exists only for objects otherwise absent from
   authored chapter data. Repeating activity-producing fields would be redundant;
   repeating typed relationships that do not produce activity would blur the same
   structural/supplemental boundary.
3. Retrospectively auditing Chapters `1.1` through `1.13` was rejected because the
   Captain limited migration scope to Chapter `1.14` and future chapters.
4. Renaming the JSON field was rejected because `mentions` remains accurate and a
   schema migration would add no semantic value.

## Follow-up

- BOB-038 updates integrated contracts, the current Phase 2 desktop design and Ready
  task BOB-036, extraction guidance, the local extraction skill, diagnostics, tests,
  and Chapter `1.14`.
- Future extraction reviews treat supplemental-mention completeness as a required
  source-evidence audit.
