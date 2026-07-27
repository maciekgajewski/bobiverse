from __future__ import annotations

import hashlib
import json
import gzip
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "data" / "source"
CONFIG_PATH = ROOT / "data" / "config" / "map-display.json"
CONFIG_SCHEMA_PATH = ROOT / "data" / "schema" / "map-display.schema.json"
SOURCE_EXTRACT_SCHEMA_PATH = (
    ROOT / "data" / "schema" / "astronomy-source-extract.schema.json"
)
GENERATED_PATH = ROOT / "src" / "data" / "nearby-systems.json"
REVIEW_PATH = SOURCE_DIR / "system-review.json"
IDENTITY_REGISTRY_PATH = SOURCE_DIR / "identity-registry.json"
CANDIDATES_PATH = SOURCE_DIR / "system-candidates.json"
LANDMARKS_PATH = SOURCE_DIR / "major-local-systems.json"
GCNS_PATH = SOURCE_DIR / "gcns-neighbourhood.json"
CNS5_PATH = SOURCE_DIR / "cns5-nearby-components.json"
GAIA_ENRICHMENT_PATH = SOURCE_DIR / "gaia-dr3-enrichment.json"
WDS_PATH = SOURCE_DIR / "wds-precise.txt.gz"
WDS_FORMAT_PATH = SOURCE_DIR / "wdsweb-format.txt"

LIGHT_YEARS_PER_PARSEC = 3.261563777
GAIA_CATALOGUE = "Gaia DR3 gaiadr3.gaia_source"
GAIA_RELEASE = "2022-06-13"
GAIA_ARCHIVE_URL = "https://gea.esac.esa.int/tap-server/tap/sync"
GAIA_ACKNOWLEDGEMENT = (
    "This work has made use of data from the European Space Agency (ESA) mission "
    "Gaia (https://www.cosmos.esa.int/gaia), processed by the Gaia Data Processing "
    "and Analysis Consortium (DPAC, https://www.cosmos.esa.int/web/gaia/dpac/consortium)."
)


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True) + "\n").encode("utf-8")


def value_sha256(value: Any) -> str:
    return sha256_bytes(canonical_json_bytes(value))


def read_gzip(path: Path) -> bytes:
    with gzip.open(path, "rb") as handle:
        return handle.read()


def mapped_anchor_ids() -> list[str]:
    ids: set[str] = set()

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            astronomy_id = value.get("astronomy_object_id")
            if isinstance(astronomy_id, str):
                ids.add(astronomy_id)
            for child in value.values():
                visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    for path in sorted((ROOT / "data" / "narrative").rglob("*.json")):
        visit(read_json(path))
    return sorted(ids)
