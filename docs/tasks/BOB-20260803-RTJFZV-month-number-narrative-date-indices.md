# BOB-20260803-RTJFZV: month-number narrative date indices

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-08-03

## Objective

Represent source-revealed months as within-year narrative date indices for the
affected 2158 chapter sequence, and prepare Chapters 1.34–1.36 as one validated,
spoiler-safe review chain without collapsing March, September, and October into tied
or incomparable moments.

## User-visible outcome

The 2158 timeline orders January, March, September, and October consistently. The
Chapter 1.34–1.36 candidates validate against that chronology. Exact-diff approval
keeps the result review-only; canonical application additionally requires a separate,
explicit instruction from the Captain to apply that approved diff.

## Binding references

- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0009-year-only-state-write-chapter-order.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`
- `../technical-design.md`, Section 12
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## Decisions

- For this affected, source-reviewed 2158 sequence, use each revealed month number as
  the otherwise opaque existing integer within-year ordering index.
- This is a bounded editorial choice of ordering values, not a change to `date`
  semantics. Consumers must not infer, label, or display a month from the index.
- The task does not establish a general month-encoding rule, infer months, or launch a
  corpus-wide historical migration. A broader semantic convention would require a
  separate architecture decision.
- Use `2158.1` for Chapter 1.31 (January), `2158.3` for Chapter 1.33 (March),
  `2158.9` for Chapters 1.34 and 1.36 (September), and `2158.10` for Chapter 1.32
  (October).
- Equal month indices mean the source places facts in the same month; chapter order
  does not override an equal explicit index.
- The values use the existing date schema and narrative-moment contract. They do not
  change comparison or projection code.
- Canonical narrative files remain unchanged after exact-diff approval. They may be
  written only after the Captain separately and explicitly instructs the agent to
  apply that exact approved combined diff.

## In scope

- Document the bounded 2158 ordering decision in this task, the extraction guidance,
  the eventual canonical chapter records, and append-only promotion records without
  making month semantics inferable from date indices.
- Prepare the exact canonical remediation for Chapters 1.31, 1.32, and 1.33.
- Assign `2158.9` to the review-only Chapter 1.34 and 1.36 candidates.
- Reconcile Chapter 1.36 against the corrected ordered candidate chain without
  changing its sealed source claims.
- Validate the temporary Chapter 1.34–1.36 chain with both narrative and astronomy
  validation paths.
- Produce a focused equal-`2158.9` collision audit covering state writes,
  appearances, dated events, activity, and every consumer that requires one uniquely
  latest fact.
- Present the exact combined diff for human review before any canonical write.

## Out of scope

- Changing the narrative date schema, comparator, projector, or user-interface date
  formatting.
- Inferring months for chapters whose source evidence records only a year.
- Auditing or rewriting historical dates outside the affected 2158 sequence.
- Inventing day-level order within a month.
- Promoting Chapters 1.34–1.36 or applying the Chapter 1.31–1.33 remediation from
  exact-diff approval alone, without the Captain's later explicit instruction to
  apply that exact approved diff.
- Committing source text, evidence ledgers, review excerpts, candidates, or temporary
  narrative roots.

## Acceptance criteria

1. The authoring guidance records the reviewed 2158 month numbers as opaque
   within-year ordering indices and explicitly prohibits consumers from inferring or
   displaying months from those values.
2. The temporary chain uses `2158.1`, `2158.3`, `2158.9`, and `2158.10` for the
   source-reviewed January, March, September, and October chapters respectively.
3. A focused audit enumerates every equal-`2158.9` state write, appearance, dated
   event, and activity overlap. It proves every required singular projection remains
   determinate and records any permitted equal-index activity ambiguity rather than
   treating validator success as proof.
4. The Chapter 1.34–1.36 candidates preserve sealed evidence, supplemental-mention
   completeness, source chronology, and all existing reader-visible state required
   by the extraction workflow.
5. The complete temporary corpus passes the authoritative narrative validator and
   the normal data/astronomy validator.
6. The review package shows source and ledger hashes, exact candidate hashes,
   claim/mention audits, bounded evidence excerpts, unresolved items, validation
   output, and one exact combined canonical diff.
7. Canonical narrative chapter files and the promotion log remain byte-for-byte
   unchanged after approval until the Captain separately and explicitly instructs
   the agent to apply that exact approved diff.
8. After authorized canonical application and successful post-write validation,
   append-only promotion-log rows record the new canonical hashes and approved
   month-index decision for remediated Chapters 1.31–1.33 and promoted Chapters
   1.34–1.36; existing historical rows remain unchanged.

## Validation commands

```bash
python3 scripts/tasks.py check
./node_modules/.bin/tsx scripts/narrative-cli.ts validate --root <temporary-narrative-root>
npm run data:validate -- --narrative-root <temporary-narrative-root>
npm run narrative:generate -- --root <temporary-narrative-root> --chapter 1.36 --output /tmp/bobiverse-bob-20260803-rtjfzv-world-1.36.json
jq -n --slurpfile chapter34 <temporary-narrative-root>/chapters/1/34.json --slurpfile chapter36 <temporary-narrative-root>/chapters/1/36.json --slurpfile world /tmp/bobiverse-bob-20260803-rtjfzv-world-1.36.json -f /tmp/bobiverse-bob-20260803-rtjfzv-equal-index-audit.jq
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

