# ADR-0018: narrative-known star footprint

Status: Accepted
Date: 2026-07-30

## Context

ADR-0012 separated ordinary-star, brown-dwarf, and pointer-target presentation
values. BOB-034 initially treated each component's `marker_radius` as the complete
visible shader footprint and attempted to distinguish narrative-known systems using
brightness and internal core/halo proportions alone.

Real-browser review found that brightness-only and same-footprint treatments did not
make Sol and Epsilon Eridani sufficiently distinct from astronomy-only context. The
Captain requires narrative-known stars to be twice their current visible size, with
diffraction rays scaling proportionally, while astronomy-only stars become much
dimmer.

This is a reading-progress presentation decision. It must not alter canonical
coordinates, interstellar geometry, measurements, catalogue facts, or pointer-target
geometry.

## Decision

- Preserve ADR-0012's catalogue presentation radii as base radii: `0.09` for
  ordinary stellar components and `0.05` for accepted brown dwarfs.
- Astronomy-only components render with visible-plane scale `1.0`.
- Narrative-known components render their complete camera-facing visible plane at
  scale `2.0`. Because ray geometry is analytic in normalized plane coordinates,
  primary and secondary ray reach scale proportionally by `2.0`.
- Narrative-known core and halo radii retain the BOB-034 internal scale `1.25`.
  Combined with the visible-plane scale, their effective screen-space size is `2.5`
  times the equivalent astronomy-only core and halo.
- Astronomy-only final alpha uses one `0.25` emphasis multiplier after composed base
  alpha is clamped to `[0, 1]`; narrative-known final alpha uses `1.0`.
- The independent invisible pick target remains derived from `pick_radius` and is not
  enlarged. Canonical coordinates, component offsets, measurements, captions,
  selection, focus, and catalogue data remain unchanged.
- The larger footprint is explicitly narrative screen-space emphasis, not a claim
  about physical radius, distance, temperature, or luminosity.

This decision supersedes ADR-0012 only where its ordinary and brown-dwarf
`marker_radius` values were interpreted as the complete final visible footprint for
all narrative states. ADR-0012's source authority, identity rules, base presentation
values, object classification, false-colour mapping, intensity, and independent
picking contracts remain binding.

## Consequences

- Narrative-known systems become immediately distinguishable by both brightness and
  complete glyph size.
- Known rays can extend beyond the base `marker_radius`; shader planes remain the
  sole visible per-component draw path.
- The visible outer portion of an enlarged known glyph is intentionally decorative
  and does not enlarge its pointer target.
- Dense known-system views may overlap more often and require real-browser review.
- The map-performance authority must cover the larger fragment footprint without
  weakening its existing budgets.

## Alternatives considered

1. **Shrink astronomy-only glyphs while keeping known footprints fixed.** Rejected
   because the Captain explicitly requested that known stars become larger.
2. **Keep the fixed footprint and enlarge only core/halo proportions.** Rejected
   after real-browser review found the hierarchy insufficient and because rays could
   not grow proportionally.
3. **Scale picking together with the visible footprint.** Rejected because the
   Captain explicitly kept picking unchanged and the existing base target remains
   usable.

## Follow-up

BOB-034 implements the visible-plane, core/halo, and emphasis constants; updates the
integrated technical and Phase 2 design; validates responsive interactions; reruns
the production map-performance authority; and records the Captain's final
real-browser visual verdict.
