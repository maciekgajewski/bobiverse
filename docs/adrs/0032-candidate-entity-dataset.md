# ADR-0032: candidate-entity dataset for minor first mentions

Status: Proposed
Date: 2026-11-22

## Context

Maciej asked for a dataset of minor first mentions (places, characters, events) kept
outside the main narrative data. When one becomes prominent later, it is promoted to
a full entity **without rewriting earlier chapters**, so its sudden prominence spoils
nothing, and the record fills the new entity ("first mentioned in 2.13"). Candidate
data must never show in the app before the promotion chapter.

What exists today:

- Extraction classifies incidental, identity-poor claims as `not-modeled`
  (`chapter-extraction.md` §Classification). They stay in review artifacts and are
  lost when the thing matters later.
- A non-seeded entity is introduced exactly once; its chapter reveals it
  (`data-model-definition.md` §Introductions). An update's `effective_date` may be
  earlier than its chapter, and the entity then shows from that earlier date (rule
  (a), ADR-0028), but only from its revealing chapter on.
- `entityEarliestDates` (`src/narrative/ceiling.ts`) dates introductions,
  updates and appearances. Supplemental mentions (ADR-0017) do not count, and they
  may only target entities that are already visible.
- Precedent for gated data: the species presentation registry never predeclares
  entity IDs and joins only the reader-safe world, so it cannot reveal anything.

## Decision

### 1. Schema

One authored file, `data/candidates/candidate-entities.json`, outside
`data/narrative/`, with its own schema. Records are sorted by `id`:

```json
{
  "id": "candidate:dana-reyes",
  "kind": "character",
  "name": "Dana Reyes",
  "aliases": [],
  "mentions": ["2.13", "2.18"],
  "note": "Original one-line reviewer note; never shown in the app.",
  "promotion": { "chapter": "2.30", "entity_id": "character:dana-reyes" }
}
```

- `kind` is one of the kinds `mentions` accepts. `mentions` lists the canonical
  chapters that refer to it, in reading order, without duplicates; the first is the
  first mention. `promotion` is `null` until promotion. That is the whole state
  machine: `candidate` → `promoted`, and there is no way back.
- The promotion chapter introduces the entity in the ordinary way, plus one new
  optional introduction field, `first_mentioned: "2.13"`.

The app never reads the candidate file. Only `narrative:validate` and the extraction
tooling read it. The runtime gets exactly one copied fact, `first_mentioned`, through
the ordinary chapter data.

### 2. Promotion flow

1. **Mention.** For each chapter, the Extractor records every named reference of a
   mentionable kind that falls below the modelling thresholds: event significance,
   ADR-0014 incidental places, and the like. A new reference creates a candidate. A
   repeat reference appends its chapter. This happens in the same data-only chapter
   change, and each candidate gets its own review-table row. Unnamed or identity-poor
   claims stay `not-modeled`.
2. **Promote.** When a later chapter meets the modelling threshold, the Extractor
   introduces the entity in that chapter. The description fuses everything read up
   to that chapter, mentions included. The Extractor copies `mentions[0]` into
   `first_mentioned` and sets `promotion`. A small script does steps 2 and 3. It is
   proved by hand on the first promotion, then committed (principle 1).
3. **No rewrite.** A promotion change touches only the promotion chapter and the
   candidate file. Chapter files before the promotion chapter stay byte-identical.
4. **After promotion**, later references are ordinary typed references or
   supplemental mentions, and the candidate record is frozen.

### 3. Spoiler rules

- **S1.** No runtime path reads candidate data. Unpromoted candidates are absent
  from the map, browser, search, cards, activity, links, chapter cards and the Date
  options, at every Read through.
- **S2.** A promoted entity is revealed by its promotion chapter, like any
  introduction. It is invisible at every Read through earlier than that chapter,
  whatever `first_mentioned` says. This is the same rule as `effective_date`.
- **S3.** From the promotion chapter on, `first_mentioned` is one more dated fact for
  rule (a), dated by the chapter it names (its header date, rule (c)). The entity
  therefore exists at soft ceilings from its first mention.
- **S4.** The description is bounded by the hard ceiling only (rule (f)). State is
  bounded by both ceilings. The introduction's state carries the promotion
  chapter's date, so an earlier soft ceiling shows "No known state as of …" (rules
  (b), (g)).
- **S5.** The card shows "First mentioned in Chapter 2.13" as a chapter link. Chapter
  2.13's own card does not list the entity, because its record is unchanged.

### 4. Validation (`narrative:validate`, at the data boundary)

- The candidate file matches its schema. IDs are unique. Every `mentions` chapter is
  canonical. The name and aliases match no entity visible at the first mention
  (ADR-0016 exact-name rule, Gliese/GJ normalization included). A match would make
  the reference a supplemental mention or an update instead.
- For a promoted candidate: `promotion.chapter` is canonical and later than every
  mention. `entity_id` is introduced in exactly that chapter. Its
  `first_mentioned` equals `mentions[0]`.
- Every introduction that carries `first_mentioned` matches exactly one promoted
  candidate (a one-to-one link). `first_mentioned` is earlier than its chapter.
- Candidate locations never become narrative anchors (ADR-0016). Astronomy
  acquisition for a star system happens with its promotion chapter.
- A structural check (principle 2) fails if any `src/` module or the narrative
  manifest references `data/candidates/`.

