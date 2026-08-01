from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

CLASSICAL_NAMES_TAP_URL = "https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync"
CLASSICAL_NAMES_TABLE = "IV/27A/catalog"
CLASSICAL_NAMES_RELEASE = "IV/27A (Kostjuk 2002)"
CLASSICAL_NAMES_COLUMNS = [
    "recno",
    "HD",
    "HR",
    "HIP",
    "Fl",
    "Bayer",
    "Cst",
    "SimbadName",
]
CLASSICAL_NAMES_QUERY = (
    'SELECT recno, HD, HR, HIP, Fl, Bayer, Cst, SimbadName\n'
    'FROM "IV/27A/catalog"\n'
    "WHERE HIP IS NOT NULL\n"
    "ORDER BY recno"
)
CLASSICAL_NAMES_ACKNOWLEDGEMENT = (
    "This research has made use of the VizieR catalogue access tool, CDS, "
    "Strasbourg, France (DOI: 10.26093/cds/vizier), and the IV/27A "
    "HD-DM-GC-HR-HIP-Bayer-Flamsteed Cross Index (Kostjuk, 2002)."
)

GREEK_BAYER_NAMES = {
    "alf": "Alpha",
    "bet": "Beta",
    "gam": "Gamma",
    "del": "Delta",
    "eps": "Epsilon",
    "zet": "Zeta",
    "eta": "Eta",
    "the": "Theta",
    "iot": "Iota",
    "kap": "Kappa",
    "lam": "Lambda",
    "mu.": "Mu",
    "nu.": "Nu",
    "ksi": "Xi",
    "omi": "Omicron",
    "pi.": "Pi",
    "rho": "Rho",
    "sig": "Sigma",
    "tau": "Tau",
    "ups": "Upsilon",
    "phi": "Phi",
    "chi": "Chi",
    "psi": "Psi",
    "ome": "Omega",
}

# IAU abbreviations mapped to the Latin genitives used by Bayer and Flamsteed
# designations.  The source retains the original three-letter code.
CONSTELLATION_GENITIVES = {
    "And": "Andromedae", "Ant": "Antliae", "Aps": "Apodis",
    "Aqr": "Aquarii", "Aql": "Aquilae", "Ara": "Arae", "Ari": "Arietis",
    "Aur": "Aurigae", "Boo": "Bootis", "Cae": "Caeli", "Cam": "Camelopardalis",
    "Cnc": "Cancri", "CVn": "Canum Venaticorum", "CMa": "Canis Majoris",
    "CMi": "Canis Minoris", "Cap": "Capricorni", "Car": "Carinae",
    "Cas": "Cassiopeiae", "Cen": "Centauri", "Cep": "Cephei", "Cet": "Ceti",
    "Cha": "Chamaeleontis", "Cir": "Circini", "Col": "Columbae",
    "Com": "Comae Berenices", "CrA": "Coronae Australis", "CrB": "Coronae Borealis",
    "Crv": "Corvi", "Crt": "Crateris", "Cru": "Crucis", "Cyg": "Cygni",
    "Del": "Delphini", "Dor": "Doradus", "Dra": "Draconis", "Equ": "Equulei",
    "Eri": "Eridani", "For": "Fornacis", "Gem": "Geminorum", "Gru": "Gruis",
    "Her": "Herculis", "Hor": "Horologii", "Hya": "Hydrae", "Hyi": "Hydri",
    "Ind": "Indi", "Lac": "Lacertae", "Leo": "Leonis", "LMi": "Leonis Minoris",
    "Lep": "Leporis", "Lib": "Librae", "Lup": "Lupi", "Lyn": "Lyncis",
    "Lyr": "Lyrae", "Men": "Mensae", "Mic": "Microscopii", "Mon": "Monocerotis",
    "Mus": "Muscae", "Nor": "Normae", "Oct": "Octantis", "Oph": "Ophiuchi",
    "Ori": "Orionis", "Pav": "Pavonis", "Peg": "Pegasi", "Per": "Persei",
    "Phe": "Phoenicis", "Pic": "Pictoris", "Psc": "Piscium", "PsA": "Piscis Austrini",
    "Pup": "Puppis", "Pyx": "Pyxidis", "Ret": "Reticuli", "Sge": "Sagittae",
    "Sgr": "Sagittarii", "Sco": "Scorpii", "Scl": "Sculptoris", "Sct": "Scuti",
    "Ser": "Serpentis", "Sex": "Sextantis", "Tau": "Tauri", "Tel": "Telescopii",
    "Tri": "Trianguli", "TrA": "Trianguli Australis", "Tuc": "Tucanae",
    "UMa": "Ursae Majoris", "UMi": "Ursae Minoris", "Vel": "Velorum",
    "Vir": "Virginis", "Vol": "Volantis", "Vul": "Vulpeculae",
}


