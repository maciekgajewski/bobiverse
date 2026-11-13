# Chapter extraction contract

This is the single authoritative contract for turning one lawfully obtained plaintext
chapter into a spoiler-safe candidate chapter object and promoting an approved
candidate. It is provider-independent. Companion files:

- [Operator checklists](chapter-extraction-checklists.md): short run sheets that
  cite this contract and restate no rules.
- [Pass 1 blind brief](../.codex/skills/extract-bobiverse-chapter/references/pass1-blind-brief.md):
  the rules-only part of this contract that is staged to blind Pass 1. It is part of
  this contract; §Pass 1 blind claim capture points to it instead of repeating it.
- [Claim ledger format](../.codex/skills/extract-bobiverse-chapter/references/claim-ledger.md).
- [Codex adapter](../.codex/skills/extract-bobiverse-chapter/SKILL.md): Codex
  invocation, the conforming profile and spawning mechanics only.

Sections are cited by heading, as in §Context isolation, never by dotted numbers,
which would collide with chapter references.

Field shapes and ownership belong to [the data model](data-model-definition.md);
accepted ADRs and [the technical design](technical-design.md) Section 13 bind this
contract. If they conflict with it, stop and surface the conflict (AGENTS.md).

## Scope and authority

1. The workflow is an editorial assistant. Model output is a candidate, never
   authority, and nothing is silently published. Process exactly one chapter per run.
2. Every invocation is review-only. Invocation alone never authorizes a canonical
   write. Write canonical JSON only after the Captain separately approves the exact
   reviewed candidate and explicitly asks to apply it. `dry-run` always prevents a
   canonical write, even after quality approval.
3. Routine promotion of an exact approved candidate needs no per-chapter task
   (AGENTS.md). Create a task instead when the work changes code, schemas,
   contracts, tooling, or includes broader editorial remediation beyond the approved
   chapter candidate.
4. Never commit or copy off the host: source text, evidence excerpts, draft or sealed
   ledgers, temporary candidates, or temporary narrative roots. Keep source evidence
   outside the published application and outside version control.
5. Never send book text to an external model unless the Captain has explicitly
   approved the provider and workflow (§Approved alternative).
6. Roles and the authority split are defined in AGENTS.md, not here.
7. Do not use Kindle Computer Use in the initial workflow. It is recorded only as
   possible future verification for questionable plaintext conversion or disputed
   evidence.

## Inputs

Require the repository root, an explicit canonical chapter reference such as `1.3`,
and one UTF-8 source file outside the repository. Accept source filenames only as
`<book>.<chapter>.txt` or `<book>.<chapter> - <source title>.txt`. The filename is
authoritative for an optional source title, and its numeric prefix must match the
explicit chapter. The candidate `title` is the chapter component after the dot: `3`
without a source title, or `4 - Example Title` with one. Use
`source_evidence.py metadata` to validate these rules and fingerprint the exact
source bytes.

Operators need not repeat the blind-extraction, evidence, validation, comparison,
approval, or no-write instructions; they are mandatory parts of the workflow. The
Codex invocation is documented in the adapter.

## Execution profiles and prerequisites

### Conforming profile

The conforming profile is the Captain-approved Codex profile pinned by BOB-028: Pass
1 and Pass 2 run in separately spawned Codex agents with `model: gpt-5.6-terra`,
`reasoning_effort: high`, and `fork_turns: none`, never inherited from the
orchestrator. A pass that runs with inherited configuration is invalid. The adapter
holds the exact spawning instructions.

### Prerequisite check

Before any model reads source text, the operator verifies that the conforming profile
can actually be requested: a Codex launcher is available to the operating account and can
explicitly set the model, reasoning level, and non-forked spawning for both passes
(Checklist A). Status on 2026-11-12: piotr has no `codex` binary for
`grok-developer`, so a conforming run is not possible there.

[`scripts/extraction_preflight.py`](../scripts/extraction_preflight.py) automates
Checklist A items 1–8, using the derived profile record
[`profile.json`](../.codex/skills/extract-bobiverse-chapter/profile.json); the
adapter's sentences stay the source of truth. For this check it runs
`codex --version`, which confirms only that the launcher is present and reports a
version, not that it can set these values.

