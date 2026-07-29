# Phase 2 desktop narrative workspace

Status: Approved design  
Last updated: 2026-07-28

## 1. Purpose

Phase 2 turns the astronomy atlas into a spoiler-safe view of the narrative world at
a selected reading position and story date. The desktop workspace keeps the
true-scale 3D map at its centre while making recently relevant characters, events,
locations, and other known objects immediately reachable.

This document specifies the desktop composition and interaction contract. It is
binding for BOB-010 through BOB-015. BOB-016 will define the corresponding mobile
composition before the Phase 2 feature set is considered complete.

## 2. Binding context

This design extends, and does not replace:

- `../technical-design.md`, especially the map, responsive, visual-language, and
  spoiler-model sections;
- `../data-model-definition.md`;
- `../adrs/0001-chapter-authored-narrative-state.md`;
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`;
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`;
- `../adrs/0006-generalized-narrative-zero-state.md`;
- `../adrs/0007-additional-narrative-entity-types.md`;
- `../adrs/0008-important-mentions-and-narrative-activity.md`;
- the original atmosphere and composition references in `reference/`.

The concept images are visual guidance, not literal specifications. All labels,
objects, dimensions, icons, and interaction details in this document use project-owned
contracts.

## 3. Design principles

1. **The map is the centre.** Browser, inspector, and timeline support spatial
   exploration rather than competing with it.
2. **Every surface depicts one shared projection.** Map, browser, inspector, search,
   and timeline use the same knowledge chapter and display date.
3. **Knowledge and story time stay visibly separate.** Reading order controls what
   may be known; story time controls which of those known facts form the represented
   world state.
4. **Recent narrative activity is easy to reach.** Current-chapter or current-date
   objects lead their type groups; prior objects follow by last relevant activity.
5. **Astronomy context is visible without becoming story knowledge.** Nearby
   astronomy-only systems provide spatial context but remain visually and
   semantically distinct from narrative-known systems.
6. **Unknown means unknown.** Unmapped narrative locations remain available in the
   browser and inspector but never receive invented coordinates.
7. **Geometry remains true.** Neither narrative emphasis nor timeline legibility may
   distort canonical interstellar positions or elapsed year distances.
8. **The interface is operable without the canvas.** Selection, state, search
   results, and facts remain ordinary accessible DOM content.

## 4. Shared view state

The workspace has four related but independent values:

| Value                 | Meaning                                                                           | Constraint                                                 |
| --------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `furthestChapterRead` | Explicitly confirmed spoiler ceiling, shown as **Read through**                   | Optional; advancing requires a deliberate confirmation     |
| `viewChapter`         | Chapter whose reader-visible claims are available, shown as **Knowledge through** | Optional and never later than `furthestChapterRead`        |
| `displayDate`         | Meaningful story date used for world-state projection                             | Optional; in Chapter mode it follows the knowledge chapter |
| `selectedObject`      | One projected narrative object or in-scope astronomy system                       | Must be cleared if a state change makes it ineligible      |

Before progress is set, both chapter values and the display date are absent. The
workspace renders the complete zero state, with Sol as the initial mapped narrative
system.

The existing persisted application state remains versioned and namespaced. Adding
these values or saved browser-group state requires an explicit compatible extension or
migration; it must not create an unversioned second localStorage record.

## 5. Desktop composition

At desktop width (`>= 1200px`), the application uses one viewport-height workspace:

```text
+-----------------------------------------------------------------------+
| Command bar: identity | view status | reset                           |
+----------------+----------------------------------+-------------------+
| Object browser |                                  | Object inspector  |
|                |          True-scale map          |                   |
| grouped filter |                                  | selected details  |
| and search     |                                  | and relationships |
+----------------+----------------------------------+-------------------+
| Read through | mode | chapter/date selector and true-scale timeline  |
+-----------------------------------------------------------------------+
| Source attribution                                                  |
+-----------------------------------------------------------------------+
```

The left and right rails use fluid bounded widths. The map consumes all remaining
space and keeps a definite height so the React Three Fiber canvas cannot collapse.
The bottom timeline dock spans the browser, map, and inspector columns. The existing
source-attribution footer remains visible.

The command bar retains only implemented global controls, including reset. Displayed
interstellar distances, Galactic coordinate components, and map scale use light-years
without a unit selector. Search belongs at the top of the object browser. The map
contains a compact read-only context badge such as:

```text
Universe in 2133 · Knowledge through Chapter 12
```

Before a chapter is selected, the badge says `Pre-book zero state`.

Desktop panel resizing is not part of Phase 2. Fluid CSS and bounded rail widths
provide the required adaptation without adding draggable layout state.