def decimal_identifier(value: Any) -> str | None:
    candidate = str(value or "").strip()
    if candidate.endswith(".0"):
        candidate = candidate[:-2]
    return str(int(candidate)) if candidate.isdecimal() else None


def bayer_designation(row: dict[str, Any]) -> str | None:
    raw = str(row.get("Bayer") or "").strip()
    constellation = CONSTELLATION_GENITIVES.get(str(row.get("Cst") or "").strip())
    if constellation is None:
        return None
    greek_match = re.fullmatch(r"([a-z]{3}|mu\.|nu\.|pi\.)([0-9]{2})?", raw)
    if greek_match is not None:
        greek = GREEK_BAYER_NAMES.get(greek_match.group(1))
        if greek is None:
            return None
        ordinal = str(int(greek_match.group(2))) if greek_match.group(2) else ""
        return f"{greek}{ordinal} {constellation}"
    latin_match = re.fullmatch(r"([A-Za-z])([0-9]{2})?", raw)
    if latin_match is None:
        return None
    ordinal = str(int(latin_match.group(2))) if latin_match.group(2) else ""
    return f"{latin_match.group(1)}{ordinal} {constellation}"


def flamsteed_designation(row: dict[str, Any]) -> str | None:
    number = decimal_identifier(row.get("Fl"))
    constellation = CONSTELLATION_GENITIVES.get(str(row.get("Cst") or "").strip())
    return f"{number} {constellation}" if number and constellation else None


def exact_classical_matches(
    cns5_rows: list[dict[str, Any]],
    classical_rows: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    source_by_hip: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in classical_rows:
        hip = decimal_identifier(row.get("HIP"))
        recno = decimal_identifier(row.get("recno"))
        if hip is None or recno is None:
            raise ValueError("IV/27A row lacks an exact decimal HIP or recno")
        source_by_hip[hip].append(row)

    targets_by_hip: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for cns5 in cns5_rows:
        hip = decimal_identifier(cns5.get("hip_id"))
        if hip is not None:
            targets_by_hip[hip].append(cns5)

    matches: dict[str, dict[str, Any]] = {}
    for cns5 in cns5_rows:
        hip = decimal_identifier(cns5.get("hip_id"))
        if hip is None or hip not in source_by_hip:
            continue
        source_rows = source_by_hip[hip]
        if len(source_rows) != 1 or len(targets_by_hip[hip]) != 1:
            # HIP can identify an unresolved/composite source while IV/27A carries
            # several component rows, or CNS5 can repeat a system-level HIP across
            # components. Without an exact HD value on both sides this is not an
            # accepted edge and therefore contributes no name.
            continue
        row = source_rows[0]
        bayer = bayer_designation(row)
        flamsteed = flamsteed_designation(row)
        if bayer is None and flamsteed is None:
            continue
        cns5_id = decimal_identifier(cns5.get("cns5_id"))
        if cns5_id is None or cns5_id in matches:
            raise ValueError("IV/27A match has an invalid or duplicate CNS5 identity")
        matches[cns5_id] = {
            "match_method": "exact_hip",
            "hip_id": hip,
            "source_recno": int(row["recno"]),
            "source_hd": decimal_identifier(row.get("HD")),
            "source_hr": decimal_identifier(row.get("HR")),
            "source_bayer": str(row.get("Bayer") or "").strip() or None,
            "source_flamsteed": decimal_identifier(row.get("Fl")),
            "source_constellation": str(row.get("Cst") or "").strip(),
            "bayer_designation": bayer,
            "flamsteed_designation": flamsteed,
        }
    return matches
