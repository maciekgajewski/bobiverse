"""BOB-026 contracts for the published Kirkpatrick et al. 20-pc census."""

from __future__ import annotations

import hashlib
import json
import math
import re
import unicodedata
from collections import defaultdict
from typing import Any, Iterable

from common import value_sha256

C20PC_TAP_URL = "https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync"
C20PC_README_URL = (
    "https://cdsarc.cds.unistra.fr/ftp/J/ApJS/271/55/ReadMe"
)
C20PC_CATALOGUE = "J/ApJS/271/55"
C20PC_CATALOGUE_DOI = "10.26093/cds/vizier.22710055"
C20PC_PUBLICATION_DOI = "10.3847/1538-4365/ad24e2"
C20PC_BIBCODE = "2024ApJS..271...55K"
C20PC_README_HISTORY_DATE = "04-Jun-2024"
C20PC_ACKNOWLEDGEMENT = (
    "This research has made use of the VizieR catalogue access tool, CDS, "
    "Strasbourg, France (DOI: 10.26093/cds/vizier)."
)

C20PC_TABLE_COLUMNS = [
    "recno",
    "Name",
    "NcTR",
    "IMass",
    "e_IMass",
    "n_IMass",
    "Mass",
    "e_Mass",
    "n_Mass",
    "r_Mass",
    "Massl",
    "e_Massl",
    "n_Massl",
    "r_Massl",
    "Teff",
    "e_Teff",
    "Syst",
    "Ncomp",
    "SystCode",
    "OName",
    "HD",
    "Ross",
    "WD",
    "2MASS",
    "WISE",
    "Gaia",
    "HIP",
    "GJ",
    "PMJID",
    "Mult",
    "NamesRef",
    "RAJ2000",
    "DEJ2000",
    "RAPdeg",
    "e_RAPdeg",
    "DEPdeg",
    "e_DEPdeg",
    "NoteEpoch",
    "Plx",
    "e_Plx",
    "pmRA",
    "e_pmRA",
    "pmDE",
    "e_pmDE",
    "PlxPMRef",
    "SpTOpt",
    "SpTOptCode",
    "r_SpTOpt",
    "SpTNIR",
    "SpTNIRCode",
    "r_SpTNIR",
    "2Mcont",
    "WISEcont",
]
C20PC_NOTES_COLUMNS = [
    "recno",
    "Name",
    "NcTR",
    "RAJ2000",
    "DEJ2000",
    "Note",
]
C20PC_REFS_COLUMNS = ["Ref", "Auth", "BibCode", "Comm"]

C20PC_TABLE_QUERY = """SELECT
  "recno",
  "Name", "NcTR",
  "IMass", "e_IMass", "n_IMass",
  "Mass", "e_Mass", "n_Mass", "r_Mass",
  "Massl", "e_Massl", "n_Massl", "r_Massl",
  "Teff", "e_Teff",
  "Syst", "Ncomp", "SystCode",
  "OName", "HD", "Ross", "WD", "2MASS", "WISE", "Gaia", "HIP", "GJ",
  "PMJID", "Mult", "NamesRef",
  "RAJ2000", "DEJ2000",
  "RAPdeg", "e_RAPdeg", "DEPdeg", "e_DEPdeg", "NoteEpoch",
  "Plx", "e_Plx", "pmRA", "e_pmRA", "pmDE", "e_pmDE", "PlxPMRef",
  "SpTOpt", "SpTOptCode", "r_SpTOpt",
  "SpTNIR", "SpTNIRCode", "r_SpTNIR",
  "2Mcont", "WISEcont"
FROM "J/ApJS/271/55/table4"
ORDER BY "recno\""""

C20PC_NOTES_QUERY = """SELECT "recno", "Name", "NcTR", "RAJ2000", "DEJ2000", "Note"
FROM "J/ApJS/271/55/notes4"
ORDER BY "recno\""""

C20PC_REFS_QUERY = """SELECT "Ref", "Auth", "BibCode", "Comm"
FROM "J/ApJS/271/55/refs"
ORDER BY "Ref", "BibCode\""""

