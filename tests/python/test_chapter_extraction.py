from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
import unittest
import urllib.error
import urllib.request
from dataclasses import replace
from pathlib import Path
from unittest.mock import patch

from scripts.chapter_extraction.contract import ContractError, validate_ledger
from scripts.chapter_extraction.ollama import (
    LocalEndpoint,
    NoRedirectHandler,
    OllamaClient,
    OllamaError,
    validate_local_endpoint,
)
from scripts.chapter_extraction.workflow import (
    CORRECTION_PROMPT_TEMPLATE,
    EVIDENCE_CORRECTION_INSTRUCTION,
    MAX_CORRECTION_DETAIL_BYTES,
    EvidenceSealError,
    ExtractionConfig,
    ExtractionError,
    SYSTEM_PROMPT,
    _context_guard,
    _evidence_correction_detail,
    _model_error_detail,
    run_extraction,
    validate_paths,
)
from scripts.chapter_extraction.contract import LEDGER_SCHEMA


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = REPOSITORY_ROOT / "config/chapter-extraction-qwen3-14b.json"
SOURCE_TEXT = "Avery enters the laboratory and activates the beacon.\n"


def draft_ledger() -> dict[str, object]:
    return {
        "chapter": "1.1",
        "source_sha256": hashlib.sha256(SOURCE_TEXT.encode("utf-8")).hexdigest(),
        "chapter_metadata": {
            "source_title": None,
            "canonical_title": "1",
            "lead_mentions": ["mention:avery"],
            "location_mentions": ["mention:laboratory"],
            "date_claims": [],
        },
        "source_mentions": [
            {
                "mention_id": "mention:avery",
                "kind": "character",
                "label": "Avery",
                "uncertainty": None,
            },
            {
                "mention_id": "mention:laboratory",
                "kind": "location",
                "label": "laboratory",
                "uncertainty": "Its containing settlement is not stated.",
            },
            {
                "mention_id": "mention:beacon",
                "kind": "technology",
                "label": "beacon",
                "uncertainty": "Its operating principle is not stated.",
            },
        ],
        "summary_draft": "Avery enters a laboratory and activates a beacon.",
        "unresolved_questions": [
            "The chapter does not state the laboratory's containing settlement."
        ],
        "processed_chunks": ["chunk:001"],
        "claims": [
            {
                "claim_id": "claim:001",
                "claim_type": "appearance",
                "statement": "Avery appears in the chapter.",
                "subject_mentions": ["mention:avery"],
                "confidence": "high",
                "uncertainty": None,
                "evidence": [{"quote": "Avery enters the laboratory"}],
            },
            {
                "claim_id": "claim:002",
                "claim_type": "entity_function",
                "statement": "Avery activates the beacon.",
                "subject_mentions": ["mention:avery", "mention:beacon"],
                "confidence": "high",
                "uncertainty": None,
                "evidence": [{"quote": "activates the beacon"}],
            },
        ],
    }


class FakeClient:
    def __init__(self, responses: list[dict[str, object]]) -> None:
        self.responses = list(responses)
        self.payloads: list[dict[str, object]] = []
        self.unloaded = False

    def verify(self, model: str) -> dict[str, object]:
        return {
            "ollama_version": "0.30.8",
            "model_capabilities": ["completion", "thinking"],
        }

    def ensure_unloaded(self, model: str) -> None:
        self.unloaded = True

    def chat(self, payload: dict[str, object]) -> dict[str, object]:
        self.payloads.append(payload)
        return self.responses.pop(0)

    def model_placement(self, model: str) -> dict[str, int]:
        return {"size_bytes": 100, "size_vram_bytes": 100}


def response(
    content: str,
    *,
    done: bool = True,
    done_reason: str | None = "stop",
) -> dict[str, object]:
    return {
        "message": {
            "role": "assistant",
            "content": content,
            "thinking": "private thinking must not be persisted",
        },
        "done": done,
        "done_reason": done_reason,
        "total_duration": 20,
        "load_duration": 5,
        "prompt_eval_count": 10,
        "prompt_eval_duration": 6,
        "eval_count": 12,
        "eval_duration": 9,
    }


