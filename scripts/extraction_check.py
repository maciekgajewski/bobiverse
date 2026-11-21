#!/usr/bin/env python3
"""Build a local review branch for a chapter candidate set and run the checks.

The Extractor uses this instead of assembling and checking a final branch by
hand. It copies candidate files byte-for-byte, commits once on a new local
branch, never pushes, and never writes into the main checkout. Logs and
summary.txt go to an output directory outside the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

REQUIRED_NODE_VERSION = "22.23.1"
NODE_BIN = Path.home() / ".nvm" / "versions" / "node" / f"v{REQUIRED_NODE_VERSION}" / "bin"
CHAPTER_FILE_RE = re.compile(r"^(?P<book>[1-9][0-9]*)\.(?P<number>[1-9][0-9]*)\.json$")
ERROR_LINE_RE = re.compile(
    r"(error|fail|traceback|exception|✖|FAILED|AssertionError|fatal|refused|ERROR)",
    re.IGNORECASE,
)
EXCERPT_LIMIT = 20
LINE_CHAR_LIMIT = 300
COMMAND_TIMEOUT_SECONDS = 1800
EXCEPTIONS_RELATIVE = Path("data/narrative/sentence-preservation-exceptions.json")
NPM_CHECKS = (
    "narrative:manifest",
    "narrative:validate",
    "format:check",
    "data:validate",
    "lint",
    "typecheck",
    "data:test",
    "build",
    "test",
)


class UsageError(Exception):
    """Invalid arguments or setup; the command should exit 2."""


class Step:
    def __init__(self, name: str, log_name: str) -> None:
        self.name = name
        self.log_name = log_name
        self.rc = 0
        self.excerpt: list[str] = []


@dataclass(frozen=True)
class Candidate:
    chapter: str
    source: Path
    relative_dest: Path

    @property
    def book_and_number(self) -> tuple[int, int]:
        book, number = self.chapter.split(".")
        return int(book), int(number)


@dataclass
class InstallResult:
    candidates: list[tuple[Candidate, str]]
    exceptions_sha256: str | None
    head: str
    branch: str
    base: str
    worktree: Path


@dataclass
class CheckRun:
    steps: list[Step] = field(default_factory=list)
    node: str = ""
    start: str = ""
    end: str = ""

    @property
    def failed(self) -> bool:
        return any(step.rc != 0 for step in self.steps)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def utc_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def parse_candidate_name(name: str) -> Candidate:
    match = CHAPTER_FILE_RE.match(name)
    if not match:
        raise UsageError(f"candidate file must be named B.N.json, got {name!r}")
    book = match.group("book")
    number = match.group("number")
    return Candidate(
        chapter=f"{book}.{number}",
        source=Path(name),
        relative_dest=Path("data/narrative/chapters") / book / f"{number}.json",
    )


def list_candidates(candidates_dir: Path) -> list[Candidate]:
    if not candidates_dir.is_dir():
        raise UsageError(f"candidates directory is not a directory: {candidates_dir}")
    found: list[Candidate] = []
    for path in sorted(candidates_dir.iterdir()):
        if not path.is_file() or path.suffix != ".json":
            continue
        candidate = parse_candidate_name(path.name)
        found.append(
            Candidate(candidate.chapter, path.resolve(), candidate.relative_dest)
        )
    if not found:
        raise UsageError(f"no B.N.json candidates in {candidates_dir}")
    found.sort(key=lambda item: item.book_and_number)
    return found


def find_source_file(source_dir: Path, chapter: str) -> Path:
    prefix = f"{chapter} - "
    matches = [
        path
        for path in source_dir.iterdir()
        if path.is_file() and path.name.startswith(prefix)
    ]
    if len(matches) != 1:
        raise UsageError(
            f"expected exactly one source file for {chapter} in {source_dir}"
        )
    return matches[0]


def find_approval_file(approval_dir: Path, chapter: str) -> Path:
    path = approval_dir / f"approval-{chapter}.json"
    if not path.is_file():
        raise UsageError(f"missing approval file: {path}")
    return path


def resolve_existing(path: Path, kind: str) -> Path:
    if not path.exists():
        raise UsageError(f"{kind} does not exist: {path}")
    return path.resolve()


def is_inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
    except ValueError:
        return False
    return True


def refuse_inside_repo(path: Path, repo: Path, kind: str) -> Path:
    resolved = path.resolve()
    if is_inside(resolved, repo):
        raise UsageError(f"{kind} must be outside the repository: {resolved}")
    return resolved


def excerpt_failure(text: str, limit: int = EXCERPT_LIMIT) -> list[str]:
    """Return the first relevant lines of a failed step's log, preferring errors."""
    lines = text.splitlines()
    errors = [trim_line(line) for line in lines if ERROR_LINE_RE.search(line)]
    if errors:
        return errors[:limit]
    useful = [trim_line(line) for line in lines if line.strip()]
    return useful[:limit]


