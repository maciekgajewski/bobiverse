---
name: extract-bobiverse-chapter
description: Extract one Bobiverse plaintext chapter into an evidence-backed, spoiler-safe candidate chapter JSON object. Use for blind first-pass source-claim extraction, reconciliation with the preceding canonical narrative state, temporary corpus validation, dry-run comparison, and human-approved chapter authoring in the Bobiverse repository.
---

# Extract Bobiverse Chapter

This skill is the Codex adapter for the repository's authoritative extraction
contract, `docs/chapter-extraction.md`. The contract owns every editorial,
isolation, validation, review, and promotion rule; follow it section by section.
This file adds only Codex invocation, the conforming profile, and spawning
mechanics. If the two ever disagree, stop and surface the conflict. Operators follow
`docs/chapter-extraction-checklists.md`.

## Quick start

Invoke the skill from the Bobiverse repository root with only the chapter reference
and source path:

```text
$extract-bobiverse-chapter <book.chapter> "<source-path>"
```

Also accept equivalent natural wording:

```text
Use $extract-bobiverse-chapter for chapter <book.chapter> from "<source-path>".
```

Do not require the Captain to repeat blind-extraction, evidence, validation,
comparison, approval, or no-write instructions. Treat every invocation as review-only
(contract §Scope and authority). Before any model reads source text, complete Checklist A.

## Conforming profile and spawning

Read `AGENTS.md`, the contract, binding ADRs, and any active task before work. Do not
read canonical narrative data yet. Create the run workspace and record the initial
`git status` (contract §Context isolation).

Run Pass 1 and Pass 2 in separately spawned Codex agents. For both passes, explicitly
set `model: gpt-5.6-terra`, `reasoning_effort: high`, and `fork_turns: none`. Never
inherit the model, reasoning level, or conversation turns from the orchestrator. A
pass is invalid if it runs with inherited configuration. `profile.json` beside this
file is a derived record of this profile for `scripts/extraction_preflight.py`; these
sentences stay the source of truth.

Pass 1 must therefore run in a fresh isolated Codex context. Never use the
orchestrating conversation for blind extraction, even if it appears not to have read
canonical state.

Stage Pass 1 with exactly `references/pass1-blind-brief.md`,
`references/claim-ledger.md`, the source file, and `scripts/source_evidence.py` as a
tool. Stage nothing else, including this file (contract §Context isolation).

Stage Pass 2 only with the sealed Pass 1 ledger and the canonical material permitted
under `Pass 2: reconcile with prior state`. If GPT-5.6 Terra, high reasoning, or
explicit non-forked spawning is unavailable for either pass, stop and ask the Captain
before substituting another configuration. A Captain-approved alternative follows
contract §Approved alternative and is labelled NON-CONFORMING.

## Pass 2: reconcile with prior state

Permitted canonical material is defined in contract §Pass 2 inputs: the sealed
ledger, the reader-visible state immediately before the target chapter, the narrative
schema, and the binding documents. After verifying the chapter, source SHA-256, and
sealed-ledger SHA-256, read `references/reconciliation-exceptions.md` and
`references/event-exceptions.md`. Never stage either file in blind Pass 1. Then
reconcile under contract §Pass 2 reconciliation and §Reading order and story dates.

## Assemble, validate, and review

Assemble the candidate and temporary root with
`scripts/source_evidence.py prepare-corpus` and validate it under contract
§Candidate assembly and temporary corpus, then resolve astronomy under §Astronomy
preflight and isolated acquisition. Present the review package in contract §Review
package, including, for this adapter:

- requested model, reasoning, and fork configuration for Pass 1 and Pass 2;
- the actual configuration each spawned agent reported, when available.

Write canonical JSON only under contract §Approval, promotion, and provenance.