### No silent substitution

If the conforming profile, or any part of it, is unavailable for either pass, stop
and ask the Captain before substituting another configuration.

### Approved alternative (NON-CONFORMING)

A different runtime, provider, or model may run only after the Captain explicitly
approves that provider, model, and workflow for the run. Such a run:

- is labelled **NON-CONFORMING** in every artifact, the review package, the approved
  chapters repository, and the promotion-log decision cell;
- keeps every isolation rule in §Context isolation, including separately started
  fresh contexts for Pass 1 and Pass 2;
- records the requested profile, the actual runtime and model as reported, and the
  approval wording, date, and relay path;
- never claims a setting that the runtime cannot show, such as a reasoning level;
- still needs separate exact-candidate approval before promotion.

**Open Captain decision D1:** whether an alternative approval may be standing rather
than per run, and which providers and models qualify. Until D1 is decided, the
current rule applies: every substitution needs the Captain's explicit approval of the
provider, model, and workflow (§No silent substitution). The 2026-11-09 approval
named only the Chapter `1.42` verification.

## Context isolation

1. Create a new workspace with `mktemp -d`. Put draft claims, sealed evidence,
   candidate JSON, and the temporary narrative root only there. Record the initial
   `git status`.
2. Pass 1 runs in a fresh isolated context. Never use the orchestrating conversation
   for blind extraction, even if it appears not to have read canonical state. The
   orchestrator may already contain zero state, preceding chapters, target state,
   generated projections, entity identities, or facts from an earlier run.
3. Stage only the Pass 1 blind brief, `claim-ledger.md`, the source file, and the
   evidence helper for Pass 1. No other contract text, including this document, is
   staged to Pass 1.
4. Do not stage the narrative schema, canonical corpus, active task, full integrated
   contract documents, ADR examples, tests, fixtures, or any other repository file
   merely because the orchestrator read it. The canonical narrative schema belongs to
   Pass 2: it contains canonical constants and is not a blind-extraction input.
5. The Pass 1 forbidden-read list is in the blind brief and is binding.
6. Pass 2 runs in a separately started fresh context, staged only with the sealed
   Pass 1 ledger and the canonical material permitted in §Pass 2 inputs. It must not
   inherit the orchestrator's broader conversation or receive later-chapter state.
7. The event and reconciliation exception registries are read only in Pass 2, never
   in Pass 1.
8. These rules apply under every execution profile. Running the blind and
   reconciliation stages sequentially in one worker does not satisfy them.

## Pass 1 blind claim capture

Pass 1 follows the blind brief and writes the format in `claim-ledger.md`. After
sealing, Pass 1 calculates and records the sealed-ledger SHA-256, verifies that every
chunk ID was processed, and stops. Source claims are never revised later merely to
match canonical state.

## Pass 2 reconciliation

### Pass 2 inputs

Begin only from the sealed Pass 1 ledger. Load the reader-visible canonical state
immediately before the target chapter: for the first chapter, use only zero state;
otherwise, generate the preceding chapter projection; never use later chapters to
resolve an earlier chapter. The narrative schema, `AGENTS.md`, binding ADRs, and any
active task may be read in Pass 2.

After verifying the chapter, source SHA-256, and sealed-ledger SHA-256, read the
reconciliation exception registry. Apply only entries whose complete fingerprinted
key (chapter, source hash, sealed-ledger hash, and claim ID) matches. Keep the sealed
ledger immutable and record each applied exception in the reconciliation report.
When human evidence review finds that a sealed claim overstates its source, record
the adjudication in that registry; the original sealed ledger is never rewritten.

### Classification

Classify each claim as `introducing`, `update`, `appearance`, `supplemental-mention`,
`already-known`, `not-modeled`, `unsupported`, or `ambiguous`. Use `not-modeled`
only for a source-supported claim intentionally omitted from the companion model
because it is incidental, redundant at the chapter-object level, or lacks enough
identity to support a durable entity. Record the editorial reason. Never use it to
hide an unresolved contradiction or weak evidence.

