# Galactic starfield backdrop provenance

## Source and local assets

- Source title: NASA/Goddard Space Flight Center Scientific Visualization Studio,
  [Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851/).
- Exact source asset:
  [`milkyway_2020_4k_gal.exr`](../../source-assets/galactic-starfield/milkyway_2020_4k_gal.exr),
  <https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k_gal.exr>.
- Retrieved: 2026-07-23.
- Source dimensions and format: 4096 × 2048, OpenEXR half-float RGB, linear
  transfer.
- Source SHA-256:
  `fad63b36aa632c691d521cd9d8b828de9d29b4c2784276eec44e54c6cb159a49`.
- Derived browser asset:
  [`src/assets/galactic-starfield.avif`](../../src/assets/galactic-starfield.avif),
  2048 × 1024 AVIF (AV1, yuv420p, sRGB transfer).
- Derived SHA-256:
  `58faaa20b673ff0fb9fbe50c21b2d41a207f0261576c795247a729ad0cb7cbfc`.

The source asset is retained under `source-assets/` for reproducibility but is not
referenced by application code and therefore is not included in the browser build.
The browser loads only the one derived local AVIF; it never requests NASA, ESA,
Gaia, Spitzer, or another third-party image host at runtime.

## Conversion

Run this explicit, offline conversion from the repository root after confirming that
the recorded source hash still matches:

```bash
./scripts/convert_galactic_starfield.sh
```

The command requires FFmpeg 8.0.1 with `libaom-av1` (the recorded operator version
is `ffmpeg version 8.0.1-3ubuntu2`). It applies a Mobius tone map (`param=0.18`) to
the linear EXR, converts it to the sRGB transfer curve, reduces it to 2048 × 1024
with Lanczos filtering, and encodes one AVIF image with `libaom-av1`, CRF 32,
`cpu-used=8`, and yuv420p. Re-running it from the retained source with this tool
version recreates the committed output hash. A different tool version is a deliberate
provenance deviation and must be recorded here with its new output hash.

The source page was reviewed on retrieval. It identifies this Galactic background as
the version omitting bright Hipparcos and Tycho foreground stars, states that the
Galactic images were corrected on 2021-01-04, and does not identify this asset as
copyright-protected third-party material. If a future source-page review marks the
asset as third-party copyrighted, stop use and obtain permission from that rights
holder before updating it.

## Coordinate and display contract

The source is a plate carrée equirectangular Galactic map, centred at `(l, b) =
(0°, 0°)` and with longitude increasing to image left. The dome shader explicitly
maps it into the canonical render frame: Galactic centre is `+scene.x`, Galactic
north is `+scene.y`, and `(l, b) = (90°, 0°)` is `-scene.z`. It translates with the
camera position but does not inherit camera rotation, and it is decorative and
non-raycastable.

## Credit, use, and acknowledgement

Visible application credit (linked to the source page): `Astronomy backdrop: NASA/Goddard Space Flight Center Scientific Visualization Studio, Deep Star Maps 2020; Gaia DR2: ESA/Gaia/DPAC.`

NASA's [Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
state that NASA material may generally be used factually for informational purposes
when NASA is acknowledged and no endorsement is implied. This project uses no NASA,
ESA, or Gaia logos. NASA, ESA, Gaia, and their contributors do not endorse this
project, its content, or any product based on it.

The official [Gaia DR2 credit and citation instructions](https://gea.esac.esa.int/archive/documentation/GDR2/Miscellaneous/sec_credit_and_citation_instructions/)
require this acknowledgement:

> This work has made use of data from the European Space Agency (ESA) mission Gaia
> (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing and
> Analysis Consortium (DPAC,
> https://www.cosmos.esa.int/web/gaia/dpac/consortium). Funding for the DPAC has
> been provided by national institutions, in particular the institutions
> participating in the Gaia Multilateral Agreement.

Requested citations:

1. Gaia Collaboration, Prusti et al. (2016), *The Gaia mission*, *Astronomy &
   Astrophysics* 595, A1, <https://doi.org/10.1051/0004-6361/201629272>.
2. Gaia Collaboration et al. (2018), *Gaia Data Release 2: Summary of the contents
   and survey properties*, *Astronomy & Astrophysics* 616, A1,
   <https://doi.org/10.1051/0004-6361/201833051>.
