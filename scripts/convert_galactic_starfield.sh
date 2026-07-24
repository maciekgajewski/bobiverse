#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage: convert_galactic_starfield.sh

Convert the verified downloaded NASA galactic-starfield source asset into the
runtime AVIF asset. See the script comments for the required source download.
EOF
  exit 0
fi

# BOB-005 is an explicit operator action. Download the source first with:
# curl -L --fail --show-error --output source-assets/galactic-starfield/milkyway_2020_4k_gal.exr \
#   https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k_gal.exr

readonly source_asset="source-assets/galactic-starfield/milkyway_2020_4k_gal.exr"
readonly output_asset="src/assets/galactic-starfield.avif"
readonly expected_source_sha256="fad63b36aa632c691d521cd9d8b828de9d29b4c2784276eec44e54c6cb159a49"

test -f "$source_asset"
printf '%s  %s\n' "$expected_source_sha256" "$source_asset" | sha256sum --check --strict

ffmpeg -hide_banner -y -i "$source_asset" \
  -vf "zscale=transfer=linear,tonemap=mobius:param=0.18,zscale=transfer=iec61966-2-1,scale=2048:1024:flags=lanczos" \
  -frames:v 1 -c:v libaom-av1 -still-picture 1 -crf 32 -cpu-used 8 \
  -pix_fmt yuv420p "$output_asset"

sha256sum "$output_asset"
