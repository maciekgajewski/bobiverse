from __future__ import annotations

import argparse
import csv
import io
import math
import re
from pathlib import Path
from typing import Any

import astropy.units as u
from astropy.coordinates import ICRS, SkyCoord
from jsonschema import Draft202012Validator

from astronomy_pipeline import (
    ACKNOWLEDGEMENTS,
    CNS5_COLUMNS,
    GAIA_COLUMNS,
    GCNS_COLUMNS,
    LY_PER_PC,
    WDS_FORMAT_URL,
    WDS_URL,
    decimal_id,
    cns5_query,
    cns5_astrometry_issue,
    c20pc_distance_warning,
    distance,
    exact_source_query,
    gaia_query,
    gcns_anchor_query,
    gcns_query,
    reviewed_landmark_source_identities,
    read_extract,
    resolved_cns5_identity,
    wds_component_spectral_types,
    wds_membership_candidates,
)
from common import (
    C20PC_PATH, C20PC_README_PATH, C20PC_SCHEMA_PATH, CANDIDATES_PATH, CNS5_PATH, CONFIG_PATH, CONFIG_SCHEMA_PATH, GAIA_ENRICHMENT_PATH,
    GCNS_PATH, GENERATED_PATH, IDENTITY_REGISTRY_PATH, LANDMARKS_PATH, REVIEW_PATH,
    ROOT, SOURCE_DIR, SOURCE_EXTRACT_SCHEMA_PATH, WDS_FORMAT_PATH, WDS_PATH,
    mapped_anchor_ids, read_gzip, read_json, sha256, sha256_bytes, value_sha256,
)
from c20pc_census import (
    C20PC_ACKNOWLEDGEMENT,
    C20PC_BIBCODE,
    C20PC_CATALOGUE,
    C20PC_CATALOGUE_DOI,
    C20PC_NOTES_COLUMNS,
    C20PC_NOTES_QUERY,
    C20PC_PUBLICATION_DOI,
    C20PC_README_HISTORY_DATE,
    C20PC_README_URL,
    C20PC_REFS_COLUMNS,
    C20PC_REFS_QUERY,
    C20PC_TABLE_COLUMNS,
    C20PC_TABLE_QUERY,
    C20PC_TAP_URL,
    EXPECTED_ROW_COUNTS,
    EXPECTED_EXTERNAL_REFERENCE_CODES,
    c20pc_enrichment,
    census_source_key,
    exact_identifier_candidates,
    unresolved_reference_codes,
)

MAX_RUNTIME_BYTES = 5 * 1024 * 1024
MAX_SYSTEMS = 2_000
EXPECTED_SOURCE_CONTRACTS = {
    "gcns": ("https://dc.g-vo.org/tap/sync", "gcns.main"),
    "cns5": ("https://dc.g-vo.org/tap/sync", "cns5update.main"),
    "gaia_dr3": (
        "https://gea.esac.esa.int/tap-server/tap/sync",
        "gaiadr3.gaia_source + pinned left joins",
    ),
}


def validate_schema(value: Any, schema_path: Path, label: str) -> None:
    errors = sorted(Draft202012Validator(read_json(schema_path)).iter_errors(value), key=lambda error: list(error.path))
    if errors:
        raise ValueError(f"{label} schema validation failed:\n" + "\n".join(error.message for error in errors))


def csv_sha(columns: list[str], rows: list[dict[str, str]]) -> str:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    return sha256_bytes(output.getvalue().encode())


