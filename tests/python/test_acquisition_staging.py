from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

import astropy.units as u
from astropy.coordinates import ICRS, SkyCoord

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from astronomy_pipeline import (
    CNS5_COLUMNS,
    GCNS_COLUMNS,
    LY_PER_PC,
    cns5_query,
    exact_source_query,
    gcns_anchor_query,
    gcns_query,
)
from validate_data import validate_acquisition_queries


class AcquisitionStagingTest(unittest.TestCase):
    # Entirely synthetic sources: an anchor row may already be in the extract
    # without the pinned acquisition plan having requested its neighbourhood.
    gcns_rows = [
        {"source_id": "101", "xcoord_50": "1", "ycoord_50": "2", "zcoord_50": "3"},
        {"source_id": "202", "xcoord_50": "4", "ycoord_50": "5", "zcoord_50": "6"},
    ]
    cns5_rows = [{"cns5_id": "303", "ra": "45", "dec": "30", "parallax": "200"}]
    bootstraps = [
        {"anchor_id": "synthetic-a", "catalogue": "gcns", "source_id": "101"},
        {"anchor_id": "synthetic-b", "catalogue": "gcns", "source_id": "202"},
        {"anchor_id": "synthetic-c", "catalogue": "cns5", "source_id": "303"},
    ]
    config = {"context_radius_ly": 20}
    all_anchors = ["sol", "synthetic-a", "synthetic-b", "synthetic-c"]

    def manifests(self, anchors: list[str]) -> tuple[dict, dict]:
        radius = self.config["context_radius_ly"] / LY_PER_PC
        gcns = {
            "adql": gcns_query(radius),
            "queries": [{"stage": "coverage", "anchor_id": "sol", "adql": gcns_query(radius)}],
        }
        cns5 = {
            "adql": cns5_query(),
            "queries": [{"stage": "local-census", "adql": cns5_query()}],
        }
        for catalogue, manifest, table, columns, key in [
            ("gcns", gcns, "gcns.main", GCNS_COLUMNS, "source_id"),
            ("cns5", cns5, "cns5update.main", CNS5_COLUMNS, "cns5_id"),
        ]:
            seeds = [
                b for b in self.bootstraps
                if b["anchor_id"] in anchors and b["catalogue"] == catalogue
            ]
            if seeds:
                manifest["queries"].append({
                    "stage": "bootstrap",
                    "anchor_ids": [b["anchor_id"] for b in seeds],
                    "adql": exact_source_query(
                        table, columns, key, [b["source_id"] for b in seeds]
                    ),
                })
        positions = {
            "synthetic-a": {"xg": 1.0, "yg": 2.0, "zg": 3.0},
            "synthetic-b": {"xg": 4.0, "yg": 5.0, "zg": 6.0},
        }
        coord = SkyCoord(
            ra=45 * u.deg, dec=30 * u.deg, distance=5 * u.pc, frame=ICRS()
        ).galactic.cartesian
        positions["synthetic-c"] = {
            axis: round(value.to_value(u.pc), 12)
            for axis, value in zip(("xg", "yg", "zg"), (coord.x, coord.y, coord.z))
        }
        for anchor in anchors:
            if anchor != "sol":
                gcns["queries"].append({
                    "stage": "coverage", "anchor_id": anchor,
                    "adql": gcns_anchor_query(positions[anchor], radius),
                })
        return gcns, cns5

    def validate(self, manifests: tuple[dict, dict], anchors: list[str]) -> None:
        validate_acquisition_queries(
            *manifests, self.gcns_rows, self.cns5_rows,
            self.bootstraps, self.config, anchors,
        )

    def test_matched_inputs_pass_for_both_source_catalogues(self) -> None:
        for anchors in [["sol"], ["sol", "synthetic-a"], self.all_anchors]:
            with self.subTest(anchors=anchors):
                self.validate(self.manifests(anchors), anchors)

    def test_refreshed_plan_is_not_a_match_for_a_different_prior_root(self) -> None:
        with self.assertRaisesRegex(
            ValueError, "acquisition queries differ from the exact plan$"
        ):
            self.validate(self.manifests(self.all_anchors), ["sol", "synthetic-a"])

    def test_unrefreshed_plan_lists_uncovered_anchors_and_stops(self) -> None:
        old = self.manifests(["sol", "synthetic-a"])
        with self.assertRaises(ValueError) as caught:
            self.validate(old, ["sol", "synthetic-a", "synthetic-c", "synthetic-b"])
        message = str(caught.exception)
        self.assertIn("Narrative anchors require a GCNS acquisition plan not covered", message)
        self.assertIn("synthetic-b, synthetic-c.", message)
        self.assertIn("astronomy refresh in an isolated staging checkout", message)
        self.assertIn("independent snapshot acceptance and runtime generation", message)
        self.assertIn("docs/data/astronomy-pipeline.md", message)
        self.assertNotIn("exact plan", message)

    def test_new_gcns_or_cns5_anchor_requires_refresh(self) -> None:
        for new_anchor in ["synthetic-b", "synthetic-c"]:
            with self.subTest(new_anchor=new_anchor):
                with self.assertRaisesRegex(ValueError, "pinned sources: " + new_anchor):
                    self.validate(
                        self.manifests(["sol", "synthetic-a"]),
                        ["sol", "synthetic-a", new_anchor],
                    )

    def test_tampered_plans_keep_exact_plan_error_even_with_new_anchors(self) -> None:
        for staged in [False, True]:
            pinned_anchors = ["sol", "synthetic-a", "synthetic-c"] if staged else self.all_anchors
            for catalogue in [0, 1]:
                original = self.manifests(pinned_anchors)
                # Check every query, not just the top-level or Sol query.
                for query_index in range(len(original[catalogue]["queries"])):
                    changed = copy.deepcopy(original)
                    changed[catalogue]["queries"][query_index]["adql"] += " -- tampered"
                    with self.subTest(staged=staged, catalogue=catalogue, query=query_index):
                        with self.assertRaisesRegex(
                            ValueError, "acquisition queries differ from the exact plan$"
                        ):
                            self.validate(changed, self.all_anchors)
                changed = copy.deepcopy(original)
                changed[catalogue]["adql"] += " -- tampered"
                with self.subTest(staged=staged, catalogue=catalogue, top_level=True):
                    with self.assertRaisesRegex(
                        ValueError, "acquisition queries differ from the exact plan$"
                    ):
                        self.validate(changed, self.all_anchors)

    def test_inconsistent_bootstrap_ordering_metadata_or_coverage_is_not_staging(self) -> None:
        old = self.manifests(["sol", "synthetic-a", "synthetic-c"])
        changes = []
        bootstrap = copy.deepcopy(old)
        bootstrap[0]["queries"][1]["anchor_ids"].append("synthetic-b")
        changes.append(bootstrap)
        reordered = copy.deepcopy(old)
        reordered[0]["queries"].reverse()
        changes.append(reordered)
        metadata = copy.deepcopy(old)
        metadata[0]["queries"][0]["unexpected"] = True
        changes.append(metadata)
        unknown = copy.deepcopy(old)
        unknown[0]["queries"].append({
            "stage": "coverage", "anchor_id": "unknown", "adql": "SELECT 1"
        })
        changes.append(unknown)
        missing_sol = copy.deepcopy(old)
        missing_sol[0]["queries"].pop(0)
        changes.append(missing_sol)
        coverage_only = self.manifests(self.all_anchors)
        coverage_only[0]["queries"] = [
            q for q in coverage_only[0]["queries"]
            if q.get("anchor_id") != "synthetic-b"
        ]
        changes.append(coverage_only)
        for index, changed in enumerate(changes):
            with self.subTest(change=index):
                with self.assertRaisesRegex(
                    ValueError, "GCNS acquisition queries differ from the exact plan$"
                ):
                    self.validate(changed, self.all_anchors)


if __name__ == "__main__":
    unittest.main()
