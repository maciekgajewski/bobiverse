from __future__ import annotations

import sys
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


if __name__ == "__main__":
    unittest.main()
