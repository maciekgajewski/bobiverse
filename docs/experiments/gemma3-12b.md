# Gemma3 12B extraction experiment

Date: 2026-07-28
Outcome: Failed; stop after chapter 1.1

## Setup

The locally installed `gemma3:12b` model was tested through the existing Ollama
extraction boundary with thinking disabled, temperature zero, seed 42, a
32,768-token context, and an 8,192-token generation limit. Relative to the Qwen
no-thinking experiment, only the model name changed.

The provider capability check was made conditional on the configured thinking flag
because Gemma correctly reports completion capability without thinking capability.
The machine schema was also aligned with the authoritative local validator so
nullable uncertainty fields accept `null` or a nonempty string, but not an empty
string.

## Synthetic smoke test

Command:

```bash
./bin/chapter-extract \
  --config config/chapter-extraction-gemma3-12b.json \
  --chapter 9.9 \
  --source /tmp/bob025-redacted-source/9.9.txt \
  --output-dir /tmp/gemma-smoke-bdtSzx
```

The synthetic ledger sealed on attempt 3 after two exact-evidence corrections:

- effective time: 54.344 seconds;
- generated tokens per attempt: 736, 849, and 743;
- placement: 8,074,129,571 of 8,074,129,571 model bytes in VRAM.

## Chapter 1.1

Chapter 1.1 is the largest of the three reviewed BOB-025 pilot chapters by UTF-8
source size, not the largest chapter in the complete source directory.

Command:

```bash
./bin/chapter-extract \
  --config config/chapter-extraction-gemma3-12b.json \
  --chapter 1.1 \
  --source '/home/maciek/bobiverse-project/source-text/1.1 - Bob Version 1.0.txt' \
  --output-dir /tmp/gemma-1-1-52jFYj
```

Result:

- no ledger produced;
- attempt 1 generated 7,043 tokens but referenced unresolved lead-mention IDs;
- the allowed ledger-contract correction exhausted 8,192 tokens without a clean
  terminal response;
- wall time: 352.366 seconds;
- cold load: 4.242 seconds;
- effective time: 348.125 seconds;
- placement: 8,074,129,571 of 8,074,129,571 model bytes in VRAM;
- config SHA-256:
  `2f76c4d9278f7f771741ad9035afe193f6fc91a828a8b9a8eef778eb93ad9a5a`.

Terra/high sealed the same chapter in 140.550 seconds. Gemma was about 2.48 times
slower and did not seal, so the early-stop rule skipped chapters 1.2 and 1.8.

Gemma3 12B is not suitable for the current single-request full-ledger contract. It
avoids Qwen's immediate runaway on small input, but the real chapter still produces
an oversized response and fails bounded correction.
