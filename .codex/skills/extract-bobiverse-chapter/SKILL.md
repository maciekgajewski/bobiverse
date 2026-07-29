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

Run Pass 1 and Pass 2 in separately spawned Codex agents. For both passes, explicitly
set `model: gpt-5.6-terra`, `reasoning_effort: high`, and `fork_turns: none`. Never
inherit the model, reasoning level, or conversation turns from the orchestrator. A
pass is invalid if it runs with inherited configuration.

Pass 1 must therefore run in a fresh isolated Codex context. Never use the
orchestrating conversation for blind extraction, even if it appears not to have read
canonical state. The orchestrator may already contain zero state, preceding chapters,
target state, generated projections, entity identities, or facts from an earlier
run.

Stage only:

- this skill and `references/claim-ledger.md`;
- the source file;
- contract excerpts only after verifying they contain no canonical corpus state,
  book-derived examples, entity names, IDs, aliases, or target facts.

Do not stage the narrative schema, canonical corpus, active task, full integrated
contract documents, ADR examples, tests, fixtures, or any other repository file
merely because the orchestrator read it. The canonical narrative schema belongs to
Pass 2: it contains canonical constants and is not a blind-extraction input.

Stage Pass 2 only with the sealed Pass 1 ledger and the canonical material permitted
under `Pass 2: reconcile with prior state`. If GPT-5.6 Terra, high reasoning, or
explicit non-forked spawning is unavailable for either pass, stop and ask the Captain
before substituting another configuration.

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
- definition, function, purpose, operating-principle, capability, limitation, and
  acronym-expansion claims needed to describe durable entities;
- an original summary draft;
- uncertainty and unresolved questions.

Capture locations and movement at the granularity stated by the source even when the
place is only a room, corridor, laboratory, office, floor, building, or other
internal space. Pass 1 preserves source evidence; it does not decide whether a place
is eligible for a canonical location entity.

Capture every source-supported occurrence, participant, cause, outcome, and
significance claim that may describe an event. Do not apply the canonical event
significance threshold during blind extraction. Pass 1 preserves source evidence;
Pass 2 decides whether the occurrence warrants a durable `event:` entity.

Preserve the source's primary entity name exactly. When the source primarily names an
entity by an acronym, keep that acronym as the source mention label and, after
reconciliation, as the canonical reader-visible `name`. Put a source-supported
expanded form in the entity's original `description`; never replace the acronym with
the expansion or invent an expansion. When the current chapter does not reveal an
expansion, record that absence as an unresolved description fact so Pass 2 can produce
an accurate reconciliation record without inventing an expansion or publishing the
absence in the description.

For every source mention that may become a durable described entity, gather the
evidence needed to answer, when revealed:

- what kind of entity it is;
- what it does, represents, or is for;
- its defining operation, characteristics, or scope;
- its important capabilities and limitations;
- what makes it reader-relevant;
- the expansion of a source-primary acronym.

Do not fill a checklist item from model memory, generic genre knowledge, a later
chapter, or an unsupported inference. A missing answer remains explicit uncertainty;
it is not permission to create a vague claim about who merely mentions or uses the
entity.

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

After verifying the chapter, source SHA-256, and sealed-ledger SHA-256, read
`references/reconciliation-exceptions.md`. Apply only entries whose complete
fingerprinted key matches. Keep the sealed ledger immutable and record each applied
exception in the reconciliation report. Never stage or read that reference in blind
Pass 1.

Resolve `source_mentions` against known entities and aliases. Classify each claim:

- `introducing`;
- `update`;
- `appearance`;
- `supplemental-mention`;
- `already-known`;
- `not-modeled`;
- `unsupported`;
- `ambiguous`.

Use `not-modeled` only for a source-supported claim that is intentionally omitted
from the canonical companion model because it is incidental, redundant at the
chapter-object level, or lacks enough identity to support a durable entity. Record
the editorial reason. Never use it to hide an unresolved contradiction or weak
evidence.

### Event significance

Reserve canonical `event:` entities for major, memorable turning points in the book
timeline whose durable consequences shape the fate of many beings, not only the
principal characters. Require all of the following:

- a distinct occurrence in the narrative timeline;
- significance and memorability beyond routine scene activity;
- durable consequences rather than a temporary condition or local status change;
- a consequence scale that reaches a community, civilization, species, or otherwise
  many beings beyond the immediate participants.

Battles, first contact, consequential discoveries or technological breakthroughs,
revolutions, and natural or artificial disasters are typical qualifying categories
when the source-supported occurrence also passes the consequence tests. Category
membership alone is not sufficient.

Allow a foundational inciting incident whose immediate scale is personal when its
clear long causal chain produces series-wide consequences for many beings. Apply this
exception only from explicit project-level editorial guidance; do not read later
chapters to discover or justify it during extraction. Keep the event's reader-facing
name, description, date, location, and participants strictly spoiler-safe at its
introduction boundary.

After Pass 1 is sealed, read `references/event-exceptions.md` during Pass 2 and apply
only the project-ratified exceptions listed there. Never stage or read that reference
in the blind Pass 1 context.

