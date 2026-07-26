# BOB-010: important mentions and narrative activity

Status: Ready
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-26

## Objective

Add one spoiler-safe way for a chapter to record important references that are not
already represented by structural chapter fields, then generate a single activity
index for browser recency, map emphasis, and inspector context.

Update the repository-local chapter-extraction workflow in the same change so blind
source identity occurrences and canonical important mentions have distinct names and
review rules.

## User-visible outcome

Later Phase 2 UI tasks can answer which eligible characters, events, systems, and
other objects matter in a chapter or at a known story date without inventing
relationships or implementing type-specific recency heuristics.

There is no direct application UI in this task.

## Binding references

- `../design/phase-2-desktop-ui.md`, especially Sections 6, 7, and 11
- `../technical-design.md`, Section 12
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## Decisions

- `mentions` is an optional chapter-source array of unique stable narrative entity
  IDs.
- It records only important references not already captured by structural chapter
  facts.
- It does not change entity state or assert presence, participation, ownership,
  membership, location, or use.
- Canonical chapter files are not edited merely to exercise the contract. Redacted
  fixtures prove it.
- Generated activity is the sole UI-facing recency input. UI code will not scan
  chapter sources independently.
- The blind extraction ledger renames its current `mentions` collection to
  `source_mentions`; source-local IDs such as `mention:protagonist-1` remain valid.
- Pass 2 gains an explicit `important-mention` classification for claims promoted to
  canonical chapter `mentions`.

## In scope

- Extend the unversioned Draft 2020-12 chapter-source schema with optional
  `mentions`.
- Define the TypeScript source and generated activity record types.
- Accept location IDs and every supported direct narrative entity ID as targets.
- Validate uniqueness, stable-ID type, reader-order visibility, and redundancy.
- Reject a target introduced later than the chapter.
- Reject a target already represented in the same chapter by:
  - its own introduction or update;
  - a character appearance;
  - the chapter location;
  - event participation or event location;
  - another semantically equivalent structural activity source.
- Generate activity from introductions, updates, appearances, chapter location,
  events, important mentions, and mapped stellar-system ancestry.
- Preserve source chapter, controlled activity reason, and effective comparable story
  date where one exists.
- Define deterministic handling when one object has multiple activity reasons or
  effective dates in one chapter.
- Keep Chapter-mode reader-order recency and Date-mode story-time recency separate.
- Add concise, pointer-aware diagnostics for invalid mention targets.
- Update projector output validation and generated fixtures.
- Update:
  - `.codex/skills/extract-bobiverse-chapter/SKILL.md`;
  - `.codex/skills/extract-bobiverse-chapter/references/claim-ledger.md`;
  - affected extraction helper fixtures or tests;
  - `docs/chapter-extraction.md`;
  - the integrated technical and data-model documentation.
- In the extraction workflow, require sealed evidence and an explicit human-review
  row for each proposed canonical important mention.

## Out of scope

- Editing canonical book-derived chapter facts.
- Adding relationships, location claims, participation, state updates, or ownership
  through `mentions`.
- Browser, inspector, timeline, or map UI.
- Fuzzy extraction, bulk extraction, automatic canonical writes, or weakening the
  existing blind Pass 1 and approval gates.
- Treating every source-local occurrence as canonically important.
- Changing astronomy coordinates or data.

## Acceptance criteria

1. The chapter schema accepts an omitted `mentions` field and accepts a nonempty
   unique array of canonical IDs when present.
2. Structural and semantic validation reject malformed, unknown, later-introduced,
   duplicate, and structurally redundant targets with stable pointer-aware
   diagnostics.
3. A valid mention changes no projected entity property, relationship, location, or
   visibility result.
4. The projector emits deterministic activity facts from the complete agreed source
   set, including mapped stellar-system ancestry, without copying physical astronomy
   facts into narrative output.
5. Chapter-mode activity can be ordered by reader position; Date-mode activity uses
   only comparable effective dates at or before the requested display date.
6. Chronologically unplaced activity remains available for reader-order chapter
   context but does not become date-positioned.
7. Character activity never replaces the existing eligible-appearance calculation
   for **Last seen** location.
8. The extraction ledger and skill consistently use `source_mentions` for blind
   source-local identity anchors and reserve canonical `mentions` for reviewed
   important references.
9. Pass 2 applies the importance and redundancy policy, retains sealed evidence, and
   shows every proposed important mention in the human-review classification table.
10. Redacted tests cover each direct entity type, locations, same-chapter structural
    redundancy, later-target rejection, multiple activity reasons, non-chronological
    reader/story ordering, mapped ancestry, and unplaced dates.
11. Existing canonical chapters remain byte-for-byte unchanged by the task.
12. Directly affected technical, data-model, extraction, schema, and generated-output
    documentation agree on the final contract.

## Validation commands

```bash
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py --help
./node_modules/.bin/vitest run tests/unit/source-evidence-helper.test.ts
npm run narrative:validate
npm run narrative:generate -- --output /tmp/bobiverse-bob-010-world.json
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Use redacted temporary extraction fixtures for skill validation. Do not place source
book text or evidence excerpts in the repository.

## Risks and cautions

- The word “mention” exists in both source analysis and canonical authoring. The
  `source_mentions` rename must be atomic across skill instructions, ledger examples,
  tests, and review language.
- Overly broad redundancy derivation can falsely mark relationship references as
  chapter activity. The allowed structural reasons must be enumerated rather than
  inferred from every ID-shaped value.
- Effective event dates can differ from the enclosing chapter date. Generated
  activity must retain enough provenance to support both timeline modes without
  conflating them.
- This task is explicitly authorized only when the Captain separately authorizes its
  implementation; `Ready` status alone is not authority.
