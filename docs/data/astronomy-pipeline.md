# Astronomy data pipeline

## Runtime boundary

The browser imports `src/data/nearby-systems.json` at build time. It makes no
catalogue request. Runtime schema version `2.0.0` stores Sun-centred Galactic
Cartesian coordinates in parsecs and the explicit render mapping
`scene.x=Xg; scene.y=Zg; scene.z=-Yg`.

`data/config/map-display.json` is the only production owner of the context radius.
Its schema is `data/schema/map-display.schema.json`; the default is exactly `20`
light-years. Generation, independent validation, runtime validation, tests, and later
context filtering consume that record rather than duplicating the radius.

## Source contract

ADR-0010 makes Gaia Data Release 3 table `gaiadr3.gaia_source` the sole active
external astronomy catalogue. A Gaia record is source-available to this application
when it has:

- a five- or six-parameter solution (`astrometric_params_solved` 31 or 95);
- finite right ascension, declination, positive parallax, and parallax uncertainty;
- `parallax_over_error >= 10`;
- `visibility_periods_used >= 8`; and
- `ruwe < 1.4`.

Completeness is relative to that explicit contract. It does not claim that Gaia
observes every physical star or resolves every component. Gaia DR3 documents a
parallax bias and other limitations; the map uses nominal published astrometry
without pretending that the result is a precision stellar census.

References:

- Gaia DR3 archive documentation:
  <https://gea.esac.esa.int/archive/documentation/GDR3/>
- Gaia DR3 source-table model:
  <https://gea.esac.esa.int/archive/documentation/GDR3/Gaia_archive/chap_datamodel/sec_dm_main_source_catalogue/ssec_dm_gaia_source.html>
- Gaia Archive and data-use guidance:
  <https://www.cosmos.esa.int/web/gaia-users/archive>
- Gaia Collaboration et al. (2023), *Gaia Data Release 3: Summary of the
  content and survey properties*, A&A 674, A1,
  <https://doi.org/10.1051/0004-6361/202243940>

Required acknowledgement:

> This work has made use of data from the European Space Agency (ESA) mission Gaia
> (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing and
> Analysis Consortium (DPAC,
> https://www.cosmos.esa.int/web/gaia/dpac/consortium).

The acknowledgement is retained in the pinned metadata and displayed by the
application. Public use must retain it and the release citation.

## Acquisition and pinned inputs

Network acquisition is an explicit operator action:

```bash
npm run data:refresh
```

The refresh script inventories `astronomy_object_id` values in the complete canonical
narrative corpus. Sol needs no catalogue anchor. Every other mapped anchor must have
a reviewed Gaia source in `data/source/system-review.json`; otherwise acquisition
fails.

For each anchor, the script submits a deterministic ADQL query to the official ESA
Gaia TAP service. It uses a conservative angular and parallax envelope with a small
numeric margin. The exact three-dimensional inclusion test is deliberately left to
the offline generator.
Overlapping query results deduplicate by Gaia `source_id`.

The committed acquisition artifacts are:

- `data/source/gaia-dr3-neighbourhood.csv`: normalized raw query rows, sorted by
  numeric Gaia source ID;
- `data/source/gaia-dr3-neighbourhood.json`: release, archive endpoint,
  acknowledgement, quality contract, exact ADQL per anchor, retrieval timestamp, row
  count, and raw-file SHA-256; and
- `data/source/system-review.json`: project-owned stable names and explicit
  multi-source system membership.

Review the query, release, checksum, row count, system-membership changes, and
generated diff before committing a refresh. A future Gaia release requires an
explicit identifier review because Gaia source IDs are release-scoped.

## Generation and system identity

Run generation from committed inputs:

```bash
npm run data:generate
```

Astropy converts each adopted ICRS position to the canonical Sun-centred Galactic
Cartesian frame. The generator computes nominal Euclidean distance from each mapped
anchor, emits the deduplicated union inside the configured radius, and records a
coverage proof per anchor.

One map node remains one stellar system. An ungrouped Gaia source is conservatively a
one-component system with application ID `gaia-dr3-<source_id>`. The review record may
group multiple qualifying Gaia IDs and supply a stable application ID, preferred
name, alternate designations, and the adopted astrometric component. Review never
imports astrometry from another catalogue.

## Approximate marker presentation

Gaia `bp_rp` selects a coarse colour family:

| `bp_rp` range | Family     |
| ------------- | ---------- |
| `< 0`         | blue       |
| `< 0.5`       | blue-white |
| `< 0.8`       | white      |
| `< 1.2`       | yellow     |
| `< 1.8`       | orange     |
| otherwise     | red        |
| missing       | neutral    |

Every catalogue component uses a fixed `0.09` map-space glyph radius. These are
orientation cues, not MK spectral classes, calibrated temperatures, or physical
stellar radii. Missing photometry never causes a qualifying Gaia record to disappear.
Reviewed multi-source offsets remain deterministic decoration and never affect system
position, focus, labels, or measurements.

## Independent validation

Run:

```bash
npm run data:validate
```

Validation:

- checks both JSON schemas;
- verifies the pinned Gaia source identity, quality contract, exact per-anchor ADQL,
  raw-file path, checksum, row count, normalized columns, and numeric source-ID order;
- independently enforces the astrometry-quality contract;
- independently repeats the Astropy coordinate transformation;
- reconstructs reviewed system membership;
- inventories canonical mapped anchors;
- proves that generated systems and Gaia component IDs exactly equal the
  source-available union inside the configured radius;
- compares every emitted component and system-provenance field to the raw Gaia and
  review records;
- independently recomputes nominal distance, uncertainty, each coverage count and
  anchor position, canonical-to-scene mapping, ordering, uniqueness, and approximate
  colour derivation; and
- fails above 2,000 system nodes or 5 MiB of runtime JSON.

The 2026-07-26 pinned Sol snapshot contains 73 qualifying Gaia records. Reviewed
membership produces 70 non-Sol system nodes plus Sol. The runtime JSON is comfortably
inside both budgets.

Ordinary `npm run build`, `npm run test`, and browser runtime do not access the Gaia
Archive. Refresh is never implicit.
