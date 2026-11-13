#!/usr/bin/env python3
"""Check Checklist A items 1-8 of the chapter extraction contract.

The command is read-only with respect to the repository: it never writes to the
repository or the canonical tree, makes no network access and no model call, and
has no skip flag. Its only writes are a disposable prior root inside the workspace
and, when requested, the JSON report at a path outside the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Any

SCRIPT_REPOSITORY = Path(__file__).resolve().parents[1]
SKILL_DIRECTORY = SCRIPT_REPOSITORY / ".codex" / "skills" / "extract-bobiverse-chapter"
HELPER = SKILL_DIRECTORY / "scripts" / "source_evidence.py"
PROFILE_RECORD = SKILL_DIRECTORY / "profile.json"
DEFAULT_APPROVED_CHAPTERS = "~/bobiverse-approved-chapters"
REQUIRED_NODE_VERSION = "22.23.1"
WORKSPACE_PARENT = Path("/tmp")
PRIOR_ROOT_NAME = "prior-root"
CHAPTER_RE = re.compile(r"^(?P<book>[1-9][0-9]*)\.(?P<chapter>[1-9][0-9]*)$")
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
UNCOVERED_ANCHOR_DIAGNOSTIC = (
    "Narrative anchors require a GCNS acquisition plan not covered by the pinned "
    "sources"
)
APPROVAL_FIELDS = (
    "chapter",
    "date",
    "label",
    "provider",
    "model",
    "workflow",
    "captain_approval_quote",
    "relaying_role",
)
FINGERPRINT_FIELDS = (
    "chapter",
    "source_file",
    "source_title",
    "source_sha256",
    "byte_length",
)
VALIDATOR_TIMEOUT_SECONDS = 900
HELPER_ERROR_MAX_CHARACTERS = 300
OUTPUT_TAIL_LINES = 20

K1_CAVEAT = (
    "Launcher presence and version do not prove that it can set the model, "
    "reasoning level and fork_turns: none for both passes; the run's own records "
    "attest the spawning settings (K1)."
)
PENDING_CAVEAT = (
    "The prior chain includes PENDING predecessors (candidates not yet promoted): "
    "{}. Re-run this preflight if any of them changes before promotion."
)
K5_CAVEAT = (
    "The approval file's format is checked, not its authenticity; it substitutes "
    "for item 1 only and never waives items 2-8 (K5)."
)

ITEM_HEADINGS = {
    1: ("Profile", ["§Prerequisite check", "§Approved alternative (NON-CONFORMING)"]),
    2: ("Source", ["§Inputs"]),
    3: ("Workspace", ["§Context isolation"]),
    4: ("Approved-chapters repository", ["§Checksum provenance"]),
    5: (
        "Repository",
        ["§Candidate assembly and temporary corpus", "§Checksum provenance"],
    ),
    6: ("Tooling", ["§Candidate assembly and temporary corpus"]),
    7: ("Prior chain", ["§Candidate assembly and temporary corpus"]),
    8: (
        "Validators",
        [
            "§Candidate assembly and temporary corpus",
            "§Astronomy preflight and isolated acquisition",
        ],
    ),
}

HELP_EPILOG = f"""
Checks Checklist A items 1-8 of docs/chapter-extraction-checklists.md and reports
each as pass or fail. There is no not-applicable result and no skip flag; any
failure exits 1. Item 9 (the isolation plan) stays manual. Run from inside the
checkout that contains this script; any other checkout is refused.

Item 1 runs "codex --version". It passes when the launcher is on PATH and reports a
version; that proves presence only, not that it can set the model, reasoning level
and fork_turns: none (K1). Alternatively, for a
NON-CONFORMING run, when --approval-file names a JSON object with the string fields
{", ".join(APPROVAL_FIELDS)}. "label" must be "NON-CONFORMING", "chapter" must be the
target and "date" must be YYYY-MM-DD. The approval covers item 1 only.

Item 7 builds the prior root with source_evidence.py prepare-corpus, using the
target's immediate canonical predecessor as the stand-in candidate. A zero-state
target (1.1), a missing predecessor and a book boundary (b.1 with b > 1) fail closed.
With --pending-predecessor (repeatable, in chapter order), the prior root is built
from the canonical chapters plus those not-yet-promoted candidates instead. They
must be files outside the repository, exactly the chapters after the latest
canonical one up to the target's predecessor, in order; the report marks the run
as based on PENDING predecessors.

