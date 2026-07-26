# BOB-011: reader progress and temporal navigation

Status: Ready
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-26

## Objective

Implement the bottom desktop dock that separates spoiler progress, reader knowledge,
and represented story time. Provide reading-order Chapter mode and linear,
meaningful-date Date mode on the shared narrative projector.

## User-visible outcome

The reader explicitly sets how far they have read, freely revisits any unlocked
chapter, and can inspect the universe at a meaningful story year using only knowledge
revealed by a chosen chapter.

## Binding references

- `../design/phase-2-desktop-ui.md`, especially Sections 4, 5, 6, 10, and 11
- `../technical-design.md`, Sections 6, 10, and 12
- `../data-model-definition.md`, especially reader progress and projection
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `BOB-003-visual-system-and-application-shell.md`
- `../../AGENTS.md`

## Decisions

- **Read through** controls `furthestChapterRead` and advances only through an
  explicit confirmation.
- **Knowledge through** selects any chapter at or before that ceiling.
- Chapter mode sets the display date to the knowledge chapter's story date.
- Date mode keeps the knowledge chapter fixed and selects only meaningful,
  projection-safe dates revealed by that knowledge set.
- Chronological horizontal position is linear by calendar-year distance.
- Internal within-year indices are never displayed or converted to elapsed time.

## In scope

- Load the static book and chapter manifest needed for ordered navigation.
- Add guarded `furthestChapterRead`, `viewChapter`, timeline mode, display date,
  and required UI preferences to the versioned application state.
- Define migration or safe initialization from the existing `bobiverse.app-state.v1`
  record without creating a second unversioned persistence path.
- Render the pre-book zero state before a chapter is selected.
- Add explicit **Read through** selection and confirmation.
- On the first confirmation, initialize `viewChapter` to the confirmed chapter, set
  the display date to that chapter's story date, and enter Chapter mode.
- On later ceiling increases, preserve the current view chapter, display date, and
  mode when they remain valid.
- Prevent chapter selection beyond the confirmed ceiling.
- Support lowering the ceiling and safely recomputing an ineligible knowledge
  chapter, date, and selection.
- Implement synchronized chapter selector and book-grouped reading-order timeline.
- Show story-year metadata and non-chronological direction indicators only for
  unlocked entries in Chapter mode.
- Limit locked entries to spoiler-safe book/chapter identity; do not expose title,
  story date, chronology direction, activity, location, characters, events, or other
  chapter-derived metadata.
- Derive meaningful dates only from reader-visible, projection-relevant state and
  activity data.
- Implement a linear chronological overview plus uniform zoom and pan.
- Represent multiple meaningful values in one year at one year coordinate through an
  accessible cluster/list without showing the internal index.
- Exclude requested dates that make the partial-order projection indeterminate.
- Restore the selected chapter's date when returning from Date mode.
- Expose status text equivalent to `Universe in <year> · Knowledge through
Chapter <chapter>`.
- Keep map, browser, and inspector consumers on one centralized projection result.
- Generate the ordered narrative chapter manifest deterministically under the ignored
  `generated/narrative/` path and make the normal development/build path create or
  verify it before browser consumption.
- Keep selected world projections deterministic and in memory or build output; do not
  commit per-chapter projection snapshots or treat generated output as authored data.
- Update directly affected documentation in the same change:
  - `README.md` for progress and timeline use;
  - `docs/technical-design.md` for persisted state and runtime data flow;
  - `docs/data-model-definition.md` for manifest/projection ownership;
  - `docs/visual-testing.md` for Chapter mode, Date mode, lock, zoom, and reflow
    checks;
  - `docs/implementation-plan.md` if implementation deviates from this task;
  - this task's completion evidence and any generated-artifact deviations.

## Out of scope

- Arbitrary year entry.
- Equal spacing of meaningful dates.
- Automatic spoiler-ceiling advancement.
- Runtime narrative requests, accounts, cookies, or server persistence.
- Full object browser, type inspectors, narrative map markers, or mobile composition.
- Story-time interpolation or simulation between state changes.

## Acceptance criteria

1. Before progress is set, the zero state renders and no chapter source is exposed in
   the UI.
2. The first confirmed **Read through** choice atomically sets
   `furthestChapterRead` and `viewChapter` to that chapter, selects its story date,
   and enters Chapter mode.
3. Later ceiling increases preserve an already valid view chapter, date, and mode;
   advancing **Read through** always requires confirmation, and timeline navigation
   never advances it.
4. Locked chapters cannot become the knowledge chapter through mouse, keyboard,
   URL/state restoration, or direct state manipulation.
5. A locked entry exposes only spoiler-safe book/chapter identity. Its title, story
   date, chronology direction, activity, location, characters, events, and other
   chapter-derived metadata are absent from visible and accessible UI content.
6. Chapter mode orders numeric book/chapter references correctly, groups by book, and
   binds the display date to the selected chapter.
7. Date mode preserves the knowledge chapter and offers only meaningful dates
   derivable from its allowed knowledge set.
8. Later revelations about earlier story years appear only after the knowledge
   chapter reaches the reveal.
9. A 100-year interval renders ten times the horizontal span of a 10-year interval at
   the same zoom, within documented numerical tolerance.
10. Zoom and pan apply a uniform scale and never redistribute individual dates.
11. Same-year indexed dates share one year position; their internal indices are absent
    from visible and accessible UI text.
12. Year-only versus indexed partial-order cases never produce an indeterminate
    projection.
13. Lowering the spoiler ceiling clears or clamps all later state atomically and
    cannot leave later facts in another surface.
14. Versioned persistence restores valid progress and mode state and safely handles
    absent, corrupt, or incompatible stored values.
15. Keyboard users can select chapters/dates and operate timeline zoom/pan without a
    drag gesture; current, locked, selected, and focused states are non-colour-only.
16. Unit/component and browser tests cover progress confirmation, locked navigation,
    non-chronological chapters, later-revealed earlier facts, true-scale year
    positions, persistence, and zero-state behavior.
17. The normal dev/build path deterministically creates or validates the ignored
    chapter manifest before use; stale, missing, out-of-order, or path-inconsistent
    manifests fail with an actionable diagnostic.
18. No generated world snapshot is committed. The task records the exact generated
    manifest/runtime artifact paths and updates README, technical design, data-model,
    visual-testing, and completion documentation.

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

No user-facing manifest generation/freshness command exists yet. Implementation must
add that command to the normal development/build path and replace this paragraph with
its exact validation invocation before the task can become `Done`; do not claim a
nonexistent command in advance.

## Dependencies and cautions

- The existing projector already separates reader order and story time; extend that
  authority rather than creating UI-local filtering.
- `generated/narrative/` is intentionally ignored. Browser integration must define a
  reproducible generation or virtual-build step rather than asking contributors to
  hand-author the manifest or commit projections.
- BOB-010 supplies the complete meaningful activity input, but progress, chapter
  projection, and base timeline behavior can be implemented without authorizing
  BOB-010 simultaneously.
- Calendar year is the only user-visible time unit. The canonical index remains
  ordering metadata.
- Desktop scope does not waive BOB-016's later mobile requirement.