def trim_line(line: str) -> str:
    if len(line) <= LINE_CHAR_LIMIT:
        return line
    return line[: LINE_CHAR_LIMIT - 3] + "..."


def copy_bytes(source: Path, destination: Path) -> str:
    data = source.read_bytes()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    written = destination.read_bytes()
    if written != data:
        raise RuntimeError(f"byte copy mismatch for {destination}")
    return sha256_bytes(data)


def command_env() -> dict[str, str]:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    if NODE_BIN.is_dir():
        env["PATH"] = f"{NODE_BIN}{os.pathsep}{env.get('PATH', '')}"
    return env


def run_git(repo: Path, args: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        ["git", *args],
        cwd=repo,
        check=False,
        capture_output=True,
        text=True,
        env=command_env(),
    )
    if check and result.returncode != 0:
        detail = (result.stderr or result.stdout).strip() or f"exit {result.returncode}"
        raise RuntimeError(f"git {' '.join(args)} failed: {detail}")
    return result


def worktree_changes(worktree: Path) -> str:
    result = run_git(worktree, ["status", "--porcelain"], check=True)
    return result.stdout


def symlink_tooling(worktree: Path, tooling_root: Path) -> None:
    for name in ("node_modules", ".venv"):
        target = (tooling_root / name).resolve()
        if not target.exists():
            raise UsageError(f"missing {name} at {target}")
        link = worktree / name
        if link.exists() or link.is_symlink():
            continue
        link.symlink_to(target)


def create_worktree(repo: Path, worktree: Path, branch: str, base: str) -> None:
    if branch in {"master", "main"}:
        raise UsageError(f"refusing to use protected branch name {branch!r}")
    if worktree.exists():
        raise UsageError(f"worktree path already exists: {worktree}")
    existing = run_git(repo, ["show-ref", "--verify", "--quiet", f"refs/heads/{branch}"], check=False)
    if existing.returncode == 0:
        raise UsageError(f"branch already exists: {branch}")
    worktree.parent.mkdir(parents=True, exist_ok=True)
    run_git(repo, ["worktree", "add", "-b", branch, str(worktree), base])


def remove_worktree(repo: Path, worktree: Path) -> None:
    if not worktree.exists():
        return
    result = run_git(repo, ["worktree", "remove", "--force", str(worktree)], check=False)
    if result.returncode != 0 and worktree.exists():
        shutil.rmtree(worktree)
        run_git(repo, ["worktree", "prune"], check=False)


def build_review_branch(
    repo: Path,
    worktree: Path,
    branch: str,
    base: str,
    candidates: list[Candidate],
    exceptions_file: Path | None,
    tooling_root: Path | None = None,
) -> InstallResult:
    create_worktree(repo, worktree, branch, base)
    symlink_tooling(worktree, tooling_root or repo)
    installed: list[tuple[Candidate, str]] = []
    paths: list[str] = []
    for candidate in candidates:
        dest = worktree / candidate.relative_dest
        digest = copy_bytes(candidate.source, dest)
        installed.append((candidate, digest))
        paths.append(str(candidate.relative_dest))
    exceptions_sha: str | None = None
    if exceptions_file is not None:
        exceptions_sha = copy_bytes(exceptions_file, worktree / EXCEPTIONS_RELATIVE)
        paths.append(str(EXCEPTIONS_RELATIVE))
    base_sha = run_git(worktree, ["rev-parse", "--verify", base]).stdout.strip()
    run_git(worktree, ["add", "--", *paths])
    chapters = ", ".join(candidate.chapter for candidate, _ in installed)
    message = (
        f"check: candidate set {chapters} (local only, never push)\n\n"
        "Built by scripts/extraction_check.py as a review artefact. Do not push."
    )
    run_git(worktree, ["commit", "-m", message])
    head = run_git(worktree, ["rev-parse", "HEAD"]).stdout.strip()
    if head == base_sha:
        raise RuntimeError("review commit did not advance HEAD")
    return InstallResult(
        candidates=installed,
        exceptions_sha256=exceptions_sha,
        head=head,
        branch=branch,
        base=base_sha,
        worktree=worktree,
    )


