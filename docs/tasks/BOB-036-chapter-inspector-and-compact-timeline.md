# BOB-036: chapter inspector and compact timeline

Status: Ready
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-29

## Objective

Make an unlocked chapter a selectable, inspectable timeline entity and present its
important reader-safe information in the shared inspector. Reduce Chapter-mode
timeline entries to concise navigation labels so chapter detail lives in one
purpose-built surface rather than being repeated along the timeline.

## User-visible outcome

Selecting an unlocked chapter changes the represented knowledge chapter and opens that
chapter in the desktop right-side inspector. The same chapter detail remains available
through the existing **Inspect selection** panel below the simultaneous-layout
breakpoint. The reader sees the book and chapter identity, optional illustration,
synopsis, main location, and, when present and eligible, lead characters, introduced
events, introduced vessels, introduced technologies, and a condensed appearing-
character list. Every displayed location, character, event, vessel, and technology is
selectable.

The Chapter-mode timeline shows the local chapter number alone for a numeric-only
title, preserves a descriptive title that already begins with that number and an
accepted separator, and otherwise shows the number followed by the title. It never
duplicates an existing numeric prefix and no longer repeats story year or
chronology-progression notes.

## Binding references

- `../design/phase-2-desktop-ui.md`, especially the timeline, inspector, selection,
  compact-reflow, and spoiler-safety sections
- `../technical-design.md`, Sections 6, 10, and 12
- `../data-model-definition.md`, especially assets, chapter sources, generated-data
  ownership, and unified vessel entities
