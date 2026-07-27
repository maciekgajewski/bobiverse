from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from astronomy_pipeline import (
    allocate_components,
    allocate_systems,
    gcns_anchor_query,
    position_from_cns5,
    proposed_position_component,
    reviewed_landmark_source_identities,
    read_extract,
    source_name,
    wds_component_spectral_types,
    wds_membership_candidates,
)
from common import (
    CANDIDATES_PATH,
    CONFIG_PATH,
    GAIA_ENRICHMENT_PATH,
    GENERATED_PATH,
    IDENTITY_REGISTRY_PATH,
    SOURCE_EXTRACT_SCHEMA_PATH,
    WDS_PATH,
    read_gzip,
    read_json,
    mapped_anchor_ids,
    value_sha256,
)
from generate_nearby_systems import presentation
from validate_data import (
    validate_anchor_bootstraps,
    validate_acquisition_queries,
    validate_candidate_geometry,
    validate_candidates,
    validate_join_accounting,
    validate_registry,
    validate_runtime,
    validate_source_union,
    validate_schema,
    validate_wds,
    validate_wds_candidate_binding,
)


class MultiCatalogueContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.candidates = read_json(CANDIDATES_PATH)
        cls.registry = read_json(IDENTITY_REGISTRY_PATH)
        cls.review = {
            "accepted_candidate_sha256": value_sha256(cls.candidates),
            "unresolved_ambiguities": [],
            "overrides": [],
            "component_overrides": [],
        }

    def test_cns5_reference_rows_do_not_duplicate_alpha_centauri(self) -> None:
        alpha = next(system for system in self.candidates["systems"] if system["preferred_name_candidate"] == "GJ 559")
        self.assertEqual(len(alpha["component_ids"]), 3)

    def test_rejects_stale_candidate_acceptance(self) -> None:
        review = copy.deepcopy(self.review)
        review["accepted_candidate_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "checksum"):
            validate_candidates(self.candidates, review, self.registry)

    def test_rejects_component_claimed_by_two_systems(self) -> None:
        candidates = copy.deepcopy(self.candidates)
        candidates["systems"][1]["component_ids"].append(candidates["systems"][0]["component_ids"][0])
        review = copy.deepcopy(self.review)
        review["accepted_candidate_sha256"] = value_sha256(candidates)
        with self.assertRaisesRegex(ValueError, "two candidate systems"):
            validate_candidates(candidates, review, self.registry)

    def test_wds_candidate_selection_is_reproducible(self) -> None:
        _, cns5 = read_extract("cns5")
        _, gcns = read_extract("gcns")
        _, gaia = read_extract("gaia_dr3")
        document = read_json(ROOT / "data" / "source" / "wds-membership.json")
        review = read_json(ROOT / "data" / "source" / "system-review.json")
        decisions = review["wds_decisions"]
        self.assertEqual(
            document["rows"],
            wds_membership_candidates(
                cns5,
                read_gzip(WDS_PATH),
                decisions,
                gcns,
                gaia,
                reviewed_landmark_source_identities(self.candidates),
            ),
        )
        validate_wds(cns5, review, gcns, gaia, self.candidates)
        validate_wds_candidate_binding(self.candidates, document)

    def test_rejects_duplicate_registry_identity(self) -> None:
        registry = copy.deepcopy(self.registry)
        registry["components"].append(copy.deepcopy(registry["components"][0]))
        with self.assertRaisesRegex(ValueError, "duplicate"):
            validate_registry(registry)

    def test_registry_sequence_high_watermark_prevents_id_reuse(self) -> None:
        registry = {
            "component_sequence_high_watermark": 41,
            "components": [],
        }
        result = allocate_components(
            registry,
            {"cns5:42": {"cns5:42"}},
            [],
        )
        self.assertEqual(
            result["cns5:42"], "stellar-component-000042"
        )
        self.assertEqual(registry["component_sequence_high_watermark"], 42)

    def test_rejects_registry_sequence_beyond_high_watermark(self) -> None:
        registry = copy.deepcopy(self.registry)
        registry["component_sequence_high_watermark"] = 0
        with self.assertRaisesRegex(ValueError, "high-water mark"):
            validate_registry(registry)

    def test_rejects_candidate_registry_source_key_mismatch(self) -> None:
        registry = copy.deepcopy(self.registry)
        first, second = [
            entry
            for entry in registry["components"]
            if entry["state"] == "active"
        ][:2]
        first["source_keys"], second["source_keys"] = (
            second["source_keys"],
            first["source_keys"],
        )
        with self.assertRaisesRegex(ValueError, "stable registry key"):
            validate_candidates(
                self.candidates,
                self.review,
                registry,
            )

    def test_rejects_unreviewed_system_membership_churn(self) -> None:
        registry = {
            "systems": [
                {
                    "id": "stellar-system-000001",
                    "key": "stellar-component-000001|stellar-component-000002",
                    "state": "active",
                }
            ]
        }
        with self.assertRaisesRegex(ValueError, "merge/split transition"):
            allocate_systems(
                registry,
                ["stellar-component-000001"],
                [],
            )

    def test_rejects_unreviewed_returning_system_split(self) -> None:
        registry = {
            "systems": [
                {
                    "id": "stellar-system-000001",
                    "key": "stellar-component-000001|stellar-component-000002",
                    "state": "tombstoned",
                }
            ]
        }
        with self.assertRaisesRegex(ValueError, "merge/split transition"):
            allocate_systems(
                registry,
                ["stellar-component-000001"],
                [],
            )

    def test_tombstoned_system_cannot_survive_both_sides_of_split(self) -> None:
        registry = {
            "systems": [
                {
                    "id": "stellar-system-000001",
                    "key": (
                        "stellar-component-000001|"
                        "stellar-component-000002"
                    ),
                    "state": "tombstoned",
                }
            ]
        }
        with self.assertRaisesRegex(ValueError, "merge/split transition"):
            allocate_systems(
                registry,
                [
                    "stellar-component-000001",
                    "stellar-component-000002",
                ],
                [],
            )

    def test_accepts_one_explicit_system_split_transition(self) -> None:
        registry = {
            "systems": [
                {
                    "id": "stellar-system-000001",
                    "key": "stellar-component-000001|stellar-component-000002",
                    "state": "active",
                }
            ]
        }
        result = allocate_systems(
            registry,
            ["stellar-component-000001"],
            [
                {
                    "from_system_ids": ["stellar-system-000001"],
                    "to_component_ids": ["stellar-component-000001"],
                    "surviving_system_id": "stellar-system-000001",
                    "reason": "reviewed split fixture",
                }
            ],
        )
        self.assertEqual(
            result["stellar-component-000001"], "stellar-system-000001"
        )

    def test_active_and_tombstoned_system_overlaps_require_one_transition(self) -> None:
        registry = {
            "systems": [
                {
                    "id": "stellar-system-000001",
                    "key": "stellar-component-000001",
                    "state": "active",
                },
                {
                    "id": "stellar-system-000002",
                    "key": "stellar-component-000002",
                    "state": "tombstoned",
                },
            ]
        }
        key = "stellar-component-000001|stellar-component-000002"
        with self.assertRaisesRegex(ValueError, "merge/split transition"):
            allocate_systems(registry, [key], [])
        result = allocate_systems(
            registry,
            [key],
            [{
                "from_system_ids": [
                    "stellar-system-000001",
                    "stellar-system-000002",
                ],
                "to_component_ids": [
                    "stellar-component-000001",
                    "stellar-component-000002",
                ],
                "surviving_system_id": "stellar-system-000001",
                "reason": "reviewed active and historical merge fixture",
            }],
        )
        self.assertEqual(result[key], "stellar-system-000001")

    def test_rejects_unreviewed_component_identity_merge(self) -> None:
        registry = {
            "components": [
                {
                    "id": "stellar-component-000001",
                    "key": "cns5:42",
                    "source_keys": ["cns5:42"],
                    "state": "active",
                },
                {
                    "id": "stellar-component-000002",
                    "key": "gaia-dr3:123",
                    "source_keys": ["gaia-dr3:123"],
                    "state": "active",
                },
            ]
        }
        with self.assertRaisesRegex(ValueError, "Component identity changed"):
            allocate_components(
                registry,
                {"gaia-dr3:123": {"cns5:42", "gaia-dr3:123"}},
                [],
            )

    def test_accepts_explicit_component_identity_merge(self) -> None:
        registry = {
            "components": [
                {
                    "id": "stellar-component-000001",
                    "key": "cns5:42",
                    "source_keys": ["cns5:42"],
                    "state": "active",
                },
                {
                    "id": "stellar-component-000002",
                    "key": "gaia-dr3:123",
                    "source_keys": ["gaia-dr3:123"],
                    "state": "active",
                },
            ]
        }
        result = allocate_components(
            registry,
            {"gaia-dr3:123": {"cns5:42", "gaia-dr3:123"}},
            [
                {
                    "from_component_ids": [
                        "stellar-component-000001",
                        "stellar-component-000002",
                    ],
                    "to_source_identities": ["cns5:42", "gaia-dr3:123"],
                    "surviving_component_id": "stellar-component-000002",
                    "reason": "reviewed exact cross-reference fixture",
                }
            ],
        )
        self.assertEqual(
            result["gaia-dr3:123"], "stellar-component-000002"
        )

    def test_active_and_tombstoned_component_overlaps_require_one_transition(self) -> None:
        registry = {
            "components": [
                {
                    "id": "stellar-component-000001",
                    "key": "gaia-dr3:123",
                    "source_keys": ["gaia-dr3:123"],
                    "state": "active",
                },
                {
                    "id": "stellar-component-000002",
                    "key": "cns5:42",
                    "source_keys": ["cns5:42"],
                    "state": "tombstoned",
                },
            ]
        }
        groups = {"gaia-dr3:123": {"cns5:42", "gaia-dr3:123"}}
        with self.assertRaisesRegex(ValueError, "Component identity changed"):
            allocate_components(registry, groups, [])
        result = allocate_components(
            registry,
            groups,
            [{
                "from_component_ids": [
                    "stellar-component-000001",
                    "stellar-component-000002",
                ],
                "to_source_identities": ["cns5:42", "gaia-dr3:123"],
                "surviving_component_id": "stellar-component-000001",
                "reason": "reviewed active and historical merge fixture",
            }],
        )
        self.assertEqual(result["gaia-dr3:123"], "stellar-component-000001")

    def test_reactivates_one_tombstoned_component_alias(self) -> None:
        registry = {
            "components": [
                {
                    "id": "stellar-component-000001",
                    "key": "cns5:42",
                    "source_keys": ["cns5:42", "gaia-dr3:123"],
                    "state": "tombstoned",
                }
            ]
        }
        result = allocate_components(
            registry,
            {"gaia-dr3:123": {"gaia-dr3:123"}},
            [],
        )
        self.assertEqual(
            result["gaia-dr3:123"], "stellar-component-000001"
        )
        self.assertEqual(registry["components"][0]["state"], "active")

    def test_tombstoned_component_split_requires_reviewed_transitions(self) -> None:
        registry = {
            "components": [
                {
                    "id": "stellar-component-000001",
                    "key": "gaia-dr3:123",
                    "source_keys": ["cns5:42", "gaia-dr3:123"],
                    "state": "tombstoned",
                }
            ]
        }
        with self.assertRaisesRegex(ValueError, "Component identity changed"):
            allocate_components(
                registry,
                {
                    "cns5:42": {"cns5:42"},
                    "gaia-dr3:123": {"gaia-dr3:123"},
                },
                [],
            )

    def test_source_name_uses_the_pinned_cns5_gaia_identifier(self) -> None:
        name, _ = source_name(
            {
                "cns5_id": "42",
                "gj_id": "",
                "hip_id": "",
                "gaia_dr3_id": "123456",
            }
        )
        self.assertEqual(name, "Gaia DR3 123456")

    def test_gaia_temperature_precedes_bp_rp_presentation(self) -> None:
        family, derivation = presentation(
            {"teff_gspphot": "11000", "spectraltype_esphs": ""},
            2.5,
        )
        self.assertEqual(family, "blue")
        self.assertIn("effective temperature", derivation)

    def test_multiple_without_mapped_primary_requires_review(self) -> None:
        components = {
            "a": {
                "position_pc": {"xg": 1.0, "yg": 0.0, "zg": 0.0},
                "is_cns5_primary": False,
            },
            "b": {
                "position_pc": {"xg": 1.1, "yg": 0.0, "zg": 0.0},
                "is_cns5_primary": False,
            },
        }
        self.assertIsNone(
            proposed_position_component(["a", "b"], components)
        )

    def test_reviewed_override_resolves_ambiguous_multiple_position(self) -> None:
        candidates = copy.deepcopy(self.candidates)
        system = next(
            item for item in candidates["systems"]
            if len(item["component_ids"]) > 1
        )
        system["adopted_component_candidate"] = None
        system["requires_review"] = True
        review = copy.deepcopy(self.review)
        review["overrides"] = [{
            "candidate_system_id": system["id"],
            "adopted_component_id": system["component_ids"][0],
            "reason": "reviewed ambiguity fixture",
        }]
        review["accepted_candidate_sha256"] = value_sha256(candidates)
        validate_candidates(candidates, review, self.registry)

    def test_wds_review_rows_retain_seed_coverage_and_review_fields(self) -> None:
        rows = read_json(
            ROOT / "data" / "source" / "wds-membership.json"
        )["rows"]
        self.assertTrue(
            {"cns5", "gcns", "gaia_dr3"}.issubset(
                {row.get("seed_catalogue") for row in rows}
            )
        )
        required_fields = {
            "first_observation_epoch",
            "last_observation_epoch",
            "observation_count",
            "first_separation_arcsec",
            "last_separation_arcsec",
            "primary_magnitude",
            "secondary_magnitude",
            "spectral_type",
            "primary_pm_ra",
            "primary_pm_dec",
            "secondary_pm_ra",
            "secondary_pm_dec",
            "durchmusterung_id",
        }
        self.assertTrue(all(required_fields.issubset(row) for row in rows))

    def test_wds_landmark_seeds_cover_every_landmark_system_component(self) -> None:
        landmark_system_ids = {
            landmark["system_id"]
            for landmark in read_json(
                ROOT / "data" / "source" / "major-local-systems.json"
            )["systems"]
        }
        expected = {
            source_identity
            for system in self.candidates["systems"]
            if system["id"] in landmark_system_ids
            for component_id in system["component_ids"]
            for component in self.candidates["components"]
            if component["id"] == component_id
            for source_identity in component["source_identities"]
        }
        self.assertTrue(expected)
        self.assertTrue(
            expected.issubset(
                reviewed_landmark_source_identities(self.candidates)
            )
        )

    def test_wds_pair_spectrum_is_split_by_reviewed_component_order(self) -> None:
        self.assertEqual(
            wds_component_spectral_types(
                {
                    "component_ids": ["procyon-a", "procyon-b"],
                    "spectral_type": "F5IV-V+DQ",
                }
            ),
            {"procyon-a": "F5IV-V", "procyon-b": "DQ"},
        )
        self.assertEqual(
            wds_component_spectral_types(
                {
                    "component_ids": ["a", "b"],
                    "spectral_type": "M3V",
                }
            ),
            {},
        )

    def test_rejects_wds_component_order_reversed_from_component_labels(self) -> None:
        review = copy.deepcopy(
            read_json(ROOT / "data" / "source" / "system-review.json")
        )
        decision = next(
            item for item in review["wds_decisions"]
            if item["components"] == "AB"
            and "61 Cygni" in item["reason"]
        )
        decision["component_ids"].reverse()
        with self.assertRaisesRegex(ValueError, "component order"):
            validate_candidates(self.candidates, review, self.registry)

    def test_multiple_fallback_name_comes_from_adopted_primary(self) -> None:
        system = next(
            item for item in self.candidates["systems"]
            if item["id"] == "stellar-system-000296"
        )
        self.assertEqual(system["preferred_name_candidate"], "GJ 570")
        self.assertIn("GJ 12147", system["alternate_name_candidates"])

    def test_gcns_envelope_normalizes_signed_percentile_bounds(self) -> None:
        query = gcns_anchor_query(
            {"xg": -5.0, "yg": 2.0, "zg": -1.0},
            3.0,
        )
        for axis in ("x", "y", "z"):
            self.assertIn(
                f"({axis}coord_16 <=",
                query,
            )
            self.assertIn(f"OR {axis}coord_84 <=", query)
            self.assertIn(f"AND ({axis}coord_16 >=", query)
            self.assertIn(f"OR {axis}coord_84 >=", query)

    def test_cns5_fallback_rejects_invalid_or_warned_astrometry(self) -> None:
        base = {
            "ra": "10",
            "dec": "20",
            "parallax": "100",
            "parallax_error": "1",
            "pmra_error": "",
            "pmdec_error": "",
            "coordinates_bibcode": "fixture",
            "parallax_bibcode": "fixture",
            "remarks": "",
        }
        self.assertIsNotNone(position_from_cns5(base))
        invalid = {**base, "dec": "100"}
        self.assertIsNone(position_from_cns5(invalid))
        warned = {**base, "remarks": "Astrometric solution is spurious."}
        self.assertIsNone(position_from_cns5(warned))
        self.assertIsNotNone(
            position_from_cns5(warned, review_decision="accept")
        )
        self.assertIsNone(
            position_from_cns5(base, review_decision="reject")
        )
        self.assertIsNone(
            position_from_cns5(invalid, review_decision="accept")
        )

    def test_source_schema_rejects_malformed_numeric_enrichment(self) -> None:
        document = read_json(GAIA_ENRICHMENT_PATH)
        document["rows"][0]["radial_velocity"] = "not-a-number"
        with self.assertRaisesRegex(ValueError, "schema validation"):
            validate_schema(
                document,
                SOURCE_EXTRACT_SCHEMA_PATH,
                "Gaia fixture",
            )

    def test_source_schema_rejects_malformed_wds_review_field(self) -> None:
        document = read_json(
            ROOT / "data" / "source" / "wds-membership.json"
        )
        document["rows"][0]["first_separation_arcsec"] = "not-a-number"
        with self.assertRaisesRegex(ValueError, "schema validation"):
            validate_schema(
                document,
                SOURCE_EXTRACT_SCHEMA_PATH,
                "WDS fixture",
            )

    def test_runtime_retains_all_accepted_source_identities(self) -> None:
        runtime = read_json(GENERATED_PATH)
        candidates = {
            component["id"]: component
            for component in self.candidates["components"]
        }
        retained = [
            component
            for system in runtime["systems"]
            for component in system["components"]
            if component["id"] != "stellar-component-sol"
        ]
        self.assertTrue(
            any(len(component["source_identities"]) > 2 for component in retained)
        )
        for component in retained:
            self.assertEqual(
                component["source_identities"],
                candidates[component["id"]]["source_identities"],
            )

    def test_runtime_rejects_geometry_and_name_drift_from_candidates(self) -> None:
        gcns_manifest, _ = read_extract("gcns")
        cns5_manifest, _ = read_extract("cns5")
        gaia_manifest, _ = read_extract("gaia_dr3")
        manifests = {
            "gcns": gcns_manifest,
            "cns5": cns5_manifest,
            "gaia_dr3": gaia_manifest,
            "wds": read_json(
                ROOT / "data" / "source" / "wds-membership.json"
            )["source"],
        }
        review = read_json(
            ROOT / "data" / "source" / "system-review.json"
        )
        landmarks = read_json(
            ROOT / "data" / "source" / "major-local-systems.json"
        )
        config = read_json(CONFIG_PATH)
        geometry_drift = copy.deepcopy(read_json(GENERATED_PATH))
        system = geometry_drift["systems"][1]
        system["position_pc"]["xg"] += 0.25
        system["render_position"]["x"] += 0.25
        with self.assertRaisesRegex(ValueError, "deterministic source"):
            validate_runtime(
                geometry_drift,
                manifests,
                self.candidates,
                review,
                landmarks,
                config,
            )
        name_drift = copy.deepcopy(read_json(GENERATED_PATH))
        name_drift["systems"][1]["name"] = "Hand-edited name"
        name_drift["systems"][1]["alternates"] = ["Hand-edited alias"]
        with self.assertRaisesRegex(ValueError, "deterministic source"):
            validate_runtime(
                name_drift,
                manifests,
                self.candidates,
                review,
                landmarks,
                config,
            )
        sol_drift = copy.deepcopy(read_json(GENERATED_PATH))
        sol_drift["systems"][0]["name"] = "Not Sol"
        sol_drift["systems"][0]["position_pc"]["xg"] = 1.0
        sol_drift["systems"][0]["render_position"]["x"] = 1.0
        sol_drift["systems"][0]["distance_from_sol_pc"] = 1.0
        sol_drift["systems"][0]["components"][0][
            "designation"
        ] = "Not Sol"
        with self.assertRaisesRegex(ValueError, "canonical-origin"):
            validate_runtime(
                sol_drift,
                manifests,
                self.candidates,
                review,
                landmarks,
                config,
            )

    def test_committed_join_accounting_and_source_union(self) -> None:
        gcns_manifest, gcns = read_extract("gcns")
        cns5_manifest, cns5 = read_extract("cns5")
        gaia_manifest, gaia = read_extract("gaia_dr3")
        self.assertTrue(gcns_manifest)
        self.assertTrue(cns5_manifest)
        validate_join_accounting(gcns, cns5, gaia, gaia_manifest)
        validate_source_union(gcns, cns5, self.candidates)
        validate_candidate_geometry(gcns, cns5, self.candidates)

    def test_rejects_altered_base_source_acquisition_query(self) -> None:
        gcns_manifest, gcns = read_extract("gcns")
        cns5_manifest, cns5 = read_extract("cns5")
        gcns_manifest = copy.deepcopy(gcns_manifest)
        gcns_manifest["queries"][0]["adql"] += "\n-- truncated fixture"
        with self.assertRaisesRegex(ValueError, "exact plan"):
            validate_acquisition_queries(
                gcns_manifest,
                cns5_manifest,
                gcns,
                cns5,
                read_json(ROOT / "data" / "source" / "system-review.json"),
                read_json(CONFIG_PATH),
                mapped_anchor_ids(),
            )

    def test_rejects_cns5_source_lost_from_union(self) -> None:
        _, gcns = read_extract("gcns")
        _, cns5 = read_extract("cns5")
        candidates = copy.deepcopy(self.candidates)
        cns_only = next(
            component
            for component in candidates["components"]
            if component["source_identity"].startswith("cns5:")
        )
        candidates["components"].remove(cns_only)
        with self.assertRaisesRegex(ValueError, "retained-source union"):
            validate_source_union(gcns, cns5, candidates)

    def test_rejects_unsupported_gaia_release_join(self) -> None:
        manifest, gaia = read_extract("gaia_dr3")
        _, gcns = read_extract("gcns")
        _, cns5 = read_extract("cns5")
        manifest = copy.deepcopy(manifest)
        manifest["release"] = "Gaia DR2"
        with self.assertRaisesRegex(ValueError, "unsupported release"):
            validate_join_accounting(gcns, cns5, gaia, manifest)

    def test_rejects_ambiguous_wds_decision_absent_from_snapshot(self) -> None:
        _, cns5 = read_extract("cns5")
        with self.assertRaisesRegex(ValueError, "absent from"):
            wds_membership_candidates(
                cns5,
                read_gzip(WDS_PATH),
                [{
                    "system_id": "stellar-system-000001",
                    "wds_coordinate": "00000+0000",
                    "discoverer": "NOPE",
                    "components": "AB",
                    "reason": "invalid fixture",
                }],
            )

    def test_non_sol_anchor_requires_exact_source_identity(self) -> None:
        _, gcns = read_extract("gcns")
        _, cns5 = read_extract("cns5")
        component = next(
            item
            for item in self.candidates["components"]
            if item["gaia_source_id"] in {row["source_id"] for row in gcns}
        )
        system = next(
            item
            for item in self.candidates["systems"]
            if component["id"] in item["component_ids"]
        )
        review = {
            "anchor_bootstraps": [{
                "anchor_id": "fixture-anchor",
                "system_id": system["id"],
                "catalogue": "gcns",
                "source_id": "999999999999999999",
            }]
        }
        with self.assertRaisesRegex(ValueError, "exact source identity"):
            validate_anchor_bootstraps(
                review,
                self.candidates,
                gcns,
                cns5,
                ["sol", "fixture-anchor"],
            )

    def test_non_sol_anchor_accepts_exact_source_identity(self) -> None:
        _, gcns = read_extract("gcns")
        _, cns5 = read_extract("cns5")
        gcns_ids = {row["source_id"] for row in gcns}
        component = next(
            item
            for item in self.candidates["components"]
            if item["gaia_source_id"] in gcns_ids
        )
        system = next(
            item
            for item in self.candidates["systems"]
            if component["id"] in item["component_ids"]
        )
        validate_anchor_bootstraps(
            {
                "anchor_bootstraps": [{
                    "anchor_id": "fixture-anchor",
                    "system_id": system["id"],
                    "catalogue": "gcns",
                    "source_id": component["gaia_source_id"],
                }]
            },
            self.candidates,
            gcns,
            cns5,
            ["sol", "fixture-anchor"],
        )

    def test_rejects_singleton_without_adopted_component(self) -> None:
        candidates = copy.deepcopy(self.candidates)
        components = {
            component["id"]: component for component in candidates["components"]
        }
        singleton = next(
            system for system in candidates["systems"]
            if len(system["component_ids"]) == 1
            and components[system["component_ids"][0]]["position_pc"] is not None
        )
        singleton["adopted_component_candidate"] = None
        review = copy.deepcopy(self.review)
        review["accepted_candidate_sha256"] = value_sha256(candidates)
        with self.assertRaisesRegex(ValueError, "adopted member"):
            validate_candidates(candidates, review, self.registry)


if __name__ == "__main__":
    unittest.main()
