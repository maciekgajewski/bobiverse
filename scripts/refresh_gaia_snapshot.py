from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import math
import urllib.parse
import urllib.request
from pathlib import Path

from common import (
    CONFIG_PATH,
    GAIA_ACKNOWLEDGEMENT,
    GAIA_ARCHIVE_URL,
    GAIA_CATALOGUE,
    GAIA_RELEASE,
    LIGHT_YEARS_PER_PARSEC,
    RAW_SNAPSHOT_PATH,
    REVIEW_PATH,
    SNAPSHOT_PATH,
    mapped_anchor_ids,
    read_json,
    sha256,
    write_json,
)

FIELDNAMES = [
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


QUALITY_CLAUSES = [
    "parallax_over_error >= 10",
    "visibility_periods_used >= 8",
    "ruwe < 1.4",
    "astrometric_params_solved IN (31, 95)",
]
ENVELOPE_MARGIN = 1e-9


def query_text(clauses: list[str]) -> str:
    columns = ", ".join(FIELDNAMES)
    return "\n".join(
        [
            f"SELECT {columns}",
            "FROM gaiadr3.gaia_source",
            f"WHERE {clauses[0]}",
            *[f"  AND {clause}" for clause in clauses[1:]],
            "ORDER BY source_id",
        ]
    )


def build_neighbourhood_query(
    radius_ly: float, anchor: dict[str, str] | None
) -> str:
    radius_pc = radius_ly / LIGHT_YEARS_PER_PARSEC
    if anchor is None:
        minimum_parallax = (1000 / radius_pc) * (1 - ENVELOPE_MARGIN)
        clauses = [f"parallax >= {minimum_parallax:.12f}", *QUALITY_CLAUSES]
        return query_text(clauses)

    anchor_distance_pc = 1000 / float(anchor["parallax"])
    minimum_parallax_mas = (
        1000 / (anchor_distance_pc + radius_pc) * (1 - ENVELOPE_MARGIN)
    )
    clauses = [f"parallax >= {minimum_parallax_mas:.12f}"]
    if anchor_distance_pc > radius_pc:
        maximum_parallax_mas = (
            1000 / (anchor_distance_pc - radius_pc) * (1 + ENVELOPE_MARGIN)
        )
        angular_radius_deg = (
            math.degrees(math.asin(radius_pc / anchor_distance_pc))
            + ENVELOPE_MARGIN
        )
        clauses.extend(
            [
                f"parallax <= {maximum_parallax_mas:.12f}",
                (
                    f"DISTANCE({float(anchor['ra']):.12f}, "
                    f"{float(anchor['dec']):.12f}, ra, dec) "
                    f"<= {angular_radius_deg:.12f}"
                ),
            ]
        )
    clauses.extend(QUALITY_CLAUSES)
    return query_text(clauses)


def build_anchor_lookup_query(source_ids: list[str]) -> str:
    identifiers = ", ".join(source_ids)
    return query_text([f"source_id IN ({identifiers})", *QUALITY_CLAUSES])


def download_csv(query: str) -> bytes:
    body = urllib.parse.urlencode(
        {
            "REQUEST": "doQuery",
            "LANG": "ADQL",
            "FORMAT": "csv",
            "QUERY": query,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        GAIA_ARCHIVE_URL,
        data=body,
        headers={"User-Agent": "bobiverse-astronomy-import/1.0"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read()


def normalized_rows(raw: bytes) -> list[dict[str, str]]:
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames != FIELDNAMES:
        raise ValueError(
            f"Gaia CSV fields do not match the pinned contract: {reader.fieldnames}"
        )
    rows = list(reader)
    if not rows:
        raise ValueError("Gaia query returned no qualifying records")
    source_ids = [row["source_id"] for row in rows]
    if any(not source_id.isdigit() for source_id in source_ids):
        raise ValueError("Gaia query returned an invalid source_id")
    if len(source_ids) != len(set(source_ids)):
        raise ValueError("Gaia query returned duplicate source IDs")
    return sorted(rows, key=lambda row: int(row["source_id"]))


def write_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDNAMES, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Refresh the pinned Gaia DR3 neighbourhood snapshot."
    )
    parser.parse_args()

    config = read_json(CONFIG_PATH)
    review = read_json(REVIEW_PATH)
    radius_ly = float(config["context_radius_ly"])
    if not math.isfinite(radius_ly) or radius_ly <= 0:
        raise ValueError("context_radius_ly must be finite and positive")
    review_by_id = {system["id"]: system for system in review["systems"]}
    anchor_ids = mapped_anchor_ids()
    missing_reviews = [
        anchor_id
        for anchor_id in anchor_ids
        if anchor_id != "sol" and anchor_id not in review_by_id
    ]
    if missing_reviews:
        raise ValueError(
            f"Mapped astronomy anchors lack Gaia system review: {missing_reviews}"
        )

    external_anchor_ids = [anchor_id for anchor_id in anchor_ids if anchor_id != "sol"]
    adopted_by_anchor = {
        anchor_id: review_by_id[anchor_id]["adopt_gaia_source_id"]
        for anchor_id in external_anchor_ids
    }
    invalid_source_ids = [
        source_id
        for source_id in adopted_by_anchor.values()
        if not source_id.isdigit()
    ]
    if invalid_source_ids:
        raise ValueError(
            f"Reviewed anchor Gaia IDs must be decimal integers: {invalid_source_ids}"
        )
    rows_by_id: dict[str, dict[str, str]] = {}
    if external_anchor_ids:
        lookup_query = build_anchor_lookup_query(
            list(adopted_by_anchor.values())
        )
        rows_by_id.update(
            (row["source_id"], row)
            for row in normalized_rows(download_csv(lookup_query))
        )

    queries = []
    for anchor_id in anchor_ids:
        anchor = (
            None
            if anchor_id == "sol"
            else rows_by_id.get(adopted_by_anchor[anchor_id])
        )
        if anchor_id != "sol" and anchor is None:
            raise ValueError(
                f"Gaia snapshot lacks adopted anchor source for {anchor_id}"
        )
        query = build_neighbourhood_query(radius_ly, anchor)
        queries.append({"anchor_id": anchor_id, "adql": query})
        rows_by_id.update(
            (row["source_id"], row)
            for row in normalized_rows(download_csv(query))
        )

    rows = sorted(rows_by_id.values(), key=lambda row: int(row["source_id"]))
    write_csv(RAW_SNAPSHOT_PATH, rows)

    metadata = {
        "schema_version": "1.0.0",
        "source": {
            "catalogue": GAIA_CATALOGUE,
            "release": GAIA_RELEASE,
            "archive_url": GAIA_ARCHIVE_URL,
            "documentation_url": "https://gea.esac.esa.int/archive/documentation/GDR3/",
            "retrieved_at": dt.datetime.now(dt.UTC)
            .replace(microsecond=0)
            .isoformat(),
            "acknowledgement": GAIA_ACKNOWLEDGEMENT,
        },
        "quality_contract": {
            "astrometric_params_solved": [31, 95],
            "minimum_parallax_over_error": 10,
            "minimum_visibility_periods_used": 8,
            "maximum_ruwe": 1.4,
        },
        "queries": queries,
        "raw_snapshot": {
            "path": str(
                RAW_SNAPSHOT_PATH.relative_to(
                    RAW_SNAPSHOT_PATH.parent.parent.parent
                )
            ),
            "sha256": sha256(RAW_SNAPSHOT_PATH),
            "row_count": len(rows),
        },
    }
    write_json(SNAPSHOT_PATH, metadata)
    print(
        f"Wrote {len(rows)} Gaia DR3 records to "
        f"{RAW_SNAPSHOT_PATH.relative_to(Path.cwd())}"
    )


if __name__ == "__main__":
    main()
