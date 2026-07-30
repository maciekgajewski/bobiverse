from __future__ import annotations

import datetime as dt
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from tasks import (
    CROCKFORD_BASE32,
    TaskValidationError,
    discover_tasks,
    format_markdown,
    format_plain,
    generate_task_id,
)


def write_task(
    task_directory: Path,
    filename: str,
    *,
    heading_id: str | None = None,
    title: str = "example task",
    statuses: tuple[str, ...] = ("Ready",),
) -> Path:
    task_id = filename.removesuffix(".md").split("-", maxsplit=2)
    if filename.startswith("BOB-20"):
        inferred_id = "-".join(filename.removesuffix(".md").split("-", maxsplit=3)[:3])
    else:
        inferred_id = "-".join(task_id[:2])
    lines = [f"# {heading_id or inferred_id}: {title}", ""]
    for status in statuses:
        lines.extend((f"Status: {status}", ""))
    lines.extend(("Phase: test", "", "## Objective", "", "Exercise task tooling."))
    path = task_directory / filename
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


class TaskDiscoveryTest(unittest.TestCase):
    def test_discovers_legacy_and_new_tasks_in_id_order(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            write_task(
                task_directory,
                "BOB-20260730-ABC123-new-task.md",
                title="new task",
                statuses=("Draft",),
            )
            write_task(
                task_directory,
                "BOB-002-legacy-task.md",
                title="legacy task",
                statuses=("Done",),
            )

            tasks = discover_tasks(task_directory, task_directory)

            self.assertEqual([task.task_id for task in tasks], ["BOB-002", "BOB-20260730-ABC123"])
            self.assertEqual([task.display_path for task in tasks], ["BOB-002-legacy-task.md", "BOB-20260730-ABC123-new-task.md"])

    def test_plain_and_markdown_formats_are_deterministic(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            write_task(task_directory, "BOB-002-second.md", title="second", statuses=("Done",))
            write_task(task_directory, "BOB-001-first.md", title="first | primary", statuses=("Ready",))
            tasks = discover_tasks(task_directory, task_directory)

            self.assertEqual(
                format_plain(tasks),
                "ID\tSTATUS\tTITLE\tPATH\n"
                "BOB-001\tReady\tfirst | primary\tBOB-001-first.md\n"
                "BOB-002\tDone\tsecond\tBOB-002-second.md",
            )
            self.assertEqual(
                format_markdown(tasks),
                "| Task | Status | Title | Path |\n"
                "| --- | --- | --- | --- |\n"
                "| BOB-001 | Ready | first \\| primary | BOB-001-first.md |\n"
                "| BOB-002 | Done | second | BOB-002-second.md |",
            )

    def test_rejects_invalid_slug_forms(self) -> None:
        invalid_filenames = (
            "BOB-001.md",
            "BOB-001-.md",
            "BOB-001-UPPERCASE.md",
            "BOB-001-two--hyphens.md",
            "BOB-001-leading-.md",
            "BOB-001-under_score.md",
        )
        for filename in invalid_filenames:
            with self.subTest(filename=filename), tempfile.TemporaryDirectory() as temporary_directory:
                task_directory = Path(temporary_directory)
                write_task(task_directory, filename, heading_id="BOB-001")
                with self.assertRaisesRegex(TaskValidationError, "lowercase-hyphenated-slug"):
                    discover_tasks(task_directory, task_directory)

    def test_rejects_non_ascii_and_invalid_calendar_ids(self) -> None:
        cases = (
            ("BOB-１２３-unicode.md", "BOB-１２３", "lowercase-hyphenated-slug"),
            (
                "BOB-20260231-ABC123-invalid-date.md",
                "BOB-20260231-ABC123",
                "invalid task ID",
            ),
            ("BOB-001-valid.md", "BOB-１２３", "invalid task ID"),
        )
        for filename, heading_id, expected in cases:
            with self.subTest(filename=filename), tempfile.TemporaryDirectory() as temporary_directory:
                task_directory = Path(temporary_directory)
                write_task(task_directory, filename, heading_id=heading_id)
                with self.assertRaisesRegex(TaskValidationError, expected):
                    discover_tasks(task_directory, task_directory)

    def test_rejects_malformed_and_mismatched_heading_ids(self) -> None:
        cases = (
            ("BOB-001-task.md", "not a heading", "first line"),
            ("BOB-001-task.md", "# BOB-XYZ: task", "invalid task ID"),
            ("BOB-001-task.md", "# BOB-002: task", "does not match filename ID"),
        )
        for filename, first_line, expected in cases:
            with self.subTest(first_line=first_line), tempfile.TemporaryDirectory() as temporary_directory:
                task_directory = Path(temporary_directory)
                path = write_task(task_directory, filename)
                lines = path.read_text(encoding="utf-8").splitlines()
                lines[0] = first_line
                path.write_text("\n".join(lines) + "\n", encoding="utf-8")
                with self.assertRaisesRegex(TaskValidationError, expected):
                    discover_tasks(task_directory, task_directory)

    def test_rejects_missing_duplicate_and_invalid_statuses(self) -> None:
        cases = (
            ((), "found 0"),
            (("Ready", "Done"), "found 2"),
            (("ready",), "unsupported status"),
        )
        for statuses, expected in cases:
            with self.subTest(statuses=statuses), tempfile.TemporaryDirectory() as temporary_directory:
                task_directory = Path(temporary_directory)
                write_task(task_directory, "BOB-001-task.md", statuses=statuses)
                with self.assertRaisesRegex(TaskValidationError, expected):
                    discover_tasks(task_directory, task_directory)

    def test_rejects_duplicate_ids_even_when_slugs_differ(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            write_task(task_directory, "BOB-001-first.md")
            write_task(task_directory, "BOB-001-second.md")
            with self.assertRaisesRegex(TaskValidationError, "duplicate task ID"):
                discover_tasks(task_directory, task_directory)

    def test_reports_duplicate_id_alongside_invalid_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            write_task(task_directory, "BOB-001-first.md")
            write_task(task_directory, "BOB-001-second.md", statuses=("Invalid",))

            with self.assertRaises(TaskValidationError) as context:
                discover_tasks(task_directory, task_directory)

            self.assertIn("unsupported status", str(context.exception))
            self.assertIn("duplicate task ID", str(context.exception))

    def test_ignores_status_examples_inside_commonmark_fences(self) -> None:
        fenced_examples = (
            ["```markdown", "Status: Done", "```", ""],
            ["  ```markdown", "Status: Done", "  ```", ""],
            ["````markdown", "```", "Status: Done", "````", ""],
            ["~~~markdown", "Status: Done", "   ~~~~", ""],
        )
        for fenced_example in fenced_examples:
            with self.subTest(fence=fenced_example[0]), tempfile.TemporaryDirectory() as temporary_directory:
                task_directory = Path(temporary_directory)
                path = write_task(task_directory, "BOB-001-example.md")
                lines = path.read_text(encoding="utf-8").splitlines()
                lines[2:2] = fenced_example
                path.write_text("\n".join(lines) + "\n", encoding="utf-8")

                tasks = discover_tasks(task_directory, task_directory)

                self.assertEqual(len(tasks), 1)
                self.assertEqual(tasks[0].status, "Ready")


class TaskIdGenerationTest(unittest.TestCase):
    def test_generates_dated_crockford_id(self) -> None:
        generated = generate_task_id([], dt.date(2026, 7, 30), choose=lambda _: "Z")
        self.assertEqual(generated, "BOB-20260730-ZZZZZZ")
        self.assertTrue(set(generated.rsplit("-", maxsplit=1)[1]) <= set(CROCKFORD_BASE32))

    def test_retries_a_visible_collision(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            write_task(task_directory, "BOB-20260730-000000-existing.md")
            tasks = discover_tasks(task_directory, task_directory)
            choices = iter("000000111111")

            generated = generate_task_id(tasks, dt.date(2026, 7, 30), choose=lambda _: next(choices))

            self.assertEqual(generated, "BOB-20260730-111111")


class TaskCliTest(unittest.TestCase):
    def run_cli(
        self,
        *arguments: str,
        cwd: Path | None = None,
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(ROOT / "scripts" / "tasks.py"), *arguments],
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_help_has_no_filesystem_side_effect(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            before = list(task_directory.iterdir())
            result = self.run_cli("--tasks-dir", str(task_directory), "--help")
            after = list(task_directory.iterdir())

            self.assertEqual(result.returncode, 0)
            self.assertIn("{list,check,new-id}", result.stdout)
            self.assertEqual(result.stderr, "")
            self.assertEqual(before, after)

    def test_explicit_task_directory_paths_are_independent_of_cwd(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            task_directory = root / "tasks"
            task_directory.mkdir()
            other_directory = root / "elsewhere"
            other_directory.mkdir()
            write_task(task_directory, "BOB-001-example.md")

            result = self.run_cli(
                "--tasks-dir",
                str(task_directory),
                "list",
                "--format",
                "plain",
                cwd=other_directory,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("\tBOB-001-example.md\n", result.stdout)
            self.assertNotIn(str(task_directory), result.stdout)

    def test_status_filter_and_markdown_output(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            write_task(task_directory, "BOB-001-ready.md", statuses=("Ready",))
            write_task(task_directory, "BOB-002-done.md", statuses=("Done",))

            result = self.run_cli(
                "--tasks-dir",
                str(task_directory),
                "list",
                "--format",
                "markdown",
                "--status",
                "Ready",
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("BOB-001", result.stdout)
            self.assertNotIn("BOB-002", result.stdout)

    def test_check_aggregates_errors_and_returns_nonzero(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            write_task(task_directory, "BOB-001-UPPER.md")
            write_task(task_directory, "BOB-002-valid.md", statuses=("Unknown",))

            result = self.run_cli("--tasks-dir", str(task_directory), "check")

            self.assertEqual(result.returncode, 1)
            self.assertIn("BOB-001-UPPER.md", result.stderr)
            self.assertIn("BOB-002-valid.md", result.stderr)

    def test_new_id_accepts_iso_date_and_rejects_invalid_date(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            task_directory = Path(temporary_directory)
            valid = self.run_cli(
                "--tasks-dir",
                str(task_directory),
                "new-id",
                "--date",
                "2026-07-30",
            )
            invalid = self.run_cli(
                "--tasks-dir",
                str(task_directory),
                "new-id",
                "--date",
                "2026-7-30",
            )

            self.assertEqual(valid.returncode, 0, valid.stderr)
            self.assertRegex(valid.stdout, r"^BOB-20260730-[0-9A-HJKMNP-TV-Z]{6}\n$")
            self.assertNotEqual(invalid.returncode, 0)
            self.assertIn("YYYY-MM-DD", invalid.stderr)


if __name__ == "__main__":
    unittest.main()
