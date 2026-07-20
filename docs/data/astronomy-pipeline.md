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

## Source and acknowledgement

The source is the published Fifth Catalogue of Nearby Stars (CNS5), VizieR catalogue
`J/A+A/670/A19`, corrected 13 December 2023:

- Catalogue: <https://cdsarc.cds.unistra.fr/ftp/J/A+A/670/A19/cns5.dat>
- Catalogue documentation: <https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/J/A+A/670/A19?format=html>
- Paper: Golovin et al. (2023), A&A 670, A19, doi:10.1051/0004-6361/202244250

Required acknowledgement: “This project uses the VizieR catalogue access tool, CDS,
Strasbourg, France (DOI: 10.26093/cds/vizier).”

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
or any count other than Sol plus 20 non-Sol systems.