### Identity, names, and ordering

Resolve `source_mentions` against known entities and aliases. Entity names preserve
the source's primary surface form. When the source primarily uses an acronym, that
acronym remains the canonical visible and searchable `name`; a source-supported
expanded form belongs in the original `description`. Never replace the acronym with
its expansion or invent an expansion.

Do not invent an ID, chronology, coordinate, relationship, or missing field. Preserve
introduction ordering, reference ordering, update ownership, unknown-location
behavior, astronomy ownership, and original-summary requirements. An entity
introduced in the target chapter contains its reader-visible end-of-chapter state in
that introduction and is not also placed in `updates`; updates are only for entities
visible before the chapter. Order introductions so every reference points to zero
state or an earlier introduction. If two new entities would otherwise create a
reference cycle, omit an optional reverse reference rather than violating ordering or
inventing a workaround.

Ask the Captain one question at a time for material ambiguities. Keep the sealed
source claim unchanged and record the reconciliation decision separately.

### Supplemental mentions

For Chapter `1.14` and later (ADR-0017), classify every resolved source mention
against supplemental-mention completeness. Promote it to `supplemental-mention` when
it is a source-supported reference to an already visible direct narrative entity or
location and the target is absent from every other typed direct narrative reference
in the chapter. Structural references include introduction/update targets,
appearances, chapter locations, event participants and locations, character
`species_id`, `death_event_id`, and `parent_id`, species `homeworld_id`, and location
`parent_location_id`, `origin_location_id`, and `destination_location_id`. Asset and
astronomy IDs are not mention targets, and ID-shaped prose is not structural. Do not
apply an importance or curation threshold. A supplemental mention advances otherwise
absent narrative activity; do not infer presence, participation, ownership,
membership, location, use, relationship, or state from it. Each qualifying canonical
`mentions` entry is mandatory, requires sealed evidence, and receives its own
explicit row in the human-review table. A mentioned mapped location retains derived
`mapped_system_ancestry` activity.

### Lineage

For source-supported lineage, author the child's optional `parent_id` with sealed
evidence. The same field supports replicant and biological genealogy. A replicant
parent is the character state or backup from which the child was copied, not merely
the operator who ran the creation process. Never infer ancestry from similar names,
behavior, species, backup possession, or operation of cloning machinery. An
unresolved parent remains a reconciliation question. Later chapters may set,
replace, or clear the field through an ordinary character update.

### Event significance

Reserve canonical `event:` entities for major, memorable turning points in the book
timeline whose durable consequences shape the fate of many beings, not only the
principal characters. Require all of the following: a distinct occurrence in the
narrative timeline; significance and memorability beyond routine scene activity;
durable consequences rather than a temporary condition or local status change; and a
consequence scale that reaches a community, civilization, species, or otherwise many
beings beyond the immediate participants.

Battles, first contact, consequential discoveries or technological breakthroughs,
revolutions, and natural or artificial disasters commonly qualify when they also pass
the consequence tests; category membership alone is not sufficient. Violence,
novelty, scene length, or importance to one principal character is not sufficient by
itself. Conversations, confrontations, conventions, routine operations, training,
selection processes, personal realizations, isolated attacks or accidents, and
temporary setbacks remain summary or entity-state facts unless their lasting scale
passes the gate. Do not use an event as a cumulative status record for an ongoing
process when ordinary entity state represents the durable knowledge.

A foundational inciting incident whose immediate impact is personal may qualify when
its clear long causal chain produces series-wide consequences for many beings. Apply
this exception only from the project-ratified event exception registry, read in Pass
2; never read later chapters to discover or justify it. Its reader-facing name,
description, date, location, and participants stay strictly spoiler-safe at its
introduction boundary; later consequences justify eligibility but are not revealed
early. `event:bob-road-incident` is the ratified case. The retroactive audit retained
it and removed The Vortex, the replicant candidate-selection process, and the
project-complex raid as event entities.

