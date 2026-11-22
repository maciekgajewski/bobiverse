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
tooling read it. `first_mentioned` is data, not a rule exception. It is the only
way the first mention can be in the data up to Read through, because the app does
not read the candidate file and chapters before the promotion chapter are not
rewritten. It names a chapter rather than a date, so the date has one source: the
named chapter's header date. The projection treats it like any other dated fact.

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
- **S3.** From the promotion chapter on, the first mention is a fact about the
  entity in the data up to Read through. It is dated by the chapter it names, so
  rule (c) does not apply. Under the proposed §2.3 wording, the entity therefore
  exists at soft ceilings from its first mention, and rule (a) is a corollary. An
  event still exists from its own date when it has one; for an event,
  `first_mentioned` only gives the card line.
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

1. **Rule (a)'s closed list versus "first mentioned in 2.13".** On master, rule (a)
   lists the facts that date existence: an introduction at its chapter's date,
   updates, appearances and an event's date. Code and docs exclude mentions. That
   list does not derive from the principles. The fix is at principle level: §2.3
   says an entity exists from the earliest story date of any fact about it in the
   data up to the hard ceiling, a mention included, and rule (a) becomes a corollary
   with no list. **This edits `docs/design-principles.md`, needs Maciej's own OK,
   and is applied on this branch only, pending that OK** (see Decision for Maciej).
   As a consequence, supplemental mentions (ADR-0017) also count, so
   `entityEarliestDates` must consider them. §5 item 5 records that as open work.
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

The design adds no new entity type, visibility mechanism, runtime join or rule
exception. The runtime cost is one optional introduction field.
`entityEarliestDates` counts it and supplemental mentions like any other dated
fact. The Extractor gains one classification and one review row for each
candidate. A candidate that is never promoted stays invisible forever, as
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

**Entity existence derived from the principles (S3). PENDING MACIEJ'S OK: this
changes `docs/design-principles.md`, and the change is applied on this branch only,
not on master.** Recommend yes. Rule (a)'s closed field list is the only part of §3
that does not derive from the principles. The edit states existence once, in §2.3,
and shortens rule (a) to a corollary. Without it, the entity exists only from its
promotion chapter's date, and "first mentioned in 2.13" is just a label.

Audit of §3 (each rule against the principles):

| Rule | Derives from    | Verdict                                                                                                                                                 |
| ---- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a)  | §2.1, §2.3      | Free-floating today: its closed list pins an introduction to its chapter's date. Fixed below: stated in §2.3, (a) is a corollary.                       |
| (b)  | §2.5            | Derived: the empty case of "current state … labelled as of".                                                                                            |
| (c)  | §2.3            | Derived: chapters carry a date point, so a fact without its own date takes its chapter's.                                                               |
| (d)  | §2.1, §2.3      | Derived: a chapter's latest date is the earliest soft ceiling that shows all of that chapter's own facts.                                               |
| (e)  | §2.3, §2.4      | Definitional: it says what "at or before" and "known as of" mean for dates of different precision. No change; deleting it leaves those terms undefined. |
| (f)  | §2.5            | Derived: it restates §2.5. Code and tests cite it, so it stays.                                                                                         |
| (g)  | §2.1, §2.5, (b) | Derived: the entity is in the data, its description is hard-ceiling only, and it has no state.                                                          |
| §3.1 | §2.3, (d)       | Definition behind (d). Its field list, which excludes birth and death dates, is a choice; it decides a chapter's date, not existence. No change now.    |

`docs/design-principles.md` §2.3, current text:

```markdown
Chapters and entities carry the chapter that introduced them plus a chapter date
point. The chapter selector or the date selector (currently years; arbitrary time
points possibly later) picks a chronological point. This is the **soft ceiling**.

The world is shown as of the soft ceiling, built from all data up to the hard
ceiling. So going back to chapter 10 after reading chapter 27 can show facts revealed
in chapter 27 that are dated at or before chapter 10's time.
```

Proposed text:

```markdown
Chapters carry a story date point, and so does every fact in them. The chapter
selector or the date selector (currently years; arbitrary time points possibly
later) picks a chronological point. This is the **soft ceiling**.

The world is shown as of the soft ceiling, built from all data up to the hard
ceiling. An entity exists from the earliest story date of any fact about it in that
data, a mention included; an event, from its own date when it has one. So going back
to chapter 10 after reading chapter 27 can show facts and entities revealed in
chapter 27 that are dated at or before chapter 10's time.
```

Rule (a), current text:

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
- **(a) Entities show from their earliest known story date** (§2.3). An entity
  introduced later in reading but earlier in story therefore appears at the earlier
  soft ceiling.
```

§5 item 5 also gains one closing sentence, "Mentions (§2.3) do not count yet.", to
record the code that does not follow the new wording yet.

## Follow-up

On acceptance: a task to add the schema, validation and structural check, the
`first_mentioned` field (data-model doc and schema), landing the §2.3 and rule (a)
edit if Maciej approves it, `entityEarliestDates` counting mentions (§5 item 5), the
card line, the glossary note, an extraction-contract update (new classification,
review row, promotion script), and seeding the candidate file with
Axler (2.11), the Maldives (2.14), Archimedes' son (2.19) and the Camelot attack
(2.19), as names and chapters only.
