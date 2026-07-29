# BOB-038: enforce supplemental mention completeness

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-29

## Objective

Replace the subjective important-mention threshold with a complete, evidence-backed
supplemental-mention rule beginning at Chapter `1.14`, while preserving structural
nonredundancy and the state-neutral narrative-activity contract.

Finish promotion of the exact Captain-approved Chapter `1.14` candidate under that
rule.

## User-visible outcome

When a chapter source references a previously visible object that is absent from every
other typed direct narrative-entity or location field in that chapter, the object
receives a `mentions` entry. Its **last mentioned in** indicator advances consistently
without asserting new state or duplicating structured chapter data. Typed
relationships already authored elsewhere remain structural even when they do not
independently generate activity.

Chapter `1.14` records GUPPI, ROAMers, nanites, and the SURGE drive as supplemental
mentions. Bob, Epsilon Eridani, SUDDAR, and Heaven-1 already have structural chapter
activity and are not repeated.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `../implementation-plan.md`
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../design/phase-2-desktop-ui.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../adrs/0017-supplemental-mention-completeness.md`
- `BOB-010-important-mentions-and-narrative-activity.md`
- `BOB-028-pin-chapter-extraction-agent-configuration.md`
- `BOB-036-chapter-inspector-and-compact-timeline.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`

ADR-0017 supersedes ADR-0008 where it makes importance or discretionary curation a
prerequisite for `mentions` and where it limits structural nonredundancy to
activity-producing target roles. Existing prior-visibility, stable-ID, underlying
nonredundancy, spoiler-safety, and activity-generation principles remain binding.

## Ratified decisions

1. Current terminology is **supplemental mentions**; the JSON field remains
   `mentions`.
2. From Chapter `1.14` onward, every source-supported reference to a previously
   visible direct narrative entity or location must be included once when no other
   chapter field structurally represents that object.
3. Beginning with Chapter `1.14`, every typed direct narrative-entity or location
   reference elsewhere in a chapter is structural for mention nonredundancy, whether
   or not that exact reference independently generates activity. This includes
   introduction/update targets, appearances, chapter locations, event
   participants/locations, character `species_id` and `death_event_id`, species
   `homeworld_id`, and location parent, origin, and destination IDs. Asset and
   astronomy IDs are not mention targets. Chapters `1.1`–`1.13` retain the accepted
   ADR-0008 validator boundary.
4. Supplemental mentions generate `mention` as their only direct activity reason for
   recency and **last mentioned in** presentation. Mentioned mapped locations retain
   the existing derived `mapped_system_ancestry` activity.
5. They do not assert presence, participation, ownership, membership, location, use,
   relationship, or state.
6. Chapters `1.1` through `1.13` are not retroactively audited.
7. Completeness is an evidence-backed extraction and review invariant. Runtime
   validation continues to enforce the mechanically knowable stable-ID,
   prior-visibility, uniqueness, and structural-nonredundancy rules.
8. Historical accepted ADRs, completed tasks, promotion-log entries, and review
   records retain their original wording.

## In scope

- Add accepted ADR-0017 and integrate it into current authority documents.
- Replace current-contract and runtime-diagnostic uses of “important mention” with
  “supplemental mention.”
- Update the current Phase 2 desktop design and Ready BOB-036 task; do not rewrite
  completed historical tasks.
- Update narrative schema descriptions and the generated data-model documentation.
- Update the extraction workflow, claim-ledger guidance, and repository-local skill
  so Pass 2 audits every resolved source mention for completeness.
- Preserve explicit per-entry sealed evidence and structural-redundancy decisions in
  human review.
- Update focused validator, projection, and extraction-guidance tests.
- Add focused structural-nonredundancy coverage for typed species, homeworld, death
  event, and location parent/origin/destination references, plus mapped-location
  derived ancestry.
- Correct the projector's existing contract deviation so a mention-only mapped
  location derives `mapped_system_ancestry` through the same location-activity helper
  used by other location reasons.
- Promote the exact approved Chapter `1.14` candidate with four supplemental mentions.
- Regenerate the chapter manifest, validate the canonical projection and astronomy
  data, and append the required promotion-log row.

## Out of scope

- Retrospective source-text audits or canonical changes for Chapters `1.1`–`1.13`.
- Renaming the JSON `mentions` field or the generated activity reason `mention`.
- Adding mention counts, excerpt text, relationships, presence, state, or location
  inference.
- Treating same-chapter introductions as previously visible mention targets.
- Changing browser ordering, date comparison, spoiler projection, or the established
  mapped-system ancestry semantics beyond correcting the mention-only projector
  deviation.
- Committing source text, claim ledgers, evidence excerpts, temporary corpora, or
  review candidates.
- Rewriting historical ADRs, completed tasks, promotion logs, or review records.

## Acceptance criteria

1. ADR-0017 is accepted and current integrated contracts define supplemental
   mentions as exhaustive, source-supported, nonstructural references from Chapter
   `1.14` onward.
2. Schema descriptions, diagnostics, tests, extraction documentation, the current
   Phase 2 desktop design, Ready task BOB-036, and the local extraction skill
   consistently use supplemental-mention terminology.
3. Pass 2 requires every resolved source mention to be classified as structurally
   represented, qualifying supplemental mention, later/unresolved, or intentionally
   unmodeled with evidence-backed reasoning; importance is not an inclusion gate.
4. Runtime validation still rejects unknown, later-introduced, duplicate, and
   structurally redundant targets with supplemental-mention diagnostics. Beginning
   with Chapter `1.14`, structural redundancy covers every explicitly enumerated
   typed direct narrative reference, including species, homeworld, death-event, and
   location hierarchy/transit fields, without invalidating Chapters `1.1`–`1.13`.
5. Projection creates `mention` activity without changing entity state, visibility,
   relationships, presence, or last-known location. A focused regression proves that
   a mention-only mapped location now also receives the established derived
   `mapped_system_ancestry` activity.
6. Canonical Chapter `1.14` is value-identical to the approved candidate and contains
   exactly these supplemental mentions:
   `technology:guppi-interface`, `technology:roamers`, `technology:nanites`, and
   `technology:surge-drive`.
7. Chapter `1.14` generates one `mention` activity record for each of those four
   targets and no redundant mention activity for Bob, Epsilon Eridani, SUDDAR, or
   Heaven-1.
8. Canonical narrative and astronomy validation pass, and the Chapter `1.14`
   promotion-log row records the accepted editorial decisions and canonical hash.
9. No source book text, evidence artifact, temporary corpus, or candidate enters
   version control.
10. An independent implementation review reports `No findings.`

## Validation

```bash
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm run narrative:generate -- --chapter 1.14 --output /tmp/bobiverse-world-1.14.json
npm test -- tests/unit/narrative.test.ts tests/unit/source-evidence-helper.test.ts
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

