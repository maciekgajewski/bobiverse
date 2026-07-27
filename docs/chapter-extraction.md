# Chapter extraction

Use `extract-bobiverse-chapter` to turn one lawfully obtained plaintext chapter into
a spoiler-safe candidate JSON object. The ordinary Codex workflow remains Sol/high.
Under BOB-025 only, Terra/high is the independent blind Pass 1 comparator for the
local Qwen shadow path. Neither comparator can silently publish chapter data.

## Start an extraction

From the repository root, give Codex the chapter reference and the plaintext source
file, which must remain outside the repository:

```text
$extract-bobiverse-chapter 1.2 "../source-text/1.2 - Bob Version 2.0.txt"
```

The file name must start with the same book and chapter number as the reference. An
untitled chapter uses `1.3.txt`; a titled chapter uses
`1.2 - Source Title.txt`.

## What Codex does

1. Extracts source-backed claims in an isolated first pass, using `source_mentions`
   only as source-local identity anchors.
2. Seals the evidence, then compares it only with the reader-visible state before
   that chapter.
3. Builds and validates a temporary candidate outside the canonical corpus.
4. Shows the candidate, evidence, open questions, validation result, and exact diff.
   A proposed canonical `mentions` entry is separately classified as an important,
   non-redundant reference, with sealed evidence and an explicit human-review row.

Entity names preserve the source's primary surface form. When the source primarily
uses an acronym, that acronym remains the canonical visible and searchable `name`;
a source-supported expanded form belongs in the original `description`. Codex must
not replace the acronym with its expansion or invent an expansion.

## Local Qwen blind Pass 1

The local provider uses the checked-in, non-secret
`config/chapter-extraction-qwen3-14b.json` and accepts only a loopback Ollama
endpoint. Create an explicit temporary workspace and invoke the supported command:

```bash
workspace="$(mktemp -d)"
./bin/chapter-extract \
  --config config/chapter-extraction-qwen3-14b.json \
  --chapter 1.2 \
  --source "../source-text/1.2 - Bob Version 2.0.txt" \
  --output-dir "$workspace"
```

Both the source and output workspace must resolve outside the repository. The command
verifies the local endpoint and configured model before reading source bytes. It sends
all labeled evidence chunks in one non-streaming, thinking-enabled, JSON-Schema-
constrained request. Raw model output and thinking are discarded. Only the validated
draft ledger, sealed ledger, and source-free metrics remain in the temporary
workspace.

Qwen currently replaces no Codex authority. During the BOB-025 shadow trial:

1. Run Qwen and a fresh isolated Codex Terra/high Pass 1 independently.
2. Seal both ledgers before either provider sees the other output or canonical state.
3. Review provider-neutral evidence packets under the task's frozen measurement
   protocol.
4. Adjudicate the union only after both independent reviews.
5. Stop both comparators after Pass 1. The ordinary Sol/high workflow remains
   responsible for Pass 2 reconciliation and candidate assembly.

A later task may extend Qwen into Pass 2 only after the BOB-025 gate passes and the
Captain explicitly authorizes that evolution.

## Description authoring standard

Every authored `description` is a concise, original, spoiler-safe
mini-encyclopedia entry. It must stand on its own rather than retell the chapter scene
where the entity appeared. A useful entry explains what the entity is, its durable
purpose or role, its defining characteristics at the selected reader boundary, and
why it matters.

Chapter-specific facts may enrich that explanation, but a sentence that only records
who uses, owns, mentions, or discusses an entity is not a sufficient description.
Subjective assessments and forecasts remain attributed. Transient operational
condition belongs in `state` or `current_state` when the entity type provides that
field.

The type-specific review checks are:

- Species: nature, distinguishing known traits, and reader-visible home or social
  context.
- Technology: kind, function, revealed operating principle, distinguishing
  capabilities or limitations, and acronym expansion.
- Organization: kind, purpose, constituency or scope, defining policies, and durable
  capabilities or relationships.
- Vessel type: class, intended role, defining capabilities, and limitations; the
  description must not silently become a record for one individual vessel.
- Event: what happened, its durable outcome, and why it matters; structured fields
  continue to own date, location, and participant references.
