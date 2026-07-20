from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "data" / "source"
GENERATED_PATH = ROOT / "src" / "data" / "nearby-systems.json"
REVIEW_PATH = SOURCE_DIR / "system-review.json"
SNAPSHOT_PATH = SOURCE_DIR / "cns5-nearest-components.json"


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_cns5_line(line: str) -> dict[str, Any]:
    def text(start: int, end: int) -> str | None:
        value = line[start:end].strip()
        return None if value in ("", "-") else value

    def number(start: int, end: int) -> float | None:
        value = text(start, end)
        return float(value) if value not in (None, "-") else None

    def integer(start: int, end: int) -> int | None:
        value = text(start, end)
        return int(value) if value not in (None, "-") else None

    return {
        "cns5_id": integer(0, 4),
        "gj": text(5, 11),
        "component": text(12, 16),
        "component_count": integer(17, 18),
        "is_primary": text(19, 20) == "1",
        "gj_system_primary": text(21, 26),
        "gaia_dr3_id": text(27, 46),
        "hip_id": integer(47, 53),
        "ra_deg": number(54, 74),
        "dec_deg": number(75, 98),
        "epoch_year": number(99, 108),
        "position_bibcode": text(109, 128),
        "parallax_mas": number(129, 148),
        "parallax_error_mas": number(149, 162),
        "parallax_bibcode": text(163, 182),
        "g_magnitude": number(361, 371),
    }
