# BOB-025: local Qwen chapter-extraction shadow pilot

Status: Ready
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-27

## Objective

Add a provider-independent Python command-line path for blind chapter-claim
extraction using the local `qwen3:14b` model through Ollama. Exercise it in a
three-chapter shadow trial against independent Codex Terra/high Pass 1 runs, measure
quality, speed, reliability, and review effort, and record whether the local provider
is ready to become the default Pass 1 extractor.

This task implements local Qwen only for blind Pass 1. A later task may extend the
same provider boundary into Pass 2 reconciliation and candidate assembly, but only
after this task passes its decision gate and the Captain authorizes that evolution.

## User-visible outcome

The Captain can invoke one explicit command in `bin/` with a checked-in non-secret
configuration, chapter reference, source path, and temporary output workspace. The
command sends the complete labeled blind-extraction input to the local Ollama server,
produces a claim ledger that passes the existing deterministic evidence-sealing
contract, and leaves canonical narrative data untouched.

The extraction skill can run Qwen and Codex Terra/high independently for chapters
`1.1`, `1.2`, and `1.8`, then present an evidence-backed comparison and a recorded
go/no-go result. Neither provider's output is treated as authority.

## Binding references

- `../technical-design.md`, Section 13
- `../implementation-plan.md`, Phase 4
- `../chapter-extraction.md`
- `../data-model-definition.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0006-generalized-narrative-zero-state.md`
- `../adrs/0007-additional-narrative-entity-types.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../adrs/0009-year-only-state-write-chapter-order.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../.codex/skills/extract-bobiverse-chapter/references/claim-ledger.md`
- `../../AGENTS.md`

The accepted technical design already requires a provider-independent extraction
boundary, schema-constrained candidates, source evidence, deterministic validation,
human review, and explicit approval. This task adds a local provider within that
boundary. It does not change narrative authority, spoiler semantics, deployment,
runtime application dependencies, or the rule that book text and extraction
artifacts remain outside version control, so it does not require an ADR.

## Decisions

### Delivery boundary

- Implement the pilot as one cohesive task: local provider, skill integration,
  three-chapter trial, adjudication, and recorded decision.
- Add a generic executable Python CLI at `bin/chapter-extract`. Keep provider
  adapters and other agent-facing implementation modules outside `bin/`; `bin/`
  remains only the supported user-facing command surface.
- Preserve `source_evidence.py` as the deterministic source fingerprinting, chunking,
  exact-evidence, sealing, review, and temporary-corpus authority. Provider code must
  not duplicate or weaken those checks.
- Use Python's standard library, including `urllib`, for the Ollama transport. Do not
  add an Ollama, HTTP, schema-validation, or model-framework dependency.
- Keep the Codex workflow available throughout the pilot. Passing the pilot permits a
  later default-provider decision; it does not remove the Terra path or implement
  Qwen Pass 2.

### Explicit runtime configuration

- Add a checked-in, non-secret JSON configuration for the local provider. Invocation
  must require the exact config path; there is no implicit config search, environment
  fallback, endpoint default, or model default.
- This provider is local-only. Resolve and canonicalize the configured endpoint
  before reading the source; require plain HTTP with no credentials, query, or
  fragment, and require every resolved address to be loopback. Reject redirects
  rather than following them. A non-loopback, unresolvable, or redirected endpoint
  must fail before any source byte enters a request.
- The initial configuration names:
  - provider `ollama`;
  - endpoint `http://127.0.0.1:11434`;
  - model `qwen3:14b`;
  - native non-streaming `POST /api/chat`;
  - thinking enabled;
  - temperature `0`;
  - a fixed seed;
  - explicit context, generation, connection, response-timeout, keep-alive, and retry
    limits.
- The configuration and run report must record the installed Ollama version. The
  design was verified against local Ollama `0.30.8`; implementation must fail clearly
  when a required API capability is unavailable.
- A preflight context guard must account for the complete system prompt, user prompt,
  labeled evidence chunks, structured-output contract, and configured generation
  reserve. It must stop before inference rather than silently truncate an over-budget
  chapter.