After the Captain separately authorizes canonical application, run the standard
post-write validation before appending promotion-log rows:

```bash
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm run narrative:generate -- --chapter 1.36 --output /tmp/bobiverse-bob-20260803-rtjfzv-canonical-world-1.36.json
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

## Documentation and generated artifacts

- Update `docs/chapter-extraction.md` with the bounded 2158 ordering decision and the
  rule that indices remain opaque ordering metadata. Leave the contract-only
  `docs/data-model-definition.md` and `docs/technical-design.md` unchanged.
- Keep candidates, sealed evidence, review excerpts, temporary corpora, and generated
  projections, including the focused equal-index audit program and report, under
  `/tmp` and outside version control.
- After separately authorized application and successful post-write validation,
  append one new `docs/chapter-promotion-log.md` row for each of Chapters 1.31–1.36;
  do not rewrite the existing Chapter 1.31–1.33 rows.

## Validation status

The review-only chain was prepared and validated on 2026-08-03. The authoritative
narrative validator accepted zero state plus 36 chapter sources, and the normal
data/astronomy validator completed successfully. The generated Chapter 1.36 world
passed the focused equal-`2158.9` audit: Chapters 1.34 and 1.36 share no state-update
target, appearance character, or event ID; Homer and Riker retain determinate
last-known locations. Equal-index activity for Bob, Butterworth, Valter, Riker, Sol,
and the Solar System remains intentionally tied and carries no unique-latest claim.

Task metadata validation, format checking, lint, type checking, and `git diff --check`
also passed. A fresh independent post-implementation review returned `No findings.`
After the Captain approved the exact combined diff and separately authorized its
application, the canonical Chapter 1.31–1.33 dates and Chapter 1.34–1.36 records were
applied byte-for-byte from the approved proposal. Standard post-write manifest
generation, narrative validation, data/astronomy validation, Chapter 1.36 projection
generation, formatting, lint, type checking, task metadata checking, and
`git diff --check` all passed. Append-only promotion rows record the resulting
canonical SHA-256 hashes; the pre-existing Chapter 1.31–1.33 rows remain unchanged.

## Risks and cautions

- Reusing a year-only value beside indexed 2158 writes makes state moments
  incomparable and fails validation.
- Preserving the old ordinal values would place September after October or collapse
  distinct source months into the same moment.
- A month index does not encode a day. Competing writes within one month remain tied
  unless later source evidence supports a separate, explicitly reviewed ordering.
- A broad historical migration would exceed the reviewed source evidence and this
  task's authorization.
