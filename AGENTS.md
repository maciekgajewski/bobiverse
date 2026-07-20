# Agent guidance

## Purpose

This repository builds a spoiler-safe visual companion for the Bobiverse books. Its
central feature is a true-scale, interactive 3D map of nearby stellar systems.

## Authoritative documents

Read these documents before changing code or data:

1. The active file in `docs/tasks/` defines the current scope and acceptance
   criteria.
2. Accepted ADRs in `docs/adrs/` define architectural decisions that have not yet
   been incorporated into the technical design.
3. `docs/technical-design.md` defines the integrated architecture and invariants.
4. `docs/implementation-plan.md` defines delivery order and phase boundaries.
5. `docs/project-idea.md` records the product vision.

If these sources conflict, stop and surface the conflict. Do not silently choose one.
An active task may narrow scope, but it may not override the technical design or an
accepted ADR without saying so explicitly.

## Before implementation

- Read the relevant task, technical design, implementation plan, and referenced ADRs.
- Inspect `git status` and preserve unrelated or pre-existing changes.
- Confirm that the task is `Ready` and that the Captain has explicitly authorized
  implementation.
- Present a short implementation plan before editing.
- Ask one question at a time if a material decision is still unresolved.

## Architectural invariants

- The initial product is a static React and TypeScript application built with Vite.
- React Three Fiber is the 3D rendering integration. Do not introduce a second 3D
  engine.
- Runtime book and astronomy data is static, validated JSON. The browser must not
  query astronomy services.
- Astronomy imports run offline and reproducibly with Python, Astropy, and pinned
  source data.
- One map node represents one stellar system. Components and planets belong to the
  system detail model.
- Canonical positions use a Sun-centered Galactic Cartesian frame and parsecs. The
  UI displays light-years by default and may toggle to parsecs.
- Interstellar geometry is true linear scale. Never distort stored or measured
  distances for presentation.
- Measurements are calculated from canonical coordinates, not rendered screen or
  scene coordinates.
- Unknown book locations remain explicitly unmapped. Never invent coordinates.
- Spoiler visibility is based on reading order. Story time and reveal order are
  separate dimensions and must never be collapsed into one timestamp.
- Reader progress is stored in versioned, namespaced `localStorage`; it is not stored
  in cookies.
- Use custom CSS and design tokens. Do not copy Stellaris, Star Wars, celebrity, or
  other third-party visual assets.

## Content and intellectual property

- Do not commit source book text, ebook files, DRM-derived material, or lengthy
  quotations.
- Book-derived JSON must contain reviewed structured facts and original summaries,
  not copied prose.
- Keep source evidence used during extraction outside the published application and
  outside version control.
- Never send book text to an external model unless the Captain has explicitly
  approved the provider and workflow.
- Never place API keys or other secrets in frontend code, static assets, fixtures,
  logs, or commits.

## Development and visual testing

- The development host is headless.
- The Vite development server must bind to `0.0.0.0:5173` with strict-port behavior.
  It is for trusted-LAN access only and must not be exposed to the Internet.
- Configure exact permitted development hostnames when hostname access is needed;
  never disable host checking globally.
- Automated browser tests run headlessly with Playwright on the development server.
  Preserve screenshots, traces, and videos for failed visual or interaction tests.
- Manual WebGL and visual acceptance is performed from a remote workstation in a
  real supported browser.
- Avoid fragile pixel-perfect assertions for the 3D canvas across different GPU and
  software-rendering environments. Test domain state and interactions separately.

## Validation and completion

- Every task must list its validation commands. Do not claim commands that do not
  exist in the repository.
- Add regression coverage for coordinate transforms, unit conversion, measurement,
  schema validation, and spoiler behavior when those areas are changed.
- Validate generated runtime data as part of the normal build or validation path.
- Update directly affected documentation in the same change.
- A task is complete only when its acceptance criteria and documented validation
  pass. Record deviations rather than silently reducing scope.

## Task and ADR workflow

- `docs/implementation-plan.md` is the initial phased roadmap, not the live task
  tracker.
- Create self-contained work items in `docs/tasks/` as phases are approached.
- Keep exactly one status in each task file and update `docs/tasks/README.md` when
  status changes.
- Record significant architecture changes in `docs/adrs/` using the process defined
  in `docs/adrs/README.md`.
