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
    KNOWN_DUPLICATE_ADR_NUMBERS,
    TaskValidationError,
    check_adrs,
    check_process_metadata,
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


def write_adr(
    adr_directory: Path,
    filename: str,
    *,
    heading: str | None = None,
    status: str = "Accepted",
    date: str = "2026-11-13",
    body: str = "Example decision.",
) -> Path:
    number = filename[:4]
    lines = [heading or f"# ADR-{number}: example", "", f"Status: {status}", f"Date: {date}"]
    lines.extend(("", "## Context", "", body))
    path = adr_directory / filename
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def write_known_duplicates(adr_directory: Path) -> None:
    """Fill 0001..0026 so the grandfathered duplicates exist and numbering is contiguous."""
    for value in range(1, 27):
        write_adr(adr_directory, f"{value:04d}-decision-{value}.md")
    for number in KNOWN_DUPLICATE_ADR_NUMBERS:
        write_adr(adr_directory, f"{number}-second-decision.md")


class ProcessMetadataTest(unittest.TestCase):
    def adr_errors(self, prepare) -> list[str]:
        with tempfile.TemporaryDirectory() as temporary_directory:
            adr_directory = Path(temporary_directory)
            write_known_duplicates(adr_directory)
            prepare(adr_directory)
            return check_adrs(adr_directory, adr_directory)[2]

    def test_accepts_contiguous_adrs_with_known_duplicates(self) -> None:
        self.assertEqual(self.adr_errors(lambda _: None), [])

    def test_rejects_bad_adr_metadata(self) -> None:
        cases = (
            (lambda d: write_adr(d, "0027-New_Thing.md"), "ADR filename must be"),
            (lambda d: write_adr(d, "0027-new.md", heading="# ADR-0028: new"), "does not match"),
            (lambda d: write_adr(d, "0027-new.md", heading="ADR 27"), "first line"),
            (lambda d: write_adr(d, "0027-new.md", status="Approved"), "unsupported ADR status"),
            (lambda d: write_adr(d, "0027-new.md", status="Superseded by ADR-0099"), "missing ADR-0099"),
            (lambda d: write_adr(d, "0027-new.md", date="2026-02-30"), "Date must be"),
            (lambda d: write_adr(d, "0027-new.md", body="See ADR-0042."), "references missing ADR-0042"),
            (
                lambda d: write_adr(d, "0027-new.md", body="See `adrs/0001-renamed.md`."),
                "missing ADR file adrs/0001-renamed.md",
            ),
            (lambda d: write_adr(d, "0005-collision.md"), "duplicate ADR number 0005"),
            (lambda d: write_adr(d, "0028-gap.md"), "missing 0027"),
            (lambda d: (d / "0018-second-decision.md").unlink(), "known duplicate but has 1 files"),
        )
        for index, (prepare, expected) in enumerate(cases):
            with self.subTest(case=index):
                errors = self.adr_errors(prepare)
                self.assertTrue(any(expected in error for error in errors), errors)

    def test_checks_task_references_and_done_merge_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            task_directory = root / "tasks"
            adr_directory = root / "adrs"
            task_directory.mkdir()
            adr_directory.mkdir()
            write_known_duplicates(adr_directory)
            good = write_task(task_directory, "BOB-001-good.md", statuses=("Done",))
            good.write_text(
                good.read_text(encoding="utf-8")
                + "\nSee `../adrs/0002-decision-2.md`, ADR-0003, `BOB-002-broken.md` and "
                "`docs/reviews/BOB-001-review-results.md`.\n\n## Log\n\n- Merged as `279b626`.\n",
                encoding="utf-8",
            )
            broken = write_task(task_directory, "BOB-002-broken.md", statuses=("Done",))
            broken.write_text(
                broken.read_text(encoding="utf-8")
                + "\nSee `../adrs/0002-old-name.md`, ADR-0099 and `BOB-003-missing.md`.\n"
                "\n## Log\n\n- Merged on 2026-11-13.\n",
                encoding="utf-8",
            )
            legacy = write_task(task_directory, "BOB-004-legacy.md", statuses=("Done",))
            self.assertIn("Done", legacy.read_text(encoding="utf-8"))

            errors = check_process_metadata(
                discover_tasks(task_directory, root), adr_directory, root
            )

            self.assertEqual(
                errors,
                [
                    "tasks/BOB-002-broken.md: references missing ADR-0099",
                    "tasks/BOB-002-broken.md: references missing ADR file adrs/0002-old-name.md",
                    "tasks/BOB-002-broken.md: references missing task file BOB-003-missing.md",
                    "tasks/BOB-002-broken.md: Done task's Log must cite the merge commit as a "
                    "backticked SHA",
                ],
            )


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

    def test_check_with_adrs_dir_reports_adr_errors(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            task_directory = root / "tasks"
            adr_directory = root / "adrs"
            task_directory.mkdir()
            adr_directory.mkdir()
            write_task(task_directory, "BOB-001-example.md")
            write_known_duplicates(adr_directory)

            valid = self.run_cli(
                "--tasks-dir", str(task_directory), "--adrs-dir", str(adr_directory), "check"
            )
            write_adr(adr_directory, "0027-new.md", status="Approved")
            invalid = self.run_cli(
                "--tasks-dir", str(task_directory), "--adrs-dir", str(adr_directory), "check"
            )

            self.assertEqual(valid.returncode, 0, valid.stderr)
            self.assertEqual(valid.stdout, "Validated 1 task files and 28 ADRs.\n")
            self.assertEqual(invalid.returncode, 1)
            self.assertIn("0027-new.md: unsupported ADR status 'Approved'", invalid.stderr)

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
