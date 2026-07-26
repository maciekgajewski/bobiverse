# Chapter extraction with Codex

Use `extract-bobiverse-chapter` to turn one lawfully obtained plaintext chapter into
a spoiler-safe candidate JSON object. It is an editorial assistant: it does not
silently publish chapter data.

## Start an extraction

From the repository root, give Codex the chapter reference and the plaintext source
file, which must remain outside the repository:

```text
$extract-bobiverse-chapter 1.2 "../source-text/1.2 - Bob Version 2.0.txt"
```

The file name must start with the same book and chapter number as the reference. An
untitled chapter uses `1.3.txt`; a titled chapter uses
`1.2 - Source Title.txt`.

## What Codex does

1. Extracts source-backed claims in an isolated first pass, using `source_mentions`
   only as source-local identity anchors.
2. Seals the evidence, then compares it only with the reader-visible state before
   that chapter.
3. Builds and validates a temporary candidate outside the canonical corpus.
4. Shows the candidate, evidence, open questions, validation result, and exact diff.
   A proposed canonical `mentions` entry is separately classified as an important,
   non-redundant reference, with sealed evidence and an explicit human-review row.

Entity names preserve the source's primary surface form. When the source primarily
uses an acronym, that acronym remains the canonical visible and searchable `name`;
a source-supported expanded form belongs in the original `description`. Codex must
not replace the acronym with its expansion or invent an expansion.

## Approve a candidate

Review the exact candidate and ask Codex to apply it explicitly, for example:

```text
Accept this candidate.json as chapter 1.2.
```

Until that separate approval, the skill is review-only. `dry-run` always prevents a
canonical write. Source text, evidence excerpts, and intermediate ledgers stay out of
version control.

## Record an approved promotion

Routine promotion of an exact, explicitly approved candidate does not require a new
task. After applying the candidate:

1. Confirm the canonical JSON remains value-identical to the approved candidate;
   standard formatting may change whitespace only.
2. Run the shared validation below.
3. Append one row to [the chapter-promotion log](chapter-promotion-log.md) with the
   chapter, approval date, canonical SHA-256, validation result, and any material
   editorial decision.

Create a task instead when the work changes code, schemas, contracts, tooling, or
includes broader editorial remediation beyond the approved chapter candidate.

### Standard promotion validation

```bash
chapter_ref="1.3" # Replace with the approved chapter.
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter "$chapter_ref" --output "/tmp/bobiverse-world-$chapter_ref.json"
npm run format:check
npm run lint
npm run typecheck
git diff --check
```
