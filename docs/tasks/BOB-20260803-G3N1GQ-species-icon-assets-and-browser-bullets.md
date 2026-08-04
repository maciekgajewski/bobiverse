# BOB-20260803-G3N1GQ: species and system-status icon assets and browser bullets

Status: Done
Phase: 2 (narrative visual refinement)
Last updated: 2026-08-04

## Objective

Turn the accepted icon concepts into validated reusable species and system-status SVG
assets, and use each species' assigned icon and colour as the item bullet for its row
in the existing Species object-browser group.

## User-visible outcome

The object browser still contains one expandable **Species** group. Each visible
species row uses its own compact, coloured, shape-distinct icon instead of the shared
ring-and-dot bullet used by every other object group. Humans use the simplified head
of the man from the Pioneer 10 plaque. Species without an explicit assignment use the
generic Other / Unknown icon and colour.

The reusable status-icon set is also production-ready for the later map-marker task:
colony domes, homeworld, abandoned/destroyed world, possible colony target, and
prominent installation. This task does not place those icons on the map.

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
- `../adrs/0025-spoiler-projected-location-status-and-system-markers.md`, only for
  status-asset authoring and the `system_marker_icon` role
- `../adrs/0027-final-production-system-marker-visual-vocabulary.md`
- NASA's official Pioneer plaque reference:
  <https://science.nasa.gov/resource/pioneer-plaque/>

The reference images define the accepted icon subjects, silhouettes, relative line
weight, and palette. Their illustrative system assignments, browser contents, text,
and dimensions remain non-canonical. On 2026-08-04, after rejecting visually divergent
hand-authored approximations, the Captain explicitly superseded the former generated-
pixel restriction for this artwork and authorized direct monochrome vector tracing of
the accepted icon shapes. This exception does not make any illustrative assignment,
label, dimension, or narrative content canonical.

## Contract change and document precedence

ADR-0024 and the integrated technical design deliberately supersede only the current
role-free, picture-oriented asset-registry wording and embedded asset schema in
`docs/data-model-definition.md`. The implementation must update that canonical
document, the machine-readable narrative schema, validation, fixtures, and authored
asset entries atomically. The existing narrative species contract remains unchanged,
and historical task or ADR completion records are not rewritten.

## In scope

- Create six project-owned, concept-faithful monochrome SVG assets below
  `public/assets/species-icons/`:
  Humans, Deltans, Pavs, The Others, Quinlans, and Other / Unknown.
- Create five original monochrome SVG assets below `public/assets/system-markers/`:
  colony domes, homeworld, abandoned/destroyed world, possible colony target, and
  prominent installation.
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
  values `illustration`, `body_surface`, `species_icon`, and `system_marker_icon`.
  Atomically migrate every existing asset entry and validation fixture. Register the
  six species icons with `species_icon`, the five status icons with
  `system_marker_icon`, and provenance for every asset.
- Enforce asset compatibility in both directions: species presentation styles accept
  only `species_icon`, every chapter/entity `picture_id` accepts only `illustration`,
  any implemented `surface_texture_id` consumer accepts only `body_surface`, and the
  later system-marker consumer can accept only `system_marker_icon`. Reject
  system-marker assets from species presentation styles and every `picture_id`.
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
- Add a focused visual-specimen test that renders all eleven production icons against
  the actual dark UI surface at the intended compact sizes. Preserve its screenshot
  for Captain review without exposing the specimen as an application feature.

## Out of scope

- Changing the fixed object-browser group order or creating one group per species.
- Adding icon or colour fields to narrative species introductions or updates.
- Adding or changing narrative species entities, names, descriptions, homeworlds,
  pictures, chronology, activity, or spoiler projection.
- Assigning presentation styles to species IDs that are not yet canonical.
- Adding species icons, homeworlds, colonies, habitable targets, installations, badge
  rails, or any other new behavior or semantics to the interstellar map.
- Modeling colony ownership, settlement state, habitability, facilities, or system
  installations.
- Changing ordinary group-heading icons, non-Species row bullets, map star glyphs,
  captions, selection, active markers, or canonical geometry.
- Embedding raster images or copying third-party game assets into production SVGs.
  Direct vector tracing of these specifically accepted project-owned concept icons is
  authorized by the Captain's 2026-08-04 decision above.

## Acceptance criteria

1. Six project-owned, optimized species SVGs and five project-owned, optimized system-status
   SVGs exist at stable registered paths and visually match the accepted subjects at
   normal and compact browser sizes. The Human asset is recognizably based on the
   Pioneer plaque man's head and records NASA provenance.
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
   illustration or system-marker icon is rejected from a presentation style. A
   system-marker fixture accepts only `system_marker_icon` assets.
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
   registry validation failures, status-icon role compatibility, and accessible row
   naming.
8. A focused browser specimen renders all six species icons and all five status icons
   at intended compact sizes on the real UI background. Its preserved screenshot
   proves consistent weight, mask behavior, and non-colour shape recognition before
   the marker task consumes the assets.
9. The README or directly affected usage documentation, canonical data-model
   definition, technical design, Phase 2 desktop design, and visual-testing guidance
   accurately describe the implemented registry, required asset roles, role
   compatibility, fallback, source layout, and browser behavior. The embedded asset
   schema and prose in `docs/data-model-definition.md` agree with the machine-readable
   schemas and no longer describe the asset registry as role-free or picture-only.
10. Task metadata, data validation, formatting, lint, type checking, unit/component
   tests, production build, and focused cross-browser object-browser tests pass. A
   fresh independent implementation review reports `No findings.` The Captain
   accepts the final icon fidelity and browser legibility in the preserved production
   specimen after it passes in Chromium, Firefox, and WebKit.

