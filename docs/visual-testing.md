# Visual and browser testing

Run the automated browser interaction suite on the headless development host:

```bash
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

Playwright writes reports to `playwright-report/` and retains screenshot, trace, and
video artifacts for failed tests under `test-results/`. Tests within each browser
project run serially to avoid exhausting headless software-WebGL resources; Chromium,
Firefox, and WebKit projects still run as separate required targets. Chromium and
WebKit use their headless modes. This host's Firefox headless mode does not expose a
WebGL context, so the Firefox project runs headed inside the disposable Xvfb display
created by `xvfb-run -a`; `npx playwright install --with-deps` supplies that system
dependency.

## Production chapter-transition performance

Run the isolated BOB-029 production authority with:

```bash
npm run performance
```

The command builds the current source, serves that exact production bundle at strict
`127.0.0.1:4173`, and runs only the pinned headless Chromium benchmark at 1440 by 1000
with reduced motion. It needs no external service or network access. Do not run a
concurrent repository build, test, benchmark, DevTools recording, or CPU throttling.

The benchmark seeds reading progress through Chapter 1.11 with Chapter 1.10 selected,
performs two excluded 1.10/1.11 warm-up cycles, then measures ten alternating
transitions beginning with 1.11 through the actual chapter buttons. Before every
excluded warm-up and measured transition, the first scenario clears inspection and
the second selects **Solar System**; each subsequent chapter click must replace that
prepared source state with the matching chapter inspector. Source-state preparation
is outside the timing window. Each sample begins at the capture-phase chapter-button
click and ends after the target button, shared map badge, and two animation frames
have completed. Each scenario must have a median at or below 100 ms and no sample
above 150 ms.

BOB-036 deliberately supersedes BOB-029's selected-object retention assertion for
chapter-button clicks because those buttons now select the chapter for inspection.
Knowledge-only changes still preserve eligible narrative and astronomy selections,
and retain separate application regression coverage.

The gate prints all samples, median, maximum, bundle assets, browser, Node, host,
platform, and CPU identity. These production measurements are authoritative.
Development-server interaction timing is diagnostic only because React and Vite
development checks add work that is absent from the deployed bundle.

For manual acceptance, start `npm run dev` and open
`http://<development-host>:5173` from a trusted-LAN workstation. Test current Chrome,
Firefox, Safari, and Edge where available. Check rotate, zoom, pan, marker picking,
directory selection, reset, fixed light-year scale and detail formatting, command-bar
browser opening, selected-system inspector behavior, and the phone-sized layout.
Verify reduced-motion behavior with the operating-system setting.

The headless development environment cannot substitute for manual GPU/browser review.
Record each unavailable browser explicitly as an acceptance gap before publication.

## BOB-20260731-MCVXSZ zoomed stellar-system mode

Select the canonical **Solar System**, enter the system, and verify that Sol retains
its ordinary glyph treatment while becoming larger. Other systems must remain
stationary, strongly dimmed, unlabeled, and non-pickable; the Galactic backdrop
remains aligned while the grid, captions, scale, and interstellar selection treatment
disappear.

Verify that the camera preserves its viewing angle during entry, then remains fixed:
drag, wheel, pinch, double-click, and map keyboard movement must have no effect while
browser zoom remains available. Select every component through both its independent
canvas target and the inspector's labelled **Component stars** controls. Each selected
component must identify its parent system and catalogue facts without suggesting a
narrative-star mapping or physical separation.

At desktop, compact, phone, short-height, and 200% browser zoom, verify the
**Star Map / Sol** breadcrumb, **Return to map**, visible focus, and
reachable inspector. Browser Back, the root **Star Map** breadcrumb, and **Return to
map** must each restore the exact pre-entry view once, retaining the entered system
as the ordinary selected system. Repeat with reduced motion enabled and with WebGL
unavailable; the DOM entry, component inspection, and exit controls must remain
reachable even when the visual transition cannot render.

## BOB-005 Galactic starfield backdrop

At desktop, compact, and phone widths, confirm that the permanent backdrop remains
subordinate to markers, labels, selected frames, the Galactic plane, orientation
aids, and the scale. The Galactic-plane grid should stay readable near the camera and
smoothly vanish in the distance rather than building visual density against the
backdrop. Orbit, pan, zoom, select, focus, and reset; confirm the scale, hover
separations, system distances, and displayed Galactic coordinates remain in
light-years. The background and grid must not pick, obscure, clip, show a seam, or
develop parallax. At the documented reset pose, verify manually that the bright
Galactic-centre feature is in the `+Xg` direction. Verify the visible text-only source
credit can receive keyboard focus and opens the NASA source page. The backdrop does
not animate, so reduced-motion behaviour is unchanged.

