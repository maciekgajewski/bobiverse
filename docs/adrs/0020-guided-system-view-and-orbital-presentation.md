# ADR-0020: guided system view and orbital presentation authority

Status: Accepted
Date: 2026-07-31

## Context

The interstellar map represents one stellar system as one true-scale canonical node.
The reader-visible narrative location hierarchy can already contain stars, planets,
dwarf planets, moons, asteroid belts, Kuiper belts, and Oort clouds, but the
application has no view of that hierarchy inside a selected system.

A system composition cannot be rendered by continuing the interstellar camera toward
physical planetary distances. The application deliberately stores no physical
orbital distances for narrative locations, and the orders of magnitude between
parsec-scale geometry and planetary systems would make a literal continuous zoom
unusable. The desired experience is instead a visually continuous transition into a
clearly schematic local view.

The integrated location contract says that authored `orbits` siblings are ordered
inner-to-outer, while ADR-0018's anonymous surveyed-moon exception says those
children are presentation inventory without orbital-order meaning. A renderer driven
solely by the location hierarchy needs one consistent ordering rule.

Planetary rendering also needs reusable project-owned surface textures and optional
dedicated textures without treating those visual assets as physical astronomy facts
or bypassing reader-order projection.

## Decision

- Add one guided schematic system-view mode within the existing React Three Fiber
  application and renderer. It is not a second map engine, route-specific
  application, orbital simulator, or physical coordinate system.
- The projected reader-visible location hierarchy is the sole authority for system
  composition. The renderer does not maintain a second planet list, infer missing
  bodies, attach bodies to a different star, or sort orbital siblings.
- Among every effective parent's children whose `parent_relation` is `orbits`,
  projected child order always means inner-to-outer order. Every effective orbital
  child receives an integer ordering key in the inclusive range
  `1`–`9007199254740991`.
- Nested zero-state authoring uses child-array order. Projection assigns implicit keys
  `1024`, `2048`, and so on in array order. A later flat location introduction or
  update may supply an optional non-metric `orbital_order` safe integer to insert or
  move a child relative to those or other effective siblings.
- When an introduction or reparenting omits `orbital_order`, projection appends it
  after the maximum effective sibling key in increments of `1024`. The maximum of an
  empty effective sibling set is defined as `0`, so its first omitted child receives
  `1024`. If several omissions become effective at the same narrative moment, stable
  location ID determines their allocation order and they receive successive keys
  `1024`, `2048`, and so on after that baseline or the existing maximum. An ordinary
  update that omits the field retains the current effective key.
- Explicit and implicit effective sibling keys share one numeric order and must be
  unique. Authors insert between keys with any unused positive safe integer. If no
  integer remains in the desired gap, the same authored change must renumber the
  affected siblings explicitly. Reparenting without a key allocates an append key;
  leaving `orbits` removes the effective key. Overflow, non-integer, non-positive, and
  duplicate keys fail validation. Projection derives `child_ids` by ascending
  effective key before the renderer consumes the hierarchy.
- An `orbital_order` value is presentation order, not distance. When source material
  does not establish an order, authoring or the deterministic append rule may invent
  one. That invented order becomes the schematic hierarchy order but is not a
  measured orbital distance or catalogue astronomy fact.
- This ordering decision supersedes only ADR-0018's statement that anonymous surveyed
  moon order has no inner-to-outer meaning. ADR-0018's reader-order visibility,
  survey-field, identity, moon-cap, and evidence requirements remain accepted.
- Local orbital radii, component-star placement, orbital phase, inclination, body
  size, and axial rotation are decorative presentation. The system view never
  exposes them as measured values or uses them for interstellar measurement.
- Navigation is selection-driven through predefined views. The system view has no
  user-controlled camera pan, rotation, wheel zoom, or pinch zoom. Browser
  magnification remains available and is never intercepted or disabled.
- The existing Galactic backdrop remains present through entry, local navigation,
  and exit. Interstellar systems other than the entered system may remain as dim,
  non-interactive background context without changing their canonical data.
- Planet, dwarf-planet, and moon surfaces use local project-owned texture assets.
  The existing asset registry gains an explicit asset role so illustration assets
  and equirectangular body-surface textures cannot be used interchangeably.
- An eligible body location may carry one optional, reader-projected surface-texture
  reference. An absent reference selects a deterministic generic texture compatible
  with the body's effective class or kind. A reference may choose a particular
  generic preset or a dedicated custom surface. The reference and texture are
  presentation only; they do not add physical measurements or catalogue authority.
- All generic and custom surfaces are validated local static assets with provenance.
  The browser makes no runtime asset request to an external service.

## Consequences

- The same hierarchy drives the object browser, inspector relationships, breadcrumb
  navigation, spoiler eligibility, and system composition.
- Later introduction and reparenting can express a new inner, middle, or outer
  position without renderer-side sorting. Existing flat chapter sources that omit
  `orbital_order` receive stable append keys as the accepted invented schematic
  order.
- Existing anonymous surveyed moons retain their stable identities and stored order;
  that order is now the accepted schematic inner-to-outer order even where it was
  originally chosen without physical evidence.
- A system-view implementation must add projection, rendering, navigation, asset,
  responsive, accessibility, and regression coverage, while preserving the
  true-scale interstellar map and measurement boundaries.
- Surface presentation becomes an explicit, validated asset use rather than a
  filename embedded in renderer code. Illustration rendering must reject a
  body-surface asset, and body rendering must reject an illustration asset.
- Dedicated custom surfaces can be added later without changing renderer code or
  creating a parallel body model.
- Because camera framing and all local geometry are schematic, the interface and
  documentation must not imply physical scale or measured orbital geometry.

## Alternatives considered

1. Continue the true-scale Galactic camera into physical planetary geometry.
   Rejected because the data has no physical orbital coordinates and the scale change
   would be unusable.
2. Open a separate modal or popup diagram. Rejected because it breaks spatial
   continuity, constrains mobile space, and creates nested inspection problems.
3. Allow free local camera pan, rotation, and zoom. Rejected because it adds no
   physical understanding, destabilizes labels and touch targets, and lets users lose
   the intended schematic composition.
4. Render planets as camera-facing sprites. Rejected because textured spheres support
   stable lighting, axial rotation, occlusion, and custom surface assets from every
   guided view.
5. Keep anonymous-moon order semantically unordered and let the renderer arrange it.
   Rejected because it creates a second presentation authority and makes identical
   hierarchy data render differently across consumers.
6. Reuse `picture_id` for body surfaces. Rejected because an inspector illustration
   and an equirectangular surface texture have incompatible presentation and
   validation contracts.

## Follow-up

- Integrate this decision into `docs/technical-design.md`,
  `docs/data-model-definition.md`, and `docs/implementation-plan.md`.
- Implement the accepted guided interaction and rendering design in
  `docs/design/guided-system-view.md`.
- Add the optional authored `orbital_order` field, projection semantics, source-aware
  validation, and focused introduction/reparenting tests to the implementation task.
- Keep narrative extraction workflow changes outside the renderer task. Future
  authoring may opt into explicit order while omission retains deterministic append
  behavior.
