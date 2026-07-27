from __future__ import annotations

import argparse
import csv
import math
from typing import Any

import astropy.units as u
from astropy.coordinates import ICRS, SkyCoord

from common import (
    CONFIG_PATH,
    GENERATED_PATH,
    LIGHT_YEARS_PER_PARSEC,
    RAW_SNAPSHOT_PATH,
    REVIEW_PATH,
    SNAPSHOT_PATH,
    mapped_anchor_ids,
    read_json,
    write_json,
)

MARKER_RADIUS = 0.09


def finite(value: float | None, label: str) -> float:
    if value is None or not math.isfinite(value):
        raise ValueError(f"Missing or non-finite {label}")
    return value


def optional_float(value: str) -> float | None:
    return None if value == "" else float(value)


def read_rows() -> list[dict[str, Any]]:
    with RAW_SNAPSHOT_PATH.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    return [
        {
            "source_id": row["source_id"],
            "designation": row["designation"],
            "ref_epoch": float(row["ref_epoch"]),
            "ra": float(row["ra"]),
            "dec": float(row["dec"]),
            "parallax": float(row["parallax"]),
            "parallax_error": float(row["parallax_error"]),
            "parallax_over_error": float(row["parallax_over_error"]),
            "astrometric_params_solved": int(row["astrometric_params_solved"]),
            "visibility_periods_used": int(row["visibility_periods_used"]),
            "ruwe": float(row["ruwe"]),
            "phot_g_mean_mag": optional_float(row["phot_g_mean_mag"]),
            "bp_rp": optional_float(row["bp_rp"]),
        }
        for row in rows
    ]


def canonical_position(record: dict[str, Any]) -> dict[str, float]:
    parallax_mas = finite(record["parallax"], "parallax")
    coordinate = SkyCoord(
        ra=finite(record["ra"], "right ascension") * u.deg,
        dec=finite(record["dec"], "declination") * u.deg,
        distance=(1000 / parallax_mas) * u.pc,
        frame=ICRS(),
    ).galactic.cartesian
    return {
        "xg": round(coordinate.x.to_value(u.pc), 12),
        "yg": round(coordinate.y.to_value(u.pc), 12),
        "zg": round(coordinate.z.to_value(u.pc), 12),
    }


def distance_between(
    first: dict[str, float], second: dict[str, float]
) -> float:
    return math.sqrt(
        sum((first[axis] - second[axis]) ** 2 for axis in ("xg", "yg", "zg"))
    )


def color_family(bp_rp: float | None) -> str:
    if bp_rp is None:
        return "neutral"
    if bp_rp < 0:
        return "blue"
    if bp_rp < 0.5:
        return "blue-white"
    if bp_rp < 0.8:
        return "white"
    if bp_rp < 1.2:
        return "yellow"
    if bp_rp < 1.8:
        return "orange"
    return "red"


def component(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"gaia-dr3:{record['source_id']}",
        "gaia_source_id": record["source_id"],
        "designation": record["designation"],
        "icrs": {
            "ra_deg": record["ra"],
            "dec_deg": record["dec"],
            "epoch_year": record["ref_epoch"],
            "parallax_mas": record["parallax"],
            "parallax_error_mas": record["parallax_error"],
        },
        "astrometry_quality": {
            "parallax_over_error": record["parallax_over_error"],
            "visibility_periods_used": record["visibility_periods_used"],
            "ruwe": record["ruwe"],
        },
        "photometry": {
            "g_magnitude": record["phot_g_mean_mag"],
            "bp_rp": record["bp_rp"],
        },
        "visual": {
            "color_family": color_family(record["bp_rp"]),
            "marker_radius": MARKER_RADIUS,
            "derivation": "Gaia DR3 bp_rp fixed bands; neutral when unavailable",
        },
    }


