from __future__ import annotations

import copy
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from astronomy_pipeline import (
    allocate_components,
    allocate_systems,
    c20pc_distance_warning,
    gcns_anchor_query,
    position_from_cns5,
    retained_component_identities,
    proposed_position_component,
    reviewed_landmark_source_identities,
    read_extract,
    source_name,
    wds_component_spectral_types,
    wds_membership_candidates,
)
from common import (
    C20PC_PATH,
    C20PC_SCHEMA_PATH,
    CANDIDATES_PATH,
    CONFIG_PATH,
    GAIA_ENRICHMENT_PATH,
    GENERATED_PATH,
    IDENTITY_REGISTRY_PATH,
    SOURCE_EXTRACT_SCHEMA_PATH,
    WDS_PATH,
    mapped_anchor_names,
    read_gzip,
    read_json,
    resolve_anchor_bootstraps,
    value_sha256,
    write_json,
)
from c20pc_census import (
    census_identifier_tokens,
    coordinate_short_name,
    derive_object_class,
    exact_identifier_candidates,
    parse_identifier,
    reconstruct_note_continuations,
    resolve_coordinate_short_names,
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
    def test_gcns_alias_inside_cns5_reference_group_does_not_split_component(self) -> None:
        self.assertEqual(
            retained_component_identities(
                {"123", "456"},
                {"gaia-dr3:999"},
                {"123": "gaia-dr3:999"},
            ),
            {"gaia-dr3:999", "gaia-dr3:456"},
        )

    def test_eridani_and_beta_hydri_aliases_resolve_exact_existing_bootstraps(self) -> None:
        candidates = read_json(CANDIDATES_PATH)
        review = read_json(ROOT / "data" / "source" / "system-review.json")
        expected = {
            "stellar-system-002424": {
                "name": "40 Eridani",
                "alias": "Omicron2 Eridani",
                "component_id": "stellar-component-002943",
                "source_id": "3195919528989223040",
            },
            "stellar-system-003557": {
                "name": "GJ 19",
                "alias": "Beta Hydri",
                "component_id": "stellar-component-004282",
                "source_id": "4683897617110115200",
            },
            "stellar-system-003918": {
                "name": "GJ 150",
                "alias": "Delta Eridani",
                "component_id": "stellar-component-004724",
                "source_id": "5164120762333028736",
            },
        }
        systems = {system["id"]: system for system in candidates["systems"]}
        components = {
            component["id"]: component for component in candidates["components"]
        }
        overrides = {
            override["candidate_system_id"]: override
            for override in review["overrides"]
        }

        self.assertEqual(review["anchor_bootstraps"], [])
        for system_id, contract in expected.items():
            system = systems[system_id]
            self.assertEqual(overrides[system_id], {
                "candidate_system_id": system_id,
                "name": contract["name"],
                "alternates": [contract["alias"]],
            })
            self.assertEqual(
                system["adopted_component_candidate"], contract["component_id"]
            )
            component = components[contract["component_id"]]
            self.assertEqual(component["gaia_source_id"], contract["source_id"])
            self.assertEqual(
                component["position_derivation"],
                "gcns median Bayesian Cartesian geometry",
            )

        anchor_names = {
            system_id: [contract["alias"]]
            for system_id, contract in expected.items()
        }
        self.assertEqual(
            resolve_anchor_bootstraps(anchor_names, review, candidates),
            [
                {
                    "anchor_id": system_id,
                    "system_id": system_id,
                    "catalogue": "gcns",
                    "source_id": contract["source_id"],
                }
                for system_id, contract in expected.items()
            ],
        )

        gcns_manifest, _ = read_extract("gcns")
        beta_queries = [
            query
            for query in gcns_manifest["queries"]
            if query.get("anchor_id") == "stellar-system-003557"
        ]
        self.assertEqual([query["stage"] for query in beta_queries], ["coverage"])
        runtime = read_json(GENERATED_PATH)
        runtime_systems = {
            system["id"]: system for system in runtime["systems"]
        }
        for system_id in (
            "stellar-system-002424",
            "stellar-system-003557",
            "stellar-system-003918",
        ):
            contract = expected[system_id]
            self.assertEqual(runtime_systems[system_id]["name"], contract["name"])
            self.assertIn(contract["alias"], runtime_systems[system_id]["alternates"])
        beta_coverage = next(
            proof
            for proof in runtime["metadata"]["coverage"]
            if proof["anchor_id"] == "stellar-system-003557"
        )
        self.assertEqual(beta_coverage["radius_ly"], 20.0)
        self.assertGreater(beta_coverage["source_record_count"], 0)
        self.assertGreater(beta_coverage["system_count"], 0)

        chapter_18 = read_json(
            ROOT / "data" / "narrative" / "chapters" / "1" / "18.json"
        )
        chapter_locations = {
            location["id"]: location for location in chapter_18["introducing"]
        }
        for location_id, name, system_id in (
            ("location:beta-hydri", "Beta Hydri", "stellar-system-003557"),
            ("location:delta-eridani", "Delta Eridani", "stellar-system-003918"),
        ):
            self.assertEqual(chapter_locations[location_id]["name"], name)
            self.assertEqual(chapter_locations[location_id]["kind"], "star_system")
            self.assertEqual(
                chapter_locations[location_id]["astronomy_object_id"], system_id
            )

    def test_mapped_anchor_names_replays_independent_location_updates(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            narrative_root = Path(temporary_directory)
            write_json(
                narrative_root / "baseline" / "zero-state.json",
                {
                    "entities": [],
                    "locations": {
                        "id": "location:baseline",
                        "name": "Baseline",
                        "kind": "star_system",
                        "astronomy_object_id": "stellar-system-baseline",
                        "children": [],
                    },
                },
            )
            write_json(
                narrative_root / "chapters" / "1" / "1.json",
                {
                    "chapter": "1.1",
                    "introducing": [
                        {
                            "id": "location:fixture",
                            "name": "Fixture",
                            "kind": "star_system",
                            "astronomy_object_id": "stellar-system-first",
                        }
                    ],
                    "updates": [],
                },
            )
            write_json(
                narrative_root / "chapters" / "1" / "2.json",
                {
                    "chapter": "1.2",
                    "introducing": [],
                    "updates": [
                        {
                            "entity_id": "location:fixture",
                            "name": "Fixture Renamed",
                        }
                    ],
                },
            )
            write_json(
                narrative_root / "chapters" / "1" / "3.json",
                {
                    "chapter": "1.3",
                    "introducing": [],
                    "updates": [
                        {
                            "entity_id": "location:fixture",
                            "astronomy_object_id": "stellar-system-second",
                        }
                    ],
                },
            )

            self.assertEqual(
                mapped_anchor_names(narrative_root),
                {
                    "stellar-system-baseline": ["Baseline"],
                    "stellar-system-first": ["Fixture", "Fixture Renamed"],
                    "stellar-system-second": ["Fixture Renamed"],
                },
            )

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
            "c20pc": read_json(C20PC_PATH)["source"],
        }
        review = read_json(
            ROOT / "data" / "source" / "system-review.json"
        )
        anchor_names = mapped_anchor_names()
        bootstraps = resolve_anchor_bootstraps(
            anchor_names, review, self.candidates
        )
        anchor_ids = list(anchor_names)
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
                bootstraps,
                anchor_ids,
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
                bootstraps,
                anchor_ids,
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
                bootstraps,
                anchor_ids,
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
        review = read_json(
            ROOT / "data" / "source" / "system-review.json"
        )
        anchor_names = mapped_anchor_names()
        with self.assertRaisesRegex(ValueError, "exact plan"):
            validate_acquisition_queries(
                gcns_manifest,
                cns5_manifest,
                gcns,
                cns5,
                resolve_anchor_bootstraps(
                    anchor_names, review, self.candidates
                ),
                read_json(CONFIG_PATH),
                list(anchor_names),
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

    def bootstrap_fixture(
        self,
    ) -> tuple[
        dict[str, list[str]], dict[str, object], dict[str, object]
    ]:
        candidates = {
            "systems": [
                {
                    "id": "stellar-system-fixture-1",
                    "preferred_name_candidate": "GJ 144",
                    "alternate_name_candidates": ["HIP 16537"],
                    "component_ids": ["stellar-component-fixture-1"],
                    "adopted_component_candidate": "stellar-component-fixture-1",
                    "requires_review": False,
                },
                {
                    "id": "stellar-system-fixture-2",
                    "preferred_name_candidate": "Fixture Two",
                    "alternate_name_candidates": [],
                    "component_ids": ["stellar-component-fixture-2"],
                    "adopted_component_candidate": "stellar-component-fixture-2",
                    "requires_review": False,
                },
            ],
            "components": [
                {
                    "id": "stellar-component-fixture-1",
                    "gaia_source_id": "5164707970261890560",
                    "cns5_id": "905",
                    "position_pc": {"xg": -2.0, "yg": -0.5, "zg": -2.4},
                    "position_derivation": "gcns median Bayesian Cartesian geometry",
                },
                {
                    "id": "stellar-component-fixture-2",
                    "gaia_source_id": "123456789",
                    "cns5_id": "123",
                    "position_pc": {"xg": 1.0, "yg": 2.0, "zg": 3.0},
                    "position_derivation": "gcns median Bayesian Cartesian geometry",
                },
            ],
        }
        review = {
            "overrides": [
                {
                    "candidate_system_id": "stellar-system-fixture-1",
                    "name": "Epsilon Eridani",
                    "alternates": ["Ran"],
                },
                {
                    "candidate_system_id": "stellar-system-fixture-2",
                    "name": "Fixture Two",
                    "alternates": [],
                },
            ],
            "anchor_bootstraps": [],
        }
        anchor_names = {
            "sol": ["Solar System"],
            "stellar-system-fixture-1": ["Epsilon Eridani"],
        }
        return anchor_names, review, candidates

    def test_automatic_anchor_bootstrap_accepts_only_exact_normalized_names(
        self,
    ) -> None:
        anchor_names, review, candidates = self.bootstrap_fixture()
        anchor_names["stellar-system-fixture-1"] = [
            "  EPSILON   ERIDANI  ",
            " ran ",
        ]
        self.assertEqual(
            resolve_anchor_bootstraps(anchor_names, review, candidates),
            [{
                "anchor_id": "stellar-system-fixture-1",
                "system_id": "stellar-system-fixture-1",
                "catalogue": "gcns",
                "source_id": "5164707970261890560",
            }],
        )

        for rejected_name in ("Epsilon", "Epsilon-Eridani"):
            with self.subTest(rejected_name=rejected_name):
                rejected = copy.deepcopy(anchor_names)
                rejected["stellar-system-fixture-1"] = [rejected_name]
                with self.assertRaisesRegex(ValueError, "not an exact accepted"):
                    resolve_anchor_bootstraps(rejected, review, candidates)

    def test_automatic_anchor_bootstrap_rejects_non_unique_review_and_source_gaps(
        self,
    ) -> None:
        anchor_names, review, candidates = self.bootstrap_fixture()

        duplicate_name_review = copy.deepcopy(review)
        duplicate_name_review["overrides"][1]["alternates"] = [
            "Epsilon Eridani"
        ]
        with self.assertRaisesRegex(ValueError, "not unique"):
            resolve_anchor_bootstraps(
                anchor_names, duplicate_name_review, candidates
            )

        unresolved = copy.deepcopy(candidates)
        unresolved["systems"][0]["requires_review"] = True
        with self.assertRaisesRegex(ValueError, "unresolved adopted-position"):
            resolve_anchor_bootstraps(anchor_names, review, unresolved)

        source_incomplete = copy.deepcopy(candidates)
        source_incomplete["components"][0]["gaia_source_id"] = None
        with self.assertRaisesRegex(ValueError, "exact decimal gcns"):
            resolve_anchor_bootstraps(anchor_names, review, source_incomplete)

    def test_explicit_anchor_bootstrap_is_structural_and_cannot_change_source(
        self,
    ) -> None:
        anchor_names, review, candidates = self.bootstrap_fixture()
        expected = {
            "anchor_id": "stellar-system-fixture-1",
            "system_id": "stellar-system-fixture-1",
            "catalogue": "gcns",
            "source_id": "5164707970261890560",
        }

        exception_review = copy.deepcopy(review)
        exception_review["anchor_bootstraps"] = [expected]
        exception_names = copy.deepcopy(anchor_names)
        exception_names["stellar-system-fixture-1"] = ["Book-only Name"]
        self.assertEqual(
            resolve_anchor_bootstraps(
                exception_names, exception_review, candidates
            ),
            [expected],
        )

        malformed_entries = [
            [expected, expected],
            [{**expected, "anchor_id": "stellar-system-extra", "system_id": "stellar-system-extra"}],
            [{**expected, "system_id": "stellar-system-fixture-2"}],
            [{**expected, "catalogue": "other"}],
            [{**expected, "source_id": "not-decimal"}],
            [{key: value for key, value in expected.items() if key != "system_id"}],
        ]
        messages = (
            "duplicate",
            "not a mapped",
            "system_id equal",
            "invalid catalogue",
            "invalid decimal",
            "non-empty system_id",
        )
        for entries, message in zip(malformed_entries, messages, strict=True):
            with self.subTest(message=message):
                invalid_review = copy.deepcopy(review)
                invalid_review["anchor_bootstraps"] = entries
                with self.assertRaisesRegex(ValueError, message):
                    resolve_anchor_bootstraps(
                        anchor_names, invalid_review, candidates
                    )

        wrong_source_candidates = copy.deepcopy(candidates)
        wrong_source_candidates["systems"][0]["component_ids"].append(
            "stellar-component-secondary"
        )
        wrong_source_candidates["components"].append(
            {
                "id": "stellar-component-secondary",
                "gaia_source_id": "999999999",
                "cns5_id": "999",
                "position_pc": {"xg": -2.1, "yg": -0.6, "zg": -2.5},
                "position_derivation": "gcns median Bayesian Cartesian geometry",
            }
        )
        for wrong_entry in (
            {**expected, "source_id": "999999999"},
            {**expected, "catalogue": "cns5", "source_id": "905"},
        ):
            wrong_review = copy.deepcopy(review)
            wrong_review["anchor_bootstraps"] = [wrong_entry]
            with self.assertRaisesRegex(ValueError, "accepted adopted source"):
                resolve_anchor_bootstraps(
                    anchor_names, wrong_review, wrong_source_candidates
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
            "anchor_id": system["id"],
            "system_id": system["id"],
            "catalogue": "gcns",
            "source_id": "999999999999999999",
        }
        with self.assertRaisesRegex(ValueError, "exact source identity"):
            validate_anchor_bootstraps(
                [review],
                self.candidates,
                gcns,
                cns5,
                ["sol", system["id"]],
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
            [{
                "anchor_id": system["id"],
                "system_id": system["id"],
                "catalogue": "gcns",
                "source_id": component["gaia_source_id"],
            }],
            self.candidates,
            gcns,
            cns5,
            ["sol", system["id"]],
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


class TwentyParsecCensusContractTest(unittest.TestCase):
    def test_identifier_grammar_normalises_exact_catalogue_tokens(self) -> None:
        self.assertEqual(
            parse_identifier("GJ 11286"),
            ("gj", "", "11286", ""),
        )
        self.assertNotEqual(
            parse_identifier("GJ 42 A"),
            parse_identifier("GJ 42"),
        )
        self.assertEqual(
            parse_identifier("WD 0747+073.2"),
            ("wd", "", "0747+073.2", ""),
        )
        self.assertEqual(
            parse_identifier(
                "PM J17121+4539,PM J17121+4539E,PM J17121+4539W",
                "pmjid",
            ),
            (
                "pmjid",
                "",
                "J17121+4539,J17121+4539E,J17121+4539W",
                "COMPOSITE/3",
            ),
        )
        self.assertEqual(
            parse_identifier(
                "pmj17121+4539, PM j17121+4539e,pm J17121+4539W",
                "pmjid",
            ),
            parse_identifier(
                "PM J17121+4539,PM J17121+4539E,PM J17121+4539W",
                "pmjid",
            ),
        )
        self.assertEqual(
            parse_identifier("WISEA J085510.74-071442.5"),
            ("wisea", "", "J085510.74-071442.5", ""),
        )

    def test_coordinate_short_names_escalate_only_on_collision(self) -> None:
        names = [
            "WISE J085510.83-071442.5",
            "WISEA J085510.74-071442.5",
        ]
        self.assertEqual(coordinate_short_name(names[0]), "WISE 0855-0714")
        self.assertEqual(
            resolve_coordinate_short_names(names),
            {
                names[0]: "WISE 085510.83-071442.5",
                names[1]: "WISE 085510.74-071442.5",
            },
        )

    def test_object_class_requires_source_type_or_reviewed_evidence(self) -> None:
        typed = {"SpTNIR": "T9", "r_SpTNIR": "Kirkpatrick2011"}
        self.assertEqual(derive_object_class(typed), "brown_dwarf")
        self.assertEqual(
            derive_object_class({"SpTOpt": "M4 V", "r_SpTOpt": "SIMBAD"}),
            "star",
        )
        self.assertEqual(
            derive_object_class(
                {"SpTOpt": "DA7", "r_SpTOpt": "SIMBAD", "WD": "WD 0000+000"}
            ),
            "white_dwarf",
        )
        self.assertIsNone(
            derive_object_class({"SpTNIR": "L5", "r_SpTNIR": "SIMBAD"})
        )
        with self.assertRaisesRegex(ValueError, "conflicting object classes"):
            derive_object_class(
                {
                    "SpTOpt": "M4 V",
                    "r_SpTOpt": "SIMBAD",
                    "SpTNIR": "T8",
                    "r_SpTNIR": "SIMBAD",
                }
            )
        with self.assertRaisesRegex(ValueError, "temperature and mass"):
            derive_object_class({}, "brown_dwarf")

    def test_duplicate_exact_identifier_stays_ambiguous(self) -> None:
        cns5 = [{"cns5_id": "1", "gj_id": "GJ 00042"}]
        census = [
            {
                "Name": name,
                "GJ": "GJ 42",
                "NcTR": 1,
                "RAJ2000": ra,
                "DEJ2000": 0,
                "SystCode": code,
            }
            for name, ra, code in (("A", 1, 1), ("B", 2, 2))
        ]
        candidates = exact_identifier_candidates(cns5, census)["1"]
        self.assertEqual(len(candidates), 2)
        self.assertTrue(all(candidate["ambiguous"] for candidate in candidates))

    def test_identifier_disagreement_stays_ambiguous(self) -> None:
        cns5 = [
            {
                "cns5_id": "1",
                "gj_id": "GJ 42",
                "hip_id": "HIP 99",
            }
        ]
        census = [
            {
                "Name": name,
                field: value,
                "NcTR": 1,
                "RAJ2000": ra,
                "DEJ2000": 0,
                "SystCode": code,
            }
            for name, field, value, ra, code in (
                ("A", "GJ", "GJ 42", 1, 1),
                ("B", "HIP", "HIP 99", 2, 2),
            )
        ]
        candidates = exact_identifier_candidates(cns5, census)["1"]
        self.assertEqual(len(candidates), 2)
        self.assertTrue(all(candidate["ambiguous"] for candidate in candidates))

    def test_positional_coincidence_does_not_create_an_identity_edge(self) -> None:
        candidates = exact_identifier_candidates(
            [{"cns5_id": "1", "gj_id": None, "ra": "42", "dec": "-7"}],
            [
                {
                    "Name": "Unidentified",
                    "NcTR": 1,
                    "RAJ2000": 42,
                    "DEJ2000": -7,
                    "SystCode": 1,
                }
            ],
        )
        self.assertEqual(candidates["1"], [])

    def test_unique_same_cardinality_identifier_is_an_exact_candidate(self) -> None:
        candidates = exact_identifier_candidates(
            [
                {
                    "cns5_id": "1",
                    "gj_id": "GJ 42",
                    "n_components": "2",
                }
            ],
            [
                {
                    "Name": "Fixture AB",
                    "GJ": "GJ 42",
                    "NcTR": 2,
                    "RAJ2000": 1,
                    "DEJ2000": 2,
                    "SystCode": 3,
                }
            ],
        )["1"]
        self.assertEqual(len(candidates), 1)
        self.assertFalse(candidates[0]["ambiguous"])

    def test_note_continuation_normalization_is_byte_stable(self) -> None:
        transport = [
            {
                "recno": 1,
                "Name": "Fixture",
                "NcTR": 2,
                "RAJ2000": 1,
                "DEJ2000": 2,
                "Note": "first",
            },
            {
                "recno": 2,
                "Name": "Fixture",
                "NcTR": 2,
                "RAJ2000": 1,
                "DEJ2000": 2,
                "Note": "second",
            },
        ]
        first = reconstruct_note_continuations(transport)
        second = reconstruct_note_continuations(copy.deepcopy(transport))
        self.assertEqual(value_sha256(first), value_sha256(second))
        self.assertEqual(first[0]["continuation_recnos"], [2])

    def test_canonical_distance_disagreement_is_a_review_warning_only(self) -> None:
        warning = c20pc_distance_warning(
            {"Plx": 50, "e_Plx": 0.1},
            {"xg": 10, "yg": 0, "zg": 0},
            None,
            {"parallax": "100", "parallax_error": "0.1"},
        )
        self.assertIsNotNone(warning)
        self.assertEqual(warning["canonical_distance_pc"], 10)
        self.assertEqual(warning["census_distance_pc"], 20)
        self.assertIsNone(
            c20pc_distance_warning(
                {"Plx": 100, "e_Plx": 1},
                {"xg": 10, "yg": 0, "zg": 0},
                None,
                {"parallax": "100", "parallax_error": "1"},
            )
        )

    def test_pinned_notes_preserve_the_single_tap_continuation(self) -> None:
        document = read_json(C20PC_PATH)
        continuations = [
            row for row in document["notes4"] if row["continuation_recnos"]
        ]
        self.assertEqual(
            [(row["recno"], row["continuation_recnos"]) for row in continuations],
            [(1979, [1980])],
        )
        wise0855 = document["table4"][1631]
        self.assertIn(
            "wisea||J085510.74-071442.5|",
            census_identifier_tokens(wise0855),
        )

    def test_table_membership_is_the_only_census_boundary_predicate(self) -> None:
        rows = {
            row["recno"]: row for row in read_json(C20PC_PATH)["table4"]
        }
        boundary = rows[764]
        self.assertEqual(boundary["Name"], "2MASS J04210718-6306022")
        self.assertEqual(1000 / boundary["Plx"], 20)

        uncertain = rows[338]
        self.assertGreater(uncertain["e_Plx"], uncertain["Plx"])
        self.assertGreater(1000 / uncertain["Plx"], 20)

        source_names = {row["Name"] for row in rows.values()}
        self.assertNotIn("ABSENT REVIEW CANDIDATE", source_names)

    def test_census_schema_rejects_malformed_numeric_field(self) -> None:
        document = read_json(C20PC_PATH)
        document["table4"][0]["Teff"] = "not-a-number"
        with self.assertRaisesRegex(ValueError, "schema validation"):
            validate_schema(
                document,
                C20PC_SCHEMA_PATH,
                "20-pc census fixture",
            )


if __name__ == "__main__":
    unittest.main()
