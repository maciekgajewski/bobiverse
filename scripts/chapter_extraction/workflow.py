from __future__ import annotations

import hashlib
import json
import re
import subprocess
import tempfile
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .contract import ContractError, LEDGER_SCHEMA, validate_ledger
from .ollama import OllamaClient, OllamaError, validate_local_endpoint


class ExtractionError(RuntimeError):
    """A source-free extraction failure suitable for command-line output."""


class ProviderResponseError(ExtractionError):
    """A provider response that did not reach deterministic ledger validation."""


class EvidenceSealError(ExtractionError):
    """An evidence failure with separate safe and model-only correction detail."""

    def __init__(self, safe_detail: str, model_detail: str) -> None:
        super().__init__(safe_detail)
        self.model_detail = model_detail


CONFIG_FIELDS = {
    "format_version",
    "provider",
    "endpoint",
    "model",
    "api_path",
    "stream",
    "think",
    "temperature",
    "seed",
    "num_ctx",
    "num_predict",
    "connect_timeout_seconds",
    "response_timeout_seconds",
    "keep_alive",
    "max_attempts",
    "chunk_bytes",
    "overlap_bytes",
}


@dataclass(frozen=True)
class ExtractionConfig:
    format_version: int
    provider: str
    endpoint: str
    model: str
    api_path: str
    stream: bool
    think: bool
    temperature: int | float
    seed: int
    num_ctx: int
    num_predict: int
    connect_timeout_seconds: int
    response_timeout_seconds: int
    keep_alive: str
    max_attempts: int
    chunk_bytes: int
    overlap_bytes: int

    @classmethod
    def load(cls, path: Path) -> tuple["ExtractionConfig", str]:
        try:
            raw_bytes = path.read_bytes()
            value = json.loads(raw_bytes.decode("utf-8"))
        except OSError as error:
            raise ExtractionError("Could not read extraction config.") from error
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ExtractionError("Extraction config must be valid UTF-8 JSON.") from error
        if not isinstance(value, dict) or set(value) != CONFIG_FIELDS:
            raise ExtractionError("Extraction config fields do not match the contract.")
        config = cls(**value)
        config.validate()
        return config, hashlib.sha256(raw_bytes).hexdigest()

    def validate(self) -> None:
        if self.format_version != 1 or self.provider != "ollama":
            raise ExtractionError("Unsupported extraction config version or provider.")
        if self.api_path != "/api/chat" or self.stream is not False:
            raise ExtractionError("Provider must use non-streaming /api/chat.")
        if self.think is not True or self.temperature != 0:
            raise ExtractionError("Thinking must be enabled and temperature must be zero.")
        for label, value in (
            ("seed", self.seed),
            ("num_ctx", self.num_ctx),
            ("num_predict", self.num_predict),
            ("connect_timeout_seconds", self.connect_timeout_seconds),
            ("response_timeout_seconds", self.response_timeout_seconds),
            ("max_attempts", self.max_attempts),
            ("chunk_bytes", self.chunk_bytes),
        ):
            if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
                raise ExtractionError(f"Config field {label} must be a positive integer.")
        if self.max_attempts != 3:
            raise ExtractionError("Config must allow exactly three total attempts.")
        if (
            not isinstance(self.overlap_bytes, int)
            or isinstance(self.overlap_bytes, bool)
            or self.overlap_bytes < 0
            or self.overlap_bytes >= self.chunk_bytes
        ):
            raise ExtractionError("Config overlap_bytes is invalid.")
        if not isinstance(self.keep_alive, str) or not self.keep_alive:
            raise ExtractionError("Config keep_alive must be a nonempty string.")
        if not isinstance(self.model, str) or not self.model:
            raise ExtractionError("Config model must be a nonempty string.")


