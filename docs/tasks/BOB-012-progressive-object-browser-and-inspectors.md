# BOB-012: progressive object browser and inspectors

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-26

## Dependency status

BOB-010 and BOB-011 are complete. Their generated narrative activity contract and
shared progress/projection state are available to this task.

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
- Each group heading uses an original, type-specific SVG line icon. Object rows use
  one shared SVG ring-and-dot bullet; neither marker is a CSS-drawn proxy.
- Captain visual review supersedes the earlier interim-compatibility decision: the
  legacy astronomy directory is removed in BOB-012 rather than retained until
  BOB-014.

## In scope

- Introduce a generic projected-object browser and remove the legacy astronomy-only
  directory from the left rail.
- Add progressive groups for Characters, Events, Star Systems, Other Locations,
  Species, Technologies, Organizations, and Vessel Types.
- Add a distinct project-owned SVG icon to each group heading and a shared SVG bullet
  to each object row.
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
    icon treatment, absence of the legacy astronomy list, and WebGL-unavailable
    checks;
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
  inspector; BOB-014 owns that final DOM path. Until then, catalogue systems are
  selected from the map rather than a left-rail list.
- Map marker or camera behavior.
- Description full-text, fuzzy search, bookmarks, saved searches, or a command
  palette.
- New narrative fields or inferred relationships.
- Histories, paths, chronicles, or genealogy.
- Mobile panel composition.

## Acceptance criteria

1. Only groups with at least one eligible object are rendered, in the fixed design
   order.
2. Each heading reports its visible count and nonzero active count, carries the
   correct type-specific SVG icon, and every object row carries the shared SVG bullet.
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
12. WebGL-unavailable mode retains narrative browser selection and DOM inspection.
13. The legacy **Astronomy systems** compatibility directory is absent. BOB-014 owns
    the final query-only DOM path for nearby astronomy catalogue systems.
14. Tests cover progressive groups, all entity types, search visibility, collapse
    persistence, both recency modes, unmapped/unplaced states, sparse records, and
    selection invalidation, group icon coverage, shared item bullets, and absence of
    the legacy astronomy directory.
15. README, technical design, visual-testing instructions, and completion evidence
    describe the delivered browser, inspector, icon treatment, astronomy boundary,
    and generated-data ownership accurately.

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

## Implementation evidence

Implementation and automated validation completed on 2026-07-26. `ObjectBrowser`
consumes only the centralized
projected world and generated activity index, renders the fixed progressive group
order, persists independent collapse preferences in `bobiverse.app-state.v1`, and
keeps search expansion transient. Chapter and Date modes use distinct reader-order
and comparable story-time recency functions with stable projected-name ties.

One tagged selection identity now covers narrative entities and astronomy catalogue
systems. `ObjectInspector` resolves narrative details and relationship controls only
against the current projection, renders every supported type sparsely, labels
unmapped and unplaced states explicitly, and clears an ineligible selection with an
accessible announcement. Each progressive group heading uses its own original SVG
line icon and each object row uses a shared SVG bullet. Following Captain visual
review, the legacy 21-system left-rail directory was removed; catalogue selection
remains map-driven until BOB-014 adds the final query-only **Nearby astronomy** DOM
path.

The implementation completed BOB-011's already-documented generated
`last_known_location` contract because BOB-012 could not otherwise satisfy the
character **Last seen** requirement without scanning chapter source in UI code.
Projection tests cover unique latest sightings, tied sightings, and Date-mode
exclusion of unplaced events; the BOB-011 completion evidence and integrated data
model were updated consistently. No authored narrative or astronomy data changed.

ADR-0013 and BOB-027 subsequently promote equal year-only chapter ordering to
appearances and Date-mode activity recency. The centralized projector still owns
`last_known_location`; inspectors do not infer it locally.

All documented validation commands pass after the icon and astronomy-directory
changes: narrative validation accepts the zero state and 2 chapter sources; format,
lint, and typecheck pass; 95 unit/component tests pass across 20 files; the production
build passes after validating all 21 astronomy systems; all 24 Playwright flows pass
in Chromium, Firefox, and WebKit; and `git diff --check` is clean. README, technical
design, and visual-testing guidance describe the delivered SVG treatment, removal of
the legacy catalogue list, final BOB-014 ownership, and manual checks.

## Manual acceptance

The Captain manually reviewed the final group-heading icons, per-item bullets, and
removal of the legacy astronomy compatibility list and explicitly accepted the UI on
2026-07-26. Together with the automated evidence above, this completes BOB-012.

## Risks and cautions

- Descriptions may contain later or incidental words and are deliberately not a
  Phase 2 search corpus.
- Activity is a recency input, not a relationship or current-location authority.
- Progressive groups must not cause keyboard focus to disappear when a projection
  removes a group.
- Removing the legacy directory creates an intentional interim gap for keyboard and
  WebGL-unavailable astronomy-only selection. Captain accepted that boundary;
  BOB-014 owns the final contextual astronomy search and DOM fallback.
- Promote this task from `Blocked` only after BOB-010 and the required BOB-011 state
  contract are complete.
