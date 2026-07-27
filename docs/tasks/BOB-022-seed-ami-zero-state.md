# BOB-022: seed AMI in the narrative zero state

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-27

## Objective

Define Artificial Machine Intelligence as pre-book reader-visible technology in the
canonical zero state, then reconcile the review-only chapter `1.7` candidate against
that seeded identity instead of introducing AMI in the chapter.

## User-visible outcome

AMI is available before any chapter is selected with a concise encyclopedia
definition. Chapter `1.7` can refer to that existing technology without making its
identity or acronym expansion depend on reaching the chapter.

## Binding references

- `../technical-design.md`, Section 12
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../adrs/0006-generalized-narrative-zero-state.md`
- `../adrs/0007-additional-narrative-entity-types.md`
- `BOB-021-encyclopedic-entity-descriptions.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

ADR-0007 already permits technology entities in the atomic zero state. This task adds
one instance under that accepted contract; it does not change schema, ownership,
projection, or spoiler semantics and does not require another ADR.

## Decisions

- The canonical stable ID is `technology:ami`.
- The canonical reader-visible name is `AMI`.
- AMI expands to Artificial Machine Intelligence.
- Its zero-state description is:
  `Artificial Machine Intelligence (AMI) is an artificial intelligence created
directly as a machine mind rather than copied from a biological mind.`
- Chapter `1.7` removes AMI from `introducing`.
- China retains its source-supported intended use of AMI in China's description.
- Chapter `1.7` records `technology:ami` as a nonredundant important mention rather
  than updating AMI's encyclopedia description.
- The immutable chapter `1.7` sealed ledger is not edited.

## In scope

- Add `technology:ami` to `data/narrative/baseline/zero-state.json`.
- Add a focused projection regression assertion for the exact AMI zero-state record.
- Regenerate and validate the canonical narrative manifest and projections.
- Revise the temporary chapter `1.7` candidate, claim classifications,
  important-mention audit, report, exact diff, and temporary corpus under `/tmp`.
- Verify the important mention has prior visibility, sealed evidence, and no
  structural redundancy.
- Run an independent source-fidelity and contract review.

## Out of scope

- Editing or promoting canonical chapter `1.7`.
- Changing any other canonical chapter.
- Adding AMI capabilities, limitations, relationships, or operating principles beyond
  the Captain-approved zero-state definition.
- Retrospectively auditing other zero-state or chapter descriptions.
- Changing the narrative schema, projector, entity types, or application UI.
- Editing source text or the immutable sealed evidence ledger.

## Acceptance criteria

1. The zero-state source contains exactly one `technology:ami` entity with the
   approved name and description.
2. AMI is reader-visible in a generated zero-state projection and remains visible
   through chapter `1.6`.
3. The revised chapter `1.7` candidate does not introduce or update AMI.
4. Chapter `1.7` contains `technology:ami` as an important mention supported by sealed
   evidence and not redundant with another structural field targeting AMI.
5. China's description retains only its source-supported intended use and attributed
   assessment.
6. The revised candidate, exact absent-file diff, and temporary-corpus copy are
   byte-identical and pass authoritative narrative validation.
7. Canonical chapter files, source text, and the immutable sealed ledger remain
   unchanged.
8. An independent review returns no unresolved findings.

## Validation commands

```bash
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --output /tmp/bobiverse-bob-022-zero-state.json
npm run narrative:generate -- --chapter 1.6 --output /tmp/bobiverse-bob-022-1.6.json
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /tmp/bobiverse-1.7-pass2-pS7Tz8/corpus-ami-zero-state
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

## Validation status

All documented commands passed on 2026-07-27. Canonical validation reported:

```text
Narrative corpus is valid: zero state and 6 chapter source file(s).
```

The generated pre-book and chapter `1.6` projections both contain the exact approved
`technology:ami` record. The temporary chapter `1.7` corpus reported:

```text
Narrative corpus is valid: zero state and 7 chapter source file(s).
```

The revised candidate, exact absent-file diff, and
`corpus-ami-zero-state/chapters/1/7.json` are byte-identical. The candidate SHA-256
is `0a9d513681e11d056e633192097977fa5adfe5f17e8c72a9a42e96c0ad986aa1`;
the immutable sealed-ledger SHA-256 remains
`17fe45755c955001097c52353458bd39a2f6362e8a1f38329e1590b9f1caf7c8`.
The full test suite passed with 99 tests, the production build completed, and a fresh
independent Terra Medium closure review returned `No findings.` No canonical chapter
file, source text, or sealed evidence was modified.

## Risks and cautions

- Seeding AMI makes it visible before the book begins; its description must contain
  only the Captain-approved pre-book definition.
- Keeping AMI in chapter `1.7` introductions would violate zero-state introduction
  uniqueness.
- Updating AMI in chapter `1.7` merely to record China's use would turn narrative
  context into the technology's definition and make the important mention redundant.
- A canonical zero-state change affects every projection and therefore requires
  canonical validation beyond the temporary chapter candidate.
- The chapter `1.7` candidate remains review-only until the Captain separately
  approves its exact revised artifact and explicitly authorizes application.
