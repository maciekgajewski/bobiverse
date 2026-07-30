# ADR-0018: spoiler-projected system-survey observations

Status: Accepted
Date: 2026-07-30

## Context

The narrative location tree can represent systems, planets, dwarf planets, and moons,
but the current extraction workflow may collapse a detailed system survey into
chapter prose or a star-system description. That loses independently addressable
planetary bodies and source-supported appearance facts needed for a later system
renderer.

The existing astronomy boundary assigns catalogue geometry and measured render facts
to the astronomy pipeline. Book-revealed surveys are instead reader-order knowledge:
they must not appear before the revealing chapter, may be revised by later chapters,
and may describe fictional bodies absent from the catalogue authority.

## Decision

- Beginning with Chapter `1.16`, every source-supported system survey authors each
  surveyed planet or dwarf planet as a spoiler-projected narrative location. Extraction
  preserves all source-supported survey information. Facts without dedicated
  structured fields remain in original, concise `description` prose.
- Locations of kind `planet`, `dwarf_planet`, and `moon` share these optional
  reader-visible fields:
  - `body_class`: one of `rocky`, `icy`, `dwarf_planet`, `gas_giant`, or
    `ice_giant`;
  - `color`: a nonempty, source-faithful free-form colour description;
  - `visual_description`: nonempty prose limited to visible appearance;
  - `surface_gravity_g`: a positive finite numeric surface gravity in Earth
    gravities.
- A qualitative gravity comparison is not converted into
  `surface_gravity_g`; it remains in `description`. Source-supported values in other
  numeric units may be converted reproducibly to Earth gravities without adding
  unsupported precision. Direct Earth-gravity values are retained as supplied.
  Metres per second squared are converted with
  `surface_gravity_g = surface_gravity_m_s2 / 9.80665`; the result retains no more
  significant digits than the source measurement. Other units remain in
  `description` until explicitly adopted. The sealed ledger retains the source value
  and unit, and reconciliation records every conversion.
- These fields belong to chapter-projected narrative state. They do not become
  catalogue astronomy authority, canonical coordinates, physical orbital distances,
  or precise renderer colours. A later renderer may use them only within the active
  reader-safe projection.
- A surveyed body receives at most four direct moon children. Prefer source-named or
  distinctly described moons, then the largest moons for which the source supports a
  comparison, then source order.
- When only an exact count is known, create up to four anonymous moon locations named
  `Moon 1` through `Moon 4`. Derive their stable IDs by appending
  `-moon-01` through `-moon-04` to the parent location's ID suffix; for example,
  `location:ee-3` produces `location:ee-3-moon-01`. Named or otherwise selected moon
  IDs occupy their own source-derived identities first; anonymous ordinals use the
  lowest suffixes not already occupied by an existing child ID and fail rather than
  collide. When the source says only that there are many moons, create four anonymous
  locations. Preserve the full exact, approximate, lower-bound, or qualitative count
  in the parent `description`.
- Anonymous moon numbering and authored child order are deterministic presentation
  inventory only. They assert neither physical orbital distance nor physical
  inner-to-outer order. All displayed orbital spacing is decorative.
- If a later chapter names a previously anonymous moon without supplying a unique
  identity link, update the lowest-numbered still-anonymous moon with that name and
  supported facts. When one chapter supplies multiple new names without identity
  links, assign them in source-mention order to ascending anonymous ordinals. The
  stable location IDs remain unchanged. Once four specific moon identities occupy the
  cap, further moons remain in description unless a later architecture decision
  introduces replacement or retirement semantics.
- The existing curated zero-state moon selection remains unchanged. Chapters
  `1.1`–`1.15` are not retrospectively audited. The rule applies to Chapter `1.16`
  and future extraction.

## Consequences

- Planetary survey detail becomes queryable, spoiler-safe location state suitable for
  a future renderer without moving book facts into the astronomy catalogue.
- Location introduction/update schemas, semantic validation, projection, generated
  data-model documentation, extraction guidance, and regression tests must recognize
  the four optional fields.
- Extraction must account for every surveyed body and every survey claim in human
  review. Omitting a surveyed planet because it is unnamed, uninhabitable, or only
  briefly inspected is an extraction defect from Chapter `1.16` onward.
- The moon cap bounds browser and renderer complexity but intentionally represents
  only a selected subset when the source reports more than four moons. Descriptions
  retain the complete supported count and omitted aggregate facts.
- The pre-ADR Chapter `1.16` ledger is immutable but incomplete for the new survey
  checklist. Chapter `1.16` requires a fresh blind Terra/high Pass 1 under the revised
  skill, a newly sealed and fingerprinted ledger, and then a fresh Pass 2. The old
  ledger and candidate are comparison evidence only after the replacement candidate
  validates; they are never staged into either fresh pass.

## Alternatives considered

1. Store book survey facts in static astronomy records. Rejected because that would
   mix fictional reader-order knowledge with catalogue authority and reveal facts too
   early.
2. Add a separate survey-record entity model. Rejected because chapter-projected
   location state already provides the required identity, update, and spoiler
   semantics.
3. Store all survey detail only in prose. Rejected because later rendering needs
   structured body class, colour, visible appearance, and numeric surface gravity.
4. Add dedicated schema fields for every reported measurement. Rejected for now in
   favor of keeping nonessential measurements in `description`.
5. Create every reported moon without a cap. Rejected to keep the location tree and
   future rendering bounded.

## Follow-up

- BOB-20260730-PEMMHF implements the schema, validation, projection, documentation,
  extraction-skill rule, tests, and revised review-only Chapter `1.16` candidate.
- A future rendering task may consume these fields but must preserve their
  reader-projection boundary and decorative-geometry status.
