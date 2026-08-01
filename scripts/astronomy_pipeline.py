"""Deterministic BOB-013 multi-catalogue acquisition and reconciliation helpers.

The browser consumes only the generated JSON.  This module is deliberately the one
place that knows about remote endpoints; generation and validation use the committed
normalised inputs below data/source/.
"""

from __future__ import annotations

import csv
import datetime as dt
import gzip
import io
import json
import math
import re
import html
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any, Iterable

import astropy.units as u
from astropy.coordinates import ICRS, SkyCoord

from common import (
    C20PC_PATH,
    C20PC_README_PATH,
    CANDIDATES_PATH,
    CNS5_PATH,
    CONFIG_PATH,
    GAIA_ENRICHMENT_PATH,
    GCNS_PATH,
    IDENTITY_REGISTRY_PATH,
    LANDMARKS_PATH,
    REVIEW_PATH,
    SOURCE_DIR,
    WDS_FORMAT_PATH,
    WDS_PATH,
    canonical_json_bytes,
    mapped_anchor_names,
    read_json,
    read_gzip,
    resolve_anchor_bootstraps,
    sha256,
    sha256_bytes,
    value_sha256,
    write_json,
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
    EXPECTED_EXTERNAL_REFERENCE_CODES,
    c20pc_enrichment,
    census_rows_by_key,
    exact_identifier_candidates,
    normalize_census_tables,
    normalize_text,
    resolve_coordinate_short_names,
)

GAVO_URL = "https://dc.g-vo.org/tap/sync"
GAIA_URL = "https://gea.esac.esa.int/tap-server/tap/sync"
WDS_URL = "https://www.astro.gsu.edu/wds/Webtextfiles/wds_precise.txt"
WDS_FORMAT_URL = "https://www.astro.gsu.edu/wds/Webtextfiles/wdsweb_format.txt"
LY_PER_PC = 3.261563777
GCNS_LIMIT_PC = 100.0

GCNS_COLUMNS = [
    "source_id", "ra", "dec", "ra_error", "dec_error", "parallax",
    "parallax_error", "pmra", "pmra_error", "pmdec", "pmdec_error",
    "phot_g_mean_mag", "phot_bp_mean_mag", "phot_rp_mean_mag",
    "phot_bp_rp_excess_factor", "ruwe", "ipd_frac_multi_peak", "adoptedrv",
    "adoptedrv_error", "adoptedrv_refname", "radial_velocity_is_valid",
    "gcns_prob", "wd_prob", "dist_1", "dist_16", "dist_50", "dist_84",
    "xcoord_16", "xcoord_50", "xcoord_84", "ycoord_16", "ycoord_50",
    "ycoord_84", "zcoord_16", "zcoord_50", "zcoord_84",
]
CNS5_COLUMNS = [
    "cns5_id", "gj_id", "component_id", "n_components", "primary_flag",
    "gj_system_primary", "gaia_dr3_id", "hip_id", "ra", "dec", "epoch",
    "coordinates_bibcode", "parallax", "parallax_error", "parallax_bibcode",
    "pmra", "pmra_error", "pmdec", "pmdec_error", "pm_bibcode", "rv",
    "rv_error", "rv_bibcode", "g_mag", "g_mag_error", "bp_mag",
    "bp_mag_error", "rp_mag", "rp_mag_error", "g_mag_resulting",
    "g_mag_resulting_error", "g_rp_resulting", "g_rp_resulting_error",
    "g_rp_resulting_flag", "cns6_system_id", "reference_object_cns5_id",
    "multiplicity_bibcode", "remarks",
]
GAIA_COLUMNS = [
    "source_id", "phot_g_mean_mag", "phot_bp_mean_mag", "phot_rp_mean_mag",
    "bp_rp", "radial_velocity", "radial_velocity_error", "phot_variable_flag",
    "non_single_star", "teff_gspphot", "logg_gspphot", "lum_flame",
    "radius_flame", "spectraltype_esphs", "classprob_dsc_combmod_star",
    "best_class_name", "best_class_score",
]

ACKNOWLEDGEMENTS = {
    "gcns": "Gaia Catalogue of Nearby Stars data from GAVO DC.",
    "cns5": "CNS5 data from GAVO DC; cite Golovin et al. (2023).",
    "gaia_dr3": (
        "This work has made use of data from the European Space Agency (ESA) mission "
        "Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing "
        "and Analysis Consortium (DPAC, https://www.cosmos.esa.int/web/gaia/dpac/consortium)."
    ),
    "wds": "This research has made use of the Washington Double Star Catalog maintained at the U.S. Naval Observatory.",
}


def now() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat()


def optional_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def decimal_id(value: Any) -> str | None:
    if value is None or str(value).strip() == "":
        return None
    candidate = str(value).strip()
    if candidate.endswith(".0"):
        candidate = candidate[:-2]
    return candidate if candidate.isdecimal() else None


def cns5_astrometry_issue(record: dict[str, Any]) -> str | None:
    ra, dec, parallax = (optional_float(record.get(key)) for key in ("ra", "dec", "parallax"))
    if (
        ra is None
        or not 0 <= ra < 360
        or dec is None
        or not -90 <= dec <= 90
        or parallax is None
        or parallax <= 0
    ):
        return "missing, non-finite, or out-of-range RA/Dec/parallax"
    if not record.get("coordinates_bibcode") or not record.get(
        "parallax_bibcode"
    ):
        return "coordinate or parallax authority bibcode is missing"
    for field in ("parallax_error", "pmra_error", "pmdec_error"):
        value = record.get(field)
        if value not in {None, ""}:
            number = optional_float(value)
            if number is None or number < 0:
                return f"{field} is non-finite or negative"
    remarks = str(record.get("remarks", ""))
    if re.search(
        r"\b(spurious|unreliable|rejected|erroneous|disputed|uncertain)\b"
        r"|mis-identification|does not exist| is not ",
        remarks,
        flags=re.IGNORECASE,
    ):
        return "CNS5 remarks flag a possible astrometry or identity conflict"
    return None


def position_from_cns5(
    record: dict[str, Any], *, review_decision: str | None = None
) -> dict[str, float] | None:
    issue = cns5_astrometry_issue(record)
    if review_decision == "reject":
        return None
    reviewable_warning = (
        "CNS5 remarks flag a possible astrometry or identity conflict"
    )
    if issue is not None and not (
        issue == reviewable_warning and review_decision == "accept"
    ):
        return None
    ra, dec, parallax = (
        float(record[key]) for key in ("ra", "dec", "parallax")
    )
    coordinate = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, distance=(1000 / parallax) * u.pc, frame=ICRS()).galactic.cartesian
    return {"xg": round(coordinate.x.to_value(u.pc), 12), "yg": round(coordinate.y.to_value(u.pc), 12), "zg": round(coordinate.z.to_value(u.pc), 12)}


def distance(first: dict[str, float], second: dict[str, float]) -> float:
    return math.sqrt(sum((first[axis] - second[axis]) ** 2 for axis in ("xg", "yg", "zg")))


