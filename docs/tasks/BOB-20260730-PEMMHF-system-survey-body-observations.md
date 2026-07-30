# BOB-20260730-PEMMHF: preserve system-survey body observations

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-30

## Objective

Make system-survey extraction preserve every surveyed planet and up to four moon
children as spoiler-projected locations, with optional structured properties needed
by a later renderer.

Reconcile Chapter `1.16` again from its sealed evidence under the new contract and
produce a validated review-only candidate.

## User-visible outcome

When a chapter surveys a stellar system, readers can inspect each revealed planet,
dwarf planet, and selected moon independently at that reading boundary. The model
retains source-supported body class, colour, visible appearance, numeric surface
gravity, and aggregate survey facts without inventing physical orbital geometry.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `../implementation-plan.md`
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0014-unified-vessel-entities-and-authoring-quality.md`
- `../adrs/0015-omit-disclosure-gaps-from-entity-descriptions.md`
- `../adrs/0018-spoiler-projected-system-survey-observations.md`
- `BOB-028-pin-chapter-extraction-agent-configuration.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../.codex/skills/extract-bobiverse-chapter/references/claim-ledger.md`

ADR-0018 is accepted and binding. It narrows the general durable-location curation
rule for source-supported system surveys beginning with Chapter `1.16`: surveyed
planets are mandatory narrative locations even when briefly inspected or unsuitable
for settlement.

## Ratified decisions

1. Book-revealed survey facts are spoiler-projected narrative location state, not
   catalogue astronomy facts.
2. Locations of kind `planet`, `dwarf_planet`, and `moon` support optional
   `body_class`, `color`, `visual_description`, and `surface_gravity_g`.
3. `body_class` is limited to `rocky`, `icy`, `dwarf_planet`, `gas_giant`, and
   `ice_giant`.
4. `color` is source-faithful free-form text. `visual_description` contains visible
   appearance. `surface_gravity_g` is a positive number in Earth gravities. Direct
   Earth-gravity values retain their source precision; metres per second squared use
   `surface_gravity_g = surface_gravity_m_s2 / 9.80665` and retain no more significant
   digits than the source. Other units remain in `description`. The sealed ledger
   retains source value/unit and reconciliation records every conversion.
5. Qualitative gravity and all other survey measurements remain in `description`.
   Extraction still preserves all supported information; absence of a dedicated field
   is not permission to omit a fact.
6. Every surveyed planet or dwarf planet becomes a location from Chapter `1.16`
   onward.
7. Each surveyed body has at most four moon children. Prefer named or distinctly
   described moons, then source-supported largest moons, then source order.
8. Count-only moons use the display names `Moon 1` through `Moon 4`. Their IDs append
   `-moon-01` through `-moon-04` to the parent location ID suffix; named or distinctly
   described children take their own identities first, and anonymous ordinals use the
   lowest collision-free suffixes. An exact count creates `min(count, 4)` children;
   “many moons” creates four. The parent description retains the complete supported
   count or qualifier.
9. Anonymous numbering and child order are decorative inventory, not physical
   orbital order or distance. A later name without a unique identity link updates the
   lowest-numbered anonymous moon while preserving its stable ID; multiple names in
   one chapter bind in source-mention order to ascending anonymous ordinals.
10. Chapters `1.1`–`1.15` are not retrospectively audited. Rendering these fields is
    deferred.

## In scope

- Add accepted ADR-0018 and integrate it into current technical and data-model
  authority.
- Extend location introductions and updates with the four optional survey fields.
- Enforce field eligibility by effective location kind, the closed body-class enum,
  nonempty text, positive finite surface gravity, and a maximum of four moon
  children per parent.
- Project, replace, and clear optional survey fields through ordinary chapter updates
  without changing reader-order or story-time semantics.
- Add actionable schema and semantic diagnostics for invalid field placement,
  values, and moon cardinality.
- Update the chapter-extraction workflow, claim-ledger contract, and repository-local
  extraction skill so blind Pass 1 captures every system-survey body and Pass 2
  authors the required hierarchy and fields.
- Add focused schema, projection, spoiler-boundary, update-clearing, moon-cap, and
  extraction-guidance regression coverage.
- Audit the existing Chapter `1.16` sealed ledger against the new survey checklist,
  retain it unchanged as evidence of the pre-rule gap, and run a fresh isolated
  GPT-5.6 Terra/high Pass 1 because that audit is already known to fail. Seal and
  fingerprint the replacement ledger, then run a fresh Terra/high Pass 2 using only
  that ledger and the verified Chapter `1.15` prior projection.
- Produce a revised, validated, review-only Chapter `1.16` candidate under `/tmp`.

## Out of scope

- Retrospective source audits or canonical chapter changes for Chapters `1.1`–`1.15`.
- Canonical promotion of Chapter `1.16` without separate exact-candidate approval.
- UI, WebGL, procedural-orbit, system-detail, or other rendering implementation.
- Physical orbital distances, coordinates, radii, precise renderer colours, or
  catalogue-astronomy ownership changes.
- A generic structured measurement collection or dedicated fields beyond the four
  ratified survey properties.
- More than four authored moon children per parent.
- Moon replacement, retirement, merging, or identity-history machinery beyond
  deterministic renaming of the lowest anonymous ordinal.
- Committing source text, evidence excerpts, claim ledgers, temporary candidates,
  temporary narrative roots, or generated world projections.

## Acceptance criteria

1. ADR-0018 is accepted and current integrated documents define book-derived survey
   observations as spoiler-projected location state distinct from astronomy
   authority.
2. The JSON Schema accepts the four optional fields on planet, dwarf-planet, and moon
   introductions and nullable replacements on their updates; it rejects them on
   ineligible location kinds.
3. `body_class` rejects values outside the ratified enum; `color` and
   `visual_description` reject empty strings; `surface_gravity_g` rejects nonnumeric,
   nonfinite, zero, and negative values. Focused fixtures verify direct Earth-gravity
   retention and the documented SI conversion without invented precision.
4. Projection retains introductions, applies replacements and null-clears from
   updates, and never exposes a survey property before its source chapter.
5. Semantic validation uses the effective location kind for updates and rejects any
   parent with more than four direct moon children at the relevant reader boundary.
6. Current-authority documentation, extraction guidance, the claim-ledger contract,
   and the local skill require every surveyed body and claim to be captured,
   reconciled, and represented or explicitly reviewed.
7. Moon authoring follows the cap, selection priority, count-only naming,
   description-retained total, decorative-order, and deterministic later-renaming
   rules without inventing geometry.
8. A fresh blind Terra/high Pass 1 produces a replacement sealed Chapter `1.16`
   ledger containing separate evidence-backed claims for every surveyed body,
   visible/surface fact, aggregate fact, and moon occurrence. A fresh Terra/high
   Pass 2 from only that replacement ledger and verified prior state then produces a
   candidate that introduces all four surveyed Epsilon Eridani planets, preserves
   every supported survey claim, and authors moon children according to ADR-0018.
9. The temporary Chapter `1.16` corpus passes narrative and astronomy validation
   against the current canonical baseline through Chapter `1.15`.
10. The revised candidate, reconciliation report, complete source-mention table,
    bounded evidence review, and exact canonical diff remain under `/tmp`; Chapter
    `1.16` is not written canonically.
11. The repository-local skill passes its structural validator and a fresh
    forward-test applies the rule without seeing the intended candidate.
12. Focused and full repository validation pass, no source/evidence artifact enters
    Git, and an independent implementation review reports `No findings.`
13. The pre-existing Chapter `1.15` canonical JSON remains byte-identical at SHA-256
    `4b5e3f51ba7f8b49d4334bcdecd6f63ecf1c177e66503b265312efcb981ef3b6`,
    and `docs/chapter-promotion-log.md` retains the approved Chapter `1.15` row and
    remains byte-identical to the recorded dirty-tree baseline except for changes
    explicitly authorized by a later task.

## Validation

```bash
python3 scripts/tasks.py check
test "$(sha256sum /home/maciek/bobiverse-project/source-text/1.16.txt | cut -d' ' -f1)" = \
  c966849fed3de7576213d5ba37a3b3aee40a6e4ff47aa8a85c82c2c6c8e25ccc