At 200% desktop browser zoom, the CSS viewport may fall below the simultaneous
four-surface breakpoint. BOB-015 owns an interim compact reflow contract so Phase 2
remains operable before the later mobile design:

- the existing BOB-003 map-first compact browser and inspector panels remain
  available;
- a labelled command-bar control opens **Timeline and progress** as a non-animated
  modal panel;
- the panel contains the same **Read through**, mode, chapter/date, and timeline
  controls as the desktop dock;
- Escape, a visible close control, focus containment, and focus return follow the
  existing compact-panel contract;
- all Phase 2 functions remain reachable sequentially, although they are not shown
  simultaneously.

BOB-016 may refine this composition for phone and tablet use. It must not be the first
task to make desktop zoom usable.

## 6. Projected-object eligibility

The browser, narrative map treatment, and narrative inspector expose only objects that
are:

1. reader-visible at `viewChapter`; and
2. temporally eligible at `displayDate`.

Chapter mode uses the selected knowledge chapter's story date. Date mode uses the
independently selected meaningful date. An object revealed by the allowed knowledge
set but effective only after the displayed date is absent rather than shown as a
future object.

An explicitly unmapped location may satisfy both gates. It remains browsable and
inspectable but has no map marker. A chronologically unplaced event remains available
in its reader-visible chapter context but is omitted from Date mode because it cannot
be placed in a represented year.

The zero-state projection is the eligible object set when no chapter is selected.

## 7. Left object browser

### 7.1 Progressive groups

The browser uses this fixed group order:

1. Characters
2. Events
3. Star Systems
4. Other Locations
5. Species
6. Technologies
7. Organizations
8. Vessels

Characters, Events, and Star Systems are the core groups. Every group, including a
core group, is rendered only when at least one eligible object exists. This keeps the
browser compact without hiding a supported entity type when data becomes available.

Each group heading shows its visible count and, when nonzero, the count active in the
current chapter or meaningful date. Groups are independently collapsible. Their
expanded state is stored with the versioned application preferences.

Each heading carries an original project-owned SVG line icon specific to its object
type. Every object row carries the same small SVG ring-and-dot bullet. These graphics
are decorative; the group name, counts, object name, and collapse state remain the
semantic labels. CSS-drawn proxy shapes are not used for either role.

Search temporarily expands all groups containing matches but does not overwrite saved
expanded state. Clearing search restores the reader's prior group arrangement.

### 7.2 Activity and ordering

Beginning with Chapter `1.14`, `mentions` records every source-supported reference to
a previously visible object that is absent from all other typed direct narrative
references in that chapter. Chapters `1.1` through `1.13` retain ADR-0008's accepted
boundary. Mentions do not assert presence, participation, ownership, location, or
state change. ADR-0008, as superseded by ADR-0017, defines their source and projection
contract.

The generator derives narrative activity from:

- introductions and updates;
- character appearances and their effective locations;
- the chapter location;
- events, their effective dates, participants, and locations;
- supplemental `mentions`;
- mapped stellar-system ancestry of an active narrative location.

It does not treat every ordinary entity reference, such as a species link or
homeworld property, as chapter activity.

Ordering adapts to the timeline mode:

- **Chapter mode:** current-chapter objects first, followed by latest reader-order
  activity at or before `viewChapter`.
- **Date mode:** objects active at `displayDate` first, followed by latest comparable
  story-time activity at or before `displayDate`, using only claims permitted by
  `viewChapter`.

Objects with the same recency sort by their projected display name using a stable,
locale-aware comparison. Group order never changes in response to activity.

Character activity from an appearance is a sighting, not a claim of continuous
presence. The inspector says **Last seen**, including its source chapter and effective
date. It never relabels that projection as a current character location.

### 7.3 Search

One search field filters eligible narrative objects by projected reader-visible name
and aliases. Astronomy systems additionally match their reviewed preferred name and
alternate designations. Matching is case-insensitive and diacritic-tolerant; fuzzy
matching, description full-text search, query persistence, and a command palette are
outside this phase.

While the query is nonempty, a temporary **Nearby astronomy** group follows the
narrative groups. It contains matching astronomy-only systems already inside the
currently rendered context region. It never searches outside that region and never
changes the map scope.

Clearing the query removes the temporary group. An astronomy-only system selected
from it remains selected and inspectable until another state transition makes it
ineligible.

## 8. Central map

### 8.1 Displayed systems

The map displays the union of:

- temporally eligible, mapped narrative-known stellar systems; and
- every validated astronomy system no farther than the configured context radius
  from at least one of those known systems.

The default context radius is `20 ly`. It is a positive value in one explicit,
validated static configuration record shared by astronomy generation, runtime
filtering, tests, and relevant UI wording. It is not duplicated as source constants
and is not an end-user setting in Phase 2.