- `../implementation-plan.md`, Phase 2
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../adrs/0014-unified-vessel-entities-and-authoring-quality.md`
- `BOB-011-reader-progress-and-temporal-navigation.md`
- `BOB-012-progressive-object-browser-and-inspectors.md`
- `BOB-015-phase-2-desktop-integration-and-acceptance.md`
- `BOB-029-responsive-chapter-projection-pipeline.md`
- `BOB-035-unified-vessels-and-authoring-quality.md`
- `../../AGENTS.md`

No ADR is expected. This task adds an optional chapter asset reference and a
reader-safe UI projection while preserving chapter-authored authority, static
deployment, centralized spoiler filtering, and the unified vessel model. If
implementation requires chapters to enter the narrative entity registry, changes
reader/story-time authority, or creates a second projection path, stop and propose an
ADR rather than expanding the task silently.

## Decisions

- Extend the shared tagged inspection identity with a distinct chapter selection,
  such as `{ kind: "chapter", id: "1.12" }`. A chapter is inspectable but is not a
  narrative entity and does not receive an entity-prefixed stable ID.
- Clicking an unlocked Chapter-mode timeline entry atomically selects that knowledge
  chapter and makes it the current inspection selection, replacing any inspected
  narrative or astronomy object.
- Chapter inspection is valid only in Chapter mode and only when its ID equals the
  current non-null `viewChapter`. Entering Date mode, returning to zero state,
  lowering the spoiler ceiling past it, or otherwise making it ineligible clears the
  selection atomically.
- Selection clearing uses the existing accessible status mechanism. Entering Date
  mode produces a concise live-region status equivalent to **Chapter inspection
  closed in Date mode**; it does not open a toast, modal, or blocking confirmation.
- Selecting the chapter itself does not infer a map target or initiate camera focus.
  Following a chapter relationship uses the existing narrative-entity selection and
  focus rules.
- Add optional `picture_id` to `chapter_source`. It references the existing curated
  asset registry and uses the existing asset path, validation, provenance, and
  intellectual-property rules. The inspector renders an illustration only when the
  selected chapter has one; no placeholder or empty illustration section appears.
- Chapter detail is derived once from the prepared narrative corpus through a typed,
  immutable, reader-safe runtime view model. React components do not import, scan, or
  interpret canonical chapter JSON, and chapter selection does not trigger a second
  corpus preparation or `NarrativeWorld` generation.
- The inspector presents:
  - book number and local chapter number;
  - chapter title;
  - optional chapter illustration;
  - the original chapter `summary`, labelled **Synopsis**;
  - the required default chapter `location_id`, labelled **Location** and linked to
    the eligible projected location;
  - when appearances exist, all appearances whose role is `lead`, deduplicated by
    character ID, labelled **Lead character** or **Lead characters**, and linked;
  - event entities introduced by this chapter and eligible in its exact Chapter-mode
    projection, linked;
  - vessel entities introduced by this chapter only, linked;
  - technology entities introduced by this chapter only, linked;
  - all appearing characters, deduplicated by character ID in first-appearance order,
    as one condensed linked list near the end.
- Important mentions, entity updates, event updates, organizations, species, and
  introduced locations do not implicitly enter the Events, Vessels, Technologies, or
  Characters lists.
- Relationship lists reuse the left browser's shared item-bullet visual treatment
  and comparable compact row styling without copying browser search, activity counts,
  collapse controls, grouping state, or recency semantics into the inspector.
- Clicking a chapter relationship keeps the current Chapter-mode knowledge view and
  replaces the chapter selection with that eligible narrative entity.
- Optional empty Lead character(s), Events, Vessels, Technologies, and Characters
  sections are omitted. The required default location failing to resolve is an
  actionable projection failure, not silently missing inspector content.
- An introduced event whose independent event date places it after or makes it
  incomparable with the enclosing chapter's Chapter-mode display date is omitted from
  chapter detail because it is absent from that exact reader-safe world. Chapter
  detail does not create a knowledge-only event projection or weaken entity-selection
  eligibility to expose it.
- Chapter-mode timeline labels use the local chapter number within their existing book
  grouping. If the trimmed title is exactly that same numeric string, the entry shows
  only the number. A number-prefixed descriptive title is one whose trimmed value
  matches `^<local number>\s*(?:-|–|—|:)\s+\S`; that entry shows the trimmed title
  once without adding another number. Every other nonnumeric title displays as
  `<number> — <trimmed title>`. Unlocked entries no longer show story year or
  chronology direction. Locked entries retain the existing spoiler-safe book/chapter
  identity and expose no title or chapter-derived detail.
- The zero-state timeline entry retains its existing explicit identity and pre-book
  affordance; it is not treated as a chapter.
- The same chapter inspector content is used in the `>=1200px` desktop right panel and
  the existing compact **Inspect selection** panel. This task does not decide the
  broader phone/tablet composition owned by BOB-016.
- Chapter inspection selection is transient UI state and is not added to
  `bobiverse.app-state.v1`.

## In scope

- Add optional chapter `picture_id` to the JSON Schema, TypeScript source/runtime
  types, source-aware diagnostics, semantic asset-reference validation, fixtures, and
  data-model documentation.
- Preserve compatibility for all existing chapters, none of which need an
  illustration assignment in this task.
- Define a typed chapter-detail projection from the already prepared corpus, including
  resolved book/chapter identity and stable relationship IDs.
- Extend shared selection state, selection eligibility, invalidation, accessible
  status, and inspector dispatch for chapter selections.
- Make an unlocked Chapter-mode timeline click update `viewChapter` and chapter
  inspection selection in one application transition.
- Render the ratified chapter sections and sparse behavior in the shared inspector.
- Reuse the project-owned browser item bullet for clickable chapter relationship
  rows, with accessible names, visible focus, and non-colour-only selected/focus
  states.
- Simplify Chapter-mode timeline visible and accessible labels to the ratified
  number/conditional-title rule while preserving book grouping, selection, locking,
  keyboard operation, and the continuous chapter rail.
- Clear chapter selection when entering Date mode or when chapter inspection becomes
  ineligible, without clearing an eligible narrative or astronomy selection merely
  because Date mode was entered.
- Preserve the existing compact inspector trigger, panel focus containment, Escape
  dismissal, close control, and focus return.
- Add unit, component, and browser regression coverage for schema validation, detail
  derivation, all relationship groups, selection coordination, Date-mode clearing,
  compact inspection, timeline labels, and locked-content absence.
- Update directly affected documentation in the same implementation change:
  - `README.md` for chapter inspection and concise timeline navigation;
  - `docs/technical-design.md` for chapter selection, detail projection ownership,
    invalidation, and optional chapter assets;
  - `docs/data-model-definition.md` for `chapter_source.picture_id` and chapter-detail
    generated/runtime ownership;
  - `docs/design/phase-2-desktop-ui.md` for inspector hierarchy and timeline labels;
  - `docs/implementation-plan.md` for the added Phase 2 chapter-inspection surface and
    concise Chapter-mode timeline contract;
  - `docs/visual-testing.md` for wide desktop, compact reflow, long character lists,
    optional sections, Date-mode clearing, and locked chapters;
  - this task's completion evidence and any documented deviations.

## Generated-artifact expectations

- Existing chapter source JSON remains authored data. Adding `picture_id` to a future
  chapter remains a separately reviewed editorial change and is not generated.
- Chapter-detail runtime records are derived deterministically from the prepared
  corpus and remain in memory or ordinary build output. Do not commit per-chapter
  detail snapshots or add chapter details to the hand-edited manifest.
- The ignored `generated/narrative/chapter-manifest.json` retains its ordered
  `{ chapter, path }` contract unless implementation discovers a genuine owning
  contract change. If so, stop and update the owning design/task surfaces before
  proceeding.
- This task changes no canonical narrative chapter content and adds no illustration
  asset.

## Out of scope

- Full BOB-016 phone/tablet composition, navigation, or acceptance.
- Treating chapters as direct narrative entities, browser-group items, activity
  targets, map markers, or map-focus locations.
- Chapter search, bookmarks, deep links, histories, chronology views, genealogy, or
  accumulated cross-chapter character appearance histories.
- Showing all important mentions, updated entities, introduced organizations/species/
  locations, or all activity records in chapter detail.
- Showing events updated or merely mentioned in the selected chapter.
- Adding chapter illustrations to existing canonical data or sourcing visual assets.
- Persisting the current inspection selection.
- Changing the spoiler-ceiling confirmation flow, Date-mode meaningful-date
  semantics, narrative moment ordering, or projection performance budgets.
- Restyling the entire object browser or timeline dock.

## Acceptance criteria

1. `chapter_source.picture_id` is optional, resolves to a registered curated asset,
   rejects unknown or wrong-type IDs with an actionable source-aware diagnostic, and
   leaves every existing chapter valid without edits.
2. An unlocked Chapter-mode timeline click atomically sets the requested
   `viewChapter`, binds the display date as before, and selects that exact chapter for
   inspection without producing a second corpus preparation or world projection.
3. The wide desktop right panel shows the selected chapter's book number, local
   chapter number, title, synopsis, linked default location, and, when present,
   linked lead character(s), eligible introduced events, introduced vessels,
   introduced technologies, and a condensed linked appearing-character list
   according to the Decisions section.
4. A valid chapter `picture_id` renders its registered illustration through existing
   asset handling. Its exact alternative text is `Illustration for Book <book>,
