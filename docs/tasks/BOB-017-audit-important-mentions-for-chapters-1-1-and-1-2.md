# BOB-017: audit important mentions for chapters 1.1 and 1.2

Status: Done
Phase: 2 (narrative editorial data)
Last updated: 2026-07-26

## Objective

Run two separate evidence-backed mention audits against the lawful plaintext sources
for canonical chapters 1.1 and 1.2. Identify only important references that are not
already represented by each chapter's introductions, updates, appearances, default
location, event participation, or event locations.

## User-visible outcome

The Captain receives two validated, mention-only candidate diffs with sealed evidence
and explicit redundancy decisions. Canonical chapter data remains unchanged until the
Captain separately approves an exact candidate and explicitly requests its
application.

## Binding references

- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `BOB-010-important-mentions-and-narrative-activity.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## Inputs

- Chapter 1.1: `../source-text/1.1 - Bob Version 1.0.txt`
- Chapter 1.2: `../source-text/1.2 - Bob Version 2.0.txt`

The plaintext sources, evidence excerpts, ledgers, candidates, and temporary corpora
remain outside version control.

## Decisions

- Invoke the extraction skill separately for each chapter; one skill run never
  processes both sources.
- Each blind Pass 1 runs in a fresh isolated GPT-5.6 Sol/high context with no
  canonical narrative access.
- Existing canonical chapter fields are the approved editorial baseline. The final
  audit candidate may add only `mentions`; it may not regenerate or revise the title,
  summary, date, location, introductions, updates, or appearances.
- Pass 1 still captures complete source claims so Pass 2 can distinguish important
  references from structural relevance.
- Chapter 1.2 reconciles against the current canonical projection through chapter 1.1.
  An unapproved mention-only candidate for 1.1 is not inserted into its prior state;
  mentions do not change entity state or reader visibility.
- Each proposed mention requires a resolved stable ID, sealed evidence, an importance
  rationale, and proof that the target is not structurally redundant.

## In scope

- Validate source filenames, UTF-8, titles, and SHA-256 fingerprints.
- Manifest, read, and account for every source chunk exactly once per blind pass.
- Seal all nontrivial source claims to byte-offset evidence under `/tmp`.
- Reconcile only against reader-visible canonical state immediately before the target
  chapter.
- Compare the validated full extraction candidate with the existing target only after
  the skill permits canonical target access.
- Build a mention-only candidate by preserving the canonical target and adding only
  approved audit proposals.
- Validate each mention-only candidate in a separate temporary corpus.
- Present every proposal, rejected structural duplicate, unresolved item, validation
  result, and exact canonical diff.

## Out of scope

- Writing canonical chapter JSON.
- Reopening previously approved chapter fields.
- Processing chapter 1.3 or later sources.
- Inferring an important mention from the canonical summary without source evidence.
- Committing source text, excerpts, ledgers, candidates, or temporary corpora.

## Acceptance criteria

1. Each chapter has a separate source fingerprint, isolated blind ledger, sealed
   ledger checksum, processed-chunk accounting, and temporary workspace.
2. Pass 1 for either chapter does not read canonical narrative data, later chapters,
   tests, fixtures, or book-derived documentation examples.
3. Every proposed canonical mention resolves to an entity visible before the target
   chapter and has sealed source evidence.
4. No proposal duplicates an introduction, update, appearance, default location,
   event participant, or event location in the target chapter.
5. The mention-only candidate is identical to the canonical target except for one
   optional `mentions` array.
6. Each candidate passes the authoritative validator in a temporary corpus.
7. The review presents exact diffs and bounded evidence without writing canonical
   data.
8. If no valid important mentions exist for a chapter, the audit explicitly reports
   that result rather than adding an empty array.

## Validation commands

For each isolated workspace, use the skill's `metadata`, `manifest`, `chunk`, `seal`,
`review`, and `prepare-corpus` commands. Record their exact absolute paths in the
audit result.

Validate each final mention-only temporary corpus with:

```bash
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /absolute/path/to/temporary/narrative-root
```

Repository files must remain unchanged except for this task and its index entry:

```bash
npm run narrative:validate
git diff --check
```

## Risks and cautions

- `source_mentions` are blind identity anchors; most must not become canonical
  `mentions`.
- A reference may feel important but still be structurally redundant.
- The existing chapter may omit a source-supported entity entirely. This audit does
  not introduce that entity and cannot mention an unresolved or unmodeled target.
- Invocation is review-only. Canonical application requires a later exact approval.

## Completion evidence

- Chapter 1.1 used source SHA-256
  `01be0cf8ed2122c42676b976c51c052e46ed2faac9fb1002c1534a369fa1c7e2`.
  Its four chunks were processed exactly once, producing 46 claims and 73 sealed
  evidence references. The sealed-ledger SHA-256 is
  `027a2eb0084412be7f0b5e70485af6042e28e572531ff23882f3d92e68b07ac2`.
- The chapter 1.1 audit found no valid important mentions. Its mention-only candidate
  is byte-identical to the canonical chapter and passed temporary-corpus validation.
- Chapter 1.2 used source SHA-256
  `cd683ae9a4e5e30f97310ad219e792f766ea6c390290be096318027911b50c72`.
  Its four chunks were processed exactly once, producing 52 claims and 97 sealed
  evidence references. The sealed-ledger SHA-256 is
  `c266061395e43f410fbad2c6edaac9a07e7d22445ff9aef9d423857a50a9f637`.
- The chapter 1.2 audit proposes exactly three important mentions:
  `character:robert-johansson`, `event:bob-road-incident`, and
  `organization:cryoeterna`. Removing `mentions` leaves a value-identical copy of the
  canonical chapter.
- Both mention-only temporary corpora passed the authoritative narrative validator.
  Independent generation for the chapter 1.2 candidate produced three activity
  records with reason `mention` and effective date `2133`.
- The canonical narrative data was not modified. The chapter 1.2 candidate remains
  review-only until the Captain separately approves its exact diff and requests
  application.