Do not create an event merely because an occurrence is violent, novel, lengthy, or
important to one principal character. Conversations, confrontations, conventions,
routine operations, training, selection processes, personal realizations, isolated
attacks or accidents, and temporary setbacks remain prose or ordinary entity state
unless their lasting scale passes the gate.

Classify a rejected source event claim as `not-modeled` and record the failed
significance or scale test. Preserve useful facts in the original chapter summary or
an appropriate character, technology, organization, location, or other entity field.
Do not use an event as a cumulative status record for an ongoing process when ordinary
entity state represents the durable knowledge.

### Location granularity

Use settlement scale as the minimum ordinary granularity for authored narrative
locations. A supported city, town, settlement, or durable, independently useful base
or station may be a location entity. Use `locale` for an ordinary station or base.
Reserve `megastructure` for an engineered structure exceptional in physical scale;
size is part of the classification, not a synonym for every space-based installation.

Require durable narrative identity in addition to eligible scale. Do not introduce an
incidental, unnamed, short-lived, or otherwise disposable place merely because the
chapter or an appearance requires a location. Do not introduce or update a room,
corridor, laboratory, office, floor, individual building, or comparable internal
facility space as a location.

Apply the same restriction to structured references: chapter `location_id`,
appearance locations, and event locations must not point to an ineligible or
disposable place. Use the most specific eligible, reader-visible location supported by
the source. If a fine-grained locale is unavailable or intentionally not modeled,
climb its established hierarchy and use the nearest supported reader-visible parent.
Never invent containment, promote an ineligible place, or create a placeholder merely
to satisfy a required field.

Classify a source-supported fine-grained place as `not-modeled` for location
granularity and record that editorial reason. Preserve relevant facts in the original
chapter summary, an event description, or another suitable entity description so the
restriction does not erase source knowledge. Pass 1 evidence and the immutable sealed
ledger remain unchanged.

### Description authoring

Treat every authored `description` as a concise, original, spoiler-safe
mini-encyclopedia entry, not as a narrative extract or a retelling of the scene where
the entity appears. A reader who sees only the entity's name and description should
understand what it is, its defining characteristics at the current reader boundary,
and why it matters.

Apply this general quality gate:

- begin with a standalone definition or classification when reader-visible evidence
  supports one;
- explain durable purpose, function, scope, characteristics, capabilities, and
  limitations that distinguish the entity;
- center the description on the entity, not on a named character's recent actions;
- state capabilities in general language such as `It can` or `It is used to`, rather
  than `Bob uses it to`; retain a named relationship only when it is defining or a
  source-supported assessment must be attributed;
- require evidence that each capability belongs to the described entity; querying an
  interface for documentation, observing a capability through it, or using it as an
  access path does not make that interface the capability's owner;
- use chapter-specific facts only after they improve the general explanation; a
  sentence that merely says who uses, mentions, owns, or discusses the entity is not
  a sufficient description by itself;
- keep subjective assessments and uncertain forecasts explicitly attributed;
- omit every disclosure-gap statement from descriptions, including semantic variants
  such as `has not yet been revealed`, `remains unknown`, `has not been explained`,
  or `full specifications are unavailable`; when a sentence mixes a positive fact
  with a disclosure gap, retain only the supported positive fact when it remains
  coherent and useful;
- do not duplicate structured fields unless needed for a coherent standalone entry;
- keep transient operational condition in the type's `state` or `current_state`
  field when one exists; author every `current_state` as one or two concise sentences
  describing only the latest known condition, never identity, biography, chapter
  synopsis, or accumulated adventure history;
- never import later knowledge, model-memory facts, or unsupported expansions to make
  an entry sound complete.

A short partial entry is valid when a durable identity is supported but one or more
defining facts are absent. Omit the absent facts from the reader-facing description;
keep them explicit in ledger uncertainty, reconciliation, open questions, and human
review. Never import later knowledge, model-memory facts, or unsupported expansions
to make the entry appear complete.

Use the checklist for each type that owns a description:

- `species`: what kind of beings they are, distinguishing known traits, and
  reader-visible home or social context;
- `technology`: what kind of technology it is, what it does, how it works at the
  revealed level, distinguishing capabilities or limitations, and any
  source-supported acronym expansion;
- `organization`: what kind of organization it is, its purpose, constituency or
  scope, defining policies, and durable capabilities or relationships;
- `vessel`: what named ship, reusable design, or ship family it represents, its
  intended role, defining systems, capabilities, and limitations; one record may
  cover the first named ship and the design family associated with it, without
  creating separate instance and class entities;
- `event`: what happened, its durable outcome, and why it matters; use structured
  date, location, and participant fields for those facts when available;
- `location`: what kind of place it is, its narrative context, and distinguishing
  reader-visible traits; keep mutable condition in `state` and measured astronomy
  facts in the astronomy authority.

When updating an existing description, start from the complete prior reviewed entry
and integrate the newly supported information. A description update replaces the
entire field; never erase useful reader-visible knowledge by emitting only the new
chapter fact.