## BOB-005 manual acceptance

On 2026-07-23, the Captain accepted manual desktop and mobile browser verification of
the Galactic backdrop. The review covered the Galactic-centre direction, visual
hierarchy, distant-grid fade, selection and camera interactions, and the visible
source credit. The existing Safari real-browser pre-publication gap remains unchanged
because no Apple test workstation is available.

## Phase 1A manual acceptance

Manual and visual testing passed on 2026-07-22 in current Windows Chrome, Firefox,
and Edge. Mobile Chrome was also functional; its imperfect navigation is accepted for
the desktop-first Phase 1A scope and deferred for later responsive polish. Safari was
unavailable because no Apple test workstation was available, so Safari remains an
explicit required check before publication. The Captain accepted the Phase 1A visual
result and spatial legibility.

## BOB-003 manual acceptance

On 2026-07-23, the Captain accepted the visual-system and application-shell review.
The review covered the desktop framed shell, responsive map visibility, compact
browser and inspector panels, selected-system details, and the visible VizieR
attribution footer. Chrome, Firefox, and WebKit automated coverage also passed; the
existing Safari real-browser publication gap remains unchanged.

## BOB-011 reader progress and temporal navigation

At a desktop width of at least 1200 CSS pixels, begin with a cleared
`bobiverse.app-state.v1` localStorage record. Confirm that the map badge says
**Pre-book zero state** and no chapter title, story year, chronology indicator, or
other chapter metadata is visible. Choose **Read through**, verify that a confirmation
appears immediately when the selector changes, then confirm Chapter 1. Check that
Chapter mode selects the same chapter and that the status and badge show its
represented year. Advance the ceiling while viewing an earlier
chapter and verify that the view, date, and mode remain unchanged; lower it again and
verify that no later knowledge, date, or selection remains. Select **Pre-book zero
state** in the spoiler-limit selector and confirm that the confirmation hides every
chapter-derived fact. Return to zero through the chapter-dot timeline and verify that
it clears the chapter-derived facts immediately, without a confirmation, while the
**Read through** selector retains its confirmed chapter and **Knowledge through** shows
**Zero state**.

When confirmation is visible, verify that it is centered above a blurred, noninteractive
page backdrop: map labels and every other page surface remain behind it. The shield mark
appears beside both **Read through** and the confirmation heading.

In Chapter mode, use both the selector and chapter buttons with a keyboard. Confirm
that locked entries expose only book/chapter identity and cannot change knowledge.
Verify that the chapter timeline is one horizontal reading-order line of dots with
concise local-number/conditional-title labels and no story year or chronology note. In Date
mode, use the mouse wheel to zoom and drag to pan; confirm the focused axis also accepts
`+`/`−` and arrow keys. Verify that the year axis has linear spacing (a 100-year
interval is visibly ten times a 10-year interval at one zoom). Click a year marker
with one story state and confirm that it selects that year directly. For a year with
multiple states, confirm that the marker opens a compact choice list at the shared year
position. Confirm that each choice has unique, reader-visible source-chapter context,
the latest year's full list remains reachable by panning, and no canonical internal
ordering index is displayed. Returning to Chapter mode restores the selected chapter's
story year. At 200% browser zoom, verify the command bar exposes **Timeline and
progress** after the CSS viewport falls below the simultaneous-layout breakpoint.
Open it and confirm the same **Read through**, mode, chapter/date, and timeline values
appear in a non-animated modal panel. Tab and Shift+Tab must remain inside it; Escape
and the visible close control must return focus to the invoking command. The page must
not gain horizontal scrolling, and the attribution footer must remain reachable after
the panel closes.

The dock remains one compact, fixed-height desktop row while switching between Chapter
and Date modes; no mode change should move the map or footer vertically. The
spoiler-limit card stays narrow, the mode controls stack vertically, and the chapter
rail uses one uninterrupted central line with concise labels above.

## BOB-012 progressive object browser and inspectors

At a desktop width of at least 1200 CSS pixels, clear
`bobiverse.app-state.v1`. In the pre-book view, confirm that only nonempty groups are
shown in the fixed design order and that no legacy **Astronomy systems** catalogue
directory is present. Confirm each visible group heading has the distinct original
line icon for its type and every object row has the shared ring-and-dot SVG bullet;
neither should appear as a CSS-drawn proxy. Verify the icons remain crisp, aligned,
and subordinate to the semantic labels at normal and 200% zoom.