EXPECTED_ROW_COUNTS = {
    "table4": 4407,
    "notes4": 4407,
    "notes4_transport": 4408,
    "refs": 688,
}
EXPECTED_EXTERNAL_REFERENCE_CODES = [
    "Allen1899",
    "Gaia DR2",
    "Gaia DR3",
    "Gaia DR3-NSS",
    "Gaia EDR3",
    "IAU",
    "SIMBAD",
]
REFERENCE_FIELDS = (
    "NamesRef",
    "r_Mass",
    "r_Massl",
    "PlxPMRef",
    "r_SpTOpt",
    "r_SpTNIR",
)

_TABLE_INTEGER_COLUMNS = {"recno", "NcTR", "Teff", "e_Teff", "Ncomp", "SystCode"}
_TABLE_NUMBER_COLUMNS = {
    "IMass",
    "e_IMass",
    "Mass",
    "e_Mass",
    "Massl",
    "e_Massl",
    "RAJ2000",
    "DEJ2000",
    "RAPdeg",
    "e_RAPdeg",
    "DEPdeg",
    "e_DEPdeg",
    "NoteEpoch",
    "Plx",
    "e_Plx",
    "pmRA",
    "e_pmRA",
    "pmDE",
    "e_pmDE",
    "SpTOptCode",
    "SpTNIRCode",
}

IdentifierToken = tuple[str, str, str, str]


def normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = unicodedata.normalize("NFKC", str(value))
    normalized = re.sub(r"[ \t\r\n\f\v]+", " ", normalized).strip()
    return normalized or None


def normalize_source_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = unicodedata.normalize("NFC", str(value))
    normalized = re.sub(r"[ \t\r\n\f\v]+", " ", normalized).strip()
    return normalized or None


def _number(value: Any, *, integer: bool = False) -> int | float | None:
    text = normalize_text(value)
    if text is None:
        return None
    number = int(text) if integer else float(text)
    if not integer and not math.isfinite(number):
        raise ValueError("20-pc census contains a non-finite number")
    return number


def _normalise_rows(
    rows: Iterable[dict[str, Any]],
    columns: list[str],
    *,
    integer_columns: set[str] | None = None,
    number_columns: set[str] | None = None,
) -> list[dict[str, Any]]:
    integer_columns = integer_columns or set()
    number_columns = number_columns or set()
    result: list[dict[str, Any]] = []
    seen: set[str] = set()
    for source in rows:
        if list(source) != columns and set(source) != set(columns):
            missing = sorted(set(columns) - set(source))
            extra = sorted(set(source) - set(columns))
            raise ValueError(
                f"20-pc projection differs from contract; missing={missing}, extra={extra}"
            )
        row: dict[str, Any] = {}
        for column in columns:
            if column in integer_columns:
                row[column] = _number(source.get(column), integer=True)
            elif column in number_columns:
                row[column] = _number(source.get(column))
            else:
                row[column] = normalize_source_text(source.get(column))
        digest = value_sha256(row)
        if digest in seen:
            raise ValueError("20-pc census contains a duplicate normalized row")
        seen.add(digest)
        result.append(row)
    return result


def _validate_recno(rows: list[dict[str, Any]], label: str) -> None:
    actual = [row["recno"] for row in rows]
    expected = list(range(1, len(rows) + 1))
    if actual != expected:
        raise ValueError(f"{label} recno sequence is not unique and contiguous")


def reconstruct_note_continuations(
    note_transport_rows: Iterable[dict[str, Any]],
) -> list[dict[str, Any]]:
    notes: list[dict[str, Any]] = []
    for source_row in note_transport_rows:
        row = dict(source_row)
        key = tuple(
            row[column] for column in ("Name", "NcTR", "RAJ2000", "DEJ2000")
        )
        previous_key = (
            tuple(
                notes[-1][column]
                for column in ("Name", "NcTR", "RAJ2000", "DEJ2000")
            )
            if notes
            else None
        )
        if key == previous_key:
            notes[-1]["continuation_recnos"].append(row["recno"])
            fragments = [
                fragment
                for fragment in (notes[-1]["Note"], row["Note"])
                if fragment is not None
            ]
            notes[-1]["Note"] = " ".join(fragments) or None
        else:
            notes.append({**row, "continuation_recnos": []})
    return notes


