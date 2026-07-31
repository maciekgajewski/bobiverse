# Guided schematic system view

Status: Approved design  
Last updated: 2026-07-31

## 1. Purpose

The guided system view lets a reader enter a mapped stellar system, understand its
reader-visible composition, and locate the currently active narrative body. It
extends the true-scale interstellar map with a deliberately non-metric local
schematic while preserving the feeling of one continuous universe.

This document defines the interaction and visual contract. Exact camera coordinates,
spacing constants, transition timing, label thresholds, texture art, and particle
density are implementation tuning values subject to automated and Captain-led
real-browser visual acceptance.

## 2. Binding context

This design extends:

- `../technical-design.md`;
- `../data-model-definition.md`;
- `../implementation-plan.md`, Phase 3;
- `../visual-testing.md`;
- `phase-2-desktop-ui.md`;
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`;
- `../adrs/0003-zero-state-solar-system-baseline.md`;
- `../adrs/0018-spoiler-projected-system-survey-observations.md`;
- `../adrs/0020-guided-system-view-and-orbital-presentation.md`;
- the responsive and accessibility requirements in `../../AGENTS.md`.

ADR-0020 supersedes ADR-0018 only where ADR-0018 treated anonymous surveyed-moon
order as having no inner-to-outer meaning.

## 3. Product principles

1. **One universe, two honest scales.** Entry and exit look continuous, but the
   local view is explicitly schematic and never presented as physical scale.
2. **Hierarchy is authority.** The projected location hierarchy supplies every
   rendered body, parent, orbital order, and navigation level.
3. **Guidance beats free flight.** Selection moves among designed compositions; the
   reader cannot pan, rotate, or continuously zoom the local camera.
4. **Composition remains legible.** Each view shows one interactive hierarchy level
   and one reduced preview level rather than making every descendant compete.
5. **Narrative state remains visible.** The active location and its ancestor path
   remain identifiable without forcing the reader away from the current inspection.
6. **Mobile is the same experience.** Compact views use the same projected hierarchy,
   selection, focus path, and rendering semantics with tighter framing and stronger
   collision reduction.
7. **Rendered objects are the visible navigation.** Pointer users enter deeper views
   by selecting the bodies themselves. Object labels, the existing browser and
   inspector relationships preserve keyboard and screen-reader access without adding
   a separate focus panel.

## 4. Scope and non-goals

The system view includes:

- mapped reader-visible star-system location hierarchies;
- component stars represented in that hierarchy;
- planets, dwarf planets, moons, asteroid belts, Kuiper belts, and Oort clouds;
- guided focus, breadcrumbs, active-location navigation, responsive composition,
  generic body surfaces, and optional dedicated surface overrides.

It does not include:

- physical orbital distances, periods, phases, inclinations, or body radii;
- orbital simulation or propagation;
- bodies absent from the projected location hierarchy;
- shared or circumbinary bodies not represented by the current data model;
- free local camera controls;
- changes to narrative extraction workflow;
- a second rendering engine, backend, runtime astronomy request, or remote asset
  request;
- custom dedicated textures for every prominent body.

## 5. Authoritative hierarchy and schematic geometry

The system view starts from one eligible projected location with
`kind: "star_system"`. It follows that location's generated child order recursively.
It does not scan raw chapter JSON or build a second body authority.

Children with `parent_relation: "member_of_system"` are component stars. Each star
owns only the orbital children already parented beneath it. The renderer does not
invent shared bodies or move a body between stars. In a multiple-star system,
relative star placement is deterministic decorative composition and has no orbital
meaning.

For every parent, the subsequence of children with `parent_relation: "orbits"` is
inner-to-outer. Every effective orbital child has a positive safe-integer ordering
key. Zero-state nested child-array order establishes implicit keys `1024`, `2048`, and
so on. Later flat introductions and updates may use the optional non-metric
`orbital_order` key. Omission on introduction or reparenting appends after the
effective maximum in `1024` increments. An empty set has maximum `0`, so its first
omitted child receives `1024`; stable location ID orders simultaneous omissions at
successive `1024` increments. Ordinary omission on update retains the effective key.
Explicit and implicit sibling keys must be unique and projection sorts them
numerically to derive `child_ids`. Authors use any unused positive safe integer to
insert between keys and explicitly renumber affected siblings if a gap is exhausted.
Leaving `orbits` removes the key. The layout consumes `child_ids` and assigns
aesthetically spaced radii without renderer-side sorting. Neither the key nor the
radii contain distance information. It is acceptable for authoring or deterministic
append behavior to invent an order where physical order is unknown; the UI does not
describe that order as measured astronomy.

The local renderer recognizes exactly:

- the entered `star_system` root;
- its direct `member_of_system` children with `kind: "star"`;
- `orbits` descendants with kind `planet`, `dwarf_planet`, `moon`,
  `asteroid_belt`, `kuiper_belt`, or `oort_cloud`.

Other kinds and relations, including `locale`, `megastructure`, `transit`,
`located_on`, and `contained_in`, remain available through browser and inspector
surfaces but receive no local geometry, preview, breadcrumb level, or entry
eligibility. Filtering preserves the relative projected order of recognized orbital
siblings. A non-rendered location selected through the DOM keeps its actual
inspection selection while local focus resolves to its nearest recognized ancestor,
if one exists.

## 6. Entry, continuity, and exit

### 6.1 Availability and entry

The ordinary interstellar map keeps its current single-selection behavior. Selecting
a system does not enter local view.

The selected system's inspector exposes an explicit **Enter system** action only
when the projected hierarchy has meaningful composition:

- more than one component star; or
- at least one star with a recognized renderable orbital child.

A single star without orbital children remains selectable and inspectable on the
interstellar map but has no empty local view. The action is an ordinary labelled DOM
control operable by pointer, touch, and keyboard.

### 6.2 Pseudo-continuous transition

Entry:

1. completes or retargets the ordinary system-selection focus;
2. keeps the selected system at a stable screen position;
3. fades the Galactic grid, interstellar captions, hover surfaces, and selection
   frame;
4. preserves the existing aligned Galactic sky backdrop;
5. dims other interstellar systems and makes them non-pickable and unlabeled;
6. visually transforms the selected stellar marker into the local system star
   composition;
7. unfolds schematic orbital bodies and regions into the appropriate initial view:
   the sole star and its planets for a one-star system, or the component-star group
   for a multiple-star system.

Local geometry uses its own schematic coordinate space or render layer. It must not
change interstellar coordinates, measurement calculations, map scale, or the
accepted Galactic backdrop orientation.

Exit reverses the transition and restores the exact interstellar camera position,
target, selected system, and ordinary map interaction state that existed at entry.
Reduced-motion preference replaces spatial travel and axial animation with immediate
state changes or restrained fades.

### 6.3 Background context

The Galactic sky remains fixed to its accepted Galactic orientation and remains
camera-following, non-pickable, seam-free, and free of local parallax. Other
interstellar systems may remain visible as strongly dimmed angular context. They are
decorative in local view: no label, tooltip, selection, measurement, or focus is
available until the reader exits.

## 7. Guided navigation

### 7.1 View levels

The guided hierarchy is:

```text
Interstellar map
  -> one-star system: star focus
  -> multiple-star system: component-star overview -> star focus
      -> planet, dwarf-planet, belt, or cloud focus
        -> moon focus where applicable