### Worked example (hypothetical)

A hypothetical character, Dana Reyes, is named in 2.13 (dated 2189) and in 2.18,
then becomes central in 2.30 (dated 2195).

| Read through | Soft ceiling     | What the reader sees                                                                                      |
| ------------ | ---------------- | --------------------------------------------------------------------------------------------------------- |
| < 2.30       | any              | Nothing: no entity, search hit, link or activity. A chapter summary may name her as plain text, as today. |
| ≥ 2.30       | 2.30 or later    | Dana with her description and her state as of the chapter, plus "First mentioned in Chapter 2.13".        |
| ≥ 2.30       | 2.13 / year 2189 | Dana exists (S3). Description in full; "No known state as of Chapter 2.13".                               |
| ≥ 2.30       | 2.10 / year 2188 | Dana does not exist yet. Her card still opens from a link (rule (g)).                                     |

## Conflicts with existing rules

1. **Rule (a) versus "first mentioned in 2.13".** Rule (a) dates existence from an
   entity's introduction, updates, appearances and event date. Mentions are excluded,
   in code and in the documentation. S3 adds `first_mentioned` to that list. **This
   edits `docs/design-principles.md` rule (a) and needs Maciej's own OK** (see Decision for
   Maciej). Without the edit, the entity exists only from 2.30's date, and "first
   mentioned in 2.13" is just a label.
2. **§2.4 "the map shows the entities known".** Before promotion, a candidate read at
   2.13 is known but not shown. This is not a conflict if candidates are editorial
   extraction material, like `not-modeled` claims today, and not narrative data. The
   ADR adopts that framing, and nothing in the constitution changes.
3. **ADR-0017.** References to a candidate in 2.14–2.29 are not supplemental
   mentions, because the target is not visible, and they are not backfilled after
   promotion. They live only in `mentions`.
4. **The name "candidate"** already means a chapter candidate (extraction) and
   `system-candidates.json` (astronomy); settled
   as Decided 1.

## Consequences

The design adds no new entity type, visibility mechanism or runtime join. The
runtime cost is one optional introduction field and one more `consider` call in
`entityEarliestDates`. The Extractor gains one classification and one review row
for each candidate. A candidate that is never promoted stays invisible forever, as
`not-modeled` claims do today.

## Alternatives considered

- **Introduce the entity at its first mention and reveal it later:** rejected. This
  either rewrites 2.13 or needs a second visibility key, which breaks "introduced
  exactly once".
- **Runtime join to the candidate file:** rejected. It ships unpromoted data and
  adds a second source of truth that the hard ceiling must guard.
- **A `mentions` backfill on promotion:** rejected. It rewrites earlier chapters.

## Decided

The manager settled these on 2026-11-22 under Maciej's rule that the team decides
what the principles and source already settle.

1. **Name.** `candidate`, with the file and IDs as `data/candidates/` and
   `candidate:`. A glossary note in the docs separates it from chapter candidates
   and `system-candidates.json`.
2. **Coverage.** Exhaustive: every named reference of a mentionable kind, with no
   importance threshold (consistent with ADR-0017), so promotion is mechanical.
3. **Cut-over.** No retroactive audit of 1.1–2.20. The implementation seeds the
   candidate file with the references Maciej already ruled out of 2.11–2.20, as
   names and chapters only: Axler (2.11), the Maldives (2.14), Archimedes' son
   (2.19) and the Camelot attack (2.19).
4. **Chapter card back-reference.** No: 2.13's card stays as it was read, and only
   the entity card names 2.13.
5. **Activity for the first mention.** None (principle 7).
6. **First-mention date.** The mentioning chapter's header date only, with no
   override.

## Decision for Maciej

**Existence from the first mention (S3), an edit to constitution rule (a).**
Recommend yes: it is what "first mentioned in 2.13" means in a chronological view,
and it is revealed only at the promotion chapter. It needs Maciej's own OK, word for
word. Without it, the entity exists only from its promotion chapter's date, and
"first mentioned in 2.13" is just a label.

Current text (`docs/design-principles.md` §3, rule (a)):

```markdown
- **(a) Entities show from their earliest known story date.** Once read, an entity
  appears at every soft ceiling at or after the earliest story date of any revealed
  fact about it: its introduction, its updates (`effective_date ?? chapter date`),
  its appearances (the chapter's date) and, for an event, its own `date`. An entity
  introduced later in reading but earlier in story therefore appears at the earlier
  soft ceiling.
```

Proposed text:

```markdown
- **(a) Entities show from their earliest known story date.** Once read, an entity
  appears at every soft ceiling at or after the earliest story date of any revealed
  fact about it: its introduction, its updates (`effective_date ?? chapter date`),
  its appearances (the chapter's date), its first mention (`first_mentioned`, that
  chapter's date) and, for an event, its own `date`. An entity introduced later in
  reading but earlier in story therefore appears at the earlier soft ceiling.
```

## Follow-up

On acceptance: a task to add the schema, validation and structural check, the
`first_mentioned` field (data-model doc and schema), the rule (a) edit if Maciej
approves it, the card line, the glossary note, an extraction-contract update (new
classification, review row, promotion script), and seeding the candidate file with
Axler (2.11), the Maldives (2.14), Archimedes' son (2.19) and the Camelot attack
(2.19), as names and chapters only.
