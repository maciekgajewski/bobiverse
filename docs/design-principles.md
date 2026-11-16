# Design principles: the companion's constitution

Status: Accepted 2026-11-16 (Maciej; ADR-0031)
Last updated: 2026-11-16

These are Maciej's governing design principles for the Bobiverse companion, in his
words, made coherent. They are written for developers, agents and readers alike.

**This document is the app's constitution.** It supersedes every earlier rule,
document or ADR that conflicts with it. Where an accepted ADR, the technical design,
the data model, the extraction contract or code disagrees, this document wins, and
the conflict is a defect to fix, not a choice to make.
[ADR-0031](adrs/0031-design-principles-constitution.md) ratifies it. Conflicting
earlier rules have been removed from the docs; §5 lists the code and data work still
open.

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

- The **description** fuses all known data. It depends only on the hard ceiling,
  even when it reveals a fate that comes later than the soft ceiling.
- The **current state** section masks everything chronologically after the soft
  ceiling. It is labelled "as of chapter X" or "as of year Y".
- The card therefore changes with both ceilings.

### 2.6 Future features

- A per-entity **chronicle**: the history of a character or a place.
- **Years as entities**, with previous and next like chapter cards, each listing the
  events of that year known up to the hard ceiling.

## 3. Rules

These rules settle cases the principles leave open. Maciej accepted them on
2026-11-16.

- **(a) Entities show from their earliest known story date.** Once read, an entity
  appears at every soft ceiling at or after the earliest story date of any revealed
  fact about it: its introduction, its updates (`effective_date ?? chapter date`),
  its appearances (the chapter's date) and, for an event, its own `date`. An entity
  introduced later in reading but earlier in story therefore appears at the earlier
  soft ceiling.
- **(b) No known state.** When an entity has no known state at or before the soft
  ceiling, its card shows "no known state as of …".
- **(c) Undated facts.** An undated fact is dated by the chapter that reveals it.
- **(d) A chapter's soft ceiling is its latest date.** Choosing a chapter sets the
  soft ceiling to that chapter's latest date (§3.1), not its header date.
- **(e) Calendar precision.** A fact dated to a year or a month counts as known
  throughout that whole period. A fact dated `2185` is visible at a `2185-04` soft
  ceiling, and a `2185-04` fact at a `2185` soft ceiling.
- **(f) Description is hard-ceiling only**, even when it reveals a later fate
  (§2.5).
- **(g) Cards before existence.** The card of an entity that does not exist yet at
  the soft ceiling still opens. It shows the description and "no known state as of
  …".

### 3.1 A chapter's latest date

A chapter's latest date is the latest of these story dates from that chapter's own
record:

1. the chapter's header `date`;
2. the `date` of each event the chapter introduces;
3. each event `date` the chapter's `updates` supply (a `null` that clears a date
   does not count);
4. each `effective_date` on its updates. ADR-0028 keeps these on or before the
   header `date`, so they never raise it.

Undated events, appearances, mentions, locations and entity fields such as
`birth_date` or `death_date` do not count. "Latest" compares the end of each
calendar range (ADR-0026 calendar ranges, in
`adrs/0026-calendar-precision-narrative-dates.md`); among dates that end together,
the one with the latest start wins, then the higher ordering suffix. The chapter
card and the "as of chapter X" label name the chapter, not this date.

## 4. Terms

| Term                | Meaning                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| Read through        | The reader's confirmed progress; the hard ceiling (`furthestChapterRead`).            |
| Hard ceiling        | Nothing from a chapter after Read through is used, anywhere.                          |
| Soft ceiling        | The story-time point being viewed: a chapter's latest date (§3.1) or a chosen date.   |
| Revelation order    | Reading order; canonical chapter order (`compareNarrativeChapters`).                  |
| Chronological order | Story-time order of dated facts (`compareNarrativeMoments`).                          |
| Non-linear chapter  | A chapter whose story date is out of step with its neighbours in reading order.       |
| Description         | The fused, encyclopedia-style text about an entity. Bounded by the hard ceiling only. |
| Current state       | The entity's condition as of the soft ceiling. Bounded by both ceilings.              |

Maciej's term for a chapter whose story time is out of reading order is
"non-linear chapter". Use it in code, data, docs and the UI.

## 5. Open work

The code and data do not yet follow this constitution in these places.