SYSTEM_PROMPT = """You are a blind source-claim extractor for one fiction chapter.
Use only the supplied source chunks. Do not use model memory, canonical IDs, later
knowledge, or editorial significance gates. Return one JSON object matching the
provided schema. Preserve source-primary names and acronyms. Use source-local
mention:* IDs and consecutive claim:NNN IDs. Capture metadata, identities,
appearances, locations and movement at source granularity, events and participants,
state, relationships, definitions, functions, capabilities, limitations, acronym
expansions, uncertainty, and a concise original summary. Every factual claim needs a
short exact source excerpt copied byte-for-byte from one labeled chunk. Prefer a
single-line phrase; preserve capitalization, punctuation, and whitespace, and never
paraphrase inside evidence.quote. Verify every quote is an exact contiguous source
substring before returning. Deduplicate overlap between labeled chunks. Record all
processed chunk IDs in manifest order. Missing facts remain explicit uncertainty."""
CORRECTION_PROMPT_TEMPLATE = (
    "The prior attempt failed deterministic validation with code {code}: {detail} "
    "Produce a complete fresh ledger from the same source-only input. Do not omit "
    "fields or claims merely to avoid the error."
)
EVIDENCE_CORRECTION_INSTRUCTION = (
    " For evidence_seal failures, replace evidence for the named claim with a "
    "shorter byte-exact phrase wholly inside one labeled chunk."
)
PROMPT_FORMAT_VERSION = 2
MAX_CORRECTION_DETAIL_BYTES = 500


