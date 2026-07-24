from __future__ import annotations

import argparse
import math
from typing import Any

import astropy.units as u
from astropy.coordinates import ICRS, SkyCoord

from common import (
    GENERATED_PATH,
    REVIEW_PATH,
    SNAPSHOT_PATH,
    VISUAL_PROPERTIES_PATH,
    read_json,
    write_json,
)


def finite(value: float | None, label: str) -> float:
    if value is None or not math.isfinite(value):
        raise ValueError(f"Missing or non-finite {label}")
    return value


def canonical_position(record: dict[str, Any]) -> dict[str, float]:
    parallax_mas = finite(record["parallax_mas"], "parallax")
    coordinate = SkyCoord(
        ra=finite(record["ra_deg"], "right ascension") * u.deg,
        dec=finite(record["dec_deg"], "declination") * u.deg,
        distance=(1000 / parallax_mas) * u.pc,
        frame=ICRS(),
    ).galactic.cartesian
    return {
        "xg": round(coordinate.x.to_value(u.pc), 12),
        "yg": round(coordinate.y.to_value(u.pc), 12),
        "zg": round(coordinate.z.to_value(u.pc), 12),
    }


def distance(position: dict[str, float]) -> float:
    return round(math.sqrt(sum(value**2 for value in position.values())), 12)


def component(record: dict[str, Any], visual: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": f"cns5:{record['cns5_id']}",
        "cns5_id": record["cns5_id"],
        "gj": record["gj"],
        "component": record["component"],
        "gaia_dr3_id": record["gaia_dr3_id"],
        "hip_id": record["hip_id"],
        "icrs": {
            "ra_deg": record["ra_deg"],
            "dec_deg": record["dec_deg"],
            "epoch_year": record["epoch_year"],
            "parallax_mas": record["parallax_mas"],
            "parallax_error_mas": record["parallax_error_mas"],
            "position_bibcode": record["position_bibcode"],
            "parallax_bibcode": record["parallax_bibcode"],
        },
        "g_magnitude": record["g_magnitude"],
        "visual": {
            "spectral_class": visual["spectral_class"],
            "radius_solar": visual["radius_solar"],
            "provenance": {
                "spectral_class": visual["spectral_class_provenance"],
                "radius": visual["radius_provenance"],
            },
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate the nearby-star runtime dataset from reviewed source snapshots."
    )
    parser.parse_args()
    review = read_json(REVIEW_PATH)
    snapshot = read_json(SNAPSHOT_PATH)
    visual_snapshot = read_json(VISUAL_PROPERTIES_PATH)
    records = snapshot["records"]
    visual_by_cns5_id = {
        visual["cns5_id"]: visual for visual in visual_snapshot["components"]
    }
    source_ids = {record["cns5_id"] for record in records}
    if source_ids != set(visual_by_cns5_id):
        missing = sorted(source_ids - set(visual_by_cns5_id))
        unexpected = sorted(set(visual_by_cns5_id) - source_ids)
        raise ValueError(
            "Component visual-property snapshot must exactly match CNS5 records: "
            f"missing={missing}, unexpected={unexpected}"
        )
    systems: list[dict[str, Any]] = [
        {
            "id": "sol",
            "name": "Sol",
            "alternates": ["Sun"],
            "position_pc": {"xg": 0.0, "yg": 0.0, "zg": 0.0},
            "render_position": {"x": 0.0, "y": 0.0, "z": -0.0},
            "distance_from_sol_pc": 0.0,
            "distance_uncertainty_pc": 0.0,
            "components": [
                {
                    "id": "solar:sol",
                    "cns5_id": 0,
                    "gj": None,
                    "component": None,
                    "gaia_dr3_id": None,
                    "hip_id": None,
                    "g_magnitude": None,
                    "icrs": {
                        "ra_deg": None,
                        "dec_deg": None,
                        "epoch_year": None,
                        "parallax_mas": None,
                        "parallax_error_mas": None,
                        "position_bibcode": None,
                        "parallax_bibcode": None,
                    },
                    "visual": {
                        "spectral_class": "G2V",
                        "radius_solar": 1.0,
                        "provenance": {
                            "spectral_class": {
                                "catalogue": "IAU conventional solar classification",
                                "record_id": "Sol",
                            },
                            "radius": {
                                "catalogue": "IAU nominal solar radius",
                                "record_id": "R_sun",
                                "reference": "IAU 2015 Resolution B3",
                            },
                        },
                    },
                }
            ],
            "provenance": {"catalogue": "IAU conventional solar origin", "source_object_ids": []},
        }
    ]

    for review_system in review["systems"]:
        matches = [record for record in records if record["gj"] in review_system["gj_selectors"]]
        adopted = next((record for record in matches if record["gj"] == review_system["adopt_gj"]), None)
        if adopted is None:
            raise ValueError(f"No adopted CNS5 record for {review_system['id']}")
        position = canonical_position(adopted)
        parallax_mas = finite(adopted["parallax_mas"], "parallax")
        parallax_error_mas = adopted["parallax_error_mas"]
        uncertainty = None if parallax_error_mas is None else round(1000 * parallax_error_mas / parallax_mas**2, 12)
        systems.append(
            {
                "id": review_system["id"],
                "name": review_system["name"],
                "alternates": review_system["alternates"],
                "position_pc": position,
                "render_position": {"x": position["xg"], "y": position["zg"], "z": -position["yg"]},
                "distance_from_sol_pc": distance(position),
                "distance_uncertainty_pc": uncertainty,
                "components": [
                    component(record, visual_by_cns5_id[record["cns5_id"]])
                    for record in matches
                ],
                "provenance": {
                    "catalogue": snapshot["source"]["catalogue"],
                    "release": snapshot["source"]["release"],
                    "source_object_ids": [f"cns5:{record['cns5_id']}" for record in matches],
                    "adopted_source_object_id": f"cns5:{adopted['cns5_id']}",
                    "transformation": "Astropy ICRS to Galactic Cartesian; Sun-centered; pc",
                    "review_version": review["review_version"],
                },
            }
        )

    systems.sort(key=lambda system: system["distance_from_sol_pc"])
    output = {
        "schema_version": "1.0.0",
        "metadata": {
            "source": {
                "catalogue": snapshot["source"]["catalogue"],
                "release": snapshot["source"]["release"],
                "acknowledgement": snapshot["source"]["acknowledgement"],
            },
            "generated_at": snapshot["source"]["retrieved_at"],
            "coordinate_frame": "Sun-centered Galactic Cartesian",
            "units": "pc",
            "render_mapping": "scene.x=Xg; scene.y=Zg; scene.z=-Yg",
        },
        "systems": systems,
    }
    write_json(GENERATED_PATH, output)
    print(f"Wrote {len(systems)} system markers to {GENERATED_PATH.relative_to(GENERATED_PATH.parent.parent)}")


if __name__ == "__main__":
    main()
