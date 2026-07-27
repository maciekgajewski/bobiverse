from __future__ import annotations

import argparse
import csv
import math
from typing import Any

import astropy.units as u
from astropy.coordinates import ICRS, SkyCoord
from jsonschema import Draft202012Validator

from common import (
    CONFIG_PATH,
    CONFIG_SCHEMA_PATH,
    GENERATED_PATH,
    LIGHT_YEARS_PER_PARSEC,
    RAW_SNAPSHOT_PATH,
    REVIEW_PATH,
    ROOT,
    SNAPSHOT_PATH,
    mapped_anchor_ids,
    read_json,
    sha256,
)

MAX_SYSTEMS = 2_000
MAX_RUNTIME_BYTES = 5 * 1024 * 1024
EXPECTED_SOURCE = {
    "catalogue": "Gaia DR3 gaiadr3.gaia_source",
    "release": "2022-06-13",
    "archive_url": "https://gea.esac.esa.int/tap-server/tap/sync",
    "documentation_url": "https://gea.esac.esa.int/archive/documentation/GDR3/",
    "acknowledgement": (
        "This work has made use of data from the European Space Agency (ESA) mission "
        "Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing "
        "and Analysis Consortium (DPAC, "
        "https://www.cosmos.esa.int/web/gaia/dpac/consortium)."
    ),
}
EXPECTED_QUALITY_CONTRACT = {
    "astrometric_params_solved": [31, 95],
    "minimum_parallax_over_error": 10,
    "minimum_visibility_periods_used": 8,
    "maximum_ruwe": 1.4,
}
EXPECTED_FIELDNAMES = [
    "source_id",
    "designation",
    "ref_epoch",
    "ra",
    "dec",
    "parallax",
    "parallax_error",
    "parallax_over_error",
    "astrometric_params_solved",
    "visibility_periods_used",
    "ruwe",
    "phot_g_mean_mag",
    "bp_rp",
]
EXPECTED_QUALITY_CLAUSES = [
    "parallax_over_error >= 10",
    "visibility_periods_used >= 8",
    "ruwe < 1.4",
    "astrometric_params_solved IN (31, 95)",
]
QUERY_ENVELOPE_MARGIN = 1e-9


def validate_schema(value: Any, schema_path: Any, label: str) -> None:
    schema = read_json(schema_path)
    errors = sorted(
        Draft202012Validator(schema).iter_errors(value),
        key=lambda error: list(error.path),
    )
    if errors:
        raise ValueError(
            f"{label} schema validation failed:\n"
            + "\n".join(error.message for error in errors)
        )


def optional_float(value: str) -> float | None:
    return None if value == "" else float(value)


def read_source_rows() -> list[dict[str, Any]]:
    with RAW_SNAPSHOT_PATH.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != EXPECTED_FIELDNAMES:
            raise ValueError(
                "Gaia raw snapshot fields do not match the acquisition contract"
            )
        rows = list(reader)
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


def expected_query_text(clauses: list[str]) -> str:
    columns = ", ".join(EXPECTED_FIELDNAMES)
    return "\n".join(
        [
            f"SELECT {columns}",
            "FROM gaiadr3.gaia_source",
            f"WHERE {clauses[0]}",
            *[f"  AND {clause}" for clause in clauses[1:]],
            "ORDER BY source_id",
        ]
    )


def expected_neighbourhood_query(
    radius_ly: float, anchor: dict[str, Any] | None
) -> str:
    radius_pc = radius_ly / LIGHT_YEARS_PER_PARSEC
    if anchor is None:
        minimum_parallax = (1000 / radius_pc) * (1 - QUERY_ENVELOPE_MARGIN)
        return expected_query_text(
            [f"parallax >= {minimum_parallax:.12f}", *EXPECTED_QUALITY_CLAUSES]
        )

    anchor_distance_pc = 1000 / anchor["parallax"]
    minimum_parallax = (
        1000
        / (anchor_distance_pc + radius_pc)
        * (1 - QUERY_ENVELOPE_MARGIN)
    )
    clauses = [f"parallax >= {minimum_parallax:.12f}"]
    if anchor_distance_pc > radius_pc:
        maximum_parallax = (
            1000
            / (anchor_distance_pc - radius_pc)
            * (1 + QUERY_ENVELOPE_MARGIN)
        )
        angular_radius = (
            math.degrees(math.asin(radius_pc / anchor_distance_pc))
            + QUERY_ENVELOPE_MARGIN
        )
        clauses.extend(
            [
                f"parallax <= {maximum_parallax:.12f}",
                (
                    f"DISTANCE({anchor['ra']:.12f}, "
                    f"{anchor['dec']:.12f}, ra, dec) "
                    f"<= {angular_radius:.12f}"
                ),
            ]
        )
    clauses.extend(EXPECTED_QUALITY_CLAUSES)
    return expected_query_text(clauses)