Classify a rejected event claim as `not-modeled`, record the failed significance or
scale test, and preserve useful facts in the summary or an appropriate entity record.

### Locations

Use `colony_of` only for durable, reader-visible established presence: a settlement,
colony, or operated prominent installation. Do not infer it from visits, vessels,
character appearances, surveys, or transient activity. Use `possible_colony_target`
for an explicitly plausible future settlement target, including worlds that need
substantial technological assistance, sealed habitats, or terraforming. Mark
`prominent` only when the location itself warrants a main-map installation marker;
it is not a new location kind. Never apply these fields to transit locations.

Settlement scale is the minimum ordinary granularity for narrative locations. A
source-supported city, town, settlement, or durable, independently useful base or
station may be a location. Use `locale` for an ordinary station or base. Reserve
`megastructure` for an engineered structure exceptional in physical scale; size is
part of the classification, not a synonym for every space-based installation.
Eligible scale is not sufficient by itself: require durable narrative identity. Do
not introduce an incidental, unnamed, short-lived, or otherwise disposable place
merely because the chapter or an appearance requires a location. Never introduce or
update a room, corridor, laboratory, office, floor, individual building, or
comparable internal facility space as a location.

The restriction also applies to chapter `location_id`, appearance locations, and
event locations. Use the most specific eligible, reader-visible location supported by
the source. If a fine-grained locale is unavailable or intentionally not modeled,
climb its established hierarchy and use the nearest supported reader-visible parent.
Never invent containment, promote an ineligible place, or create a placeholder merely
to satisfy a required field. Classify a source-supported fine-grained place as
`not-modeled` for location granularity, record that reason, and keep relevant facts
in the chapter summary, an event description, or another suitable entity
description. The rule limits browser granularity without deleting source knowledge.

### System surveys

Beginning with Chapter `1.16`, a source-described system survey overrides ordinary
durable-location curation for celestial bodies. Author every surveyed planet or dwarf
planet as a location and account for every sealed survey claim; no importance,
habitability, or rendering threshold permits omission. A location whose effective
kind is `planet`, `dwarf_planet`, or `moon` may use `body_class` (`rocky`, `icy`,
`dwarf_planet`, `gas_giant`, or `ice_giant`), `color` (concise source-faithful
colour wording), `visual_description` (visible appearance only), and
`surface_gravity_g` (a positive finite number in Earth gravities).

Retain a value already in Earth gravities at source precision. Convert metres per
second squared with `surface_gravity_g = surface_gravity_m_s2 / 9.80665`, keep no
more significant digits than the source, and record the conversion in reconciliation.
For example, direct `1.20 g` becomes `surface_gravity_g: 1.20`, while
`19.6 m/s² / 9.80665` becomes `surface_gravity_g: 2.00`; neither invents precision.
Gravity in other units, qualitative gravity, and every other survey fact remain in
`description`; a missing dedicated field never permits discarding evidence.

Author at most four direct moon children per surveyed body. Prefer named or
distinctly described moons, then source-supported largest moons, then source order.
An exact count creates `min(count, 4)` children; an unqualified statement of many
moons creates four. Count-only children are `Moon 1` through `Moon 4`; their stable
IDs append `-moon-01` through `-moon-04` to the parent location suffix, using the
lowest collision-free suffix after named or distinct children. Retain the complete
count or qualifier in the parent description. Treat numbering and child order as
decorative inventory, not physical orbital order or distance. If later names have no
unique identity link, bind them in source-mention order to the lowest anonymous
ordinals and retain the stable IDs.

ADR-0021 defines one fingerprinted Chapter `1.19` exception for the phrase `several
outer Jovians`: reconciliation authors three distinct anonymous gas-giant locations
as the guaranteed lower bound, retains `several` in the system description, and
claims neither an exact total nor unsupported measurements. It is not a general rule
for qualitative counts. The three stable ordinals follow OE-2 in the ADR-0020
schematic sequence; later names without unique identity evidence bind in source
order to the lowest still-anonymous ordinal.

### Descriptions