- Resolve the source path before reading it and require it to remain outside the
  repository. Reject repository-contained paths reached directly, through `..`, or
  through symlinks.

### Blind Qwen Pass 1

- Generate the existing manifest and send all labeled chunks in one request. The
  model receives the complete chapter view once, including overlap markers, and the
  ledger records every processed chunk ID. The implementation must not duplicate
  overlap claims.
- Stage only the same fact-free materials allowed by the existing blind Pass 1:
  extraction instructions, claim-ledger contract, source metadata, and source chunks.
  Do not expose the narrative schema, zero state, canonical corpus, generated
  projections, stable IDs or aliases, fixtures, target chapter, or later chapters.
- Supply an explicit JSON Schema through Ollama's structured-output `format` field.
  Use the same fact-free contract as the local strict ledger validator; do not rely on
  prompt-only JSON compliance.
- Qwen's thinking field and raw response are transient in memory and are never
  persisted. Persist under the explicitly supplied temporary workspace only:
  - the validated draft ledger with its short exact evidence excerpts;
  - the sealed ledger without excerpts;
  - source-free run metadata and performance metrics.
- Reject any output path inside the repository. Never print the source, full prompt,
  raw response, thinking trace, or evidence excerpts to normal logs or error output.
- Allow one initial inference plus at most two automated correction attempts. Retry
  only deterministic JSON parsing, ledger-contract, processed-chunk, or exact-evidence
  failures. Each correction remains blind and may receive only source-local
  deterministic error details. Never retry against canonical state or silently repair
  model JSON in application code.
- A run succeeds only when the final draft passes the strict local contract and
  `source_evidence.py seal` without manual JSON editing. Preserve automatic-attempt
  counts and timing in source-free metrics.

### Independent Terra comparison

- Run the comparator as a fresh isolated Codex Terra context with high reasoning for
  each chapter. Do not add a Terra API adapter, credentials, or an external-provider
  transport to the Python CLI.
- Terra and Qwen receive equivalent blind Pass 1 materials. They do not see each
  other's outputs, canonical narrative state, the target chapter, or adjudication
  results before their ledgers are sealed.
- Run chapters `1.1`, `1.2`, and `1.8`, the three largest reviewed source chapters
  currently available:
  - `1.1`: 18,076 UTF-8 bytes;
  - `1.2`: 17,594 UTF-8 bytes;
  - `1.8`: 11,039 UTF-8 bytes.
- Read reviewed canonical target data only after both ledgers for that chapter are
  sealed. Treat Terra, Qwen, and canonical data as comparison inputs, not individual
  ground truth. Human adjudication owns materiality and correctness.
- Record per-provider end-to-end blind Pass 1 wall time. For Qwen, also record
  Ollama's load, prompt-evaluation, and generation durations and token counts. Exclude
  the reported cold model-load duration from the Qwen speed ratio, but report it
  separately.
- Record human review time separately for each provider using the same review
  procedure and evidence presentation.

## In scope

- Add the user-facing Python extraction command beneath `bin/`, with concise,
  side-effect-free `--help`.
- Add fact-free provider, prompt assembly, contract-validation, configuration, output
  safety, retry, and metrics implementation.
- Add the checked-in non-secret local Qwen configuration.
- Reuse and, where necessary, strengthen the existing claim-ledger and evidence helper
  contracts without changing their source-fact meaning.
- Add redacted fixtures and automated regression coverage for configuration,
  loopback endpoint enforcement, redirect rejection, structured request assembly,
  blind-input exclusions, context rejection, response validation, retry limits,
  source/output-path safety, non-persistence of raw/thinking data, metrics, and
  evidence sealing.
- Audit every current documentation page and test for direct operator invocations,
  not only the existing `bin/` files. Move or wrap every supported user entry point
  under `bin/`, including the documented galactic-starfield conversion command, and
  update its operator documentation. Keep underlying agent-facing implementation in
  `scripts/` when useful. Make every existing and new `bin/` command implement
  side-effect-free `--help`, and update command-surface tests so they distinguish
  supported user commands in `bin/` from agent-facing and internal tools in
  `scripts/`.
- Update the extraction skill and `docs/chapter-extraction.md` with provider selection,
  the Terra/high comparator, the local-Qwen command, artifact rules, and shadow-trial
  procedure.
