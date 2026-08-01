# ADR-0022: classical and reader-visible stellar-system naming

Status: Accepted
Date: 2026-08-01

## Context

ADR-0011 assigns astronomy inclusion, geometry, enrichment, and membership roles to
GCNS, CNS5, Gaia DR3, and WDS. ADR-0012 adds the Kirkpatrick et al. 2024 20-pc census
as a narrowly scoped identity and presentation source. The resulting catalogue still
uses technical GJ, HIP, Gaia, or CNS5 fallbacks for many bright stars because those
sources do not uniformly provide Bayer and Flamsteed designations.

This is visible for mapped narrative destinations: accepted systems
`stellar-system-003557` and `stellar-system-003918` have source-backed identities and
geometry, and already accept the book-visible aliases `Beta Hydri` and
`Delta Eridani`, but their generated astronomy preferred names remain `GJ 19` and
`GJ 150`. The map and astronomy UI read that preferred name directly, so they ignore
the reader-visible narrative name even after its reveal.

The product needs familiar classical labels for exact matched bright stars and one
consistent rule for narrative naming without changing astronomical identity or
leaking later book knowledge.

## Decision

Add VizieR catalogue `IV/27A`, the HD-DM-GC-HR-HIP-Bayer-Flamsteed Cross Index
(Kostjuk, 2002), as a narrowly scoped stellar-name presentation authority:

- catalogue: `IV/27A`;
- primary table: `IV/27A/catalog`;
- acquisition service: VizieR TAP at
  `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`; and
- service DOI: <https://doi.org/10.26093/cds/vizier>.

The pinned import records the exact ADQL, projected columns, endpoint, retrieval
timestamp, row count, acknowledgement, and SHA-256 checksum. Only the explicit
operator-run refresh accesses the network. Validation, generation, tests, builds,
and the browser use committed static data.

This source has the following authority and limits:

1. It may supply Bayer and Flamsteed designations and their retained cross-index
   identifiers for an accepted astronomy component.
2. It does not control application inclusion, system/component identity, physical
   membership, canonical geometry, distance, coordinate frame, coverage, stellar
   classification, or visual properties. ADR-0011 and ADR-0012 retain those roles.
3. An automatic match requires one exact compatible typed identifier unique on both
   source rows. HIP is the preferred join for this source. HD may be used only when
   both sides retain an exact typed HD identifier with compatible component scope.
4. Coordinates may audit a proposed match but may not establish identity. Missing,
   duplicate, ambiguous, or scope-incompatible identifiers create no accepted edge;
   validation fails if any such edge is claimed. Contradictory accepted identifiers
   fail validation rather than falling back to position or text similarity.
5. Source Bayer abbreviations and constellation codes are transformed into one
   documented deterministic Latin-script display form. Greek-letter and single
   Latin-letter ordinals remain significant. Flamsteed numbers remain decimal
   integers. The project retains the source fields so a formatted designation is
   auditable.
6. A matched name attaches to the existing catalogue-independent component and
   system identity. It never allocates, merges, splits, redirects, or repositions an
   object.

Astronomy system preferred-name precedence is:

1. an existing accepted reviewed proper or common name;
2. an exact accepted Bayer designation;
3. an exact accepted Flamsteed designation; then
4. the existing reviewed or generated GJ, HIP, Gaia, or CNS5 fallback.

An earlier preferred name displaced by this precedence remains a searchable
alternate. Existing accepted aliases and retained component identifiers also remain
searchable. Bayer and Flamsteed designations are historical alphanumeric
designations, not IAU proper names.

Reader-visible narrative naming is a separate runtime presentation layer over the
static astronomy catalogue:

1. For the current reader-safe projected world, a root narrative `star_system` with
   an `astronomy_object_id` supplies that system's effective application display
   name.
2. The visible narrative name overrides the astronomy preferred name throughout map
   captions, hover and selection text, distance labels, breadcrumbs, browser and
   search results, inspector headings, and guided system view.
3. Before that narrative entity is reader-visible, the application uses the
   astronomy preferred name. Hidden future narrative names do not enter labels,
   aliases, or search.
4. The underlying astronomy preferred name, alternates, identifiers, and provenance
   remain inspectable and searchable after override.
5. Stable IDs continue to own selection, focus, measurement, mapping, and system
   entry. Display strings never become identity keys.
6. Multiple visible root narrative locations mapping different names to one
   astronomy system are an ambiguity and fail projection. Exact duplicate visible
   names may collapse to one display value.

## Consequences

- Bright exact-matched systems can use familiar Bayer or Flamsteed labels without
  weakening the established astronomy graph or geometry.
- `Beta Hydri` and `Delta Eridani` can replace `GJ 19` and `GJ 150` as astronomy
  preferred names through exact HIP cross-index matches while retaining the GJ names
  as aliases.
- Narrative names become consistent across application surfaces and remain tied to
  selected reader progress.
- The astronomy pipeline gains one additional pinned source, schema, provenance,
  attribution, refresh, and offline-validation contract.
- Presentation code needs an explicit reader-safe system-name projection instead of
  reading the static astronomy `name` directly everywhere.
- Source and narrative name conflicts stop with diagnostics rather than being hidden
  by source-order or iteration-order selection.

## Alternatives considered

1. SIMBAD was rejected as the pinned authority because it is a continuously evolving
   cross-identification database rather than a published catalogue snapshot. It
   remains useful for research and review but is not needed for this deterministic
   source role.
2. Manual per-system review overrides alone were rejected because they fix known
   examples without systematically improving other exact-matched bright systems or
   recording a reusable source contract.
3. Importing classical designations only as aliases was rejected because it would
   preserve technical GJ/HIP/Gaia labels as the default presentation.
4. Applying narrative names only on the 3D map was rejected because browser,
   inspector, breadcrumb, and system-view surfaces would disagree about the selected
   object's name.
5. Applying the complete future narrative corpus regardless of reader progress was
   rejected because it would violate the reader-order spoiler boundary.
6. Rewriting committed astronomy names at runtime was rejected because narrative
   state is progress-dependent and must not mutate static catalogue authority.

## Follow-up

BOB-20260801-MR10R3 implements the pinned `IV/27A` source, exact matching and naming
precedence, generated artifacts, reader-visible runtime name projection, regression
coverage, attribution, and integrated documentation. `docs/technical-design.md` and
`docs/data/astronomy-pipeline.md` must incorporate this accepted decision.