Every authored `description` is a concise, original, spoiler-safe mini-encyclopedia
entry, not a narrative extract or a retelling of the scene where the entity appeared.
A reader who sees only the name and description should understand what the entity
is, its durable purpose or role, its defining characteristics at the selected reader
boundary, and why it matters. Apply this quality gate:

- begin with a standalone definition or classification when evidence supports one;
- explain durable purpose, function, scope, characteristics, capabilities, and
  limitations that distinguish the entity;
- center the description on the entity, not on a named character's recent actions;
- state capabilities in general language such as `It can` or `It is used to`, not as
  a named character's action; retain a named relationship only when it is defining or
  a source-supported assessment must be attributed;
- require evidence that each capability belongs to the described entity; querying an
  interface for documentation, observing a capability through it, or using it as an
  access path does not make that interface the capability's owner;
- use chapter-specific facts only when they improve the general explanation; a
  sentence that only says who uses, mentions, owns, or discusses the entity is not
  sufficient;
- keep subjective assessments and uncertain forecasts explicitly attributed;
- omit every disclosure-gap statement from descriptions (ADR-0015), including
  semantic variants such as `has not yet been revealed`, `remains unknown`, `has not
been explained`, or `full specifications are unavailable`; when a sentence mixes a
  positive fact with a disclosure gap, retain only the supported positive fact when
  it remains coherent;
- do not duplicate structured fields unless needed for a coherent standalone entry;
- keep transient operational condition in the type's `state` or `current_state`;
  author every `current_state` as one or two concise sentences describing only the
  latest known condition, never identity, biography, chapter synopsis, or accumulated
  adventure history;
- never import later knowledge, model-memory facts, or unsupported expansions to make
  an entry sound complete.

Type checklists:

- `species`: source-supported sentience and civilization-creating capacity, what
  kind of beings they are, distinguishing known traits, and reader-visible home or
  social context. Only populations meeting both gates are modeled; animals,
  predators, and other non-sentient life remain unmodeled as `species:` entities and
  appear only as concise context in an eligible entity, event, or chapter summary;
- `technology`: what kind of technology it is, what it does, how it works at the
  revealed level, distinguishing capabilities or limitations, and any
  source-supported acronym expansion;
- `organization`: what kind of organization it is, its purpose, constituency or
  scope, defining policies, and durable capabilities or relationships;
- `vessel`: what named ship, reusable design, or ship family it represents, its
  intended role, defining systems, capabilities, and limitations; one unified
  `vessel:*` record may cover the first named ship and the design family associated
  with it, without separate instance and class entities, and may own an optional
  brief `current_state`;
- `event`: what happened, its durable outcome, and why it matters; structured fields
  own date, location, and participants;
- `location`: what kind of place it is, its narrative context, and distinguishing
  reader-visible traits; `state` owns mutable condition and the astronomy authority
  owns measured physical facts.

These checks never authorize invented completeness. A short partial entry is valid
when only some defining facts are supported. Omit absent facts from the description
and keep them in sealed evidence, ledger uncertainty, reconciliation, open questions,
and human review. Missing knowledge belongs in reconciliation and human-review
artifacts, not in the candidate description or a substitute invented fact. Before
validation, audit every candidate `description` for semantic disclosure-gap language;
this applies even when the same agent also prepares the chapter summary.

Description updates replace the complete field. Preserve useful prior reviewed
knowledge and integrate the newly revealed information rather than emitting only the
latest chapter fact. When updating an existing description, start from the complete
prior reviewed entry and integrate the newly supported information; never erase
useful reader-visible knowledge by emitting only the new chapter fact. §Reading order
and story dates records an open decision about this rule; the rule stays in force.

### Summaries

Every chapter `summary` is an original, spoiler-safe synopsis of what happens, not a
dateline. The structured chapter `date` is displayed separately, so never begin the
summary by restating its year, month, day, or an equivalent temporal lead, and do not
mechanically substitute the chapter's default location for that lead. Begin with the
chapter action, subject, or change. Retain a location only when it is a natural part
of the synopsis, such as a journey, arrival, survey target, or another fact needed to
understand what happens.

