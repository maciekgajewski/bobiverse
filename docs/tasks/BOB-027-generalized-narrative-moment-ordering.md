# BOB-027: generalized narrative-moment ordering

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-28

## Objective

Implement ADR-0013 by promoting the existing equal-year chapter fallback from
state-property writes to every comparison between chapter-authored narrative facts,
while preserving indexed-date authority, mixed-precision incomparability, and
date-only display controls.

## User-visible outcome

At knowledge through chapter 1.11, Bob has a projected last-known location of New
Handeltown from chapter 1.11. Selecting Bob keeps Bob in the inspector and selects and
focuses Sol on the map through the canonical New Handeltown -> Earth -> Sol -> Solar
System ancestry.

Equal year-only activity, event, appearance, and state facts use one predictable
chapter-order rule throughout the application.

## Binding references

- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0009-year-only-state-write-chapter-order.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`
- `../technical-design.md`, Sections 12 and 13
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `BOB-010-important-mentions-and-narrative-activity.md`
- `BOB-011-reader-progress-and-temporal-navigation.md`
- `BOB-012-progressive-object-browser-and-inspectors.md`
- `BOB-014-narrative-aware-map-integration.md`
- `BOB-020-year-only-state-write-ordering.md`
- `../../AGENTS.md`

## Decisions

- Replace the state-specific ordering abstraction with one shared
  `NarrativeMoment { date, sourceChapter }` comparator.
- Different years use numeric year order.
- Same-year indexed dates use numeric index order; equal indexed moments remain tied.
- Same-year year-only facts use canonical numeric chapter order.
- Mixed indexed and year-only dates in the same year remain incomparable.
- Use the shared comparator only between two chapter-authored facts.
- Exclude chronologically unplaced event activity from narrative-moment comparison;
  retain it only for Chapter-mode reader-order context.
- Continue using the generic date comparator when comparing a fact with a requested
  display date or arranging meaningful date controls.
- Keep generated `last_known_location` as a sighting, not current presence.
- Do not add UI-local location inference or map fallback logic.

## In scope

- Generalize the state-write moment type and comparator in the centralized narrative
  model.
- Use it for temporal-write validation and property projection without changing their
  established results.
- Use it to derive the latest eligible character appearance.
- Use it for generated narrative-activity ordering, event-derived activity, and
  Date-mode latest-activity/browser recency decisions.
- Keep the generated activity array deterministic without treating the array order of
  undated or incomparable records as semantic story chronology.
- Audit all generic date-comparator call sites and classify them explicitly as
  fact-to-fact or fact-to-display-date comparisons.
- Add focused unit coverage for year-only, indexed, equal-indexed, mixed-precision,
  different-year, undated-event, and zero-state boundaries.
- Add a real-corpus integration assertion that chapter 1.11 projects Bob's
  `last_known_location` as New Handeltown from chapter 1.11 and resolves map focus to
  astronomy system `sol`.
- Add a browser regression that sets progress through chapter 1.11, selects Bob, and
  observes Sol's DOM-backed selection label while Bob remains selected in the
  inspector.
- Require manual acceptance from a remote workstation in a real supported WebGL
  browser: selecting Bob at chapter 1.11 must visibly select Sol and retain Bob in the
  inspector.
- Update the integrated temporal, projection, activity, extraction, and visual-testing
  documentation.
- Preserve the separately authorized canonical correction that places New Handeltown
  on Earth.

## Out of scope

- Changing the narrative date schema or displaying internal date indices.
- Ordering equal indexed moments by chapter.
- Comparing mixed year-only and indexed moments.
- Giving requested display dates, zero state, or astronomy records synthetic source
  chapters.
- Treating `last_known_location` as current presence or placing a character directly
  at map coordinates.
- Adding or changing canonical chapter dates.
- Changing map coordinates, camera geometry, or selection identity ownership.
- Mobile composition work owned by BOB-016.

## Acceptance criteria

1. One shared narrative-moment comparator orders two chapter-authored facts by year,
   then explicit index when present, then canonical chapter for equal year-only dates.
2. Equal indexed moments remain tied and mixed year-only/indexed moments remain
   incomparable.
3. State-write validation and projection retain all ADR-0009 behavior and regression
   coverage.
4. Latest character sightings use narrative moments; at chapter 1.11 Bob's generated
   `last_known_location` is New Handeltown with source chapter `1.11` and effective
   date `2133`.
5. Date-mode latest activity, browser recency, generated activity ordering, and
   event-derived activity use the shared fact-to-fact ordering rule.
6. Undated event activity remains available in Chapter mode, has no narrative moment,
   and does not participate in Date-mode recency.
7. Fact-to-display-date eligibility and meaningful-date controls continue to use
   date-only partial ordering.
8. Selecting Bob at chapter 1.11 resolves through New Handeltown and Earth to
   astronomy system `sol`, renders Sol's selected state, and leaves Bob selected in
   the inspector.
9. Equal indexed and mixed-precision appearance/activity/event fixtures demonstrate
   that no prohibited fallback is introduced.
10. No UI component scans canonical chapter files or reconstructs last-known location.
11. ADR-0013, technical design, data-model definition, extraction guidance,
    visual-testing guidance, task index, and affected completion notes agree.
12. Canonical narrative validation accepts all 11 chapters, and the generated chapter
    1.11 projection contains the expected Bob and New Handeltown relationships.
13. Automated browser coverage observes Sol's DOM-backed selection label after
    selecting Bob, and the Captain confirms the WebGL selection frame and camera focus
    from a remote workstation while Bob remains selected in the inspector.
14. All documented validation commands pass, and a fresh independent implementation
    review reports `No findings.`

## Validation commands

```bash
./node_modules/.bin/vitest run tests/unit/narrative.test.ts tests/unit/narrative-browser.test.ts tests/unit/narrative-map.test.ts tests/component/App.test.tsx
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter 1.11 --output /tmp/bobiverse-bob-027-world-1.11.json
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

