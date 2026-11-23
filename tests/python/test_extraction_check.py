from __future__ import annotations

import contextlib
import io
import os
import subprocess
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

import extraction_check as extcheck

MASTER_CANDIDATE_ENTITIES = (
    b'{"candidates":[{"id":"candidate:from-master","kind":"character","name":"Master Only","aliases":[],"mentions":["2.1"],"note":"master","promotion":null}]}\n'
)
GIVEN_CANDIDATE_ENTITIES = (
    b'{"candidates":[{"id":"candidate:only-in-given","kind":"character","name":"Given Only","aliases":[],"mentions":["2.11"],"note":"given","promotion":null}]}\n'
)


def git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["GIT_AUTHOR_NAME"] = "Test"
    env["GIT_AUTHOR_EMAIL"] = "test@example.com"
    env["GIT_COMMITTER_NAME"] = "Test"
    env["GIT_COMMITTER_EMAIL"] = "test@example.com"
    return subprocess.run(
        ["git", *args],
        cwd=repo,
        check=check,
        capture_output=True,
        text=True,
        env=env,
    )


def init_repo(root: Path) -> Path:
    repo = root / "repo"
    repo.mkdir()
    git(repo, "init", "-q", "-b", "master")
    git(repo, "config", "user.name", "Test")
    git(repo, "config", "user.email", "test@example.com")
    (repo / "README").write_text("base\n", encoding="utf-8")
    (repo / ".gitignore").write_text(".venv/\nnode_modules/\n", encoding="utf-8")
    (repo / "data" / "narrative" / "chapters" / "2").mkdir(parents=True)
    (repo / "data" / "narrative" / "sentence-preservation-exceptions.json").write_bytes(
        b'{"about":"base","exceptions":[]}\n'
    )
    (repo / "data" / "candidates").mkdir(parents=True)
    (repo / "data" / "candidates" / "candidate-entities.json").write_bytes(
        MASTER_CANDIDATE_ENTITIES
    )
    (repo / "node_modules").mkdir()
    (repo / ".venv" / "bin").mkdir(parents=True)
    (repo / ".venv" / "bin" / "python").write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    (repo / ".venv" / "bin" / "python").chmod(0o755)
    git(repo, "add", "README", ".gitignore", "data")
    git(repo, "commit", "-q", "-m", "base")
    return repo