- Execute and adjudicate the three dry-run chapter comparisons outside version
  control.
- Record the aggregate and per-chapter measurements, threshold calculations,
  deviations, and final go/no-go result in this task.

## Out of scope

- Using Qwen for Pass 2 reconciliation, canonical ID resolution, candidate chapter
  assembly, or canonical diff authoring.
- Making Qwen the default extractor without a passing gate and a separately recorded
  Captain decision.
- Removing the Terra workflow or changing the provider used by unrelated repository
  work.
- Writing or changing canonical chapter JSON during the shadow trial.
- Sending source text to a new external provider or adding provider credentials.
- Persisting full prompts, raw model responses, thinking traces, source chapters, or
  evidence excerpts in the repository.
- Reading later chapters or canonical state during either blind Pass 1.
- Implementing multi-request chunk map/reduce or an adaptive fallback for chapters
  that fail the context guard.
- Adding a review UI, bulk-book processing, unattended approval, or Qwen Pass 2.

## Decision gate

The trial passes only when all of the following hold across the adjudicated chapters:

1. **Evidence correctness:** 100% of accepted Qwen claims have semantically supporting
   sealed evidence. A fabricated excerpt or material unsupported factual claim fails
   the trial.
2. **Material-claim recall:** Qwen captures at least 95% of the human-adjudicated
   material-claim union from Qwen, Terra, and the reviewed canonical chapter.
3. **Unsupported claims:** Qwen produces no high-impact unsupported claim, and minor
   unsupported claims are no more than 1% of its factual claims.
4. **Performance:** aggregate Qwen end-to-end blind Pass 1 time, after subtracting
   Ollama-reported cold load duration, is at least twice as fast as aggregate
   Terra/high time. Per-chapter timings are still reported.
5. **Review effort:** aggregate human time needed to review and correct Qwen output is
   no more than 125% of the equivalent Terra review time.
6. **Reliability:** all three Qwen runs produce parseable, contract-valid ledgers that
   seal successfully without manual JSON repair. Bounded automatic retries are
   allowed and reported.

The adjudication report must show the numerator, denominator, exclusions, and
materiality decision for every calculated rate. A failed or unmeasurable criterion
produces a no-go result; it is not silently waived. The Captain decides whether a
passing result authorizes a follow-up task for Qwen Pass 2.

## Pre-run measurement protocol

Freeze the comparison protocol before either provider sees any of the three source
chapters. Store its source-free record and SHA-256 under the temporary trial workspace
and copy the protocol, without source text or evidence excerpts, into this task's
completion evidence before recording results. The protocol must contain:

- repository commit, task revision, config SHA-256, prompt-contract SHA-256, model
  name, Ollama version, source fingerprints, chapter order, and reviewer-order seed;
- one fixed chapter order: `1.1`, `1.2`, then `1.8`;
- fresh isolated Terra/high contexts and a deliberately unloaded Qwen model before
  each measured Qwen run; Qwen load duration is reported and subtracted exactly once
  from that run, while all prompt evaluation, generation, retries, validation, and
  sealing time remains included;
- an end-to-end timer that starts when the provider-specific run receives its first
  permitted prepared input and ends only when the sealed-ledger SHA-256 is recorded;
  common manifest preparation performed once for both providers is excluded;
- failure and retry accounting: every attempt counts toward reliability and all
  correction-attempt time counts toward the provider's total;
- provider-neutral review packets with identical field order, evidence rendering,
  source access, and review instructions; provider identity and timing are hidden
  until both reviews for a chapter are complete;
- a seeded, pre-recorded counterbalanced order for reviewing Qwen and Terra packets
  across the three chapters;
- a review timer that starts when the reviewer opens a packet and stops after every
  claim is accepted, corrected, or rejected and every detected omission is recorded;
  pauses are excluded only when explicitly logged, while provider-specific correction
  and omission-remediation time is included; and
- union adjudication only after both independent packet reviews for a chapter. The
  adjudicator then classifies materiality, evidence support, unsupported claims, and
  omissions using Qwen, Terra, the source, and reviewed canonical data.

