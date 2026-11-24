from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import astronomy_pipeline as pipeline
from c20pc_census import C20PC_BIBCODE, C20PC_README_HISTORY_DATE


class VizierFallbackTest(unittest.TestCase):
    def test_asu_tsv_ignores_metadata_and_normalizes_cells(self) -> None:
        raw = (
            b"#INFO query accepted\n"
            b"#META columns follow\n"
            b" recno \t HIP \t Name \n"
            b" ----- \t ----- \t ----- \n"
            b" 1 \t  42 \t Alpha \n"
            b" 2 \t \t  Beta  \n"
        )
        self.assertEqual(
            pipeline.parse_vizier_asu_tsv(raw, ["recno", "HIP", "Name"]),
            [
                {"recno": "1", "HIP": "42", "Name": "Alpha"},
                {"recno": "2", "HIP": "", "Name": "Beta"},
            ],
        )

    def test_asu_tsv_skips_vizier_units_row(self) -> None:
        rows = pipeline.parse_vizier_asu_tsv(
            (
                b"#Name: J/ApJS/271/55/table4\n"
                b"recno\tName\tIMass\n"
                b"-----\t----\t-----\n"
                b"\t\tMsun\n"
                b"       1\tSun\t1.0\n"
                b"       2\tProxima\t0.12\n"
            ),
            ["recno", "Name", "IMass"],
        )
        self.assertEqual(
            rows,
            [
                {"recno": "1", "Name": "Sun", "IMass": "1.0"},
                {"recno": "2", "Name": "Proxima", "IMass": "0.12"},
            ],
        )

    def test_sexagesimal_coordinates_match_pinned_decimals(self) -> None:
        self.assertEqual(
            pipeline.sexagesimal_to_degrees("00 00 13.5250625819", hours=True),
            format(0.05635442742458334, ".17g"),
        )
        self.assertEqual(
            pipeline.sexagesimal_to_degrees("+25 54 20.050166315", hours=False),
            format(25.905569490643053, ".17g"),
        )
        self.assertEqual(
            pipeline.sexagesimal_to_degrees("-68 16 54.378530845", hours=False),
            format(-68.28177181412362, ".17g"),
        )
        rows = pipeline.convert_vizier_asu_coordinates(
            [
                {
                    "recno": "2",
                    "RAJ2000": "00 00 13.5250625819",
                    "DEJ2000": "+25 54 20.050166315",
                    "Name": "SDSS J000013.54+255418.6",
                }
            ]
        )
        self.assertEqual(float(rows[0]["RAJ2000"]), 0.05635442742458334)
        self.assertEqual(float(rows[0]["DEJ2000"]), 25.905569490643053)
        self.assertEqual(rows[0]["Name"], "SDSS J000013.54+255418.6")

    def test_asu_tsv_requires_projected_columns_and_rejects_cap(self) -> None:

        with self.assertRaisesRegex(ValueError, "missing required columns: HIP"):
            pipeline.parse_vizier_asu_tsv(b"recno\n1\n", ["recno", "HIP"])
        with self.assertRaisesRegex(ValueError, "truncated or capped"):
            pipeline.parse_vizier_asu_tsv(
                b"#INFO -out.max=10000 rows returned\nrecno\n1\n", ["recno"]
            )

    def test_tap_failure_uses_asu_after_tap(self) -> None:
        requests = [("IV/27A/catalog", ["recno"], "SELECT recno")]
        calls: list[str] = []

        def failed_tap(endpoint: str, query: str, **_: object) -> list[dict[str, str]]:
            calls.append("tap")
            raise OSError("TAP unavailable")

        def successful_asu(table: str, columns: list[str]):
            calls.append("asu")
            return ([{"recno": "1"}], {"source": table, "columns": columns, "out_max": "unlimited", "endpoint": pipeline.VIZIER_ASU_URL})

        with patch.object(pipeline, "tap_csv", failed_tap), patch.object(
            pipeline, "asu_tsv", successful_asu
        ):
            rows, endpoint, transport = pipeline.fetch_vizier_snapshot(requests)
        self.assertEqual(calls, ["tap", "asu"])
        self.assertEqual(rows, [[{"recno": "1"}]])
        self.assertEqual(endpoint, pipeline.VIZIER_ASU_URL)
        self.assertEqual(transport["kind"], "asu")

    def test_tap_success_does_not_call_asu(self) -> None:
        requests = [("IV/27A/catalog", ["recno"], "SELECT recno")]
        with patch.object(
            pipeline, "tap_csv", return_value=[{"recno": "1"}]
        ), patch.object(pipeline, "asu_tsv") as asu:
            rows, endpoint, transport = pipeline.fetch_vizier_snapshot(requests)
        self.assertEqual(rows, [[{"recno": "1"}]])
        self.assertEqual(endpoint, pipeline.C20PC_TAP_URL)
        self.assertIsNone(transport)
        asu.assert_not_called()

    def test_unreachable_readme_reuses_valid_pin_without_writing(self) -> None:
        pinned = f"{C20PC_README_HISTORY_DATE}\n{C20PC_BIBCODE}\n".encode()
        with tempfile.TemporaryDirectory() as directory:
            readme_path = Path(directory) / "ReadMe"
            readme_path.write_bytes(pinned)
            with patch.object(Path, "write_bytes") as write_pin, patch.object(
                pipeline, "C20PC_README_PATH", readme_path
            ), patch.object(
                pipeline.urllib.request, "urlopen", side_effect=OSError("DNS failure")
            ):
                readme, provenance = pipeline.fetch_c20pc_readme()
                pipeline.write_fetched_c20pc_readme(readme, provenance)
            write_pin.assert_not_called()
            self.assertEqual(readme, pinned)
            self.assertEqual(readme_path.read_bytes(), pinned)
        self.assertEqual(provenance["fetch"], "failed")
        self.assertEqual(provenance["pin"], "reused")
        self.assertIn("DNS failure", provenance["reason"])
        self.assertIn(pipeline.C20PC_README_URL, provenance["reason"])
        self.assertEqual(provenance["url"], pipeline.C20PC_README_URL)

    def test_successful_readme_fetch_writes_the_new_pin(self) -> None:
        fetched = f"{C20PC_README_HISTORY_DATE}\n{C20PC_BIBCODE}\nnew pin\n".encode()

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return fetched

        with tempfile.TemporaryDirectory() as directory:
            readme_path = Path(directory) / "ReadMe"
            readme_path.write_text("old pin", encoding="utf-8")
            with patch.object(pipeline, "C20PC_README_PATH", readme_path), patch.object(
                pipeline.urllib.request, "urlopen", return_value=Response()
            ):
                readme, provenance = pipeline.fetch_c20pc_readme()
                pipeline.write_fetched_c20pc_readme(readme, provenance)
            self.assertEqual(readme_path.read_bytes(), fetched)
        self.assertIsNone(provenance)


if __name__ == "__main__":
    unittest.main()
