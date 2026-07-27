#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "--help" ]]; then
  echo "Usage: ./bin/narrative-generate.sh [--chapter BOOK.CHAPTER] [--output PATH]"
  echo "Generate a reader-safe narrative projection."
  exit 0
fi

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"

exec ./node_modules/.bin/tsx scripts/narrative-cli.ts generate "$@"
