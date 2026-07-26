---
name: extract-bobiverse-chapter
description: Extract one Bobiverse plaintext chapter into an evidence-backed, spoiler-safe candidate chapter JSON object. Use for blind first-pass source-claim extraction, reconciliation with the preceding canonical narrative state, temporary corpus validation, dry-run comparison, and human-approved chapter authoring in the Bobiverse repository.
---

# Extract Bobiverse Chapter

Process exactly one chapter. Treat model output as a candidate, never as authority.
Keep source text and all intermediate artifacts outside version control.

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
comparison, approval, or no-write instructions. They are mandatory parts of this
skill.

Treat every invocation as review-only initially: produce and validate a candidate,
resolve human-review questions one at a time, and present the exact canonical diff.
Invocation alone never authorizes a canonical write. Write canonical JSON only after
the Captain separately approves the exact reviewed candidate and explicitly asks to
apply it. If the Captain says `dry-run`, do not write even after quality approval.

## Inputs

Require:

- repository root;
- explicit canonical chapter reference such as `1.3`;
- one UTF-8 source file outside the repository.

Accept source filenames only as:

```text
<book>.<chapter>.txt
<book>.<chapter> - <source title>.txt
```

Treat the filename as authoritative for an optional source title. Require its numeric
prefix to match the explicit chapter. Derive candidate `title` from the chapter
component after the dot:

- no source title: `3`;
- source title: `4 - Example Title`.

Use `scripts/source_evidence.py metadata` to validate these rules and fingerprint the
exact source bytes.

## Establish the task boundary

Read `AGENTS.md`, the narrative schema, the integrated narrative contract, binding
ADRs, and any active task before work. Routine chapter extraction and promotion does
not require a per-chapter task; broader code, schema, contract, tooling, or editorial
remediation does. Do not read canonical narrative data yet.

Create a new workspace with `mktemp -d`. Put draft claims, sealed evidence, candidate
JSON, and the temporary narrative root only there. Record the initial `git status`.

Always run Pass 1 in a fresh isolated Codex context. Never use the orchestrating
conversation for blind extraction, even if it appears not to have read canonical
state. The orchestrator may already contain zero state, preceding chapters, target
state, generated projections, entity identities, or facts from an earlier run.

Stage only:

- this skill and `references/claim-ledger.md`;
- the source file;
- contract excerpts only after verifying they contain no canonical corpus state,
  book-derived examples, entity names, IDs, aliases, or target facts.

Do not stage the narrative schema, canonical corpus, active task, full integrated
contract documents, ADR examples, tests, fixtures, or any other repository file
merely because the orchestrator read it. The canonical narrative schema belongs to
Pass 2: it contains canonical constants and is not a blind-extraction input.

Use GPT-5.6 Sol with high reasoning for extraction and reconciliation. If that model
or reasoning level is unavailable, ask the Captain before substituting another.

## Pass 1: extract claims blind

Do not read or search:

- `data/narrative/`;
- generated narrative projections;
- canonical entity names, IDs, or aliases;
- the target canonical chapter;
- later chapters;
- fixtures or tests that disclose canonical book-derived facts.

Reading source-format documentation is allowed only after applying the same no-facts
verification required for contract excerpts. Do not run broad repository searches
that could cross the forbidden paths.

Run `source_evidence.py manifest`, then read every bounded source chunk exactly once
with `source_evidence.py chunk`. Track chunk IDs and account for overlap. Never infer
that collapsed lines or missing paragraph breaks mark semantic boundaries.

Extract source claims, not canonical introductions or updates. Use source-local
`source_mentions`
IDs such as `mention:protagonist-1`. Capture:

- source-provided chapter metadata;
- entity mentions and identity clues;
- appearances and roles;
- locations and movement;
- events and participants;
- state, alias, relationship, and date claims;
- an original summary draft;
- uncertainty and unresolved questions.

Preserve the source's primary entity name exactly. When the source primarily names an
entity by an acronym, keep that acronym as the source mention label and, after
reconciliation, as the canonical reader-visible `name`. Put a source-supported
expanded form in the entity's original `description`; never replace the acronym with
the expansion or invent an expansion.

Give every nontrivial claim one or more short exact source excerpts. Do not use long
quotations. Follow `references/claim-ledger.md`.

