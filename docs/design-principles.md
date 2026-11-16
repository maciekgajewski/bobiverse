# Design principles: the companion's constitution

Status: Proposed for the Captain's (Maciej's) approval
Last updated: 2026-11-16

These are Maciej's governing design principles for the Bobiverse companion, in his
words, made coherent. They are written for developers, agents and readers alike.

**This document is the app's constitution.** It supersedes every earlier rule,
document or ADR that conflicts with it. Where an accepted ADR, the technical design,
the extraction contract or code disagrees, this document wins, and the conflict is a
defect to fix, not a choice to make. §6 lists every rule it supersedes that has been
verified so far. Rules marked _Pending Maciej's confirmation_ are proposals, not yet
part of the constitution.

## 1. Two ceilings

Two independent limits decide what the app shows.

- **Hard ceiling (what you have read).** Your **Read through** chapter
  (`furthestChapterRead`). Nothing from a chapter after it is ever used, in any
  view or mode, chronological included.
- **Soft ceiling (when you are looking).** A chronological point in story time,
  picked with the chapter selector or the date selector. The world is shown as it
  stood at that point, built from all data up to the hard ceiling.

The hard ceiling protects you from spoilers. The soft ceiling lets you look at any
moment of the story with everything you know so far.

## 2. Principles

### 2.1 Chapters are condensed facts, accumulated in reading order

Every chapter is condensed into a JSON object of facts. Facts accumulate in reading
(revelation) order. The app never uses data from chapters past the read-through
chapter, in any mode, chronological included. This is the **hard ceiling**.

### 2.2 Chapters are non-linear in time

Chapters are not linear in story time. There are two orders:

- **revelation order**: the order in which the books reveal facts (reading order);
- **chronological order**: the order in which things happen in the story.

A chapter set earlier or later in story time than its neighbours is a **non-linear
chapter**. One goal of the app is to let the reader arrange the facts they know
chronologically, for a different perspective on the story.

### 2.3 The soft ceiling: the world as of a point in time

Chapters and entities carry the chapter that introduced them plus a chapter date
point. The chapter selector or the date selector (currently years; arbitrary time
points possibly later) picks a chronological point. This is the **soft ceiling**.

The world is shown as of the soft ceiling, built from all data up to the hard
ceiling. So going back to chapter 10 after reading chapter 27 can show facts revealed
in chapter 27 that are dated at or before chapter 10's time.

### 2.4 Map

The map shows the entities and facts known as of the soft ceiling, using all
knowledge up to the hard ceiling.

### 2.5 Info card

- The **description** fuses all known data. It depends only on the hard ceiling.
- The **current state** section masks everything chronologically after the soft
  ceiling. It is labelled "as of chapter X" or "as of year Y".
- The card therefore changes with both ceilings.

### 2.6 Future features

- A per-entity **chronicle**: the history of a character or a place.
- **Years as entities**, with previous and next like chapter cards, each listing the
  events of that year known up to the hard ceiling.

## 3. Edge rules (Pending Maciej's confirmation)

These are proposed readings of the principles for cases they do not settle. They are
not binding until Maciej confirms them.

- **(a)** An entity introduced later in reading but earlier in story appears at the
  earlier soft ceiling once it has been read.
- **(b)** If an entity has no known state at or before the soft ceiling, its card
  shows "no known state as of …".
- **(c)** An undated fact counts as known from the date of the chapter that reveals
  it.
- **(d)** The chapter selector's soft ceiling is that chapter's header date.

## 4. Terms

