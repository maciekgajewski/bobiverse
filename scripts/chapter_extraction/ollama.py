from __future__ import annotations

import ipaddress
import json
import socket
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any


class OllamaError(RuntimeError):
    """A source-free local-provider failure."""


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(
        self,
        request: urllib.request.Request,
        file_pointer: Any,
        code: int,
        message: str,
        headers: Any,
        new_url: str,
    ) -> None:
        raise urllib.error.HTTPError(
            request.full_url,
            code,
            "Redirects are prohibited for the local extraction provider.",
            headers,
            file_pointer,
        )


@dataclass(frozen=True)
class LocalEndpoint:
    configured: str
    canonical: str


def validate_local_endpoint(endpoint: str) -> LocalEndpoint:
    parsed = urllib.parse.urlsplit(endpoint)
    if (
        parsed.scheme != "http"
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise OllamaError(
            "Endpoint must be a plain HTTP origin without credentials, path, "
            "query, or fragment."
        )
    try:
        port = parsed.port or 80
    except ValueError as error:
        raise OllamaError("Endpoint port is invalid.") from error
    try:
        address_rows = socket.getaddrinfo(
            parsed.hostname,
            port,
            type=socket.SOCK_STREAM,
        )
    except socket.gaierror as error:
        raise OllamaError("Endpoint hostname could not be resolved.") from error
    addresses = {row[4][0] for row in address_rows}
    if not addresses:
        raise OllamaError("Endpoint hostname resolved to no addresses.")
    if any(not ipaddress.ip_address(address).is_loopback for address in addresses):
        raise OllamaError("Endpoint must resolve exclusively to loopback addresses.")
    chosen = sorted(
        addresses,
        key=lambda address: (
            ipaddress.ip_address(address).version != 4,
            address,
        ),
    )[0]
    literal = f"[{chosen}]" if ":" in chosen else chosen
    canonical = f"http://{literal}:{port}"
    return LocalEndpoint(configured=endpoint, canonical=canonical)


def _version_tuple(version: str) -> tuple[int, ...]:
    try:
        return tuple(int(part) for part in version.split("."))
    except ValueError as error:
        raise OllamaError("Ollama returned an invalid server version.") from error


class OllamaClient:
    def __init__(
        self,
        endpoint: LocalEndpoint,
        *,
        connect_timeout_seconds: int,
        response_timeout_seconds: int,
    ) -> None:
        self.endpoint = endpoint
        self.connect_timeout_seconds = connect_timeout_seconds
        self.response_timeout_seconds = response_timeout_seconds
        self.opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}),
            NoRedirectHandler(),
        )

    def _request(
        self,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
        response_timeout: bool = False,
    ) -> dict[str, Any]:
        url = f"{self.endpoint.canonical}{path}"
        data = None
        headers = {"Accept": "application/json"}
        method = "GET"
        if payload is not None:
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json"
            method = "POST"
        request = urllib.request.Request(
            url,
            data=data,
            headers=headers,
            method=method,
        )
        timeout = (
            self.response_timeout_seconds
            if response_timeout
            else self.connect_timeout_seconds
        )
        try:
            with self.opener.open(request, timeout=timeout) as response:
                value = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            raise OllamaError(f"Local Ollama request failed with HTTP {error.code}.") from error
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            raise OllamaError("Local Ollama request failed.") from error
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise OllamaError("Local Ollama returned invalid JSON.") from error
        if not isinstance(value, dict):
            raise OllamaError("Local Ollama returned a non-object response.")
        return value

    def verify(self, model: str) -> dict[str, Any]:
        version_response = self._request("/api/version")
        version = version_response.get("version")
        if not isinstance(version, str) or _version_tuple(version) < (0, 5, 0):
            raise OllamaError("Ollama 0.5.0 or newer is required.")
        show = self._request("/api/show", payload={"model": model})
        capabilities = show.get("capabilities")
        if not isinstance(capabilities, list) or "thinking" not in capabilities:
            raise OllamaError("Configured model does not report thinking capability.")
        return {
            "ollama_version": version,
            "model_capabilities": sorted(
                item for item in capabilities if isinstance(item, str)
            ),
        }

    def ensure_unloaded(self, model: str) -> None:
        processes = self._request("/api/ps")
        models = processes.get("models", [])
        if not isinstance(models, list):
            raise OllamaError("Ollama process response is invalid.")
        if any(
            isinstance(item, dict)
            and (item.get("name") == model or item.get("model") == model)
            for item in models
        ):
            self._request(
                "/api/generate",
                payload={"model": model, "keep_alive": 0},
                response_timeout=True,
            )

    def chat(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request(
            "/api/chat",
            payload=payload,
            response_timeout=True,
        )

    def model_placement(self, model: str) -> dict[str, Any] | None:
        processes = self._request("/api/ps")
        models = processes.get("models", [])
        if not isinstance(models, list):
            return None
        for item in models:
            if not isinstance(item, dict):
                continue
            if item.get("name") != model and item.get("model") != model:
                continue
            size = item.get("size")
            size_vram = item.get("size_vram")
            return {
                "size_bytes": size if isinstance(size, int) else None,
                "size_vram_bytes": size_vram if isinstance(size_vram, int) else None,
            }
        return None
