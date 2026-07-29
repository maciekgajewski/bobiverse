# Bobiverse

Bobiverse is a planned spoiler-safe visual companion for the books by Dennis E.
Taylor. Its central feature is a true-scale, interactive 3D map that helps readers
understand the relative orientation and distances of nearby stellar systems. Later
phases connect that map to chapters, characters, travel, events, and Bob genealogy.

The checked-in astronomy runtime is generated from pinned GCNS, CNS5, Gaia DR3, WDS,
and Kirkpatrick et al. 2024 20-pc-census inputs under ADR-0011 and ADR-0012. It
contains Sol plus 96 source-backed systems within the configured 20-light-year
neighbourhood, including reviewed landmark multiples such as Alpha Centauri
A/B/Proxima, Sirius A/B, and Procyon A/B, plus recognizable source-backed names and
substellar presentation for ten ultracool brown dwarfs. The application makes no
runtime astronomy or image-host request; see the [astronomy
pipeline](docs/data/astronomy-pipeline.md) and [backdrop provenance and attribution
record](docs/data/galactic-starfield-backdrop.md).

## Project documentation

- [Project idea](docs/project-idea.md)
- [Technical design](docs/technical-design.md)
- [Implementation plan](docs/implementation-plan.md)
- [Active tasks](docs/tasks/README.md)
- [Architecture decisions](docs/adrs/README.md)
- [Agent guidance](AGENTS.md)

The initial application is designed as a static React, TypeScript, and React Three
Fiber site. No backend or user account is required.

## Development

Use Node.js 22.23.1 and npm 10.9.8 (recorded in `.nvmrc` and `package.json`). The
astronomy tools use Python 3.14 with the fully pinned packages in
`requirements-astronomy.txt`.

```bash
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements-astronomy.txt
npm run dev
```

The development server binds to `0.0.0.0:5173`, uses strict-port behavior, and is for
the trusted LAN only. `bobiverse.local` is the only configured hostname; use the host
address when that name is not available. Do not expose the server publicly or disable
Vite host checking.

Open the application from a trusted-LAN workstation at
`http://<development-host-ip>:5173`, or at `http://bobiverse.local:5173` when that
name resolves on the workstation. Keep `npm run dev` running while reviewing it.

To inspect the production bundle rather than the development server:

```bash
npm run build
npm run preview
```

Then open `http://<development-host-ip>:4173`. Do not open the built files with a
`file:` URL.

Run `npm run validate` for the normal local verification set. See
[astronomy pipeline](docs/data/astronomy-pipeline.md) for catalogue refresh and
[visual testing](docs/visual-testing.md) for the remote-browser acceptance procedure.
Run `npm run performance` for the isolated production Chromium chapter-transition
gate; it builds the current source and owns strict loopback preview port 4173 while
measuring.

## Narrative authoring

The pre-book zero-state is a valid narrative corpus even before any chapters exist.
Validate it, or a future chapter corpus, with:

```bash
npm run narrative:validate
```

Validation errors use the IDE-clickable format
`path/to/source.json:line:column: error: message`, with one reported error per line.

Generate an uncommitted projection for the pre-book state or a selected chapter. The
wrapper writes JSON to standard output by default, so it can be redirected or piped:

```bash
./bin/narrative-generate.sh > /tmp/bobiverse-world.json
./bin/narrative-generate.sh --chapter 1.1 > /tmp/bobiverse-world-1.1.json
```

Pass optional `--output <file>` to have the CLI write a file itself. The CLI only
reads authored narrative sources and never treats generated state as editable source
data.

### Reader progress and timeline

At desktop width, the bottom dock keeps spoiler knowledge separate from story time.
When desktop zoom or a compact viewport cannot show all four workspace surfaces at
once, use the command-bar **Timeline and progress** control. It opens the same dock
content in a keyboard-contained, non-animated modal panel; Escape and the visible
close control return focus to the command bar.

Use **Read through** to set the confirmed reading ceiling; the application asks for
confirmation before it reveals that chapter. **Knowledge through** may then revisit
any chapter at or before that ceiling. Chapter mode represents the selected chapter's
story year; Date mode keeps the same knowledge chapter but offers only meaningful,
determinate dates already revealed by it. Click a year marker to select its only story
state; if several story states share that year, the marker opens a compact spoiler-safe
choice list. Reader progress, selected mode, timeline zoom, and pan are stored in the
versioned `bobiverse.app-state.v1` localStorage record.

### Object browser and inspector

The desktop left rail groups only eligible projected objects in this fixed order:
Characters, Events, Star Systems, Other Locations, Species, Technologies,
Organizations, and Vessel Types. Empty groups stay hidden. Group headings show
visible and active counts, and each group can be collapsed independently. Collapse
preferences share the versioned `bobiverse.app-state.v1` record with reader progress.

Search matches only the projected name and currently known aliases, ignoring case and
diacritics. It temporarily expands matching groups and restores the saved arrangement
when cleared. Results and recency ordering use the same generated activity index as
the selected world: Chapter mode prioritizes selected-chapter activity, while Date
mode uses comparable story-time activity at or before the represented date.

Selecting a narrative result opens a sparse, type-aware inspector. Relationships are
links only when their targets are eligible in the same projection; unmapped and
chronologically unplaced states remain explicit. Character location context is
labelled **Last seen** and never treated as current presence. Each group heading has
an original type-specific SVG icon, and each object row uses a shared SVG bullet.
The map renders the deduplicated union of the configured-radius neighbourhoods around
reader-safe mapped systems. Narrative-known systems receive a segmented ring; systems
active at the selected chapter or date receive a double ring and outward tick. These
screen-readable marks do not affect coordinates, picking, measurements, or catalogue
component presentation. Captions preserve selected, hovered, and active systems when
they collide; other known-system captions return as the view changes.

While a nonempty query is present, **Nearby astronomy** follows the narrative groups
with matches from that rendered union only. It searches reviewed preferred names and
alternate designations, never expands map scope, and does not restore the old
full-catalogue directory. Selecting one opens its provenance-backed catalogue facts
with the explicit **Not story-known at this view** status. Narrative selections focus
only when they provide one unambiguous mapped system; unmapped and locationless
objects remain inspectable without moving the camera.

The ignored runtime manifest is generated, never hand-edited. Normal `npm run dev`,
`npm run build`, and test paths create it. To generate it explicitly, run:

```bash
npm run narrative:manifest
```

Convenience shell wrappers and the same examples are in [bin/README.md](bin/README.md).

### Chapter extraction

Use the repository-local Codex skill to turn one plaintext chapter into a reviewed
candidate chapter object. See [chapter extraction](docs/chapter-extraction.md) for
the one-line invocation and approval workflow.
