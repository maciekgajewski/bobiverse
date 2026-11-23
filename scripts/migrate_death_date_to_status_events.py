#!/usr/bin/env python3
"""Mechanically migrate character death_date / death_event_id to status_events (ADR-0033).

Each write that sets a non-null death_date becomes one died event on that same
write (date from death_date, event_id from a present non-null death_event_id).
Writes that clear death_date to null (with no non-null death_event_id) are
dropped: an update left with only entity_id is removed entirely; an
introduction, or a write that still has other fields, keeps the record and
drops only the death fields. A null death_date with a non-null death_event_id
is an error. No other fields are changed. Run from the repository root:

    python3 scripts/migrate_death_date_to_status_events.py
    python3 scripts/migrate_death_date_to_status_events.py --prove --base cf219fb

`--prove --base cf219fb` only reproduces at the original migration commit.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

CHAPTERS_ROOT = Path("data/narrative/chapters")


def status_event_from_death(record: dict[str, Any]) -> dict[str, Any] | None:
    if "death_date" not in record and "death_event_id" not in record:
        return None
    death_date = record.get("death_date")
    death_event_id = record.get("death_event_id")
    label = record.get("id") or record.get("entity_id")
    # ADR-0033: writes that clear death_date to null are dropped; a return to
    # life is a restored_from_backup event, not a cleared field. A null
    # death_date with a non-null death_event_id is inconsistent and errors.
    if "death_date" in record and death_date is None:
        if "death_event_id" in record and death_event_id is not None:
            raise SystemExit(
                f"cannot migrate write {label}: "
                f"death_date is null but death_event_id is present"
            )
        return None
    if "death_date" not in record:
        if death_event_id is None:
            return None
        raise SystemExit(
            f"cannot migrate write {label}: "
            f"death_event_id is present without death_date"
        )
    if not isinstance(death_date, str):
        raise SystemExit(
            f"cannot migrate write {label}: "
            f"expected a non-null death_date, got {death_date!r}"
        )
    event: dict[str, Any] = {"date": death_date, "kind": "died"}
    if isinstance(death_event_id, str):
        event["event_id"] = death_event_id
    return event


def migrate_record(record: dict[str, Any]) -> dict[str, Any] | None:
    """Return a died event if this write carried a death_date; mutate record."""
    if "death_date" not in record and "death_event_id" not in record:
        return None
    event = status_event_from_death(record)
    record.pop("death_date", None)
    record.pop("death_event_id", None)
    if event is None:
        return None
    if "status_events" in record:
        raise SystemExit(
            f"write {record.get('id') or record.get('entity_id')} already has status_events"
        )
    record["status_events"] = [event]
    return event


def migrate_chapter(data: dict[str, Any]) -> tuple[list[dict[str, Any]], bool]:
    """Migrate writes in one chapter.

    Returns (died events added, True if a death_date or death_event_id key was
    removed, a died event was added, or a now-empty update write was dropped).
    """
    events: list[dict[str, Any]] = []
    changed = False
    for key in ("introducing", "updates"):
        writes = data.get(key)
        if not isinstance(writes, list):
            continue
        kept: list[Any] = []
        dropped_any = False
        for write in writes:
            if not isinstance(write, dict):
                kept.append(write)
                continue
            had_death_keys = "death_date" in write or "death_event_id" in write
            event = migrate_record(write)
            if event is not None:
                events.append(event)
            if had_death_keys:
                changed = True
            if (
                key == "updates"
                and had_death_keys
                and set(write.keys()) == {"entity_id"}
            ):
                dropped_any = True
                continue
            kept.append(write)
        if dropped_any:
            data[key] = kept
    return events, changed


def chapter_files(root: Path = CHAPTERS_ROOT) -> list[Path]:
    return sorted(root.rglob("*.json"))


def dump_json(data: Any) -> str:
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def migrate_tree(
    root: Path = CHAPTERS_ROOT,
) -> list[tuple[Path, list[dict[str, Any]]]]:
    changed: list[tuple[Path, list[dict[str, Any]]]] = []
    for path in chapter_files(root):
        original = path.read_text(encoding="utf-8")
        data = json.loads(original)
        events, touched = migrate_chapter(data)
        if not touched:
            continue
        path.write_text(dump_json(data), encoding="utf-8")
        changed.append((path, events))
    return changed


def git_show(base: str, path: Path) -> str | None:
    result = subprocess.run(
        ["git", "show", f"{base}:{path.as_posix()}"],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return result.stdout


def strip_death_and_expected(record: dict[str, Any]) -> None:
    event = status_event_from_death(record)
    record.pop("death_date", None)
    record.pop("death_event_id", None)
    if event is not None:
        record["status_events"] = [event]


def expected_from_base(data: Any) -> Any:
    if isinstance(data, dict):
        if any(k in data for k in ("death_date", "death_event_id")) and (
            "id" in data or "entity_id" in data
        ):
            strip_death_and_expected(data)
        for value in data.values():
            expected_from_base(value)
    elif isinstance(data, list):
        for item in data:
            expected_from_base(item)
    return data


def count_death_dates(data: Any) -> int:
    count = 0
    if isinstance(data, dict):
        if isinstance(data.get("death_date"), str):
            count += 1
        for value in data.values():
            count += count_death_dates(value)
    elif isinstance(data, list):
        for item in data:
            count += count_death_dates(item)
    return count


def count_died_events(data: Any) -> int:
    count = 0
    if isinstance(data, dict):
        events = data.get("status_events")
        if isinstance(events, list):
            count += sum(
                1
                for event in events
                if isinstance(event, dict) and event.get("kind") == "died"
            )
        for key, value in data.items():
            if key != "status_events":
                count += count_died_events(value)
    elif isinstance(data, list):
        for item in data:
            count += count_died_events(item)
    return count


def prove(base: str) -> int:
    changed_files: list[Path] = []
    old_deaths = 0
    new_died = 0
    errors: list[str] = []
    for path in chapter_files():
        current = path.read_text(encoding="utf-8")
        current_data = json.loads(current)
        base_text = git_show(base, path)
        if base_text is None:
            if count_died_events(current_data) or "death_date" in current:
                errors.append(f"{path}: new chapter not in {base} but has death/status data")
            continue
        if current == base_text:
            old_deaths += count_death_dates(json.loads(base_text))
            new_died += count_died_events(current_data)
            continue
        changed_files.append(path)
        base_data = json.loads(base_text)
        old_deaths += count_death_dates(base_data)
        new_died += count_died_events(current_data)
        expected = expected_from_base(json.loads(base_text))
        if expected != current_data:
            errors.append(
                f"{path}: parsed diff is not only death_date/death_event_id → status_events"
            )
        if "death_date" in current or "death_event_id" in current:
            errors.append(f"{path}: still contains death_date or death_event_id")

    # No other data/narrative files should change except the migrated chapters.
    diff_name = subprocess.run(
        ["git", "diff", "--name-only", base, "--", "data/narrative"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.splitlines()
    unexpected = [
        name
        for name in diff_name
        if name not in {path.as_posix() for path in changed_files}
    ]
    if unexpected:
        errors.append("unexpected data/narrative changes: " + ", ".join(unexpected))

    print(f"base: {base}")
    print(f"files changed: {len(changed_files)}")
    for path in changed_files:
        print(f"  {path}")
    print(f"old non-null death_date count: {old_deaths}")
    print(f"new died status_events count: {new_died}")
    if old_deaths != new_died:
        errors.append(
            f"count mismatch: {old_deaths} death_date writes vs {new_died} died events"
        )
    if errors:
        print("PROOF FAILED:")
        for error in errors:
            print(f"  {error}")
        return 1
    print("PROOF OK: 1:1 mapping, no other chapter-data bytes changed in meaning.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prove", action="store_true")
    parser.add_argument("--base", default="HEAD")
    args = parser.parse_args()
    if not CHAPTERS_ROOT.is_dir():
        print("data/narrative/chapters not found; run from the repository root", file=sys.stderr)
        return 2
    if args.prove:
        return prove(args.base)
    changed = migrate_tree()
    total = sum(len(events) for _, events in changed)
    print(f"migrated {total} death_date write(s) in {len(changed)} file(s):")
    for path, events in changed:
        print(f"  {path}: {len(events)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
