from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import migrate_death_date_to_status_events as migrate


class MigrateRecordTest(unittest.TestCase):
    def test_migrates_death_date_and_optional_event_id(self) -> None:
        record = {
            "entity_id": "character:fixture-alex",
            "death_date": "2016",
            "death_event_id": "event:fixture-known",
            "current_state": "Dead.",
        }
        event = migrate.migrate_record(record)
        self.assertEqual(
            event,
            {"date": "2016", "kind": "died", "event_id": "event:fixture-known"},
        )
        self.assertEqual(record["status_events"], [event])
        self.assertNotIn("death_date", record)
        self.assertNotIn("death_event_id", record)
        self.assertEqual(record["current_state"], "Dead.")

    def test_raises_when_only_death_event_id(self) -> None:
        record = {
            "entity_id": "character:fixture-alex",
            "death_event_id": "event:fixture-known",
        }
        with self.assertRaises(SystemExit) as raised:
            migrate.migrate_record(record)
        self.assertIn("death_event_id is present without death_date", str(raised.exception))
        self.assertEqual(record.get("death_event_id"), "event:fixture-known")
        self.assertNotIn("status_events", record)

    def test_raises_when_null_death_date_has_non_null_death_event_id(self) -> None:
        record = {
            "entity_id": "character:fixture-alex",
            "death_date": None,
            "death_event_id": "event:fixture-known",
        }
        with self.assertRaises(SystemExit) as raised:
            migrate.migrate_record(record)
        self.assertIn(
            "death_date is null but death_event_id is present",
            str(raised.exception),
        )
        self.assertEqual(record.get("death_date"), None)
        self.assertEqual(record.get("death_event_id"), "event:fixture-known")
        self.assertNotIn("status_events", record)

    def test_drops_null_death_date_without_adding_status_events(self) -> None:
        record = {
            "entity_id": "character:fixture-alex",
            "death_date": None,
            "current_state": "Alive again.",
        }
        event = migrate.migrate_record(record)
        self.assertIsNone(event)
        self.assertNotIn("death_date", record)
        self.assertNotIn("death_event_id", record)
        self.assertNotIn("status_events", record)
        self.assertEqual(record["current_state"], "Alive again.")

    def test_drops_null_death_date_and_death_event_id(self) -> None:
        record = {
            "entity_id": "character:fixture-alex",
            "death_date": None,
            "death_event_id": None,
        }
        event = migrate.migrate_record(record)
        self.assertIsNone(event)
        self.assertNotIn("death_date", record)
        self.assertNotIn("death_event_id", record)
        self.assertNotIn("status_events", record)

    def test_migrate_chapter_drops_null_clearing_update_left_with_only_entity_id(
        self,
    ) -> None:
        data = {
            "chapter": "1.2",
            "updates": [
                {"entity_id": "character:fixture-alex", "death_date": None},
                {"entity_id": "character:fixture-kai", "current_state": "active"},
            ],
        }
        events, changed = migrate.migrate_chapter(data)
        self.assertEqual(events, [])
        self.assertTrue(changed)
        self.assertEqual(
            data["updates"],
            [{"entity_id": "character:fixture-kai", "current_state": "active"}],
        )

    def test_null_clearing_update_with_other_fields_keeps_the_write(self) -> None:
        data = {
            "chapter": "1.2",
            "updates": [
                {
                    "entity_id": "character:fixture-alex",
                    "death_date": None,
                    "current_state": "Alive again.",
                },
            ],
        }
        events, changed = migrate.migrate_chapter(data)
        self.assertEqual(events, [])
        self.assertTrue(changed)
        self.assertEqual(
            data["updates"],
            [
                {
                    "entity_id": "character:fixture-alex",
                    "current_state": "Alive again.",
                },
            ],
        )

    def test_null_clearing_introduction_keeps_the_record(self) -> None:
        data = {
            "chapter": "1.2",
            "introducing": [
                {
                    "id": "character:fixture-alex",
                    "name": "Fixture Alex",
                    "death_date": None,
                },
            ],
        }
        events, changed = migrate.migrate_chapter(data)
        self.assertEqual(events, [])
        self.assertTrue(changed)
        self.assertEqual(
            data["introducing"],
            [{"id": "character:fixture-alex", "name": "Fixture Alex"}],
        )

    def test_migrate_tree_leaves_chapter_without_death_fields_untouched(self) -> None:
        # Non-Prettier layout: json.dumps(indent=2) would rewrite this file
        # even though it has no death fields.
        original = (
            '{\n'
            '    "chapter": "1.2",\n'
            '    "updates": [{ "entity_id": "character:fixture-alex", "current_state": "active" }]\n'
            '}\n'
        )
        with tempfile.TemporaryDirectory() as raw:
            path = Path(raw) / "1" / "2.json"
            path.parent.mkdir()
            path.write_text(original, encoding="utf-8")
            before = path.read_bytes()
            changed = migrate.migrate_tree(Path(raw))
            self.assertEqual(changed, [])
            self.assertEqual(path.read_bytes(), before)
            self.assertEqual(path.read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
