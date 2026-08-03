# BOB-20260803-G3N1GQ: species icon assets and browser bullets

Status: Ready
Phase: 2 (narrative visual refinement)
Last updated: 2026-08-03

## Objective

Turn the accepted species-icon concept into validated reusable SVG assets and use the
same assigned icon and colour as the item bullet for each row in the existing Species
object-browser group.

## User-visible outcome

The object browser still contains one expandable **Species** group. Each visible
species row uses its own compact, coloured, shape-distinct icon instead of the shared
ring-and-dot bullet used by every other object group. Humans use the simplified head
of the man from the Pioneer 10 plaque. Species without an explicit assignment use the
generic Other / Unknown icon and colour.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially Sections 10 through 12
- `../data-model-definition.md`, especially the asset registry, species entity, and
  source-file contracts
- `../implementation-plan.md`, Phase 2
- `../design/phase-2-desktop-ui.md`, Section 7
- `../design/README.md`
- `../design/reference/species-icon-family-concept-v2.png`
- `../design/reference/system-status-icons-concept-v3.png`
- `../adrs/0024-species-presentation-registry.md`
- NASA's official Pioneer plaque reference:
  <https://science.nasa.gov/resource/pioneer-plaque/>

The reference images define the accepted icon subjects, silhouettes, relative line
weight, and palette. Their illustrative system assignments, browser contents, text,
dimensions, and generated pixels are non-canonical and must not be copied into
runtime data.

## Contract change and document precedence

ADR-0024 and the integrated technical design deliberately supersede only the current
role-free, picture-oriented asset-registry wording and embedded asset schema in
`docs/data-model-definition.md`. The implementation must update that canonical
document, the machine-readable narrative schema, validation, fixtures, and authored
asset entries atomically. The existing narrative species contract remains unchanged,
and historical task or ADR completion records are not rewritten.

## In scope

- Create six original monochrome SVG assets below `public/assets/species-icons/`:
  Humans, Deltans, Pavs, The Others, Quinlans, and Other / Unknown.
- Preserve the accepted shape identities:
  - Human: the distinctive swept hair and simplified facial construction of the man
    on the Pioneer 10 plaque;
  - Deltan: bat-like ears and a compact pig-like snout;
  - Pav: a meerkat-like face and eye-mask silhouette;
  - The Others: an angular menacing face with visible teeth, without gore;
  - Quinlan: an otter-like head with a firmer beak-like mouth;
  - Other / Unknown: a neutral abstract alien silhouette.
- Make every SVG usable as a small monochrome mask so presentation colour remains
  separate from artwork. Keep silhouettes distinguishable without colour.
- Make `role` required on every static asset registry entry with the exact shared
  values `illustration`, `body_surface`, and `species_icon`. Atomically migrate every
  existing asset entry and validation fixture. Register all six icons with
  `species_icon` and provenance.
- Enforce asset compatibility in both directions: species presentation styles accept
  only `species_icon`, every chapter/entity `picture_id` accepts only `illustration`,
  and any implemented `surface_texture_id` consumer accepts only `body_surface`.
- Add the Draft 2020-12 schema at
  `data/schema/species-presentation.schema.json` and the unversioned authored source
  at `data/presentation/species.json`.
- Store all six style definitions, these exact accepted colours, and an explicit
  generic default:
  - Human `#4DD9FF`;
  - Deltan `#B69CFF`;
  - Pav `#FFB347`;
  - The Others `#FF6274`;
  - Quinlan `#58E0C2`;
  - Other / Unknown `#98A8B8`.
- Assign styles only to species IDs already canonical in the complete narrative
  corpus. Do not invent Pav, Others, or Quinlan entity IDs merely to reserve styles.
- Validate unique style IDs, exact colour syntax, existing species assignments,
  assignment uniqueness, default-style existence, required asset roles, asset
  existence, SVG file type, safe local paths, and consumer-role compatibility.
- Load the registry through the normal browser-safe static runtime path and resolve a
  presentation only for species visible in the centralized projected
  `NarrativeWorld`.
- Replace the shared row bullet only for Species-group items. Reuse the existing
  bullet for Characters, Events, Star Systems, Other Locations, Technologies,
  Organizations, and Vessels.
- Keep icon identity available to assistive technology through the row's existing
  species name; the icon itself remains decorative. Do not use colour as the only
  distinction.
- Update directly affected design, technical, validation, and visual-testing
  documentation.

## Out of scope

- Changing the fixed object-browser group order or creating one group per species.
- Adding icon or colour fields to narrative species introductions or updates.
- Adding or changing narrative species entities, names, descriptions, homeworlds,
  pictures, chronology, activity, or spoiler projection.
- Assigning presentation styles to species IDs that are not yet canonical.
- Adding species icons, homeworlds, colonies, habitable targets, installations, badge
  rails, or any other new semantics to the interstellar map.