Respect reader-order visibility before story-time projection. Preserve introduction
ordering, reference ordering, update ownership, unknown-location behavior, astronomy
ownership, and original-summary requirements. Do not invent an ID, chronology,
coordinate, relationship, or missing field.

For comparisons between dated chapter-authored facts, follow the canonical temporal
contract: different years use year order; two indexed dates use their explicit
indices; two equal year-only dates use canonical chapter order; and mixed
indexed/year-only precision in one year remains incomparable. Apply the same
fact-to-fact rule to state writes, appearances, dated events, and their generated
activity. Requested display dates and chronologically unplaced events remain outside
this chapter fallback. Do not add a date index merely to force validation or reproduce
canonical chapter order.

An entity introduced in the target chapter must contain its reader-visible
end-of-chapter state in that introduction. Do not also place it in `updates`; updates
are only for entities visible before the chapter. Order introductions so every
reference points to zero state or an earlier introduction. If two new entities would
otherwise create a reference cycle, omit an optional reverse reference rather than
violating ordering or inventing a workaround.

Ask the Captain one question at a time for material ambiguities. Keep the sealed source
claim unchanged; record the reconciliation decision separately.

For Chapter `1.14` and later, classify every resolved source mention against
supplemental-mention completeness. Promote it to `supplemental-mention` when it is a
source-supported reference to an already visible direct narrative entity or location
and the target is absent from every other typed direct narrative reference in the
chapter. Structural references include introduction/update targets, appearances,
chapter locations, event participants and locations, character `species_id` and
`death_event_id`, species `homeworld_id`, and location `parent_location_id`,
`origin_location_id`, and `destination_location_id`. Asset and astronomy IDs are not
mention targets, and ID-shaped prose is not structural. Do not apply an importance or
curation threshold. Do not infer presence, participation, ownership, membership,
location, use, or state from this classification. Each qualifying canonical
`mentions` entry is mandatory, requires sealed evidence, and receives its own explicit
row in the human-review table. A mentioned mapped location retains derived
`mapped_system_ancestry` activity.

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
npm run data:validate -- \
  --narrative-root /absolute/path/to/temporary/narrative-root
```

Repair representation errors only. Do not manufacture source facts to make validation
pass. If a required value remains uncertain, stop and ask the Captain.

Before validation, audit every candidate `description` for semantic disclosure-gap
language. Missing knowledge belongs in reconciliation and human-review artifacts, not
in the candidate description or a substitute invented fact. This check applies even
when the same agent also prepares the chapter summary.

The repository narrative validator is authoritative. A local JSON Schema check is
useful but does not replace temporary-corpus validation because repository rules also
enforce cross-record ownership and reader-order constraints.

Astronomy validation is also mandatory before canonical promotion. Under ADR-0016,
an exact normalized narrative name that is unique across one accepted astronomy
system's effective name and aliases receives a deterministic source-backed bootstrap
without separate Captain approval. Normalization only case-folds, trims, and
collapses whitespace. Never remove punctuation or use fuzzy, partial, phonetic,
coordinate, or model-confidence matching. If the accepted candidate identity,
adopted component, source-backed geometry, or pinned coverage cannot support the new
anchor, stop before any canonical write and report the required astronomy work.

For a dry-run evaluation, read the existing target chapter only after the candidate
validates. Compare omissions, unsupported claims, reconciliation choices, and review
effort. Do not silently alter the candidate to resemble the existing file.

## Human review and approval

Present:

- source fingerprint and chapter/title derivation;
- requested model, reasoning, and fork configuration for Pass 1 and Pass 2;
- the candidate JSON;
- a claim-to-classification table;
- every resolved source mention, its stable ID when resolved, structural-redundancy
  decision, classification, and sealed evidence ID, including qualifying
  supplemental mentions, structurally represented references, later or unresolved
  targets, and intentionally unmodeled mentions;
- evidence IDs with bounded excerpts rendered by `source_evidence.py review`;
- unresolved or low-confidence items;
- narrative and astronomy preflight output, including any automatically resolved
  mapped-anchor bootstrap;
- the exact canonical diff that approval would create.

An ordinary invocation may write canonical JSON only after the Captain explicitly
approves that exact candidate. A task-scoped dry run must stop without writing even if
the candidate is approved for quality.

Before an authorized routine canonical write, rebuild the temporary narrative root
from current canonical inputs plus the exact approved candidate and rerun both
temporary-root validators documented in `docs/chapter-extraction.md`. If either
fails, leave canonical chapter files and `docs/chapter-promotion-log.md` byte-for-byte
unchanged. After a successful write, run the documented canonical narrative and
astronomy validation, then append one promotion-log row. When an active task exists
for broader work, also run its validation commands and update its directly affected
documentation. Never commit source text, evidence excerpts, draft or sealed ledgers,
temporary candidates, or temporary narrative roots.

## Deferred source fallback

Do not use Kindle Computer Use in the initial workflow. Record it only as possible
future verification for questionable plaintext conversion or disputed evidence.
