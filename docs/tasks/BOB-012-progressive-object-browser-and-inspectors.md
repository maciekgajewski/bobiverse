# BOB-012: progressive object browser and inspectors

Status: Blocked
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-26

## Blocker

BOB-010 must first provide the generated narrative activity contract and BOB-011 must
provide the shared progress/projection state consumed by every browser mode.

## Objective

Replace the astronomy-only system directory and inspector shell with one progressive,
searchable, spoiler-safe browser and type-aware inspector driven by the selected
world-state projection.

## User-visible outcome

The reader can quickly find eligible characters, events, star systems, and every other
modeled object type. Current or recently relevant objects rise to the top within their
own group, and selecting any result opens only facts permitted at the current
knowledge chapter and story date.

## Binding references

- `../design/phase-2-desktop-ui.md`, especially Sections 4, 6, 7, 9, 11, and 12
- `../technical-design.md`, Sections 10 and 12
- `../data-model-definition.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `BOB-010-important-mentions-and-narrative-activity.md`
- `BOB-011-reader-progress-and-temporal-navigation.md`
- `BOB-003-visual-system-and-application-shell.md`
- `../../AGENTS.md`

## Decisions

- Groups have a fixed type order but appear only when they contain eligible objects.
- Groups are independently collapsible and their state is persisted.
- Search temporarily expands matching groups without overwriting saved state.
- Chapter mode sorts by reader-order activity; Date mode sorts by story-time activity.
- The browser shows only temporally eligible world-state objects, not known objects
  effective after the displayed date.
- Astronomy-only search results are added by BOB-014 after BOB-013 provides their
  context dataset.

## In scope

- Introduce a generic projected-object browser without removing the accepted
  astronomy-only directory and inspector path before BOB-014 can replace it.
- During this intermediate task, retain the current astronomy systems as a clearly
  separate compatibility section or equivalent adapter. It must preserve DOM
  selection and inspection, including when WebGL is unavailable, and must not be
  presented as the final **Nearby astronomy** search design.
- Add progressive groups for Characters, Events, Star Systems, Other Locations,
  Species, Technologies, Organizations, and Vessel Types.
- Show visible and active counts per group.
- Add accessible independent collapse controls and versioned saved state.
- Implement adaptive recency ordering using BOB-010 activity facts.
- Use stable projected-name ordering for recency ties.
- Add the browser search field and filter eligible narrative names and aliases.
- Keep search limited to reader-visible projected values.
- Select any eligible narrative object through one shared selection identity.
- Replace `SystemDetails` with type-aware inspector sections specified by the desktop
  design.
- Link eligible referenced objects within the inspector without inferring new
  relationships.
- Show explicit unmapped, unplaced, active, and last-seen states.
- Clear selection and announce the change when projection state makes an object
  ineligible.
- Preserve a useful browser and inspector path when WebGL is unavailable.
- Update directly affected documentation in the same change:
  - `README.md` for grouped browsing, search, and selection;
  - `docs/technical-design.md` for browser/inspector component and selection
    boundaries;
  - `docs/visual-testing.md` for groups, search, recency, sparse inspectors,
    compatibility astronomy browsing, and WebGL-unavailable checks;
  - this task's completion evidence and any documented deviations.

## Generated-artifact expectations

- This task consumes BOB-010 activity and BOB-011 world projections. It does not
  author or hand-edit narrative sources, activity indexes, world snapshots, or
  astronomy data.
- Ordinary ignored build output is not a task deliverable.
- If implementation discovers that the browser needs a new or changed generated-data
  contract, stop and update the owning BOB-010 or BOB-011 task and integrated
  documentation before proceeding. Do not create a UI-owned approximation or
  undocumented cache.

## Out of scope

- The final query-only **Nearby astronomy** context results and astronomy-only
  inspector; BOB-014 owns their replacement. BOB-012 must nevertheless preserve the
  existing astronomy browsing path until that replacement lands.
- Map marker or camera behavior.
- Description full-text, fuzzy search, bookmarks, saved searches, or a command
  palette.
- New narrative fields or inferred relationships.
- Histories, paths, chronicles, or genealogy.
- Mobile panel composition.

## Acceptance criteria

1. Only groups with at least one eligible object are rendered, in the fixed design
   order.
2. Each heading reports its visible count and nonzero active count.
3. Collapse controls are keyboard-operable, expose state semantically, persist
   through the versioned app state, and meet visible-focus requirements.
4. Search expands matching groups temporarily and restores prior expansion state when
   cleared.
5. Search matches only projected names and aliases case-insensitively and
   diacritic-tolerantly; it cannot reveal a later alias.
6. Chapter mode and Date mode implement the distinct activity ordering rules from the
   design, with deterministic name tie-breaking.
7. Future-at-date objects and chronologically unplaced Date-mode events are absent.
8. Explicitly unmapped eligible locations remain selectable and are never assigned a
   map context.
9. Character details use eligible appearances for **Last seen** and do not claim a
   current location from activity or `current_state`.
10. Every supported entity type has a sparse-safe inspector that renders only fields
    present in the projection.
11. Changing chapter/date clears an ineligible selection atomically and exposes an
    accessible status message.
12. WebGL-unavailable mode retains browser selection and DOM inspection.
13. Every currently shipped astronomy system remains selectable and inspectable
    through an ordinary DOM path after the generic browser is introduced; BOB-012
    does not create a gap awaiting BOB-014.
14. Tests cover progressive groups, all entity types, search visibility, collapse
    persistence, both recency modes, unmapped/unplaced states, sparse records, and
    selection invalidation, plus preservation of the astronomy compatibility path.
15. README, technical design, visual-testing instructions, and completion evidence
    describe the delivered browser, inspector, compatibility path, and generated-data
    ownership accurately.

## Validation commands

```bash
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

## Risks and cautions

- Descriptions may contain later or incidental words and are deliberately not a
  Phase 2 search corpus.
- Activity is a recency input, not a relationship or current-location authority.
- Progressive groups must not cause keyboard focus to disappear when a projection
  removes a group.
- Do not delete `SystemDirectory`, `SystemDetails`, or their behavior until equivalent
  temporary compatibility coverage exists. BOB-014 owns removal of that temporary
  path when its context search and inspector pass acceptance.
- Promote this task from `Blocked` only after BOB-010 and the required BOB-011 state
  contract are complete.
