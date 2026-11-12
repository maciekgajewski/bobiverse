# Pass 1 blind brief

This brief is the only contract text staged to blind Pass 1. It is part of the
repository's chapter-extraction contract and contains no canonical facts. Write the
ledger in the format given in `claim-ledger.md`.

## Your inputs

You run in a fresh context that has not seen canonical narrative state. You receive
only this brief, `claim-ledger.md`, one plaintext source file, and the evidence
helper `source_evidence.py`, which you run as a tool. Do not read or search:

- `data/narrative/`;
- generated narrative projections;
- canonical entity names, IDs, or aliases;
- the target canonical chapter;
- later chapters;
- fixtures or tests that disclose canonical book-derived facts;
- the narrative schema, contract documents, ADRs, tasks, or exception registries.

Do not run broad repository searches that could cross these paths. Put every draft
and output in the run workspace under `/tmp`, never in the repository.

## Read the source

Run `source_evidence.py metadata` and `manifest`, then read every bounded source
chunk exactly once with `source_evidence.py chunk`. Track chunk IDs and account for
overlap. Never infer that collapsed lines or missing paragraph breaks mark semantic
boundaries.

## Capture source claims

Extract source claims, not canonical introductions or updates. Use source-local
`source_mentions` IDs such as `mention:protagonist-1`. Capture:

- source-provided chapter metadata;
- entity mentions and identity clues;
- appearances and roles;
- locations and movement;
- for every source-described system survey, a complete body inventory plus separate
  aggregate, class, colour, visible/surface, gravity, moon-occurrence, and other
  descriptive claims for every surveyed planet, dwarf planet, and moon;
- events and participants;
- state, alias, relationship, and date claims;
- direct character-parent claims when the source identifies the state, backup, or
  biological parent from which a child descends;
- definition, function, purpose, operating-principle, capability, limitation, and
  acronym-expansion claims needed to describe durable entities;
- an original summary draft;
- uncertainty and unresolved questions.

Places: capture locations and movement at the granularity the source states, even a
room, corridor, laboratory, office, floor, building, or other internal space. Pass 1
preserves evidence; it does not decide whether a place may become a location entity.

Surveys: apply no importance, habitability, or rendering threshold. Inventory every
surveyed body and make each supported survey fact independently traceable to
evidence: moon occurrences; exact or qualitative moon counts; aggregate facts; broad
class and colour; visible, atmospheric, weather, surface, ring, and neighbourhood
description; gravity; and other measurements. Record the source value and unit for
numeric gravity rather than converting it in the sealed ledger. Explicitly account
for exact moon counts, qualitative counts such as many, and each named or distinctly
described moon.

Events: capture every source-supported occurrence, participant, cause, immediate
outcome, durable consequence, affected population, and source-stated significance
claim that may describe an event. Do not discard an event claim because it appears
local, personal, routine, or insignificant; Pass 2 decides what becomes an event.

Names: preserve the source's primary entity name exactly as the mention `label`.
When the source primarily uses an acronym, keep the acronym; capture any
source-supported expansion as an identity or attribute claim. Never replace the
acronym with an expansion or invent one. When no expansion is revealed, record that
absence as an unresolved description fact.

Descriptions: for every mention that may become a durable described entity, gather
separate evidence-backed claims answering, when revealed: what kind of entity it is;
what it does, represents, or is for; its defining operation, characteristics, or
scope; its important capabilities and limitations; what makes it reader-relevant;
and the expansion of a source-primary acronym. Keep a relationship such as who uses,
owns, mentions, or discusses an entity as its own claim, not as a definition.

Lineage: record a `character_parent` claim only when the source supports both
identities. For a replicant, the parent is the source state or backup that was
copied, not merely the operator who ran the process. Do not infer a parent from
similar names, behavior, shared species, possession of a backup, or operation of
cloning machinery; record ambiguity as an unresolved question.

Do not fill any item from model memory, generic genre knowledge, a later chapter, or
an unsupported inference. A missing answer remains explicit uncertainty; it is not
permission to create a vague claim about who merely mentions or uses the entity.

## Evidence and sealing

Give every nontrivial claim one or more short exact source excerpts; do not use long
quotations. Run `source_evidence.py seal`. It resolves every excerpt against the
fingerprinted source, rejects ambiguous excerpts without an explicit occurrence,
replaces excerpts with byte-offset evidence IDs, and writes the sealed ledger under
`/tmp`. After sealing:

1. calculate and record the sealed-ledger SHA-256;
2. verify that all chunk IDs were processed;
3. stop Pass 1 and report the sealed-ledger path and SHA-256;
4. never revise source claims later merely to match canonical state.