class CandidateParsingTest(unittest.TestCase):
    def test_parses_and_sorts_chapter_files(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            directory = Path(raw)
            (directory / "2.10.json").write_bytes(b'{"n":10}')
            (directory / "2.9.json").write_bytes(b'{"n":9}')
            (directory / "notes.txt").write_text("ignore\n", encoding="utf-8")
            found = extcheck.list_candidates(directory)
            self.assertEqual([item.chapter for item in found], ["2.9", "2.10"])
            self.assertEqual(
                found[0].relative_dest,
                Path("data/narrative/chapters/2/9.json"),
            )

    def test_rejects_bad_filename(self) -> None:
        with self.assertRaises(extcheck.UsageError):
            extcheck.parse_candidate_name("chapter-2-11.json")

    def test_finds_unique_source_and_approval(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            directory = Path(raw)
            source = directory / "2.11 - Dummy.txt"
            source.write_bytes(b"dummy")
            approval = directory / "approval-2.11.json"
            approval.write_text("{}\n", encoding="utf-8")
            self.assertEqual(extcheck.find_source_file(directory, "2.11"), source)
            self.assertEqual(extcheck.find_approval_file(directory, "2.11"), approval)
            with self.assertRaises(extcheck.UsageError):
                extcheck.find_source_file(directory, "2.12")


class ExcerptAndSummaryTest(unittest.TestCase):
    def test_prefers_error_lines(self) -> None:
        log = "\n".join(
            [
                "Checking formatting...",
                "All good so far",
                "Error: status event date 2165-09 must be on or before the chapter date 2165-08",
                "FAIL src/narrative/model.ts",
                "more context",
            ]
        )
        excerpt = extcheck.excerpt_failure(log, limit=20)
        self.assertEqual(
            excerpt,
            [
                "Error: status event date 2165-09 must be on or before the chapter date 2165-08",
                "FAIL src/narrative/model.ts",
            ],
        )

    def test_falls_back_to_first_useful_lines(self) -> None:
        log = "\n\nfirst\nsecond\n"
        self.assertEqual(extcheck.excerpt_failure(log, limit=2), ["first", "second"])

    def test_summary_includes_excerpt_and_log_path(self) -> None:
        candidate = extcheck.Candidate(
            "2.11",
            Path("/tmp/2.11.json"),
            Path("data/narrative/chapters/2/11.json"),
        )
        install = extcheck.InstallResult(
            candidates=[(candidate, "abc")],
            exceptions_sha256="def",
            candidate_entities_sha256=None,
            head="aaa111",
            branch="check/test",
            base="bbb222",
            worktree=Path("/tmp/wt"),
        )
        failed = extcheck.Step("narrative:validate", "narrative:validate.log")
        failed.rc = 1
        failed.excerpt = ["Error: example failure"]
        passed = extcheck.Step("lint", "lint.log")
        run = extcheck.CheckRun(
            steps=[failed, passed],
            node="v22.23.1",
            start="2026-11-21T00:00:00Z",
            end="2026-11-21T00:01:00Z",
        )
        summary = extcheck.format_summary(install, run, Path("/tmp/logs"), cleaned=True)
        self.assertIn("result=FAIL", summary)
        self.assertIn("narrative:validate rc=1", summary)
        self.assertIn("  Error: example failure", summary)
        self.assertIn("  log: /tmp/logs/narrative:validate.log", summary)
        self.assertIn("lint rc=0", summary)
        self.assertIn("worktree: removed; branch kept", summary)
        self.assertNotIn("lint.log", summary.split("lint rc=0")[1].splitlines()[0])


class BranchBuildTest(unittest.TestCase):
    def test_copies_bytes_commits_locally_and_cleans_worktree(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            repo = init_repo(root)
            candidates_dir = root / "candidates"
            candidates_dir.mkdir()
            payload = b'{"chapter":"2.11","ok":true}\n'
            (candidates_dir / "2.11.json").write_bytes(payload)
            exceptions = root / "exceptions.json"
            exceptions_bytes = b'{"about":"updated","exceptions":[{"chapter":"2.11"}]}\n'
            exceptions.write_bytes(exceptions_bytes)
            worktree = root / "wt"
            result = extcheck.build_review_branch(
                repo,
                worktree,
                "check/unit",
                "HEAD",
                extcheck.list_candidates(candidates_dir),
                exceptions,
            )
            dest = worktree / "data/narrative/chapters/2/11.json"
            self.assertEqual(dest.read_bytes(), payload)
            self.assertEqual(
                (worktree / extcheck.EXCEPTIONS_RELATIVE).read_bytes(),
                exceptions_bytes,
            )
            self.assertEqual(result.exceptions_sha256, extcheck.sha256_bytes(exceptions_bytes))
            self.assertTrue((worktree / "node_modules").is_symlink())
            status = git(worktree, "status", "--porcelain", "--untracked-files=all").stdout
            self.assertEqual(status.strip(), "")
            self.assertNotEqual(result.head, result.base)
            committed = git(worktree, "show", "HEAD:data/narrative/chapters/2/11.json").stdout.encode()
            self.assertEqual(committed, payload)
            # The original checkout is untouched and the branch is local only.
            self.assertEqual(git(repo, "branch", "--show-current").stdout.strip(), "master")
            self.assertEqual((repo / "README").read_text(encoding="utf-8"), "base\n")
            self.assertFalse((repo / "data/narrative/chapters/2/11.json").exists())
            remotes = git(repo, "remote", "-v").stdout.strip()
            self.assertEqual(remotes, "")
            log = git(worktree, "log", "-1", "--format=%s").stdout
            self.assertIn("never push", log)
            extcheck.remove_worktree(repo, worktree)
            self.assertFalse(worktree.exists())
            self.assertEqual(git(repo, "rev-parse", "check/unit").stdout.strip(), result.head)

    def test_refuses_paths_inside_the_repository(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            repo = Path(raw) / "repo"
            repo.mkdir()
            inside = repo / "candidates"
            inside.mkdir()
            with self.assertRaises(extcheck.UsageError):
                extcheck.refuse_inside_repo(inside, repo, "candidates directory")

    def test_refuses_existing_or_protected_branch(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            repo = init_repo(root)
            with self.assertRaises(extcheck.UsageError):
                extcheck.create_worktree(repo, root / "wt-master", "master", "HEAD")
            extcheck.create_worktree(repo, root / "wt", "check/unit", "HEAD")
            with self.assertRaises(extcheck.UsageError):
                extcheck.create_worktree(repo, root / "wt2", "check/unit", "HEAD")
            extcheck.remove_worktree(repo, root / "wt")

    def test_generate_diff_is_detected(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            repo = init_repo(Path(raw))
            (repo / "README").write_text("dirty\n", encoding="utf-8")
            self.assertTrue(extcheck.worktree_changes(repo).strip())
            git(repo, "checkout", "--", "README")
            self.assertFalse(extcheck.worktree_changes(repo).strip())

    def test_script_has_no_push_command(self) -> None:
        source = (ROOT / "scripts" / "extraction_check.py").read_text(encoding="utf-8")
        self.assertNotIn("git push", source)
        self.assertNotIn('"push"', source)
        self.assertNotIn("'push'", source)

    def test_installs_given_candidate_entities_file(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            repo = init_repo(root)
            candidates_dir = root / "candidates"
            candidates_dir.mkdir()
            payload = b'{"chapter":"2.11","ok":true}\n'
            (candidates_dir / "2.11.json").write_bytes(payload)
            given = root / "candidate-entities.json"
            given.write_bytes(GIVEN_CANDIDATE_ENTITIES)
            worktree = root / "wt"
            result = extcheck.build_review_branch(
                repo,
                worktree,
                "check/cand-entities",
                "HEAD",
                extcheck.list_candidates(candidates_dir),
                None,
                candidate_entities_file=given,
            )
            installed = worktree / extcheck.CANDIDATE_ENTITIES_RELATIVE
            self.assertEqual(installed.read_bytes(), GIVEN_CANDIDATE_ENTITIES)
            self.assertIn(b"candidate:only-in-given", installed.read_bytes())
            self.assertNotIn(b"candidate:from-master", installed.read_bytes())
            self.assertEqual(
                result.candidate_entities_sha256,
                extcheck.sha256_bytes(GIVEN_CANDIDATE_ENTITIES),
            )
            committed = git(
                worktree, "show", "HEAD:data/candidates/candidate-entities.json"
            ).stdout.encode()
            self.assertEqual(committed, GIVEN_CANDIDATE_ENTITIES)
            self.assertNotIn(b"candidate:from-master", committed)
            # Master's checkout is unchanged.
            self.assertEqual(
                (repo / extcheck.CANDIDATE_ENTITIES_RELATIVE).read_bytes(),
                MASTER_CANDIDATE_ENTITIES,
            )
            extcheck.remove_worktree(repo, worktree)

    def test_omitting_candidate_entities_file_leaves_masters_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            repo = init_repo(root)
            candidates_dir = root / "candidates"
            candidates_dir.mkdir()
            (candidates_dir / "2.11.json").write_bytes(b'{"chapter":"2.11"}\n')
            worktree = root / "wt"
            result = extcheck.build_review_branch(
                repo,
                worktree,
                "check/no-cand-entities",
                "HEAD",
                extcheck.list_candidates(candidates_dir),
                None,
            )
            installed = worktree / extcheck.CANDIDATE_ENTITIES_RELATIVE
            self.assertEqual(installed.read_bytes(), MASTER_CANDIDATE_ENTITIES)
            self.assertIsNone(result.candidate_entities_sha256)
            committed = git(
                worktree, "show", "HEAD:data/candidates/candidate-entities.json"
            ).stdout.encode()
            self.assertEqual(committed, MASTER_CANDIDATE_ENTITIES)
            extcheck.remove_worktree(repo, worktree)

    def test_missing_candidate_entities_file_errors(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            missing = root / "missing-candidate-entities.json"
            with self.assertRaises(extcheck.UsageError) as ctx:
                extcheck.resolve_existing_file(missing, "candidate-entities file")
            self.assertIn("does not exist", str(ctx.exception))
            self.assertIn(str(missing), str(ctx.exception))

            repo = init_repo(root)
            candidates_dir = root / "candidates"
            candidates_dir.mkdir()
            (candidates_dir / "2.11.json").write_bytes(b'{"chapter":"2.11"}\n')
            source_dir = root / "source"
            source_dir.mkdir()
            (source_dir / "2.11 - Dummy.txt").write_bytes(b"dummy")
            approval_dir = root / "approval"
            approval_dir.mkdir()
            (approval_dir / "approval-2.11.json").write_text("{}\n", encoding="utf-8")
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                rc = extcheck.main(
                    [
                        "--repo",
                        str(repo),
                        "--candidates-dir",
                        str(candidates_dir),
                        "--source-dir",
                        str(source_dir),
                        "--approval-dir",
                        str(approval_dir),
                        "--base",
                        "HEAD",
                        "--branch",
                        "check/missing-ce",
                        "--out",
                        str(root / "out"),
                        "--candidate-entities-file",
                        str(missing),
                    ]
                )
            self.assertEqual(rc, 2)
            self.assertIn("does not exist", stderr.getvalue())
            self.assertIn(str(missing), stderr.getvalue())
            self.assertFalse((root / "out" / "worktree").exists())
            missing_branch = git(
                repo, "show-ref", "--verify", "--quiet", "refs/heads/check/missing-ce", check=False
            )
            self.assertNotEqual(missing_branch.returncode, 0)

    def test_candidate_entities_path_must_be_a_file(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            directory = Path(raw) / "not-a-file"
            directory.mkdir()
            with self.assertRaises(extcheck.UsageError) as ctx:
                extcheck.resolve_existing_file(directory, "candidate-entities file")
            self.assertIn("is not a file", str(ctx.exception))
            self.assertIn(str(directory), str(ctx.exception))


if __name__ == "__main__":
    unittest.main()

class ReviewCommitIdentityTest(unittest.TestCase):
    def test_review_commit_git_args_set_local_identity(self) -> None:
        self.assertEqual(
            extcheck.review_commit_git_args("msg"),
            [
                "-c",
                "user.name=Bobiverse Extraction Check",
                "-c",
                "user.email=extraction-check@localhost",
                "commit",
                "-m",
                "msg",
            ],
        )

    def test_review_commit_works_without_global_git_identity(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            home = root / "empty-home"
            home.mkdir()
            repo = root / "repo"
            repo.mkdir()
            cleared = (
                "GIT_AUTHOR_NAME",
                "GIT_AUTHOR_EMAIL",
                "GIT_COMMITTER_NAME",
                "GIT_COMMITTER_EMAIL",
                "GIT_AUTHOR_DATE",
                "GIT_COMMITTER_DATE",
                "EMAIL",
            )
            extra = {
                "HOME": str(home),
                "GIT_CONFIG_NOSYSTEM": "1",
                "GIT_TERMINAL_PROMPT": "0",
            }
            with unittest.mock.patch.dict(os.environ, extra, clear=False):
                for key in cleared:
                    os.environ.pop(key, None)
                subprocess.run(
                    ["git", "init", "-q", "-b", "master"],
                    cwd=repo,
                    check=True,
                    capture_output=True,
                    text=True,
                    env=extcheck.command_env(),
                )
                (repo / "README").write_text("ok\n", encoding="utf-8")
                extcheck.run_git(repo, ["add", "README"])
                extcheck.run_git(repo, extcheck.review_commit_git_args("no identity"))
                ident = extcheck.run_git(
                    repo, ["log", "-1", "--format=%an <%ae>"]
                ).stdout.strip()
                self.assertEqual(
                    ident,
                    "Bobiverse Extraction Check <extraction-check@localhost>",
                )
