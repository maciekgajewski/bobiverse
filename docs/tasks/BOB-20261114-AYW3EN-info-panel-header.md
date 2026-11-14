# BOB-20261114-AYW3EN: Info panel header, kind and illustrations

Status: Ready
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-14

## Objective and user-visible outcome

The Captain reviewed the info panel (the desktop object inspector and the phone
detail sheet, which share `ObjectInspector`) and asked for a tidier header and for
pictures. In every mode (Chapter and Date, desktop and compact):

1. A location's **Map context** row (Mapped, Explicitly unmapped, or No mapped
   stellar-system context) moves out of the details list to the bottom of the panel,
   as its own last **Map context** section, after **Description** and **Mapped
   astronomy**.
2. **Location kind** is no longer a details row. The kind (for example "planet" or
   "star system") is shown in a smaller, muted font directly under the location's
   name in the panel header.
3. The panel header shows an illustration, beside the type and name, for entities
   that have one:
   - an entity's own `picture_id` illustration (character, species and event records
     can carry one; no canonical entity assigns one today). This replaces the old
     full-width picture below the status lines;
   - a species' presentation icon, in its accent colour, from
     `data/presentation/species.json` (every reader-visible species, through the
     existing `resolveSpeciesPresentations` join);
   - GUPPI (`technology:guppi-interface`): the head of the About dialog's Admiral
     Ackbar picture.
4. An illustration appears only while its entity is reader-visible in the projected
   world; nothing is shown, preloaded or linked for a hidden entity.

## Authorization

- The Captain's design decisions of 2026-11-14 at 22:30 (Europe/Warsaw), relayed by
  Piotr Developer Manager as task 2 ("Info panel, all modes"): remove "Mapped context"
  or move it to the bottom (moving is fine); drop "Location kind" as a section and
  show the kind in a smaller font under the name; show an illustration in the panel
  header for entities that have one, using what exists (species `icon_asset_id`);
  GUPPI's illustration is the head of Admiral Ackbar cropped from the existing About
  image, with the same credit, alt text and `CREDITS.md` entry; fair use is already
  accepted by the Captain. Authorised under the standing "deploy once ready" OK:
  separate branch, review, then deploy.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Sections 10 and 11 (updated by this task)
- `../design/phase-2-desktop-ui.md`, Section 9 (updated by this task)
- `../adrs/0024-species-presentation-registry.md`
- `BOB-20261114-KA0X30-about-dialog.md` (the About picture and its credit)
- `BOB-20261114-H960PW-mobile-snap-sheet.md` (the phone detail sheet)
- `../visual-testing.md` (manual checklist added by this task)

## Scope

1. `src/narrative/header-illustration.ts`: `resolveHeaderIllustration(entityId,
world, assets, speciesPresentation)` looks the entity up in the projected world
   (absent means no illustration), then uses, in order, its `picture_id` asset (only
   the `illustration` role), a code-side presentation illustration, or the species
   icon. `PRESENTATION_ILLUSTRATIONS` registers GUPPI only.
2. `public/assets/guppi-ackbar-head.webp`: a 66×66 head crop of
   `public/assets/ackbar.webp`, lossless WebP (about 7 KB). Its alternative text is
   the About picture's credit, verbatim: "Admiral Ackbar illustration by Michael
   Sutfin, from The New Essential Guide to Characters. Star Wars © Lucasfilm Ltd.
   Used under fair use." `public/assets/CREDITS.md` gains a matching entry.
3. `src/components/ObjectInspector.tsx`: a `header.inspector-header` with the type,
   name, location kind (`.entity-kind`) and the illustration; the **Location kind**
   row and the in-list **Map context** row are removed; a final
   `section.map-context-section` holds Map context. Chapter detail is unchanged.
4. `src/styles.css`: header layout, a 3.5rem framed illustration, a masked species
   icon, and the smaller kind line.
5. Tests: unit tests for the resolver (GUPPI absent at zero state and Chapter 1.1,
   present at 1.2; every projected species gets its icon; `picture_id` precedence and
   role check; credit, asset and CREDITS.md consistency); component tests for the
   header, kind line, Map context position and the hidden-GUPPI case; e2e at
   1280×800 and 390×844 for a location, a species and GUPPI, and a spoiler e2e at
   Chapter 1.1.
6. Docs: technical design, the phase-2 UI design, and the visual-testing checklist.

## Out of scope

- Any change under `data/`, including `assets.json`, `species.json`, schemas and
  description lengths (the latter go to the Extractor separately).
- New `picture_id` assignments or a schema change that would let technologies carry
  `picture_id`.
- The About caption link (BOB-20261114-ANZFK6) and the read-through change from the
  same feedback round.
- Chapter-detail pictures, astronomy-only and component inspectors.

## Acceptance criteria

1. For a location, the kind is directly under the name in a smaller font, there is
   no **Location kind** row, and the panel's last element is the **Map context**
   section.
2. A reader-visible species shows its accent-coloured species icon in the header,
   named "<species> species icon".
3. GUPPI's card shows the head crop in the header with the exact credit as its alt
   text; at zero state and Chapter 1.1 GUPPI has no card and the asset is never
   rendered.
4. An entity `picture_id` resolves only an `illustration` asset and shows in the
   header; entities without any illustration keep a plain header.
5. Desktop inspector and phone sheet behave the same; the sheet's peek still shows
   the type and name.
6. All validation commands below pass.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
npx playwright test --project=chromium
npx playwright test --project=firefox   # via xvfb-run, as npm run test:e2e does
npx playwright test --project=webkit
npx prettier --check <changed Markdown>
git diff --check
```

Manual: the Captain's check on desktop and a phone after deployment (checklist in
`../visual-testing.md`).

## Risks and decisions

- **"Mapped context".** The UI has no "Mapped context" heading; the request is read
  as the **Map context** row whose value is usually "Mapped". It moves to the bottom
  rather than being removed, as the manager allowed.
- **GUPPI is wired in code, not data.** The design path for entity pictures is a
  `picture_id` assignment to an `assets.json` `illustration`, but the schema allows
  `picture_id` only on characters, species and events, and `data/` is out of scope.
  GUPPI's picture is therefore a code-side decorative presentation illustration,
  joined after projection like the species icons, and recorded as part of the
  Captain's Ackbar fair-use exception in technical-design Section 11. If the project
  later wants GUPPI in the asset registry, that needs a schema change (technology
  `picture_id`) and a data change, and this registry entry would move there.
- **Third-party art.** `AGENTS.md` forbids copying Star Wars visual assets; the
  Captain's fair-use exception for the About picture (BOB-20261114-KA0X30) is
  extended to this crop of the same picture by the authorization above.
- **Species icon as illustration.** Species have no picture today, so the header uses
  the presentation icon, as the Captain suggested. A species `picture_id` would take
  precedence.

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on origin/master `5c2d9d7` under the authorization above, on local branch
  `bob-20261114-ayw3en-info-panel-header` in the `~/src/bobiverse-infopanel`
  worktree.