- Modeling colony ownership, settlement state, habitability, facilities, or system
  installations.
- Changing ordinary group-heading icons, non-Species row bullets, map star glyphs,
  captions, selection, active markers, or canonical geometry.
- Copying generated raster pixels or third-party game assets into production SVGs.

## Acceptance criteria

1. Six original, optimized SVG assets exist at stable registered paths and visually
   match the accepted subjects at normal and compact browser sizes. The Human asset
   is recognizably based on the Pioneer plaque man's head and records NASA provenance.
2. Each asset is monochrome, has a consistent view box and visual weight, contains no
   embedded species colour, script, external reference, raster image, text, or
   animation, and remains recognizable by silhouette when rendered in one colour.
3. The validated presentation source contains six unique style definitions, the
   exact accepted colours, one explicit Other / Unknown default, and assignments only
   for canonical narrative species IDs. Every assignment references one existing
   style and every style references a registered species-icon SVG.
4. Invalid colour syntax, duplicate styles or assignments, missing defaults, unknown
   species IDs, missing assets, unsafe paths, non-SVG files, missing roles, and wrong
   asset roles fail validation with source-aware diagnostics. Tests prove that a
   valid illustration works with `picture_id`, a species icon is rejected from every
   `picture_id`, a valid species icon works with a presentation style, and an
   illustration is rejected from a presentation style.
5. The runtime resolves presentation only after reader-safe world projection. A
   visible explicitly assigned species receives its configured icon and colour; a
   visible unassigned species receives the configured generic presentation. Hidden
   species do not appear in browser output merely because a style asset exists.
6. The existing single Species group remains in the same order and uses per-species
   icons for its item rows. All other groups retain the shared ring-and-dot item
   bullet. Search, activity ordering, selection, collapse state, counts, and keyboard
   behavior remain unchanged.
7. Automated coverage verifies assigned and generic presentations, projection
   gating, Species-only bullet substitution, unchanged non-Species bullets, asset and
   registry validation failures, and accessible row naming.
8. The README or directly affected usage documentation, canonical data-model
   definition, technical design, Phase 2 desktop design, and visual-testing guidance
   accurately describe the implemented registry, required asset roles, role
   compatibility, fallback, source layout, and browser behavior. The embedded asset
   schema and prose in `docs/data-model-definition.md` agree with the machine-readable
   schemas and no longer describe the asset registry as role-free or picture-only.
9. Task metadata, data validation, formatting, lint, type checking, unit/component
   tests, production build, and focused cross-browser object-browser tests pass. A
   fresh independent implementation review reports `No findings.` The Captain
   accepts the final icon fidelity and browser legibility in a remote real browser.

## Documentation and generated artifacts

- Commit the six SVG files under `public/assets/species-icons/` and register them in
  `data/narrative/assets.json` with their roles and provenance.
- Commit `data/schema/species-presentation.schema.json` and
  `data/presentation/species.json`. The presentation registry is an authored static
  input, not a generated narrative snapshot.
- Update `docs/technical-design.md`, `docs/design/phase-2-desktop-ui.md`,
  `docs/design/README.md`, `docs/implementation-plan.md`,
  `docs/data-model-definition.md`, `docs/visual-testing.md`, and user-facing
  instructions if their runtime or authoring description changes.
- Preserve the accepted reference images. Do not promote generated mockup pixels into
  runtime assets.

## Validation

```bash
python3 scripts/tasks.py check
./.venv/bin/python scripts/validate_data.py
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e -- --grep "browser|species"
git diff --check
```

From a remote workstation, view the Species group in every available supported
browser at ordinary scale and 200% browser zoom. Confirm that Human and Deltan rows
use their assigned icons and exact colours, a test fixture or controlled scenario
demonstrates the generic fallback, silhouettes remain recognizable without relying
on colour, selection and keyboard focus remain clear, and every non-Species group
retains the shared item bullet. Record browser results and unavailable-browser gaps
before marking the task Done.

## Risks and resolved decisions

- The Captain accepted the icon-only concept and replaced the generic Human avatar
  with the man from the Pioneer 10 plaque.
- The Captain selected one existing Species group with per-species row bullets; no
  per-species groups are introduced.
- The Captain selected a separate validated presentation registry rather than fields
  on narrative species objects.
- The Captain selected this narrow task split. Map markers and the narrative modeling
  needed for homeworld, colony, habitability, and installation states require a later
  task.
- Small icons can lose facial detail. The compact asset must preserve the accepted
  silhouette and defining features without adding a separate incompatible design.
- Species colours may have insufficient contrast on some backgrounds. Validation and
  manual review must cover the actual browser surface and focus/selection states.
- Ready status does not authorize implementation. Runtime, schema, or production
  asset work begins only after the Captain explicitly says `proceed` or `make it so`.