Chapter <local number>` for a numeric-only title, and appends `, <title>` for any
   other title. A chapter without `picture_id` renders no placeholder, empty image
   wrapper, or empty illustration heading.
5. Events contains only event introductions eligible in the exact selected
   Chapter-mode projection; Vessels contains only `vessel` introductions;
   Technologies contains only technology introductions. Updates, mentions, unrelated
   introductions, and future or temporally incomparable event introductions do not
   leak into those lists. A focused valid fixture proves that a future-dated
   introduced event is omitted rather than linked outside the centralized
   projection.
6. When appearances exist, lead characters are deduplicated from lead-role
   appearances. The condensed character list includes every unique appearing
   character once, preserves first-appearance order, remains usable with a long list,
   and appears near the end. A valid chapter without `appearances` omits both
   character sections without producing a projection failure.
7. Every rendered relationship is keyboard-operable, resolves only against the
   selected Chapter-mode reader-safe projection, and replaces chapter inspection with
   the selected narrative entity without changing the knowledge chapter.
8. Chapter selection alone never focuses the map. Selecting a linked narrative entity
   retains the established entity-to-map focus behavior.
9. Entering Date mode clears only a chapter selection, restores the empty inspector,
   and emits the agreed accessible status. It does not show stale chapter detail or
   clear an otherwise eligible narrative/astronomy selection.
10. Returning to zero state, lowering the spoiler ceiling past the inspected chapter,
    restoring malformed/ineligible state, and other invalidation paths cannot leave
    stale or locked chapter detail in any inspector surface.
11. Below the simultaneous-layout breakpoint, selecting a chapter enables the existing
    **Inspect selection** path and shows the same detail component. Its close, Escape,
    focus containment, and focus-return behavior remain correct.
12. An unlocked Chapter-mode timeline entry displays only `<local number>` when its
    trimmed title is the same numeric value, displays a trimmed title matching
    `^<local number>\s*(?:-|–|—|:)\s+\S` once without duplication, and otherwise
    displays `<local number> — <trimmed title>`. Focused cases cover all three forms
    and each accepted separator. Story year and chronology-progression text are absent
    from visible and accessible chapter-entry content.
13. Book grouping, the selected state, the continuous rail, zero-state affordance,
    keyboard operation, and locked entry behavior remain intact. Locked chapters
    expose no title, synopsis, year, chronology note, picture, location, character,
    event, vessel, technology, or other chapter-derived metadata.
14. Chapter-detail React code consumes the typed prepared-corpus-derived view model;
    it does not import or scan source chapter modules, reconstruct spoiler filtering,
    or add a committed/generated chapter-detail snapshot.
15. Focused tests cover numeric and nonnumeric titles, multiple leads, no appearances,
    duplicate appearances, long character lists, empty optional introduction groups,
    every supported introduction group, valid/missing/invalid pictures, relationship
    selection, Date-mode clearing, ineligible selection, compact inspection, and
    locked-content absence.
16. README, technical design, data-model definition, desktop design, implementation
    plan, visual-testing guidance, task index, and completion evidence agree with the
    delivered selection, asset, content, responsive, and timeline contracts.
17. All documented validation commands pass, the Captain completes manual visual
    acceptance in the wide and compact desktop layouts, and a fresh independent
    implementation review reports `No findings.`

## Validation commands

```bash
npm run narrative:manifest
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run performance
git diff --check
```

Manual review uses `npm run dev` with the canonical corpus from the remote workstation
and must cover:

- numeric-only and descriptive chapter labels from the canonical timeline, including
  the absence of a duplicated numeric prefix;
- the wide desktop right-side chapter inspector;
- the existing compact **Inspect selection** panel, including focus behavior;
- present and absent optional introduction sections available in the canonical
  chapters;
- chapter-to-entity relationship navigation and resulting map behavior;
- Date-mode chapter-selection clearing;
- locked chapter metadata absence.

Synthetic states absent from the canonical corpus—an unprefixed descriptive title,
multiple leads, no appearances, long character lists, future-dated introduced events,
and present chapter illustrations—are automated fixture cases only. Component tests
must render their resulting DOM and accessibility behavior directly; they are not
prerequisites for the canonical `npm run dev` manual review and do not authorize
temporary or canonical narrative-data edits.

## Dependencies and risks

- BOB-029's prepared-corpus and one-projection transition budget remains binding.
  Chapter detail derivation must not return schema compilation or corpus scanning to
  timeline clicks.
- `summary`, introductions, and appearances are canonical authored claims. The
  inspector may present their reader-safe structure but must not reinterpret activity
  as a relationship or reconstruct a chapter from generated recency records.
- A rendered chapter relationship must resolve in the exact selected Chapter-mode
  world. A missing required location indicates a projection/contract defect and must
  fail actionably rather than expose raw source or silently drop required content.
  Optional character sections and temporally ineligible introduced events follow the
  explicit omission rules above.
- The shared item-bullet treatment should be factored for reuse without coupling the
  inspector to browser search, counts, ordering, or collapsed-group persistence.
- Current canonical chapter titles are largely numeric. Tests need a nonnumeric title
  fixture to prove the conditional title rule without editing book-derived data.
- This UI task remains `In progress` after automated validation until the Captain
  explicitly accepts the required wide and compact visual review.