Confirm and view Chapter 1.2. Check that Characters, Events, Star Systems, Other
Locations, Species, Technologies, and Organizations appear, while the empty Vessels
group does not. Group headings must report visible counts and nonzero active
counts. In Chapter mode, selected-chapter objects precede older activity; in Date
mode, active-at-date objects precede the latest comparable activity at or before the
chosen year. Names break equal-recency ties consistently.

Collapse several groups with mouse and keyboard, reload, and confirm the arrangement
persists. Enter a query that matches an item in a collapsed group; the matching group
must expand without changing its saved state, and clearing the query must restore the
collapse. Check mixed case, a known alias, and a name with a diacritic. Confirm that
later aliases, descriptions, and ineligible objects never match, empty-search feedback
is explicit, result counts are announced without moving focus, and all collapse
buttons expose `aria-expanded` with visible focus.

Disable WebGL for the site and repeat narrative-object selection through the DOM
browser. Narrative details and relationship controls must remain usable.

Inspect at least one sparse record of every supported type. Verify absent fields do
not produce placeholders, eligible relationships act as selection controls, and a
mention alone does not become a relationship. New Handeltown must say
**Explicitly unmapped** and remain selectable. An unplaced event must say
**Chronologically unplaced** in Chapter mode and be absent in Date mode. Character
details must label the eligible appearance as **Last seen**, with chapter and year,
and must never call activity or `current_state` a current location.

With a vessel fixture or reviewed chapter available, verify the browser group is
labelled **Vessels**, the inspector type is **Vessel**, and optional description and
current state render sparsely. Confirm a vessel may describe a named spacecraft,
design, or family without exposing a separate vessel-type object.

Inspect the descriptions visible through the latest canonical chapter. They must
state supported positive knowledge without reader-facing notices that a detail is
unrevealed, unknown, unexplained, unavailable, or unspecified.

With a Chapter 1.2-only narrative object selected, change **Knowledge through** to
Chapter 1.1. Its details must disappear in the same state transition, selection must
clear, and an accessible status message must announce why. Repeat selection from the
compact browser/inspector panels and confirm the same projection, relationship, and
DOM behavior is reused rather than recomputed in a separate mobile path.

## BOB-014 narrative-aware map integration

In the pre-book view, verify that the map contains only the configured-radius
neighbourhood around Sol, not the complete static catalogue. The historical BOB-014
single-ring treatment is superseded by BOB-034: ordinary narrative-known systems are
ringless and keep collision-managed captions, while active systems at the selected
chapter/date retain static nested ellipses and an outward tick. A selected system
keeps its outer corner frame and collision-managed caption below the marker. Rotate,
pan, and zoom while creating
caption collisions:
selected and active captions must remain visible, while lower-priority known captions
may hide and reappear. Hover a known and an astronomy-only system: the tooltip must
be the hovered system's only name surface, the duplicate map caption must be absent,
nearby captions must not jump underneath the tooltip, and the known caption must
return when hover ends. Astronomy-only context markers must have no persistent
caption or narrative ring. Confirm component colour families, decorative clusters,
scale, picking, measurements, Galactic backdrop, reset, and reduced-motion focus
behavior remain unchanged. Known-system captions are plain labels centered below
their marker; only a hover tooltip receives a bordered surface.

Search a known nearby astronomy-only system by a preferred name and an alternate
designation. **Nearby astronomy** must appear only for a nonempty query, contain only
systems already rendered in the current context, and vanish when cleared without
clearing an eligible selected result. Select one from both search and map; its
inspector must show catalogue facts, provenance, and **Not story-known at this view**.
Repeat with WebGL unavailable to verify the same DOM path works without precise 3D
picking. Change chapter/date until an astronomy-only selection leaves the context and
confirm selection clears with the DOM status announcement.

Select a mapped system, descendant location, event at a mapped location, and a
character with one **Last seen** mapped location; each must focus the canonical system
without changing viewing angle. Select an unmapped event/location and a locationless
entity; their inspectors remain available but the camera must not move.

## BOB-034 expressive starfield hierarchy

At desktop, compact, and phone widths, compare bright, ordinary, multi-component,
neutral-fallback, and ultracool components. Confirm one coherent family of sharp
cores, compact colour-family halos, and deterministic restrained rays; repeat the
same view and verify component optics do not change. Faint ultracool components remain
smaller, dimmer, and rayless. No halo or ray extends outside the existing visible
footprint, and the independent pick target remains practical.

