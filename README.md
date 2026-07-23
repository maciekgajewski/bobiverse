# Bobiverse

Bobiverse is a planned spoiler-safe visual companion for the books by Dennis E.
Taylor. Its central feature is a true-scale, interactive 3D map that helps readers
understand the relative orientation and distances of nearby stellar systems. Later
phases connect that map to chapters, characters, travel, events, and Bob genealogy.

The current implementation maps the 20 nearest reviewed stellar systems plus Sol,
with true-scale Galactic geometry, selection, and distance-unit display.

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

Generate an uncommitted projection for the pre-book state or a selected chapter:

```bash
npm run narrative:generate -- --output /tmp/bobiverse-world.json
npm run narrative:generate -- --chapter 1.1 --output /tmp/bobiverse-world-1.1.json
```

The CLI only reads authored narrative sources. It writes the requested output and
never treats generated state as editable source data.

Convenience shell wrappers and the same examples are in [bin/README.md](bin/README.md).