| Term                | Meaning                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| Read through        | The reader's confirmed progress; the hard ceiling (`furthestChapterRead`).            |
| Hard ceiling        | Nothing from a chapter after Read through is used, anywhere.                          |
| Soft ceiling        | The story-time point being viewed, chosen by chapter (edge rule (d)) or by date.      |
| Revelation order    | Reading order; canonical chapter order (`compareNarrativeChapters`).                  |
| Chronological order | Story-time order of dated facts (`compareNarrativeMoments`).                          |
| Non-linear chapter  | A chapter whose story date is out of step with its neighbours in reading order.       |
| Description         | The fused, encyclopedia-style text about an entity. Bounded by the hard ceiling only. |
| Current state       | The entity's condition as of the soft ceiling. Bounded by both ceilings.              |

Maciej's term for a chapter whose story time is out of reading order is
"non-linear chapter". Use it in code, data, docs and the UI.

## 5. How the app works today

Verified on master `fd81ca8`; this summarises what §6 must change.

- `src/App.tsx` (`projectReaderProgress`) builds the world with
  `generateNarrativeWorld(corpus, progress.viewChapter, displayDate)`. The
  knowledge set is every chapter up to `viewChapter` (**Knowledge through**), not
  up to `furthestChapterRead`. Activity (`narrativeActivityThrough`), last-known
  locations, travel history and Date-view options (`meaningfulNarrativeDateOptions`) use the same
  `viewChapter` set.
- **Chapter view** (`src/narrative/model.ts`, `generateNarrativeWorld`) has no
  story-time cutoff. Competing writes are ordered by reading order
  (`writeOrder = "reading"`): the latest-read chapter's write wins (ADR-0028(c)).
- **Date view** cuts at the requested date and orders writes by story date
  (`writeOrder = "story"`, `effective_date ?? chapter date`), within the same
  `viewChapter` set. Undated events are skipped in Date view.
- An entity exists in a view once its introducing chapter is in the knowledge set
  (and, in Date view, its introduction date is at or before the cutoff).
  Introductions and location updates cannot be backdated (ADR-0028).
- The inspector shows one projected `description` and one "Current state"
  (`src/components/ObjectInspector.tsx`). Both come from the same projected entity,
  so in Date view the description is cut by date like the state. The map badge reads
  "Latest known · Knowledge through Chapter X" in chapter view and "Universe in Y ·
  Knowledge through Chapter X" in Date view (`src/App.tsx`).
- The projection keeps only the winning value of each property. It does not store a
  property's dated history.

## 6. Implications: superseded rules and conflicts

Listed, not fixed. Each item names what it said and why it conflicts.

### 6.1 Superseded ADR decisions

1. **ADR-0028(c), chapter-view write order.** Said: in chapter view "the write from
   the latest-read chapter wins … whatever its story date". Conflicts with §2.3 and
   §2.5: state is chosen by story time at the soft ceiling, not by reading order.
2. **ADR-0028, Q3 = b (chapter view has no story-time cutoff).** Said: chapter view at
   read-through N "shows the latest known state from every revealed chapter … whatever
   their dates", and is "not a Date-mode request at the chapter's date". Conflicts
   with §2.3 and edge rule (d): a chapter is a soft ceiling at its header date.
3. **ADR-0028, Merge (a) as applied to state.** Said: "A later-read write carries the
   full merged text", so the chapter-view winner "carries everything known", with the
   accepted limitation that Date view "may show a fact early". Under §2.5, a
   `current_state` or `state` write describes the condition at its own date; carrying
   later-dated facts into an earlier-dated state leaks them below the soft ceiling.
   Merged text remains right for `description`, which §2.5 bounds by the hard ceiling
   only.
4. **ADR-0028, consequences.** The documented chapter-view outcome for the 1.51/1.52
   pair ("chapter view at read-through 1.52 shows 1.52's value") and the accepted
   early-fact limitation no longer describe the intended behaviour.
5. **ADR-0002, reader-visibility gate at `viewChapter`.** Said: "Only source records
   introduced at or before `viewChapter` may contribute knowledge to that view."
   Conflicts with §2.1 and §2.3: knowledge is bounded by Read through; `viewChapter`
   only sets the soft ceiling. (ADR-0002's story-time gate at `viewChapter.date` agrees
   with edge rule (d); ADR-0028 Q3 = b removed it.)