Manual visual acceptance from a remote workstation:

1. Run `npm run dev` on the trusted-LAN development host.
2. Open the permitted development URL in a supported WebGL browser.
3. Set **Read through** and **Knowledge through** to chapter 1.11.
4. Select Bob in the character browser.
5. Confirm Bob remains in the inspector, Sol receives the visible selected frame and
   label, and the camera focuses Sol without changing map coordinates.

## Validation status

Automated validation completed on 2026-07-28:

- the focused narrative, browser, map, and App suite passed 49 tests;
- canonical validation accepted the zero state and all 11 chapter sources;
- the generated chapter 1.11 projection records Bob's last-known location as New
  Handeltown from chapter 1.11 at `2133`;
- formatting, lint, typecheck, and `git diff --check` passed;
- the full unit/component suite passed 125 tests across 22 files;
- the production build passed after validating 97 reconciled astronomy systems and
  five pinned sources, retaining only the existing advisory chunk-size warning;
- all 42 Playwright scenarios passed across Chromium, Firefox, and WebKit, including
  the Bob-to-Sol selection regression in each engine; and
- the final fresh independent implementation review returned `No findings.`

On 2026-07-28, the Captain completed and accepted the required remote-workstation
WebGL review: Bob remained selected with New Handeltown as the chapter 1.11
last-known location, Sol received its selected frame and label, and the camera focused
Sol. BOB-027 is complete.

## Documentation and generated artifacts

- Update `../technical-design.md`, `../data-model-definition.md`,
  `../chapter-extraction.md`, and `../visual-testing.md`.
- Add concise supersession notes to BOB-010, BOB-011, BOB-012, BOB-014, and BOB-020
  where their completion evidence records the former narrower rule.
- Keep `generated/narrative/chapter-manifest.json`, generated world projections,
  Playwright output, and production build output ignored and reproducible.
- Do not commit `/tmp/bobiverse-bob-027-world-1.11.json` or browser diagnostic
  screenshots.

## Risks and cautions

- Replacing every generic date comparison mechanically would incorrectly give a
  display-date control a source chapter. Classify call sites before changing them.
- Activity currently has both story-date and chapter-order consumers. Chapter mode
  remains reader-order based; Date mode uses narrative moments only for fact-to-fact
  recency after date eligibility is established.
- Event activity uses the event's own date when present and its reveal/update chapter
  as provenance. Do not replace the event date with the enclosing chapter date.
- Equal indexed and mixed-precision moments must not fall back to lexical order where
  a unique semantic result is required.
- Browser regression asserts the DOM-backed selection label after choosing a
  character; the WebGL frame and camera-focus checks remain manual acceptance
  responsibilities.
- Preserve unrelated and pre-existing worktree changes, including the authorized
  New Handeltown parent relationship.