class ContractTests(unittest.TestCase):
    def test_accepts_complete_redacted_ledger(self) -> None:
        ledger = draft_ledger()

        self.assertIs(
            validate_ledger(
                ledger,
                chapter="1.1",
                source_sha256=ledger["source_sha256"],
                expected_chunks=["chunk:001"],
            ),
            ledger,
        )

    def test_rejects_manifest_drift(self) -> None:
        ledger = draft_ledger()
        ledger["processed_chunks"] = ["chunk:002"]

        with self.assertRaisesRegex(ContractError, "ordered manifest"):
            validate_ledger(
                ledger,
                chapter="1.1",
                source_sha256=ledger["source_sha256"],
                expected_chunks=["chunk:001"],
            )

    def test_rejects_unresolved_subject_mention(self) -> None:
        ledger = draft_ledger()
        ledger["claims"][0]["subject_mentions"] = ["mention:missing"]

        with self.assertRaisesRegex(ContractError, "unresolved subject"):
            validate_ledger(
                ledger,
                chapter="1.1",
                source_sha256=ledger["source_sha256"],
                expected_chunks=["chunk:001"],
            )


class SafetyTests(unittest.TestCase):
    def test_checked_in_config_binds_every_runtime_control(self) -> None:
        config, _ = ExtractionConfig.load(CONFIG_PATH)

        self.assertEqual(
            config.__dict__,
            {
                "format_version": 1,
                "provider": "ollama",
                "endpoint": "http://127.0.0.1:11434",
                "model": "qwen3:14b",
                "api_path": "/api/chat",
                "stream": False,
                "think": True,
                "temperature": 0,
                "seed": 42,
                "num_ctx": 32768,
                "num_predict": 8192,
                "connect_timeout_seconds": 5,
                "response_timeout_seconds": 1800,
                "keep_alive": "5m",
                "max_attempts": 3,
                "chunk_bytes": 6000,
                "overlap_bytes": 256,
            },
        )

    def test_config_rejects_unknown_fields_and_wrong_retry_limit(self) -> None:
        config, _ = ExtractionConfig.load(CONFIG_PATH)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "config.json"
            malformed = dict(config.__dict__)
            malformed["unexpected"] = True
            path.write_text(json.dumps(malformed), encoding="utf-8")
            with self.assertRaisesRegex(ExtractionError, "fields"):
                ExtractionConfig.load(path)

        with self.assertRaisesRegex(ExtractionError, "exactly three"):
            replace(config, max_attempts=4).validate()

    def test_blind_contract_contains_no_canonical_corpus_material(self) -> None:
        blind_contract = SYSTEM_PROMPT + json.dumps(LEDGER_SCHEMA)

        for forbidden in (
            "data/narrative",
            "character:",
            "event:",
            "location:",
            "organization:",
            "species:",
            "technology:",
            "vessel_type:",
        ):
            self.assertNotIn(forbidden, blind_contract)

    @patch("scripts.chapter_extraction.ollama.socket.getaddrinfo")
    def test_rejects_non_loopback_endpoint(self, getaddrinfo: object) -> None:
        getaddrinfo.return_value = [
            (2, 1, 6, "", ("203.0.113.20", 11434)),
        ]

        with self.assertRaisesRegex(OllamaError, "loopback"):
            validate_local_endpoint("http://example.invalid:11434")

    def test_canonicalizes_literal_loopback_endpoint(self) -> None:
        endpoint = validate_local_endpoint("http://127.0.0.1:11434")

        self.assertEqual(endpoint.canonical, "http://127.0.0.1:11434")

    def test_redirect_handler_refuses_redirects(self) -> None:
        handler = NoRedirectHandler()
        request = urllib.request.Request("http://127.0.0.1:11434/api/chat")

        with self.assertRaisesRegex(urllib.error.HTTPError, "Redirects") as raised:
            handler.redirect_request(
                request,
                None,
                302,
                "Found",
                {},
                "http://203.0.113.20/",
            )
        raised.exception.close()

    @patch("scripts.chapter_extraction.ollama.urllib.request.build_opener")
    def test_ollama_client_disables_ambient_proxies(self, build_opener: object) -> None:
        OllamaClient(
            LocalEndpoint(
                configured="http://127.0.0.1:11434",
                canonical="http://127.0.0.1:11434",
            ),
            connect_timeout_seconds=5,
            response_timeout_seconds=30,
        )

        proxy_handler = build_opener.call_args.args[0]
        self.assertIsInstance(proxy_handler, urllib.request.ProxyHandler)
        self.assertEqual(proxy_handler.proxies, {})

    def test_rejects_repository_source_and_output(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            outside = Path(directory)
            with self.assertRaisesRegex(ExtractionError, "Source"):
                validate_paths(REPOSITORY_ROOT, REPOSITORY_ROOT / "AGENTS.md", outside)
            source = outside / "1.1.txt"
            source.write_text(SOURCE_TEXT, encoding="utf-8")
            with self.assertRaisesRegex(ExtractionError, "Output"):
                validate_paths(REPOSITORY_ROOT, source, REPOSITORY_ROOT)

    def test_rejects_symlink_to_repository_source(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            outside = Path(directory)
            source = outside / "1.1.txt"
            source.symlink_to(REPOSITORY_ROOT / "AGENTS.md")

            with self.assertRaisesRegex(ExtractionError, "Source"):
                validate_paths(REPOSITORY_ROOT, source, outside)

    def test_conservative_context_guard_rejects_over_budget_prompt(self) -> None:
        config, _ = ExtractionConfig.load(CONFIG_PATH)
        tiny = replace(config, num_ctx=100, num_predict=50)

        with self.assertRaisesRegex(ExtractionError, "context budget"):
            _context_guard(tiny, "redacted prompt")

    def test_context_guard_budgets_full_correction_detail(self) -> None:
        config, _ = ExtractionConfig.load(CONFIG_PATH)
        context = _context_guard(config, "redacted prompt")
        expected = len(
            CORRECTION_PROMPT_TEMPLATE.format(
                code="provider_response",
                detail="x" * MAX_CORRECTION_DETAIL_BYTES,
            ).encode("utf-8")
            + EVIDENCE_CORRECTION_INSTRUCTION.encode("utf-8")
        )

        self.assertEqual(context["maximum_correction_bytes"], expected)
        error = EvidenceSealError("safe", "🙂" * 500)
        correction = _model_error_detail(error)
        self.assertLessEqual(
            len(correction.encode("utf-8")),
            MAX_CORRECTION_DETAIL_BYTES,
        )
        self.assertEqual(correction, "🙂" * 125)

    def test_evidence_correction_preserves_exact_source_whitespace(self) -> None:
        draft = draft_ledger()
        draft["claims"][0]["evidence"][0]["quote"] = "Avery enters the laboratory"
        source = "Avery enters the\nlaboratory."

        detail = _evidence_correction_detail(
            draft,
            source,
            "error: claim:001 evidence quote was not found exactly.",
        )

        self.assertIn(r"Avery enters the\nlaboratory", detail)

    def test_source_seal_reports_all_invalid_quotes_in_one_pass(self) -> None:
        source_text = "Alpha crosses the\nbridge.\nBeta opens the\nhatch.\n"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "1.1.txt"
            source.write_text(source_text, encoding="utf-8")
            draft = draft_ledger()
            draft["source_sha256"] = hashlib.sha256(
                source_text.encode("utf-8")
            ).hexdigest()
            draft["claims"][0]["evidence"][0]["quote"] = "Alpha crosses the bridge"
            draft["claims"][1]["evidence"][0]["quote"] = "Beta opens the hatch"
            draft_path = root / "draft.json"
            draft_path.write_text(json.dumps(draft), encoding="utf-8")

            completed = subprocess.run(
                [
                    "python3",
                    str(
                        REPOSITORY_ROOT
                        / ".codex/skills/extract-bobiverse-chapter/scripts/"
                        "source_evidence.py"
                    ),
                    "seal",
                    "--source",
                    str(source),
                    "--chapter",
                    "1.1",
                    "--draft",
                    str(draft_path),
                    "--output",
                    str(root / "sealed.json"),
                ],
                check=False,
                capture_output=True,
                text=True,
            )

        self.assertEqual(completed.returncode, 2)
        self.assertIn("claim:001", completed.stderr)
        self.assertIn("claim:002", completed.stderr)
        self.assertNotIn("Alpha crosses", completed.stderr)
        self.assertNotIn("Beta opens", completed.stderr)


class WorkflowTests(unittest.TestCase):
    def run_with_responses(
        self,
        responses: list[dict[str, object]],
    ) -> tuple[dict[str, object], FakeClient, Path, tempfile.TemporaryDirectory[str]]:
        temporary = tempfile.TemporaryDirectory()
        root = Path(temporary.name)
        source = root / "1.1.txt"
        source.write_text(SOURCE_TEXT, encoding="utf-8")
        output = root / "output"
        output.mkdir()
        fake = FakeClient(responses)

        metrics = run_extraction(
            repository_root=REPOSITORY_ROOT,
            config_path=CONFIG_PATH,
            chapter="1.1",
            source_path=source,
            output_dir=output,
            client_factory=lambda *args, **kwargs: fake,
        )
        return metrics, fake, output, temporary

    def test_success_writes_only_approved_artifacts(self) -> None:
        metrics, fake, output, temporary = self.run_with_responses(
            [response(json.dumps(draft_ledger()))]
        )
        self.addCleanup(temporary.cleanup)

        self.assertTrue(fake.unloaded)
        self.assertEqual(metrics["attempt_count"], 1)
        self.assertEqual(
            sorted(path.name for path in output.iterdir()),
            ["1-1-draft.json", "1-1-metrics.json", "1-1-sealed.json"],
        )
        persisted = "\n".join(
            path.read_text(encoding="utf-8") for path in output.iterdir()
        )
        self.assertNotIn("private thinking", persisted)
        self.assertNotIn('"message"', persisted)
        sealed = json.loads((output / "1-1-sealed.json").read_text(encoding="utf-8"))
        self.assertTrue(sealed["sealed"])
        self.assertNotIn("quote", json.dumps(sealed))
        payload = fake.payloads[0]
        self.assertFalse(payload["stream"])
        self.assertTrue(payload["think"])
        self.assertEqual(payload["keep_alive"], "5m")
        self.assertEqual(
            payload["options"],
            {
                "temperature": 0,
                "seed": 42,
                "num_ctx": 32768,
                "num_predict": 8192,
            },
        )
        self.assertIsInstance(payload["format"], dict)
        self.assertIn(SOURCE_TEXT, payload["messages"][1]["content"])
        config, _ = ExtractionConfig.load(CONFIG_PATH)
        self.assertEqual(metrics["config"], config.__dict__)

    def test_transport_timeouts_are_wired_from_config(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "1.1.txt"
            source.write_text(SOURCE_TEXT, encoding="utf-8")
            output = root / "output"
            output.mkdir()
            fake = FakeClient([response(json.dumps(draft_ledger()))])
            captured: dict[str, object] = {}

            def factory(*args: object, **kwargs: object) -> FakeClient:
                captured["args"] = args
                captured["kwargs"] = kwargs
                return fake

            run_extraction(
                repository_root=REPOSITORY_ROOT,
                config_path=CONFIG_PATH,
                chapter="1.1",
                source_path=source,
                output_dir=output,
                client_factory=factory,
            )

        self.assertEqual(
            captured["kwargs"],
            {
                "connect_timeout_seconds": 5,
                "response_timeout_seconds": 1800,
            },
        )

    def test_success_timer_stops_after_sealed_hash_before_placement(self) -> None:
        events: list[str] = []
        original_sha256 = hashlib.sha256

        class TimingClient(FakeClient):
            def model_placement(self, model: str) -> dict[str, int]:
                events.append("placement")
                return super().model_placement(model)

        def tracked_sha256(data: bytes = b"") -> object:
            if b'"sealed": true' in data:
                events.append("sealed_hash")
            return original_sha256(data)

        ticks = iter((10.0, 20.0))

        def tracked_monotonic() -> float:
            value = next(ticks)
            events.append("timer")
            return value

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "1.1.txt"
            source.write_text(SOURCE_TEXT, encoding="utf-8")
            output = root / "output"
            output.mkdir()
            fake = TimingClient([response(json.dumps(draft_ledger()))])

            with (
                patch(
                    "scripts.chapter_extraction.workflow.hashlib.sha256",
                    side_effect=tracked_sha256,
                ),
                patch(
                    "scripts.chapter_extraction.workflow.time.monotonic",
                    side_effect=tracked_monotonic,
                ),
            ):
                metrics = run_extraction(
                    repository_root=REPOSITORY_ROOT,
                    config_path=CONFIG_PATH,
                    chapter="1.1",
                    source_path=source,
                    output_dir=output,
                    client_factory=lambda *args, **kwargs: fake,
                )

        self.assertEqual(metrics["wall_duration_seconds"], 10.0)
        self.assertLess(events.index("sealed_hash"), events.index("placement"))
        self.assertEqual(
            events[events.index("sealed_hash") : events.index("placement") + 1],
            ["sealed_hash", "timer", "placement"],
        )

    def test_retries_invalid_json_without_persisting_it(self) -> None:
        metrics, fake, output, temporary = self.run_with_responses(
            [
                response("not JSON and must not be persisted"),
                response(json.dumps(draft_ledger())),
            ]
        )
        self.addCleanup(temporary.cleanup)

        self.assertEqual(metrics["attempt_count"], 2)
        self.assertEqual(metrics["cold_load_duration_seconds"], 5e-9)
        self.assertEqual(metrics["attempts"][0]["failure_code"], "invalid_json")
        self.assertEqual(len(fake.payloads), 2)
        persisted = "\n".join(
            path.read_text(encoding="utf-8") for path in output.iterdir()
        )
        self.assertNotIn("not JSON", persisted)
        self.assertIn("invalid_json", fake.payloads[1]["messages"][-1]["content"])
        self.assertIn("not valid JSON", fake.payloads[1]["messages"][-1]["content"])

    def test_nonterminal_provider_response_is_not_retried(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "1.1.txt"
            source.write_text(SOURCE_TEXT, encoding="utf-8")
            output = root / "output"
            output.mkdir()
            fake = FakeClient(
                [
                    response(
                        json.dumps(draft_ledger()),
                        done=False,
                        done_reason=None,
                    ),
                    response(json.dumps(draft_ledger())),
                ]
            )

            with self.assertRaisesRegex(ExtractionError, "without retry"):
                run_extraction(
                    repository_root=REPOSITORY_ROOT,
                    config_path=CONFIG_PATH,
                    chapter="1.1",
                    source_path=source,
                    output_dir=output,
                    client_factory=lambda *args, **kwargs: fake,
                )

            self.assertEqual(len(fake.payloads), 1)
            metrics = json.loads(
                (output / "1-1-metrics.json").read_text(encoding="utf-8")
            )
            self.assertEqual(metrics["attempt_count"], 1)
            self.assertEqual(metrics["attempts"][0]["failure_code"], "provider_response")

    def test_length_termination_is_not_retried(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "1.1.txt"
            source.write_text(SOURCE_TEXT, encoding="utf-8")
            output = root / "output"
            output.mkdir()
            fake = FakeClient(
                [
                    response(
                        json.dumps(draft_ledger()),
                        done=True,
                        done_reason="length",
                    ),
                    response(json.dumps(draft_ledger())),
                ]
            )

            with self.assertRaisesRegex(ExtractionError, "without retry"):
                run_extraction(
                    repository_root=REPOSITORY_ROOT,
                    config_path=CONFIG_PATH,
                    chapter="1.1",
                    source_path=source,
                    output_dir=output,
                    client_factory=lambda *args, **kwargs: fake,
                )

            self.assertEqual(len(fake.payloads), 1)

    def test_exact_evidence_retry_keeps_replacement_out_of_metrics(self) -> None:
        invalid = draft_ledger()
        invalid["claims"][0]["evidence"][0]["quote"] = "Avery enters\nthe laboratory"
        metrics, fake, output, temporary = self.run_with_responses(
            [
                response(json.dumps(invalid)),
                response(json.dumps(draft_ledger())),
            ]
        )
        self.addCleanup(temporary.cleanup)

        correction = fake.payloads[1]["messages"][-1]["content"]
        self.assertIn(r"Avery enters the laboratory", correction)
        persisted_metrics = (output / "1-1-metrics.json").read_text(encoding="utf-8")
        self.assertNotIn("Avery enters the laboratory", persisted_metrics)
        self.assertEqual(metrics["attempts"][0]["failure_code"], "evidence_seal")

    def test_three_failed_attempts_leave_only_source_free_metrics(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "1.1.txt"
            source.write_text(SOURCE_TEXT, encoding="utf-8")
            output = root / "output"
            output.mkdir()
            fake = FakeClient([response("bad"), response("bad"), response("bad")])

            with self.assertRaisesRegex(ExtractionError, "All provider attempts"):
                run_extraction(
                    repository_root=REPOSITORY_ROOT,
                    config_path=CONFIG_PATH,
                    chapter="1.1",
                    source_path=source,
                    output_dir=output,
                    client_factory=lambda *args, **kwargs: fake,
                )

            self.assertEqual(
                [path.name for path in output.iterdir()],
                ["1-1-metrics.json"],
            )
            metrics = json.loads(
                (output / "1-1-metrics.json").read_text(encoding="utf-8")
            )
            self.assertEqual(metrics["status"], "failed")
            self.assertEqual(metrics["attempt_count"], 3)
            self.assertNotIn("bad", json.dumps(metrics))

    def test_provider_verification_fails_before_source_preparation(self) -> None:
        class FailingClient:
            def __init__(self, *args: object, **kwargs: object) -> None:
                pass

            def verify(self, model: str) -> dict[str, object]:
                raise OllamaError("capability check failed")

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            output = root / "output"
            output.mkdir()
            with patch(
                "scripts.chapter_extraction.workflow.prepare_blind_input"
            ) as prepare:
                with self.assertRaisesRegex(OllamaError, "capability"):
                    run_extraction(
                        repository_root=REPOSITORY_ROOT,
                        config_path=CONFIG_PATH,
                        chapter="1.1",
                        source_path=root / "source-does-not-need-to-exist.txt",
                        output_dir=output,
                        client_factory=FailingClient,
                    )
                prepare.assert_not_called()


if __name__ == "__main__":
    unittest.main()
