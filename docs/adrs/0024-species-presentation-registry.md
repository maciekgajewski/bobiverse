# ADR-0024: species presentation registry

Status: Accepted
Date: 2026-08-03

## Context

The accepted species-icon concept needs one stable icon and accent colour for each
supported species. The same presentation must be reusable in the object browser and
on the interstellar map without turning those visual choices into book-derived facts
or allowing chapter updates to mutate them.

The narrative `species` entity currently owns identity, reader-visible description,
an optional illustration, and an optional homeworld. Its fields are projected through
reader order and chapter updates. Icon artwork and interface colours instead belong
to the application visual system. A hidden TypeScript mapping would keep that
boundary but would make the assignments difficult to inspect and validate.

The six accepted icon styles are Humans, Deltans, Pavs, The Others, Quinlans, and a
generic Other / Unknown style. Not every named species has a canonical narrative
entity yet, so producing the artwork must not invent future narrative IDs.

## Decision

Store species icon artwork as original project-owned monochrome SVG assets below
`public/assets/species-icons/`. Register each file through the validated static asset
registry with the required `species_icon` role and provenance. Every asset registry
entry has one required role. The shared role vocabulary is `illustration`,
`body_surface`, and `species_icon`; role compatibility is enforced at every consumer,
including rejection of a species icon from `picture_id`. The Human icon is an original
simplified line treatment derived from the head of the man on NASA's Pioneer 10
plaque; its provenance must name that reference.

Add a separately validated, unversioned species-presentation registry under
`data/presentation/species.json`, governed by
`data/schema/species-presentation.schema.json`. It owns:

- stable presentation-style IDs;
- the registered icon asset and exact accent colour for each style;
- one explicit generic default style; and
- explicit assignments from existing canonical narrative species IDs to styles.

The registry contains all six accepted styles, but it assigns only canonical species
IDs that already exist in the narrative corpus. A later narrative introduction may
add a presentation assignment in the same reviewed change; it must not predeclare or
invent a future narrative entity merely to reserve an icon.

Runtime consumers join the registry to species entities only after the centralized
reader-safe `NarrativeWorld` projection. A visible species without an explicit
assignment uses the configured generic style. The SVG silhouette and accessible text
carry identity without relying on colour alone.

The existing `homeworld_id` remains the sole species-to-homeworld fact. A future map
marker derives a homeworld system from that projected relationship and location
ancestry; this registry does not add a second homeworld flag.

## Consequences

- Narrative species records remain free of interface-only icon and colour fields.
- Icon and colour assignments are explicit, schema-validated data rather than hidden
  renderer constants.
- The same asset and colour can be used by DOM browser rows and later DOM-backed map
  captions.
- Species artwork can be prepared before the corresponding narrative entity exists,
  but no association is made until that entity is canonical.
- The asset registry and validation must distinguish species icons from inspector
  illustrations and body-surface assets in both reference directions.
- A generic fallback is deterministic and visible in configuration rather than a
  silent renderer default.

## Alternatives considered

1. Add `icon_id` and `color` to narrative species entities. Rejected because it makes
   stable interface presentation chapter-authored and patchable narrative state.
2. Keep a TypeScript object keyed by species ID. Rejected because it hides data and
   weakens completeness, reference, and asset-role validation.
3. Assign registry entries to speculative future species IDs. Rejected because the
   presentation layer must not invent narrative identity.
4. Give each species its own expandable browser group. Rejected because the accepted
   browser structure retains one Species group; only its row bullets vary.

## Follow-up

- Implement the six SVG assets, asset-role validation, presentation schema and
  registry, runtime join, and Species-row bullets in
  `BOB-20260803-G3N1GQ`.
- Update the integrated technical design and Phase 2 desktop design with this
  ownership and browser exception.
- Update the canonical data-model definition with the asset-role and
  species-presentation contracts.
- Model homeworld, inhabited-colony, habitable-target, and installation map markers
  in a separate task.
