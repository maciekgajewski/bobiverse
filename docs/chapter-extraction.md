# Chapter extraction with Codex

Use `extract-bobiverse-chapter` to turn one lawfully obtained plaintext chapter into
a spoiler-safe candidate JSON object. It is an editorial assistant: it does not
silently publish chapter data.

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
   Every resolved source mention receives an explicit human-review row with sealed
   evidence and its structural-redundancy decision.

Beginning with Chapter `1.14`, every source-supported reference to a previously
reader-visible direct narrative entity or location must become a supplemental
`mentions` entry when the target is absent from every other typed direct narrative
reference in that chapter. Introductions, updates, appearances, chapter locations,
event participants and locations, character species, death events, and direct
parents, species homeworlds, and location parent/origin/destination fields are
structural. ID-shaped prose is not. A supplemental mention advances otherwise-absent
narrative activity; it does not assert presence, participation, ownership,
membership, location, use, relationship, or state. A mentioned mapped location also
derives the existing `mapped_system_ancestry` activity.

When the source reveals direct character lineage, author the child's optional
`parent_id` with sealed evidence. The same field represents replicant and biological
genealogy. For a replicant it identifies the source character state or backup from
which the child was copied, not merely the operator who initiated creation. Do not
infer ancestry from similar names, behavior, species, possession of a backup, or
operation of cloning machinery. Preserve unresolved lineage in reconciliation
instead of guessing. Later chapters may set, replace, or clear the relationship
through a normal character update.

Entity names preserve the source's primary surface form. When the source primarily
uses an acronym, that acronym remains the canonical visible and searchable `name`;
a source-supported expanded form belongs in the original `description`. Codex must
not replace the acronym with its expansion or invent an expansion.

## Description authoring standard

Every authored `description` is a concise, original, spoiler-safe
mini-encyclopedia entry. It must stand on its own rather than retell the chapter scene
where the entity appeared. A useful entry explains what the entity is, its durable
purpose or role, its defining characteristics at the selected reader boundary, and
why it matters.

Center every description on the entity. State capabilities in general language such
as `It can` or `It is used to`, not as a named character's recent action. A named
relationship remains only when it is defining or when a source-supported assessment
must be attributed. Chapter-specific facts may enrich the explanation, but a sentence
that only records who uses, owns, mentions, or discusses an entity is not sufficient.
Subjective assessments and forecasts remain attributed.

Require evidence that every capability belongs to the described entity. Querying an
interface for documentation, observing a capability through it, or using it as an
access path does not assign that capability to the interface.

Descriptions contain positive reader-visible facts, not disclosure-gap notices.
Omit sentences or clauses whose purpose is to say that a definition, expansion,
mechanism, capability, limitation, specification, or other detail is unrevealed,
unknown, unexplained, unavailable, or unspecified. If a sentence mixes useful
positive information with such a notice, retain only the supported positive
information when it remains coherent.

Transient operational condition belongs in `state` or `current_state` when the entity
type provides that field. Every `current_state` is one or two concise sentences about
only the latest known condition. It is not an identity definition, biography, chapter
summary, or accumulated adventure log.

The type-specific review checks are:

- Species: nature, distinguishing known traits, and reader-visible home or social
  context.
- Technology: kind, function, revealed operating principle, distinguishing
  capabilities or limitations, and acronym expansion.
- Organization: kind, purpose, constituency or scope, defining policies, and durable
  capabilities or relationships.
- Vessel: named ship, reusable design, or ship family, intended role, defining
  systems, capabilities, and limitations. One unified `vessel:*` record may cover the
  first named ship and the design family associated with it.
- Event: what happened, its durable outcome, and why it matters; structured fields
  continue to own date, location, and participant references.
- Location: kind, narrative context, and distinguishing reader-visible traits;
  `state` owns mutable condition and astronomy owns measured physical facts.

These checks never authorize invented completeness. A short partial entry is valid
when only some defining facts are supported. Omit absent facts from the description
and preserve them instead in sealed evidence, ledger uncertainty, reconciliation,
open questions, and human review. Do not import later chapters, model-memory facts,
or unsupported expansions.

Pass 1 therefore captures separate evidence-backed claims for definitions, functions,
purposes, operating principles, capabilities, limitations, and acronym expansions,
plus explicit uncertainty for checklist items the source does not reveal. Pass 2
applies the checklist after reconciliation with the preceding reader-visible state
and keeps those gaps out of reader-facing descriptions. This applies to the same
agents that prepare chapter summaries and candidates.

When human evidence review finds that an immutable sealed claim overstates its source,
record the adjudication in the skill's Pass-2-only fingerprinted reconciliation
exception registry. Pass 2 applies an exception only when chapter, source hash,
sealed-ledger hash, and claim ID all match. Blind Pass 1 never reads this registry,
and the original sealed ledger is never rewritten.

Description updates replace the complete field. Preserve useful prior reviewed
knowledge and integrate the newly revealed information rather than emitting only the
latest chapter fact.

## Narrative-moment ordering

Every dated fact authored by a chapter carries an ordering moment made from its
effective story date and canonical source chapter. Different years use numeric year
order. Same-year indexed dates use their explicit numeric indices; equal indexed
moments remain tied. Same-year year-only facts use canonical numeric chapter order.
A year-only date and an indexed date in the same year remain incomparable.