def validate_extract(key: str, columns: list[str], id_key: str) -> tuple[dict[str, Any], list[dict[str, str]]]:
    manifest, rows = read_extract(key)
    path = {"gcns": GCNS_PATH, "cns5": CNS5_PATH, "gaia_dr3": GAIA_ENRICHMENT_PATH}[key]
    csv_path = {
        "gcns": SOURCE_DIR / "gcns-neighbourhood.csv",
        "cns5": SOURCE_DIR / "cns5-nearby-components.csv",
        "gaia_dr3": SOURCE_DIR / "gaia-dr3-enrichment.csv",
    }[key]
    validate_schema(read_json(path), SOURCE_EXTRACT_SCHEMA_PATH, key)
    if manifest.get("catalogue") != key or manifest.get("columns") != columns:
        raise ValueError(f"{key} manifest does not identify the pinned source contract")
    expected_endpoint, expected_table = EXPECTED_SOURCE_CONTRACTS[key]
    if (
        manifest.get("endpoint") != expected_endpoint
        or manifest.get("table") != expected_table
        or not manifest.get("adql")
        or not manifest.get("retrieved_at")
        or not manifest.get("release")
        or manifest.get("acknowledgement") != ACKNOWLEDGEMENTS[key]
    ):
        raise ValueError(f"{key} manifest provenance is incomplete or unpinned")
    if key in {"gcns", "cns5"} and not manifest.get("upstream_updated_at"):
        raise ValueError(f"{key} manifest lacks the upstream data-update timestamp")
    if manifest.get("row_count") != len(rows) or manifest.get("normalised_sha256") != csv_sha(columns, rows):
        raise ValueError(f"{key} manifest checksum or row count differs from its committed extract")
    if not path.exists() or not csv_path.exists():
        raise ValueError(f"{key} normalized extract is missing")
    expected_csv = io.StringIO(newline="")
    writer = csv.DictWriter(expected_csv, fieldnames=columns, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    if csv_path.read_bytes() != expected_csv.getvalue().encode():
        raise ValueError(f"{key} committed CSV differs from its normalized JSON rows")
    keys = [row.get(id_key, "") for row in rows]
    if not keys or len(keys) != len(set(keys)):
        raise ValueError(f"{key} extract has missing or duplicate {id_key}")
    return manifest, rows


def validate_c20pc() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    document = read_json(C20PC_PATH)
    validate_schema(document, C20PC_SCHEMA_PATH, "20-pc census")
    source = document["source"]
    expected_source = {
        "endpoint": C20PC_TAP_URL,
        "catalogue": C20PC_CATALOGUE,
        "catalogue_doi": C20PC_CATALOGUE_DOI,
        "publication_doi": C20PC_PUBLICATION_DOI,
        "publication_bibcode": C20PC_BIBCODE,
        "readme_url": C20PC_README_URL,
        "readme_history_date": C20PC_README_HISTORY_DATE,
        "readme_media_type": "text/plain; charset=utf-8",
        "acknowledgement": C20PC_ACKNOWLEDGEMENT,
        "external_reference_codes": EXPECTED_EXTERNAL_REFERENCE_CODES,
    }
    if any(source.get(key) != value for key, value in expected_source.items()):
        raise ValueError("20-pc census source provenance differs from its contract")
    if (
        not source.get("retrieved_at")
        or not C20PC_README_PATH.exists()
        or source.get("readme_sha256") != sha256(C20PC_README_PATH)
        or C20PC_README_HISTORY_DATE
        not in C20PC_README_PATH.read_text(encoding="utf-8")
    ):
        raise ValueError("20-pc census ReadMe contract is incomplete or stale")
    query_contracts = {
        "table4": (
            C20PC_TABLE_QUERY,
            C20PC_TABLE_COLUMNS,
            EXPECTED_ROW_COUNTS["table4"],
            document["table4"],
        ),
        "notes4": (
            C20PC_NOTES_QUERY,
            C20PC_NOTES_COLUMNS,
            EXPECTED_ROW_COUNTS["notes4"],
            document["notes4"],
        ),
        "refs": (
            C20PC_REFS_QUERY,
            C20PC_REFS_COLUMNS,
            EXPECTED_ROW_COUNTS["refs"],
            document["references"],
        ),
    }
    for name, (adql, columns, count, rows) in query_contracts.items():
        query = source["queries"][name]
        if (
            query["adql"] != adql
            or query["media_type"] != "text/csv"
            or query["columns"] != columns
            or query["row_count"] != count
            or len(rows) != count
            or query["normalised_sha256"] != value_sha256(rows)
        ):
            raise ValueError(f"20-pc {name} projection or checksum differs")
    notes_query = source["queries"]["notes4"]
    if notes_query.get("transport_row_count") != EXPECTED_ROW_COUNTS[
        "notes4_transport"
    ]:
        raise ValueError("20-pc notes transport count differs from its contract")
    if [row["recno"] for row in document["table4"]] != list(
        range(1, EXPECTED_ROW_COUNTS["table4"] + 1)
    ):
        raise ValueError("20-pc Table 4 recno sequence is not contiguous")
    continuations = [
        row for row in document["notes4"] if row["continuation_recnos"]
    ]
    if (
        len(continuations) != 1
        or continuations[0]["recno"] != 1979
        or continuations[0]["continuation_recnos"] != [1980]
    ):
        raise ValueError("20-pc logical note reconstruction differs")
    note_sequence = [
        recno
        for row in document["notes4"]
        for recno in [row["recno"], *row["continuation_recnos"]]
    ]
    if note_sequence != list(
        range(1, EXPECTED_ROW_COUNTS["notes4_transport"] + 1)
    ):
        raise ValueError("20-pc notes transport recno sequence is not contiguous")
    if (
        unresolved_reference_codes(
            document["table4"], document["references"]
        )
        != EXPECTED_EXTERNAL_REFERENCE_CODES
    ):
        raise ValueError("20-pc retained reference codes are unresolved")
    return source, document["table4"]


def validate_wds(
    cns5_rows: list[dict[str, str]],
    review: dict[str, Any] | None = None,
    gcns_rows: list[dict[str, str]] | None = None,
    gaia_rows: list[dict[str, str]] | None = None,
    candidates: dict[str, Any] | None = None,
) -> None:
    manifest_path = SOURCE_DIR / "wds-membership.json"
    document = read_json(manifest_path)
    validate_schema(
        document,
        SOURCE_EXTRACT_SCHEMA_PATH,
        "WDS source artifact",
    )
    manifest = document.get("source", {})
    if (
        document.get("schema_version") != "1.0.0"
        or manifest.get("schema_version") != "2.0.0"
        or manifest.get("catalogue") != "wds"
        or manifest.get("endpoint") != WDS_URL
        or manifest.get("format_url") != WDS_FORMAT_URL
        or not manifest.get("retrieved_at")
        or "last_modified" not in manifest
        or "format_last_modified" not in manifest
    ):
        raise ValueError("WDS manifest does not pin the complete source contract")
    if not WDS_PATH.exists() or not WDS_FORMAT_PATH.exists():
        raise ValueError("Complete pinned WDS snapshot or format contract is missing")
    contents = read_gzip(WDS_PATH)
    if manifest.get("compressed_sha256") != sha256(WDS_PATH) or manifest.get("uncompressed_sha256") != sha256_bytes(contents):
        raise ValueError("WDS snapshot checksums differ from its manifest")
    if manifest.get("format_sha256") != sha256(WDS_FORMAT_PATH):
        raise ValueError("WDS format checksum differs from its manifest")
    if manifest.get("row_count") != len([line for line in contents.splitlines() if line.strip()]):
        raise ValueError("WDS row count differs from its manifest")
    if manifest.get("acknowledgement") != ACKNOWLEDGEMENTS["wds"]:
        raise ValueError("WDS acknowledgement differs from the required credit")
    candidates = wds_membership_candidates(
        cns5_rows,
        contents,
        (review or {}).get("wds_decisions", []),
        gcns_rows,
        gaia_rows,
        reviewed_landmark_source_identities(candidates),
    )
    if document.get("rows") != candidates or manifest.get("candidate_row_count") != len(candidates) or manifest.get("candidate_sha256") != value_sha256(candidates):
        raise ValueError("WDS candidate selection differs from a fresh derivation over the complete snapshot")


def validate_wds_candidate_binding(
    candidates: dict[str, Any],
    wds_document: dict[str, Any],
) -> None:
    rows = wds_document["rows"]
    if candidates.get("wds_candidate_sha256") != value_sha256(rows):
        raise ValueError("System candidates are not bound to the exact WDS evidence")
    expected_by_system: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        if row.get("system_id") and row.get("selection_reason", "").startswith(
            "accepted project review:"
        ):
            expected_by_system.setdefault(row["system_id"], []).append(row)
    for values in expected_by_system.values():
        values.sort(
            key=lambda row: (
                row["system_id"],
                row["wds_coordinate"],
                row["discoverer"],
                row["components"],
            )
        )
    systems = {entry["id"]: entry for entry in candidates["systems"]}
    if not set(expected_by_system).issubset(systems):
        raise ValueError("Accepted WDS evidence references a missing candidate system")
    for system_id, system in systems.items():
        if system.get("wds_membership_evidence") != expected_by_system.get(
            system_id, []
        ):
            raise ValueError(
                "Candidate system membership omits accepted WDS review evidence"
            )


def validate_registry(registry: dict[str, Any]) -> None:
    if registry.get("schema_version") != "1.0.0":
        raise ValueError("Identity registry has an unsupported schema version")
    for kind, prefix in (("components", "stellar-component-"), ("systems", "stellar-system-")):
        entries = registry.get(kind)
        if not isinstance(entries, list):
            raise ValueError(f"Identity registry lacks {kind}")
        ids = [entry.get("id") for entry in entries]
        keys = [entry.get("key") for entry in entries]
        if len(ids) != len(set(ids)) or len(keys) != len(set(keys)):
            raise ValueError(f"Identity registry has duplicate {kind} IDs or keys")
        numbers = []
        for entry in entries:
            identifier = entry.get("id", "")
            if not isinstance(identifier, str) or not identifier.startswith(prefix):
                raise ValueError(f"Identity registry has an invalid {kind} ID")
            try:
                numbers.append(int(identifier.removeprefix(prefix)))
            except ValueError as error:
                raise ValueError(f"Identity registry has an invalid {kind} sequence") from error
            if entry.get("state") not in {"active", "tombstoned"}:
                raise ValueError("Identity registry has an invalid lifecycle state")
        high_watermark = registry.get(
            "component_sequence_high_watermark"
            if kind == "components"
            else "system_sequence_high_watermark"
        )
        if (
            not isinstance(high_watermark, int)
            or high_watermark < 0
            or high_watermark < max(numbers, default=0)
        ):
            raise ValueError(
                f"Identity registry {kind} has an invalid sequence high-water mark"
            )
        if numbers != sorted(numbers) or any(number < 1 for number in numbers):
            raise ValueError(f"Identity registry {kind} IDs are not monotonic")
        if kind == "components":
            active_source_keys = [
                source_key
                for entry in entries
                if entry["state"] == "active"
                for source_key in entry.get("source_keys", [entry["key"]])
            ]
            if len(active_source_keys) != len(set(active_source_keys)):
                raise ValueError(
                    "Active component identities claim one exact source key twice"
                )


def validate_join_accounting(
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
    gaia_rows: list[dict[str, str]],
    gaia_manifest: dict[str, Any],
) -> None:
    if (
        gaia_manifest.get("release") != "Gaia DR3"
        or gaia_manifest.get("table")
        != "gaiadr3.gaia_source + pinned left joins"
    ):
        raise ValueError("Gaia enrichment attempts an unsupported release join")
    input_ids = sorted(
        {
            identifier
            for identifier in (
                [decimal_id(row["source_id"]) for row in gcns_rows]
                + [decimal_id(row["gaia_dr3_id"]) for row in cns5_rows]
            )
            if identifier is not None
        },
    )
    returned_ids = [row["source_id"] for row in gaia_rows]
    if len(returned_ids) != len(set(returned_ids)):
        raise ValueError("Gaia enrichment contains duplicate source IDs")
    if not set(returned_ids).issubset(input_ids):
        raise ValueError("Gaia enrichment returned an ID outside its left-join input")
    expected_unmatched = sorted(set(input_ids) - set(returned_ids))
    if gaia_manifest.get("unmatched_source_ids") != expected_unmatched:
        raise ValueError("Gaia enrichment matched/unmatched accounting is incomplete")
    if gaia_manifest.get("input_source_id_sha256") != sha256_bytes(
        "\n".join(input_ids).encode()
    ):
        raise ValueError("Gaia enrichment input-ID checksum is incorrect")
    expected_queries = []
    returned_set = set(returned_ids)
    for start in range(0, len(input_ids), 500):
        chunk = input_ids[start:start + 500]
        expected_queries.append(
            {
                "adql": gaia_query(chunk),
                "input_count": len(chunk),
                "input_source_id_sha256": sha256_bytes(
                    "\n".join(chunk).encode()
                ),
                "returned_count": len(returned_set.intersection(chunk)),
            }
        )
    if gaia_manifest.get("queries") != expected_queries:
        raise ValueError("Gaia enrichment chunk accounting is incomplete")


def validate_acquisition_queries(
    gcns_manifest: dict[str, Any],
    cns5_manifest: dict[str, Any],
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
    review: dict[str, Any],
    config: dict[str, Any],
    anchor_ids: list[str],
) -> None:
    radius_pc = config["context_radius_ly"] / LY_PER_PC
    non_sol = [anchor for anchor in anchor_ids if anchor != "sol"]
    bootstrap_by_anchor = {
        entry["anchor_id"]: entry
        for entry in review.get("anchor_bootstraps", [])
    }
    gcns_bootstrap_anchors = [
        anchor
        for anchor in non_sol
        if bootstrap_by_anchor[anchor]["catalogue"] == "gcns"
    ]
    cns5_bootstrap_anchors = [
        anchor
        for anchor in non_sol
        if bootstrap_by_anchor[anchor]["catalogue"] == "cns5"
    ]
    expected_cns5 = [{"stage": "local-census", "adql": cns5_query()}]
    if cns5_bootstrap_anchors:
        identifiers = [
            str(bootstrap_by_anchor[anchor]["source_id"])
            for anchor in cns5_bootstrap_anchors
        ]
        expected_cns5.append(
            {
                "stage": "bootstrap",
                "anchor_ids": cns5_bootstrap_anchors,
                "adql": exact_source_query(
                    "cns5update.main", CNS5_COLUMNS, "cns5_id", identifiers
                ),
            }
        )
    if (
        cns5_manifest.get("adql") != cns5_query()
        or cns5_manifest.get("queries") != expected_cns5
    ):
        raise ValueError("CNS5 acquisition queries differ from the exact plan")

    sol_query = gcns_query(radius_pc)
    expected_gcns = [
        {"stage": "coverage", "anchor_id": "sol", "adql": sol_query}
    ]
    if gcns_bootstrap_anchors:
        identifiers = [
            str(bootstrap_by_anchor[anchor]["source_id"])
            for anchor in gcns_bootstrap_anchors
        ]
        expected_gcns.append(
            {
                "stage": "bootstrap",
                "anchor_ids": gcns_bootstrap_anchors,
                "adql": exact_source_query(
                    "gcns.main", GCNS_COLUMNS, "source_id", identifiers
                ),
            }
        )
    gcns = {row["source_id"]: row for row in gcns_rows}
    cns5 = {row["cns5_id"]: row for row in cns5_rows}
    for anchor in non_sol:
        bootstrap = bootstrap_by_anchor[anchor]
        if bootstrap["catalogue"] == "gcns":
            row = gcns[str(bootstrap["source_id"])]
            position = {
                "xg": float(row["xcoord_50"]),
                "yg": float(row["ycoord_50"]),
                "zg": float(row["zcoord_50"]),
            }
        else:
            row = cns5[str(bootstrap["source_id"])]
            coordinate = SkyCoord(
                ra=float(row["ra"]) * u.deg,
                dec=float(row["dec"]) * u.deg,
                distance=(1000 / float(row["parallax"])) * u.pc,
                frame=ICRS(),
            ).galactic.cartesian
            position = {
                "xg": round(coordinate.x.to_value(u.pc), 12),
                "yg": round(coordinate.y.to_value(u.pc), 12),
                "zg": round(coordinate.z.to_value(u.pc), 12),
            }
        expected_gcns.append(
            {
                "stage": "coverage",
                "anchor_id": anchor,
                "adql": gcns_anchor_query(position, radius_pc),
            }
        )
    if (
        gcns_manifest.get("adql") != sol_query
        or gcns_manifest.get("queries") != expected_gcns
    ):
        raise ValueError("GCNS acquisition queries differ from the exact plan")


def validate_source_union(
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
    candidates: dict[str, Any],
) -> None:
    cns5_by_id = {row["cns5_id"]: row for row in cns5_rows}
    expected = {
        resolved_cns5_identity(row, cns5_by_id) for row in cns5_rows
    } | {f"gaia-dr3:{row['source_id']}" for row in gcns_rows}
    actual = {component["source_identity"] for component in candidates["components"]}
    if actual != expected:
        raise ValueError(
            "Candidate components differ from the CNS5/GCNS retained-source union"
        )
    for component in candidates["components"]:
        if component.get("membership_reason") not in {
            "CNS5 grouping",
            "singleton retained source",
        }:
            raise ValueError("Candidate component lacks a supported membership reason")


def validate_cns5_astrometry_overrides(
    review: dict[str, Any], cns5_rows: list[dict[str, str]]
) -> None:
    rows = {row["cns5_id"]: row for row in cns5_rows}
    seen: set[str] = set()
    for override in review.get("cns5_astrometry_overrides", []):
        identifier = str(override.get("cns5_id", ""))
        if (
            identifier in seen
            or identifier not in rows
            or override.get("decision") not in {"accept", "reject"}
            or not override.get("reason")
            or (
                override.get("decision") == "accept"
                and cns5_astrometry_issue(rows[identifier])
                != "CNS5 remarks flag a possible astrometry or identity conflict"
            )
        ):
            raise ValueError("CNS5 astrometry review override is invalid")
        seen.add(identifier)


def validate_candidate_geometry(
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
    candidates: dict[str, Any],
    cns5_astrometry_overrides: list[dict[str, Any]] | None = None,
) -> None:
    gcns = {row["source_id"]: row for row in gcns_rows}
    cns5 = {row["cns5_id"]: row for row in cns5_rows}
    astrometry_decisions = {
        str(entry["cns5_id"]): str(entry["decision"])
        for entry in (cns5_astrometry_overrides or [])
    }
    for row in gcns_rows:
        distance_kpc = float(row["dist_50"])
        if distance_kpc <= 0:
            raise ValueError("GCNS median distance must be positive")
        cartesian = SkyCoord(
            ra=float(row["ra"]) * u.deg,
            dec=float(row["dec"]) * u.deg,
            distance=distance_kpc * u.kpc,
            frame=ICRS(),
        ).galactic.cartesian
        transformed = {
            "xg": cartesian.x.to_value(u.pc),
            "yg": cartesian.y.to_value(u.pc),
            "zg": cartesian.z.to_value(u.pc),
        }
        retained = {
            "xg": float(row["xcoord_50"]),
            "yg": float(row["ycoord_50"]),
            "zg": float(row["zcoord_50"]),
        }
        if any(
            not math.isclose(transformed[axis], retained[axis], abs_tol=1e-5)
            for axis in ("xg", "yg", "zg")
        ):
            raise ValueError(
                "GCNS Cartesian units, origin, axis orientation, or handedness "
                f"do not match an independent ICRS transform: {row['source_id']}"
            )
    for component in candidates["components"]:
        expected = None
        expected_reason = None
        gcns_row = gcns.get(component.get("gaia_source_id"))
        if gcns_row is not None:
            expected = {
                "xg": float(gcns_row["xcoord_50"]),
                "yg": float(gcns_row["ycoord_50"]),
                "zg": float(gcns_row["zcoord_50"]),
            }
            expected_reason = "gcns median Bayesian Cartesian geometry"
        else:
            cns5_row = cns5.get(component.get("cns5_id"))
            if cns5_row is not None and all(
                cns5_row.get(field) for field in ("ra", "dec", "parallax")
            ) and (
                (
                    cns5_astrometry_issue(cns5_row) is None
                    and astrometry_decisions.get(cns5_row["cns5_id"])
                    != "reject"
                )
                or (
                    cns5_astrometry_issue(cns5_row)
                    == "CNS5 remarks flag a possible astrometry or identity conflict"
                    and astrometry_decisions.get(cns5_row["cns5_id"])
                    == "accept"
                )
            ):
                parallax = float(cns5_row["parallax"])
                if parallax > 0:
                    cartesian = SkyCoord(
                        ra=float(cns5_row["ra"]) * u.deg,
                        dec=float(cns5_row["dec"]) * u.deg,
                        distance=(1000 / parallax) * u.pc,
                        frame=ICRS(),
                    ).galactic.cartesian
                    expected = {
                        "xg": round(cartesian.x.to_value(u.pc), 12),
                        "yg": round(cartesian.y.to_value(u.pc), 12),
                        "zg": round(cartesian.z.to_value(u.pc), 12),
                    }
                    expected_reason = "CNS5 astrometry transformed by Astropy"
        if component.get("position_pc") != expected:
            raise ValueError(
                f"{component['id']} position does not follow GCNS/CNS5 precedence"
            )
        if component.get("position_derivation") != expected_reason:
            raise ValueError(
                f"{component['id']} position provenance does not match its source"
            )


def validate_candidates(candidates: dict[str, Any], review: dict[str, Any], registry: dict[str, Any]) -> None:
    if candidates.get("schema_version") != "2.0.0":
        raise ValueError("System candidates has an unsupported schema version")
    if review.get("accepted_candidate_sha256") != value_sha256(candidates):
        raise ValueError("System candidates checksum is stale or was not explicitly accepted")
    if review.get("unresolved_ambiguities"):
        raise ValueError("System review contains unresolved ambiguity")
    components = candidates.get("components", [])
    systems = candidates.get("systems", [])
    component_ids = [component.get("id") for component in components]
    system_ids = [system.get("id") for system in systems]
    if len(component_ids) != len(set(component_ids)) or len(system_ids) != len(set(system_ids)):
        raise ValueError("Candidates contain duplicate stable identities")
    registry_component_ids = {entry["id"] for entry in registry["components"] if entry["state"] == "active"}
    registry_system_ids = {entry["id"] for entry in registry["systems"] if entry["state"] == "active"}
    if not set(component_ids).issubset(registry_component_ids) or not set(system_ids).issubset(registry_system_ids):
        raise ValueError("Candidates use IDs absent from the identity registry")
    registry_components_by_id = {
        entry["id"]: entry
        for entry in registry["components"]
        if entry["state"] == "active"
    }
    for component in components:
        if sorted(component.get("source_identities", [])) != sorted(
            registry_components_by_id[component["id"]].get(
                "source_keys",
                [registry_components_by_id[component["id"]]["key"]],
            )
        ):
            raise ValueError(
                "Candidate source identities differ from their stable registry key"
            )
    ownership: dict[str, str] = {}
    review_overrides = {
        entry.get("candidate_system_id"): entry
        for entry in review.get("overrides", [])
    }
    for system in systems:
        members = system.get("component_ids", [])
        if not members or any(member not in component_ids for member in members):
            raise ValueError("Candidate system has an invalid component membership")
        for member in members:
            if member in ownership:
                raise ValueError("A component is assigned to two candidate systems")
            ownership[member] = system["id"]
        adopted = system.get("adopted_component_candidate")
        reviewed_adopted = review_overrides.get(system["id"], {}).get(
            "adopted_component_id"
        )
        if adopted not in members and not (
            adopted is None
            and (
                reviewed_adopted in members
                or not any(
                    component["position_pc"] is not None
                    for component in components
                    if component["id"] in members
                )
            )
        ):
            raise ValueError("Candidate system lacks an adopted member component")
        if system.get("requires_review") and reviewed_adopted not in members:
            raise ValueError(
                "Ambiguous multiple system lacks a reviewed adopted component"
            )
    if set(ownership) != set(component_ids):
        raise ValueError("An ungrouped retained source was omitted instead of becoming a singleton system")
    registry_systems_by_id = {
        entry["id"]: entry
        for entry in registry["systems"]
        if entry["state"] == "active"
    }
    for system in systems:
        if registry_systems_by_id[system["id"]]["key"] != "|".join(
            sorted(system["component_ids"])
        ):
            raise ValueError(
                "Candidate system membership differs from its stable registry key"
            )
    for component in components:
        if not component.get("preferred_name_candidate"):
            raise ValueError("Automatically retained component lacks a source-backed fallback name")
        if component.get("position_pc") is not None:
            if not all(math.isfinite(component["position_pc"][axis]) for axis in ("xg", "yg", "zg")):
                raise ValueError("Candidate component has non-finite source geometry")
    override_ids = [entry.get("candidate_system_id") for entry in review.get("overrides", [])]
    if len(override_ids) != len(set(override_ids)) or not set(override_ids).issubset(system_ids):
        raise ValueError("System review has an invalid or duplicate system override")
    component_override_ids = [entry.get("candidate_component_id") for entry in review.get("component_overrides", [])]
    if len(component_override_ids) != len(set(component_override_ids)) or not set(component_override_ids).issubset(component_ids):
        raise ValueError("System review has an invalid or duplicate component override")
    component_review_names = {
        entry["candidate_component_id"]: entry.get("name", "")
        for entry in review.get("component_overrides", [])
    }
    wds_keys: list[tuple[str, str, str, str]] = []
    for decision in review.get("wds_decisions", []):
        key = (
            decision.get("system_id", ""),
            decision.get("wds_coordinate", ""),
            decision.get("discoverer", ""),
            decision.get("components", ""),
        )
        system = next(
            (entry for entry in systems if entry["id"] == key[0]), None
        )
        reviewed_component_ids = decision.get("component_ids")
        if (
            key[0] not in system_ids
            or not all(isinstance(value, str) for value in key)
            or not key[1]
            or not key[2]
            or decision.get("membership_action") not in {"confirm", "replace"}
            or not isinstance(reviewed_component_ids, list)
            or not reviewed_component_ids
            or system is None
            or not set(reviewed_component_ids).issubset(
                system["component_ids"]
            )
            or not decision.get("reason")
        ):
            raise ValueError("System review has an invalid WDS membership decision")
        component_labels = re.findall(r"[A-Z](?:[a-z])?", key[3])
        if len(component_labels) == len(reviewed_component_ids) and any(
            not component_review_names.get(component_id, "").endswith(
                f" {component_label}"
            )
            for component_id, component_label in zip(
                reviewed_component_ids,
                component_labels,
                strict=True,
            )
        ):
            raise ValueError(
                "WDS membership component IDs do not follow reviewed component order"
            )
        wds_keys.append(key)
    if len(wds_keys) != len(set(wds_keys)):
        raise ValueError("System review has a duplicate WDS membership decision")
    registry_system_ids = {entry["id"] for entry in registry["systems"]}
    all_registry_component_ids = {entry["id"] for entry in registry["components"]}
    for transition in review.get("identity_transitions", []):
        if "from_component_ids" in transition:
            from_component_ids = transition.get("from_component_ids")
            to_source_identities = transition.get("to_source_identities")
            survivor = transition.get("surviving_component_id")
            if (
                not isinstance(from_component_ids, list)
                or not from_component_ids
                or not set(from_component_ids).issubset(
                    all_registry_component_ids
                )
                or not isinstance(to_source_identities, list)
                or not to_source_identities
                or survivor is not None
                and survivor not in from_component_ids
                or not transition.get("reason")
            ):
                raise ValueError(
                    "System review has an invalid component identity transition"
                )
            continue
        from_ids = transition.get("from_system_ids")
        to_ids = transition.get("to_component_ids")
        if (
            not isinstance(from_ids, list)
            or not from_ids
            or not set(from_ids).issubset(registry_system_ids)
            or not isinstance(to_ids, list)
            or not to_ids
            or not set(to_ids).issubset(component_ids)
            or not transition.get("reason")
        ):
            raise ValueError("System review has an invalid identity transition")


def validate_c20pc_bindings(
    source: dict[str, Any],
    rows: list[dict[str, Any]],
    candidates: dict[str, Any],
    review: dict[str, Any],
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
) -> None:
    if (
        candidates.get("c20pc_source_sha256")
        != source["queries"]["table4"]["normalised_sha256"]
    ):
        raise ValueError("System candidates are not bound to the 20-pc snapshot")
    rows_by_key = {census_source_key(row): row for row in rows}
    components = {
        component["id"]: component for component in candidates["components"]
    }
    mappings = review.get("c20pc_mappings", [])
    gcns = {row["source_id"]: row for row in gcns_rows}
    cns5 = {row["cns5_id"]: row for row in cns5_rows}
    if len(mappings) != 13:
        raise ValueError("System review does not contain the 13 accepted 20-pc mappings")
    seen_components: set[str] = set()
    seen_sources: set[str] = set()
    exact_candidates = exact_identifier_candidates(cns5_rows, rows)
    for mapping in mappings:
        component_id = mapping.get("candidate_component_id")
        source_key = mapping.get("source_key")
        row = rows_by_key.get(source_key)
        component = components.get(component_id)
        if (
            component is None
            or row is None
            or component_id in seen_components
            or source_key in seen_sources
            or mapping.get("source_recno") != row["recno"]
            or mapping.get("cns5_id") != component.get("cns5_id")
            or mapping.get("match_method")
            not in {"reviewed_mapping", "exact_identifier"}
            or not mapping.get("preferred_name")
            or not mapping.get("preferred_name_source")
            or not mapping.get("reason")
        ):
            raise ValueError("System review has an invalid 20-pc mapping")
        if mapping["match_method"] == "exact_identifier":
            accepted_exact = [
                candidate
                for candidate in exact_candidates[mapping["cns5_id"]]
                if candidate["source_key"] == source_key
                and not candidate["ambiguous"]
            ]
            if len(accepted_exact) != 1:
                raise ValueError(
                    "Reviewed exact 20-pc mapping is not independently unique"
                )
        seen_components.add(component_id)
        seen_sources.add(source_key)
        expected_match = {
            "mapping": mapping,
            "enrichment": c20pc_enrichment(row, mapping),
            "canonical_distance_warning": c20pc_distance_warning(
                row,
                component.get("position_pc"),
                gcns.get(component.get("gaia_source_id")),
                cns5.get(component.get("cns5_id")),
            ),
        }
        if component.get("c20pc_match") != expected_match:
            raise ValueError(
                f"{component_id} 20-pc match differs from reviewed source evidence"
            )
        if component["preferred_name_candidate"] != mapping["preferred_name"]:
            raise ValueError(
                f"{component_id} does not use its accepted census name"
            )
    accepted_components = {
        component["id"]
        for component in candidates["components"]
        if component.get("c20pc_match") is not None
    }
    if accepted_components != seen_components:
        raise ValueError("Candidate 20-pc matches differ from reviewed mappings")


def validate_anchor_bootstraps(
    review: dict[str, Any],
    candidates: dict[str, Any],
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
    expected_anchor_ids: list[str],
) -> None:
    bootstraps = review.get("anchor_bootstraps", [])
    by_anchor = {entry.get("anchor_id"): entry for entry in bootstraps}
    non_sol = set(expected_anchor_ids) - {"sol"}
    if len(by_anchor) != len(bootstraps) or set(by_anchor) != non_sol:
        raise ValueError(
            "Mapped anchors lack one exact reviewed source-backed bootstrap record"
        )
    systems = {entry["id"]: entry for entry in candidates["systems"]}
    components = {entry["id"]: entry for entry in candidates["components"]}
    gcns_ids = {row["source_id"] for row in gcns_rows}
    cns5_ids = {row["cns5_id"] for row in cns5_rows}
    for anchor_id, bootstrap in by_anchor.items():
        system = systems.get(bootstrap.get("system_id"))
        catalogue = bootstrap.get("catalogue")
        source_id = str(bootstrap.get("source_id", ""))
        if system is None or catalogue not in {"gcns", "cns5"}:
            raise ValueError(f"{anchor_id} has an invalid reviewed bootstrap")
        members = [components[identifier] for identifier in system["component_ids"]]
        exact = (
            catalogue == "gcns"
            and source_id in gcns_ids
            and any(member.get("gaia_source_id") == source_id for member in members)
        ) or (
            catalogue == "cns5"
            and source_id in cns5_ids
            and any(member.get("cns5_id") == source_id for member in members)
        )
        if not exact:
            raise ValueError(
                f"{anchor_id} bootstrap is not an exact source identity in its system"
            )


def expected_presentation(
    enrichment: dict[str, str] | None,
    bp_rp: float | None,
    wds_spectral_type: str | None = None,
    c20pc: dict[str, Any] | None = None,
) -> tuple[str, str]:
    if c20pc and c20pc.get("object_class") == "brown_dwarf":
        family = c20pc.get("visual_family")
        if family not in {"infrared-cool", "infrared-warm"}:
            raise ValueError("Accepted 20-pc brown dwarf lacks a visual family")
        return (
            family,
            "Kirkpatrick et al. 2024 brown-dwarf type/temperature; "
            "approximate false-infrared presentation",
        )
    if enrichment and enrichment.get("teff_gspphot"):
        temperature = float(enrichment["teff_gspphot"])
        family = (
            "blue" if temperature >= 10_000 else
            "blue-white" if temperature >= 7_500 else
            "white" if temperature >= 6_000 else
            "yellow" if temperature >= 5_200 else
            "orange" if temperature >= 3_700 else
            "red"
        )
        return (
            family,
            "Gaia DR3 effective temperature; approximate fixed temperature bands",
        )
    spectral = (
        enrichment.get("spectraltype_esphs", "").strip().upper()
        if enrichment
        else ""
    )
    if spectral[:1] in {"O", "B", "A", "F", "G", "K", "M"}:
        family = {
            "O": "blue", "B": "blue-white", "A": "white", "F": "white",
            "G": "yellow", "K": "orange", "M": "red",
        }[spectral[0]]
        return (
            family,
            "Gaia DR3 spectral classification; approximate class family",
        )
    if bp_rp is not None:
        family = (
        "blue" if bp_rp < 0 else
        "blue-white" if bp_rp < 0.5 else
        "white" if bp_rp < 0.8 else
        "yellow" if bp_rp < 1.2 else
        "orange" if bp_rp < 1.8 else
        "red")
        return family, "Gaia DR3 bp_rp fixed bands; neutral when unavailable"
    spectral = (wds_spectral_type or "").strip().upper()
    spectral_class = next(
        (character for character in spectral if character in "OBAFGKM"),
        None,
    )
    if spectral_class:
        family = {
            "O": "blue", "B": "blue-white", "A": "white", "F": "white",
            "G": "yellow", "K": "orange", "M": "red",
        }[spectral_class]
        return family, "Reviewed WDS spectral type; approximate class family"
    return "neutral", "Gaia DR3 bp_rp fixed bands; neutral when unavailable"


def validate_runtime_presentation(
    document: dict[str, Any],
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
    gaia_rows: list[dict[str, str]],
    candidates: dict[str, Any],
    review: dict[str, Any],
) -> None:
    gcns = {row["source_id"]: row for row in gcns_rows}
    cns5 = {row["cns5_id"]: row for row in cns5_rows}
    gaia = {row["source_id"]: row for row in gaia_rows}
    candidates_by_id = {
        component["id"]: component for component in candidates["components"]
    }
    component_overrides = {
        entry["candidate_component_id"]: entry
        for entry in review.get("component_overrides", [])
    }
    wds_spectral_by_component: dict[str, str] = {}
    for system in candidates["systems"]:
        for evidence in system.get("wds_membership_evidence", []):
            for component_id, spectral_type in (
                wds_component_spectral_types(evidence).items()
            ):
                wds_spectral_by_component.setdefault(
                    component_id, spectral_type
                )
    for system in document["systems"]:
        if system["id"] == "sol":
            continue
        for component in system["components"]:
            candidate_component = candidates_by_id[component["id"]]
            gaia_id = component["gaia_source_id"]
            enrichment = gaia.get(gaia_id)
            if component["source_identities"] != candidate_component[
                "source_identities"
            ]:
                raise ValueError(
                    f"{component['id']} drops accepted source identities"
                )
            bp_rp = (
                float(enrichment["bp_rp"])
                if enrichment and enrichment.get("bp_rp")
                else None
            )
            gcns_row = gcns.get(gaia_id)
            if bp_rp is None and gcns_row:
                bp = gcns_row.get("phot_bp_mean_mag")
                rp = gcns_row.get("phot_rp_mean_mag")
                bp_rp = float(bp) - float(rp) if bp and rp else None
            wds_spectral_type = wds_spectral_by_component.get(component["id"])
            c20pc = (
                candidate_component["c20pc_match"]["enrichment"]
                if candidate_component.get("c20pc_match")
                else None
            )
            family, derivation = expected_presentation(
                enrichment, bp_rp, wds_spectral_type, c20pc
            )
            visual = component["visual"]
            if (
                visual["color_family"] != family
                or visual["derivation"] != derivation
                or visual["source_facts"] != {
                    "effective_temperature_k": (
                        float(enrichment["teff_gspphot"])
                        if enrichment and enrichment.get("teff_gspphot")
                        else None
                    ),
                    "spectral_type": (
                        enrichment.get("spectraltype_esphs") or None
                        if enrichment else None
                    ),
                    "bp_rp": bp_rp,
                    "wds_spectral_type": wds_spectral_type,
                    "c20pc_effective_temperature_k": (
                        c20pc.get("effective_temperature_k")
                        if c20pc else None
                    ),
                    "c20pc_spectral_type": (
                        c20pc.get("spectral_type") if c20pc else None
                    ),
                    "object_class": (
                        c20pc.get("object_class") if c20pc else None
                    ),
                }
            ):
                raise ValueError(
                    f"{component['id']} presentation violates source precedence"
                )
            cns5_row = cns5.get(component["cns5_id"])
            expected_identifiers = {
                "gaia_dr3_source_id": gaia_id,
                "gcns_source_id": gaia_id if gcns_row else None,
                "cns5_id": component["cns5_id"],
                "gj_id": cns5_row.get("gj_id") or None if cns5_row else None,
                "hip_id": cns5_row.get("hip_id") or None if cns5_row else None,
                "cns5_component_id": (
                    cns5_row.get("component_id") or None if cns5_row else None
                ),
                "cns6_system_id": (
                    cns5_row.get("cns6_system_id") or None
                    if cns5_row else None
                ),
                "c20pc_source_key": (
                    c20pc.get("source_key") if c20pc else None
                ),
                "wise_id": c20pc.get("wise_id") if c20pc else None,
                "twomass_id": c20pc.get("twomass_id") if c20pc else None,
                "published_name": (
                    c20pc.get("published_name") if c20pc else None
                ),
            }
            if component["identifiers"] != expected_identifiers:
                raise ValueError(
                    f"{component['id']} does not retain its source identifiers"
                )
            expected_enrichment = None
            if enrichment:
                numeric_fields = {
                    "phot_g_mean_mag": "phot_g_mean_mag",
                    "phot_bp_mean_mag": "phot_bp_mean_mag",
                    "phot_rp_mean_mag": "phot_rp_mean_mag",
                    "bp_rp": "bp_rp",
                    "radial_velocity_km_s": "radial_velocity",
                    "radial_velocity_error_km_s": "radial_velocity_error",
                    "effective_temperature_k": "teff_gspphot",
                    "logg_gspphot": "logg_gspphot",
                    "luminosity_solar": "lum_flame",
                    "radius_solar": "radius_flame",
                    "star_class_probability": "classprob_dsc_combmod_star",
                    "variability_class_score": "best_class_score",
                }
                expected_enrichment = {
                    output: (
                        float(enrichment[source])
                        if enrichment[source]
                        else None
                    )
                    for output, source in numeric_fields.items()
                }
                expected_enrichment.update(
                    {
                        "phot_variable_flag": enrichment[
                            "phot_variable_flag"
                        ] or None,
                        "non_single_star": enrichment["non_single_star"] or None,
                        "spectral_type": enrichment["spectraltype_esphs"] or None,
                        "variability_class": enrichment["best_class_name"] or None,
                    }
                )
            if component["gaia_enrichment"] != expected_enrichment:
                raise ValueError(
                    f"{component['id']} drops Gaia enrichment provenance"
                )
            if (
                component["c20pc_enrichment"] != c20pc
                or component["object_class"]
                != (c20pc.get("object_class") if c20pc else None)
            ):
                raise ValueError(
                    f"{component['id']} drops accepted 20-pc enrichment"
                )
            astrometry = gcns_row or cns5_row or {}

            def optional_number(value: str | None) -> float | None:
                return float(value) if value not in {None, ""} else None

            expected_component_facts = {
                "gaia_source_id": candidate_component["gaia_source_id"],
                "cns5_id": candidate_component["cns5_id"],
                "designation": component_overrides.get(
                    component["id"], {}
                ).get(
                    "name",
                    candidate_component["preferred_name_candidate"],
                ),
                "icrs": {
                    "ra_deg": optional_number(astrometry.get("ra")),
                    "dec_deg": optional_number(astrometry.get("dec")),
                    "epoch_year": optional_number(
                        astrometry.get("ref_epoch")
                        or astrometry.get("epoch")
                    ),
                    "parallax_mas": optional_number(
                        astrometry.get("parallax")
                    ),
                    "parallax_error_mas": optional_number(
                        astrometry.get("parallax_error")
                    ),
                },
                "astrometry_quality": {
                    "parallax_over_error": None,
                    "visibility_periods_used": None,
                    "ruwe": optional_number(gcns_row.get("ruwe"))
                    if gcns_row
                    else None,
                },
                "photometry": {
                    "g_magnitude": (
                        optional_number(enrichment.get("phot_g_mean_mag"))
                        if enrichment
                        else optional_number(
                            astrometry.get("g_mag")
                            or astrometry.get("phot_g_mean_mag")
                        )
                    ),
                    "bp_rp": bp_rp,
                },
                "provenance": {
                    "position": candidate_component["position_derivation"],
                    "catalogues": [
                        catalogue
                        for catalogue, source_row in (
                            ("GCNS", gcns_row),
                            ("CNS5", cns5_row),
                            ("Gaia DR3", enrichment),
                            (
                                "Kirkpatrick et al. 2024 20-pc census",
                                c20pc,
                            ),
                        )
                        if source_row
                    ],
                    "enrichment": (
                        "Gaia DR3 left join; reviewed Kirkpatrick et al. 2024 20-pc census"
                        if enrichment and c20pc
                        else "Gaia DR3 left join"
                        if enrichment
                        else "Reviewed Kirkpatrick et al. 2024 20-pc census"
                        if c20pc
                        else None
                    ),
                },
            }
            for field, expected in expected_component_facts.items():
                if component[field] != expected:
                    raise ValueError(
                        f"{component['id']} {field} differs from its deterministic source"
                    )
            is_brown_dwarf = bool(
                c20pc and c20pc.get("object_class") == "brown_dwarf"
            )
            if (
                visual["marker_radius"]
                != (0.05 if is_brown_dwarf else 0.09)
                or visual["intensity"]
                != (0.25 if is_brown_dwarf else 1.0)
                or visual["pick_radius"] != 0.09
            ):
                raise ValueError(
                    f"{component['id']} marker presentation differs from contract"
                )


def validate_runtime_uncertainty(
    document: dict[str, Any],
    candidates: dict[str, Any],
    gcns_rows: list[dict[str, str]],
    cns5_rows: list[dict[str, str]],
) -> None:
    candidates_by_system = {entry["id"]: entry for entry in candidates["systems"]}
    candidates_by_component = {
        entry["id"]: entry for entry in candidates["components"]
    }
    gcns = {row["source_id"]: row for row in gcns_rows}
    cns5 = {row["cns5_id"]: row for row in cns5_rows}
    for system in document["systems"]:
        if system["id"] == "sol":
            if system["distance_uncertainty_pc"] != 0:
                raise ValueError("Sol distance uncertainty must be zero")
            continue
        candidate = candidates_by_system[system["id"]]
        adopted = candidates_by_component[
            system["provenance"]["adopted_component_id"]
        ]
        gcns_row = gcns.get(adopted.get("gaia_source_id"))
        expected = None
        if gcns_row:
            median = float(gcns_row["dist_50"])
            expected = round(
                max(
                    abs(median - float(gcns_row["dist_16"])),
                    abs(float(gcns_row["dist_84"]) - median),
                )
                * 1000,
                12,
            )
        else:
            cns5_row = cns5.get(adopted.get("cns5_id"))
            if (
                cns5_row
                and cns5_row.get("parallax")
                and cns5_row.get("parallax_error")
            ):
                parallax = float(cns5_row["parallax"])
                expected = round(
                    1000
                    * float(cns5_row["parallax_error"])
                    / (parallax * parallax),
                    12,
                )
        if system["distance_uncertainty_pc"] != expected:
            raise ValueError(
                f"{candidate['id']} distance uncertainty is not source-derived"
            )


def validate_runtime(document: dict[str, Any], manifests: dict[str, Any], candidates: dict[str, Any], review: dict[str, Any], landmarks: dict[str, Any], config: dict[str, Any]) -> None:
    validate_schema(document, ROOT / "data" / "schema" / "nearby-systems.schema.json", "Nearby systems")
    if GENERATED_PATH.stat().st_size > MAX_RUNTIME_BYTES or len(document["systems"]) > MAX_SYSTEMS:
        raise ValueError("Runtime astronomy output exceeds a reviewed size budget")
    if document["metadata"]["configuration"]["context_radius_ly"] != config["context_radius_ly"]:
        raise ValueError("Runtime context radius differs from its sole configuration owner")
    if (
        document["metadata"]["generated_at"]
        != max(manifest["retrieved_at"] for manifest in manifests.values())
        or document["metadata"]["coordinate_frame"]
        != "Sun-centered Galactic Cartesian"
        or document["metadata"]["units"] != "pc"
        or document["metadata"]["render_mapping"]
        != "scene.x=Xg; scene.y=Zg; scene.z=-Yg"
    ):
        raise ValueError(
            "Runtime metadata differs from its deterministic source contract"
        )
    for key, manifest in manifests.items():
        runtime_source = document["metadata"]["sources"].get(key)
        if key == "wds":
            expected = {
                "snapshot_sha256": manifest["uncompressed_sha256"],
                "candidate_sha256": manifest["candidate_sha256"],
                "row_count": manifest["row_count"],
                "candidate_row_count": manifest["candidate_row_count"],
                "acknowledgement": manifest["acknowledgement"],
            }
        elif key == "c20pc":
            expected = {
                "table4_sha256": manifest["queries"]["table4"][
                    "normalised_sha256"
                ],
                "notes_sha256": manifest["queries"]["notes4"][
                    "normalised_sha256"
                ],
                "references_sha256": manifest["queries"]["refs"][
                    "normalised_sha256"
                ],
                "table4_row_count": manifest["queries"]["table4"][
                    "row_count"
                ],
                "notes_row_count": manifest["queries"]["notes4"][
                    "row_count"
                ],
                "reference_row_count": manifest["queries"]["refs"][
                    "row_count"
                ],
                "acknowledgement": manifest["acknowledgement"],
            }
        else:
            expected = {
                field: manifest[field]
                for field in ("normalised_sha256", "row_count", "acknowledgement")
            }
        if runtime_source != expected:
            raise ValueError(f"Runtime {key} provenance differs from its pinned manifest")
    system_ids = [system["id"] for system in document["systems"]]
    system_names = [system["name"].casefold() for system in document["systems"]]
    if document["systems"][0]["id"] != "sol" or len(system_ids) != len(set(system_ids)):
        raise ValueError("Runtime systems must start with Sol and have unique IDs")
    if len(system_names) != len(set(system_names)):
        raise ValueError("Runtime preferred system names are not catalogue-unique")
    expected_sol = {
        "id": "sol",
        "name": "Sol",
        "alternates": ["Sun"],
        "position_pc": {"xg": 0.0, "yg": 0.0, "zg": 0.0},
        "render_position": {"x": 0.0, "y": 0.0, "z": 0.0},
        "distance_from_sol_pc": 0.0,
        "distance_uncertainty_pc": 0.0,
        "components": [
            {
                "id": "stellar-component-sol",
                "gaia_source_id": None,
                "cns5_id": None,
                "source_identities": [],
                "gaia_enrichment": None,
                "c20pc_enrichment": None,
                "object_class": "star",
                "designation": "Sol",
                "identifiers": {
                    "gaia_dr3_source_id": None,
                    "gcns_source_id": None,
                    "cns5_id": None,
                    "gj_id": None,
                    "hip_id": None,
                    "cns5_component_id": None,
                    "cns6_system_id": None,
                    "c20pc_source_key": None,
                    "wise_id": None,
                    "twomass_id": None,
                    "published_name": None,
                },
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
                "photometry": {
                    "g_magnitude": None,
                    "bp_rp": None,
                },
                "visual": {
                    "color_family": "yellow",
                    "marker_radius": 0.09,
                    "intensity": 1.0,
                    "pick_radius": 0.09,
                    "derivation": "generated Sol origin",
                    "source_facts": {
                        "effective_temperature_k": None,
                        "spectral_type": None,
                        "bp_rp": None,
                        "wds_spectral_type": None,
                        "c20pc_effective_temperature_k": None,
                        "c20pc_spectral_type": None,
                        "object_class": "star",
                    },
                },
                "provenance": {
                    "position": "generated canonical origin",
                    "catalogues": [],
                    "enrichment": None,
                },
            }
        ],
        "provenance": {
            "catalogues": ["Generated canonical origin"],
            "source_object_ids": [],
            "adopted_component_id": "stellar-component-sol",
            "review_version": review["schema_version"],
            "wds_designations": [],
        },
    }
    if document["systems"][0] != expected_sol:
        raise ValueError(
            "Sol differs from the deterministic canonical-origin contract"
        )
    runtime_components = [component for system in document["systems"] for component in system["components"]]
    component_ids = [component["id"] for component in runtime_components]
    if len(component_ids) != len(set(component_ids)):
        raise ValueError("Runtime components are assigned to more than one system")
    for system in document["systems"]:
        position, render = system["position_pc"], system["render_position"]
        if render != {"x": position["xg"], "y": position["zg"], "z": -position["yg"]}:
            raise ValueError(f"{system['id']} violates the canonical scene mapping")
        if not all(math.isfinite(position[axis]) for axis in ("xg", "yg", "zg")):
            raise ValueError(f"{system['id']} has a non-finite canonical coordinate")
    reviewed_wds: dict[str, list[dict[str, Any]]] = {}
    for decision in review.get("wds_decisions", []):
        reviewed_wds.setdefault(decision["system_id"], []).append(
            {
                "wds_coordinate": decision["wds_coordinate"],
                "discoverer": decision["discoverer"],
                "components": decision["components"],
                "component_ids": list(decision["component_ids"]),
                "membership_action": decision["membership_action"],
                "reason": decision["reason"],
            }
        )
    for values in reviewed_wds.values():
        values.sort(
            key=lambda item: (
                item["wds_coordinate"],
                item["discoverer"],
                item["components"],
                item["membership_action"],
            )
        )
    for system in document["systems"]:
        if system["id"] == "sol":
            expected_source_ids: list[str] = []
        else:
            expected_source_ids = sorted(
                {
                    *{
                        identity
                        for component in system["components"]
                        for identity in component["source_identities"]
                    },
                    *{
                        "wds:"
                        + decision["wds_coordinate"]
                        + ":"
                        + decision["discoverer"]
                        + decision["components"]
                        for decision in reviewed_wds.get(system["id"], [])
                    },
                }
            )
        if (
            system["provenance"]["wds_designations"]
            != reviewed_wds.get(system["id"], [])
            or system["provenance"]["source_object_ids"]
            != expected_source_ids
        ):
            raise ValueError(
                f"{system['id']} has incomplete WDS or source-identity provenance"
            )
    radius_pc = config["context_radius_ly"] / LY_PER_PC
    if radius_pc >= 100:
        raise ValueError("Required context sphere crosses the 100 pc GCNS boundary")
    candidates_by_id = {candidate["id"]: candidate for candidate in candidates["systems"]}
    overrides = {entry["candidate_system_id"]: entry for entry in review.get("overrides", [])}
    components_by_id = {component["id"]: component for component in candidates["components"]}
    anchor_positions = {"sol": {"xg": 0.0, "yg": 0.0, "zg": 0.0}}
    for bootstrap in review.get("anchor_bootstraps", []):
        candidate = candidates_by_id.get(bootstrap.get("system_id"))
        if candidate is None:
            raise ValueError("Reviewed anchor bootstrap references a missing candidate system")
        adopted_id = overrides.get(candidate["id"], {}).get("adopted_component_id", candidate["adopted_component_candidate"])
        position = components_by_id[adopted_id]["position_pc"]
        if position is None:
            raise ValueError("Reviewed anchor bootstrap lacks source-backed geometry")
        if distance(position, {"xg": 0.0, "yg": 0.0, "zg": 0.0}) + radius_pc > 100:
            raise ValueError("Required context sphere crosses the 100 pc GCNS boundary")
        anchor_positions[bootstrap["anchor_id"]] = position
    if set(anchor_positions) != set(mapped_anchor_ids()):
        raise ValueError("Mapped anchors lack reviewed source-backed bootstrap records")
    expected_ids = {"sol"}
    expected_systems: list[
        tuple[float, str, dict[str, Any], str, dict[str, float]]
    ] = []
    for system_id, candidate in candidates_by_id.items():
        adopted_id = overrides.get(system_id, {}).get("adopted_component_id", candidate["adopted_component_candidate"])
        if adopted_id is None:
            continue
        adopted = components_by_id[adopted_id]["position_pc"]
        if adopted and any(distance(adopted, anchor) <= radius_pc + 1e-12 for anchor in anchor_positions.values()):
            expected_ids.add(system_id)
            expected_systems.append(
                (
                    round(
                        distance(
                            adopted,
                            {"xg": 0.0, "yg": 0.0, "zg": 0.0},
                        ),
                        12,
                    ),
                    system_id,
                    candidate,
                    adopted_id,
                    adopted,
                )
            )
    if set(system_ids) != expected_ids:
        raise ValueError("Runtime systems do not equal the required reconciled source union")
    expected_systems.sort(key=lambda item: (item[0], item[1]))
    expected_system_order = ["sol", *[item[1] for item in expected_systems]]
    if system_ids != expected_system_order:
        raise ValueError(
            "Runtime system ordering differs from deterministic distance ordering"
        )
    runtime_by_id = {system["id"]: system for system in document["systems"]}
    component_overrides = {
        entry["candidate_component_id"]: entry
        for entry in review.get("component_overrides", [])
    }
    for (
        expected_distance,
        system_id,
        candidate,
        adopted_id,
        adopted_position,
    ) in expected_systems:
        runtime_system = runtime_by_id[system_id]
        override = overrides.get(system_id, {})
        expected_name = override.get(
            "name", candidate["preferred_name_candidate"]
        )
        expected_alternates = sorted(
            set(
                override.get(
                    "alternates",
                    candidate["alternate_name_candidates"],
                )
            )
        )
        expected_component_ids = candidate["component_ids"]
        actual_component_ids = [
            component["id"] for component in runtime_system["components"]
        ]
        expected_catalogues = sorted(
            {
                *{
                    catalogue
                    for component in runtime_system["components"]
                    for catalogue in component["provenance"]["catalogues"]
                },
                *(
                    ["WDS"]
                    if reviewed_wds.get(system_id)
                    else []
                ),
            }
        )
        expected_system_facts = {
            "name": expected_name,
            "alternates": expected_alternates,
            "position_pc": adopted_position,
            "render_position": {
                "x": adopted_position["xg"],
                "y": adopted_position["zg"],
                "z": -adopted_position["yg"],
            },
            "distance_from_sol_pc": expected_distance,
        }
        for field, expected in expected_system_facts.items():
            if runtime_system[field] != expected:
                raise ValueError(
                    f"{system_id} {field} differs from its deterministic source"
                )
        if actual_component_ids != expected_component_ids:
            raise ValueError(
                f"{system_id} component order differs from its accepted candidate"
            )
        if (
            runtime_system["provenance"]["adopted_component_id"]
            != adopted_id
            or runtime_system["provenance"]["review_version"]
            != review["schema_version"]
            or runtime_system["provenance"]["catalogues"]
            != expected_catalogues
        ):
            raise ValueError(
                f"{system_id} provenance differs from its deterministic source"
            )
        for component in runtime_system["components"]:
            expected_designation = component_overrides.get(
                component["id"], {}
            ).get(
                "name",
                components_by_id[component["id"]][
                    "preferred_name_candidate"
                ],
            )
            if component["designation"] != expected_designation:
                raise ValueError(
                    f"{component['id']} designation differs from review"
                )
    coverage = document["metadata"]["coverage"]
    coverage_by_id = {entry["anchor_id"]: entry for entry in coverage}
    if set(coverage_by_id) != set(anchor_positions):
        raise ValueError("Runtime coverage proof does not describe every selected neighbourhood")
    for anchor_id, anchor_position in anchor_positions.items():
        covered = [system for system in document["systems"][1:] if distance(system["position_pc"], anchor_position) <= radius_pc + 1e-12]
        proof = coverage_by_id[anchor_id]
        if (
            proof["anchor_position_pc"] != anchor_position
            or proof["radius_ly"] != config["context_radius_ly"]
            or proof["system_count"] != len(covered)
            or proof["source_record_count"]
            != sum(len(system["components"]) for system in covered)
            or proof["gcns_boundary_pc"] != 100
        ):
            raise ValueError("Runtime coverage proof is incorrect")
    validate_schema(
        landmarks,
        ROOT / "data" / "schema" / "major-local-systems.schema.json",
        "Major local systems",
    )
    landmark_ids = [entry["system_id"] for entry in landmarks["systems"]]
    if len(landmark_ids) != len(set(landmark_ids)):
        raise ValueError("Landmark roster contains duplicate stable system IDs")
    runtime_by_id = {system["id"]: system for system in document["systems"]}
    for landmark in landmarks["systems"]:
        system = runtime_by_id.get(landmark.get("system_id"))
        if system is None or system["name"] != landmark.get("name"):
            raise ValueError("Mandatory local landmark system is missing")
        runtime_components = {
            component["id"]: component["designation"]
            for component in system["components"]
        }
        expected_components = {
            component["component_id"]: component["name"]
            for component in landmark["components"]
        }
        if not expected_components.items() <= runtime_components.items():
            raise ValueError(
                "Mandatory local landmark stable membership is incomplete"
            )


def main() -> None:
    parser = argparse.ArgumentParser(description="Independently validate the reconciled BOB-013 astronomy inputs and runtime output.")
    parser.parse_args()
    config = read_json(CONFIG_PATH)
    validate_schema(config, CONFIG_SCHEMA_PATH, "Map display configuration")
    gcns_manifest, gcns_rows = validate_extract("gcns", GCNS_COLUMNS, "source_id")
    cns5_manifest, cns5_rows = validate_extract("cns5", CNS5_COLUMNS, "cns5_id")
    gaia_manifest, gaia_rows = validate_extract("gaia_dr3", GAIA_COLUMNS, "source_id")
    c20pc_manifest, c20pc_rows = validate_c20pc()
    registry = read_json(IDENTITY_REGISTRY_PATH)
    candidates = read_json(CANDIDATES_PATH)
    review = read_json(REVIEW_PATH)
    landmarks = read_json(LANDMARKS_PATH)
    validate_wds(
        cns5_rows, review, gcns_rows, gaia_rows, candidates
    )
    wds_document = read_json(SOURCE_DIR / "wds-membership.json")
    validate_wds_candidate_binding(candidates, wds_document)
    validate_registry(registry)
    validate_acquisition_queries(
        gcns_manifest,
        cns5_manifest,
        gcns_rows,
        cns5_rows,
        review,
        config,
        mapped_anchor_ids(),
    )
    validate_join_accounting(gcns_rows, cns5_rows, gaia_rows, gaia_manifest)
    validate_source_union(gcns_rows, cns5_rows, candidates)
    validate_cns5_astrometry_overrides(review, cns5_rows)
    validate_candidate_geometry(
        gcns_rows,
        cns5_rows,
        candidates,
        review.get("cns5_astrometry_overrides", []),
    )
    validate_candidates(candidates, review, registry)
    validate_c20pc_bindings(
        c20pc_manifest,
        c20pc_rows,
        candidates,
        review,
        gcns_rows,
        cns5_rows,
    )
    validate_anchor_bootstraps(
        review, candidates, gcns_rows, cns5_rows, mapped_anchor_ids()
    )
    wds_manifest = wds_document["source"]
    runtime = read_json(GENERATED_PATH)
    validate_runtime_presentation(
        runtime, gcns_rows, cns5_rows, gaia_rows, candidates, review
    )
    validate_runtime_uncertainty(runtime, candidates, gcns_rows, cns5_rows)
    validate_runtime(runtime, {"gcns": gcns_manifest, "cns5": cns5_manifest, "gaia_dr3": gaia_manifest, "wds": wds_manifest, "c20pc": c20pc_manifest}, candidates, review, landmarks, config)
    print(f"Validated {len(read_json(GENERATED_PATH)['systems'])} reconciled systems and five pinned astronomy sources")


if __name__ == "__main__":
    main()
