# BOB-008: Codex-assisted chapter extraction pilot

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-25

## Objective

Create and exercise a repository-local Codex skill that turns one lawfully obtained
plaintext chapter into an evidence-backed candidate chapter object. Prove the
blind-extraction, reconciliation, temporary validation, and human-approval workflow
with a dry run against chapter `1.1`.

## User-visible outcome

The Captain can invoke one repeatable workflow for a single plaintext chapter. Codex
first extracts source-grounded claims without seeing canonical narrative state, then
reconciles the sealed claims against only the state visible before that chapter,
validates a candidate outside the canonical corpus, and presents the candidate and its
evidence for approval. The pilot does not change canonical chapter data.

## Binding references

- `../technical-design.md`, Section 13
- `../implementation-plan.md`, Phase 4
- `../data-model-definition.md`, especially chapter sources, introductions, updates,
  appearances, events, and source/generated ownership
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0006-generalized-narrative-zero-state.md`
- `../adrs/0007-additional-narrative-entity-types.md`
- `../../AGENTS.md`

The accepted design already requires provider-independent, schema-constrained
candidates, evidence and confidence, name resolution, deterministic validation, a
human-reviewable diff, and explicit approval. This task implements a Codex workflow
within that boundary and does not require a new ADR.

## Decisions recorded

- The first extraction pass is deliberately blind to zero state, canonical chapters,
  generated projections, the canonical narrative schema, and entity names, IDs, and
  aliases. The orchestrator reads the schema and contracts before extraction, but
  stages only fact-free, verified structural excerpts when Pass 1 needs them.
- Pass 1 extracts source claims rather than prematurely deciding introductions and
  updates. It uses source-local mention IDs and seals its output before reconciliation.
- Pass 2 may classify a supported claim as `not-modeled` when it is intentionally
  omitted as incidental, redundant, or insufficiently identified. This keeps
  source support separate from editorial inclusion and requires a recorded reason.
- Plaintext input uses one UTF-8 file per chapter outside the repository. Its filename
  is `<book>.<chapter>.txt` or
  `<book>.<chapter> - <source title>.txt`; the filename is authoritative for an
  optional source title.
- The explicit target chapter must match the filename. The canonical title is the
  chapter component after the dot when the source has no title, or
  `<chapter component> - <source title>` when it does. Thus the chapter `1.1`
  candidate uses `1 - Bob Version 1.0`, while an untitled `1.3` uses `3`.
- Evidence identifies the exact source by SHA-256 and uses UTF-8 byte-offset ranges.
  Friendly evidence IDs and temporary excerpts support review; source text, excerpts,
  and the evidence ledger remain outside version control.
- The first pilot uses GPT-5.6 Sol with high reasoning in standard mode.
- Chapter `1.1` is a dry-run evaluation. Pass 2 reconciles against the pre-book zero
  state, validates a temporary corpus, and only then compares with the existing
  canonical `1.1.json`. It does not write canonical data.
- Kindle Computer Use is deferred. It may later verify questionable conversion or
  evidence, but it is not an input path for this pilot.

## In scope

- Add a repository-local `extract-bobiverse-chapter` Codex skill under
  `.codex/skills/`.
- Add the minimum deterministic helper needed to validate source naming, calculate
  the source fingerprint, present bounded source chunks with byte offsets, seal exact
  evidence excerpts as byte ranges, and render those ranges for human review.
- Keep intermediate claims, evidence, candidate JSON, and temporary corpus data under
  a newly created `/tmp` workspace.
- Define explicit phase gates that prohibit canonical-state reads during Pass 1 and
  prohibit canonical writes before human approval.
- Run blind Pass 1 in a fresh isolated Codex context so this task's prior inspection of
  canonical chapter `1.1` cannot contaminate extraction.
- Reconcile the sealed claims against zero state, classify introductions, updates,
  appearances, already-known facts, unsupported claims, and ambiguities, and assemble
  a candidate chapter object.
- Validate the candidate through the existing narrative CLI using an alternate
  temporary narrative root.
- Compare the validated candidate with canonical chapter `1.1` only after the
  candidate is sealed, and present the dry-run findings for human review.

## Out of scope

- Writing or changing canonical chapter JSON, including the acknowledged future title
  change for chapter `1.1`.
- Processing chapter `1.2` or any later chapter.
- A Qwen, Ollama, hosted-API, or provider-routing implementation.
- Kindle or other Computer Use automation.
- A review UI, bulk-book processing, unattended approval, or publication workflow.
- Committing source text, evidence excerpts, intermediate ledgers, model transcripts,
  generated candidates, or temporary narrative roots.

## Acceptance criteria

1. The repository-local skill has valid metadata, concise procedural instructions, and
   an explicit trigger for one-chapter Bobiverse extraction.
2. The workflow enforces a blind Pass 1, seals evidence-backed source claims before
   state access, and stops rather than guessing when evidence is missing or ambiguous.
3. The helper validates the explicit chapter against both supported filename forms,
   derives the agreed canonical title, fingerprints the exact UTF-8 bytes, and rejects
   invalid UTF-8 or a mismatched filename.
4. The helper emits bounded, ordered, overlapping source chunks with exact byte
   ranges; anchors exact excerpts uniquely or with an explicit occurrence; rejects a
   changed source fingerprint; and renders review excerpts from sealed offsets.
5. The skill preserves source/generated ownership, reader-order visibility,
   story-time projection, entity-reference ordering, unknown-location behavior, and
   original-summary requirements from the binding narrative contract.
6. A fresh isolated GPT-5.6 Sol/high run produces a sealed Pass 1 claim ledger for
   `../source-text/1.1 - Bob Version 1.0.txt` without reading canonical narrative
   state.
7. Pass 2 reconciles only after the ledger is sealed, validates the assembled
   candidate in a temporary corpus, and records ambiguities without inventing facts.
8. The existing canonical `1.1.json` is read only after candidate validation and used
   solely to evaluate omissions, unsupported claims, classification, and review time.
9. Canonical narrative data and source text remain unchanged and untracked; the task
   records validation evidence and any deviations before it can become `Done`.

## Validation commands

```bash
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py --help
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py \
  metadata --chapter 1.1 \
  --source "../source-text/1.1 - Bob Version 1.0.txt"