1. **Knowledge bound.** `projectReaderProgress` (`src/App.tsx`) and
   `generateNarrativeWorld`, `narrativeActivityThrough`,
   `meaningfulNarrativeDateOptions`, `deriveLastKnownLocations` and
   `projectCharacterTravelHistories` (`src/narrative/model.ts`) take `viewChapter`
   as the knowledge chapter. They must use Read through (`furthestChapterRead`) as
   the knowledge bound and the selected chapter or date only as the soft ceiling.
2. **Chapter view soft ceiling.** `generateNarrativeWorld` uses no cutoff and
   reading-order writes in chapter view (`cutoff = null`,
   `writeOrder = "reading"`). It must cut at the chapter's latest date (§3.1) and
   order writes by story date in every view.
3. **Dated states.** The projection keeps one winning value per property
   (`applyProperties` with `latestMoments`). It must keep each property's dated
   writes up to the hard ceiling, select state at the soft ceiling with
   `compareNarrativeMoments`, and project the description separately with no date
   cutoff (rule (f)).
4. **Calendar precision.** `isNarrativeDateEligible` rejects a fact whose range
   contains a less precise ceiling, so `2185` is not eligible at `2185-04`; it must
   follow rule (e). The cutoff must not rely on `compareNarrativeDates`, which returns
   `null` for overlapping ranges of different precision.
5. **Entity existence.** Entities appear from their introduction date. They must
   appear from their earliest known story date (rule (a)). Validation done in
   BOB-20261116-E87SYK: an `effective_date` may now be earlier than the introducing
   chapter's date (ADR-0028, `docs/data-model-definition.md`). The projection part
   is still open.
6. **Undated facts.** `generateNarrativeWorld` drops undated events in Date view, and
   generated activity for an undated event has `effective_date: null`. Both must use
   the revealing chapter's date (rule (c)).
7. **Info card** (`src/components/ObjectInspector.tsx`). "Current state" needs the
   "as of chapter X" / "as of year Y" label and "no known state as of …" (rules (b)
   and (g)); the description must not be cut by the soft ceiling.
8. **View labels.** The map badge ("Latest known · Knowledge through Chapter X",
   "Universe in Y · Knowledge through Chapter X", `src/App.tsx`) and the "Knowledge
   through" select (`src/components/ProgressControls.tsx`) name the selected chapter
   as the knowledge bound. `docs/visual-testing.md` and
   `docs/design/phase-2-desktop-ui.md` quote these labels and change with them.
9. **Sentence-preservation check** (`src/narrative/sentence-preservation.ts`).
   Done in BOB-20261116-E87SYK: `state` and `current_state` use `same-date`, so a
   write is checked only against the latest-read earlier write of an equal or
   overlapping date. `description` and `visual_description` stay `always`.
10. **Schema text** (`data/schema/narrative-data-model.schema.json`, mirrored in
    `docs/data-model-definition.md`). Done in BOB-20261116-E87SYK: state is described
    as the condition as of the write's effective date.
11. **Chapter data.** Existing state writes that merged in later-dated facts (for
    example `character:riker` and `character:homer` at 1.22, `character:bill` at
    1.42) need Extractor review, and non-linear chapters (such as Bill's 2.6 state)
    write dated state. This is Extractor data work.

## 6. Plan

Ordered; each step is its own task and review.

1. **Ratify.** Done: Maciej accepted this document and its rules on 2026-11-16;
   [ADR-0031](adrs/0031-design-principles-constitution.md) records it, and the
   conflicting earlier rules were removed from the docs.
2. **Model.** Keep dated property writes up to Read through; select state at the
   soft ceiling with `compareNarrativeMoments` and rule (e) precision; project
   descriptions from the hard ceiling only; show entities from their earliest known
   date; make Read through the knowledge bound for the world, activity, last-known
   locations, travel history and Date-view options (§5 items 1–6).
3. **Views and cards.** Chapter view uses the chapter's latest date (§3.1) as the
   soft ceiling; current state is labelled "as of chapter X" or "as of year Y",
   with "no known state as of …" when empty or before the entity exists; view labels
   drop "Knowledge through" wording (items 7–8).
4. **Extraction and checks.** Revise the sentence-preservation state policy and the
   schema text (items 9–10); the Extractor reviews existing state writes and writes
   dated state for non-linear chapters (item 11).
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
