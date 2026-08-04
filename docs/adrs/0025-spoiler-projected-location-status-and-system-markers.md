# ADR-0025: spoiler-projected location status and system markers

Status: Accepted
Date: 2026-08-03

## Context

The interstellar map needs compact, original icon-only indicators for inhabited
colonies, species homeworlds, abandoned or destroyed homeworlds, possible colony
targets, and prominent installations. These states are book-derived facts that
change with reader progress. They therefore cannot live in astronomy data, a static
presentation registry, or renderer-only constants.

One map node represents one stellar system, while the facts belong to locations at
any supported level beneath that system. Several locations and species can contribute
to one system marker. The result must remain spoiler-safe, legible in dense caption
layouts, and deterministic when more states exist than can be displayed.

## Decision

Create the five accepted monochrome system-status icons (colony, homeworld,
abandoned world, possible colony target, and prominent installation) below
`public/assets/system-markers/` in the preceding icon-authoring task. Extend the
validated static asset-role vocabulary from ADR-0024 with `system_marker_icon`, and
register every status asset with that role and provenance. Every system-marker
consumer accepts only `system_marker_icon`; species-presentation styles and
`picture_id` reject it. The assets carry no narrative state by themselves.

Add three optional fields to every non-transit narrative location and its update
contract:

- `colony_of`: an array of unique `species_id` values. A nonempty array records a
  durable established presence associated with each listed species, including a
  settlement, colony, or operated prominent installation. Temporary visits, vessels
  passing through, character appearances, surveys, and unstaffed transient activity
  do not qualify. An update replaces the complete list, `[]` clears it, and omission
  preserves it.
- `possible_colony_target`: a boolean indicating that the location is a plausible
  future settlement target. It includes worlds requiring substantial technological
  assistance, sealed habitats, or terraforming; it is not limited to immediately
  habitable worlds. `false` clears the state and omission preserves it.
- `prominent`: a lightweight boolean indicating that the location is important
  enough to contribute a main-map installation marker. It is allowed for any
  non-transit location kind and does not create a new installation kind. `false`
  clears the state and omission preserves it.

An effective location may not combine a nonempty `colony_of` with
`possible_colony_target: true`; semantic validation checks the complete projected
state after each update. Different descendant locations in the same stellar system
may independently contribute both states.

Keep `species.homeworld_id` as the sole homeworld relationship. A homeworld that is
still inhabited must also list its species in `colony_of`; absence means the
homeworld is abandoned or destroyed for map-presentation purposes. A different
species may colonize such a world without changing the original homeworld
relationship.

Derive a typed per-system status model only from the centralized reader-safe
`NarrativeWorld`, the projected homeworld relationships, and location ancestry. Do
not author or generate a second system-status authority. For each species in a
system, retain only its highest-priority effective role:

1. inhabited homeworld;
2. prominent installation presence;
3. ordinary colony;
4. abandoned or destroyed homeworld.

When several contributors yield the same role, deduplicate them. Order retained
species-role pairs by role priority and then canonical species ID. Render at most
three pairs and an exact `+N` overflow count. A possible-colony-target indicator and
a neutral prominent-installation indicator are standalone states outside that cap
and remain visible whenever present. A prominent location with a nonempty
`colony_of` yields the species' prominent role instead of colony domes; a prominent
location without a species association yields the neutral indicator.

Render the status rail as part of the existing DOM-backed known-system caption. It
shares that caption's collision unit and depth-fade opacity. Hover replaces only the
ordinary system name with the tooltip; status icons remain visible and associated
with the hovered system. Selected and active captions retain their existing full
opacity. The collision resolver accepts a deterministic per-caption footprint so a
status rail is not treated as the legacy name-only `144 x 26` footprint.

Use the species icon and accent colour from ADR-0024. Pair it with the accepted
production status SVGs from `BOB-20260803-G3N1GQ`: ice-white colony domes, ice-white
homeworld, gray cracked planet with broken orbital arc for an abandoned homeworld,
bright green possible-colony-target planet, and pale-violet prominent installation.
The abandoned state uses a smaller grayed species icon. Shape and accessible text,
not colour alone, communicate meaning.

## Consequences

- Colony, target, and prominence facts become chapter-controlled, spoiler-projected
  narrative state with source-aware validation.
- A system marker is a deterministic aggregate over projected descendants rather
  than an authored system summary.
- Inhabited and abandoned homeworld states remain compatible with the existing
  homeworld relationship and with later recolonization by another species.
- Caption collision logic must account for variable marker-rail footprints without
  moving or suppressing captions or changing canonical geometry.
- Editorial extraction guidance must explain the durable-presence threshold and the
  broad, technology-assisted meaning of a possible colony target.
- Detailed per-location status rows in the system context panel remain a separate
  future task.
- The preceding icon-authoring task expands under this ADR without rewriting the
  already accepted ADR-0024.

## Alternatives considered

1. Put marker state directly on star systems. Rejected because the source facts
   belong to individual locations and would duplicate or flatten their hierarchy.
2. Derive colonies from character appearances or mentions. Rejected because those
   references do not establish durable habitation or ownership.
3. Treat every homeworld as inhabited. Rejected because homeworld identity persists
   after abandonment or destruction.
4. Display every species role in a system. Rejected because dense icon rails reduce
   map readability; deterministic role reduction and overflow preserve a clear map.
5. Add an `installation` location kind. Rejected because `prominent` is deliberately
   lightweight and may apply to any existing non-transit kind.

## Follow-up

- Produce the complete accepted icon vocabulary in `BOB-20260803-G3N1GQ`.
- Implement schema, validation, projection, representative data, map aggregation,
  rendering, tests, and editorial documentation in `BOB-20260803-X52E0D` after that
  prerequisite is Done.
- Specify the detailed system-context status list in a separate future task.
