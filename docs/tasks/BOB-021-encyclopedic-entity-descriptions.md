# BOB-021: encyclopedic entity descriptions

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-27

## Objective

Make chapter-extraction descriptions concise, spoiler-safe encyclopedia entries
rather than narrative extracts. Capture the source claims needed to explain an
entity, apply type-specific content checks during reconciliation, and allow explicitly
partial entries when reader-visible evidence is incomplete.

## User-visible outcome

An entity description stands on its own: a reader can understand what the entity is,
what distinguishes it, and why it matters without reconstructing the chapter scene.
Technology descriptions address kind, function, revealed operating principle,
capabilities or limitations, and acronym expansion. When the current reader-visible
evidence does not reveal one of those facts, the entry says so explicitly instead of
guessing or importing a later spoiler.

## Binding references

- `../technical-design.md`, Sections 12 and 13
- `../implementation-plan.md`, Phase 4
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0007-additional-narrative-entity-types.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

This is an editorial-workflow refinement within the existing original, plain-text,
reader-visible `description` contract. It does not change schema shape, field
ownership, entity types, projection, or spoiler semantics and therefore does not
require an ADR.

## Decisions

- Every entity description is a concise mini-encyclopedia entry, not a retelling of
  the scene where the entity appears.
- All entity types use a general standalone-description quality gate plus a
  type-specific checklist.
- A technology description addresses what kind of technology it is, what it does,
  how it works at the currently revealed level, its distinguishing capabilities or
  limitations, and its acronym expansion when source-supported.
- Source-primary acronyms remain canonical visible names. Their descriptions expand
  them only when the expansion is supported by evidence visible at that reader
  boundary.
- An explicitly partial entry is allowed. When a function, operating principle, or
  acronym expansion has not yet been revealed, the description says so rather than
  inventing it.
- Chapter-specific facts may follow the standalone definition when they improve the
  reader's understanding; they may not substitute for the definition.
- A later description update replaces the complete field. It must preserve useful
  prior reader-visible knowledge while integrating newly revealed facts.
- The standard begins with the chapter `1.7` candidate and applies prospectively.
  Canonical chapters `1.1` through `1.6` are not retrospectively audited in this task.

## In scope

- Add the description-authoring standard and type-specific checks to the
  repository-local extraction skill.
- Require blind Pass 1 to capture evidence-backed definition, function, acronym,
  capability, limitation, and uncertainty claims needed by Pass 2.
- Document the same authoring and review rule in `docs/chapter-extraction.md`.
- Revise only the review-only chapter `1.7` candidate and its temporary review
  artifacts under `/tmp`.
- Rebuild and validate a temporary corpus containing canonical chapters `1.1` through
  `1.6` and the revised candidate.
- Present the exact revised candidate and diff for a new approval decision.

## Out of scope

- Editing or promoting canonical chapter `1.7`.
- Auditing or changing canonical descriptions in chapters `1.1` through `1.6`.
- Reading later chapters to enrich an earlier description.
- Inventing acronym expansions, classifications, operating principles, capabilities,
  or relationships.
- Changing the narrative schema, validator, projection, entity union, or application
  UI.
- Re-running blind Pass 1 or editing its immutable sealed ledger.

## Acceptance criteria

1. The skill defines descriptions as standalone, original, spoiler-safe
   mini-encyclopedia entries and distinguishes them from summaries and transient
   current state.
2. The claim-ledger guidance requires evidence-backed claims for definitions,
   functions, expansions, capabilities, limitations, and explicitly unrevealed
   information.
3. Reconciliation applies a general description quality gate and type-specific
   checklists without importing later knowledge or manufacturing missing facts.
4. The documented acronym rule retains a source-primary acronym as `name`, expands it
   only from reader-visible evidence, and explicitly identifies an unrevealed
   expansion in a partial entry.
5. Description updates preserve useful prior text because an update replaces the
   complete field.
6. The revised chapter `1.7` candidate applies the new rule to AMI, SUDDAR, and the
   SURGE drive while leaving the sealed ledger unchanged.
7. The revised candidate passes authoritative temporary-corpus validation and an
   independent source-fidelity review.
8. Canonical narrative data and source/evidence artifacts remain unchanged and
   untracked.

## Validation commands

```bash
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py --help
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /tmp/bobiverse-1.7-pass2-pS7Tz8/corpus-encyclopedic-final
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

## Validation status

All documented commands passed on 2026-07-27. The authoritative temporary-corpus
validation reported:

```text
Narrative corpus is valid: zero state and 7 chapter source file(s).
```

The revised candidate, exact absent-file diff, and
`corpus-encyclopedic-final/chapters/1/7.json` are byte-identical. The candidate
SHA-256 is
`379314d7208ea4037cfd8c28b62d3e8cbece6731b56b85af2e2fce1d9d3e8007`;
the immutable sealed-ledger SHA-256 remains
`17fe45755c955001097c52353458bd39a2f6362e8a1f38329e1590b9f1caf7c8`.
An independent Terra Medium source-fidelity and workflow review returned
`No findings.` Canonical narrative data, source text, and sealed evidence were not
modified.

## Risks and cautions

- Calling a description encyclopedic must not license model-memory facts, later
  spoilers, or unsupported acronym expansions.
- A partial entry can become filler if it only repeats who uses the entity. It must
  state what is currently known and which defining information remains unrevealed.
- A type checklist is a review aid, not permission to manufacture every listed fact.
- Updating a description without carrying forward prior reviewed information would
  silently erase reader-visible knowledge.
- The chapter `1.7` candidate remains review-only until the Captain approves the
  exact revised artifact and explicitly authorizes its canonical application.