```

There is no redundant intermediate star-choice screen for a one-star system. It opens
directly on the star and its planets. A multiple-star overview shows all component
stars; selecting one transitions directly to that star and its orbital subtree.

### 7.2 Selection and focus

Inside system view, one click or tap on a directly interactive child both:

- makes that narrative location the shared application selection; and
- transitions to its predefined guided composition.

The same operation is available through clickable rendered labels and the existing
DOM browser and inspector relationships. Canvas objects retain practical transparent
pick targets independent of their rendered size. No separate visible guided-focus or
object-list window duplicates the objects on the canvas.

Selecting a leaf still produces a focused inspection composition even when it has no
orbital children. Selecting an already focused location keeps the view and exposes or
emphasizes its inspector.

### 7.3 No local free camera

Local view provides no:

- drag pan;
- orbit rotation;
- mouse-wheel zoom;
- trackpad or touch pinch zoom;
- double-click zoom;
- hidden gesture-only navigation.

All spatial scale changes come from selecting a hierarchy node or using breadcrumbs.
Browser zoom and operating-system magnification remain unmodified. A local
composition may expose a labelled **Fit view** recovery action only if implementation
testing discovers a non-user-controlled framing failure; it is not a substitute for
free zoom.

### 7.4 Breadcrumbs and browser history

The top panel shows a labelled breadcrumb such as:

```text
Nearby space / Epsilon Eridani / Epsilon Eridani / Planet II / Moon I
```

Only levels actually entered appear. Clicking an ancestor restores its predefined
view. A prominent **Return to map** action is available in addition to the first
breadcrumb.

Entering system view creates exactly one browser-history state. Internal guided
focus changes do not push further history entries. Browser or mobile Back exits local
view and restores the preserved interstellar map. Breadcrumbs, not browser history,
move upward inside the system.

System focus path is transient and is not written to reader-progress localStorage.
Deep-linking individual guided levels is deferred.

## 8. Progressive disclosure

Every guided view follows one general rule:

- direct children are full-detail, labelled subject to collision management, and
  interactive;
- grandchildren are reduced-scale, unlabeled, and non-interactive previews;
- deeper descendants are hidden.

Applied examples:

- **System overview:** component stars are interactive; their planets and orbital
  regions are reduced previews; moons are hidden. This level is the entry view only
  when the system has multiple component stars.
- **Star focus:** planets, dwarf planets, belts, and clouds are interactive; their
  moons are reduced previews.
- **Planet focus:** moons are interactive.
- **Moon or leaf-region focus:** the selected leaf is shown in a close inspection
  composition with restrained parent context.

Reduced previews preserve hierarchy order and broad presentation family but have no
hover state, label, selection frame, or pick target. An active descendant is an
exception to ordinary label suppression: its preview and ancestor path receive the
active treatment needed to make the current location discoverable, but the reader
still traverses the hierarchy one level at a time.

When a view focuses one subtree, its immediate parent and nearby siblings remain as
dim, non-interactive context. Compact layouts may reduce or omit distant sibling
context before reducing the focused subtree.

## 9. Bodies, regions, labels, and motion

### 9.1 Stars and spherical bodies

Stars use a local luminous treatment visually connected to the selected interstellar
stellar marker. Planets, dwarf planets, and moons use WebGL sphere meshes, not
camera-facing planet sprites.

Body radii are bounded categorical presentation sizes:

- stars;
- gas giants;
- ice giants;
- rocky, icy, and dwarf planets;
- moons.

These categories aid recognition and hierarchy only. Camera framing, selection
treatment, and labels—not mesh scaling—make the focused location prominent.

### 9.2 Orbital regions

- An `asteroid_belt` is a restrained uneven particle annulus occupying its ordered
  radial slot.
- A `kuiper_belt` is a broader, sparser, colder annulus.
- An `oort_cloud` is a faint spherical particle shell outside the other orbital
  children, not a flat ring.

Each region has one efficient decorative render path plus an independent practical
pick target when directly interactive. Individual particles are never locations or
pick targets. The Oort shell remains faint in overview and fades enough during inner
focus to avoid obscuring bodies.

### 9.3 Labels and activity

All directly interactive children attempt a persistent collision-managed label.
Priority is:

1. active narrative location;
2. selected or keyboard-focused location;
3. hovered location;
4. ordinary direct child.

Reduced previews have no ordinary label. Active previews may show a concise active
label. When several active descendants collapse to one preview or recognized
ancestor, its treatment exposes the count rather than selecting an arbitrary child.
Labels, selection, focus, and active state remain visually distinct and do not depend
on colour alone.

### 9.4 Motion

Orbital position is fixed. Bodies do not travel around schematic orbit paths.
Full-detail spherical bodies may rotate very slowly around a decorative axis to
reveal their textures. Rotation speed, phase, and axis have no physical meaning.
Reduced previews remain static. Reduced-motion preference disables axial rotation
and replaces camera travel as described above.

## 10. Surface textures and asset contract

The generic library contains at least two visibly distinct, project-owned,
equirectangular surface textures compatible with each supported `body_class`:

- `rocky`;
- `icy`;
- `dwarf_planet`;
- `gas_giant`;
- `ice_giant`.

It also provides safe kind-based fallbacks for a planet, dwarf planet, or moon whose
reader-visible state has no `body_class`.

Generic selection is deterministic from stable location identity and the compatible
texture set. Adding a new generic texture must not silently reshuffle existing body
appearances; stable selection is recorded or versioned before the set changes.

The shared asset registry distinguishes ordinary illustrations from
equirectangular body-surface textures. An optional body `surface_texture_id`:

- references only a registered body-surface texture;
- may select a generic preset or a dedicated custom texture;
- is reader-order projected and may be introduced, replaced, or null-cleared through
  the normal location-state mechanism;
- is permitted only on planets, dwarf planets, and moons;
- overrides automatic generic selection;
- has no physical or astronomy-authority meaning.

`picture_id` continues to reference only an illustration asset. Texture paths are
never embedded directly in narrative locations.

All surface files are local static assets with stable IDs, safe paths, provenance or
generation notes, correct colour-space handling, mipmaps, seam review, and no
third-party runtime requests. Missing, malformed, role-incompatible, or absent files
fail normal validation and build paths rather than silently fetching a replacement.

Dedicated custom textures for named prominent bodies are supported by this contract
but are not required for every body or for initial implementation closure.

## 11. Responsive and accessible behavior

Desktop, compact desktop, tablet, and phone consume the same focus path and
projection. They differ only in framing, label collision, context reduction, and
panel composition.

On a small viewport:

- the focused node and direct interactive children retain priority;
- reduced previews shrink or simplify before direct children disappear;
- distant sibling context may be omitted;
- labels hide by the defined priority rather than overlapping;
- the active location and selected location remain reachable;
- each pointer target remains at least the repository's accepted phone target size
  through independent pick geometry or an equivalent DOM control.

The system view must remain usable at 200% browser zoom and short viewport heights
without horizontal page scrolling. Existing compact browser, inspector, timeline,
focus containment, and focus-return contracts remain shared; this feature does not
create a parallel mobile application or pre-empt the broader BOB-016 mobile workspace
design.

WebGL-unavailable behavior keeps the projected system hierarchy, selection, facts,
and relationships usable through DOM surfaces. It does not pretend that the visual
system composition rendered successfully.

## 12. Timeline and active-location behavior

A chapter, date, or progress transition recomputes the same reader-safe projection
used by every other surface. If the entered system or focused path becomes
ineligible, the application exits or retreats to the nearest eligible ancestor and
announces the change.

Ordinary timeline changes do not move the guided camera automatically. They update
every active marker in place. Activity is plural and tied activity records have no
implicit chronology or preferred target.

The active-location set contains every eligible location entity active under the
existing shared Chapter-mode or Date-mode narrative-activity semantics. The system
view does not derive a separate notion of activity, treat character last-seen state as
current presence, or choose one location from `mapped_system_ancestry`.

Active locations do not create a separate navigation panel or focus shortcut.
Recognized active bodies and their nearest rendered ancestors receive their active
treatment in the current composition. A reader who wants another location returns to
the interstellar map and uses the existing browser, inspector, or map-object
selection. This preserves rendered-object selection as the only local drill-down
operation and never infers a preferred destination from tied activity.

Every active recognized location receives treatment. A non-rendered active location
marks its nearest recognized ancestor; multiple targets resolving to one ancestor
produce one counted treatment rather than an arbitrary winner.

## 13. Visual acceptance

Automated tests establish hierarchy, state, accessibility, and transition contracts,
but cannot approve the final composition. Manual supported-browser review must tune
and accept:

- pseudo-continuous entry and exact exit restoration;
- Galactic backdrop continuity and background-star dimming;
- predefined desktop and phone compositions;
- orbital spacing and categorical body scale;
- label priority and collision behavior;
- generic surface quality, sphere lighting, seams, and axial rotation;
- asteroid, Kuiper, and Oort treatments;
- active, selected, preview, and parent-context hierarchy;
- reduced-motion behavior;
- smoothness on supported real GPU/browser combinations.