6. **ADR-0005, date projection.** Said: a date-exploration view "retains the selected
   reader-visible chapter set". Same conflict as item 5: the set is everything up to
   Read through.
7. **ADR-0013, unplaced event activity.** Said: chronologically unplaced event
   activity "remains available only to Chapter-mode reader-order context and never
   participates in Date-mode" recency. If edge rule (c) is confirmed, undated facts
   are placed at their revealing chapter's date in every view.

### 6.2 Superseded documentation

8. **`docs/technical-design.md` §12, chapter view.** Says: "A chapter view shows the
   latest known state from every chapter read so far, with no story-time cutoff, …
   the later-read chapter's value wins (ADR-0028)." Superseded as items 1–2.
9. **`docs/technical-design.md` §12, later revelations.** Says: "a fact first revealed
   later must not alter an earlier reader-knowledge view in any mode, even if it was
   already true in-universe." Directly contradicts §2.3: a fact revealed in chapter 27
   and dated at or before chapter 10 does appear when looking at chapter 10.
10. **`docs/technical-design.md` §12, `viewChapter` as Knowledge through.** Says:
    `viewChapter`, "labelled **Knowledge through**", selects the knowledge chapter,
    and Date mode "retains the first stage's reader-visible chapter set". Under §1
    `viewChapter` is a soft-ceiling selector and knowledge is always up to Read
    through.
11. **`docs/technical-design.md` §12, descriptions.** Says: "The latest
    `description` in effect at the viewed chapter wins, with the same reader-order
    and story-time projection and spoiler gating as `current_state`." Conflicts with
    §2.5: the description depends only on the hard ceiling.
12. **`docs/chapter-extraction.md` §Reading order and story dates, Captain decision
    D2.** Records ADR-0028(c) and Merge (a) for extraction, including the reporting
    list of updates that carry later-established facts. Superseded for `state` and
    `current_state` as items 1 and 3.
13. **`docs/chapter-extraction.md` §Descriptions, state rules.** Says
    "`current_state` and `state` hold only the entity's latest condition as of that
    chapter" and that every `current_state` describes "only the latest known
    condition". Under §2.5 a state write is the condition as of its own effective
    date (`effective_date ?? chapter date`), not the latest one known at the
    chapter.
14. **Option A for non-linear chapters (Maciej, 2026-11-16, relayed by the
    manager).** Said: a non-linear chapter set earlier in story time does not write
    current state; the Extractor keeps such details out of the state write (in an
    event or description instead). It existed only because the latest-read write
    wins (item 1). Under §2.5 a non-linear chapter's state is a dated state, shown
    only at soft ceilings at or after its date, so it should be written. Not yet
    recorded in the repository.

### 6.3 Code and tooling conflicts

15. **Sentence-preservation check** (`src/narrative/sentence-preservation.ts`,
    `sentencePreservationPolicy`). `state` and `current_state` are
    `when-not-later`: a write dated the same as or earlier than the previous
    latest-read write must keep its sentences. This assumes the latest-read write
    wins (item 1). With dated states, an earlier-dated state is its own snapshot and
    must not carry later facts; the state policy needs revisiting. `description` and
    `visual_description` stay `always`, consistent with §2.5. The check compares with
    `compareNarrativeDates`, not `compareNarrativeMoments`.
16. **Knowledge set** (`src/App.tsx`, `projectReaderProgress`;
    `generateNarrativeWorld`, `narrativeActivityThrough`,
    `meaningfulNarrativeDateOptions`, `deriveLastKnownLocations` and
    `projectCharacterTravelHistories` in `src/narrative/model.ts`). All take
    `viewChapter` as the knowledge chapter.
    Under §1 they must take Read through as the knowledge bound and the selected
    chapter or date as the soft ceiling.