Output carries only source fingerprint fields, never source bytes. The JSON report
goes to stdout, or to --report (outside the repository); a short summary goes to
stderr. Exit codes: 0 all items pass, 1 an item failed, 2 usage error.

Example:
  python3 scripts/extraction_preflight.py --chapter 1.43 \\
    --source "/path/outside/repo/1.43.txt" --workspace "$(mktemp -d)"
"""


class UsageError(ValueError):
    """An argument error that stops the command before any check runs."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def run(
    command: list[str], cwd: Path, timeout: int = 60
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        check=False,
    )


def git(cwd: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return run(["git", *arguments], cwd)


def tail(text: str) -> list[str]:
    lines = [line for line in text.splitlines() if line.strip()]
    return lines[-OUTPUT_TAIL_LINES:]


def helper_error(stderr: str, fallback: str) -> str:
    """Relay only the last line of helper error output, bounded in length."""
    lines = tail(stderr)
    if not lines:
        return fallback
    return lines[-1].strip().removeprefix("error: ")[:HELPER_ERROR_MAX_CHARACTERS]


def item(
    number: int, passed: bool, evidence: dict[str, Any], limits: list[str] | None = None
) -> dict[str, Any]:
    name, headings = ITEM_HEADINGS[number]
    return {
        "item": number,
        "name": name,
        "result": "pass" if passed else "fail",
        "evidence": evidence,
        "governing": headings,
        "limits": limits or [],
    }


def is_within(path: Path, parent: Path) -> bool:
    return path == parent or path.is_relative_to(parent)


def check_approval_file(path: Path, chapter: str) -> tuple[bool, dict[str, Any]]:
    evidence: dict[str, Any] = {"mode": "NON-CONFORMING", "approval_file": str(path)}
    try:
        evidence["approval_sha256"] = sha256_file(path)
        record = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
        evidence["problem"] = (
            f"approval file is not readable JSON: {type(error).__name__}"
        )
        return False, evidence
    problems = []
    if not isinstance(record, dict):
        problems.append("approval file must be a JSON object")
    else:
        for field in APPROVAL_FIELDS:
            value = record.get(field)
            if not isinstance(value, str) or not value.strip():
                problems.append(f"missing or empty field: {field}")
        label = record.get("label")
        if isinstance(label, str) and label.strip() and label != "NON-CONFORMING":
            problems.append('label must be "NON-CONFORMING"')
        if isinstance(record.get("chapter"), str) and record["chapter"] != chapter:
            problems.append(
                f"approval is for chapter {record['chapter']}, not {chapter}"
            )
        if isinstance(record.get("date"), str) and record["date"].strip():
            if not DATE_RE.fullmatch(record["date"]):
                problems.append("date must be YYYY-MM-DD")
            else:
                try:
                    date.fromisoformat(record["date"])
                except ValueError:
                    problems.append("date must be a valid calendar date")
        if not problems:
            for field in ("provider", "model", "workflow", "relaying_role"):
                evidence[field] = record[field]
            evidence["date"] = record["date"]
    if problems:
        evidence["problems"] = sorted(set(problems))
        return False, evidence
    return True, evidence


def check_profile(
    chapter: str, approval_file: Path | None, profile: dict[str, Any]
) -> dict[str, Any]:
    launcher_name = profile["launcher"]
    launcher = shutil.which(launcher_name)
    launcher_evidence: dict[str, Any] = {"launcher": launcher_name, "path": launcher}
    launcher_ok = False
    if launcher:
        try:
            result = run([launcher, "--version"], Path.cwd(), timeout=30)
            version = result.stdout.strip().splitlines()[:1]
            launcher_evidence["version"] = version[0] if version else None
            launcher_ok = result.returncode == 0 and bool(version)
        except (OSError, subprocess.TimeoutExpired) as error:
            launcher_evidence["problem"] = (
                f"launcher did not report a version: {type(error).__name__}"
            )
    if approval_file is not None:
        passed, evidence = check_approval_file(approval_file, chapter)
        evidence["launcher"] = launcher_evidence
        return item(1, passed, evidence, [K5_CAVEAT, K1_CAVEAT])
    evidence = {"mode": "conforming", **launcher_evidence}
    if not launcher_ok:
        evidence["problem"] = (
            f'"{launcher_name}" launcher is missing or reports no version; a run needs it '
            "or a recorded NON-CONFORMING approval (--approval-file)"
        )
    return item(1, launcher_ok, evidence, [K1_CAVEAT])


def check_source(source: Path, chapter: str, repository: Path) -> dict[str, Any]:
    resolved = source.expanduser().resolve()
    evidence: dict[str, Any] = {"source_file": source.name}
    if is_within(resolved, repository):
        evidence["problem"] = "source file must be outside the repository"
        return item(2, False, evidence)
    result = run(
        [
            sys.executable,
            str(HELPER),
            "metadata",
            "--source",
            str(resolved),
            "--chapter",
            chapter,
        ],
        repository,
    )
    if result.returncode != 0:
        # The helper's messages name the rule that failed; relay only their tail.
        evidence["problem"] = helper_error(result.stderr, "metadata failed")
        return item(2, False, evidence)
    metadata = json.loads(result.stdout)
    fingerprint = {field: metadata.get(field) for field in FINGERPRINT_FIELDS}
    return item(2, True, fingerprint)


def check_workspace(workspace: Path, repository: Path) -> dict[str, Any]:
    evidence: dict[str, Any] = {"workspace": str(workspace)}
    problems = []
    resolved = workspace.expanduser().resolve()
    evidence["resolved"] = str(resolved)
    if not resolved.exists():
        problems.append("does not exist")
    elif not resolved.is_dir():
        problems.append("is not a directory")
    else:
        if not os.access(resolved, os.W_OK | os.X_OK):
            problems.append("is not writable")
        if any(resolved.iterdir()):
            problems.append("is not empty")
    if is_within(resolved, repository):
        problems.append("is inside the repository")
    parent = WORKSPACE_PARENT.resolve()
    if resolved == parent or not is_within(resolved, parent):
        problems.append(f"does not resolve under {WORKSPACE_PARENT}")
    if problems:
        evidence["problems"] = problems
    return item(3, not problems, evidence)


def check_approved_chapters(path: Path) -> dict[str, Any]:
    resolved = path.expanduser().resolve()
    evidence: dict[str, Any] = {"path": str(resolved)}
    problems = []
    if not resolved.is_dir():
        problems.append("is not a directory")
    else:
        if not os.access(resolved, os.W_OK | os.X_OK):
            problems.append("is not writable")
        top = git(resolved, "rev-parse", "--show-toplevel")
        if top.returncode != 0 or Path(top.stdout.strip()).resolve() != resolved:
            problems.append("is not the top level of a git repository")
        else:
            remotes = git(resolved, "remote").stdout.split()
            evidence["remotes"] = remotes
            if remotes:
                problems.append("has a remote; it must have none")
    if problems:
        evidence["problems"] = problems
    return item(4, not problems, evidence)


def check_repository(repository: Path) -> tuple[dict[str, Any], str | None]:
    head = git(repository, "rev-parse", "HEAD")
    base = head.stdout.strip() if head.returncode == 0 else None
    status = git(repository, "status", "--porcelain=v1", "-z", "--untracked-files=all")
    entries = [entry for entry in status.stdout.split("\0") if entry]
    evidence: dict[str, Any] = {"base_revision": base, "dirty_entries": len(entries)}
    passed = base is not None and status.returncode == 0 and not entries
    if not passed:
        evidence["problem"] = (
            "worktree is not clean" if entries else "git status failed"
        )
    return item(5, passed, evidence), base


def run_validator(name: str, command: list[str], repository: Path) -> dict[str, Any]:
    try:
        result = run(command, repository, timeout=VALIDATOR_TIMEOUT_SECONDS)
    except (OSError, subprocess.TimeoutExpired) as error:
        return {
            "validator": name,
            "command": command,
            "exit_code": None,
            "problem": type(error).__name__,
        }
    output = f"{result.stdout}\n{result.stderr}"
    return {
        "validator": name,
        "command": command,
        "exit_code": result.returncode,
        "output_tail": tail(output),
        "_output": output,
    }


def narrative_command(repository: Path, root: Path | None) -> list[str]:
    command = [
        str(repository / "node_modules" / ".bin" / "tsx"),
        "scripts/narrative-cli.ts",
        "validate",
    ]
    if root is not None:
        command += ["--root", str(root)]
    return command


def data_command(repository: Path, root: Path) -> list[str]:
    return [
        str(repository / ".venv" / "bin" / "python"),
        "scripts/validate_data.py",
        "--narrative-root",
        str(root),
    ]


def strip_private(result: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in result.items() if not key.startswith("_")}


def check_tooling(repository: Path) -> dict[str, Any]:
    evidence: dict[str, Any] = {"required_node": REQUIRED_NODE_VERSION}
    problems = []
    try:
        node = run(["node", "--version"], repository, timeout=30)
        evidence["node_version"] = node.stdout.strip() or None
        if node.returncode != 0 or node.stdout.strip() != f"v{REQUIRED_NODE_VERSION}":
            problems.append(f"node --version must report v{REQUIRED_NODE_VERSION}")
    except (OSError, subprocess.TimeoutExpired):
        evidence["node_version"] = None
        problems.append("node is not on PATH")
    node_modules = (repository / "node_modules").is_dir()
    venv = (repository / ".venv" / "bin" / "python").exists()
    evidence["node_modules"] = node_modules
    evidence["venv"] = venv
    if not node_modules:
        problems.append("node_modules is missing")
    if not venv:
        problems.append(".venv is missing")
    if node_modules and not problems:
        validation = run_validator(
            "narrative:validate", narrative_command(repository, None), repository
        )
        evidence["narrative_validate"] = strip_private(validation)
        if validation["exit_code"] != 0:
            problems.append("npm run narrative:validate equivalent failed")
    else:
        evidence["narrative_validate"] = "not run: tooling incomplete"
    if problems:
        evidence["problems"] = problems
    return item(6, not problems, evidence)


def predecessor(chapter: str) -> tuple[str | None, str | None]:
    match = CHAPTER_RE.fullmatch(chapter)
    assert match is not None
    book, number = int(match["book"]), int(match["chapter"])
    if book == 1 and number == 1:
        return None, "cannot certify a zero-state prior chain"
    if number == 1:
        return None, (
            "cannot establish the predecessor across a book boundary: books.json "
            "records no chapter counts"
        )
    return f"{book}.{number - 1}", None


def read_pending(
    paths: list[Path], repository: Path
) -> tuple[list[dict[str, Any]], str | None]:
    """Fingerprint each pending candidate; never relay its contents."""
    entries: list[dict[str, Any]] = []
    for path in paths:
        resolved = path.expanduser().resolve()
        entry: dict[str, Any] = {"path": str(resolved)}
        entries.append(entry)
        if is_within(resolved, repository):
            return entries, f"pending predecessor {path} must be outside the repository"
        try:
            entry["sha256"] = sha256_file(resolved)
            record = json.loads(resolved.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as error:
            return entries, (
                f"pending predecessor {path} is not a readable JSON file: "
                f"{type(error).__name__}"
            )
        ref = record.get("chapter") if isinstance(record, dict) else None
        if not isinstance(ref, str) or not CHAPTER_RE.fullmatch(ref):
            return entries, f"pending predecessor {path} has no valid chapter field"
        entry["ref"] = ref
    return entries, None


def pending_problem(
    pending: list[dict[str, Any]], chapters: Path, previous: str
) -> str | None:
    book, number = previous.split(".")
    canonical = [
        int(path.stem) for path in chapters.glob("*.json") if path.stem.isdigit()
    ]
    if not canonical:
        return f"no canonical chapter in book {book} to build the pending chain on"
    latest = max(canonical)
    expected = [f"{book}.{n}" for n in range(latest + 1, int(number) + 1)]
    refs = [entry["ref"] for entry in pending]
    if refs != expected:
        return (
            f"pending predecessors must be exactly [{', '.join(expected)}] in order "
            f"after the latest canonical chapter {book}.{latest}; got [{', '.join(refs)}]"
        )
    return None


def check_prior_chain(
    chapter: str,
    repository: Path,
    workspace: Path,
    workspace_ok: bool,
    pending_paths: list[Path],
) -> tuple[dict[str, Any], Path | None]:
    previous, refusal = predecessor(chapter)
    evidence: dict[str, Any] = {"target": chapter, "predecessor": previous}
    if refusal:
        evidence["problem"] = refusal
        return item(7, False, evidence), None
    book, number = previous.split(".")
    chapters = repository / "data" / "narrative" / "chapters" / book
    pending: list[dict[str, Any]] = []
    if pending_paths:
        evidence["basis"] = "PENDING"
        pending, problem = read_pending(pending_paths, repository)
        evidence["pending_predecessors"] = pending
        problem = problem or pending_problem(pending, chapters, previous)
        if problem:
            evidence["problem"] = problem
            return item(7, False, evidence), None
        candidate, stand_in = Path(pending[0]["path"]), pending[0]["ref"]
        evidence["candidate"] = str(candidate)
    else:
        candidate, stand_in = chapters / f"{number}.json", previous
        evidence["candidate"] = candidate.relative_to(repository).as_posix()
        if not candidate.is_file():
            evidence["problem"] = (
                f"the immediate predecessor {previous} is not canonical; pass pending "
                "predecessors with --pending-predecessor (K7)"
            )
            return item(7, False, evidence), None
    if not workspace_ok:
        evidence["problem"] = "workspace check failed; the prior root was not built"
        return item(7, False, evidence), None
    root = workspace.expanduser().resolve() / PRIOR_ROOT_NAME
    result = run(
        [
            sys.executable,
            str(HELPER),
            "prepare-corpus",
            "--repository-root",
            str(repository),
            "--chapter",
            stand_in,
            "--candidate",
            str(candidate),
            "--output-root",
            str(root),
        ],
        repository,
    )
    if result.returncode != 0:
        evidence["problem"] = helper_error(result.stderr, "prepare-corpus failed")
        return item(7, False, evidence), None
    corpus = json.loads(result.stdout)
    provenance = corpus.get("provenance", {})
    for entry in pending[1:]:
        shutil.copyfile(
            entry["path"],
            root / "chapters" / book / f"{entry['ref'].split('.')[1]}.json",
        )
    stand_ins = [entry["ref"] for entry in pending] or [previous]
    evidence.update(
        {
            "prior_root": str(root),
            "chapters": [*corpus.get("prior_chapters", []), *stand_ins],
            "base_commit": provenance.get("base_commit"),
            "inputs_clean": provenance.get("inputs_clean"),
            "dirty_paths": provenance.get("dirty_paths"),
        }
    )
    if provenance.get("inputs_clean") is not True:
        evidence["problem"] = "provenance does not show inputs_clean: true"
        return item(7, False, evidence), root
    return item(7, True, evidence), root


def check_validators(
    repository: Path, root: Path | None, prior_ok: bool
) -> dict[str, Any]:
    if root is None or not prior_ok:
        return item(
            8,
            False,
            {"problem": "no certified prior root (item 7 failed); validators not run"},
        )
    narrative = run_validator(
        "narrative", narrative_command(repository, root), repository
    )
    astronomy = run_validator(
        "data:validate", data_command(repository, root), repository
    )
    evidence: dict[str, Any] = {"prior_root": str(root), "results": []}
    failure_classes = []
    if narrative["exit_code"] != 0:
        failure_classes.append("narrative")
    if astronomy["exit_code"] != 0:
        if UNCOVERED_ANCHOR_DIAGNOSTIC in astronomy.get("_output", ""):
            failure_classes.append("uncovered-anchor")
            evidence["see"] = "§Astronomy preflight and isolated acquisition"
        else:
            failure_classes.append("astronomy-baseline")
    evidence["results"] = [strip_private(narrative), strip_private(astronomy)]
    if failure_classes:
        evidence["failure_classes"] = failure_classes
    return item(8, not failure_classes, evidence)


def summary(report: dict[str, Any]) -> str:
    lines = [
        f"Extraction preflight for {report['target_chapter']}: {report['verdict'].upper()}"
    ]
    for entry in report["items"]:
        detail = entry["evidence"].get("problem") or "; ".join(
            entry["evidence"].get("problems", [])
            or entry["evidence"].get("failure_classes", [])
        )
        lines.append(
            f"  {entry['item']}. {entry['name']}: {entry['result']}"
            + (f" ({detail})" if detail and entry["result"] == "fail" else "")
        )
    lines.append("  9. Isolation plan: manual, not checked by this command")
    for limit in report["limits"]:
        lines.append(f"  Note: {limit}")
    return "\n".join(lines) + "\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Check Checklist A items 1-8 before any model reads source text.",
        epilog=HELP_EPILOG,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--chapter", required=True, help='target chapter, "book.chapter"'
    )
    parser.add_argument(
        "--source", type=Path, required=True, help="source file outside the repository"
    )
    parser.add_argument(
        "--workspace",
        type=Path,
        required=True,
        help="new empty mktemp -d directory under /tmp",
    )
    parser.add_argument(
        "--approved-chapters",
        type=Path,
        default=Path(DEFAULT_APPROVED_CHAPTERS),
        help=f"approved-chapters repository (default: {DEFAULT_APPROVED_CHAPTERS})",
    )
    parser.add_argument(
        "--approval-file",
        type=Path,
        help="NON-CONFORMING approval record (item 1 only)",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="write the JSON report here (outside the repository)",
    )
    parser.add_argument(
        "--pending-predecessor",
        type=Path,
        action="append",
        default=[],
        metavar="CANDIDATE",
        help="not-yet-promoted predecessor candidate outside the repository; "
        "repeat in chapter order",
    )
    return parser


def repository_root() -> Path:
    result = git(Path.cwd(), "rev-parse", "--show-toplevel")
    if result.returncode != 0:
        raise UsageError(
            "the working directory is not inside a git checkout; run from the "
            "repository root"
        )
    repository = Path(result.stdout.strip()).resolve()
    if repository != SCRIPT_REPOSITORY:
        raise UsageError(
            f"the working directory's checkout ({repository}) is not this script's "
            f"checkout ({SCRIPT_REPOSITORY}); run the script from its own checkout"
        )
    return repository


def main() -> int:
    parser = build_parser()
    arguments = parser.parse_args()
    try:
        if not CHAPTER_RE.fullmatch(arguments.chapter):
            raise UsageError(
                f'chapter must use positive "book.chapter" form, got {arguments.chapter!r}'
            )
        repository = repository_root()
        report_path = (
            arguments.report.expanduser().resolve() if arguments.report else None
        )
        if report_path is not None:
            if is_within(report_path, repository):
                raise UsageError("--report must be outside the repository")
            if report_path.exists():
                raise UsageError("--report already exists; choose a new path")
            if not report_path.parent.is_dir():
                raise UsageError("--report parent directory does not exist")
    except UsageError as error:
        parser.exit(2, f"error: {error}\n")

    profile = json.loads(PROFILE_RECORD.read_text(encoding="utf-8"))
    items = [check_profile(arguments.chapter, arguments.approval_file, profile)]
    items.append(check_source(arguments.source, arguments.chapter, repository))
    workspace_item = check_workspace(arguments.workspace, repository)
    items.append(workspace_item)
    items.append(check_approved_chapters(arguments.approved_chapters))
    repository_item, base = check_repository(repository)
    items.append(repository_item)
    items.append(check_tooling(repository))
    prior_item, root = check_prior_chain(
        arguments.chapter,
        repository,
        arguments.workspace,
        workspace_item["result"] == "pass",
        arguments.pending_predecessor,
    )
    items.append(prior_item)
    items.append(check_validators(repository, root, prior_item["result"] == "pass"))

    verdict = "pass" if all(entry["result"] == "pass" for entry in items) else "fail"
    report = {
        "format_version": 1,
        "tool": "scripts/extraction_preflight.py",
        "target_chapter": arguments.chapter,
        "base_revision": base,
        "profile_record": {
            "path": PROFILE_RECORD.relative_to(SCRIPT_REPOSITORY).as_posix(),
            "sha256": sha256_file(PROFILE_RECORD),
            "schema_version": profile.get("schema_version"),
            "decision": profile.get("decision"),
        },
        "verdict": verdict,
        "items": items,
        "manual_items": [
            {
                "item": 9,
                "name": "Isolation plan",
                "governing": ["§Context isolation"],
                "note": "Manual; not checked by this command.",
            }
        ],
        "limits": [K1_CAVEAT, *([K5_CAVEAT] if arguments.approval_file else [])],
    }
    if arguments.pending_predecessor:
        pending = prior_item["evidence"].get("pending_predecessors", [])
        report["prior_chain_basis"] = "PENDING"
        report["pending_predecessors"] = pending
        refs = ", ".join(entry.get("ref", entry["path"]) for entry in pending)
        report["limits"].append(PENDING_CAVEAT.format(refs))
    serialized = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if report_path is None:
        sys.stdout.write(serialized)
    else:
        report_path.write_text(serialized, encoding="utf-8")
    sys.stderr.write(summary(report))
    return 0 if verdict == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
