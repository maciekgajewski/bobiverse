from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "data" / "source"
CONFIG_PATH = ROOT / "data" / "config" / "map-display.json"
CONFIG_SCHEMA_PATH = ROOT / "data" / "schema" / "map-display.schema.json"
GENERATED_PATH = ROOT / "src" / "data" / "nearby-systems.json"
REVIEW_PATH = SOURCE_DIR / "system-review.json"
RAW_SNAPSHOT_PATH = SOURCE_DIR / "gaia-dr3-neighbourhood.csv"
SNAPSHOT_PATH = SOURCE_DIR / "gaia-dr3-neighbourhood.json"

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