## Documentation and generated artifacts

- Commit the six SVG files under `public/assets/species-icons/` and five SVG files
  under `public/assets/system-markers/`; register them in
  `data/narrative/assets.json` with their roles and provenance.
- Commit `data/schema/species-presentation.schema.json` and
  `data/presentation/species.json`. The presentation registry is an authored static
  input, not a generated narrative snapshot.
- Update `docs/technical-design.md`, `docs/design/phase-2-desktop-ui.md`,
  `docs/design/README.md`, `docs/implementation-plan.md`,
  `docs/data-model-definition.md`, `docs/visual-testing.md`, and user-facing
  instructions if their runtime or authoring description changes.
- Preserve the accepted reference images. Runtime assets remain standalone vectors;
  do not embed raster pixels. Direct tracing is limited to the specifically authorized
  icon shapes and does not promote illustrative data from the mockups.

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
npm run test:e2e -- --grep "icon asset specimen"
git diff --check
```

Review the preserved icon-asset specimen at each intended compact size after its
Chromium, Firefox, and WebKit runs. Confirm that Human and Deltan rows use their
assigned icons and exact colours, the generic fallback is covered, silhouettes remain
recognizable without relying on colour, and all five status subjects are distinct and
balanced before they appear on the map. On 2026-08-04, after being told that a
separate remote ordinary-scale and 200% browser matrix was the sole remaining gate,
the Captain accepted this preserved cross-browser specimen as the final visual gate.
That explicit decision supersedes this task's former manual-matrix requirement; it
does not waive the project's general WebGL publication review.

## Implementation record

Implemented on 2026-08-04. The asset-role migration, six species icons, five
system-marker icons, validated presentation registry, reader-safe runtime join,
Species-only row bullets, focused regression coverage, and test-only specimen are in
place. The preserved Chromium specimen is
`docs/design/artifacts/icon-asset-specimen-chromium.png`.

All documented automated validation commands pass. The focused browser/species suite
passes in Chromium, Firefox, and WebKit (9 tests), and the icon-asset specimen passes
in Chromium, Firefox, and WebKit (3 tests). The Captain visually accepted the final
production specimen on 2026-08-04 and explicitly made that preserved cross-browser
artifact the final task-specific visual gate. Automated Chromium, Firefox, and WebKit
coverage at 16, 20, and 24 CSS pixels is the recorded browser evidence.

The initial independent implementation review found two validation-diagnostic gaps.
Both were corrected, focused regressions were added, and a fresh independent closure
pass reported `No findings.`

After visual review rejected the initial hand-authored approximations, the six species
assets and the four status subjects visible in the accepted concept were replaced by
faithful monochrome vector traces of the accepted reference artwork. The abandoned-
world subject, which is not pictured in that sheet, retains an original matching
planet, crack, and broken-orbit construction. Species browser bullets now render at
the concept's intended 20 CSS pixels.

A post-replacement review identified the conflict with the former generated-pixel
restriction and insufficient Deltan head height at compact size. The Captain's direct-
trace authorization is now explicit above, trace contours were simplified, and the
Deltan uses the concept's compact rendering with geometry normalized inside the shared
view box. The final fresh independent review reported `No findings.`

The Captain rejected that simplified trace fidelity on 2026-08-04 and authorized a
high-fidelity vector pass before considering a bitmap fallback. All six species assets
were retraced from the large concept artwork rather than its embedded 20 px previews,
with subpixel contour simplification and only minimal stroke expansion. This removes
the special Deltan transform and preserves substantially more of the accepted facial
construction and silhouette geometry. An independent review then identified excessive
raster-boundary vertices; a second optimization reduced the six assets from about
162 KB to 62 KB total while preserving the approved shapes at enlarged and compact
sizes. The fresh closure review reported `No findings.` The Captain accepted the final
species and status-icon vocabulary on 2026-08-04.

After reviewing four clean vector alternatives, the Captain selected the
decommissioned-world symbol for the abandoned or destroyed world asset. The prior
cracked-planet construction was replaced by a barred globe at the shared compact
sizes. After reviewing four clean colony alternatives, the Captain selected the twin-
domes settlement, replacing the former traced colony marker with a clean geometric
construction. ADR-0026 records the selected marker vocabulary and explicitly replaces
ADR-0025's rejected cracked-planet visual clause without changing its status semantics.
After a further four-variant review, the Captain selected the crosshair world for a
possible colony target. ADR-0027 supersedes ADR-0026 with that final vocabulary; the
former ringed-planet target was rejected because it read as an eye at compact size.

## Risks and resolved decisions

- The Captain accepted the icon-only concept and replaced the generic Human avatar
  with the man from the Pioneer 10 plaque.
- The Captain selected one existing Species group with per-species row bullets; no
  per-species groups are introduced.
- The Captain selected a separate validated presentation registry rather than fields
  on narrative species objects.
- The Captain selected this task to own the complete accepted icon vocabulary. Map
  marker placement and the narrative modeling needed for homeworld, colony,
  habitability, and installation states remain in a later dependent task.
- Small icons can lose facial detail. The compact asset must preserve the accepted
  silhouette and defining features without adding a separate incompatible design.
- Species colours may have insufficient contrast on some backgrounds. Validation and
  manual review must cover the actual browser surface and focus/selection states.
- Ready status does not authorize implementation. Runtime, schema, or production
  asset work begins only after the Captain explicitly says `proceed` or `make it so`.