17. **Chapter-view projection** (`generateNarrativeWorld`: `cutoff = null` and
    `writeOrder = "reading"` in chapter view). Needs a story-time cutoff at the
    chapter's header date (edge rule (d)) and story-date write order in every view.
18. **Dated states in the model.** The projection keeps one winning value per
    property (`applyProperties` with `latestMoments`). Selecting state by soft
    ceiling while keeping the description bounded only by the hard ceiling needs
    the projection to keep, per entity and property, the dated writes up to the hard
    ceiling and select by `compareNarrativeMoments` / `isNarrativeDateEligible` at the
    soft ceiling. The description must be projected separately, without a date
    cutoff.
19. **Info-card labels** (`src/components/ObjectInspector.tsx`). "Current state" has
    no "as of chapter X" / "as of year Y" label and no "no known state as of …"
    empty state (edge rule (b)).
20. **View labels** (`src/App.tsx` map badge; `src/components/ProgressControls.tsx`
    "Knowledge through" select). "Latest known · Knowledge through Chapter X" and
    "Knowledge through" describe the old model, where the selected chapter was the
    knowledge bound.
21. **Undated events in Date view** (`generateNarrativeWorld` skips undated events
    when a display date is requested). Conflicts with edge rule (c), if confirmed.
22. **Data written under the old rules.** State and description writes merged under
    ADR-0028 Merge (a) (the D2 reporting list, and ADR-0028's 1.22 and 1.42 pairs)
    may carry later-dated facts in earlier-dated states. Any correction is an
    Extractor data change, out of scope here.

### 6.4 Rules that stay

- AGENTS.md: reading order is the spoiler gate, and story time and reveal order are
  never collapsed into one timestamp. §1 is this rule.
- ADR-0028: nothing from a chapter after Read through is visible in any view. This is
  the hard ceiling.
- `adrs/0026-calendar-precision-narrative-dates.md` and ADR-0013:
  `compareNarrativeMoments` orders dated facts, and
  `isNarrativeDateEligible` decides eligibility at a date. The soft ceiling uses them.
- ADR-0028 `effective_date` (backdated updates) and the rule that introductions and
  location updates cannot be backdated. Edge rule (a) works within it: an entity's
  story-time introduction is its introducing chapter's date.
- Chapter titles stay gated by Read through (`visibleChapterTitle`).

## 7. Plan

Ordered; each step is its own task and review. Nothing here is authorized by this
document alone.

1. **Ratify.** Maciej approves this document and confirms or changes edge rules
   (a)–(d). Record the supersession of the ADR decisions in §6.1 in a new ADR that
   points here.
2. **Model.** Keep dated property writes up to Read through; select state by soft
   ceiling with `compareNarrativeMoments`; project descriptions from the hard
   ceiling only; make Read through the knowledge bound for the world, activity,
   last-known locations, travel history and Date-view options (§6.3 items 16–18).
3. **Views and cards.** Chapter view uses the chapter's header date as the soft
   ceiling; current state is labelled "as of chapter X" or "as of year Y", with "no
   known state as of …" when empty; view labels drop "Knowledge through" wording
   (items 19–21).
4. **Extraction and checks.** Update `docs/chapter-extraction.md` so state writes
   describe the condition at their own date and non-linear chapters write dated
   state (items 12–14); revise the sentence-preservation state policy (item 15);
   the Extractor reviews existing merged state writes (item 22).
5. **Release.** Ship steps 2–4 together in one release under a new semver tag that
   Maciej approves. Proposed What's new bullet (proposed wording, not yet in
   `src/release-notes.ts`):

   > Go back to an earlier chapter or date and see it filled in with what later
   > chapters revealed about that time, never going past the chapter you have read
   > up to.

6. **Later.** A per-entity chronicle (the history of a character or a place), and
   years as entities with previous and next like chapter cards, each listing that
   year's events known up to Read through. Arbitrary time points for the date
   selector.
