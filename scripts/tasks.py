#!/usr/bin/env python3
"""List, validate, and allocate identifiers for repository task documents."""

from __future__ import annotations

import argparse
import datetime as dt
import re
import secrets
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Sequence

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TASKS_DIR = REPOSITORY_ROOT / "docs" / "tasks"
STATUSES = ("Draft", "Ready", "In progress", "Blocked", "Done")
CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

LEGACY_ID_PATTERN = r"BOB-[0-9]{3}"
DATED_ID_PATTERN = r"BOB-[0-9]{8}-[0-9A-HJKMNP-TV-Z]{6}"
LEGACY_ID_RE = re.compile(rf"^{LEGACY_ID_PATTERN}$")
DATED_ID_RE = re.compile(
    r"^BOB-(?P<date>[0-9]{8})-(?P<suffix>[0-9A-HJKMNP-TV-Z]{6})$"
)
TASK_FILENAME_RE = re.compile(
    rf"^(?P<task_id>{LEGACY_ID_PATTERN}|{DATED_ID_PATTERN})"
    r"-(?P<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$"
)
HEADING_RE = re.compile(r"^# (?P<task_id>BOB-[^:]+): (?P<title>.+)$")
STATUS_RE = re.compile(r"^Status: (?P<status>.*)$")
FENCE_OPEN_RE = re.compile(r"^ {0,3}(?P<fence>`{3,}|~{3,})(?P<info>.*)$")


@dataclass(frozen=True)
class Task:
    task_id: str
    status: str
    title: str
    path: Path
    display_path: str


class TaskValidationError(Exception):
    def __init__(self, errors: Sequence[str]) -> None:
        self.errors = tuple(errors)
        super().__init__("\n".join(self.errors))


def task_directory_context(raw_path: str | None) -> tuple[Path, Path]:
    if raw_path is None:
        return DEFAULT_TASKS_DIR.resolve(), REPOSITORY_ROOT.resolve()

    task_directory = Path(raw_path).expanduser().resolve()
    return task_directory, task_directory


def valid_task_id(value: str) -> bool:
    if LEGACY_ID_RE.fullmatch(value):
        return True

    match = DATED_ID_RE.fullmatch(value)
    if match is None:
        return False
    try:
        dt.datetime.strptime(match.group("date"), "%Y%m%d")
    except ValueError:
        return False
    return True


def top_level_statuses(lines: Sequence[str]) -> list[str]:
    statuses: list[str] = []
    fence: tuple[str, int] | None = None

    for line in lines[1:]:
        if fence is not None:
            delimiter, minimum_length = fence
            if re.fullmatch(
                rf" {{0,3}}{re.escape(delimiter)}{{{minimum_length},}}[ \t]*",
                line,
            ):
                fence = None
            continue
        fence_match = FENCE_OPEN_RE.fullmatch(line)
        if fence_match is not None:
            opening = fence_match.group("fence")
            info = fence_match.group("info")
            if opening[0] != "`" or "`" not in info:
                fence = (opening[0], len(opening))
                continue
        if line.startswith("## "):
            break
        status_match = STATUS_RE.fullmatch(line)
        if status_match is not None:
            statuses.append(status_match.group("status"))

    return statuses


def discover_tasks(task_directory: Path, display_base: Path) -> list[Task]:
    if not task_directory.is_dir():
        raise TaskValidationError([f"{task_directory}: task directory does not exist"])

    errors: list[str] = []
    tasks: list[Task] = []
    filename_ids: dict[str, list[str]] = {}

    for path in sorted(task_directory.glob("BOB-*.md")):
        relative_path = path.relative_to(display_base).as_posix()
        filename_match = TASK_FILENAME_RE.fullmatch(path.name)
        if filename_match is None:
            errors.append(
                f"{relative_path}: filename must be <valid-ID>-<lowercase-hyphenated-slug>.md"
            )
            continue
        filename_id = filename_match.group("task_id")
        if not valid_task_id(filename_id):
            errors.append(f"{relative_path}: filename contains invalid task ID {filename_id!r}")
            continue
        filename_ids.setdefault(filename_id, []).append(relative_path)

        try:
            document = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as error:
            errors.append(f"{relative_path}: cannot read UTF-8 task document: {error}")
            continue

        lines = document.splitlines()
        heading_match = HEADING_RE.fullmatch(lines[0]) if lines else None
        if heading_match is None:
            errors.append(f"{relative_path}: first line must be '# <ID>: <title>'")
            continue

        heading_id = heading_match.group("task_id")
        title = heading_match.group("title")

        if not valid_task_id(heading_id):
            errors.append(f"{relative_path}: heading contains invalid task ID {heading_id!r}")
        elif heading_id != filename_id:
            errors.append(
                f"{relative_path}: heading ID {heading_id!r} does not match filename ID "
                f"{filename_id!r}"
            )

        if title != title.strip():
            errors.append(f"{relative_path}: title must not have surrounding whitespace")

        statuses = top_level_statuses(lines)
        if len(statuses) != 1:
            errors.append(
                f"{relative_path}: expected exactly one top-level Status field, "
                f"found {len(statuses)}"
            )
            continue

        status = statuses[0]
        if status not in STATUSES:
            errors.append(
                f"{relative_path}: unsupported status {status!r}; expected one of "
                f"{', '.join(STATUSES)}"
            )

        if (
            valid_task_id(heading_id)
            and heading_id == filename_id
            and title == title.strip()
            and status in STATUSES
        ):
            tasks.append(
                Task(
                    task_id=filename_id,
                    status=status,
                    title=title,
                    path=path,
                    display_path=relative_path,
                )
            )

    for task_id, duplicate_paths in sorted(filename_ids.items()):
        if len(duplicate_paths) > 1:
            paths = ", ".join(duplicate_paths)
            errors.append(f"duplicate task ID {task_id!r}: {paths}")

    if errors:
        raise TaskValidationError(errors)

    return sorted(tasks, key=lambda task: task.task_id)


