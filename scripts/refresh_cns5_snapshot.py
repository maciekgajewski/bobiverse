from __future__ import annotations

import argparse
import datetime as dt
import tempfile
import urllib.request
from pathlib import Path

from common import REVIEW_PATH, SNAPSHOT_PATH, parse_cns5_line, read_json, sha256, write_json

SOURCE_URL = "https://cdsarc.cds.unistra.fr/ftp/J/A+A/670/A19/cns5.dat"
EXPECTED_RECORD_LENGTH = 761


def main() -> None:
    parser = argparse.ArgumentParser(description="Refresh the reviewed compact CNS5 input snapshot.")
    parser.add_argument("--source-file", type=Path, help="Use an already downloaded CNS5 cns5.dat file.")
    args = parser.parse_args()

    if args.source_file:
        source_path = args.source_file
    else:
        with tempfile.NamedTemporaryFile(suffix=".dat", delete=False) as downloaded:
            with urllib.request.urlopen(SOURCE_URL, timeout=60) as response:
                downloaded.write(response.read())
            source_path = Path(downloaded.name)

    review = read_json(REVIEW_PATH)
    requested = {selector for system in review["systems"] for selector in system["gj_selectors"]}
    raw_lines = source_path.read_text(encoding="utf-8").splitlines()
    records = [parse_cns5_line(line) for line in raw_lines if len(line) >= EXPECTED_RECORD_LENGTH]
    selected = [record for record in records if record["gj"] in requested]
    missing = requested - {record["gj"] for record in selected}
    if missing:
        raise ValueError(f"CNS5 snapshot did not contain reviewed GJ selectors: {sorted(missing)}")

    snapshot = {
        "schema_version": "1.0.0",
        "source": {
            "catalogue": "CNS5 J/A+A/670/A19",
            "release": "corrected 2023-12-13",
            "url": SOURCE_URL,
            "retrieved_at": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat(),
            "download_sha256": sha256(source_path),
            "record_count": len(raw_lines),
            "acknowledgement": "This project uses the VizieR catalogue access tool, CDS, Strasbourg, France (DOI: 10.26093/cds/vizier).",
        },
        "records": selected,
    }
    write_json(SNAPSHOT_PATH, snapshot)
    print(f"Wrote {len(selected)} reviewed component records to {SNAPSHOT_PATH.relative_to(Path.cwd())}")


if __name__ == "__main__":
    main()
