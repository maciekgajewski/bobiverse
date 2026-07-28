# Qwen3 14B no-thinking extraction experiment

Date: 2026-07-27
Outcome: Failed; stop after chapter 1.1

## Hypothesis

The BOB-025 runs may have exhausted their 8,192-token generation budget because
thinking consumed tokens needed by the structured ledger.

## Change

`config/chapter-extraction-qwen3-14b-no-think.json` differs from the BOB-025 baseline
only in `think: false`. The experiment retained the model, 32,768-token context,
8,192-token generation budget, prompt, schema, seed, chunking, validation, sealing,
and retry policy.

Chapter 1.1 was selected as the largest of the three reviewed BOB-025 pilot chapters
by UTF-8 source size: 18,076 bytes. It is not the largest chapter in the complete
source directory.

## Command

```bash
./bin/chapter-extract \
  --config config/chapter-extraction-qwen3-14b-no-think.json \
  --chapter 1.1 \
  --source '/home/maciek/bobiverse-project/source-text/1.1 - Bob Version 1.0.txt' \
  --output-dir /tmp/qwen-no-think-1-1-q6kKwY
```

## Result

- Result: terminal failure; no ledger produced.
- Attempts: 1; provider termination failures are not retryable.
- Generated tokens: 8,192.
- Wall time: 218.685 seconds.
- Cold load: 2.611 seconds.
- Effective time: 216.074 seconds.
- Placement: 14,373,334,547 of 14,373,334,547 model bytes in VRAM.
- Config SHA-256:
  `0525891c5eab761521fcc67c03865bb58b112b2dd213b6d365a34c1b24ca8a00`.

The comparable thinking-enabled BOB-025 run also stopped at 8,192 generated tokens
and took 234.771 effective seconds. Disabling thinking improved effective time by
about 8%, but it still did not finish and remained about 1.54 times slower than the
140.550-second Terra/high comparator.

The early-stop rule therefore skipped chapters 1.2 and 1.8. The thinking flag is not
the primary blocker. A further experiment would need to reduce or split the required
structured output rather than repeat this configuration with a larger generation
budget.