def validate_snapshot_metadata(snapshot: dict[str, Any]) -> None:
    if snapshot.get("schema_version") != "1.0.0":
        raise ValueError("Gaia snapshot metadata has an unsupported schema version")
    if snapshot.get("quality_contract") != EXPECTED_QUALITY_CONTRACT:
        raise ValueError("Gaia snapshot quality contract differs from validation")
    snapshot_source = snapshot.get("source", {})
    if any(
        snapshot_source.get(field) != expected
        for field, expected in EXPECTED_SOURCE.items()
    ):
        raise ValueError("Gaia snapshot source identity differs from validation")
    if (
        snapshot.get("raw_snapshot", {}).get("path")
        != "data/source/gaia-dr3-neighbourhood.csv"
    ):
        raise ValueError("Gaia snapshot metadata points at an unexpected raw file")


def validate_acquisition_queries(
    snapshot: dict[str, Any],
    radius_ly: float,
    records_by_id: dict[str, dict[str, Any]],
    review: dict[str, Any],
    anchors: list[str],
) -> None:
    review_by_id = {system["id"]: system for system in review["systems"]}
    expected_queries = []
    for anchor_id in anchors:
        anchor = None
        if anchor_id != "sol":
            reviewed_anchor = review_by_id.get(anchor_id)
            if reviewed_anchor is None:
                raise ValueError(
                    f"Mapped anchor lacks a Gaia review record: {anchor_id}"
                )
            anchor_source_id = reviewed_anchor["adopt_gaia_source_id"]
            anchor = records_by_id.get(anchor_source_id)
            if anchor is None:
                raise ValueError(
                    f"Mapped anchor source is absent from Gaia snapshot: {anchor_id}"
                )
        expected_queries.append(
            {
                "anchor_id": anchor_id,
                "adql": expected_neighbourhood_query(radius_ly, anchor),
            }
        )
    if snapshot.get("queries") != expected_queries:
        raise ValueError("Gaia acquisition queries do not match mapped narrative anchors")


def canonical_position(record: dict[str, Any]) -> dict[str, float]:
    coordinate = SkyCoord(
        ra=record["ra"] * u.deg,
        dec=record["dec"] * u.deg,
        distance=(1000 / record["parallax"]) * u.pc,
        frame=ICRS(),
    ).galactic.cartesian
    return {
        "xg": coordinate.x.to_value(u.pc),
        "yg": coordinate.y.to_value(u.pc),
        "zg": coordinate.z.to_value(u.pc),
    }


def distance(first: dict[str, float], second: dict[str, float]) -> float:
    return math.sqrt(
        sum((first[axis] - second[axis]) ** 2 for axis in ("xg", "yg", "zg"))
    )