The offline astronomy pipeline must guarantee every system available under the
accepted multi-catalogue contract in each required neighbourhood. It may not silently
treat the current nearest-20 dataset as complete. If the accepted source union cannot
provide the promised coverage around a mapped story system, generation fails or the
task remains blocked until an accepted source decision resolves the gap.

One interstellar node remains one stellar system. Multiple physical components render
through the existing decorative component cluster and never become independent map
positions.

### 8.2 Narrative marker states

Stellar component sprites retain their catalogue-derived approximate colour family
and fixed marker radius under ADR-0011. Narrative state is drawn outside the
component cluster:

| State                           | Persistent treatment                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| Astronomy-only context          | Component sprite only; no caption                                |
| Narrative-known                 | Thin single segmented ring and collision-managed caption         |
| Active in selected chapter/date | Brighter double segmented ring with one outward tick             |
| Selected                        | Existing larger corner frame outside the narrative ring          |
| Hovered                         | Temporary tooltip and emphasis without changing narrative status |

The geometric differences make the states understandable without colour. Rings are
screen-readable UI marks centred on canonical system coordinates; they are not
orbits, do not affect picking or measurement, and do not imply physical extent.
Markers are static. Reduced-motion handling therefore needs no special narrative
animation exception.

The approved visual reference is
[`reference/desktop-narrative-map-markers.png`](reference/desktop-narrative-map-markers.png).
Its labels and values are illustrative and non-canonical; some system names and
identifiers are real astronomy designations, while others are invented. None is
application data or a literal implementation specification.

### 8.3 Captions and collision

The selected system, hovered system, and every system active in the selected
chapter/date always receive captions. Other narrative-known system captions are
shown when they do not collide and reappear as the camera moves or zooms.
Astronomy-only systems remain uncaptained unless hovered or selected.

Collision handling may suppress a caption but may not move a system marker, distort
geometry, or suppress the narrative-known ring. Keyboard and browser selection remain
available when a caption is absent.

### 8.4 Selection and focus

Selecting an object coordinates all surfaces. The map focuses automatically only when
the selected projection provides one unambiguous mapped stellar-system context:

- a mapped star system or descendant location focuses its system;
- an event focuses its mapped event location;
- a character focuses the mapped system of the latest eligible appearance and labels
  it **Last seen**;
- an unmapped or locationless object leaves the camera unchanged;
- technology, organization, species, and vessel selection leaves the camera
  unchanged unless a future accepted relationship supplies an explicit location;
- an astronomy-only search or map selection focuses that system.

Programmatic focus retains the existing true-coordinate, viewing-angle,
distance-aware, cancellation, and reduced-motion rules. Selecting empty map space
clears selection. Changing knowledge chapter or display date clears selection when
the selected object is no longer eligible and announces the change in DOM status
content.

## 9. Right object inspector

Before selection, the inspector explains that selecting a map marker or browser item
will show its reader-safe details. It must not fabricate narrative placeholder data.

Every inspector begins with:

- projected name;
- object type;
- narrative-known, astronomy-only, active, last-seen, or unmapped status as
  applicable;
- the source chapter/date context for recency when available.

Type-specific sections render only fields and generated relationships supported by
the current projection:

- **Character:** aliases, species, current state, dates, picture, and last eligible
  appearance.
- **Event:** story date or unplaced state, description, location, and named
  participants.
- **Star system/location:** narrative hierarchy, mapped/unmapped state, and joined
  astronomy facts for a mapped system.
- **Species:** description, picture, and homeworld.
- **Technology:** description.
- **Organization:** description and current state.
- **Vessel:** description and current state.
- **Astronomy-only system:** catalogue name, alternate designations, components,
  position/distance facts, provenance, and an explicit **Not story-known at this
  view** notice.

Entity names and relationships in the inspector are selection controls when their
targets are eligible. The inspector must not infer relationships absent from the
projection. In particular, a mention does not create a relationship.

## 10. Bottom progress and timeline dock

### 10.1 Read through

**Read through** is visually separated from ordinary navigation. It sets
`furthestChapterRead`, the hard spoiler ceiling. Advancing it requires an explicit
confirmation before any later chapter data becomes available. Selecting or scrubbing
a timeline never advances it.

When progress is absent, the first confirmed **Read through** choice also initializes
`viewChapter` to that chapter, sets `displayDate` to its story date, and enters Chapter
mode. This is one deliberate transition from zero state to the confirmed chapter
view. Later ceiling increases leave an already valid view chapter and display mode
unchanged.

Lowering the ceiling is allowed. If the new ceiling precedes `viewChapter`, the
workspace moves the knowledge chapter to that ceiling and recomputes the selected
mode without retaining later facts.

### 10.2 Chapter mode

Chapter mode is the default timeline:

- chapters appear in numeric book/chapter reading order and are grouped by book;
- chapters after **Read through** are visibly locked and cannot be inspected;
- selecting an unlocked chapter sets **Knowledge through** and sets `displayDate` to
  that chapter's date;
- story-year labels and forward/backward chronology indicators appear only on
  unlocked chapters and reveal non-chronological narration without reordering them;
- locked entries expose only spoiler-safe book/chapter identity, not title, story
  year, chronology direction, activity, location, characters, events, or other
  chapter-derived metadata;
- the status line states both chapter and represented year.

The chapter selector and the timeline are two controls over the same value. Selection
and keyboard focus remain synchronized.

### 10.3 Date mode

Date mode preserves **Knowledge through** and changes only `displayDate`.

The chronological timeline contains meaningful dates derivable from the permitted
reader-visible claims: eligible chapter state dates, introductions, updates, dated
events, and generated activity. It does not offer arbitrary year entry. A later
chapter may add a newly revealed earlier date, but that date appears only when the
knowledge chapter reaches the reveal.

Horizontal position is a linear function of calendar-year difference. A 100-year gap
occupies ten times the distance of a 10-year gap at the same zoom. The UI may zoom and
pan the time axis uniformly, hide colliding text, and provide a full-range overview;
it may not redistribute meaningful dates evenly.

Multiple indexed values in one year occupy the same year coordinate. They are exposed
as a stacked cluster or accessible choice list with descriptive source context. The
internal within-year index is never displayed or converted into elapsed time. A
year-only value remains unordered relative to indexed values in that year; the UI
offers only dates for which the projection is determinate.

The persistent status line uses wording such as:

```text
Universe in 2133 · using knowledge through Chapter 12
```

Returning to Chapter mode restores the previously selected chapter's normal
chapter-date view.

## 11. Activity meaning by mode

The same generated activity facts drive group counts, ordering, active map rings, and
inspector recency:

| Surface state         | Chapter mode                                           | Date mode                                         |
| --------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Active object         | Participates in selected chapter activity              | Has eligible activity at selected meaningful date |
| Last activity         | Latest reader-order activity through knowledge chapter | Latest comparable activity at/before display date |
| Active system         | Mapped ancestry of selected-chapter activity           | Mapped ancestry of activity at selected date      |
| Current list priority | Active objects, then reader-order recency              | Active objects, then story-time recency           |

A supplemental mention contributes direct `mention` activity for its target at the
enclosing chapter's date. It does not place a character, event, or object at the
chapter location. A mentioned mapped location also retains derived
`mapped_system_ancestry` activity.

## 12. Accessibility and resilient states

- Browser groups use semantic headings and lists; collapse controls expose
  `aria-expanded` and visible focus.
- Search results announce counts without moving focus on every keystroke.
- The map status badge and selection changes have equivalent DOM text.
- All map-selectable narrative systems are also reachable through the browser.
- Astronomy-only systems in context are reachable through query results without
  precise 3D picking.
- Timeline controls provide keyboard selection, zoom, pan, mode, lock, and current
  value semantics without requiring drag gestures.
- Selected, known, active, locked, and unmapped states use text or geometry in
  addition to colour.
- Reduced motion preserves immediate camera focus and uses no decorative timeline or
  marker animation.
- Loading, invalid projection, missing astronomy coverage, empty search, WebGL
  unavailable, and no-selection states provide actionable DOM content.
- The desktop workspace must reflow at 200% zoom without hiding browser, inspector,
  progress, or attribution access. BOB-016 owns the final mobile composition.

## 13. Out of scope

- Arbitrary date entry or a continuously simulated world.
- User-adjustable astronomy context radius.
- Fuzzy or full-description search, bookmarks, saved searches, or a command palette.
- Inferred organization membership, vessel ownership, technology use, or continuous
  character location.
- Separate vessel-instance/design identity layers, travel paths, chronicles, or
  genealogy.
- Draggable/resizable desktop panels.
- A second 3D engine, distorted map distances, or equally spaced chronological
  events.
- Phase 2 mobile composition; BOB-016 owns that design and implementation.

## 14. Delivery sequence

The implementation is divided into:

1. BOB-010 and ADR-0017: supplemental mentions and generated narrative activity;
2. BOB-011: reader progress and temporal navigation;
3. BOB-012: progressive browser and inspectors;
4. BOB-013: Phase 1B guaranteed astronomy neighbourhood catalogue required by Phase
   2;
5. BOB-014: narrative-aware map integration;
6. BOB-015: desktop integration and acceptance;
7. BOB-016: mobile design and responsive adaptation.

No task is authorized merely because it is listed here. Each task retains its own
status, dependencies, acceptance criteria, validation, and explicit-authorization
gate.