def escape_markdown_cell(value: str) -> str:
    return value.replace("\\", "\\\\").replace("|", "\\|")


def format_plain(tasks: Sequence[Task]) -> str:
    rows = ["ID\tSTATUS\tTITLE\tPATH"]
    rows.extend(
        f"{task.task_id}\t{task.status}\t{task.title}\t{task.display_path}"
        for task in tasks
    )
    return "\n".join(rows)


def format_markdown(tasks: Sequence[Task]) -> str:
    rows = [
        "| Task | Status | Title | Path |",
        "| --- | --- | --- | --- |",
    ]
    rows.extend(
        "| "
        + " | ".join(
            (
                escape_markdown_cell(task.task_id),
                escape_markdown_cell(task.status),
                escape_markdown_cell(task.title),
                escape_markdown_cell(task.display_path),
            )
        )
        + " |"
        for task in tasks
    )
    return "\n".join(rows)


def parse_creation_date(value: str) -> dt.date:
    try:
        parsed = dt.date.fromisoformat(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("date must use valid YYYY-MM-DD form") from error
    if value != parsed.isoformat():
        raise argparse.ArgumentTypeError("date must use zero-padded YYYY-MM-DD form")
    return parsed


def generate_task_id(
    tasks: Sequence[Task],
    creation_date: dt.date,
    choose: Callable[[str], str] = secrets.choice,
) -> str:
    existing_ids = {task.task_id for task in tasks}
    date_component = creation_date.strftime("%Y%m%d")

    while True:
        suffix = "".join(choose(CROCKFORD_BASE32) for _ in range(6))
        candidate = f"BOB-{date_component}-{suffix}"
        if candidate not in existing_ids:
            return candidate


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="List, validate, and allocate identifiers for Bobiverse task files."
    )
    parser.add_argument(
        "--tasks-dir",
        metavar="PATH",
        help="task directory (default: repository docs/tasks)",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="print a generated task index")
    list_parser.add_argument(
        "--format",
        choices=("plain", "markdown"),
        default="plain",
        help="output format (default: plain)",
    )
    list_parser.add_argument(
        "--status",
        choices=STATUSES,
        help='include only one status, such as Ready or "In progress"',
    )

    subparsers.add_parser("check", help="validate all task filenames and metadata")

    new_id_parser = subparsers.add_parser(
        "new-id", help="print one available collision-resistant task ID"
    )
    new_id_parser.add_argument(
        "--date",
        type=parse_creation_date,
        help="UTC creation date in YYYY-MM-DD form (default: current UTC date)",
    )

    return parser


def run(arguments: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(arguments)
    task_directory, display_base = task_directory_context(args.tasks_dir)

    try:
        tasks = discover_tasks(task_directory, display_base)
    except TaskValidationError as error:
        for message in error.errors:
            print(f"error: {message}", file=sys.stderr)
        return 1

    if args.command == "check":
        print(f"Validated {len(tasks)} task files.")
        return 0

    if args.command == "list":
        if args.status is not None:
            tasks = [task for task in tasks if task.status == args.status]
        formatter = format_markdown if args.format == "markdown" else format_plain
        print(formatter(tasks))
        return 0

    creation_date = args.date or dt.datetime.now(dt.UTC).date()
    print(generate_task_id(tasks, creation_date))
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
