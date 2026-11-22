from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import candidate_entities as cand  # noqa: E402
from common import read_json  # noqa: E402

SCHEMA = read_json(ROOT / "data" / "schema" / "candidate-entities.schema.json")

# Synthetic, fictional records only (ADR-0032 §4).
ZERO_STATE = {
    "locations": {
        "id": "location:solar-system",
        "name": "Solar System",
        "children": [{"id": "location:sol", "name": "Sol"}],
    },
    "entities": [{"id": "character:fixture-alex", "name": "Fixture Alex"}],
}


def chapter(ref: str, **extra: object) -> dict[str, object]:
    return {"chapter": ref, "date": "2160", **extra}


def candidate(**overrides: object) -> dict[str, object]:
    record: dict[str, object] = {
        "id": "candidate:fixture-dana",
        "kind": "character",
        "name": "Fixture Dana",
        "aliases": [],
        "mentions": ["1.2"],
        "promotion": None,
    }
    record.update(overrides)
    return record


class CandidateValidationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "baseline").mkdir()
        (self.root / "baseline" / "zero-state.json").write_text(json.dumps(ZERO_STATE))
        (self.root / "books.json").write_text(
            json.dumps({"books": {"1": {"title": "Fixture", "chapter_count": 9}}})
        )
        self.chapters: dict[str, dict[str, object]] = {
            "1.1": chapter("1.1", introducing=[{"id": "location:mars", "name": "Fixture Mars"}]),
            "1.2": chapter("1.2"),
            "1.3": chapter("1.3"),
        }

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def errors(self, *candidates: dict[str, object]) -> list[str]:
        directory = self.root / "chapters" / "1"
        directory.mkdir(parents=True, exist_ok=True)
        for path in directory.glob("*.json"):
            path.unlink()
        for ref, record in self.chapters.items():
            (directory / f"{ref.split('.')[1]}.json").write_text(json.dumps(record))
        return cand.validate_candidates(
            {"candidates": list(candidates)}, schema=SCHEMA, narrative_root=self.root
        )

    def promote(self, chapter_ref: str = "1.3", first: str | None = "1.2") -> None:
        dana: dict[str, object] = {"id": "character:fixture-dana", "name": "Fixture Dana"}
        if first is not None:
            dana["first_mentioned"] = first
        self.chapters[chapter_ref] = chapter(chapter_ref, introducing=[dana])

    def test_accepts_an_unpromoted_candidate(self) -> None:
        self.assertEqual(self.errors(candidate()), [])

    def test_accepts_catalogued_chapters_whose_data_has_not_landed(self) -> None:
        self.assertEqual(self.errors(candidate(mentions=["1.5", "1.9"])), [])

    def test_rejects_schema_violations(self) -> None:
        self.assertTrue(self.errors(candidate(id="dana")))
        self.assertTrue(self.errors(candidate(kind="planet")))
        self.assertTrue(self.errors(candidate(mentions=[])))
        self.assertTrue(self.errors(candidate(extra=True)))
        self.assertTrue(self.errors(candidate(mentions=["01.2"])))

    def test_rejects_uncatalogued_and_unordered_mentions(self) -> None:
        self.assertIn("not a canonical chapter", " ".join(self.errors(candidate(mentions=["1.10"]))))
        self.assertIn("reading order", " ".join(self.errors(candidate(mentions=["1.3", "1.2"]))))

    def test_rejects_unsorted_and_duplicate_ids(self) -> None:
        later = candidate(id="candidate:fixture-zed", name="Fixture Zed")
        self.assertIn("sorted", " ".join(self.errors(later, candidate())))
        self.assertIn("duplicate", " ".join(self.errors(candidate(), candidate())))

    def test_rejects_a_name_visible_at_the_first_mention(self) -> None:
        # Zero state, an earlier introduction, and an alias all count.
        self.assertIn("matches", " ".join(self.errors(candidate(name="fixture  alex"))))
        self.assertIn("matches", " ".join(self.errors(candidate(name="Fixture Mars"))))
        self.assertIn(
            "matches",
            " ".join(self.errors(candidate(name="Other", aliases=["Fixture Mars"]))),
        )

    def test_name_rule_uses_gliese_normalization(self) -> None:
        self.chapters["1.1"] = chapter("1.1", introducing=[{"id": "location:gj-54", "name": "GJ 54 A"}])
        self.assertTrue(self.errors(candidate(kind="location", name="Gliese 54 A")))
        self.assertEqual(self.errors(candidate(kind="location", name="Gliese 54")), [])

    def test_ignores_names_introduced_after_the_first_mention(self) -> None:
        self.chapters["1.3"] = chapter("1.3", introducing=[{"id": "character:late", "name": "Fixture Dana"}])
        self.assertEqual(self.errors(candidate()), [])

    def test_accepts_a_matching_promotion(self) -> None:
        self.promote()
        promoted = candidate(promotion={"chapter": "1.3", "entity_id": "character:fixture-dana"})
        self.assertEqual(self.errors(promoted), [])

    def test_rejects_a_bad_promotion(self) -> None:
        self.promote()
        bad = [
            ({"chapter": "1.2", "entity_id": "character:fixture-dana"}, "must follow"),
            ({"chapter": "1.3", "entity_id": "character:other"}, "not introduced"),
            ({"chapter": "1.3", "entity_id": "event:fixture-dana"}, "is not a character"),
        ]
        for promotion, message in bad:
            with self.subTest(message=message):
                self.assertIn(message, " ".join(self.errors(candidate(promotion=promotion))))

    def test_rejects_a_first_mentioned_mismatch(self) -> None:
        self.promote(first="1.1")
        promoted = candidate(promotion={"chapter": "1.3", "entity_id": "character:fixture-dana"})
        self.assertIn("must equal the first mention", " ".join(self.errors(promoted)))

    def test_rejects_a_duplicate_promotion(self) -> None:
        self.promote()
        promotion = {"chapter": "1.3", "entity_id": "character:fixture-dana"}
        first = candidate(promotion=promotion)
        second = candidate(id="candidate:fixture-dana-two", name="Fixture Dana Two", promotion=promotion)
        self.assertIn("duplicate promotion", " ".join(self.errors(first, second)))

    def test_rejects_an_unpromoted_candidate_location_that_is_an_anchor(self) -> None:
        # A later chapter maps a location of the candidate's name without promoting it.
        self.chapters["1.3"] = chapter(
            "1.3",
            introducing=[{"id": "location:fixture-vega", "name": "Fixture Vega", "astronomy_object_id": "vega"}],
        )
        location = candidate(id="candidate:fixture-vega", kind="location", name="Fixture Vega")
        self.assertIn("narrative anchor location:fixture-vega", " ".join(self.errors(location)))
        # An update that maps a renamed location counts too.
        self.chapters["1.3"] = chapter(
            "1.3",
            updates=[{"entity_id": "location:mars", "name": "Fixture Vega", "astronomy_object_id": "vega"}],
        )
        self.assertIn("narrative anchor location:mars", " ".join(self.errors(location)))

    def test_accepts_candidate_locations_that_are_not_anchors(self) -> None:
        # An unmapped location of the same name is not an anchor (the name rule
        # covers it only when visible at the first mention), and a promoted
        # candidate location may be mapped in its promotion chapter.
        self.chapters["1.3"] = chapter(
            "1.3",
            introducing=[{"id": "location:fixture-vega", "name": "Fixture Vega", "astronomy_object_id": "vega", "first_mentioned": "1.2"}],
        )
        promoted = candidate(
            id="candidate:fixture-vega",
            kind="location",
            name="Fixture Vega",
            promotion={"chapter": "1.3", "entity_id": "location:fixture-vega"},
        )
        self.assertEqual(self.errors(promoted), [])
        self.chapters["1.3"] = chapter("1.3", introducing=[{"id": "location:other", "name": "Fixture Vega"}])
        self.assertEqual(self.errors(candidate(id="candidate:fixture-vega", kind="location", name="Fixture Vega")), [])

    def test_rejects_first_mentioned_without_a_promoted_candidate(self) -> None:
        self.promote()
        self.assertIn("no promoted candidate", " ".join(self.errors(candidate(id="candidate:other", name="Other"))))


class StructuralCheckTest(unittest.TestCase):
    def test_repository_src_and_manifest_never_reference_candidates(self) -> None:
        self.assertEqual(cand.structural_violations(), [])

    def test_flags_a_reference(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            src = Path(tmp) / "src"
            src.mkdir()
            (src / "ok.ts").write_text("export const ok = 1;\n")
            (src / "bad.ts").write_text('import c from "../data/candidates/candidate-entities.json";\n')
            manifest = Path(tmp) / "manifest.json"
            manifest.write_text('{"candidate-entities": true}')
            tooling = Path(tmp) / "common.py"
            tooling.write_text('CANDIDATES = "data/candidates/candidate-entities.json"\n')
            violations = cand.structural_violations(src, manifest, [tooling])
            self.assertEqual(len(violations), 3)
            self.assertTrue(any(v.endswith("bad.ts") for v in violations))


class SeededFileTest(unittest.TestCase):
    def test_repository_candidate_file_is_valid(self) -> None:
        self.assertEqual(
            cand.validate_candidates(
                read_json(cand.CANDIDATES_FILE), schema=SCHEMA, narrative_root=cand.NARRATIVE_ROOT
            ),
            [],
        )


if __name__ == "__main__":
    unittest.main()