./node_modules/.bin/vitest run tests/unit/source-evidence-helper.test.ts
npm run typecheck
npm run lint
./bin/narrative-validate.sh
git diff --check
```

The pilot must additionally record the exact temporary-corpus validation command after
the workspace path is known.

## Risks and pilot constraints

- This thread has already inspected part of canonical chapter `1.1`; Pass 1 therefore
  requires a fresh isolated Codex context rather than relying on conversational
  discipline.
- Exact evidence excerpts may repeat. The helper must reject ambiguous matches unless
  the claim explicitly selects an occurrence.
- Fixed-size chunks may split sentences. Overlap reduces boundary loss, but the
  extractor must deduplicate claims across overlapping chunks.
- Model output may be schema-valid but factually incomplete or unsupported. Evidence,
  comparison with the existing reviewed chapter, and human approval remain mandatory.
- The title convention is accepted for the extraction workflow, but changing existing
  canonical chapter `1.1` is explicitly deferred beyond this dry run.

## Completion evidence

### Pilot execution

- The repository-local skill passed `quick_validate.py`; its helper passed Python
  compilation, `--help`, real-file metadata and manifest checks, synthetic sealing
  and review checks, temporary-corpus preparation, and negative checks for chapter
  mismatch and ambiguous evidence.
- The source was identified as chapter `1.1`, title
  `1 - Bob Version 1.0`, SHA-256
  `01be0cf8ed2122c42676b976c51c052e46ed2faac9fb1002c1534a369fa1c7e2`,
  and 18,076 UTF-8 bytes.
- The first isolated Pass 1 attempt was aborted before producing a claim ledger
  because its staged contract document contained an example disclosing canonical
  target-chapter facts. The clean retry excluded that document and all canonical
  narrative data.
- The clean fresh GPT-5.6 Sol/high retry processed all four source chunks and sealed
  65 claims with 27 source-local mentions. The sealed ledger SHA-256 was
  `873ff06cdc82432e86cb94325f21b423b34ac754b078b88142f55931797d39dd`.
  Draft claims, evidence excerpts, the sealed ledger, and model reports remained
  outside the repository under `/tmp`.
- Pass 1 found no explicit calendar date in the source. Because `date` is required by
  the chapter schema, candidate assembly cannot proceed without an editorial value.
  The Captain selected the evidence-pure policy: stop rather than inherit, infer, or
  invent the missing value.
- On 2026-07-25, the Captain approved `2016` as editorial metadata for chapter `1.1`.
  It is not a Pass 1 source claim. The pilot resumed with Pass 2.
- `quick_validate.py`, helper `--help`, real-source `metadata`,
  `./bin/narrative-validate.sh`, and `git diff --check` passed on 2026-07-25. The
  narrative validator required a permission-approved rerun because the sandbox
  blocked the local `tsx` IPC pipe; the unchanged command then reported the canonical
  corpus valid.
- Pass 2 reconciled all 65 claims against zero state. After human scope review, the
  final ledger contains 19 `introducing`, 3 `appearance`, 40 `not-modeled`, and 3
  `ambiguous` classifications.
  No claim was classified as unsupported or already known.
- The first temporary candidate passed local JSON Schema checks but failed the
  repository validator because it updated Bob in the same chapter that introduced
  him. The candidate was repaired without changing source facts: Bob's
  end-of-chapter state moved into his introduction, the road incident was ordered
  before Bob so `death_event_id` points backward, and the event's optional reverse
  participant reference was omitted.
- The corrected candidate passed:
  `./node_modules/.bin/tsx scripts/narrative-cli.ts validate --root