The exact approved Chapter `1.14` candidate has:

- byte SHA-256
  `0f34743c6c2f0108448fc9444144fc042865cb43cb80ba8549abde7a760c60a5`;
- canonicalized `jq -S -c` value SHA-256
  `eb1d27f171d4f77ffd38fad446720605ed80f7fb24c07fe494985a6dfafe4487`.

Before the canonical write, the approved candidate was rebuilt with
`source_evidence.py prepare-corpus` at
`/tmp/bobiverse-1.14.AnPpbq/narrative-root-approved-preflight`. The staged candidate
was byte-identical, narrative validation reported `zero state and 14 chapter source
file(s)`, and astronomy validation reported `119 reconciled systems and five pinned
astronomy sources`. Before logging promotion, verify the canonical file's byte hash
or compare its canonicalized value hash with the recorded approved value:

```bash
sha256sum data/narrative/chapters/1/14.json
jq -S -c . data/narrative/chapters/1/14.json | sha256sum
```

Inspect the generated Chapter `1.14` world and confirm:

- the four approved targets have `mention` activity;
- Bob, Epsilon Eridani, SUDDAR, and Heaven-1 have structural activity without a
  `mention` reason;
- entity state and `last_known_location` remain unchanged by supplemental mentions.

Focused fixtures must also prove:

- a mapped-location supplemental mention creates direct `mention` activity and keeps
  derived `mapped_system_ancestry`;
- a previously visible species, homeworld, death event, parent location, transit
  origin, or transit destination referenced through its typed chapter field is
  rejected when redundantly repeated in `mentions`;
- an ID-shaped string in prose does not become structural merely because it resembles
  a stable ID.

## Documentation and generated artifacts

- Update current integrated authority and extraction documents in the same change.
- Regenerate `generated/narrative/chapter-manifest.json`.
- Append exactly one Chapter `1.14` row to `docs/chapter-promotion-log.md` only after
  canonical post-write validation passes.
- Keep generated Chapter `1.14` projections under `/tmp`.

## Completion evidence

- Independent pre-implementation task/ADR review closed with `No findings.` after
  resolving F-001 through F-007.
- The implementation review closed with `No findings.` after resolving F-008's
  historical-boundary wording.
- A fresh independent closure review closed with `No findings.` after resolving
  F-009's every-resolved-source-mention audit requirement.
- Canonical Chapter `1.14` matches both approved fingerprints:
  byte SHA-256
  `0f34743c6c2f0108448fc9444144fc042865cb43cb80ba8549abde7a760c60a5`
  and canonicalized-value SHA-256
  `eb1d27f171d4f77ffd38fad446720605ed80f7fb24c07fe494985a6dfafe4487`.
- `npm run narrative:validate` reported
  `Narrative corpus is valid: zero state and 14 chapter source file(s).`
- `npm run data:validate` reported
  `Validated 119 reconciled systems and five pinned astronomy sources`.
- The canonical Chapter `1.14` projection contains `mention` activity for exactly
  GUPPI, ROAMers, nanites, and SURGE. Bob, Epsilon Eridani, SUDDAR, and Heaven-1 have
  only their structural reasons.
- Focused tests passed: 42 tests across `narrative.test.ts` and
  `source-evidence-helper.test.ts`.
- The full unit suite passed: 23 files and 143 tests.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, and
  `git diff --check` passed.
- The Chapter `1.14` promotion log records the canonical hash and material editorial
  decisions. No source text, ledger, evidence, temporary corpus, or candidate was
  added to the repository.

## Risks

- Leaving “important” wording in a current authority surface would preserve the
  obsolete discretionary gate.
- Treating exhaustive source coverage as runtime-verifiable would create false
  confidence because source book text is intentionally absent.
- Adding structurally redundant mentions would corrupt the field's narrow recency
  purpose.
- Broad search-and-replace could rewrite historical records that must remain intact.
- Treating every ID-shaped string as structural instead of enumerating typed schema
  fields could suppress valid supplemental mentions or create accidental authority.
