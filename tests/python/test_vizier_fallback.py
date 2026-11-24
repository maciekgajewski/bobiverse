from __future__ import annotations

import csv
import http.client
import io
import json
import shutil
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import astronomy_pipeline as pipeline
import refresh_gaia_snapshot
import validate_data
from c20pc_census import C20PC_BIBCODE, C20PC_README_HISTORY_DATE


class VizierFallbackTest(unittest.TestCase):
    def classical_rows(self, name: str = "Alpha") -> list[dict[str, str]]:
        return [{
            "recno": "1", "HD": "1", "HR": "1", "HIP": "1",
            "Fl": "", "Bayer": "", "Cst": "And", "SimbadName": name,
        }]

    def classical_pin(self, rows: list[dict[str, str]]) -> dict[str, object]:
        return {
            "row_count": len(rows),
            "normalised_sha256": pipeline.sha256_bytes(
                pipeline.csv_bytes(pipeline.CLASSICAL_NAMES_COLUMNS, rows)
            ),
        }

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

    def test_asu_tsv_rejects_info_error_page_after_mime_preamble(self) -> None:
        # Shape taken from the CFA VizieR ASU probe: HTTP 200 and a TSV
        # Content-Type, but the body is a MIME/VOTable error document with
        # #INFO Error= and #INFO QUERY_STATUS=ERROR after a leading MIME line.
        raw = (
            b"Content-Type: application/x-votable+xml\n"
            b"Content-Disposition: attachment; filename=vizier_votable.vot\n"
            b"DocumentRef: VOTx185134\n"
            b"#\n"
            b"#   VizieR Astronomical Server vizier.cfa.harvard.edu\n"
            b"#\n"
            b"#INFO\tError=The database is not currently reachable.\t\n"
            b"#INFO\tError= \t\n"
            b"#INFO\tQUERY_STATUS=ERROR\t\n"
            b"#\n"
        )
        with self.assertRaises(ValueError) as ctx:
            pipeline.parse_vizier_asu_tsv(
                raw,
                ["recno", "HD", "HR", "HIP", "Fl", "Bayer", "Cst", "SimbadName"],
            )
        message = str(ctx.exception)
        self.assertRegex(message, r"ASU query failed")
        self.assertRegex(message, r"QUERY_STATUS=ERROR")
        self.assertIn("database is not currently reachable", message)
        self.assertNotIn("missing required columns", message)

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
        ), patch.object(pipeline, "prepare_classical_names_rows", return_value=[{"recno": "1"}]):
            rows, endpoint, transport = pipeline.fetch_classical_names_snapshot(requests[0])
        self.assertEqual(calls, ["tap", "asu"])
        self.assertEqual(rows, [{"recno": "1"}])
        self.assertEqual(endpoint, pipeline.VIZIER_ASU_URL)
        self.assertEqual(transport["kind"], "asu")

    def test_tap_success_does_not_call_asu(self) -> None:
        requests = [("IV/27A/catalog", ["recno"], "SELECT recno")]
        with patch.object(
            pipeline, "tap_csv", return_value=[{"recno": "1"}]
        ), patch.object(pipeline, "asu_tsv") as asu, patch.object(
            pipeline, "prepare_classical_names_rows", return_value=[{"recno": "1"}]
        ):
            rows, endpoint, transport = pipeline.fetch_classical_names_snapshot(requests[0])
        self.assertEqual(rows, [{"recno": "1"}])
        self.assertEqual(endpoint, pipeline.CLASSICAL_NAMES_TAP_URL)
        self.assertIsNone(transport)
        asu.assert_not_called()

    def test_classical_pin_check_rejects_same_count_content_change_and_accepts_pin(self) -> None:
        rows = self.classical_rows()
        changed = self.classical_rows("Beta")
        with patch.object(pipeline, "read_extract", return_value=(self.classical_pin(rows), [])):
            self.assertEqual(pipeline.prepare_classical_names_rows(rows), rows)
            with self.assertRaisesRegex(ValueError, "checksum"):
                pipeline.prepare_classical_names_rows(changed)
            wrong_count_pin = {**self.classical_pin(rows), "row_count": len(rows) + 1}
            with patch.object(pipeline, "read_extract", return_value=(wrong_count_pin, [])):
                with self.assertRaisesRegex(ValueError, "row count"):
                    pipeline.prepare_classical_names_rows(rows)

    def test_tap_failures_fall_back_to_asu_and_cfa_pin_failure_raises(self) -> None:
        rows = self.classical_rows()
        for error in (
            http.client.IncompleteRead(b"partial", 1),
            http.client.HTTPException("TAP error"),
        ):
            with self.subTest(error=type(error).__name__), patch.object(
                pipeline, "tap_csv", side_effect=error
            ), patch.object(
                pipeline, "asu_tsv", return_value=(rows, {"source": "IV/27A/catalog", "columns": pipeline.CLASSICAL_NAMES_COLUMNS, "out_max": "unlimited", "endpoint": pipeline.VIZIER_ASU_URL})
            ) as asu, patch.object(
                pipeline, "read_extract", return_value=(self.classical_pin(rows), [])
            ):
                fetched, endpoint, _ = pipeline.fetch_classical_names_snapshot(
                    (pipeline.CLASSICAL_NAMES_TABLE, pipeline.CLASSICAL_NAMES_COLUMNS, pipeline.CLASSICAL_NAMES_QUERY)
                )
                self.assertEqual(fetched, rows)
                self.assertEqual(endpoint, pipeline.VIZIER_ASU_URL)
                asu.assert_called_once()

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *args: object) -> None:
                return None

            def read(self) -> bytes:
                return b"recno\n" + b"x" * (csv.field_size_limit() + 1)

        class Opener:
            def open(self, request: object, timeout: int) -> Response:
                return Response()

        with patch.object(
            pipeline.urllib.request, "build_opener", return_value=Opener()
        ), patch.object(
            pipeline, "asu_tsv", return_value=(rows, {"source": "IV/27A/catalog", "columns": pipeline.CLASSICAL_NAMES_COLUMNS, "out_max": "unlimited", "endpoint": pipeline.VIZIER_ASU_URL})
        ) as asu, patch.object(
            pipeline, "read_extract", return_value=(self.classical_pin(rows), [])
        ):
            fetched, endpoint, _ = pipeline.fetch_classical_names_snapshot(
                (pipeline.CLASSICAL_NAMES_TABLE, pipeline.CLASSICAL_NAMES_COLUMNS, pipeline.CLASSICAL_NAMES_QUERY)
            )
            self.assertEqual(fetched, rows)
            self.assertEqual(endpoint, pipeline.VIZIER_ASU_URL)
            asu.assert_called_once()

        with patch.object(pipeline, "tap_csv", return_value=rows), patch.object(
            pipeline, "asu_tsv", return_value=(rows, {"source": "IV/27A/catalog", "columns": pipeline.CLASSICAL_NAMES_COLUMNS, "out_max": "unlimited", "endpoint": pipeline.VIZIER_ASU_URL})
        ) as asu, patch.object(
            pipeline, "read_extract", side_effect=[(self.classical_pin(self.classical_rows("Beta")), []), (self.classical_pin(rows), [])]
        ):
            _, endpoint, _ = pipeline.fetch_classical_names_snapshot(
                (pipeline.CLASSICAL_NAMES_TABLE, pipeline.CLASSICAL_NAMES_COLUMNS, pipeline.CLASSICAL_NAMES_QUERY)
            )
            self.assertEqual(endpoint, pipeline.VIZIER_ASU_URL)
            asu.assert_called_once()

        with patch.object(pipeline, "tap_csv", side_effect=OSError("TAP unavailable")), patch.object(
            pipeline, "asu_tsv", return_value=(rows, {"source": "IV/27A/catalog", "columns": pipeline.CLASSICAL_NAMES_COLUMNS, "out_max": "unlimited", "endpoint": pipeline.VIZIER_ASU_URL})
        ), patch.object(pipeline, "read_extract", return_value=(self.classical_pin(self.classical_rows("Beta")), [])):
            with self.assertRaisesRegex(ValueError, "checksum"):
                pipeline.fetch_classical_names_snapshot(
                    (pipeline.CLASSICAL_NAMES_TABLE, pipeline.CLASSICAL_NAMES_COLUMNS, pipeline.CLASSICAL_NAMES_QUERY)
                )

    def test_classical_refresh_does_not_write_when_cfa_fails_pin_check(self) -> None:
        rows = self.classical_rows()
        with tempfile.TemporaryDirectory() as directory:
            source_dir = Path(directory)
            json_path = source_dir / "classical-star-names.json"
            csv_path = source_dir / "classical-star-names.csv"
            shutil.copyfile(pipeline.CLASSICAL_NAMES_PATH, json_path)
            shutil.copyfile(pipeline.SOURCE_DIR / "classical-star-names.csv", csv_path)
            original_json = json_path.read_bytes()
            original_csv = csv_path.read_bytes()
            with patch.object(pipeline, "CLASSICAL_NAMES_PATH", json_path), patch.object(
                pipeline, "SOURCE_DIR", source_dir
            ), patch.object(
                pipeline, "tap_csv", side_effect=OSError("TAP unavailable")
            ), patch.object(
                pipeline, "asu_tsv", return_value=(rows, {"source": "IV/27A/catalog", "columns": pipeline.CLASSICAL_NAMES_COLUMNS, "out_max": "unlimited", "endpoint": pipeline.VIZIER_ASU_URL})
            ):
                with self.assertRaisesRegex(ValueError, "checksum"):
                    pipeline.refresh_classical_names_snapshot()
            self.assertEqual(json_path.read_bytes(), original_json)
            self.assertEqual(csv_path.read_bytes(), original_csv)

    def test_unreachable_readme_reuses_valid_pin_without_writing(self) -> None:
        pinned = f"{C20PC_README_HISTORY_DATE}\n{C20PC_BIBCODE}\n".encode()
        with tempfile.TemporaryDirectory() as directory:
            readme_path = Path(directory) / "ReadMe"
            readme_path.write_bytes(pinned)
            with patch.object(Path, "write_bytes") as write_pin, patch.object(
                pipeline, "C20PC_README_PATH", readme_path
            ), patch.object(
                pipeline, "read_c20pc", return_value=({"readme_sha256": pipeline.sha256_bytes(pinned)}, [], [], [])
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

    def test_reused_readme_requires_manifest_sha256(self) -> None:
        pinned = f"{C20PC_README_HISTORY_DATE}\n{C20PC_BIBCODE}\n".encode()
        with tempfile.TemporaryDirectory() as directory:
            readme_path = Path(directory) / "ReadMe"
            readme_path.write_bytes(pinned)
            with patch.object(pipeline, "C20PC_README_PATH", readme_path), patch.object(
                pipeline, "read_c20pc", return_value=({"readme_sha256": "0" * 64}, [], [], [])
            ), patch.object(pipeline.urllib.request, "urlopen", side_effect=OSError("DNS failure")):
                with self.assertRaisesRegex(ValueError, "checksum"):
                    pipeline.fetch_c20pc_readme()
            with patch.object(pipeline, "C20PC_README_PATH", readme_path), patch.object(
                pipeline, "read_c20pc", return_value=({"readme_sha256": pipeline.sha256_bytes(pinned)}, [], [], [])
            ), patch.object(pipeline.urllib.request, "urlopen", side_effect=OSError("DNS failure")):
                self.assertEqual(pipeline.fetch_c20pc_readme()[0], pinned)

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

    def test_c20pc_tap_failure_persists_reuse_and_validates_without_overwriting_readme(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            census_path = Path(directory) / "twenty-parsec-census.json"
            readme_path = Path(directory) / "ReadMe"
            shutil.copyfile(pipeline.C20PC_PATH, census_path)
            shutil.copyfile(pipeline.C20PC_README_PATH, readme_path)
            original = json.loads(census_path.read_text(encoding="utf-8"))
            readme_bytes = readme_path.read_bytes()
            with patch.object(pipeline, "C20PC_PATH", census_path), patch.object(
                pipeline, "C20PC_README_PATH", readme_path
            ), patch.object(pipeline, "fetch_c20pc_tap_snapshot", side_effect=OSError("TAP unavailable")), patch.object(
                pipeline, "now", return_value="2026-11-24T00:00:00+00:00"
            ):
                result = pipeline.refresh_c20pc_snapshot()
            document = json.loads(census_path.read_text(encoding="utf-8"))
            self.assertEqual(document["table4"], original["table4"])
            self.assertEqual(document["source"]["queries"], original["source"]["queries"])
            self.assertEqual(readme_path.read_bytes(), readme_bytes)
            self.assertEqual(result["reuse_provenance"], document["source"]["reuse_provenance"])
            with patch.object(validate_data, "C20PC_PATH", census_path), patch.object(
                validate_data, "C20PC_README_PATH", readme_path
            ):
                validate_data.validate_c20pc()

    def test_validate_c20pc_rejects_incomplete_reuse_provenance(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            census_path = Path(directory) / "twenty-parsec-census.json"
            readme_path = Path(directory) / "ReadMe"
            shutil.copyfile(pipeline.C20PC_PATH, census_path)
            shutil.copyfile(pipeline.C20PC_README_PATH, readme_path)
            document = json.loads(census_path.read_text(encoding="utf-8"))
            document["source"]["reuse_provenance"] = {
                "fetch": "not_attempted",
                "pin": "reused",
                "url": pipeline.C20PC_TAP_URL,
                "attempted_at": "2026-11-24T00:00:00+00:00",
            }
            census_path.write_text(json.dumps(document), encoding="utf-8")
            with patch.object(validate_data, "C20PC_PATH", census_path), patch.object(
                validate_data, "C20PC_README_PATH", readme_path
            ):
                with self.assertRaisesRegex(ValueError, "schema validation failed"):
                    validate_data.validate_c20pc()

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

    def test_c20pc_only_cli_reports_reused_snapshot(self) -> None:
        output = io.StringIO()
        with patch.object(
            refresh_gaia_snapshot,
            "refresh_c20pc_snapshot",
            return_value={"reuse_provenance": {"pin": "reused"}},
        ), patch.object(sys, "argv", ["refresh_gaia_snapshot.py", "--c20pc-only"]), redirect_stdout(output):
            refresh_gaia_snapshot.main()
        self.assertIn("reused", output.getvalue().lower())

    def test_validate_extract_requires_endpoint_consistent_asu_transport(self) -> None:
        document = json.loads(pipeline.CLASSICAL_NAMES_PATH.read_text(encoding="utf-8"))
        rows = document["rows"]
        with tempfile.TemporaryDirectory() as directory:
            manifest_path = Path(directory) / "classical-star-names.json"

            def validate(source: dict[str, object]) -> None:
                candidate = {**document, "source": source}
                manifest_path.write_text(json.dumps(candidate), encoding="utf-8")
                with patch.object(validate_data, "CLASSICAL_NAMES_PATH", manifest_path), patch.object(
                    validate_data, "read_extract", return_value=(source, rows)
                ):
                    validate_data.validate_extract(
                        "classical_names", pipeline.CLASSICAL_NAMES_COLUMNS, "recno"
                    )

            asu_source = {
                **document["source"],
                "endpoint": pipeline.VIZIER_ASU_URL,
                "transport": {
                    "kind": "asu",
                    "endpoint": pipeline.VIZIER_ASU_URL,
                    "requests": [{
                        "source": pipeline.CLASSICAL_NAMES_TABLE,
                        "columns": pipeline.CLASSICAL_NAMES_COLUMNS,
                        "out_max": "unlimited",
                        "endpoint": pipeline.VIZIER_ASU_URL,
                    }],
                },
            }
            validate(asu_source)

            without_transport = {key: value for key, value in asu_source.items() if key != "transport"}
            with self.assertRaisesRegex(ValueError, "schema validation failed"):
                validate(without_transport)

            tap_with_transport = {
                **document["source"],
                "endpoint": pipeline.CLASSICAL_NAMES_TAP_URL,
                "transport": asu_source["transport"],
            }
            with self.assertRaisesRegex(ValueError, "schema validation failed"):
                validate(tap_with_transport)

            wrong_table = json.loads(json.dumps(asu_source))
            wrong_table["transport"]["requests"][0]["source"] = "wrong/table"
            with self.assertRaisesRegex(ValueError, "schema validation failed"):
                validate(wrong_table)

            wrong_columns = json.loads(json.dumps(asu_source))
            wrong_columns["transport"]["requests"][0]["columns"] = ["recno"]
            with self.assertRaisesRegex(ValueError, "schema validation failed"):
                validate(wrong_columns)


if __name__ == "__main__":
    unittest.main()
