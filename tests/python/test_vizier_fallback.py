from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import astronomy_pipeline as pipeline
import validate_data
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
                b"recno\tHIP\tName\n"
                b"-----\t---\t----\n"
                b"\t\ttext\n"
                b"       1\t42\tAlpha\n"
                b"       2\t43\tBeta\n"
            ),
            ["recno", "HIP", "Name"],
        )
        self.assertEqual(
            rows,
            [
                {"recno": "1", "HIP": "42", "Name": "Alpha"},
                {"recno": "2", "HIP": "43", "Name": "Beta"},
            ],
        )

    def test_asu_tsv_rejects_html_error_pages(self) -> None:
        with self.assertRaisesRegex(ValueError, "HTML, not TSV"):
            pipeline.parse_vizier_asu_tsv(
                b"<!DOCTYPE html>\n<html><title>502 Bad Gateway</title></html>\n",
                ["recno"],
            )

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
            rows, endpoint, transport = pipeline.fetch_classical_names_snapshot(requests[0])
        self.assertEqual(calls, ["tap", "asu"])
        self.assertEqual(rows, [{"recno": "1"}])
        self.assertEqual(endpoint, pipeline.VIZIER_ASU_URL)
        self.assertEqual(transport["kind"], "asu")

    def test_tap_success_does_not_call_asu(self) -> None:
        requests = [("IV/27A/catalog", ["recno"], "SELECT recno")]
        with patch.object(
            pipeline, "tap_csv", return_value=[{"recno": "1"}]
        ), patch.object(pipeline, "asu_tsv") as asu:
            rows, endpoint, transport = pipeline.fetch_classical_names_snapshot(requests[0])
        self.assertEqual(rows, [{"recno": "1"}])
        self.assertEqual(endpoint, pipeline.CLASSICAL_NAMES_TAP_URL)
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
        self.assertIn("attempted_at", provenance)
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

    def test_c20pc_tap_failure_reuses_pins_without_writing(self) -> None:
        with patch.object(
            pipeline, "fetch_c20pc_tap_snapshot", side_effect=OSError("TAP unavailable")
        ), patch.object(pipeline, "validate_pinned_c20pc") as validate_pin, patch.object(
            pipeline, "write_json"
        ) as write_extract, patch.object(
            pipeline, "fetch_c20pc_readme"
        ) as fetch_readme, patch.object(pipeline, "now", return_value="2026-11-24T00:00:00+00:00"):
            result = pipeline.refresh_c20pc_snapshot()
        validate_pin.assert_called_once_with()
        write_extract.assert_not_called()
        fetch_readme.assert_not_called()
        provenance = result["reuse_provenance"]
        self.assertEqual(provenance["fetch"], "not_attempted")
        self.assertEqual(provenance["pin"], "reused")
        self.assertEqual(provenance["url"], pipeline.C20PC_TAP_URL)
        self.assertIn("TAP unavailable", provenance["reason"])
        self.assertEqual(provenance["attempted_at"], "2026-11-24T00:00:00+00:00")

    def test_c20pc_tap_success_writes_extract(self) -> None:
        table, notes, references = (
            [{"recno": 1}],
            [{"recno": 1, "continuation_recnos": []}],
            [{"recno": 1}],
        )
        with patch.object(
            pipeline, "fetch_c20pc_tap_snapshot", return_value=[[], [], []]
        ), patch.object(
            pipeline, "normalize_census_tables", return_value=(table, notes, references)
        ), patch.object(
            pipeline, "fetch_c20pc_readme", return_value=(b"pin", None)
        ), patch.object(pipeline, "write_fetched_c20pc_readme") as write_readme, patch.object(
            pipeline, "write_json"
        ) as write_extract:
            result = pipeline.refresh_c20pc_snapshot()
        self.assertIsNone(result)
        write_readme.assert_called_once_with(b"pin", None)
        source = write_extract.call_args.args[1]["source"]
        self.assertEqual(source["endpoint"], pipeline.C20PC_TAP_URL)
        self.assertNotIn("transport", source)

    def test_c20pc_readme_failure_after_tap_reuses_pin_without_writing(self) -> None:
        reuse = {
            "fetch": "failed",
            "pin": "reused",
            "url": pipeline.C20PC_README_URL,
            "reason": "ReadMe unavailable",
            "attempted_at": "2026-11-24T00:00:00+00:00",
        }
        table, notes, references = (
            [{"recno": 1}],
            [{"recno": 1, "continuation_recnos": []}],
            [{"recno": 1}],
        )
        with patch.object(
            pipeline, "fetch_c20pc_tap_snapshot", return_value=[[], [], []]
        ), patch.object(
            pipeline, "normalize_census_tables", return_value=(table, notes, references)
        ), patch.object(
            pipeline, "fetch_c20pc_readme", return_value=(b"pinned ReadMe", reuse)
        ), patch.object(pipeline, "write_fetched_c20pc_readme") as write_readme, patch.object(
            pipeline, "write_json"
        ) as write_extract:
            result = pipeline.refresh_c20pc_snapshot()
        self.assertEqual(result, {"readme_provenance": reuse})
        write_readme.assert_called_once_with(b"pinned ReadMe", reuse)
        self.assertEqual(
            write_extract.call_args.args[1]["source"]["readme_provenance"], reuse
        )

    def test_data_validation_accepts_optional_c20pc_reuse_provenance(self) -> None:
        document = json.loads(pipeline.C20PC_PATH.read_text(encoding="utf-8"))
        document["source"]["reuse_provenance"] = {
            "fetch": "not_attempted",
            "pin": "reused",
            "url": pipeline.C20PC_TAP_URL,
            "reason": "TAP unavailable",
            "attempted_at": "2026-11-24T00:00:00+00:00",
        }
        document["source"]["readme_provenance"] = {
            "fetch": "failed",
            "pin": "reused",
            "url": pipeline.C20PC_README_URL,
            "reason": "ReadMe unavailable",
            "attempted_at": "2026-11-24T00:00:00+00:00",
        }
        with tempfile.TemporaryDirectory() as directory:
            census_path = Path(directory) / "twenty-parsec-census.json"
            census_path.write_text(json.dumps(document), encoding="utf-8")
            with patch.object(validate_data, "C20PC_PATH", census_path):
                validate_data.validate_c20pc()


if __name__ == "__main__":
    unittest.main()