def tap_csv(endpoint: str, query: str) -> list[dict[str, str]]:
    body = urllib.parse.urlencode({"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": query}).encode()
    request = urllib.request.Request(endpoint, data=body, headers={"User-Agent": "bobiverse-astronomy-import/2.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        raw = response.read()
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    if reader.fieldnames is None:
        raise ValueError("TAP response has no CSV header")
    return list(reader)


def gavo_upstream_updated_at(table: str) -> str:
    request = urllib.request.Request(
        f"https://dc.g-vo.org/tableinfo/{table}",
        headers={"User-Agent": "bobiverse-astronomy-import/2.0"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        contents = response.read().decode("utf-8", errors="replace")
    match = re.search(
        r"Data updated</h4>.*?plainmeta[^>]*>([^<]+)</span>",
        contents,
        flags=re.DOTALL,
    )
    if match is None:
        raise ValueError(f"GAVO table metadata lacks Data updated for {table}")
    return html.unescape(match.group(1)).strip()


def csv_bytes(columns: list[str], rows: list[dict[str, Any]]) -> bytes:
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=columns, lineterminator="\n", extrasaction="raise")
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue().encode()


def normalise_rows(columns: list[str], rows: Iterable[dict[str, Any]], id_key: str) -> list[dict[str, str]]:
    normalised = [{key: "" if row.get(key) is None else str(row.get(key)).strip() for key in columns} for row in rows]
    ids = [row[id_key] for row in normalised]
    if any(not identifier for identifier in ids) or len(ids) != len(set(ids)):
        raise ValueError(f"{id_key} must be present and unique")
    return sorted(normalised, key=lambda row: int(decimal_id(row[id_key]) or 0) if decimal_id(row[id_key]) else row[id_key])


def source_paths(key: str) -> tuple[Path, Path]:
    names = {
        "gcns": (SOURCE_DIR / "gcns-neighbourhood.csv", GCNS_PATH),
        "cns5": (SOURCE_DIR / "cns5-nearby-components.csv", CNS5_PATH),
        "gaia_dr3": (SOURCE_DIR / "gaia-dr3-enrichment.csv", GAIA_ENRICHMENT_PATH),
    }
    return names[key]


def write_extract(key: str, columns: list[str], rows: list[dict[str, str]], manifest: dict[str, Any]) -> None:
    csv_path, json_path = source_paths(key)
    payload = csv_bytes(columns, rows)
    csv_path.write_bytes(payload)
    document = {"schema_version": "2.0.0", "source": manifest, "rows": rows}
    write_json(json_path, document)


def manifest(key: str, *, endpoint: str, table: str | None, query: str | None, rows: list[dict[str, str]], columns: list[str], extra: dict[str, Any] | None = None) -> dict[str, Any]:
    result: dict[str, Any] = {
        "catalogue": key,
        "endpoint": endpoint,
        "table": table,
        "adql": query,
        "columns": columns,
        "retrieved_at": now(),
        "row_count": len(rows),
        "normalised_sha256": sha256_bytes(csv_bytes(columns, rows)),
        "acknowledgement": ACKNOWLEDGEMENTS[key],
    }
    if extra:
        result.update(extra)
    return result


def read_extract(key: str) -> tuple[dict[str, Any], list[dict[str, str]]]:
    _, path = source_paths(key)
    document = read_json(path)
    if document.get("schema_version") != "2.0.0" or not isinstance(document.get("rows"), list):
        raise ValueError(f"{path.name} has an unsupported extract schema")
    return document["source"], document["rows"]


def read_c20pc() -> tuple[
    dict[str, Any],
    list[dict[str, Any]],
    list[dict[str, Any]],
    list[dict[str, Any]],
]:
    document = read_json(C20PC_PATH)
    if document.get("schema_version") != "1.0.0":
        raise ValueError("20-pc census has an unsupported extract schema")
    return (
        document["source"],
        document["table4"],
        document["notes4"],
        document["references"],
    )


def refresh_c20pc_snapshot() -> None:
    table, notes, references = normalize_census_tables(
        tap_csv(C20PC_TAP_URL, C20PC_TABLE_QUERY),
        tap_csv(C20PC_TAP_URL, C20PC_NOTES_QUERY),
        tap_csv(C20PC_TAP_URL, C20PC_REFS_QUERY),
    )
    request = urllib.request.Request(
        C20PC_README_URL,
        headers={"User-Agent": "bobiverse-astronomy-import/3.0"},
    )
    with urllib.request.urlopen(request, timeout=180) as response:
        readme = response.read()
    readme_text = readme.decode("utf-8")
    if (
        C20PC_README_HISTORY_DATE not in readme_text
        or C20PC_BIBCODE not in readme_text
    ):
        raise ValueError("20-pc ReadMe does not identify the pinned catalogue version")
    C20PC_README_PATH.write_bytes(readme)
    queries = {
        "table4": {
            "table": f"{C20PC_CATALOGUE}/table4",
            "media_type": "text/csv",
            "adql": C20PC_TABLE_QUERY,
            "columns": C20PC_TABLE_COLUMNS,
            "row_count": len(table),
            "normalised_sha256": value_sha256(table),
        },
        "notes4": {
            "table": f"{C20PC_CATALOGUE}/notes4",
            "media_type": "text/csv",
            "adql": C20PC_NOTES_QUERY,
            "columns": C20PC_NOTES_COLUMNS,
            "row_count": len(notes),
            "transport_row_count": sum(
                1 + len(row["continuation_recnos"]) for row in notes
            ),
            "normalised_sha256": value_sha256(notes),
        },
        "refs": {
            "table": f"{C20PC_CATALOGUE}/refs",
            "media_type": "text/csv",
            "adql": C20PC_REFS_QUERY,
            "columns": C20PC_REFS_COLUMNS,
            "row_count": len(references),
            "normalised_sha256": value_sha256(references),
        },
    }
    write_json(
        C20PC_PATH,
        {
            "schema_version": "1.0.0",
            "source": {
                "catalogue": C20PC_CATALOGUE,
                "catalogue_doi": C20PC_CATALOGUE_DOI,
                "publication_doi": C20PC_PUBLICATION_DOI,
                "publication_bibcode": C20PC_BIBCODE,
                "endpoint": C20PC_TAP_URL,
                "readme_url": C20PC_README_URL,
                "readme_history_date": C20PC_README_HISTORY_DATE,
                "readme_media_type": "text/plain; charset=utf-8",
                "readme_sha256": sha256_bytes(readme),
                "retrieved_at": now(),
                "acknowledgement": C20PC_ACKNOWLEDGEMENT,
                "external_reference_codes": EXPECTED_EXTERNAL_REFERENCE_CODES,
                "queries": queries,
            },
            "table4": table,
            "notes4": notes,
            "references": references,
        },
    )


def gcns_query(radius_pc: float) -> str:
    return gcns_anchor_query(
        {"xg": 0.0, "yg": 0.0, "zg": 0.0},
        radius_pc,
    )


def gcns_anchor_query(position: dict[str, float], radius_pc: float) -> str:
    columns = ", ".join(GCNS_COLUMNS)
    return (
        f"SELECT {columns}\nFROM gcns.main\nWHERE "
        f"(xcoord_16 <= {position['xg'] + radius_pc:.12f} "
        f"OR xcoord_84 <= {position['xg'] + radius_pc:.12f})\n"
        f"  AND (xcoord_16 >= {position['xg'] - radius_pc:.12f} "
        f"OR xcoord_84 >= {position['xg'] - radius_pc:.12f})\n"
        f"  AND (ycoord_16 <= {position['yg'] + radius_pc:.12f} "
        f"OR ycoord_84 <= {position['yg'] + radius_pc:.12f})\n"
        f"  AND (ycoord_16 >= {position['yg'] - radius_pc:.12f} "
        f"OR ycoord_84 >= {position['yg'] - radius_pc:.12f})\n"
        f"  AND (zcoord_16 <= {position['zg'] + radius_pc:.12f} "
        f"OR zcoord_84 <= {position['zg'] + radius_pc:.12f})\n"
        f"  AND (zcoord_16 >= {position['zg'] - radius_pc:.12f} "
        f"OR zcoord_84 >= {position['zg'] - radius_pc:.12f})\n"
        "ORDER BY source_id"
    )


def exact_source_query(table: str, columns: list[str], id_column: str, identifiers: list[str]) -> str:
    if not identifiers:
        raise ValueError("Exact source bootstrap needs at least one identifier")
    return f"SELECT {', '.join(columns)}\nFROM {table}\nWHERE {id_column} IN ({', '.join(identifiers)})\nORDER BY {id_column}"


def cns5_query() -> str:
    return f"SELECT {', '.join(CNS5_COLUMNS)}\nFROM cns5update.main\nORDER BY cns5_id"


def gaia_query(ids: list[str]) -> str:
    if not ids:
        raise ValueError("Gaia enrichment requires at least one source_id")
    identifier_list = ", ".join(ids)
    return "\n".join([
        f"SELECT {', '.join('g.' + column for column in GAIA_COLUMNS[:9])},",
        "  ap.teff_gspphot, ap.logg_gspphot, ap.lum_flame, ap.radius_flame,",
        "  ap.spectraltype_esphs, ap.classprob_dsc_combmod_star,",
        "  vc.best_class_name, vc.best_class_score",
        "FROM gaiadr3.gaia_source AS g",
        "LEFT OUTER JOIN gaiadr3.astrophysical_parameters AS ap USING (source_id)",
        "LEFT OUTER JOIN gaiadr3.vari_classifier_result AS vc USING (source_id)",
        f"WHERE g.source_id IN ({identifier_list})",
        "ORDER BY g.source_id",
    ])


def _write_wds() -> dict[str, Any]:
    request = urllib.request.Request(WDS_URL, headers={"User-Agent": "bobiverse-astronomy-import/2.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        contents = response.read()
        last_modified = response.headers.get("Last-Modified")
    format_request = urllib.request.Request(WDS_FORMAT_URL, headers={"User-Agent": "bobiverse-astronomy-import/2.0"})
    with urllib.request.urlopen(format_request, timeout=180) as response:
        format_contents = response.read()
        format_last_modified = response.headers.get("Last-Modified")
    with WDS_PATH.open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
            compressed.write(contents)
    WDS_FORMAT_PATH.write_bytes(format_contents)
    lines = [line for line in contents.splitlines() if line.strip()]
    return {
        "schema_version": "2.0.0", "catalogue": "wds", "endpoint": WDS_URL,
        "format_url": WDS_FORMAT_URL, "retrieved_at": now(), "last_modified": last_modified,
        "format_last_modified": format_last_modified,
        "compressed_sha256": sha256(WDS_PATH), "uncompressed_sha256": sha256_bytes(contents),
        "format_sha256": sha256(WDS_FORMAT_PATH), "row_count": len(lines),
        "acknowledgement": ACKNOWLEDGEMENTS["wds"],
    }


WDS_COORDINATE = re.compile(r"^(\d{2})(\d{2})(\d{2}(?:\.\d+)?)([+-])(\d{2})(\d{2})(\d{2}(?:\.\d+)?)$")


def wds_position(line: str) -> tuple[float, float] | None:
    match = WDS_COORDINATE.match(line[112:130].strip())
    if match is None:
        return None
    hours, minutes, seconds, sign, degrees, arcminutes, arcseconds = match.groups()
    ra = 15 * (int(hours) + int(minutes) / 60 + float(seconds) / 3600)
    dec = int(degrees) + int(arcminutes) / 60 + float(arcseconds) / 3600
    return ra, -dec if sign == "-" else dec


def wds_review_fields(raw: str) -> dict[str, str]:
    return {
        "first_observation_epoch": raw[23:27].strip(),
        "last_observation_epoch": raw[28:32].strip(),
        "observation_count": raw[33:37].strip(),
        "first_position_angle_deg": raw[38:41].strip(),
        "last_position_angle_deg": raw[42:45].strip(),
        "first_separation_arcsec": raw[46:51].strip(),
        "last_separation_arcsec": raw[52:57].strip(),
        "primary_magnitude": raw[58:63].strip(),
        "secondary_magnitude": raw[64:69].strip(),
        "spectral_type": raw[70:79].strip(),
        "primary_pm_ra": raw[80:84].strip(),
        "primary_pm_dec": raw[84:88].strip(),
        "secondary_pm_ra": raw[89:93].strip(),
        "secondary_pm_dec": raw[93:97].strip(),
        "durchmusterung_id": raw[98:106].strip(),
        "notes": raw[107:111].strip(),
        "precise_coordinate": raw[112:130].strip(),
    }


def wds_membership_candidates(
    cns5: list[dict[str, str]],
    contents: bytes,
    reviewed_decisions: list[dict[str, Any]] | None = None,
    gcns: list[dict[str, str]] | None = None,
    gaia: list[dict[str, str]] | None = None,
    landmark_source_identities: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Select review evidence only; it never creates an automatic identity edge."""
    buckets: dict[tuple[int, int], list[tuple[str, float, float]]] = defaultdict(list)
    exact_rows: dict[tuple[str, str, str], str] = {}
    for raw in contents.decode("utf-8", errors="replace").splitlines():
        position = wds_position(raw)
        if position is None:
            continue
        buckets[(int(position[0]), int(position[1]))].append((raw, *position))
        exact_rows[
            (raw[0:10].strip(), raw[10:17].strip(), raw[17:22].strip())
        ] = raw
    selected: dict[tuple[str, ...], dict[str, Any]] = {}
    gcns_by_id = {row["source_id"]: row for row in (gcns or [])}
    cns5_by_gaia = {
        row["gaia_dr3_id"]: row
        for row in cns5
        if row.get("gaia_dr3_id")
    }
    gaia_multiples = {
        row["source_id"]
        for row in (gaia or [])
        if int(optional_float(row.get("non_single_star")) or 0) > 0
    }
    seeds: list[tuple[str, str, dict[str, str]]] = []
    landmark_source_identities = landmark_source_identities or set()
    for record in cns5:
        identity = f"cns5:{record['cns5_id']}"
        gaia_identity = (
            f"gaia-dr3:{record['gaia_dr3_id']}"
            if record.get("gaia_dr3_id")
            else ""
        )
        if (
            int(optional_float(record.get("n_components")) or 1) <= 1
            and record.get("gaia_dr3_id") not in gaia_multiples
            and identity not in landmark_source_identities
            and gaia_identity not in landmark_source_identities
        ):
            continue
        seeds.append(("cns5", record["cns5_id"], record))
    for record in gcns or []:
        identity = f"gaia-dr3:{record['source_id']}"
        if (
            int(optional_float(record.get("ipd_frac_multi_peak")) or 0) <= 0
            and record["source_id"] not in gaia_multiples
            and identity not in landmark_source_identities
        ):
            continue
        seeds.append(("gcns", record["source_id"], record))
    for source_id in gaia_multiples:
        if source_id in gcns_by_id:
            continue
        record = cns5_by_gaia.get(source_id)
        if record:
            seeds.append(("gaia_dr3", source_id, record))
    for seed_catalogue, seed_source_id, record in seeds:
        ra, dec = optional_float(record.get("ra")), optional_float(record.get("dec"))
        if ra is None or dec is None:
            continue
        for ra_bin in (int(ra) - 1, int(ra), int(ra) + 1):
            for dec_bin in (int(dec) - 1, int(dec), int(dec) + 1):
                for raw, wds_ra, wds_dec in buckets.get((ra_bin % 360, dec_bin), []):
                    separation_deg = math.hypot((wds_ra - ra) * math.cos(math.radians(dec)), wds_dec - dec)
                    if separation_deg > 1 / 60:
                        continue
                    row = {
                        "seed_catalogue": seed_catalogue,
                        "seed_source_id": seed_source_id,
                        "wds_coordinate": raw[0:10].strip(),
                        "discoverer": raw[10:17].strip(), "components": raw[17:22].strip(),
                        **wds_review_fields(raw),
                        "selection_reason": "conservative coordinate candidate for review; not an accepted identity edge",
                    }
                    selected[
                        (
                            seed_catalogue,
                            seed_source_id,
                            row["discoverer"] + row["components"],
                        )
                    ] = row
    for decision in reviewed_decisions or []:
        key = (
            decision.get("wds_coordinate", ""),
            decision.get("discoverer", ""),
            decision.get("components", ""),
        )
        raw = exact_rows.get(key)
        if raw is None:
            raise ValueError(
                "Reviewed WDS decision is absent from the complete pinned snapshot: "
                f"{key}"
            )
        row = {
            "system_id": decision["system_id"],
            "membership_action": decision["membership_action"],
            "component_ids": list(decision["component_ids"]),
            "wds_coordinate": key[0],
            "discoverer": key[1],
            "components": key[2],
            **wds_review_fields(raw),
            "selection_reason": f"accepted project review: {decision['reason']}",
        }
        selected[("review", *key, decision["system_id"])] = row
    return [selected[key] for key in sorted(selected)]


def reviewed_landmark_source_identities(
    candidates: dict[str, Any] | None,
) -> set[str]:
    if not candidates or not LANDMARKS_PATH.exists():
        return set()
    components = {
        component["id"]: component
        for component in candidates.get("components", [])
    }
    systems = {
        system["id"]: system
        for system in candidates.get("systems", [])
    }
    return {
        source_identity
        for landmark in read_json(LANDMARKS_PATH).get("systems", [])
        for component_id in {
            *systems.get(landmark["system_id"], {}).get("component_ids", []),
            *{
                component["component_id"]
                for component in landmark.get("components", [])
            },
        }
        if component_id in components
        for source_identity in components[component_id].get(
            "source_identities", []
        )
    }


def wds_component_spectral_types(
    evidence: dict[str, Any],
) -> dict[str, str]:
    """Return only WDS spectral facts attributable to individual components."""
    component_ids = evidence.get("component_ids", [])
    spectral_type = str(evidence.get("spectral_type", "")).strip()
    if not spectral_type or not component_ids:
        return {}
    if len(component_ids) == 1:
        return {component_ids[0]: spectral_type}
    component_spectra = [
        value.strip()
        for value in spectral_type.split("+")
        if value.strip()
    ]
    if len(component_spectra) != len(component_ids):
        return {}
    return dict(zip(component_ids, component_spectra, strict=True))


def source_identity(record: dict[str, Any]) -> str:
    gaia = decimal_id(record.get("gaia_dr3_id"))
    if gaia:
        return f"gaia-dr3:{gaia}"
    return f"cns5:{record['cns5_id']}"


def resolved_cns5_identity(record: dict[str, Any], records_by_id: dict[str, dict[str, Any]]) -> str:
    """Collapse CNS5's explicitly referenced duplicate observational rows.

    `reference_object_cns5_id` is a catalogue-supplied identity edge, unlike a
    positional coincidence.  It is the reason companion proxy rows do not become
    extra application components (for example, Alpha Cen C's reference rows).
    """
    current = record
    seen: set[str] = set()
    while True:
        identifier = str(current["cns5_id"])
        if identifier in seen:
            raise ValueError(f"CNS5 reference-object cycle at {identifier}")
        seen.add(identifier)
        reference = str(current.get("reference_object_cns5_id", "")).strip()
        if reference in {"", "--"}:
            return source_identity(current)
        # A compound reference denotes an ambiguity for the project review layer;
        # it is not an exact component identity edge.
        if not reference.isdecimal():
            return source_identity(current)
        target = records_by_id.get(reference)
        if target is None:
            raise ValueError(f"CNS5 reference object {reference} is absent")
        current = target


def retained_component_identities(
    gcns_source_ids: set[str],
    cns5_primary_identities: set[str],
    cns5_identity_by_gaia_id: dict[str, str],
) -> set[str]:
    """Return one component identity per accepted CNS5/GCNS source graph.

    A GCNS row whose Gaia ID is already an exact source alias inside a CNS5
    reference-object group enriches that accepted component.  It must not also
    manufacture a second singleton component when a newly acquired context envelope
    first brings that GCNS row into the pinned source union.
    """
    return cns5_primary_identities | {
        f"gaia-dr3:{source_id}"
        for source_id in gcns_source_ids
        if source_id and source_id not in cns5_identity_by_gaia_id
    }


def source_name(record: dict[str, Any]) -> tuple[str, list[str]]:
    gj, hip, gaia = (str(record.get(key, "")).strip() for key in ("gj_id", "hip_id", "gaia_dr3_id"))
    candidates = []
    if gj:
        candidates.append(gj if gj.upper().startswith("GJ") else f"GJ {gj}")
    if hip:
        candidates.append(hip if hip.upper().startswith("HIP") else f"HIP {hip}")
    if gaia:
        candidates.append(f"Gaia DR3 {gaia}")
    candidates.append(f"CNS5 {record['cns5_id']}")
    return candidates[0], candidates[1:]


def empty_registry() -> dict[str, Any]:
    return {
        "schema_version": "1.0.0",
        "component_sequence_high_watermark": 0,
        "system_sequence_high_watermark": 0,
        "components": [],
        "systems": [],
    }


def migrate_component_registry(
    registry: dict[str, Any], prior_candidates: dict[str, Any] | None
) -> None:
    """Add exact source aliases to pre-BOB-013 registry entries once."""
    if not prior_candidates:
        return
    entries = {entry["id"]: entry for entry in registry["components"]}
    for component in prior_candidates.get("components", []):
        entry = entries.get(component.get("id"))
        if entry is None or "source_keys" in entry:
            continue
        source_keys = set(
            component.get("source_identities", [component["source_identity"]])
        )
        if component.get("cns5_id"):
            source_keys.add(f"cns5:{component['cns5_id']}")
        if component.get("gaia_source_id"):
            source_keys.add(f"gaia-dr3:{component['gaia_source_id']}")
        entry["source_keys"] = sorted(source_keys)


def allocate_components(
    registry: dict[str, Any],
    groups: dict[str, set[str]],
    transitions: list[dict[str, Any]],
) -> dict[str, str]:
    entries = registry["components"]
    by_key = {entry["key"]: entry for entry in entries}
    for entry in entries:
        entry.setdefault("source_keys", [entry["key"]])
    active = [
        {"entry": entry, "source_keys": set(entry["source_keys"])}
        for entry in entries
        if entry["state"] == "active"
    ]
    tombstoned = [
        {"entry": entry, "source_keys": set(entry["source_keys"])}
        for entry in entries
        if entry["state"] == "tombstoned"
    ]
    used = [entry["id"] for entry in entries]
    high_watermark = max(
        registry.get("component_sequence_high_watermark", 0),
        max([int(value.rsplit("-", 1)[1]) for value in used] or [0]),
    )
    next_number = high_watermark + 1
    result: dict[str, str] = {}
    tombstone_group_counts = {
        snapshot["entry"]["id"]: sum(
            bool(source_keys.intersection(snapshot["source_keys"]))
            for source_keys in groups.values()
        )
        for snapshot in tombstoned
    }
    for key in sorted(groups):
        source_keys = groups[key]
        exact = by_key.get(key)
        active_overlaps = [
            snapshot["entry"]
            for snapshot in active
            if source_keys.intersection(snapshot["source_keys"])
        ]
        tombstoned_overlaps = [
            snapshot["entry"]
            for snapshot in tombstoned
            if source_keys.intersection(snapshot["source_keys"])
        ]
        if (
            exact is not None
            and {entry["id"] for entry in active_overlaps} <= {exact["id"]}
            and not tombstoned_overlaps
            and source_keys == set(exact["source_keys"])
        ):
            exact["state"] = "active"
            exact["source_keys"] = sorted(source_keys)
            result[key] = exact["id"]
            continue
        if (
            not active_overlaps
            and len(tombstoned_overlaps) == 1
            and tombstone_group_counts[tombstoned_overlaps[0]["id"]] == 1
            and tombstoned_overlaps[0]["id"] not in result.values()
        ):
            returning = tombstoned_overlaps[0]
            if returning["key"] != key:
                returning.setdefault("previous_keys", []).append(
                    returning["key"]
                )
                returning["key"] = key
            returning["source_keys"] = sorted(source_keys)
            returning["state"] = "active"
            result[key] = returning["id"]
            continue
        overlaps = [*active_overlaps, *tombstoned_overlaps]
        if overlaps:
            matching = [
                transition
                for transition in transitions
                if sorted(transition.get("from_component_ids", []))
                == sorted(entry["id"] for entry in overlaps)
                and sorted(transition.get("to_source_identities", []))
                == sorted(source_keys)
                and transition.get("reason")
            ]
            if len(matching) != 1:
                raise ValueError(
                    "Component identity changed without one explicit reviewed "
                    f"merge/split transition: {key}"
                )
            surviving_id = matching[0].get("surviving_component_id")
            if surviving_id:
                survivors = [
                    entry for entry in entries if entry["id"] == surviving_id
                ]
                if (
                    len(survivors) != 1
                    or surviving_id not in {entry["id"] for entry in overlaps}
                    or surviving_id in result.values()
                ):
                    raise ValueError(
                        "Reviewed component transition names an invalid surviving ID"
                    )
                survivor = survivors[0]
                survivor.setdefault("previous_keys", []).append(survivor["key"])
                survivor["key"] = key
                survivor["source_keys"] = sorted(source_keys)
                survivor["state"] = "active"
                result[key] = survivor["id"]
                continue
        identifier = f"stellar-component-{next_number:06d}"
        next_number += 1
        entries.append(
            {
                "id": identifier,
                "key": key,
                "source_keys": sorted(source_keys),
                "state": "active",
            }
        )
        result[key] = identifier
        registry["component_sequence_high_watermark"] = next_number - 1
    for entry in entries:
        if entry["id"] not in result.values() and entry["state"] == "active":
            entry["state"] = "tombstoned"
    return result


def allocate_systems(
    registry: dict[str, Any],
    keys: list[str],
    transitions: list[dict[str, Any]],
) -> dict[str, str]:
    requested = set(keys)
    entries = registry["systems"]
    by_key = {entry["key"]: entry for entry in entries}
    active = [
        {"id": entry["id"], "key": entry["key"]}
        for entry in entries
        if entry["state"] == "active"
    ]
    tombstoned = [
        {"id": entry["id"], "key": entry["key"]}
        for entry in entries
        if entry["state"] == "tombstoned"
    ]
    used = [entry["id"] for entry in entries]
    high_watermark = max(
        registry.get("system_sequence_high_watermark", 0),
        max([int(value.rsplit("-", 1)[1]) for value in used] or [0]),
    )
    next_number = high_watermark + 1
    result: dict[str, str] = {}
    tombstone_group_counts = {
        entry["id"]: sum(
            bool(set(key.split("|")).intersection(entry["key"].split("|")))
            for key in keys
        )
        for entry in tombstoned
    }

    for key in sorted(keys):
        exact = by_key.get(key)
        members = set(key.split("|"))
        active_overlaps = [
            entry for entry in active if members.intersection(entry["key"].split("|"))
        ]
        tombstoned_overlaps = [
            entry
            for entry in tombstoned
            if members.intersection(entry["key"].split("|"))
        ]
        if (
            exact is not None
            and exact["state"] == "active"
            and {entry["id"] for entry in active_overlaps} <= {exact["id"]}
            and not tombstoned_overlaps
        ):
            result[key] = exact["id"]
            continue
        if (
            exact is not None
            and exact["state"] == "tombstoned"
            and not active_overlaps
            and {entry["id"] for entry in tombstoned_overlaps} <= {exact["id"]}
            and tombstone_group_counts[exact["id"]] == 1
            and exact["id"] not in result.values()
        ):
            exact["state"] = "active"
            result[key] = exact["id"]
            continue
        overlaps = [*active_overlaps, *tombstoned_overlaps]
        if overlaps:
            matching = [
                transition
                for transition in transitions
                if sorted(transition.get("to_component_ids", [])) == sorted(members)
                and sorted(transition.get("from_system_ids", []))
                == sorted(entry["id"] for entry in overlaps)
                and transition.get("reason")
            ]
            if len(matching) != 1:
                raise ValueError(
                    "System membership changed without one explicit reviewed "
                    f"merge/split transition: {key}"
                )
            surviving_id = matching[0].get("surviving_system_id")
            if surviving_id is not None:
                survivors = [
                    entry for entry in entries if entry["id"] == surviving_id
                ]
                if (
                    len(survivors) != 1
                    or surviving_id not in {entry["id"] for entry in overlaps}
                    or surviving_id in result.values()
                ):
                    raise ValueError(
                        "Reviewed merge/split transition names an invalid surviving ID"
                    )
                survivor = survivors[0]
                survivor.setdefault("previous_keys", []).append(survivor["key"])
                survivor["key"] = key
                survivor["state"] = "active"
                result[key] = survivor["id"]
                continue

        identifier = f"stellar-system-{next_number:06d}"
        next_number += 1
        entries.append({"id": identifier, "key": key, "state": "active"})
        result[key] = identifier
        registry["system_sequence_high_watermark"] = next_number - 1

    for entry in entries:
        if entry["id"] not in result.values() and entry["state"] == "active":
            entry["state"] = "tombstoned"
    return result


def proposed_position_component(
    member_ids: list[str], components_by_id: dict[str, dict[str, Any]]
) -> str | None:
    if len(member_ids) == 1:
        member = components_by_id[member_ids[0]]
        return member_ids[0] if member["position_pc"] is not None else None
    return next(
        (
            component_id
            for component_id in member_ids
            if components_by_id[component_id]["is_cns5_primary"]
            and components_by_id[component_id]["position_pc"] is not None
        ),
        None,
    )


def c20pc_distance_warning(
    row: dict[str, Any],
    position: dict[str, float] | None,
    gcns_row: dict[str, str] | None,
    cns5_row: dict[str, str] | None,
) -> dict[str, float | str] | None:
    parallax = optional_float(row.get("Plx"))
    if position is None or parallax is None or parallax <= 0:
        return None
    canonical_distance = math.sqrt(
        sum(position[axis] ** 2 for axis in ("xg", "yg", "zg"))
    )
    census_distance = 1000 / parallax
    census_parallax_error = optional_float(row.get("e_Plx"))
    census_sigma = (
        1000 * census_parallax_error / (parallax * parallax)
        if census_parallax_error is not None
        else 0.0
    )
    canonical_sigma = 0.0
    if gcns_row:
        median = optional_float(gcns_row.get("dist_50"))
        lower = optional_float(gcns_row.get("dist_16"))
        upper = optional_float(gcns_row.get("dist_84"))
        if median is not None and lower is not None and upper is not None:
            canonical_sigma = 1000 * max(
                abs(median - lower), abs(upper - median)
            )
    elif cns5_row:
        canonical_parallax = optional_float(cns5_row.get("parallax"))
        canonical_parallax_error = optional_float(
            cns5_row.get("parallax_error")
        )
        if (
            canonical_parallax is not None
            and canonical_parallax > 0
            and canonical_parallax_error is not None
        ):
            canonical_sigma = (
                1000
                * canonical_parallax_error
                / (canonical_parallax * canonical_parallax)
            )
    threshold = max(
        0.1,
        3 * math.hypot(canonical_sigma, census_sigma),
    )
    delta = abs(canonical_distance - census_distance)
    if delta <= threshold:
        return None
    return {
        "canonical_distance_pc": round(canonical_distance, 6),
        "census_distance_pc": round(census_distance, 6),
        "difference_pc": round(delta, 6),
        "warning_threshold_pc": round(threshold, 6),
        "criterion": "difference exceeds max(0.1 pc, 3-sigma combined uncertainty)",
    }


def build_candidates(
    gcns: list[dict[str, str]],
    cns5: list[dict[str, str]],
    registry: dict[str, Any],
    c20pc_rows: list[dict[str, Any]] | None = None,
    c20pc_mappings: list[dict[str, Any]] | None = None,
    protected_names: list[str] | None = None,
    identity_transitions: list[dict[str, Any]] | None = None,
    cns5_astrometry_overrides: list[dict[str, Any]] | None = None,
    wds_rows: list[dict[str, Any]] | None = None,
    prior_candidates: dict[str, Any] | None = None,
) -> dict[str, Any]:
    gcns_by_gaia = {decimal_id(row["source_id"]): row for row in gcns}
    cns5_by_id = {record["cns5_id"]: record for record in cns5}
    cns5_decisions = {
        str(entry["cns5_id"]): str(entry["decision"])
        for entry in (cns5_astrometry_overrides or [])
    }
    cns5_by_identity: dict[str, dict[str, str]] = {}
    cns5_identity_by_gaia_id: dict[str, str] = {}
    source_groups: dict[str, set[str]] = defaultdict(set)
    for record in cns5:
        identity = resolved_cns5_identity(record, cns5_by_id)
        source_groups[identity].add(f"cns5:{record['cns5_id']}")
        gaia_id = decimal_id(record.get("gaia_dr3_id"))
        if gaia_id:
            source_groups[identity].add(f"gaia-dr3:{gaia_id}")
            prior_owner = cns5_identity_by_gaia_id.setdefault(gaia_id, identity)
            if prior_owner != identity:
                raise ValueError(
                    f"Gaia DR3 source {gaia_id} belongs to two CNS5 component identities"
                )
        # Prefer the canonical source row over a CNS5 row that explicitly points to
        # it.  This preserves the source edge without manufacturing a component.
        if identity not in cns5_by_identity or str(record.get("reference_object_cns5_id", "")).strip() in {"", "--"}:
            cns5_by_identity[identity] = record
    identities = retained_component_identities(
        set(gcns_by_gaia), set(cns5_by_identity), cns5_identity_by_gaia_id
    )
    for identity in identities:
        source_groups[identity].add(identity)
    migrate_component_registry(registry, prior_candidates)
    census_rows = c20pc_rows or []
    census_by_key = census_rows_by_key(census_rows)
    exact_candidates = exact_identifier_candidates(cns5, census_rows)
    mappings = c20pc_mappings or []
    mapping_by_cns5: dict[str, dict[str, Any]] = {}
    coordinate_name_values: list[str] = []
    registry_by_id = {entry["id"]: entry for entry in registry["components"]}
    for mapping in mappings:
        cns5_id = str(mapping.get("cns5_id", ""))
        source_key = str(mapping.get("source_key", ""))
        component_id = str(mapping.get("candidate_component_id", ""))
        method = mapping.get("match_method")
        if (
            not cns5_id
            or cns5_id in mapping_by_cns5
            or cns5_id not in cns5_by_id
            or source_key not in census_by_key
            or not component_id
            or method not in {"exact_identifier", "reviewed_mapping"}
            or not mapping.get("reason")
            or not mapping.get("preferred_name")
            or not isinstance(mapping.get("preferred_name_source"), dict)
        ):
            raise ValueError("20-pc review contains an invalid or duplicate mapping")
        census_row = census_by_key[source_key]
        if census_row["recno"] != mapping.get("source_recno"):
            raise ValueError("20-pc review mapping recno and source key disagree")
        preferred_source = mapping["preferred_name_source"]
        field = preferred_source.get("field")
        source_value = normalize_text(preferred_source.get("value"))
        transformation = preferred_source.get("transformation")
        if field == "Mult children":
            supporting_rows = [
                census_rows[int(recno) - 1]
                for recno in mapping.get("supporting_source_recnos", [])
                if isinstance(recno, int)
                and 0 < recno <= len(census_rows)
            ]
            expected_value = " / ".join(
                str(row["Mult"]) for row in supporting_rows if row.get("Mult")
            )
        else:
            expected_value = (
                normalize_text(census_row.get(field))
                if isinstance(field, str)
                else None
            )
        if (
            source_value is None
            or source_value != expected_value
            or transformation
            not in {
                "coordinate-short",
                "published",
                "reviewed-system-shortening",
                "reviewed-expansion",
            }
        ):
            raise ValueError(
                "20-pc preferred name does not cite exact source evidence"
            )
        if transformation == "published" and mapping["preferred_name"] != source_value:
            raise ValueError("Published 20-pc preferred name was changed")
        if transformation == "coordinate-short":
            coordinate_name_values.append(source_value)
        if method == "exact_identifier":
            matching = [
                candidate
                for candidate in exact_candidates[cns5_id]
                if candidate["source_key"] == source_key
                and not candidate["ambiguous"]
            ]
            if len(matching) != 1:
                raise ValueError(
                    "Reviewed exact 20-pc match is not one unique typed identifier edge"
                )
        identity = resolved_cns5_identity(cns5_by_id[cns5_id], cns5_by_id)
        if identity not in source_groups:
            raise ValueError("20-pc mapping resolves outside the retained source union")
        source_groups[identity].add(source_key)
        registry_entry = registry_by_id.get(component_id)
        if (
            registry_entry is None
            or f"cns5:{cns5_id}" not in registry_entry.get(
                "source_keys", [registry_entry["key"]]
            )
        ):
            raise ValueError(
                "20-pc review mapping references a stale stable component identity"
            )
        registry_entry.setdefault("source_keys", [registry_entry["key"]])
        registry_entry["source_keys"] = sorted(
            {
                *(
                    key
                    for key in registry_entry["source_keys"]
                    if not key.startswith("c20pc-2024:")
                ),
                source_key,
            }
        )
        mapping_by_cns5[cns5_id] = mapping
    occupied_names = [
        source_name(row)[0]
        for row in cns5
        if str(row["cns5_id"]) not in mapping_by_cns5
    ]
    occupied_names.extend(protected_names or [])
    occupied_names.extend(
        f"Gaia DR3 {identity.removeprefix('gaia-dr3:')}"
        for identity in identities
        if identity.startswith("gaia-dr3:")
        and identity not in cns5_by_identity
    )
    occupied_names.extend(
        mapping["preferred_name"]
        for mapping in mappings
        if mapping["preferred_name_source"]["transformation"]
        != "coordinate-short"
    )
    coordinate_names = resolve_coordinate_short_names(
        coordinate_name_values, occupied_names
    )
    for mapping in mappings:
        if (
            mapping["preferred_name_source"]["transformation"]
            == "coordinate-short"
            and mapping["preferred_name"]
            != coordinate_names[mapping["preferred_name_source"]["value"]]
        ):
            raise ValueError(
                "20-pc coordinate preferred name is not collision-safe"
            )
    mapped_names = [mapping["preferred_name"].casefold() for mapping in mappings]
    if len(mapped_names) != len(set(mapped_names)):
        raise ValueError("20-pc reviewed preferred names collide")
    component_ids = allocate_components(
        registry, source_groups, identity_transitions or []
    )
    candidate_components: list[dict[str, Any]] = []
    membership: dict[str, list[str]] = defaultdict(list)
    for identity in sorted(identities):
        cns = cns5_by_identity.get(identity)
        gaia_id = identity.removeprefix("gaia-dr3:") if identity.startswith("gaia-dr3:") else decimal_id(cns.get("gaia_dr3_id")) if cns else None
        geometry = None
        geometry_source = None
        if gaia_id and gaia_id in gcns_by_gaia:
            gcns_record = gcns_by_gaia[gaia_id]
            geometry = {axis: optional_float(gcns_record[f"{axis}coord_50"]) for axis in ("x", "y", "z")}
            if all(value is not None for value in geometry.values()):
                geometry = {"xg": geometry["x"], "yg": geometry["y"], "zg": geometry["z"]}
                geometry_source = "gcns median Bayesian Cartesian geometry"
            else:
                geometry = None
        if geometry is None and cns:
            geometry = position_from_cns5(
                cns,
                review_decision=cns5_decisions.get(cns["cns5_id"]),
            )
            geometry_source = "CNS5 astrometry transformed by Astropy" if geometry else None
        if cns:
            preferred, alternates = source_name(cns)
            group_key = str(cns.get("cns6_system_id") or cns.get("gj_system_primary") or cns.get("reference_object_cns5_id") or identity).strip() or identity
        else:
            preferred, alternates, group_key = f"Gaia DR3 {gaia_id}", [], identity
        mapping = mapping_by_cns5.get(cns["cns5_id"]) if cns else None
        census_enrichment = None
        census_distance_warning = None
        if mapping is not None:
            if component_ids[identity] != mapping["candidate_component_id"]:
                raise ValueError(
                    "20-pc mapping changed the stable component identity"
                )
            census_row = census_by_key[mapping["source_key"]]
            census_enrichment = c20pc_enrichment(census_row, mapping)
            census_distance_warning = c20pc_distance_warning(
                census_row,
                geometry,
                gcns_by_gaia.get(gaia_id),
                cns,
            )
            original_preferred = preferred
            preferred = mapping["preferred_name"]
            source_aliases = [
                census_row.get(field)
                for field in (
                    "Name",
                    "OName",
                    "WISE",
                    "2MASS",
                    "HD",
                    "Ross",
                    "WD",
                    "Gaia",
                    "HIP",
                    "GJ",
                    "PMJID",
                    "Mult",
                )
            ]
            pmjid_aliases = [
                identifier.strip()
                for identifier in str(census_row.get("PMJID") or "").split(",")
                if identifier.strip()
            ]
            alternates = sorted(
                {
                    original_preferred,
                    *alternates,
                    *mapping.get("retained_aliases", []),
                    *pmjid_aliases,
                    *(
                        str(value).strip()
                        for value in source_aliases
                        if value is not None and str(value).strip()
                    ),
                }
                - {preferred}
            )
        component = {
            "id": component_ids[identity], "source_identity": identity, "gaia_source_id": gaia_id,
            "source_identities": sorted(source_groups[identity]),
            "cns5_id": cns.get("cns5_id") if cns else None, "preferred_name_candidate": preferred,
            "alternate_name_candidates": alternates, "position_pc": geometry,
            "position_derivation": geometry_source, "membership_key": group_key,
            "membership_reason": "CNS5 grouping" if cns and group_key != identity else "singleton retained source",
            "is_cns5_primary": bool(cns and str(cns.get("primary_flag", "")).strip().lower() in {"1", "true", "t", "y", "yes"}),
            "c20pc_candidates": exact_candidates.get(
                cns.get("cns5_id"), []
            ) if cns else [],
            "c20pc_match": {
                "mapping": mapping,
                "enrichment": census_enrichment,
                "canonical_distance_warning": census_distance_warning,
            } if mapping is not None else None,
        }
        candidate_components.append(component)
        membership[group_key].append(component["id"])
    accepted_wds = sorted(
        [
            row
            for row in (wds_rows or [])
            if row.get("system_id")
            and row.get("selection_reason", "").startswith(
                "accepted project review:"
            )
        ],
        key=lambda row: (
            row["system_id"],
            row["wds_coordinate"],
            row["discoverer"],
            row["components"],
        ),
    )
    known_component_ids = {
        component["id"] for component in candidate_components
    }
    for row in accepted_wds:
        reviewed_ids = set(row.get("component_ids", []))
        if not reviewed_ids or not reviewed_ids.issubset(known_component_ids):
            raise ValueError("Accepted WDS decision has invalid component identities")
        owning_groups = {
            group_key
            for group_key, members in membership.items()
            if reviewed_ids.intersection(members)
        }
        action = row.get("membership_action")
        if action == "confirm":
            if len(owning_groups) != 1 or not reviewed_ids.issubset(
                set(membership[next(iter(owning_groups))])
            ):
                raise ValueError(
                    "WDS confirmation conflicts with CNS5 membership; use a "
                    "reviewed replace action"
                )
        elif action == "replace":
            for group_key in list(owning_groups):
                membership[group_key] = [
                    component_id
                    for component_id in membership[group_key]
                    if component_id not in reviewed_ids
                ]
                if not membership[group_key]:
                    del membership[group_key]
            membership[
                "wds:"
                + row["wds_coordinate"]
                + ":"
                + row["discoverer"]
                + row["components"]
            ] = sorted(reviewed_ids)
        else:
            raise ValueError("Accepted WDS decision has an invalid membership action")
    system_ids = allocate_systems(
        registry,
        ["|".join(sorted(value)) for value in membership.values()],
        identity_transitions or [],
    )
    systems: list[dict[str, Any]] = []
    components_by_id = {component["id"]: component for component in candidate_components}
    for group_key, members in sorted(membership.items()):
        members = sorted(members)
        key = "|".join(members)
        position_component_id = proposed_position_component(
            members, components_by_id
        )
        naming_component_id = position_component_id or members[0]
        first = components_by_id[naming_component_id]
        alternate_names = sorted(
            {
                *first["alternate_name_candidates"],
                *{
                    components_by_id[component_id][
                        "preferred_name_candidate"
                    ]
                    for component_id in members
                    if component_id != naming_component_id
                },
                *{
                    alternate
                    for component_id in members
                    for alternate in components_by_id[component_id][
                        "alternate_name_candidates"
                    ]
                },
            }
            - {first["preferred_name_candidate"]}
        )
        systems.append({
            "id": system_ids[key], "component_ids": members, "membership_key": group_key,
            "preferred_name_candidate": first["preferred_name_candidate"],
            "alternate_name_candidates": alternate_names,
            "adopted_component_candidate": position_component_id,
            "requires_review": position_component_id is None
            and any(
                components_by_id[component_id]["position_pc"] is not None
                for component_id in members
            ),
        })
    for system in systems:
        evidence = [
            row
            for row in accepted_wds
            if set(row["component_ids"]).issubset(set(system["component_ids"]))
        ]
        if any(row["system_id"] != system["id"] for row in evidence):
            raise ValueError(
                "Accepted WDS decision references a stale stable system identity"
            )
        system["wds_membership_evidence"] = evidence
    return {
        "schema_version": "2.0.0",
        "components": candidate_components,
        "systems": systems,
        "wds_candidate_sha256": value_sha256(wds_rows or []),
        "c20pc_source_sha256": value_sha256(census_rows),
    }


def refresh() -> None:
    config = read_json(CONFIG_PATH)
    radius_ly = float(config["context_radius_ly"])
    if radius_ly <= 0 or not math.isfinite(radius_ly):
        raise ValueError("context_radius_ly must be finite and positive")
    anchor_names = mapped_anchor_names()
    anchors = list(anchor_names)
    review = read_json(REVIEW_PATH) if REVIEW_PATH.exists() else {}
    if not CANDIDATES_PATH.exists():
        raise ValueError(
            "Mapped anchor resolution requires an accepted candidate snapshot"
        )
    prior_candidates = read_json(CANDIDATES_PATH)
    if (
        review.get("accepted_candidate_sha256")
        != value_sha256(prior_candidates)
        or review.get("unresolved_ambiguities")
    ):
        raise ValueError(
            "Mapped anchor resolution requires the accepted unambiguous candidate snapshot"
        )
    bootstraps = resolve_anchor_bootstraps(
        anchor_names, review, prior_candidates
    )
    cns5_astrometry_decisions = {
        str(entry["cns5_id"]): str(entry["decision"])
        for entry in review.get("cns5_astrometry_overrides", [])
    }
    bootstrap_by_anchor = {
        entry["anchor_id"]: entry for entry in bootstraps
    }
    non_sol = [anchor for anchor in anchors if anchor != "sol"]
    gcns_bootstraps = [str(bootstrap_by_anchor[anchor]["source_id"]) for anchor in non_sol if bootstrap_by_anchor[anchor].get("catalogue") == "gcns"]
    cns5_bootstraps = [str(bootstrap_by_anchor[anchor]["source_id"]) for anchor in non_sol if bootstrap_by_anchor[anchor].get("catalogue") == "cns5"]
    cns5_adql = cns5_query()
    cns5_queries = [{"stage": "local-census", "adql": cns5_adql}]
    cns5 = normalise_rows(CNS5_COLUMNS, tap_csv(GAVO_URL, cns5_adql), "cns5_id")
    if cns5_bootstraps:
        bootstrap_query = exact_source_query(
            "cns5update.main", CNS5_COLUMNS, "cns5_id", cns5_bootstraps
        )
        cns5_queries.append(
            {
                "stage": "bootstrap",
                "anchor_ids": [
                    anchor
                    for anchor in non_sol
                    if bootstrap_by_anchor[anchor]["catalogue"] == "cns5"
                ],
                "adql": bootstrap_query,
            }
        )
        cns5 = normalise_rows(CNS5_COLUMNS, {row["cns5_id"]: row for row in [*cns5, *tap_csv(GAVO_URL, bootstrap_query)]}.values(), "cns5_id")
    write_extract("cns5", CNS5_COLUMNS, cns5, manifest("cns5", endpoint=GAVO_URL, table="cns5update.main", query=cns5_adql, rows=cns5, columns=CNS5_COLUMNS, extra={"release": "CNS5 update snapshot", "upstream_updated_at": gavo_upstream_updated_at("cns5update.main"), "queries": cns5_queries}))

    gcns_adql = gcns_query(radius_ly / LY_PER_PC)
    gcns_queries = [{"stage": "coverage", "anchor_id": "sol", "adql": gcns_adql}]
    gcns = normalise_rows(GCNS_COLUMNS, tap_csv(GAVO_URL, gcns_adql), "source_id")
    if gcns_bootstraps:
        bootstrap_query = exact_source_query(
            "gcns.main", GCNS_COLUMNS, "source_id", gcns_bootstraps
        )
        gcns_queries.append(
            {
                "stage": "bootstrap",
                "anchor_ids": [
                    anchor
                    for anchor in non_sol
                    if bootstrap_by_anchor[anchor]["catalogue"] == "gcns"
                ],
                "adql": bootstrap_query,
            }
        )
        gcns = normalise_rows(GCNS_COLUMNS, {row["source_id"]: row for row in [*gcns, *tap_csv(GAVO_URL, bootstrap_query)]}.values(), "source_id")
    gcns_by_id = {row["source_id"]: row for row in gcns}
    cns5_by_id = {row["cns5_id"]: row for row in cns5}
    for anchor in non_sol:
        bootstrap = bootstrap_by_anchor[anchor]
        if bootstrap["catalogue"] == "gcns":
            record = gcns_by_id.get(str(bootstrap["source_id"]))
            if record is None:
                raise ValueError(
                    f"{anchor} bootstrap source was not returned by GCNS"
                )
            position = {"xg": float(record["xcoord_50"]), "yg": float(record["ycoord_50"]), "zg": float(record["zcoord_50"])}
        else:
            record = cns5_by_id.get(str(bootstrap["source_id"]))
            if record is None:
                raise ValueError(
                    f"{anchor} bootstrap source was not returned by CNS5"
                )
            position = position_from_cns5(
                record,
                review_decision=cns5_astrometry_decisions.get(
                    record["cns5_id"]
                ),
            )
            if position is None:
                raise ValueError(
                    f"CNS5 bootstrap lacks source-backed geometry: {anchor}"
                )
        if distance(position, {"xg": 0.0, "yg": 0.0, "zg": 0.0}) + radius_ly / LY_PER_PC > GCNS_LIMIT_PC:
            raise ValueError(f"Required context sphere crosses the 100 pc GCNS boundary: {anchor}")
        envelope_query = gcns_anchor_query(position, radius_ly / LY_PER_PC)
        gcns_queries.append(
            {"stage": "coverage", "anchor_id": anchor, "adql": envelope_query}
        )
        envelope = tap_csv(GAVO_URL, envelope_query)
        gcns = normalise_rows(GCNS_COLUMNS, {row["source_id"]: row for row in [*gcns, *envelope]}.values(), "source_id")
    write_extract("gcns", GCNS_COLUMNS, gcns, manifest("gcns", endpoint=GAVO_URL, table="gcns.main", query=gcns_adql, rows=gcns, columns=GCNS_COLUMNS, extra={"release": "Gaia EDR3 GCNS", "upstream_updated_at": gavo_upstream_updated_at("gcns.main"), "queries": gcns_queries}))
    selected_ids = sorted({decimal_id(row["source_id"]) for row in gcns} | {decimal_id(row["gaia_dr3_id"]) for row in cns5 if decimal_id(row["gaia_dr3_id"])})
    selected_ids = [identifier for identifier in selected_ids if identifier]
    gaia_rows: list[dict[str, str]] = []
    queries: list[str] = []
    query_accounting: list[dict[str, Any]] = []
    for start in range(0, len(selected_ids), 500):
        input_ids = selected_ids[start:start + 500]
        query = gaia_query(input_ids)
        queries.append(query)
        returned = tap_csv(GAIA_URL, query)
        query_accounting.append(
            {
                "adql": query,
                "input_count": len(input_ids),
                "input_source_id_sha256": sha256_bytes(
                    "\n".join(input_ids).encode()
                ),
                "returned_count": len(returned),
            }
        )
        gaia_rows.extend(returned)
    gaia = normalise_rows(GAIA_COLUMNS, gaia_rows, "source_id")
    write_extract("gaia_dr3", GAIA_COLUMNS, gaia, manifest("gaia_dr3", endpoint=GAIA_URL, table="gaiadr3.gaia_source + pinned left joins", query="\n\n".join(queries), rows=gaia, columns=GAIA_COLUMNS, extra={"release": "Gaia DR3", "queries": query_accounting, "input_source_id_sha256": sha256_bytes("\n".join(selected_ids).encode()), "unmatched_source_ids": sorted(set(selected_ids) - {row["source_id"] for row in gaia})}))
    refresh_c20pc_snapshot()
    wds_manifest = _write_wds()
    prior_candidates = (
        read_json(CANDIDATES_PATH) if CANDIDATES_PATH.exists() else None
    )
    wds_candidates = wds_membership_candidates(
        cns5,
        read_gzip(WDS_PATH),
        review.get("wds_decisions", []),
        gcns,
        gaia,
        reviewed_landmark_source_identities(prior_candidates),
    )
    wds_manifest["candidate_row_count"] = len(wds_candidates)
    wds_manifest["candidate_sha256"] = value_sha256(wds_candidates)
    write_json(SOURCE_DIR / "wds-membership.json", {"schema_version": "1.0.0", "source": wds_manifest, "rows": wds_candidates})
    candidate_checksum = reconcile_committed_sources()
    if not REVIEW_PATH.exists():
        write_json(REVIEW_PATH, {"schema_version": "1.0.0", "accepted_candidate_sha256": None, "reviewer": None, "reviewed_at": None, "overrides": [], "unresolved_ambiguities": [{"reason": "Initial candidate snapshot requires Captain review."}]})
    if not LANDMARKS_PATH.exists():
        write_json(LANDMARKS_PATH, {"schema_version": "1.0.0", "systems": []})
    print(f"Refreshed GCNS={len(gcns)}, CNS5={len(cns5)}, Gaia DR3={len(gaia)}; candidate checksum {candidate_checksum}")


def reconcile_committed_sources() -> str:
    """Rebuild candidates only from the committed source inputs (no network)."""
    _, gcns = read_extract("gcns")
    _, cns5 = read_extract("cns5")
    _, gaia = read_extract("gaia_dr3")
    _, c20pc_rows, _, _ = read_c20pc()
    wds_document = read_json(SOURCE_DIR / "wds-membership.json")
    review = read_json(REVIEW_PATH) if REVIEW_PATH.exists() else {}
    prior_candidates = (
        read_json(CANDIDATES_PATH) if CANDIDATES_PATH.exists() else None
    )
    wds_candidates = wds_membership_candidates(
        cns5,
        read_gzip(WDS_PATH),
        review.get("wds_decisions", []),
        gcns,
        gaia,
        reviewed_landmark_source_identities(prior_candidates),
    )
    wds_document["rows"] = wds_candidates
    wds_document["source"]["candidate_row_count"] = len(wds_candidates)
    wds_document["source"]["candidate_sha256"] = value_sha256(wds_candidates)
    write_json(SOURCE_DIR / "wds-membership.json", wds_document)
    registry = read_json(IDENTITY_REGISTRY_PATH) if IDENTITY_REGISTRY_PATH.exists() else empty_registry()
    candidates = build_candidates(
        gcns,
        cns5,
        registry,
        c20pc_rows=c20pc_rows,
        c20pc_mappings=review.get("c20pc_mappings", []),
        protected_names=[
            entry["name"]
            for entry in review.get("overrides", [])
            if entry.get("name")
        ],
        identity_transitions=review.get("identity_transitions", []),
        cns5_astrometry_overrides=review.get(
            "cns5_astrometry_overrides", []
        ),
        wds_rows=wds_candidates,
        prior_candidates=prior_candidates,
    )
    report_c20pc_candidate_diff(prior_candidates, candidates)
    write_json(IDENTITY_REGISTRY_PATH, registry)
    write_json(CANDIDATES_PATH, candidates)
    return value_sha256(candidates)


def report_c20pc_candidate_diff(
    previous: dict[str, Any] | None,
    current: dict[str, Any],
) -> None:
    """Print the review-sensitive census delta before replacing candidates."""

    def records(document: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
        if document is None:
            return {}
        result: dict[str, dict[str, Any]] = {}
        for component in document.get("components", []):
            match = component.get("c20pc_match")
            proposals = component.get("c20pc_candidates", [])
            enrichment = match.get("enrichment", {}) if match else {}
            mapping = match.get("mapping", {}) if match else {}
            result[component["id"]] = {
                "accepted_source_key": enrichment.get("source_key"),
                "preferred_name": component.get("preferred_name_candidate"),
                "object_class": enrichment.get("object_class"),
                "temperature_k": enrichment.get("effective_temperature_k"),
                "hierarchy": enrichment.get("system_hierarchy"),
                "presentation": enrichment.get("visual_family"),
                "canonical_distance_warning": (
                    match.get("canonical_distance_warning") if match else None
                ),
                "proposal_keys": sorted(
                    proposal["source_key"] for proposal in proposals
                ),
                "ambiguous": any(
                    proposal.get("ambiguous", False) for proposal in proposals
                ),
                "match_method": mapping.get("match_method"),
            }
        return result

    before, after = records(previous), records(current)
    changed: list[dict[str, Any]] = []
    for component_id in sorted(set(before) | set(after)):
        old, new = before.get(component_id), after.get(component_id)
        if old != new:
            changed.append(
                {"component_id": component_id, "before": old, "after": new}
            )
    accepted_before = {
        key
        for record in before.values()
        if (key := record["accepted_source_key"]) is not None
    }
    accepted_after = {
        key
        for record in after.values()
        if (key := record["accepted_source_key"]) is not None
    }
    print(
        "20-pc candidate diff: "
        f"accepted +{len(accepted_after - accepted_before)}"
        f"/-{len(accepted_before - accepted_after)}, "
        f"changed components={len(changed)}, "
        f"ambiguous proposals={sum(record['ambiguous'] for record in after.values())}"
    )
    for entry in changed:
        print(
            "20-pc candidate change "
            + json.dumps(entry, ensure_ascii=False, sort_keys=True)
        )


def accepted_candidates() -> tuple[
    dict[str, Any],
    dict[str, Any],
    dict[str, Any],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, str]],
    list[dict[str, Any]],
]:
    candidates = read_json(CANDIDATES_PATH)
    review = read_json(REVIEW_PATH)
    actual = value_sha256(candidates)
    if review.get("accepted_candidate_sha256") != actual:
        raise ValueError("system-review does not accept the exact system-candidates checksum")
    if review.get("unresolved_ambiguities"):
        raise ValueError("system-review contains unresolved ambiguities")
    gcns_manifest, gcns = read_extract("gcns")
    cns5_manifest, cns5 = read_extract("cns5")
    gaia_manifest, gaia = read_extract("gaia_dr3")
    c20pc_manifest, c20pc_rows, _, _ = read_c20pc()
    wds_manifest = read_json(SOURCE_DIR / "wds-membership.json")["source"]
    return (
        candidates,
        review,
        {
            "gcns": gcns_manifest,
            "cns5": cns5_manifest,
            "gaia_dr3": gaia_manifest,
            "wds": wds_manifest,
            "c20pc": c20pc_manifest,
        },
        gcns,
        cns5,
        gaia,
        c20pc_rows,
    )
