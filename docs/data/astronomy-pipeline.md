# Astronomy data pipeline

## Runtime boundary

The browser imports `src/data/nearby-systems.json` at build time. It makes no
catalogue or astronomy API request. The data is schema version `1.0.0`, uses
Sun-centered Galactic Cartesian coordinates in parsecs, and carries the explicit
render mapping `scene.x=Xg; scene.y=Zg; scene.z=-Yg`.

`data/source/cns5-nearest-components.json` is the committed, filtered CNS5 input
snapshot. It retains the selected raw astrometry, source identifiers, source URL,
retrieval timestamp, full-download SHA-256, and catalogue acknowledgement.
`data/source/system-review.json` is the deliberate system/component grouping layer.
One reviewed record is adopted per interstellar system marker; components remain
references within that marker and are not rendered as separate interstellar nodes.
`data/source/component-visual-properties.json` is a separate, reviewed component-level
visual-properties snapshot. Every CNS5 component has an adopted physical radius in
solar radii, an MK spectral class, stable join evidence, and property-level source
provenance. TIC v8.2 and SIMBAD are preferred sources where they identify a component
separately; close binaries, white dwarfs, and other catalogue gaps retain their
component-specific literature source. Sol is an explicit generated G2V, 1 R_sun
component with IAU reference provenance.

Visual properties control only camera-facing marker glyphs. Radius is transformed
through the fixed, bounded square-root mapping in `src/domain/star-visual.ts`:
0.01–3 R_sun maps to a 0.065–0.16 map-space glyph radius. Multi-star offsets are
deterministic decoration around the canonical system point, with a radial range of
0.018–0.0288 map units and vertical range capped at 0.0108. They are not orbital data
and never contribute to coordinates, focus, labels, or measurement.

## Source and acknowledgement

The source is the published Fifth Catalogue of Nearby Stars (CNS5), VizieR catalogue
`J/A+A/670/A19`, corrected 13 December 2023:

- Catalogue: <https://cdsarc.cds.unistra.fr/ftp/J/A+A/670/A19/cns5.dat>
- Catalogue documentation: <https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/J/A+A/670/A19?format=html>
- Paper: Golovin et al. (2023), A&A 670, A19, doi:10.1051/0004-6361/202244250

Required acknowledgement: “This project uses the VizieR catalogue access tool, CDS,
Strasbourg, France (DOI: 10.26093/cds/vizier).”

## Component visual-property sources

The reviewed component-properties snapshot is pinned alongside CNS5 rather than
queried by the application. Its preferred catalogue inputs are:

- TIC v8.2 radius data: <https://mast.stsci.edu/api/v0/_t_i_cfields.html>
- SIMBAD MK spectral types: <https://simbad.cds.unistra.fr/Pages/guide/chD.htx>

The snapshot records the exact source identifier and any component-specific literature
reference with each property. This is necessary because target catalogues can merge or
omit close binaries and white dwarfs, whereas the map deliberately renders reviewed
CNS5 components as separate decorative orbs.

## Refreshing data

Refreshing is an explicit reviewed operation. It accesses the network and must not be
part of ordinary builds.

```bash
npm run data:refresh
npm run data:generate
npm run data:validate
```

Review the resulting snapshot checksum, component membership, adopted source record,
system ranking, and generated JSON diff before committing. To regenerate from an
already retrieved full CNS5 file without another network fetch:

```bash
npm run data:refresh -- --source-file /path/to/cns5.dat
```

The importer uses Astropy's ICRS-to-Galactic transform. Application code must not
reimplement that astronomy conversion. `data:validate` rejects schema-version
mismatches, non-finite values, duplicate systems/components, invalid render mapping,
or any count other than Sol plus 20 non-Sol systems. It also rejects a component with
a missing, non-positive, or non-finite visual radius, or missing source provenance for
either radius or spectral class. The component-properties snapshot is edited only as a
reviewed, cited source-data change; ordinary `data:refresh` does not replace it.