def expected_color_family(bp_rp: float | None) -> str:
    if bp_rp is None:
        return "neutral"
    thresholds = [
        (0, "blue"),
        (0.5, "blue-white"),
        (0.8, "white"),
        (1.2, "yellow"),
        (1.8, "orange"),
    ]
    for maximum, family in thresholds:
        if bp_rp < maximum:
            return family
    return "red"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate Gaia source, coverage, and generated runtime data."
    )
    parser.parse_args()

    config = read_json(CONFIG_PATH)
    document = read_json(GENERATED_PATH)
    snapshot = read_json(SNAPSHOT_PATH)
    review = read_json(REVIEW_PATH)
    validate_schema(config, CONFIG_SCHEMA_PATH, "Map display configuration")
    validate_schema(
        document,
        ROOT / "data" / "schema" / "nearby-systems.schema.json",
        "Nearby systems",
    )

    validate_snapshot_metadata(snapshot)
    if snapshot["raw_snapshot"]["sha256"] != sha256(RAW_SNAPSHOT_PATH):
        raise ValueError("Gaia raw snapshot checksum does not match metadata")
    records = read_source_rows()
    if snapshot["raw_snapshot"]["row_count"] != len(records):
        raise ValueError("Gaia raw snapshot row count does not match metadata")
    source_ids = [record["source_id"] for record in records]
    if len(source_ids) != len(set(source_ids)):
        raise ValueError("Gaia raw snapshot contains duplicate source IDs")
    if source_ids != sorted(source_ids, key=int):
        raise ValueError("Gaia raw snapshot is not normalized by numeric source ID")
    for record in records:
        numeric = [
            record["ra"],
            record["dec"],
            record["parallax"],
            record["parallax_error"],
            record["parallax_over_error"],
            record["ruwe"],
        ]
        if not all(math.isfinite(value) for value in numeric):
            raise ValueError(f"Gaia source {record['source_id']} is non-finite")
        if record["parallax"] <= 0 or record["parallax_error"] <= 0:
            raise ValueError(f"Gaia source {record['source_id']} has invalid parallax")
        if record["astrometric_params_solved"] not in (31, 95):
            raise ValueError(f"Gaia source {record['source_id']} lacks full astrometry")
        if record["parallax_over_error"] < 10:
            raise ValueError(f"Gaia source {record['source_id']} is below signal budget")
        if record["visibility_periods_used"] < 8:
            raise ValueError(f"Gaia source {record['source_id']} has too few periods")
        if record["ruwe"] >= 1.4:
            raise ValueError(f"Gaia source {record['source_id']} exceeds RUWE budget")

    if document["metadata"]["configuration"]["context_radius_ly"] != config[
        "context_radius_ly"
    ]:
        raise ValueError("Runtime context radius differs from the owned configuration")
    expected_runtime_source = {
        **snapshot["source"],
        "snapshot_sha256": sha256(RAW_SNAPSHOT_PATH),
    }
    if document["metadata"]["source"] != expected_runtime_source:
        raise ValueError("Runtime source provenance differs from the pinned snapshot")
    if GENERATED_PATH.stat().st_size > MAX_RUNTIME_BYTES:
        raise ValueError("Runtime astronomy JSON exceeds the 5 MiB budget")

    records_by_id = {record["source_id"]: record for record in records}
    positions_by_id = {
        source_id: canonical_position(record)
        for source_id, record in records_by_id.items()
    }
    review_claims: dict[str, str] = {}
    candidate_systems: dict[str, dict[str, Any]] = {}
    for reviewed in review["systems"]:
        review_ids = reviewed["gaia_source_ids"]
        present = [source_id for source_id in review_ids if source_id in records_by_id]
        if not present:
            continue
        missing = sorted(set(review_ids) - records_by_id.keys())
        if missing:
            raise ValueError(
                f"Reviewed system {reviewed['id']} is partially absent: {missing}"
            )
        for source_id in review_ids:
            if source_id in review_claims:
                raise ValueError(f"Reviewed Gaia source is claimed twice: {source_id}")
            review_claims[source_id] = reviewed["id"]
        adopted_id = reviewed["adopt_gaia_source_id"]
        if adopted_id not in review_ids:
            raise ValueError(f"Reviewed system {reviewed['id']} has invalid adoption")
        candidate_systems[reviewed["id"]] = {
            "position": positions_by_id[adopted_id],
            "source_ids": review_ids,
            "adopted_source_id": adopted_id,
        }
    for source_id in source_ids:
        if source_id in review_claims:
            continue
        candidate_systems[f"gaia-dr3-{source_id}"] = {
            "position": positions_by_id[source_id],
            "source_ids": [source_id],
            "adopted_source_id": source_id,
        }

    anchors = mapped_anchor_ids()
    validate_acquisition_queries(
        snapshot,
        config["context_radius_ly"],
        records_by_id,
        review,
        anchors,
    )
    anchor_positions: dict[str, dict[str, float]] = {
        "sol": {"xg": 0.0, "yg": 0.0, "zg": 0.0}
    }
    for anchor_id in anchors:
        if anchor_id == "sol":
            continue
        if anchor_id not in candidate_systems:
            raise ValueError(
                f"Mapped anchor is absent from candidate systems: {anchor_id}"
            )
        anchor_positions[anchor_id] = candidate_systems[anchor_id]["position"]

    radius_pc = config["context_radius_ly"] / LIGHT_YEARS_PER_PARSEC
    expected_systems = {
        system_id: candidate
        for system_id, candidate in candidate_systems.items()
        if any(
            distance(candidate["position"], anchor_position)
            <= radius_pc + 1e-12
            for anchor_position in anchor_positions.values()
        )
    }
    systems = document["systems"]
    if len(systems) > MAX_SYSTEMS:
        raise ValueError("Runtime astronomy data exceeds the 2,000-system budget")
    system_ids = [system["id"] for system in systems]
    if len(system_ids) != len(set(system_ids)) or system_ids[0] != "sol":
        raise ValueError("Dataset must begin with Sol and contain unique system IDs")
    if set(system_ids[1:]) != set(expected_systems):
        missing = sorted(set(expected_systems) - set(system_ids))
        unexpected = sorted(set(system_ids) - {"sol"} - set(expected_systems))
        raise ValueError(
            f"Generated neighbourhood differs from Gaia coverage: "
            f"missing={missing}, unexpected={unexpected}"
        )
    distances = [system["distance_from_sol_pc"] for system in systems]
    if distances != sorted(distances):
        raise ValueError("Systems must be ordered by adopted distance from Sol")

    emitted_source_ids: set[str] = set()
    expected_source_ids = {
        source_id
        for candidate in expected_systems.values()
        for source_id in candidate["source_ids"]
    }
    systems_by_id = {system["id"]: system for system in systems}
    for system in systems:
        position = system["position_pc"]
        render = system["render_position"]
        values = [
            *position.values(),
            *render.values(),
            system["distance_from_sol_pc"],
        ]
        if not all(math.isfinite(value) for value in values):
            raise ValueError(f"{system['id']} has a non-finite coordinate")
        if render != {
            "x": position["xg"],
            "y": position["zg"],
            "z": -position["yg"],
        }:
            raise ValueError(f"{system['id']} violates canonical scene mapping")
        if system["id"] != "sol":
            expected_system = expected_systems[system["id"]]
            expected_position = expected_system["position"]
            for axis in ("xg", "yg", "zg"):
                if not math.isclose(
                    position[axis],
                    expected_position[axis],
                    rel_tol=0,
                    abs_tol=1e-10,
                ):
                    raise ValueError(
                        f"{system['id']} does not match independently transformed Gaia astrometry"
                    )
            expected_distance = distance(
                expected_position, {"xg": 0.0, "yg": 0.0, "zg": 0.0}
            )
            if not math.isclose(
                system["distance_from_sol_pc"],
                expected_distance,
                rel_tol=0,
                abs_tol=1e-10,
            ):
                raise ValueError(
                    f"{system['id']} has an incorrect distance from Sol"
                )
            adopted_source = records_by_id[expected_system["adopted_source_id"]]
            expected_uncertainty = (
                1000
                * adopted_source["parallax_error"]
                / adopted_source["parallax"] ** 2
            )
            if not math.isclose(
                system["distance_uncertainty_pc"],
                expected_uncertainty,
                rel_tol=0,
                abs_tol=1e-10,
            ):
                raise ValueError(
                    f"{system['id']} has an incorrect distance uncertainty"
                )
            component_source_ids = [
                component["gaia_source_id"] for component in system["components"]
            ]
            if component_source_ids != expected_system["source_ids"]:
                raise ValueError(
                    f"{system['id']} components differ from reviewed Gaia membership"
                )
            if system["provenance"] != {
                "catalogue": EXPECTED_SOURCE["catalogue"],
                "release": EXPECTED_SOURCE["release"],
                "source_object_ids": expected_system["source_ids"],
                "adopted_source_object_id": expected_system[
                    "adopted_source_id"
                ],
                "transformation": (
                    "Astropy ICRS to Galactic Cartesian; Sun-centered; pc"
                ),
                "review_version": review["review_version"],
            }:
                raise ValueError(
                    f"{system['id']} has incorrect system provenance"
                )
        elif (
            system["distance_from_sol_pc"] != 0
            or system["distance_uncertainty_pc"] != 0
        ):
            raise ValueError("Sol must retain zero distance and uncertainty")
        for component in system["components"]:
            source_id = component["gaia_source_id"]
            if source_id is None:
                if system["id"] != "sol":
                    raise ValueError(
                        f"{system['id']} has a generated catalogue component"
                    )
                continue
            if source_id in emitted_source_ids:
                raise ValueError(f"Duplicate Gaia component reference: {source_id}")
            emitted_source_ids.add(source_id)
            source = records_by_id.get(source_id)
            if source is None:
                raise ValueError(f"Generated component is absent from Gaia: {source_id}")
            expected_component = {
                "id": f"gaia-dr3:{source_id}",
                "gaia_source_id": source_id,
                "designation": source["designation"],
                "icrs": {
                    "ra_deg": source["ra"],
                    "dec_deg": source["dec"],
                    "epoch_year": source["ref_epoch"],
                    "parallax_mas": source["parallax"],
                    "parallax_error_mas": source["parallax_error"],
                },
                "astrometry_quality": {
                    "parallax_over_error": source["parallax_over_error"],
                    "visibility_periods_used": source[
                        "visibility_periods_used"
                    ],
                    "ruwe": source["ruwe"],
                },
                "photometry": {
                    "g_magnitude": source["phot_g_mean_mag"],
                    "bp_rp": source["bp_rp"],
                },
                "visual": {
                    "color_family": expected_color_family(source["bp_rp"]),
                    "marker_radius": 0.09,
                    "derivation": (
                        "Gaia DR3 bp_rp fixed bands; neutral when unavailable"
                    ),
                },
            }
            if component != expected_component:
                raise ValueError(
                    f"Generated component differs from Gaia source {source_id}"
                )
            if component["visual"]["color_family"] != expected_color_family(
                source["bp_rp"]
            ):
                raise ValueError(f"Gaia source {source_id} has an invalid colour family")
            if component["photometry"]["bp_rp"] != source["bp_rp"]:
                raise ValueError(f"Gaia source {source_id} has altered BP-RP photometry")
    if emitted_source_ids != expected_source_ids:
        raise ValueError("Generated component IDs do not equal covered Gaia source IDs")

    coverage_by_id = {
        entry["anchor_id"]: entry for entry in document["metadata"]["coverage"]
    }
    if set(coverage_by_id) != set(anchor_positions):
        raise ValueError("Runtime coverage metadata does not match mapped anchors")
    for anchor_id, anchor_position in anchor_positions.items():
        covered_ids = [
            system_id
            for system_id, candidate in expected_systems.items()
            if distance(candidate["position"], anchor_position)
            <= radius_pc + 1e-12
        ]
        coverage = coverage_by_id[anchor_id]
        expected_records = sum(
            len(expected_systems[system_id]["source_ids"])
            for system_id in covered_ids
        )
        if coverage["system_count"] != len(covered_ids):
            raise ValueError(f"{anchor_id} has an incorrect system coverage count")
        if coverage["source_record_count"] != expected_records:
            raise ValueError(f"{anchor_id} has an incorrect source coverage count")
        if coverage["radius_ly"] != config["context_radius_ly"]:
            raise ValueError(f"{anchor_id} has an incorrect coverage radius")
        for axis in ("xg", "yg", "zg"):
            if not math.isclose(
                coverage["anchor_position_pc"][axis],
                anchor_position[axis],
                rel_tol=0,
                abs_tol=1e-10,
            ):
                raise ValueError(
                    f"{anchor_id} has an incorrect coverage anchor position"
                )
        generated_anchor = systems_by_id.get(anchor_id)
        if anchor_id != "sol" and generated_anchor is None:
            raise ValueError(f"Mapped anchor is absent from runtime: {anchor_id}")

    print(
        f"Validated {len(systems)} systems, {len(emitted_source_ids)} Gaia records, "
        f"and {len(anchor_positions)} complete neighbourhood"
        f"{'' if len(anchor_positions) == 1 else 's'}"
    )


if __name__ == "__main__":
    main()
