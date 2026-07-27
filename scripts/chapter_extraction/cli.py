from __future__ import annotations

import argparse
import json
from pathlib import Path

from .ollama import OllamaError
from .workflow import ExtractionError, run_extraction


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="chapter-extract",
        description=(
            "Run one blind local-provider chapter extraction into an explicit "
            "temporary workspace outside the repository."
        ),
    )
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--chapter", required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser


def main(repository_root: Path) -> int:
    parser = build_parser()
    arguments = parser.parse_args()
    try:
        metrics = run_extraction(
            repository_root=repository_root,
            config_path=arguments.config,
            chapter=arguments.chapter,
            source_path=arguments.source,
            output_dir=arguments.output_dir,
        )
    except (ExtractionError, OllamaError) as error:
        parser.exit(2, f"error: {error}\n")
    print(
        json.dumps(
            {
                "chapter": metrics["chapter"],
                "attempt_count": metrics["attempt_count"],
                "sealed_sha256": metrics["sealed_sha256"],
                "metrics_file": (
                    arguments.output_dir.resolve()
                    / f'{arguments.chapter.replace(".", "-")}-metrics.json'
                ).as_posix(),
            },
            indent=2,
        )
    )
    return 0