Do not change this protocol after opening a provider output. Record any unavoidable
deviation, and treat a deviation capable of changing a threshold result as an
unmeasurable criterion and therefore a no-go.

## Acceptance criteria

1. `bin/` is documented as the repository's user-facing command surface, while
   `scripts/` is documented as agent-facing and internal implementation space; all
   current documented operator commands follow that boundary, and every existing and
   new `bin/` command has regression-tested, side-effect-free `--help`.
2. The new Python CLI requires explicit config, chapter, source, and temporary output
   paths; provides side-effect-free `--help`; resolves paths; and rejects a source or
   output contained in the repository, including containment through traversal or
   symlinks.
3. The provider uses only standard-library HTTP against configured non-streaming
   Ollama `/api/chat`, verifies required capabilities, accepts only endpoints whose
   resolved addresses are all loopback, refuses redirects, and records the server
   version and exact non-secret run configuration.
4. One request carries every labeled source chunk and passes the preflight context
   guard without exposing canonical or later-chapter information.
5. Ollama receives a strict JSON Schema, and the same fact-free ledger contract is
   enforced locally before the existing helper seals exact evidence.
6. Thinking and raw responses are discarded, normal output and failures do not leak
   source content, and only approved temporary artifacts are written outside Git.
7. Temperature, seed, thinking, budgets, timeout, keep-alive, and three-attempt maximum
   are explicit and regression-tested; retries cannot gain canonical context.
8. Redacted automated tests cover the successful path and every safety or reliability
   mechanism changed by this task.
9. Fresh Terra/high and local-Qwen Pass 1 runs for chapters `1.1`, `1.2`, and `1.8`
   follow the frozen pre-run protocol, produce independent sealed ledgers, and produce
   complete timing and review records.
10. Human adjudication reports each decision-gate calculation and source-fidelity
    finding without treating Terra or canonical data as sole authority.
11. Canonical narrative data remains unchanged, all source/evidence/model artifacts
    remain outside version control, and the task records an explicit go/no-go result.
12. Directly affected skill, extraction documentation, CLI documentation, and task
    index remain consistent with the implemented workflow.

## Validation commands

The implementation must add the `bin/chapter-extract` command before running its
direct CLI checks. The task's complete validation path is:

```bash
./bin/chapter-extract --help
./bin/convert-galactic-starfield --help
./bin/narrative-generate.sh --help
./bin/narrative-validate.sh --help
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py --help
./node_modules/.bin/vitest run tests/unit/script-help.test.ts
./node_modules/.bin/vitest run tests/unit/source-evidence-helper.test.ts
./.venv/bin/python -m unittest discover -s tests/python -p 'test_*.py'
npm run format:check
npm run lint
npm run typecheck
./bin/narrative-validate.sh
git diff --check
```

The implementation must also record the exact three Qwen commands, the three isolated
Terra/high invocations, ledger SHA-256 values, retry counts, timing artifacts, and
adjudication procedure after the temporary workspace paths are known. These are
dry-run evaluations and must not write canonical data.

## Risks and cautions

- A 14.8-billion-parameter quantized local model may be fast but materially less
  complete than Terra/high. Structured output and exact evidence prevent some failure
  modes but do not establish semantic correctness.
- Thinking and a large structured ledger compete for the configured context window.
  The preflight guard and termination checks must distinguish a clean stop from
  truncation.
- A JSON Schema can constrain representation while still permitting omissions,
  misinterpretation, duplicate overlap claims, or semantically irrelevant evidence.
- Correct exact excerpts may not support the statement attached to them. Human
  source-fidelity adjudication remains required.
- Model load placement affects performance. The trial must record whether Ollama
  loaded the model on CPU, GPU, or both rather than attributing infrastructure
  fallback to model quality.
- Chapter `1.1` has approved editorial metadata and an event exception, and chapter
  `1.2` has later-reviewed naming and state corrections. Those canonical decisions
  may inform post-seal adjudication but must never leak into either blind extraction.
- The three-chapter pilot provides a bounded go/no-go signal, not proof across the
  full corpus. Passing permits controlled evolution; it does not justify unattended
  extraction or canonical publication.
