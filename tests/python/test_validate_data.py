from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from common import (
    CONFIG_PATH,
    REVIEW_PATH,
    SNAPSHOT_PATH,
    mapped_anchor_ids,
    read_json,
)
from validate_data import (
    read_source_rows,
    validate_acquisition_queries,
    validate_snapshot_metadata,
)


class GaiaAcquisitionContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.snapshot = read_json(SNAPSHOT_PATH)
        cls.config = read_json(CONFIG_PATH)
        cls.review = read_json(REVIEW_PATH)
        cls.records_by_id = {
            record["source_id"]: record for record in read_source_rows()
        }
        cls.anchors = mapped_anchor_ids()

    def test_committed_metadata_and_queries_match_the_contract(self) -> None:
        validate_snapshot_metadata(self.snapshot)
        validate_acquisition_queries(
            self.snapshot,
            self.config["context_radius_ly"],
            self.records_by_id,
            self.review,
            self.anchors,
        )

    def test_rejects_altered_quality_contract(self) -> None:
        altered = copy.deepcopy(self.snapshot)
        altered["quality_contract"]["minimum_parallax_over_error"] = 5
        with self.assertRaisesRegex(ValueError, "quality contract"):
            validate_snapshot_metadata(altered)

    def test_rejects_altered_source_identity(self) -> None:
        altered = copy.deepcopy(self.snapshot)
        altered["source"]["catalogue"] = "unreviewed catalogue"
        with self.assertRaisesRegex(ValueError, "source identity"):
            validate_snapshot_metadata(altered)

    def test_rejects_altered_adql(self) -> None:
        altered = copy.deepcopy(self.snapshot)
        altered["queries"][0]["adql"] = altered["queries"][0]["adql"].replace(
            "parallax_over_error >= 10", "parallax_over_error >= 5"
        )
        with self.assertRaisesRegex(ValueError, "acquisition queries"):
            validate_acquisition_queries(
                altered,
                self.config["context_radius_ly"],
                self.records_by_id,
                self.review,
                self.anchors,
            )


if __name__ == "__main__":
    unittest.main()
