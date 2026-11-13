#!/usr/bin/env python3
"""Record, promote and verify approved chapters via the approved-chapters repo.

record  commit an approved run's allowlisted outputs to the approved-chapters
        repository and create an annotated tag chapter-<ref>-approved.
promote write the tagged candidate canonically and run the post-write validation;
        any failure restores the previous bytes. It prints the provenance the
        data-only PR body records; the promotion log is frozen history.
verify  check that each tagged chapter is value-identical to its canonical file.

Exit codes: 0 success, 1 refused or failed with nothing changed, 2 usage error,
3 a rollback could not be confirmed (the message names what is left).
No network access and no model call. Book text never enters the record.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
from pathlib import Path

REPOSITORY = Path(__file__).resolve().parents[1]
HELPER = (
    REPOSITORY / ".codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py"
)
LOG = REPOSITORY / "docs" / "chapter-promotion-log.md"
DEFAULT_REPO = "~/bobiverse-approved-chapters"
CHAPTER_RE = re.compile(r"^([1-9][0-9]*)\.([1-9][0-9]*)$")
REQUIRED = {
    "candidate.json",
    "narrative-validation.log",
    "narrative-validation.exit",
    "astronomy-validation.log",
    "astronomy-validation.exit",
}
OPTIONAL = {
    "projection.log",
    "projection.exit",
    "provenance.json",
    "preflight-report.json",
    "canonical.diff",
}
APPROVAL_FIELDS = ("chapter", "date", "captain_approval_quote", "relaying_role")
ACQUISITION = "§Astronomy preflight and isolated acquisition"


class Refusal(Exception):
    """Stop with nothing changed (exit 1)."""


class Unconfirmed(Exception):
    """A rollback could not be confirmed (exit 3)."""


def run(command: list[str], cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, capture_output=True, text=True)


def git(cwd: Path, *args: str) -> str:
    result = run(["git", *args], cwd)
    if result.returncode != 0:
        raise Refusal(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def tag_name(chapter: str) -> str:
    return f"chapter-{chapter}-approved"


def within(path: Path, parent: Path) -> bool:
    return path == parent or path.is_relative_to(parent)


def check_workspace(workspace: Path, repo: Path) -> Path:
    if workspace.expanduser().is_symlink():
        raise Refusal("workspace must not be a symlink")
    resolved = workspace.expanduser().resolve()
    tmp = Path("/tmp").resolve()
    if not resolved.is_dir() or resolved == tmp or not within(resolved, tmp):
        raise Refusal("workspace must be an existing directory under /tmp")
    if within(resolved, REPOSITORY) or within(resolved, repo):
        raise Refusal("workspace must be outside both repositories")
    return resolved


def check_repo(path: Path) -> Path:
    repo = path.expanduser().resolve()
    if not repo.is_dir() or Path(git(repo, "rev-parse", "--show-toplevel")) != repo:
        raise Refusal(f"{repo} is not the top level of a git repository")
    if git(repo, "remote"):
        raise Refusal("the approved-chapters repository must have no remote")
    if git(repo, "status", "--porcelain"):
        raise Refusal("the approved-chapters repository is not clean")
    return repo


def chapter_path(chapter: str) -> Path:
    book, number = CHAPTER_RE.fullmatch(chapter).groups()  # type: ignore[union-attr]
    return REPOSITORY / "data" / "narrative" / "chapters" / book / f"{number}.json"


def read_regular(path: Path) -> bytes:
    """Read a regular, singly linked file without following a symlink."""
    try:
        descriptor = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except OSError:
        raise Refusal(
            f"{path.name} is not a regular file (symlink or unreadable)"
        ) from None
    with os.fdopen(descriptor, "rb") as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise Refusal(f"{path.name} is not a regular, singly linked file")
        return handle.read()


def load_json(data: bytes, label: str) -> object:
    try:
        return json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise Refusal(f"{label} is not readable JSON") from None


def record(args: argparse.Namespace) -> None:
    repo = check_repo(args.repo)
    workspace = check_workspace(args.workspace, repo)
    tag, target = tag_name(args.chapter), repo / "chapters" / args.chapter
    if git(repo, "tag", "--list", tag) or target.exists():
        raise Refusal(f"{tag} or chapters/{args.chapter}/ already exists")
    names = {entry.name for entry in workspace.iterdir()}
    if names - REQUIRED - OPTIONAL:
        raise Refusal(f"not on the allowlist: {sorted(names - REQUIRED - OPTIONAL)}")
    if REQUIRED - names:
        raise Refusal(f"missing required files: {sorted(REQUIRED - names)}")
    for name in names:
        if not stat.S_ISREG(os.lstat(workspace / name).st_mode):
            raise Refusal(f"{name} is not a regular file (symlink, directory or FIFO)")
    # Read every file once, without following symlinks, and write those bytes.
    contents = {name: read_regular(workspace / name) for name in names}
    approval_bytes = read_regular(args.approval)
    candidate = load_json(contents["candidate.json"], "candidate.json")
    if not isinstance(candidate, dict) or candidate.get("chapter") != args.chapter:
        raise Refusal(f"candidate.json is not chapter {args.chapter}")
    approval = load_json(approval_bytes, "approval file")
    missing = [
        field
        for field in APPROVAL_FIELDS
        if not isinstance(approval, dict) or not str(approval.get(field, "")).strip()
    ]
    if missing or approval.get("chapter") != args.chapter:  # type: ignore[union-attr]
        raise Refusal(f"approval file is incomplete or for another chapter: {missing}")

    start = git(repo, "rev-parse", "HEAD")
    try:
        target.mkdir(parents=True)
        for name, data in {**contents, "APPROVAL.json": approval_bytes}.items():
            (target / name).write_bytes(data)
        git(repo, "add", "--", f"chapters/{args.chapter}")
        git(repo, "commit", "-q", "-m", f"chapter {args.chapter}: approved")
        git(repo, "tag", "-a", tag, "-m", f"chapter {args.chapter} approved")
    except (Refusal, OSError) as error:
        run(["git", "tag", "-d", tag], repo)
        run(["git", "reset", "-q", "--hard", start], repo)
        shutil.rmtree(target, ignore_errors=True)
        clean = (
            git(repo, "rev-parse", "HEAD") == start
            and not git(repo, "tag", "--list", tag)
            and not git(repo, "status", "--porcelain")
            and not target.exists()
        )
        if not clean:
            raise Unconfirmed(f"record rollback unconfirmed in {repo}: {error}")
        raise Refusal(f"record failed and was rolled back: {error}") from None
    print(
        f"Recorded {args.chapter} as {tag} ({git(repo, 'rev-parse', '--short', tag)})."
    )


def npm(*args: str) -> subprocess.CompletedProcess[str]:
    return run(["npm", *args], REPOSITORY)


def post_write_commands(chapter: str, workspace: Path) -> list[list[str]]:
    world = str(workspace / f"world-{chapter}.json")
    return [
        ["run", "-s", "narrative:manifest"],
        ["run", "-s", "narrative:validate"],
        ["run", "-s", "data:validate"],
        [
            "run",
            "-s",
            "narrative:generate",
            "--",
            "--chapter",
            chapter,
            "--output",
            world,
        ],
        ["run", "-s", "format:check"],
        ["run", "-s", "lint"],
        ["run", "-s", "typecheck"],
    ]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def provenance(
    chapter: str,
    approved: bytes,
    canonical: bytes,
    decisions: str,
    ref: str,
    label: str,
) -> str:
    """Summarise what the data-only PR body records (no book text)."""
    lines = [
        f"Chapter: {chapter}",
        f"Canonical SHA-256: {sha256(canonical)}",
        f"Approved-chapters: {ref}",
        f"Decisions: {decisions.strip()}",
    ]
    if approved != canonical:
        lines.insert(2, f"Approved candidate SHA-256: {sha256(approved)}")
    if label:
        lines.append(f"Label: {label}")
    return "\n".join(lines)


def promote(args: argparse.Namespace) -> None:
    repo = check_repo(args.repo)
    workspace = check_workspace(args.workspace, repo)
    if any(workspace.iterdir()):
        raise Refusal("workspace must be empty")
    if git(REPOSITORY, "status", "--porcelain"):
        raise Refusal("the bobiverse worktree is not clean")
    tag = tag_name(args.chapter)
    candidate_bytes = git(repo, "show", f"{tag}:chapters/{args.chapter}/candidate.json")
    approval = json.loads(
        git(repo, "show", f"{tag}:chapters/{args.chapter}/APPROVAL.json")
    )
    candidate = workspace / "candidate.json"
    candidate.write_text(candidate_bytes + "\n", encoding="utf-8")
    root = workspace / "root"
    prepared = run(
        [
            sys.executable,
            str(HELPER),
            "prepare-corpus",
            "--repository-root",
            str(REPOSITORY),
            "--chapter",
            args.chapter,
            "--candidate",
            str(candidate),
            "--output-root",
            str(root),
        ],
        REPOSITORY,
    )
    if prepared.returncode != 0:
        raise Refusal(f"prepare-corpus failed: {prepared.stderr.strip()[-300:]}")
    if npm("run", "-s", "narrative:validate", "--", "--root", str(root)).returncode:
        raise Refusal("narrative validation of the candidate root failed")
    if npm(
        "run", "-s", "data:validate", "--", "--narrative-root", str(root)
    ).returncode:
        raise Refusal(
            f"astronomy validation failed; resolve it manually under {ACQUISITION}"
        )

    target = chapter_path(args.chapter)
    saved = {target: target.read_bytes() if target.exists() else None}
    backups = workspace / "saved"
    backups.mkdir()
    for path, content in saved.items():
        if content is not None:
            (backups / path.name).write_bytes(content)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(candidate, target)
        if npm("exec", "--no", "--", "prettier", "--write", str(target)).returncode:
            raise Refusal("prettier failed")
        if json.loads(target.read_text(encoding="utf-8")) != json.loads(
            candidate_bytes
        ):
            raise Refusal(
                "the formatted chapter is not value-identical to the candidate"
            )
        label = "NON-CONFORMING" if approval.get("label") == "NON-CONFORMING" else ""
        commit = git(repo, "rev-list", "-n", "1", tag)
        ref = f"commit {commit}, tag {tag}"
        summary = provenance(
            args.chapter,
            candidate.read_bytes(),
            target.read_bytes(),
            args.decisions,
            ref,
            label,
        )
        for command in post_write_commands(args.chapter, workspace):
            if npm(*command).returncode:
                raise Refusal(f"post-write command failed: npm {' '.join(command)}")
        if run(["git", "diff", "--check"], REPOSITORY).returncode:
            raise Refusal("git diff --check failed")
    except (Refusal, OSError) as error:
        for path, content in saved.items():
            try:
                if content is None:
                    path.unlink(missing_ok=True)
                else:
                    path.write_bytes(content)
            except OSError:
                pass
        npm("run", "-s", "narrative:manifest")
        restored = all(
            (path.read_bytes() if path.exists() else None) == content
            for path, content in saved.items()
        )
        if not restored:
            raise Unconfirmed(
                f"restore unconfirmed for {target}; its previous bytes are in "
                f"{backups} (no copy there means it did not exist before): {error}"
            )
        raise Refusal(f"promotion failed and was restored: {error}") from None
    print(f"Promoted {args.chapter} from {tag}; review the diff and open the PR.")
    print(summary)


def verify(args: argparse.Namespace) -> None:
    repo = args.repo.expanduser().resolve()
    problems, tagged = [], set()
    for tag in git(repo, "tag", "--list", "chapter-*-approved").split():
        chapter = tag.removeprefix("chapter-").removesuffix("-approved")
        tagged.add(chapter)
        target = chapter_path(chapter)
        candidate = json.loads(
            git(repo, "show", f"{tag}:chapters/{chapter}/candidate.json")
        )
        if not target.exists():
            problems.append(f"{chapter}: canonical file missing")
        elif json.loads(target.read_text(encoding="utf-8")) != candidate:
            problems.append(f"{chapter}: canonical file differs from {tag}")
        else:
            print(f"{chapter}: matches {tag}")
    # The promotion log is frozen history: new chapters add no rows, and a missing
    # log is fine. Historical rows are only counted for information.
    latest: dict[str, str] = {}
    if LOG.is_file():
        for line in LOG.read_text(encoding="utf-8").splitlines():
            match = re.match(r"^\|[^|]*\|\s*`([0-9.]+)`\s*\|", line)
            if match:
                latest[match.group(1)] = line
        untagged = sum("-approved`" not in row for row in latest.values())
        print(f"{untagged} chapter(s) whose latest promotion-log row cites no tag.")
    if problems:
        raise Refusal("; ".join(problems))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    commands = parser.add_subparsers(dest="command", required=True)
    for name, handler in (("record", record), ("promote", promote), ("verify", verify)):
        sub = commands.add_parser(name)
        sub.set_defaults(handler=handler)
        sub.add_argument("--repo", type=Path, default=Path(DEFAULT_REPO))
        if name != "verify":
            sub.add_argument("--chapter", required=True)
            sub.add_argument("--workspace", type=Path, required=True)
    commands.choices["record"].add_argument("--approval", type=Path, required=True)
    commands.choices["promote"].add_argument("--decisions", required=True)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if getattr(args, "chapter", None) and not CHAPTER_RE.fullmatch(args.chapter):
        parser.error('chapter must use "book.chapter" form')
    try:
        args.handler(args)
    except Refusal as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    except Unconfirmed as error:
        print(f"error: {error}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
