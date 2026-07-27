# Bobiverse

Bobiverse is a planned spoiler-safe visual companion for the books by Dennis E.
Taylor. Its central feature is a true-scale, interactive 3D map that helps readers
understand the relative orientation and distances of nearby stellar systems. Later
phases connect that map to chapters, characters, travel, events, and Bob genealogy.

The checked-in implementation maps a pinned Gaia DR3 neighbourhood within 20
light-years of each mapped narrative stellar system. Visual review found that this
Gaia-only intermediate omits recognizable local systems, so BOB-013 is Ready to
replace it with the accepted GCNS/Gaia DR3/CNS5/WDS pipeline in ADR-0011. The current
runtime still contains 70 non-Sol system nodes plus Sol, with true-scale Galactic
geometry, selection, distance-unit display, and a permanent local Deep Star Maps 2020
Galactic backdrop. A spoiler-safe projected-object browser, search, and type-aware
inspector expose narrative objects allowed by the selected knowledge chapter and
story date. The application makes no runtime astronomy or image-host request; see the
[astronomy pipeline](docs/data/astronomy-pipeline.md) and [backdrop provenance and
attribution record](docs/data/galactic-starfield-backdrop.md).

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

The desktop bottom dock keeps spoiler knowledge separate from story time. Use **Read
through** to set the confirmed reading ceiling; the application asks for confirmation
before it reveals that chapter. **Knowledge through** may then revisit any chapter at
or before that ceiling. Chapter mode represents the selected chapter's story year;
Date mode keeps the same knowledge chapter but offers only meaningful, determinate
dates already revealed by it. Click a year marker to select its only story state; if
several story states share that year, the marker opens a compact spoiler-safe choice
list. Reader progress, selected mode, timeline zoom, and pan are stored in the
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
Astronomy catalogue systems are currently selected from the map; BOB-014 adds the
final query-only **Nearby astronomy** search without restoring the legacy full
catalogue list.

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