/tmp/bobiverse-temp-corpus-pass2b-20260725`.
- Only after that validation, the pilot compared the candidate with canonical
  `data/narrative/chapters/1/1.json`. Both agree on `2016`, Las Vegas, the lead, and
  the death sequence. The candidate applies the approved title convention, uses
  evidence-conservative death wording, introduces 11 entities rather than 3, and
  proposes different character and event IDs. These editorial differences require
  human review; canonical data remains unchanged.
- The Captain selected balanced entity scope. The reviewed candidate retains Las
  Vegas, Bob, CryoEterna, InterGator Software, The Vortex, and the road incident;
  Carl, Karen, Alan, Andrea, and Alaina remain evidence-backed `not-modeled` claims.
  The reduced candidate passed local claim/pointer checks and temporary-corpus
  validation at `/tmp/bobiverse-temp-corpus-pass2c-20260725`.
- The Captain selected the existing `character:robert-johansson` canonical ID and
  the display name `Robert Johansson`; `Bob` is retained as a source-supported alias.
- The Captain selected the neutral `event:bob-road-incident` ID rather than preserving
  `event:robert-johansson-dies`. Its reader-visible description must retain the
  indirect-evidence caveat.
- The Captain selected `Presumed dead after the road incident.` as Robert's
  end-of-chapter state. The candidate omits formal `death_date` and `death_event_id`
  fields.
- The Captain approved the neutral road-incident event and its evidence-caveated
  collision/death description. No human-review items remain unresolved.
- After the post-validation canonical comparison, the Captain approved retaining
  Robert's existing `species_id: "species:human"` as reviewed canonical metadata,
  explicitly separate from Pass 1 source claims.
- The fully reviewed candidate, reconciliation ledger, evidence reviews, and Pass 2
  report remain outside version control under
  `/tmp/bobiverse-pass2-soEy2hln/`.
- The final candidate passed local schema, claim/evidence, JSON-pointer, and empty
  review-ledger checks. It also passed the authoritative command:
  `./node_modules/.bin/tsx scripts/narrative-cli.ts validate --root
/tmp/bobiverse-temp-corpus-pass2-approved-20260725`.
- The final canonical comparison was reviewed. The canonical corpus separately passed
  `./bin/narrative-validate.sh`; `quick_validate.py`, helper `--help`, real-source
  `metadata`, and `git diff --check` also passed.
- The dry run stopped without writing canonical chapter JSON. Source text and all
  evidence-bearing intermediate artifacts remain outside the repository.
- A post-pilot ergonomics fix added the minimal invocation contract to `SKILL.md` and
  updated `agents/openai.yaml`. The Captain now supplies only the chapter reference
  and source path; review-only behavior and all safety gates are internal defaults.
- Independent review found and the implementation fixed a sealed-ledger envelope
  injection path, pilot facts embedded in blind-pass examples, conditional rather
  than mandatory Pass 1 isolation, canonical constants exposed by the full schema,
  and a non-existent default source path. Regression coverage now checks trusted
  envelope ownership and the blind-pass boundary. The final fresh review returned
  `No findings.`
- The final skill validator, three focused Vitest checks, Prettier check, Python
  compilation, TypeScript typecheck, ESLint, and `git diff --check` all pass.

All acceptance criteria are complete.