Run `source_evidence.py seal`. It must resolve every excerpt against the fingerprinted
source, reject ambiguous excerpts without an explicit occurrence, replace excerpts
with byte-offset evidence IDs, and write the sealed ledger under `/tmp`.

After sealing:

1. calculate and record the sealed ledger SHA-256;
2. verify that all chunk IDs were processed;
3. stop Pass 1;
4. do not revise source claims merely to match canonical state later.

## Pass 2: reconcile with prior state

Begin only from the sealed Pass 1 ledger. Load the reader-visible canonical state
immediately before the target chapter:

- for the first chapter, use only zero state;
- otherwise, generate the preceding chapter projection;
- never use later chapters to resolve an earlier chapter.

Resolve `source_mentions` against known entities and aliases. Classify each claim:

- `introducing`;
- `update`;
- `appearance`;
- `important-mention`;
- `already-known`;
- `not-modeled`;
- `unsupported`;
- `ambiguous`.

Use `not-modeled` only for a source-supported claim that is intentionally omitted
from the canonical companion model because it is incidental, redundant at the
chapter-object level, or lacks enough identity to support a durable entity. Record
the editorial reason. Never use it to hide an unresolved contradiction or weak
evidence.

Respect reader-order visibility before story-time projection. Preserve introduction
ordering, reference ordering, update ownership, unknown-location behavior, astronomy
ownership, and original-summary requirements. Do not invent an ID, chronology,
coordinate, relationship, or missing field.

For competing state-property writes, follow the canonical temporal contract: different
years use year order; two indexed dates use their explicit indices; two equal
year-only dates use canonical chapter order; and mixed indexed/year-only precision in
one year remains incomparable. Do not add a date index merely to force validation.

An entity introduced in the target chapter must contain its reader-visible
end-of-chapter state in that introduction. Do not also place it in `updates`; updates
are only for entities visible before the chapter. Order introductions so every
reference points to zero state or an earlier introduction. If two new entities would
otherwise create a reference cycle, omit an optional reverse reference rather than
violating ordering or inventing a workaround.

Ask the Captain one question at a time for material ambiguities. Keep the sealed source
claim unchanged; record the reconciliation decision separately.

Promote a claim to `important-mention` only when it is a source-supported reference to
an already visible direct narrative entity or location, and no chapter introduction,
update, appearance, default location, event participant, or event location already
records that relevance. Do not infer presence, participation, ownership, membership,
location, use, or state from this classification. Each proposed canonical `mentions`
entry requires sealed evidence and its own explicit row in the human-review table.

## Assemble and validate the candidate

Create candidate JSON under `/tmp`, never directly under `data/narrative/`.

Use `source_evidence.py prepare-corpus` to build a new temporary narrative root from:

- canonical zero state, assets, and books;
- canonical chapters strictly before the target;
- the temporary candidate as the target chapter.

Validate with:

```bash
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /absolute/path/to/temporary/narrative-root
```

Repair representation errors only. Do not manufacture source facts to make validation
pass. If a required value remains uncertain, stop and ask the Captain.

The repository narrative validator is authoritative. A local JSON Schema check is
useful but does not replace temporary-corpus validation because repository rules also
enforce cross-record ownership and reader-order constraints.

For a dry-run evaluation, read the existing target chapter only after the candidate
validates. Compare omissions, unsupported claims, reconciliation choices, and review
effort. Do not silently alter the candidate to resemble the existing file.

## Human review and approval

Present:

- source fingerprint and chapter/title derivation;
- the candidate JSON;
- a claim-to-classification table;
- every proposed canonical important mention, its resolved stable ID, redundancy
  decision, classification, and sealed evidence ID;
- evidence IDs with bounded excerpts rendered by `source_evidence.py review`;
- unresolved or low-confidence items;
- validation output;
- the exact canonical diff that approval would create.

An ordinary invocation may write canonical JSON only after the Captain explicitly
approves that exact candidate. A task-scoped dry run must stop without writing even if
the candidate is approved for quality.

After an authorized routine canonical write, run the standard validation documented
in `docs/chapter-extraction.md` and append one row to
`docs/chapter-promotion-log.md`. When an active task exists for broader work, also run
its validation commands and update its directly affected documentation. Never commit
source text, evidence excerpts, draft or sealed ledgers, temporary candidates, or
temporary narrative roots.

## Deferred source fallback

Do not use Kindle Computer Use in the initial workflow. Record it only as possible
future verification for questionable plaintext conversion or disputed evidence.