def candidate_systems(
    records: list[dict[str, Any]], review: dict[str, Any], release: str
) -> list[dict[str, Any]]:
    records_by_id = {record["source_id"]: record for record in records}
    claimed_ids: set[str] = set()
    systems: list[dict[str, Any]] = []

    for reviewed in review["systems"]:
        source_ids = reviewed["gaia_source_ids"]
        duplicate_claims = claimed_ids.intersection(source_ids)
        if duplicate_claims:
            raise ValueError(
                f"Gaia source IDs appear in multiple reviewed systems: {sorted(duplicate_claims)}"
            )
        matches = [
            records_by_id[source_id]
            for source_id in source_ids
            if source_id in records_by_id
        ]
        if not matches:
            continue
        missing = sorted(set(source_ids) - records_by_id.keys())
        if missing:
            raise ValueError(
                f"Reviewed system {reviewed['id']} is partially absent from the Gaia snapshot: {missing}"
            )
        adopted_id = reviewed["adopt_gaia_source_id"]
        if adopted_id not in source_ids:
            raise ValueError(
                f"Reviewed system {reviewed['id']} adopts an unlisted Gaia source"
            )
        adopted = records_by_id[adopted_id]
        position = canonical_position(adopted)
        parallax = finite(adopted["parallax"], "parallax")
        uncertainty = round(
            1000 * adopted["parallax_error"] / parallax**2, 12
        )
        systems.append(
            {
                "id": reviewed["id"],
                "name": reviewed["name"],
                "alternates": [
                    *reviewed["alternates"],
                    *[
                        record["designation"]
                        for record in matches
                        if record["designation"] not in reviewed["alternates"]
                    ],
                ],
                "position_pc": position,
                "render_position": {
                    "x": position["xg"],
                    "y": position["zg"],
                    "z": -position["yg"],
                },
                "distance_from_sol_pc": round(
                    distance_between(position, {"xg": 0, "yg": 0, "zg": 0}),
                    12,
                ),
                "distance_uncertainty_pc": uncertainty,
                "components": [component(record) for record in matches],
                "provenance": {
                    "catalogue": "Gaia DR3 gaiadr3.gaia_source",
                    "release": release,
                    "source_object_ids": source_ids,
                    "adopted_source_object_id": adopted_id,
                    "transformation": "Astropy ICRS to Galactic Cartesian; Sun-centered; pc",
                    "review_version": review["review_version"],
                },
            }
        )
        claimed_ids.update(source_ids)

    for record in records:
        if record["source_id"] in claimed_ids:
            continue
        position = canonical_position(record)
        parallax = finite(record["parallax"], "parallax")
        source_id = record["source_id"]
        systems.append(
            {
                "id": f"gaia-dr3-{source_id}",
                "name": record["designation"],
                "alternates": [],
                "position_pc": position,
                "render_position": {
                    "x": position["xg"],
                    "y": position["zg"],
                    "z": -position["yg"],
                },
                "distance_from_sol_pc": round(
                    distance_between(position, {"xg": 0, "yg": 0, "zg": 0}),
                    12,
                ),
                "distance_uncertainty_pc": round(
                    1000 * record["parallax_error"] / parallax**2, 12
                ),
                "components": [component(record)],
                "provenance": {
                    "catalogue": "Gaia DR3 gaiadr3.gaia_source",
                    "release": release,
                    "source_object_ids": [source_id],
                    "adopted_source_object_id": source_id,
                    "transformation": "Astropy ICRS to Galactic Cartesian; Sun-centered; pc",
                    "review_version": review["review_version"],
                },
            }
        )
    return systems


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate the static Gaia neighbourhood runtime dataset."
    )
    parser.parse_args()

    config = read_json(CONFIG_PATH)
    review = read_json(REVIEW_PATH)
    snapshot = read_json(SNAPSHOT_PATH)
    records = read_rows()
    radius_ly = float(config["context_radius_ly"])
    radius_pc = radius_ly / LIGHT_YEARS_PER_PARSEC
    candidates = candidate_systems(
        records, review, snapshot["source"]["release"]
    )
    candidates_by_id = {system["id"]: system for system in candidates}
    anchor_positions: dict[str, dict[str, float]] = {
        "sol": {"xg": 0.0, "yg": 0.0, "zg": 0.0}
    }
    for anchor_id in mapped_anchor_ids():
        if anchor_id == "sol":
            continue
        anchor = candidates_by_id.get(anchor_id)
        if anchor is None:
            raise ValueError(
                f"Mapped astronomy anchor is absent from Gaia candidates: {anchor_id}"
            )
        anchor_positions[anchor_id] = anchor["position_pc"]

    included = [
        system
        for system in candidates
        if any(
            distance_between(system["position_pc"], anchor_position)
            <= radius_pc + 1e-12
            for anchor_position in anchor_positions.values()
        )
    ]
    included.sort(
        key=lambda system: (system["distance_from_sol_pc"], system["id"])
    )
    sol = {
        "id": "sol",
        "name": "Sol",
        "alternates": ["Sun"],
        "position_pc": {"xg": 0.0, "yg": 0.0, "zg": 0.0},
        "render_position": {"x": 0.0, "y": 0.0, "z": 0.0},
        "distance_from_sol_pc": 0.0,
        "distance_uncertainty_pc": 0.0,
        "components": [
            {
                "id": "generated:sol",
                "gaia_source_id": None,
                "designation": "Sol",
                "icrs": {
                    "ra_deg": None,
                    "dec_deg": None,
                    "epoch_year": None,
                    "parallax_mas": None,
                    "parallax_error_mas": None,
                },
                "astrometry_quality": {
                    "parallax_over_error": None,
                    "visibility_periods_used": None,
                    "ruwe": None,
                },
                "photometry": {"g_magnitude": None, "bp_rp": None},
                "visual": {
                    "color_family": "yellow",
                    "marker_radius": MARKER_RADIUS,
                    "derivation": "generated Sol origin",
                },
            }
        ],
        "provenance": {
            "catalogue": "Generated canonical origin",
            "source_object_ids": [],
        },
    }
    systems = [sol, *included]
    coverage = []
    for anchor_id, anchor_position in sorted(anchor_positions.items()):
        covered = [
            system
            for system in included
            if distance_between(system["position_pc"], anchor_position)
            <= radius_pc + 1e-12
        ]
        coverage.append(
            {
                "anchor_id": anchor_id,
                "anchor_position_pc": anchor_position,
                "radius_ly": radius_ly,
                "system_count": len(covered),
                "source_record_count": sum(
                    len(system["components"]) for system in covered
                ),
            }
        )

    output = {
        "schema_version": "2.0.0",
        "metadata": {
            "source": {
                **snapshot["source"],
                "snapshot_sha256": snapshot["raw_snapshot"]["sha256"],
            },
            "generated_at": snapshot["source"]["retrieved_at"],
            "coordinate_frame": "Sun-centered Galactic Cartesian",
            "units": "pc",
            "render_mapping": "scene.x=Xg; scene.y=Zg; scene.z=-Yg",
            "configuration": {"context_radius_ly": radius_ly},
            "coverage": coverage,
        },
        "systems": systems,
    }
    write_json(GENERATED_PATH, output)
    print(
        f"Wrote {len(systems)} system markers from {len(records)} Gaia DR3 records "
        f"to {GENERATED_PATH.relative_to(GENERATED_PATH.parent.parent)}"
    )


if __name__ == "__main__":
    main()