def _sha256_json(value: Any) -> str:
    encoded = json.dumps(
        value,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _inside(path: Path, root: Path) -> bool:
    return path == root or path.is_relative_to(root)


def validate_paths(
    repository_root: Path,
    source: Path,
    output_dir: Path,
) -> tuple[Path, Path]:
    repository_root = repository_root.resolve()
    try:
        source = source.resolve(strict=True)
    except OSError as error:
        raise ExtractionError("Source path does not resolve to a file.") from error
    if not source.is_file() or _inside(source, repository_root):
        raise ExtractionError("Source must be a file outside the repository.")
    try:
        output_dir = output_dir.resolve(strict=True)
    except OSError as error:
        raise ExtractionError("Output directory must already exist.") from error
    if not output_dir.is_dir() or _inside(output_dir, repository_root):
        raise ExtractionError("Output must be a directory outside the repository.")
    return source, output_dir


def _helper(repository_root: Path) -> Path:
    return (
        repository_root
        / ".codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py"
    )


def _helper_json(
    repository_root: Path,
    arguments: list[str],
) -> dict[str, Any]:
    result = subprocess.run(
        ["python3", str(_helper(repository_root)), *arguments],
        cwd=repository_root,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise ExtractionError(result.stderr.strip() or "Evidence helper failed.")
    try:
        value = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ExtractionError("Evidence helper returned invalid JSON.") from error
    if not isinstance(value, dict):
        raise ExtractionError("Evidence helper returned a non-object response.")
    return value


def prepare_blind_input(
    repository_root: Path,
    config: ExtractionConfig,
    chapter: str,
    source: Path,
) -> tuple[dict[str, Any], list[dict[str, Any]], str]:
    manifest = _helper_json(
        repository_root,
        [
            "manifest",
            "--chapter",
            chapter,
            "--source",
            str(source),
            "--chunk-bytes",
            str(config.chunk_bytes),
            "--overlap-bytes",
            str(config.overlap_bytes),
        ],
    )
    source_metadata = manifest.get("source")
    raw_chunks = manifest.get("chunks")
    if not isinstance(source_metadata, dict) or not isinstance(raw_chunks, list):
        raise ExtractionError("Evidence manifest response is invalid.")
    chunks: list[dict[str, Any]] = []
    for index in range(1, len(raw_chunks) + 1):
        chunk = _helper_json(
            repository_root,
            [
                "chunk",
                "--chapter",
                chapter,
                "--source",
                str(source),
                "--chunk-bytes",
                str(config.chunk_bytes),
                "--overlap-bytes",
                str(config.overlap_bytes),
                "--index",
                str(index),
            ],
        )
        chunks.append(chunk)
    prompt_manifest = {
        "format_version": PROMPT_FORMAT_VERSION,
        "chapter": chapter,
        "source": source_metadata,
        "chunk_bytes": manifest.get("chunk_bytes"),
        "overlap_bytes": manifest.get("overlap_bytes"),
        "chunks": raw_chunks,
    }
    prompt_parts = [
        "BLIND EXTRACTION INPUT",
        "The BEGIN/END delimiter lines are not source text.",
        "METADATA AND MANIFEST:",
        json.dumps(prompt_manifest, ensure_ascii=False, separators=(",", ":")),
    ]
    for chunk in chunks:
        chunk_id = chunk.get("chunk_id")
        start = chunk.get("start_byte")
        end = chunk.get("end_byte")
        text = chunk.get("text")
        if (
            not isinstance(chunk_id, str)
            or not isinstance(start, int)
            or not isinstance(end, int)
            or not isinstance(text, str)
        ):
            raise ExtractionError("Evidence chunk response is invalid.")
        prompt_parts.extend(
            [
                f"BEGIN SOURCE CHUNK {chunk_id} BYTES {start}:{end}",
                text,
                f"END SOURCE CHUNK {chunk_id}",
            ]
        )
    prompt = "\n".join(prompt_parts)
    return source_metadata, chunks, prompt


def _context_guard(
    config: ExtractionConfig,
    user_prompt: str,
) -> dict[str, int]:
    system_bytes = len(SYSTEM_PROMPT.encode("utf-8"))
    prompt_bytes = len(user_prompt.encode("utf-8"))
    schema_bytes = len(
        json.dumps(LEDGER_SCHEMA, separators=(",", ":")).encode("utf-8")
    )
    correction_bytes = len(
        CORRECTION_PROMPT_TEMPLATE.format(
            code="provider_response",
            detail="x" * MAX_CORRECTION_DETAIL_BYTES,
        ).encode("utf-8")
        + EVIDENCE_CORRECTION_INSTRUCTION.encode("utf-8")
    )
    conservative_input_tokens = (
        system_bytes + prompt_bytes + schema_bytes + correction_bytes
    )
    if conservative_input_tokens + config.num_predict > config.num_ctx:
        raise ExtractionError(
            "Prepared request exceeds the configured conservative context budget."
        )
    return {
        "system_bytes": system_bytes,
        "prompt_bytes": prompt_bytes,
        "schema_bytes": schema_bytes,
        "maximum_correction_bytes": correction_bytes,
        "conservative_input_tokens": conservative_input_tokens,
        "generation_reserve_tokens": config.num_predict,
        "context_tokens": config.num_ctx,
    }


def _chat_payload(
    config: ExtractionConfig,
    prompt: str,
    correction: tuple[str, str] | None,
) -> dict[str, Any]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": prompt},
    ]
    if correction is not None:
        correction_code, correction_detail = correction
        targeted_instruction = (
            EVIDENCE_CORRECTION_INSTRUCTION
            if correction_code == "evidence_seal"
            else ""
        )
        messages.append(
            {
                "role": "user",
                "content": CORRECTION_PROMPT_TEMPLATE.format(
                    code=correction_code,
                    detail=correction_detail,
                )
                + targeted_instruction,
            }
        )
    return {
        "model": config.model,
        "messages": messages,
        "format": LEDGER_SCHEMA,
        "stream": config.stream,
        "think": config.think,
        "keep_alive": config.keep_alive,
        "options": {
            "temperature": config.temperature,
            "seed": config.seed,
            "num_ctx": config.num_ctx,
            "num_predict": config.num_predict,
        },
    }


def _error_code(error: Exception) -> str:
    if isinstance(error, json.JSONDecodeError):
        return "invalid_json"
    if isinstance(error, ContractError):
        return "ledger_contract"
    if isinstance(error, ProviderResponseError):
        return "provider_response"
    if isinstance(error, ExtractionError):
        return "evidence_seal"
    return "provider_response"


def _error_detail(error: Exception) -> str:
    if isinstance(error, json.JSONDecodeError):
        return "Response content was not valid JSON."
    detail = " ".join(str(error).split())
    if not detail:
        return "Deterministic validation rejected the response."
    return detail[:500]


def _model_error_detail(error: Exception) -> str:
    detail = error.model_detail if isinstance(error, EvidenceSealError) else _error_detail(error)
    return detail.encode("utf-8")[:MAX_CORRECTION_DETAIL_BYTES].decode(
        "utf-8",
        errors="ignore",
    )


def _evidence_correction_detail(
    draft: dict[str, Any],
    source_text: str,
    safe_detail: str,
) -> str:
    claim_ids = list(dict.fromkeys(re.findall(r"claim:[0-9]+", safe_detail)))
    if not claim_ids:
        return safe_detail
    claims = draft.get("claims")
    if not isinstance(claims, list):
        return safe_detail
    hints: list[str] = []
    for claim_id in claim_ids:
        claim = next(
            (
                item
                for item in claims
                if isinstance(item, dict) and item.get("claim_id") == claim_id
            ),
            None,
        )
        if not isinstance(claim, dict):
            continue
        evidence = claim.get("evidence")
        if not isinstance(evidence, list):
            continue
        found_hint = False
        for item in evidence:
            if not isinstance(item, dict):
                continue
            quote = item.get("quote")
            if not isinstance(quote, str) or not quote or quote in source_text:
                continue
            words = quote.split()
            if not words:
                continue
            pattern = r"\s+".join(re.escape(word) for word in words)
            matches = list(re.finditer(pattern, source_text))
            if len(matches) == 1:
                exact = matches[0].group(0)
                hints.append(
                    f"For {claim_id}, use this byte-exact replacement including "
                    f"its whitespace: {json.dumps(exact, ensure_ascii=False)}."
                )
                found_hint = True
                break
        if not found_hint:
            hints.append(
                f"For {claim_id}, choose a shorter exact substring wholly inside "
                "one displayed source line."
            )
    return f"{safe_detail} {' '.join(hints)}"


def _seal(
    repository_root: Path,
    chapter: str,
    source: Path,
    draft: dict[str, Any],
    output_dir: Path,
) -> tuple[dict[str, Any], bytes]:
    draft_handle = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=output_dir,
        prefix=".draft-attempt-",
        suffix=".json",
        delete=False,
    )
    draft_path = Path(draft_handle.name)
    sealed_handle = tempfile.NamedTemporaryFile(
        dir=output_dir,
        prefix=".sealed-attempt-",
        suffix=".json",
        delete=False,
    )
    sealed_path = Path(sealed_handle.name)
    sealed_handle.close()
    sealed_path.unlink()
    try:
        with draft_handle:
            json.dump(draft, draft_handle, ensure_ascii=False, indent=2)
            draft_handle.write("\n")
        result = subprocess.run(
            [
                "python3",
                str(_helper(repository_root)),
                "seal",
                "--chapter",
                chapter,
                "--source",
                str(source),
                "--draft",
                str(draft_path),
                "--output",
                str(sealed_path),
            ],
            cwd=repository_root,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode != 0:
            safe_detail = result.stderr.strip() or "Evidence sealing failed."
            try:
                source_text = source.read_text(encoding="utf-8")
            except OSError:
                source_text = ""
            raise EvidenceSealError(
                safe_detail,
                _evidence_correction_detail(draft, source_text, safe_detail),
            )
        sealed_bytes = sealed_path.read_bytes()
        sealed = json.loads(sealed_bytes.decode("utf-8"))
        if not isinstance(sealed, dict):
            raise ExtractionError("Evidence helper returned an invalid sealed ledger.")
        return sealed, sealed_bytes
    finally:
        draft_path.unlink(missing_ok=True)
        sealed_path.unlink(missing_ok=True)


def _write_new(path: Path, value: bytes) -> None:
    if path.exists():
        raise ExtractionError("Output workspace already contains extraction artifacts.")
    temporary = path.with_name(f".{path.name}.tmp")
    if temporary.exists():
        raise ExtractionError("Output workspace contains an incomplete prior artifact.")
    temporary.write_bytes(value)
    temporary.replace(path)


def _require_unused_outputs(output_dir: Path, chapter: str) -> None:
    prefix = chapter.replace(".", "-")
    for suffix in ("draft.json", "sealed.json", "metrics.json"):
        path = output_dir / f"{prefix}-{suffix}"
        temporary = path.with_name(f".{path.name}.tmp")
        if path.exists() or temporary.exists():
            raise ExtractionError(
                "Output workspace already contains extraction artifacts."
            )


def _duration_summary(
    attempt_metrics: list[dict[str, Any]],
    wall_seconds: float,
) -> dict[str, float]:
    first_load_ns = (
        attempt_metrics[0].get("load_duration_ns", 0) if attempt_metrics else 0
    )
    load_seconds = (
        first_load_ns / 1_000_000_000 if isinstance(first_load_ns, int) else 0.0
    )
    return {
        "wall_duration_seconds": wall_seconds,
        "cold_load_duration_seconds": load_seconds,
        "effective_wall_duration_seconds": max(0.0, wall_seconds - load_seconds),
    }


def run_extraction(
    *,
    repository_root: Path,
    config_path: Path,
    chapter: str,
    source_path: Path,
    output_dir: Path,
    client_factory: Any = OllamaClient,
) -> dict[str, Any]:
    config, config_sha256 = ExtractionConfig.load(config_path.resolve())
    normalized_config = asdict(config)
    endpoint = validate_local_endpoint(config.endpoint)
    client = client_factory(
        endpoint,
        connect_timeout_seconds=config.connect_timeout_seconds,
        response_timeout_seconds=config.response_timeout_seconds,
    )
    provider_info = client.verify(config.model)
    client.ensure_unloaded(config.model)
    source, output_dir = validate_paths(repository_root, source_path, output_dir)
    _require_unused_outputs(output_dir, chapter)
    source_metadata, chunks, prompt = prepare_blind_input(
        repository_root,
        config,
        chapter,
        source,
    )
    source_sha256 = source_metadata.get("source_sha256")
    if not isinstance(source_sha256, str):
        raise ExtractionError("Evidence manifest omitted the source fingerprint.")
    expected_chunks = [chunk.get("chunk_id") for chunk in chunks]
    if not expected_chunks or not all(
        isinstance(chunk_id, str) for chunk_id in expected_chunks
    ):
        raise ExtractionError("Evidence chunks omitted ordered chunk IDs.")
    expected_chunk_ids = [str(chunk_id) for chunk_id in expected_chunks]
    context = _context_guard(config, prompt)

    start = time.monotonic()
    attempt_metrics: list[dict[str, Any]] = []
    correction: tuple[str, str] | None = None
    final_draft: dict[str, Any] | None = None
    final_sealed: dict[str, Any] | None = None
    final_sealed_bytes: bytes | None = None
    for attempt in range(1, config.max_attempts + 1):
        response = client.chat(_chat_payload(config, prompt, correction))
        try:
            message = response.get("message")
            if not isinstance(message, dict):
                raise ProviderResponseError(
                    "Provider response omitted message content."
                )
            content = message.get("content")
            if not isinstance(content, str):
                raise ProviderResponseError("Provider response content is invalid.")
            if response.get("done") is not True or response.get("done_reason") != "stop":
                raise ProviderResponseError(
                    "Provider response did not finish cleanly."
                )
            parsed = json.loads(content)
            draft = validate_ledger(
                parsed,
                chapter=chapter,
                source_sha256=source_sha256,
                expected_chunks=expected_chunk_ids,
            )
            sealed, sealed_bytes = _seal(
                repository_root,
                chapter,
                source,
                draft,
                output_dir,
            )
        except (json.JSONDecodeError, ContractError, ExtractionError) as error:
            correction_code = _error_code(error)
            correction_detail = _error_detail(error)
            correction = (correction_code, _model_error_detail(error))
            attempt_metrics.append(
                {
                    "attempt": attempt,
                    "status": "rejected",
                    "failure_code": correction_code,
                    "failure_detail": correction_detail,
                    **_response_metrics(response),
                }
            )
            terminal_failure = isinstance(error, ProviderResponseError)
            if terminal_failure or attempt == config.max_attempts:
                wall_seconds = time.monotonic() - start
                placement = client.model_placement(config.model)
                failure_metrics = {
                    "format_version": 1,
                    "status": "failed",
                    "chapter": chapter,
                    "source_sha256": source_sha256,
                    "provider": config.provider,
                    "endpoint": endpoint.configured,
                    "canonical_loopback_endpoint": endpoint.canonical,
                    "model": config.model,
                    "config_sha256": config_sha256,
                    "config": normalized_config,
                    "prompt_contract_sha256": hashlib.sha256(
                        (
                            f"prompt-format:{PROMPT_FORMAT_VERSION}\n{SYSTEM_PROMPT}"
                        ).encode("utf-8")
                    ).hexdigest(),
                    "ledger_schema_sha256": _sha256_json(LEDGER_SCHEMA),
                    **provider_info,
                    "context_guard": context,
                    "attempts": attempt_metrics,
                    "attempt_count": len(attempt_metrics),
                    **_duration_summary(attempt_metrics, wall_seconds),
                    "model_placement": placement,
                }
                prefix = chapter.replace(".", "-")
                _write_new(
                    output_dir / f"{prefix}-metrics.json",
                    (
                        json.dumps(failure_metrics, ensure_ascii=False, indent=2)
                        + "\n"
                    ).encode("utf-8"),
                )
                if terminal_failure:
                    raise ExtractionError(
                        "Provider response failed terminal validation without retry: "
                        f"{correction_code} ({correction_detail})"
                    ) from error
                raise ExtractionError(
                    "All provider attempts failed deterministic validation: "
                    + "; ".join(
                        f'{item["failure_code"]} ({item["failure_detail"]})'
                        for item in attempt_metrics
                    )
                ) from error
            continue
        attempt_metrics.append(
            {
                "attempt": attempt,
                "status": "accepted",
                "failure_code": None,
                **_response_metrics(response),
            }
        )
        final_draft = draft
        final_sealed = sealed
        final_sealed_bytes = sealed_bytes
        break

    if final_draft is None or final_sealed is None or final_sealed_bytes is None:
        raise ExtractionError("Provider completed without a sealed ledger.")
    sealed_sha256 = hashlib.sha256(final_sealed_bytes).hexdigest()
    wall_seconds = time.monotonic() - start
    placement = client.model_placement(config.model)
    draft_bytes = (
        json.dumps(final_draft, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    draft_sha256 = hashlib.sha256(draft_bytes).hexdigest()
    metrics = {
        "format_version": 1,
        "chapter": chapter,
        "source_sha256": source_sha256,
        "provider": config.provider,
        "endpoint": endpoint.configured,
        "canonical_loopback_endpoint": endpoint.canonical,
        "model": config.model,
        "config_sha256": config_sha256,
        "config": normalized_config,
        "prompt_contract_sha256": hashlib.sha256(
            (
                f"prompt-format:{PROMPT_FORMAT_VERSION}\n{SYSTEM_PROMPT}"
            ).encode("utf-8")
        ).hexdigest(),
        "ledger_schema_sha256": _sha256_json(LEDGER_SCHEMA),
        **provider_info,
        "context_guard": context,
        "attempts": attempt_metrics,
        "attempt_count": len(attempt_metrics),
        **_duration_summary(attempt_metrics, wall_seconds),
        "model_placement": placement,
        "draft_sha256": draft_sha256,
        "sealed_sha256": sealed_sha256,
    }
    prefix = chapter.replace(".", "-")
    _write_new(output_dir / f"{prefix}-draft.json", draft_bytes)
    _write_new(output_dir / f"{prefix}-sealed.json", final_sealed_bytes)
    metrics_bytes = (
        json.dumps(metrics, ensure_ascii=False, indent=2) + "\n"
    ).encode("utf-8")
    _write_new(output_dir / f"{prefix}-metrics.json", metrics_bytes)
    return metrics


def _response_metrics(response: dict[str, Any]) -> dict[str, int | None]:
    mapping = {
        "total_duration_ns": "total_duration",
        "load_duration_ns": "load_duration",
        "prompt_eval_count": "prompt_eval_count",
        "prompt_eval_duration_ns": "prompt_eval_duration",
        "eval_count": "eval_count",
        "eval_duration_ns": "eval_duration",
    }
    return {
        output: response.get(source) if isinstance(response.get(source), int) else None
        for output, source in mapping.items()
    }