def normalize_census_tables(
    table_rows: Iterable[dict[str, Any]],
    note_rows: Iterable[dict[str, Any]],
    reference_rows: Iterable[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    table = _normalise_rows(
        table_rows,
        C20PC_TABLE_COLUMNS,
        integer_columns=_TABLE_INTEGER_COLUMNS,
        number_columns=_TABLE_NUMBER_COLUMNS,
    )
    note_transport_rows = _normalise_rows(
        note_rows,
        C20PC_NOTES_COLUMNS,
        integer_columns={"recno", "NcTR"},
        number_columns={"RAJ2000", "DEJ2000"},
    )
    references = _normalise_rows(reference_rows, C20PC_REFS_COLUMNS)
    _validate_recno(table, "Table 4")
    _validate_recno(note_transport_rows, "Table 4 notes transport")
    if len(note_transport_rows) != EXPECTED_ROW_COUNTS["notes4_transport"]:
        raise ValueError(
            "20-pc notes transport row count differs from the pinned TAP baseline"
        )
    notes = reconstruct_note_continuations(note_transport_rows)
    if len(table) != EXPECTED_ROW_COUNTS["table4"]:
        raise ValueError("20-pc Table 4 row count differs from the pinned baseline")
    if len(notes) != EXPECTED_ROW_COUNTS["notes4"]:
        raise ValueError("20-pc notes row count differs from the pinned baseline")
    continuation_rows = [row for row in notes if row["continuation_recnos"]]
    if (
        len(continuation_rows) != 1
        or continuation_rows[0]["Name"] != "BD+39 2376 AB"
        or continuation_rows[0]["recno"] != 1979
        or continuation_rows[0]["continuation_recnos"] != [1980]
    ):
        raise ValueError(
            "20-pc TAP continuation-row structure differs from the pinned baseline"
        )
    if len(references) != EXPECTED_ROW_COUNTS["refs"]:
        raise ValueError("20-pc reference row count differs from the pinned baseline")
    reference_keys = [
        (row["Ref"], row["BibCode"], row["Auth"], row["Comm"])
        for row in references
    ]
    if len(reference_keys) != len(set(reference_keys)):
        raise ValueError("20-pc references contain a duplicate ordered row")
    unresolved = unresolved_reference_codes(table, references)
    if unresolved != EXPECTED_EXTERNAL_REFERENCE_CODES:
        raise ValueError(
            "20-pc retained reference coverage differs from the pinned external-code baseline"
        )
    return table, notes, references


def retained_reference_codes(rows: Iterable[dict[str, Any]]) -> set[str]:
    result: set[str] = set()
    for row in rows:
        for field in REFERENCE_FIELDS:
            value = normalize_text(row.get(field))
            if value is None:
                continue
            for code in re.split(r",\s*|\.\s+", value):
                normalized = code.removesuffix("*").strip()
                if normalized:
                    result.add(normalized)
    return result


def unresolved_reference_codes(
    rows: Iterable[dict[str, Any]], references: Iterable[dict[str, Any]]
) -> list[str]:
    resolved = {
        code
        for row in references
        if (code := normalize_text(row.get("Ref"))) is not None
    }
    return sorted(retained_reference_codes(rows) - resolved)


def _numeric_token(
    catalogue: str, raw: str, *, release: str = ""
) -> IdentifierToken | None:
    value = normalize_text(raw)
    if value is None:
        return None
    prefix = {
        "gj": r"(?:GJ|GL|GLIESE)",
        "hip": r"HIP",
        "hd": r"HD",
        "ross": r"ROSS",
    }[catalogue]
    match = re.fullmatch(
        rf"(?:{prefix}\s*)?0*(\d+(?:\.\d+)?)(?:\s*([A-Za-z]{{1,3}}))?",
        value,
        flags=re.IGNORECASE,
    )
    if match is None:
        return None
    primary, scope = match.groups()
    return catalogue, release, primary, (scope or "").upper()


def _wd_token(raw: str) -> IdentifierToken | None:
    value = normalize_text(raw)
    match = re.fullmatch(
        r"(?:WD\s*)?([0-9]{4}[+-][0-9]{3}(?:\.[0-9]+)?)(?:\s*([A-Za-z]{1,3}))?",
        value or "",
        flags=re.IGNORECASE,
    )
    if match is None:
        return None
    primary, scope = match.groups()
    return "wd", "", primary, (scope or "").upper()


def _pmjid_token(raw: str) -> IdentifierToken | None:
    value = normalize_text(raw)
    if value is not None and "," in value:
        parts = value.split(",")
        tokens = [_pmjid_token(part) for part in parts]
        if all(token is not None for token in tokens):
            canonical_members = [
                token[2] + token[3] for token in tokens if token is not None
            ]
            return (
                "pmjid",
                "",
                ",".join(canonical_members),
                f"COMPOSITE/{len(tokens)}",
            )
        return None
    match = re.fullmatch(
        r"(?:PM\s*)?J([0-9]{5}[+-][0-9]{4})([A-Za-z]{1,3})?",
        value or "",
        flags=re.IGNORECASE,
    )
    if match is None:
        return None
    primary, scope = match.groups()
    return "pmjid", "", f"J{primary}", (scope or "").upper()


def _with_cardinality_scope(
    token: IdentifierToken, cardinality: Any
) -> IdentifierToken:
    if token[3] or not isinstance(cardinality, int) or cardinality <= 1:
        return token
    return token[0], token[1], token[2], f"SYSTEM/{cardinality}"


_COORDINATE_PATTERN = re.compile(
    r"^(WISEA|WISEPA|WISE|2MASSI|2MASS|UGPS)\s+J"
    r"([0-9]+(?:\.[0-9]+)?)([+-])([0-9]+(?:\.[0-9]+)?)"
    r"(?:\s+([A-Za-z]{1,3}))?$",
    flags=re.IGNORECASE,
)


def _coordinate_token(raw: str) -> IdentifierToken | None:
    value = normalize_text(raw)
    if value is None:
        return None
    match = _COORDINATE_PATTERN.fullmatch(value)
    if match is None:
        return None
    prefix, ra, sign, dec, scope = match.groups()
    return prefix.upper().lower(), "", f"J{ra}{sign}{dec}", (scope or "").upper()


def _gaia_token(raw: str) -> IdentifierToken | None:
    value = normalize_text(raw)
    if value is None:
        return None
    match = re.fullmatch(
        r"(?:GAIA\s+)?(DR2|EDR3|DR3)\s+([0-9]+)", value, flags=re.IGNORECASE
    )
    if match is None:
        return None
    release, source_id = match.groups()
    return "gaia", release.upper(), source_id, ""


def parse_identifier(raw: str, catalogue: str | None = None) -> IdentifierToken | None:
    value = normalize_text(raw)
    if value is None:
        return None
    if catalogue in {"gj", "hip", "hd", "ross"}:
        return _numeric_token(catalogue, value)
    if catalogue == "wd":
        return _wd_token(value)
    if catalogue == "pmjid":
        return _pmjid_token(value)
    if catalogue == "gaia":
        return _gaia_token(value)
    if catalogue in {"wise", "2mass", "pmjid", "name"}:
        coordinate = _coordinate_token(value)
        if coordinate is not None:
            return coordinate
    for numeric in ("gj", "hip", "hd", "ross"):
        token = _numeric_token(numeric, value)
        if token is not None and re.match(
            r"^(GJ|GL|GLIESE|HIP|HD|ROSS|WD)\b", value, flags=re.IGNORECASE
        ):
            return token
    return (
        _gaia_token(value)
        or _wd_token(value)
        or _pmjid_token(value)
        or _coordinate_token(value)
    )


def identifier_token_text(token: IdentifierToken) -> str:
    return "|".join(token)


def census_identifier_tokens(row: dict[str, Any]) -> list[str]:
    tokens: set[IdentifierToken] = set()
    fields = {
        "HD": "hd",
        "Ross": "ross",
        "WD": "wd",
        "2MASS": "2mass",
        "WISE": "wise",
        "Gaia": "gaia",
        "HIP": "hip",
        "GJ": "gj",
        "PMJID": "pmjid",
    }
    for field, catalogue in fields.items():
        value = row.get(field)
        if isinstance(value, str):
            token = parse_identifier(value, catalogue)
            if token is not None:
                tokens.add(_with_cardinality_scope(token, row.get("NcTR")))
    for value in str(row.get("Name") or "").split("&"):
        token = parse_identifier(value, "name")
        if token is not None:
            tokens.add(_with_cardinality_scope(token, row.get("NcTR")))
    for value in str(row.get("Mult") or "").split(","):
        token = parse_identifier(value, "name")
        if token is not None:
            tokens.add(_with_cardinality_scope(token, row.get("NcTR")))
    return sorted(identifier_token_text(token) for token in tokens)


def cns5_identifier_tokens(row: dict[str, Any]) -> list[str]:
    tokens: set[IdentifierToken] = set()
    for field, catalogue in (
        ("gj_id", "gj"),
        ("hip_id", "hip"),
        ("gaia_dr3_id", "gaia"),
    ):
        value = normalize_text(row.get(field))
        if value is None:
            continue
        if catalogue == "gaia" and value.isdecimal():
            value = f"Gaia DR3 {value}"
        token = parse_identifier(value, catalogue)
        if token is not None:
            cardinality_text = normalize_text(row.get("n_components"))
            cardinality = (
                int(cardinality_text)
                if cardinality_text and cardinality_text.isdecimal()
                else None
            )
            tokens.add(_with_cardinality_scope(token, cardinality))
    return sorted(identifier_token_text(token) for token in tokens)


def census_source_key(row: dict[str, Any]) -> str:
    identity = {
        "dec_j2000": row.get("DEJ2000"),
        "identifiers": census_identifier_tokens(row),
        "name": normalize_text(row.get("Name")),
        "nctr": row.get("NcTR"),
        "ra_j2000": row.get("RAJ2000"),
        "syst_code": row.get("SystCode"),
        "version": "c20pc-identity-v1",
    }
    encoded = json.dumps(
        identity,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return "c20pc-2024:" + hashlib.sha256(encoded).hexdigest()


def census_rows_by_key(rows: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for row in rows:
        key = census_source_key(row)
        if key in result:
            raise ValueError(f"Duplicate 20-pc source key: {key}")
        result[key] = row
    return result


def exact_identifier_candidates(
    cns5_rows: Iterable[dict[str, Any]],
    census_rows: Iterable[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    census_index: dict[str, list[str]] = defaultdict(list)
    rows_by_key = census_rows_by_key(census_rows)
    for key, row in rows_by_key.items():
        for token in census_identifier_tokens(row):
            census_index[token].append(key)
    cns5_rows = list(cns5_rows)
    cns5_index: dict[str, list[str]] = defaultdict(list)
    tokens_by_cns5: dict[str, list[str]] = {}
    for cns5 in cns5_rows:
        cns5_id = str(cns5["cns5_id"])
        tokens = cns5_identifier_tokens(cns5)
        tokens_by_cns5[cns5_id] = tokens
        for token in tokens:
            cns5_index[token].append(cns5_id)
    result: dict[str, list[dict[str, Any]]] = {}
    for cns5 in cns5_rows:
        cns5_id = str(cns5["cns5_id"])
        nominations: dict[str, list[str]] = defaultdict(list)
        for token in tokens_by_cns5[cns5_id]:
            for key in census_index.get(token, []):
                nominations[key].append(token)
        contradictory = len(nominations) > 1
        result[cns5_id] = [
            {
                "source_key": key,
                "shared_identifiers": sorted(tokens),
                "ambiguous": contradictory
                or any(
                    len(census_index[token]) != 1
                    or len(cns5_index[token]) != 1
                    for token in tokens
                )
                or (
                    str(cns5.get("n_components") or "").isdecimal()
                    and isinstance(rows_by_key[key].get("NcTR"), int)
                    and int(str(cns5["n_components"]))
                    != rows_by_key[key]["NcTR"]
                ),
            }
            for key, tokens in sorted(nominations.items())
        ]
    return result


def _spectral_primary(value: Any, reference: Any) -> str | None:
    spectral = normalize_text(value)
    if spectral is None or normalize_text(reference) is None or spectral.startswith("["):
        return None
    normalized = spectral.upper()
    if re.search(r"[+/&]", normalized):
        classes = {
            primary
            for part in re.split(r"[+/&]", normalized)
            if (primary := _spectral_primary(part, reference)) is not None
        }
        if len(classes) > 1:
            raise ValueError("20-pc composite spectral type proposes conflicting classes")
        return next(iter(classes), None)
    for prefix in ("D/SD", "ESD", "USD", "SD"):
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix) :]
            break
    if re.match(r"^D(?:A|B|C|O|Q|Z|X)", normalized):
        return "D"
    match = re.search(r"[OBAFGKMLTY]", normalized)
    return match.group(0) if match else None


def derive_object_class(
    row: dict[str, Any], reviewed_override: str | None = None
) -> str | None:
    classes = {
        primary
        for primary in (
            _spectral_primary(row.get("SpTOpt"), row.get("r_SpTOpt")),
            _spectral_primary(row.get("SpTNIR"), row.get("r_SpTNIR")),
        )
        if primary is not None
    }
    proposed: set[str] = set()
    if classes.intersection({"T", "Y"}):
        proposed.add("brown_dwarf")
    if "D" in classes and normalize_text(row.get("WD")) is not None:
        proposed.add("white_dwarf")
    if classes.intersection(set("OBAFGKM")):
        proposed.add("star")
    if len(proposed) > 1:
        raise ValueError("20-pc source facts propose conflicting object classes")
    derived = next(iter(proposed), None)
    if reviewed_override is not None:
        if reviewed_override not in {"star", "white_dwarf", "brown_dwarf"}:
            raise ValueError("Reviewed 20-pc object class is invalid")
        if derived is not None and derived != reviewed_override:
            raise ValueError("Reviewed 20-pc object class conflicts with source type")
        if derived is None and reviewed_override == "brown_dwarf":
            if row.get("Teff") is None or not any(
                row.get(field) is not None for field in ("IMass", "Mass", "Massl")
            ):
                raise ValueError(
                    "Typeless reviewed brown dwarf lacks temperature and mass evidence"
                )
        return reviewed_override
    return derived


def accepted_spectral_type(row: dict[str, Any]) -> str | None:
    for field, reference in (("SpTNIR", "r_SpTNIR"), ("SpTOpt", "r_SpTOpt")):
        if _spectral_primary(row.get(field), row.get(reference)) is not None:
            return normalize_text(row.get(field))
    return None


def brown_dwarf_visual_family(
    row: dict[str, Any], object_class: str | None
) -> str | None:
    if object_class != "brown_dwarf":
        return None
    primary = _spectral_primary(row.get("SpTNIR"), row.get("r_SpTNIR"))
    if primary is None:
        primary = _spectral_primary(row.get("SpTOpt"), row.get("r_SpTOpt"))
    temperature = row.get("Teff")
    type_family = (
        "infrared-cool"
        if primary == "Y"
        else "infrared-warm"
        if primary == "T"
        else None
    )
    temperature_family = (
        "infrared-cool"
        if isinstance(temperature, (int, float)) and temperature < 500
        else "infrared-warm"
        if isinstance(temperature, (int, float)) and 500 <= temperature <= 1399
        else None
    )
    if (
        type_family is not None
        and temperature_family is not None
        and type_family != temperature_family
    ):
        raise ValueError("20-pc spectral type and temperature visual tiers conflict")
    family = type_family or temperature_family
    if family is None:
        raise ValueError("Reviewed brown dwarf lacks a supported presentation tier")
    return family


def coordinate_short_name(full_name: str, precision: int = 4) -> str:
    value = normalize_text(full_name)
    match = _COORDINATE_PATTERN.fullmatch(value or "")
    if match is None:
        raise ValueError(f"Not a supported coordinate designation: {full_name}")
    prefix, ra, sign, dec, _ = match.groups()
    display_prefix = (
        "WISE"
        if prefix.upper() in {"WISE", "WISEA", "WISEPA"}
        else "2MASS"
        if prefix.upper() in {"2MASS", "2MASSI"}
        else "UGPS"
    )
    ra_digits = ra.replace(".", "")
    dec_digits = dec.replace(".", "")
    if precision == 4:
        return f"{display_prefix} {ra_digits[:4]}{sign}{dec_digits[:4]}"
    if precision == 6:
        return f"{display_prefix} {ra_digits[:6]}{sign}{dec_digits[:6]}"
    return f"{display_prefix} {ra}{sign}{dec}"


def resolve_coordinate_short_names(
    full_names: Iterable[str], occupied_names: Iterable[str] = ()
) -> dict[str, str]:
    names = list(full_names)
    occupied = {normalize_text(name).casefold() for name in occupied_names}
    result = {name: coordinate_short_name(name, 4) for name in names}
    for precision in (4, 6, -1):
        groups: dict[str, list[str]] = defaultdict(list)
        for full_name in names:
            groups[result[full_name].casefold()].append(full_name)
        collisions = {
            full_name
            for short, group in groups.items()
            if len(group) > 1 or short in occupied
            for full_name in group
        }
        if not collisions:
            return result
        if precision == -1:
            raise ValueError("Full normalized coordinate designations still collide")
        next_precision = 6 if precision == 4 else -1
        for full_name in collisions:
            result[full_name] = coordinate_short_name(full_name, next_precision)
    raise AssertionError("unreachable")


def c20pc_enrichment(
    row: dict[str, Any], mapping: dict[str, Any]
) -> dict[str, Any]:
    object_class = derive_object_class(
        row, mapping.get("object_class_override")
    )
    return {
        "source_key": census_source_key(row),
        "published_name": normalize_text(row.get("Name")),
        "common_name": normalize_text(row.get("OName")),
        "wise_id": normalize_text(row.get("WISE")),
        "twomass_id": normalize_text(row.get("2MASS")),
        "hd_id": normalize_text(row.get("HD")),
        "ross_id": normalize_text(row.get("Ross")),
        "wd_id": normalize_text(row.get("WD")),
        "gaia_id": normalize_text(row.get("Gaia")),
        "hip_id": normalize_text(row.get("HIP")),
        "gj_id": normalize_text(row.get("GJ")),
        "pmjid": normalize_text(row.get("PMJID")),
        "multiple_designations": normalize_text(row.get("Mult")),
        "spectral_type": accepted_spectral_type(row),
        "spectral_type_optical": normalize_text(row.get("SpTOpt")),
        "spectral_type_near_infrared": normalize_text(row.get("SpTNIR")),
        "effective_temperature_k": row.get("Teff"),
        "effective_temperature_error_k": row.get("e_Teff"),
        "object_class": object_class,
        "visual_family": brown_dwarf_visual_family(row, object_class),
        "system_hierarchy": normalize_text(row.get("Syst")),
        "system_code": row.get("SystCode"),
        "reference_codes": sorted(
            {
                value
                for field in (
                    "NamesRef",
                    "r_SpTOpt",
                    "r_SpTNIR",
                    "r_Mass",
                    "r_Massl",
                    "PlxPMRef",
                )
                if (value := normalize_text(row.get(field))) is not None
            }
        ),
    }