## Reading order and story dates

Reader order is the spoiler-visibility gate and story time is the state-projection
gate (ADR-0002); they are never collapsed. Every dated chapter-authored fact carries
an ordering moment made from its effective story date and canonical source chapter
(ADR-0009, ADR-0013, and `adrs/0026-calendar-precision-narrative-dates.md`). Author
dates as `YYYY[-MM[-DD]][.d+]`, preserving exactly the Gregorian precision stated by
the heading or opening-scene boundary. Non-overlapping calendar ranges order
normally. Identical calendar portions compare the effective suffix (omitted means
zero), then canonical chapter; overlapping unequal-precision chapter facts use
canonical chapter. Apply this rule consistently to state writes, appearances, dated
events, and any generated activity. Requested display dates use range containment
without a chapter fallback, and chronologically unplaced events have no
source-chapter moment.

Do not add mechanical suffixes merely to force validation or reproduce canonical
chapter order. If the source reveals that chronology differs from chapter order,
preserve its calendar precision and use a source-backed suffix only when needed for
ordering at the same calendar portion. A suffix is never a fractional year, month, or
day and never appears in reader-facing text. The reviewed 2158 sequence uses real
month precision: Chapter `1.31` is `2158-01`, Chapter `1.33` is `2158-03`, Chapters
`1.34` and `1.36` are `2158-09`, and Chapter `1.32` is `2158-10`.

**Open Captain decision D2.** When reading order and story dates diverge, the
full-field update rule in §Descriptions can carry a fact into an update dated earlier
than the chapter that first established it. Under ADR-0002, an existing later-dated
write can also hide newly revealed knowledge at later story dates. The current rule
in §Descriptions stays in force until the Captain decides D2; no other baseline
applies. As reporting only, the review package lists every update whose prior entry
contains a fact first established at a later story date than the target chapter's.
This list is not a promotion gate, and it must not be used to rewrite a candidate
while D2 is open.

The options are recorded in BOB-20261112-1TWD9T.

## Candidate assembly and temporary corpus

Create candidate JSON under `/tmp`, never directly under `data/narrative/`. Build a
new temporary narrative root with `source_evidence.py prepare-corpus`. It copies the
canonical zero state, assets, books, and species presentation registry
(`data/presentation/species.json` as `presentation/species.json`), the canonical
chapters strictly before the target, and the candidate as the target chapter. The
root must be new, outside the repository, and not named `narrative`. The helper's
JSON output records the base Git commit, whether the canonical inputs were clean
(`inputs_clean`, with `dirty_paths`), and the SHA-256 of every copied file and of the
candidate. Keep that output with the review package and explain any unclean or
unknown result.

After manually staging canonical files into any checkout, run
`npm run narrative:manifest` before generating projections, and confirm that the
manifest lists exactly the intended chapters.

Validate the temporary root:

```bash
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root "/absolute/path/to/temporary/narrative-root"
npm run data:validate -- \
  --narrative-root "/absolute/path/to/temporary/narrative-root"
```

The repository narrative validator is authoritative. A local JSON Schema check does
not replace temporary-corpus validation, because repository rules also enforce
cross-record ownership and reader-order constraints. Repair representation errors
only. Do not manufacture source facts to make validation pass; if a required value
remains uncertain, stop and ask the Captain.

For a dry-run evaluation, freeze the validated candidate and record its SHA-256
before reading the existing target chapter. Then compare omissions, unsupported
claims, reconciliation choices, and review effort. Do not silently alter the
candidate to resemble the existing file.

## Astronomy preflight and isolated acquisition

Astronomy validation is mandatory before canonical promotion. Run it on the exact
prior chain before extraction (Checklist A), so that a baseline failure is not
mistaken for a candidate failure. Never bypass an exact-plan failure.

Identify the exact prior chapter chain used for extraction (including any earlier
staged chapters); record its root, baseline revision, and pinned astronomy context.
Run narrative and astronomy validation against that exact prior root.
Canonical-master success is not a substitute. If it requires new acquisition, stage
it as below before proceeding.

