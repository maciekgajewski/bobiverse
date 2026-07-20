from __future__ import annotations

import math
from typing import Any

import astropy.units as u
from astropy.coordinates import ICRS, SkyCoord

from common import GENERATED_PATH, REVIEW_PATH, SNAPSHOT_PATH, read_json, write_json


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


def component(record: dict[str, Any]) -> dict[str, Any]:
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
    }


def main() -> None:
    review = read_json(REVIEW_PATH)
    snapshot = read_json(SNAPSHOT_PATH)
    records = snapshot["records"]
    systems: list[dict[str, Any]] = [
        {
            "id": "sol",
            "name": "Sol",
            "alternates": ["Sun"],
            "position_pc": {"xg": 0.0, "yg": 0.0, "zg": 0.0},
            "render_position": {"x": 0.0, "y": 0.0, "z": -0.0},
            "distance_from_sol_pc": 0.0,
            "distance_uncertainty_pc": 0.0,
            "components": [],
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
                "components": [component(record) for record in matches],
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