test "$(sha256sum /tmp/bobiverse-chapter-1.16.u4J2Lk/sealed-ledger-1.16.json | cut -d' ' -f1)" = \
  2163f34206e2edded77195e34232c49140181cbacb472eef3cd14b9d52e046d5
test "$(sha256sum /tmp/bobiverse-chapter-1.16.u4J2Lk/prior-projection-1.15.json | cut -d' ' -f1)" = \
  05613e867dedb364d43317abff4508350b3d5070b40bca1e5a58a03160b242c3
test "$(sha256sum data/narrative/chapters/1/15.json | cut -d' ' -f1)" = \
  4b5e3f51ba7f8b49d4334bcdecd6f63ecf1c177e66503b265312efcb981ef3b6
test "$(sha256sum docs/chapter-promotion-log.md | cut -d' ' -f1)" = \
  b5f254a95e590dcf2c7b26b91e197f35e1d81c431a222004a5797ebcb7d54246
test "$(git diff -- docs/chapter-promotion-log.md | sha256sum | cut -d' ' -f1)" = \
  c80ea05adc9065d6a07e8876d2742dc70eb5e66f204bb6deacdb493d29c8968f
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm run narrative:generate -- --chapter 1.15 --output /tmp/bobiverse-world-1.15.json
cmp -s \
  /tmp/bobiverse-world-1.15.json \
  /tmp/bobiverse-chapter-1.16.u4J2Lk/prior-projection-1.15.json