Under ADR-0016, an exact normalized narrative name that is unique across one accepted
astronomy system's effective name and aliases receives a deterministic source-backed
bootstrap without separate Captain approval. Normalization only case-folds, trims,
and collapses whitespace. Never remove punctuation or use fuzzy, partial, phonetic,
coordinate, or model-confidence matching. If the accepted identity, adopted
component, source-backed geometry, or pinned coverage cannot support the anchor,
stop before any canonical write and report the required astronomy task.

If identity resolves but validation reports `Narrative anchors require a GCNS
acquisition plan not covered by the pinned sources`, stage new acquisition for the
listed anchors as below; do not conclude that the validator contract must change.
An `acquisition queries differ from the exact plan` error instead requires
investigating inconsistent or tampered query accounting; do not assume a refresh
will resolve it or hand-edit the manifests. An existing anchor row alone does not
prove that its explicit bootstrap query, complete context sphere, and provenance
accounting are current. The canonical refresh discovers
anchors from canonical narrative data, but never copy an unapproved candidate into
the real worktree merely to make refresh see it. Instead:

1. Create an isolated disposable checkout from the exact repository revision under
   review and record its clean baseline.
2. Verify the sealed-ledger and candidate hashes. Install the exact candidate, or
   exact ordered candidate chain, at its intended canonical paths only inside that
   isolated checkout. Preserve the exact prior-root context as well as the complete
   staged chain; neither may be replaced with an unrelated canonical baseline.
