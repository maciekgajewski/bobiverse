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

For manual acceptance, start `npm run dev` and open
`http://<development-host>:5173` from a trusted-LAN workstation. Test current Chrome,
Firefox, Safari, and Edge where available. Check rotate, zoom, pan, marker picking,
directory selection, reset, fixed light-year scale and detail formatting, command-bar
browser opening, selected-system inspector behavior, and the phone-sized layout.
Verify reduced-motion behavior with the operating-system setting.

The headless development environment cannot substitute for manual GPU/browser review.
Record each unavailable browser explicitly as an acceptance gap before publication.

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
appears immediately when the selector changes, then confirm Chapter 1. Check that Chapter mode selects the same chapter,
shows its year, and updates the badge. Advance the ceiling while viewing an earlier
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
Verify that the chapter timeline is one horizontal reading-order line of dots. In Date
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
rail uses one uninterrupted central line with references above and unlocked metadata
below.

## BOB-012 progressive object browser and inspectors

At a desktop width of at least 1200 CSS pixels, clear
`bobiverse.app-state.v1`. In the pre-book view, confirm that only nonempty groups are
shown in the fixed design order and that no legacy **Astronomy systems** catalogue
directory is present. Confirm each visible group heading has the distinct original
line icon for its type and every object row has the shared ring-and-dot SVG bullet;
neither should appear as a CSS-drawn proxy. Verify the icons remain crisp, aligned,
and subordinate to the semantic labels at normal and 200% zoom.

Confirm and view Chapter 1.2. Check that Characters, Events, Star Systems, Other
Locations, Species, Technologies, and Organizations appear, while the empty Vessel
Types group does not. Group headings must report visible counts and nonzero active
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

With a Chapter 1.2-only narrative object selected, change **Knowledge through** to
Chapter 1.1. Its details must disappear in the same state transition, selection must
clear, and an accessible status message must announce why. Repeat selection from the
compact browser/inspector panels and confirm the same projection, relationship, and
DOM behavior is reused rather than recomputed in a separate mobile path.

## BOB-014 narrative-aware map integration

In the pre-book view, verify that the map contains only the configured-radius
neighbourhood around Sol, not the complete static catalogue. Confirm narrative-known
systems retain one thin elliptical segmented ring, active systems at the selected
chapter/date add static nested ellipses and an outward tick, and a selected system keeps its outer corner
frame outside those marks. Rotate, pan, and zoom while creating caption collisions:
selected, hovered, and active captions must remain visible, while lower-priority
known captions may hide and reappear. Astronomy-only context markers must have no
persistent caption or narrative ring. Confirm component colour families, decorative
clusters, scale, picking, measurements, Galactic backdrop, reset, and reduced-motion
focus behavior remain unchanged. Known-system captions are plain labels centered below
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