cmp -s data/schema/narrative-data-model.schema.json <(
  awk '
    !found && /^```json$/ { found = 1; inside = 1; next }
    inside && /^```$/ { exit }
    inside { print }
  ' docs/data-model-definition.md
)
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /tmp/bobiverse-system-survey-1.16/narrative
npm run data:validate -- \
  --narrative-root /tmp/bobiverse-system-survey-1.16/narrative
npm test -- tests/unit/narrative.test.ts \
  tests/unit/narrative-diagnostics.test.ts \
  tests/unit/source-evidence-helper.test.ts
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run validate
git diff --check
```

## Chapter 1.16 fresh extraction inputs and comparison artifacts

- Source: `/home/maciek/bobiverse-project/source-text/1.16.txt`
- Source SHA-256:
  `c966849fed3de7576213d5ba37a3b3aee40a6e4ff47aa8a85c82c2c6c8e25ccc`
- Known-incomplete pre-rule sealed Pass 1 ledger, audit/comparison only:
  `/tmp/bobiverse-chapter-1.16.u4J2Lk/sealed-ledger-1.16.json`
- Known-incomplete ledger SHA-256:
  `2163f34206e2edded77195e34232c49140181cbacb472eef3cd14b9d52e046d5`
- Prior reader-visible projection:
  `/tmp/bobiverse-chapter-1.16.u4J2Lk/prior-projection-1.15.json`
- Prior-projection SHA-256:
  `05613e867dedb364d43317abff4508350b3d5070b40bca1e5a58a03160b242c3`
- Superseded pre-ADR-0018 candidate, post-validation comparison only:
  `/tmp/bobiverse-chapter-1.16.u4J2Lk/pass2/candidate-1.16.json`
- Superseded candidate SHA-256:
  `a5c625f05fe9596bafdfe6d4f9353d727c7ab3030a503a507e2dd83c17865f15`

The fresh Pass 1 sees only the revised blind-safe skill material and source. It must
not see either old ledger, either prior candidate/review artifact, canonical state, or
the prior projection. The fresh Pass 2 sees only the replacement sealed ledger,
revised contracts, and the freshly generated, fingerprinted Chapter `1.15`
projection. It must not see the superseded candidate. The orchestrator may compare
the two candidates only after the replacement candidate and review artifacts validate.
Never edit either sealed ledger.

## Pre-existing dirty-tree baseline

- `data/narrative/chapters/1/15.json` is intentionally untracked and has SHA-256
  `4b5e3f51ba7f8b49d4334bcdecd6f63ecf1c177e66503b265312efcb981ef3b6`.
- `docs/chapter-promotion-log.md` is intentionally modified and has whole-file
  SHA-256
  `b5f254a95e590dcf2c7b26b91e197f35e1d81c431a222004a5797ebcb7d54246`
  at task creation.
- The promotion-log diff against `HEAD` has SHA-256
  `c80ea05adc9065d6a07e8876d2742dc70eb5e66f204bb6deacdb493d29c8968f`.

Verify all three fingerprints before implementation completion. Preserve these files
byte-for-byte; this task does not authorize altering Chapter `1.15` or its log row.

## Documentation and generated artifacts

- Update `docs/technical-design.md`, `docs/data-model-definition.md`,
  `docs/implementation-plan.md`, and `docs/chapter-extraction.md`.
- Keep the machine-readable schema and generated data-model listing identical.
- Update the repository-local extraction skill and directly affected reference
  material; do not add auxiliary skill documentation.
- Regenerate the ignored chapter manifest through the normal validation path.
- Keep the revised Chapter `1.16` candidate, review artifacts, and temporary corpus
  under `/tmp/bobiverse-system-survey-1.16`.
- Do not append a Chapter `1.16` promotion-log row until a separately approved exact
  candidate is promoted.

## Risks and cautions

- Treating survey observations as catalogue facts would leak reader-order knowledge
  and weaken astronomy provenance.
- Allowing survey fields on generic locations would blur semantics and complicate
  rendering consumers.
- A schema-only change could accept fields that projection silently drops or updates
  incorrectly.
- Placeholder moons can appear source-named or physically ordered unless their
  naming and decorative-order boundary is explicit.
- A four-moon cap can erase aggregate source knowledge unless the parent description
  retains the complete count or qualifier.
- Reusing the pre-ADR candidate would preserve the exact omission that motivated this
  task.
- Broad formatting or documentation rewrites could obscure the pre-existing
  Chapter `1.15` promotion changes.

## Implementation plan

1. Review this task and ADR until an independent pass reports `No findings.`
2. Mark the task `In progress` under the Captain's existing implementation
   authorization.
3. Implement schema, projection, semantic validation, diagnostics, documentation,
   and extraction-skill changes as one cohesive contract slice.
4. Add focused regression coverage and validate the skill.
5. Run fresh isolated Chapter `1.16` Pass 1 under the revised checklist, seal a
   replacement ledger, then run fresh Pass 2 from that ledger and verified prior
   state. Validate the temporary corpus and present the exact candidate for review.
6. Run the complete task validation and independent implementation review, resolve
   every finding, and mark the task `Done` with completion evidence.

## Completion evidence

- ADR-0018, the integrated technical/data-model/extraction contracts, machine schema,
  diagnostics, semantic projection validation, tests, and repository-local skill now
  implement the ratified survey-body model.
- Semantic validation evaluates survey-field eligibility and the four-moon cap on
  complete reader-visible story-time projections. Regression fixtures cover retained
  fields, atomic clears, same-boundary update ordering, and non-chronological
  projections.
- Fresh blind Pass 1:
  - configuration: GPT-5.6 Terra, high reasoning, no inherited turns;
  - sealed ledger:
    `/tmp/bobiverse-system-survey-1.16/pass1/sealed-claim-ledger.json`;
  - SHA-256:
    `31f1b97a6fcd95a78e8cef2bc37c852579d560dcc426c103437bdef7978ba67f`;
  - 59 claims, 15 source-local mentions, and 59 sealed evidence ranges.
- Fresh current-skill Pass 2 forward test:
  - configuration: GPT-5.6 Terra, high reasoning, no inherited turns;
  - review-only candidate:
    `/tmp/bobiverse-system-survey-1.16/pass2-revised/output/candidate-1.16.json`;
  - SHA-256:
    `a561642f468f242a9268ca4c713153140058a1bcec681bcc4b63fc8ec02a066a`;
  - byte-identical temporary-corpus chapter:
    `/tmp/bobiverse-system-survey-1.16/narrative-classified/chapters/1/16.json`;
  - narrative validation: zero state and 16 chapter sources valid;
  - astronomy/data validation: 119 systems and five pinned sources valid.
- The final candidate introduces all four surveyed planets with reviewed broad
  classes (`rocky` for EE-1 and EE-2; `gas_giant` for EE-3 and EE-4), one described EE-2 moon,
  four anonymous children for EE-3's exact 67-moon inventory, and four anonymous
  children for EE-4's qualitative abundance. Aggregate facts remain on parents,
  anonymous children publish no representation metadata, and no unsupported class,
  colour, numeric gravity, physical ordering, or distance is authored.
- Human-review artifacts, bounded evidence, orchestration evidence, exact canonical
  diff, and superseded-candidate comparison remain under
  `/tmp/bobiverse-system-survey-1.16/`. Chapter `1.16` was not written canonically.
- Poll-complete validation transcripts:
  - `/tmp/bobiverse-system-survey-1.16/focused-validation.typescript`, SHA-256
    `83751441df95f5ac6839c6b5a7ba0ed979b39cc0a0584904aee471e56c24f138`,
    exit code 0;
  - `/tmp/bobiverse-system-survey-1.16/full-validation.typescript`, SHA-256
    `b3071d09e03ab7f87fccf23fdec71563cc4302b2ab3aa9fa139e18365f17ff76`,
    exit code 0.
- Full validation passed: formatting, lint, typecheck, 73 Python tests, data
  validation, 163 application tests, canonical narrative validation, TypeScript
  build, Vite production build, task metadata, schema/document identity, baseline
  fingerprints, temporary-corpus validators, and `git diff --check`.
- Independent implementation review found seven issues over two passes. All were
  corrected. The final fresh closure result was exactly `No findings.`
- The pre-existing Chapter `1.15` JSON, promotion-log file, promotion-log diff, and
  prior projection retain their recorded SHA-256 fingerprints.