At the fixed Chapter 1.14-reproduced benchmark fixture, compare Sol and active Epsilon
Eridani with representative astronomy-only context. Astronomy-only systems remain
clearly visible at `0.25` post-clamp emphasis and preserve colour and relative
variation. Narrative-known glyphs must read at `2×` complete visible size, with
proportional `2×` ray reach and effective `2.5×` core/halo size. Confirm the larger
decorative footprint does not alter picking, coordinates, or measurements.
Ordinary narrative-known systems have no persistent ring, while the active double
ring/tick, selected corner frame, hover tooltip, and caption priorities remain
clear. Select from both canvas and DOM paths, deselect, focus, and reset.

Orbit above and below the Galactic plane and approach a grazing view. Ordinary
one-unit lines remain uniformly faint, axes stay subordinate, and the grid fades
smoothly with planar distance and absolute grazing angle without a hard boundary,
hemisphere asymmetry, or dense horizon. Confirm the unchanged Deep Star Maps backdrop
remains aligned, seam-free, local-only, camera-following, and non-pickable.

Run `npm run performance:map` with no concurrent build, test, browser benchmark, or
throttled workload. It must assert the immutable fixture and the stored three-run
baseline before enforcing the relative and long-frame budgets. Headless evidence does
not replace smooth orbit/pan/zoom review on the Captain's real supported browser.
Confirm the approved `0.09` damping still feels natural and repeated **Reset view**
actions return to the identical framing pose without residual drift.

For ADR-0018's Captain-authorized doubled known-star footprint, ADR-0019 sets the
software-renderer median ceiling to `33.4 ms` and the camera settlement deadline to
`4 s`. The baseline relative p95 ceiling, long-frame-count ceiling, and raw `100 ms`
maximum remain unchanged. Real supported-browser smoothness acceptance remains
mandatory.

## BOB-027 generalized narrative-moment ordering

Run the development server and connect from a remote workstation in a real supported
WebGL browser. Set **Read through** and **Knowledge through** to chapter 1.11, then
select Bob from **Characters**. Confirm Bob remains selected in the inspector and
shows **Last seen** at New Handeltown, Chapter 1.11, 2133. On the map, Sol must receive
the selected label and outer corner frame, and the camera must focus Sol without
changing canonical coordinates or the established viewing angle.

Switch between Chapter and Date modes and confirm equal year-only activity uses the
later canonical chapter for recency while chronologically unplaced activity remains
Chapter-mode only. Confirm the Bob-to-Sol result is derived from the shared projection;
disabling WebGL must leave Bob and the New Handeltown relationship inspectable even
though precise camera focus and the WebGL frame are unavailable.

On 2026-07-28, the Captain accepted the real-browser BOB-027 review at chapter 1.11:
Bob retained the New Handeltown last-seen relationship, Sol displayed its selected
frame and label, and the camera focused Sol.

## BOB-015 Phase 2 desktop integration

At 1200-by-700 and 1440-by-1000 CSS pixels, confirm the object browser, true-scale
map, object inspector, timeline dock, and attribution footer are simultaneously
visible. The map must remain wider than either rail, no horizontal page scrollbar may
appear, and the context badge must remain wholly inside the map.

Run one complete shared-projection flow. Confirm progress through Chapter 1.2, select
it as **Knowledge through**, and verify the command status, map badge, browser active
counts, marker activity, and inspector context all represent Chapter 1.2 and 2133.
Enter Date mode, select 2016, and verify all surfaces change together; any now
ineligible selection must clear with an accessible announcement. Select an eligible
object, inspect it, and return to Chapter mode, confirming that 2133 is restored and
no later fact survives an earlier knowledge view.

Repeat the compact timeline/progress flow at a CSS viewport below 1200 pixels and at
200% browser zoom. Also inspect a short desktop viewport with reduced motion enabled.
Exercise empty search, no selection, explicitly unmapped, chronologically unplaced,
WebGL unavailable, missing astronomy coverage, and invalid narrative projection
content. Every state must explain what remains usable or what the reader can do next.

Complete current Chrome, Firefox, and Edge review from the remote workstation. Test
real Safari when available; otherwise retain it as an explicit pre-publication gap
rather than treating automated WebKit as real Safari coverage.

### BOB-015 manual acceptance

On 2026-07-27, the Captain accepted the required remote visual review in current
Chrome, Firefox, and Edge. The review covered the simultaneous desktop workspace,
short desktop viewport, 200% zoom compact reflow, shared chapter/date projection,
modal focus containment and return, reduced motion, and attribution reachability.
Real Safari remains the explicit pre-publication gap because no Apple test workstation
is available.