3. Run narrative validation and the normal astronomy preflight against the exact
   staged root. Record any uncovered-anchor diagnostic as a failure requiring
   acquisition, then run the normal networked astronomy refresh. Do not generate
   runtime astronomy from a changed candidate snapshot yet. See
   [the pipeline staging order](data/astronomy-pipeline.md#chapter-driven-staging-order).
4. Inspect the complete astronomy diff. Permit only required bootstrap and coverage
   acquisition, query accounting, checksums, and deterministic consequences.
   Unrelated substantive catalogue, identity, naming, membership, adopted-source,
   adopted-component, coordinate-authority, or review drift is prohibited.
5. If refresh changes `system-candidates.json`, stop before accepting or generating
   from that snapshot. Spawn a fresh, read-only independent agent to inspect the
   complete baseline, refresh, candidate snapshot, and formatted diff under ADR-0023.
   It may accept only exact anchor acquisition, unchanged-source metadata, new rows
   inside the requested coverage, unaccepted derived review candidates, and
   deterministic ADR-0011 source-precedence geometry. It must reject stable-ID,
   identity, name, alias, membership, adopted-component, authority, accepted-WDS,
   ambiguity, unrelated substantive source, unsupported-coordinate, or judgmental
   changes and escalate them to the Captain.
6. A clean independent acceptance records the agent identity, UTC date, old and new
   value checksums, permitted semantic changes, and absence of prohibited changes.
   Only then may the orchestrator update the checksum and transparent agent-review
   attribution in `system-review.json`; the reviewer never edits the metadata it
   judged. If the checksum is unchanged, record that fact without a redundant review.
7. After any required snapshot acceptance, generate runtime astronomy. A pre-refresh
   runtime file carries the previously accepted provenance; treat it as stale, not
   as part of the snapshot review. Generation must propagate the current WDS manifest
   candidate count and checksum into runtime metadata and verify the written artifact
   before the combined review.
8. Run narrative and astronomy validation against the complete staged candidate chain.
   Retain a passing exact-prior-chain preflight with its matching source/plan context;
   if that prior chain needed acquisition, validate it separately before using it
   for extraction. Do not test a prior root against a refreshed full-chain plan when
   their anchor sets differ: extra queries correctly fail the exact-plan guard too.
   The final combined-chain preflight must pass; no earlier failure was waived.
9. Present the exact combined chapter-and-astronomy diff. Apply no part of it to the
   real worktree until the Captain approves that exact combined result.
10. Apply the approved result atomically, revalidate the canonical corpus, and append
    the promotion-log rows. Never copy the disposable checkout, source text, ledgers,
    evidence excerpts, or unrelated refresh drift into the repository.

Never hand-edit downloaded manifests, checksums, normalized extracts, candidates, or
generated runtime to bypass refresh. This staging path changes neither astronomy
authority nor spoiler projection: static astronomy acquisition may precede a
narrative reveal, while runtime narrative mapping remains governed by approved
chapter records.

## Review package

Resolve human-review questions one at a time, then present:

- the execution profile requested and actually used for each pass, with the
  NON-CONFORMING label and approval reference when §Approved alternative applies;
- source fingerprint and chapter/title derivation, sealed-ledger SHA-256, and the
  `prepare-corpus` provenance output;
- the candidate JSON and its frozen SHA-256;
- a claim-to-classification table;
- every resolved source mention, its stable ID when resolved, structural-redundancy
  decision, classification, and sealed evidence ID, including qualifying
  supplemental mentions, structurally represented references, later or unresolved
  targets, and intentionally unmodeled mentions;
- evidence IDs with bounded excerpts rendered by `source_evidence.py review`; these
  stay on the extraction host;
- unresolved or low-confidence items and applied exceptions;
- the D2 list from §Reading order and story dates. It is not a promotion gate and
  must not be used to rewrite a candidate while D2 is open;
- narrative and astronomy preflight output, including any automatically resolved
  mapped-anchor bootstrap;
- the exact canonical diff that approval would create, or the exact combined
  chapter-and-astronomy diff when isolated staging was required.

## Approval, promotion, and provenance

### Approval

Review the exact candidate, then ask explicitly, for example: `Accept this
candidate.json as chapter 1.2.` A task-scoped dry run stops without writing even if
the candidate is approved for quality.

### Checksum provenance

- Label every hash by kind: file SHA-256 of exact bytes, Git commit, or Git blob.
  Never cite a bare prefix without its kind.
- Record the source SHA-256, sealed-ledger SHA-256, approved-candidate SHA-256, and
  canonical file SHA-256, plus the base revision.
- Standard formatting at promotion may change whitespace only, and the canonical JSON
  must remain value-identical. When formatting changes bytes, record both the
  approved and canonical SHA-256.
- After approval, the Extractor records the run's allowlisted outputs (candidate,
  validation results, approval reference; never book text or free-form review
  notes) in the local no-remote repository `~/bobiverse-approved-chapters` with
  `scripts/chapter_promotion.py record`, which tags it `chapter-<ref>-approved`.
  The developer then runs `scripts/chapter_promotion.py promote`. It reruns the
  offline validators, writes canonically, appends the log row and runs
  §Post-write validation, restoring everything on failure. Isolated acquisition
  (§Promotion step 3) stays manual. `verify` checks tagged chapters.
- The promotion-log decision cell records the approved-candidate SHA-256 when it
  differs from the canonical one, the approved-chapters commit and tag, and any
  NON-CONFORMING label. Historical rows are never rewritten.

### Promotion

1. Build a fresh temporary narrative root from the current canonical baseline,
   assets, books, presentation registry, and chapters plus the exact approved
   candidate at its intended chapter path (§Candidate assembly and temporary corpus).
2. Run both validators from §Candidate assembly and temporary corpus against that
   root.
3. Resolve astronomy under §Astronomy preflight and isolated acquisition.
4. If either preflight fails, leave canonical chapter files and the promotion log
   byte-for-byte unchanged.
5. Only after both pass, write the exact approved candidate canonically and confirm
   that it remains value-identical.
6. Run the post-write validation below. When an active task exists for broader work,
   also run its validation commands and update directly affected documentation.
7. Append one row to [the chapter-promotion log](chapter-promotion-log.md) with the
   chapter, applied date, canonical SHA-256, validation result, and material
   editorial decisions (§Checksum provenance).

### Post-write validation

```bash
chapter_ref="1.3" # Replace with the approved chapter.
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm run narrative:generate -- --chapter "$chapter_ref" --output
"/tmp/bobiverse-world-$chapter_ref.json"
npm run format:check
npm run lint
npm run typecheck
git diff --check
```