def run_logged(
    command: list[str],
    cwd: Path,
    log_path: Path,
    *,
    timeout: int = COMMAND_TIMEOUT_SECONDS,
) -> int:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("w", encoding="utf-8") as log_file:
        try:
            result = subprocess.run(
                command,
                cwd=cwd,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                env=command_env(),
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired:
            log_file.write(f"\ntimeout after {timeout}s\n")
            return 1
    return result.returncode


def python_bin(worktree: Path) -> str:
    candidate = worktree / ".venv" / "bin" / "python"
    if candidate.exists():
        return str(candidate)
    return "python3"


def record_step(step: Step, log_path: Path) -> Step:
    if step.rc != 0:
        text = log_path.read_text(encoding="utf-8", errors="replace") if log_path.exists() else ""
        step.excerpt = excerpt_failure(text)
    return step


def run_repo_checks(worktree: Path, out: Path, base: str) -> list[Step]:
    steps: list[Step] = []
    for name in NPM_CHECKS:
        step = Step(name, f"{name}.log")
        log_path = out / step.log_name
        step.rc = run_logged(["npm", "run", "-s", name], worktree, log_path)
        steps.append(record_step(step, log_path))

    generate = Step("data:generate", "data:generate.log")
    generate_log = out / generate.log_name
    generate.rc = run_logged(["npm", "run", "-s", "data:generate"], worktree, generate_log)
    if generate.rc == 0:
        changes = worktree_changes(worktree)
        if changes.strip():
            with generate_log.open("a", encoding="utf-8") as log_file:
                log_file.write("\n// data:generate left a git diff:\n")
                log_file.write(changes)
            generate.rc = 1
    steps.append(record_step(generate, generate_log))

    worktree_diff = Step("git-diff-check", "diff-check.log")
    worktree_log = out / worktree_diff.log_name
    worktree_diff.rc = run_logged(["git", "diff", "--check"], worktree, worktree_log)
    steps.append(record_step(worktree_diff, worktree_log))

    range_diff = Step("git-diff-check-range", "diff-check-range.log")
    range_log = out / range_diff.log_name
    range_diff.rc = run_logged(
        ["git", "diff", "--check", f"{base}..HEAD"], worktree, range_log
    )
    steps.append(record_step(range_diff, range_log))

    tasks = Step("tasks", "tasks.log")
    tasks_log = out / tasks.log_name
    tasks.rc = run_logged([python_bin(worktree), "scripts/tasks.py", "check"], worktree, tasks_log)
    steps.append(record_step(tasks, tasks_log))
    return steps


def run_preflights(
    worktree: Path,
    out: Path,
    candidates: list[Candidate],
    source_dir: Path,
    approval_dir: Path,
) -> list[Step]:
    steps: list[Step] = []
    script = worktree / "scripts" / "extraction_preflight.py"
    for candidate in candidates:
        step = Step(f"preflight:{candidate.chapter}", f"preflight-{candidate.chapter}.log")
        log_path = out / step.log_name
        report = out / f"preflight-report-{candidate.chapter}.json"
        workspace = Path(
            subprocess.check_output(
                ["mktemp", "-d", f"/tmp/bobiverse-{candidate.chapter}-check-XXXXXX"],
                text=True,
            ).strip()
        )
        try:
            source = find_source_file(source_dir, candidate.chapter)
            approval = find_approval_file(approval_dir, candidate.chapter)
            command = [
                python_bin(worktree),
                str(script),
                "--chapter",
                candidate.chapter,
                "--source",
                str(source),
                "--workspace",
                str(workspace),
                "--approval-file",
                str(approval),
                "--report",
                str(report),
            ]
            step.rc = run_logged(command, worktree, log_path)
        except UsageError as error:
            log_path.write_text(f"{error}\n", encoding="utf-8")
            step.rc = 2
        finally:
            shutil.rmtree(workspace, ignore_errors=True)
        steps.append(record_step(step, log_path))
    return steps


def format_summary(
    install: InstallResult,
    run: CheckRun,
    out: Path,
    cleaned: bool,
) -> str:
    lines = [
        f"head={install.head} base={install.base} branch={install.branch} "
        f"node={run.node} start={run.start}",
        "installed:",
    ]
    for candidate, digest in install.candidates:
        lines.append(f"  {candidate.chapter} sha256={digest} -> {candidate.relative_dest}")
    if install.exceptions_sha256:
        lines.append(f"exceptions sha256={install.exceptions_sha256} -> {EXCEPTIONS_RELATIVE}")
    for step in run.steps:
        lines.append(f"{step.name} rc={step.rc}")
        if step.rc != 0:
            if step.excerpt:
                for excerpt_line in step.excerpt:
                    lines.append(f"  {excerpt_line}")
            else:
                lines.append("  (no log output)")
            lines.append(f"  log: {out / step.log_name}")
    lines.append(f"end={run.end}")
    lines.append("result=" + ("FAIL" if run.failed else "PASS"))
    lines.append(f"logs: {out}")
    lines.append(
        "worktree: removed; branch kept"
        if cleaned
        else f"worktree: {install.worktree}"
    )
    return "\n".join(lines) + "\n"


def node_version() -> str:
    try:
        result = subprocess.run(
            ["node", "-v"],
            check=False,
            capture_output=True,
            text=True,
            env=command_env(),
        )
    except FileNotFoundError:
        return "missing"
    return (result.stdout or result.stderr).strip() or "unknown"


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build a local review branch from a directory of B.N.json chapter "
            "candidates, run repository checks and per-chapter preflights, and "
            "write a stand-alone summary outside the repository. Never pushes."
        )
    )
    parser.add_argument("--candidates-dir", type=Path, required=True)
    parser.add_argument("--exceptions-file", type=Path)
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--approval-dir", type=Path, required=True)
    parser.add_argument("--base", default="origin/master")
    parser.add_argument(
        "--repo",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="git checkout used to add the temporary worktree (default: this repository)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        help="output directory outside the repository (default: ~/extraction-checks/<timestamp>)",
    )
    parser.add_argument(
        "--branch",
        help="local branch to create (default: check/<timestamp>)",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="remove the temporary worktree but keep the local branch and logs",
    )
    parser.add_argument(
        "--tooling-root",
        type=Path,
        help="checkout that has node_modules and .venv (default: --repo)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    try:
        args = parse_args(argv)
        repo = resolve_existing(args.repo, "repository").resolve()
        if not (repo / ".git").exists() and not (repo / ".git").is_file():
            # worktrees have a .git file; a main checkout has a directory
            raise UsageError(f"not a git checkout: {repo}")
        run_git(repo, ["rev-parse", "--verify", args.base])
        candidates_dir = refuse_inside_repo(
            resolve_existing(args.candidates_dir, "candidates directory"),
            repo,
            "candidates directory",
        )
        source_dir = refuse_inside_repo(
            resolve_existing(args.source_dir, "source directory"),
            repo,
            "source directory",
        )
        approval_dir = refuse_inside_repo(
            resolve_existing(args.approval_dir, "approval directory"),
            repo,
            "approval directory",
        )
        exceptions_file = None
        if args.exceptions_file is not None:
            exceptions_file = refuse_inside_repo(
                resolve_existing(args.exceptions_file, "exceptions file"),
                repo,
                "exceptions file",
            )
        stamp = utc_stamp()
        out = args.out or (Path.home() / "extraction-checks" / stamp)
        out = refuse_inside_repo(out, repo, "output directory")
        out.mkdir(parents=True, exist_ok=True)
        branch = args.branch or f"check/{stamp}"
        worktree = out / "worktree"
        candidates = list_candidates(candidates_dir)
        # Resolve source and approval paths now so a missing input is a usage error
        # before the branch is created.
        for candidate in candidates:
            find_source_file(source_dir, candidate.chapter)
            find_approval_file(approval_dir, candidate.chapter)
        tooling_root = (args.tooling_root or repo).resolve()
        install: InstallResult | None = None
        run: CheckRun | None = None
        summary = ""
        try:
            install = build_review_branch(
                repo,
                worktree,
                branch,
                args.base,
                candidates,
                exceptions_file,
                tooling_root=tooling_root,
            )
            run = CheckRun(node=node_version(), start=utc_now())
            run.steps.extend(run_repo_checks(worktree, out, install.base))
            run.steps.extend(
                run_preflights(worktree, out, candidates, source_dir, approval_dir)
            )
            run.end = utc_now()
            run.end = run.end or utc_now()
            status = run_git(worktree, ["status", "--short"], check=False).stdout
            (out / "git-status-after.txt").write_text(status, encoding="utf-8")
            summary = format_summary(install, run, out, cleaned=False)
            (out / "summary.txt").write_text(summary, encoding="utf-8")
        finally:
            if args.cleanup and install is not None:
                remove_worktree(repo, worktree)
                if run is not None:
                    summary = format_summary(install, run, out, cleaned=True)
                    (out / "summary.txt").write_text(summary, encoding="utf-8")
        if install is None or run is None:
            return 2
        print(summary, end="")
        return 1 if run.failed else 0
    except UsageError as error:
        print(f"usage error: {error}", file=sys.stderr)
        return 2
    except Exception as error:  # noqa: BLE001 — surface unexpected setup failures as exit 2
        print(f"setup error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