## BOB-036 chapter inspector and compact timeline

At a wide desktop viewport, unlock representative canonical chapters and select them
through the Chapter-mode rail. Confirm the rail uses the local number once: a
numeric-only title shows the number alone, an accepted number-prefixed descriptive
title remains unchanged, and story years or chronology notes are absent. Locked
entries must retain only spoiler-safe book/chapter identity.

The right inspector must show book and local chapter identity, title, **Synopsis**,
the linked default **Location**, and only the nonempty eligible Lead character(s),
Events, Vessels, Technologies, and condensed Characters sections. Follow several
relationships and confirm the knowledge chapter remains unchanged while ordinary
entity-to-map focus rules apply. Use the inspector's Back and Forward controls to
retrace that path, then follow a different relationship after going back and confirm
the discarded forward branch stays unavailable. A new map, browser, or timeline
selection must begin a new path. Selecting the chapter itself must not move the
camera. A chapter without an illustration must not render an image placeholder or
empty wrapper.

Enter Date mode while a chapter is inspected. The chapter detail must disappear, the
empty inspector must return, and the live status must say **Chapter inspection closed
in Date mode**. Repeat invalidation through zero state and by lowering **Read
through** past the inspected chapter. An eligible narrative or astronomy selection
must remain selected merely because Date mode was entered.

Below 1200 CSS pixels and at 200% desktop zoom, repeat chapter selection through the
timeline and open **Inspect selection**. Confirm the same detail hierarchy, usable
scrolling for long character lists, visible focus on every relationship, focus
containment, Escape and close dismissal, and focus return. Optional chapter
illustrations, multiple leads, no appearances, long lists, and future-dated introduced
events are synthetic component-test cases and do not require canonical data edits.

## BOB-026 ultracool-dwarf presentation

At the reset Sol 20-light-year view, search for `WISE 0855-0714`, `GJ 11286`, and
`WISEA J085510.74-071442.5`; all three must select the same system. Confirm its
catalogue inspector shows brown-dwarf classification, approximately `250 ± 50 K`,
the 20-pc census source, and full aliases without describing marker size as physical
radius or luminosity.

Compare all ten WISE/2MASS/UGPS ultracool systems with nearby ordinary stars. Their
purple/brown false-infrared glyphs must be visibly smaller and dimmer, must not read
as bright pale stars, and must not dominate map density. Rotate and zoom, then hover
and select the smallest glyphs directly; the independent normal-sized hit target must
keep selection practical, while the selected corner frame and below-star caption remain
clear.
Verify ordinary stellar markers retain their prior colors, apparent size,
brightness, component clusters, narrative marks, and measurement behavior.

Record the real Chrome, Firefox, and Edge result here. Real Safari remains an
explicit pre-publication gap when no Apple workstation is available.

On 2026-07-28, the Captain accepted the required real-browser BOB-026 visual and
interaction review at the reset Sol 20-light-year view. The accepted review covered
the three-name WISE 0855-0714 identity search, census classification and temperature
facts, the ten brown dwarfs' smaller and dimmer false-infrared hierarchy, direct
selection of the smallest glyphs, selected-state clarity, and preservation of
ordinary stellar-marker presentation. The existing real-Safari pre-publication gap
remains unchanged.

## BOB-025 fixed light-year presentation acceptance

On 2026-07-28, the Captain confirmed that the browser test passed and accepted the
fixed light-year presentation change. The unit selector is removed, and displayed
interstellar distances, Galactic coordinate components, hover separations, and map
scale remain in light-years. This does not alter the project-wide Safari
pre-publication gap.

## Default and reset camera

The repeatable default camera pose preserves the documented Three.js viewing
direction while calculating its distance from the current static system catalogue and
canvas aspect ratio:

- Viewing direction: from `(10.5, 8, 12)` toward the Sol-centred scene origin.
- Framing: all known system positions fit within a 10% margin at every screen edge.
- Controls target: `(0, 0, 0)`, the Sol-centered scene origin.
- Up direction: scene `+Y`, which is canonical Galactic `+Zg` (Galactic north).
- Perspective field of view: 47 degrees.

Reset cancels any in-progress automatic focus motion and restores both the fitted
camera position and controls target to this pose. It does not change the selected
system. During manual acceptance, move and rotate the camera, press Reset view, and
confirm that Sol is targeted from this same repeatable orientation with every known
system visible.