Apply this rule consistently during reconciliation to state writes, appearances,
dated events, and any generated activity those facts will produce. Do not add
mechanical indices merely to reproduce canonical chapter order. If the source reveals
that within-year chronology differs from chapter order, surface the conflict for
review and use supported consistent indices rather than silently overriding it.
Requested display dates and chronologically unplaced events have no source-chapter
moment and remain outside this fact-to-fact fallback.

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
entities. A source-supported city, town, settlement, or durable, independently useful
base or station may be authored as a location. Use `locale` for ordinary stations and
bases. Reserve `megastructure` for engineered structures exceptional in physical
scale.

Eligible scale is not sufficient by itself. Incidental, unnamed, short-lived, or
otherwise disposable places remain unmodeled. Rooms, corridors, laboratories,
offices, floors, individual buildings, and comparable internal facility spaces must
not be introduced or updated as locations.

The restriction also applies to chapter defaults, appearance locations, and event
locations. Use the most specific eligible reader-visible location supported by the
source. If a fine-grained locale is unavailable or omitted, climb the established
hierarchy to its nearest supported reader-visible parent. Do not invent containment,
promote an ineligible place, or create a disposable location merely because a
structured field is required.

Blind Pass 1 still captures fine-grained location and movement claims with sealed
evidence. During reconciliation, Pass 2 records an explicit `not-modeled` granularity
decision and keeps relevant facts in the chapter summary, an event description, or
another suitable entity description. The rule therefore limits browser granularity
without deleting source knowledge.

### System surveys

Beginning with Chapter `1.16`, a source-described system survey overrides the
ordinary durable-location curation threshold for celestial bodies. Blind Pass 1 must
inventory every surveyed planet, dwarf planet, and moon occurrence and create
separate evidence-backed claims for every supported aggregate, class, colour,
visible/surface, gravity, and other descriptive fact. It must retain the source value
and unit for every numeric gravity claim. Pass 2 must account for every such claim and
author every surveyed planet or dwarf planet as a location; no importance,
habitability, or rendering threshold permits omission.

Locations of kind `planet`, `dwarf_planet`, and `moon` may use these optional
spoiler-projected fields:

- `body_class`: `rocky`, `icy`, `dwarf_planet`, `gas_giant`, or `ice_giant`;
- `color`: concise source-faithful colour wording;
- `visual_description`: visible appearance only;
- `surface_gravity_g`: a positive finite numeric surface gravity in Earth gravities.

Retain a direct Earth-gravity value at the precision stated by the source. Convert a
source value in metres per second squared with
`surface_gravity_g = surface_gravity_m_s2 / 9.80665`, retaining no more significant
digits than the source, and record the conversion in reconciliation. Gravity in
other units, qualitative gravity, and every non-field survey fact remain in
`description`; a missing dedicated field is never permission to discard evidence.
For example, direct `1.20 g` becomes `surface_gravity_g: 1.20`, while
`19.6 m/s² / 9.80665` becomes `surface_gravity_g: 2.00`; neither example invents
precision.

Author at most four direct moon children for one surveyed body. Prefer named or
distinctly described moons, then moons the source explicitly supports as largest,
then source order. An exact count creates `min(count, 4)` children; an unqualified
statement of many moons creates four. Count-only children use `Moon 1` through
`Moon 4`; their stable IDs use the parent suffix followed by `-moon-01` through
`-moon-04`, assigning the lowest collision-free suffix after named or distinct
children. Retain the complete count or qualifier in the parent description.
Anonymous numbering and child order are decorative inventory, never physical
distance or orbital order. If a later chapter supplies names without uniquely
linking identities, bind names in source-mention order to the lowest anonymous
ordinals and retain those stable IDs.

ADR-0021 defines one fingerprinted Chapter `1.19` exception for the source-supported
phrase `several outer Jovians`. Reconciliation authors three distinct anonymous
gas-giant locations as the guaranteed lower bound, retains `several` in the system
description, and claims neither an exact total nor unsupported measurements. This is
not a general conversion rule for qualitative counts. The three stable presentation
ordinals follow OE-2 in the ADR-0020 schematic sequence; later names without unique
identity evidence bind in source order to the lowest still-anonymous ordinal.

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
task. Before applying the candidate:

1. Build a fresh temporary narrative root from the current canonical baseline,
   assets, books, and chapters plus the exact approved candidate at its intended
   chapter path.
2. Run narrative validation against that temporary root.
3. Run `npm run data:validate -- --narrative-root <temporary-root>`.
4. If the mapped stellar-system name is an exact normalized match for one unique
   accepted astronomy system name or alias, ADR-0016 permits the source-backed
   bootstrap to resolve automatically without separate approval. Fuzzy, partial,
   punctuation-different, multiple, unsupported, or source-incomplete matches stop
   for an authorized astronomy task.
5. If either preflight fails, do not change canonical chapter files or the promotion
   log.
6. Only after both checks pass, write the exact approved candidate canonically and
   confirm the canonical JSON remains value-identical; standard formatting may
   change whitespace only.
7. Run the post-write validation below.
8. Append one row to [the chapter-promotion log](chapter-promotion-log.md) with the
   chapter, approval date, canonical SHA-256, validation result, and any material
   editorial decision.

Create a task instead when the work changes code, schemas, contracts, tooling, or
includes broader editorial remediation beyond the approved chapter candidate.

### Standard promotion preflight

```bash
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root "/absolute/path/to/temporary/narrative-root"
npm run data:validate -- \
  --narrative-root "/absolute/path/to/temporary/narrative-root"
```

### Standard post-write validation

```bash
chapter_ref="1.3" # Replace with the approved chapter.
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm run narrative:generate -- --chapter "$chapter_ref" --output "/tmp/bobiverse-world-$chapter_ref.json"
npm run format:check
npm run lint
npm run typecheck
git diff --check
```
