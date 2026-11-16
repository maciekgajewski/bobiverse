from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import extraction_preflight as preflight
from common import mapped_anchor_names

NARRATIVE = ROOT / "data" / "narrative"


class RevisionPriorRootTest(unittest.TestCase):
    """Preflight item 8 for a revision of canonical 1.24 (prior root 1.1-1.23).

    Reproduces, on the canonical corpus, why the whole-chain registry and pinned
    astronomy fail at a strict prefix, and checks the scoping that replaces them.
    """

    target = "1.24"

    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name) / "prior-root"
        shutil.copytree(NARRATIVE / "baseline", self.root / "baseline")
        target = preflight.chapter_key(self.target)
        for chapter in NARRATIVE.glob("chapters/*/*.json"):
            key = (int(chapter.parent.name), int(chapter.stem))
            if key < target:
                destination = self.root / "chapters" / chapter.parent.name / chapter.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(chapter, destination)
        (self.root / "presentation").mkdir()
        shutil.copyfile(
            ROOT / "data" / "presentation" / "species.json",
            self.root / "presentation" / "species.json",
        )

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def prefix_species(self) -> set[str]:
        zero_state = json.loads(
            (self.root / "baseline" / "zero-state.json").read_text(encoding="utf-8")
        )
        known = {
            entity["id"]
            for entity in zero_state.get("entities", [])
            if entity.get("id", "").startswith("species:")
        }
        for chapter in self.root.glob("chapters/*/*.json"):
            known.update(
                preflight.introduced_species(
                    json.loads(chapter.read_text(encoding="utf-8"))
                )
            )
        return known

    def test_unscoped_registry_names_a_species_the_prefix_lacks(self) -> None:
        registry = json.loads(
            (self.root / "presentation" / "species.json").read_text(encoding="utf-8")
        )
        assigned = {entry["species_id"] for entry in registry["assignments"]}
        self.assertIn("species:delta-eridani-natives", assigned - self.prefix_species())

    def test_scoping_withholds_exactly_the_forward_assignments(self) -> None:
        later = preflight.later_canonical(ROOT, self.target)
        self.assertEqual(later[0], self.target)
        evidence, problem = preflight.scope_presentation(ROOT, self.root, later)
        self.assertIsNone(problem)
        self.assertIn(
            {"species_id": "species:delta-eridani-natives", "introduced_in": "1.27"},
            evidence["withheld_forward_assignments"],
        )
        scoped = json.loads(
            (self.root / "presentation" / "species.json").read_text(encoding="utf-8")
        )
        known = self.prefix_species()
        for assignment in scoped["assignments"]:
            self.assertIn(assignment["species_id"], known)

    def test_prefix_anchors_are_a_strict_subset_of_the_pinned_chain(self) -> None:
        prefix = set(mapped_anchor_names(self.root))
        canonical = set(mapped_anchor_names(NARRATIVE))
        self.assertLess(prefix, canonical)


if __name__ == "__main__":
    unittest.main()