- Location: kind, narrative context, and distinguishing reader-visible traits;
  `state` owns mutable condition and astronomy owns measured physical facts.

These checks never authorize invented completeness. An explicitly partial entry is
valid when a durable entity is supported but a defining fact has not yet been
revealed. Say so naturally, such as `Its operating principle has not yet been
revealed` or `The acronym's expansion has not yet been revealed`. Do not import later
chapters, model-memory facts, or unsupported expansions.

Pass 1 therefore captures separate evidence-backed claims for definitions, functions,
purposes, operating principles, capabilities, limitations, and acronym expansions,
plus explicit uncertainty for checklist items the source does not reveal. Pass 2
applies the checklist after reconciliation with the preceding reader-visible state.

Description updates replace the complete field. Preserve useful prior reviewed
knowledge and integrate the newly revealed information rather than emitting only the
latest chapter fact.

## Event significance

A canonical event is a major, memorable turning point in the book timeline whose
durable consequences shape the fate of many beings, not only the principal
characters. It must be a distinct occurrence, matter beyond routine scene activity,
produce lasting consequences, and reach a community, civilization, species, or
otherwise many beings beyond its immediate participants.

Battles, first contact, consequential discoveries or technological breakthroughs,
revolutions, and natural or artificial disasters commonly qualify when they meet
those consequence tests. Violence, novelty, scene length, or importance to one main
character is not sufficient by itself.

A foundational inciting incident may qualify when its immediate impact is personal
but its long causal chain produces series-wide consequences for many beings.
`event:bob-road-incident` is retained under this exception because it begins the
series' origin story. Its authored description remains spoiler-safe at Chapter `1.1`;
later consequences justify eligibility but are not revealed early.

Conversations, confrontations, conventions, routine operations, training, selection
processes, personal realizations, isolated attacks or accidents, and temporary
setbacks remain summary or entity-state facts unless their lasting scale passes the
gate. Pass 1 still captures all source-supported event claims. Pass 2 classifies a
rejected event as `not-modeled`, records the failed significance or scale test, and
preserves useful facts in the summary or an appropriate entity record.

The retroactive audit retains `event:bob-road-incident` and removes The Vortex, the
replicant candidate-selection process, and the project-complex raid as event
entities.

## Location authoring granularity

Settlement scale is the minimum ordinary granularity for narrative location
entities. A source-supported city, town, settlement, or distinct base or installation
may be authored as a location. Rooms, corridors, laboratories, offices, floors,
individual buildings, and comparable internal facility spaces must not be introduced
or updated as locations.

The restriction also applies to chapter defaults, appearance locations, and event
locations. Use the nearest reader-visible supported location at settlement or base
scale; do not invent containment or promote an internal space merely because a
structured location field is required.

Blind Pass 1 still captures fine-grained location and movement claims with sealed
evidence. During reconciliation, Pass 2 records an explicit `not-modeled` granularity
decision and keeps relevant facts in the chapter summary, an event description, or
another suitable entity description. The rule therefore limits browser granularity
without deleting source knowledge.

## Approve a candidate

Review the exact candidate and ask Codex to apply it explicitly, for example:

```text
Accept this candidate.json as chapter 1.2.
```

Until that separate approval, the skill is review-only. `dry-run` always prevents a
canonical write. Source text, evidence excerpts, and intermediate ledgers stay out of
version control.

## Record an approved promotion

Routine promotion of an exact, explicitly approved candidate does not require a new
task. After applying the candidate:

1. Confirm the canonical JSON remains value-identical to the approved candidate;
   standard formatting may change whitespace only.
2. Run the shared validation below.
3. Append one row to [the chapter-promotion log](chapter-promotion-log.md) with the
   chapter, approval date, canonical SHA-256, validation result, and any material
   editorial decision.

Create a task instead when the work changes code, schemas, contracts, tooling, or
includes broader editorial remediation beyond the approved chapter candidate.

### Standard promotion validation

```bash
chapter_ref="1.3" # Replace with the approved chapter.
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter "$chapter_ref" --output "/tmp/bobiverse-world-$chapter_ref.json"
npm run format:check
npm run lint
npm run typecheck
git diff --check
```
