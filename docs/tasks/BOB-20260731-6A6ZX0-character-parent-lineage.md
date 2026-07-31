# BOB-20260731-6A6ZX0: character parent lineage

Status: Done
Phase: 3 (character histories and genealogy)
Last updated: 2026-07-31

## Objective

Add one optional `parent_id` relationship to narrative characters so the same simple
model can represent direct replicant lineage and biological genealogy.

Apply the relationship to the review-only Chapter `1.17` candidate so Riker, Bill,
Milo, and Mario identify Bob as their direct source parent.

Apply the relationship canonically at Bob's Chapter `1.2` introduction so his direct
source parent is Robert Johansson.

## User-visible outcome

Reader-safe character projections can expose one direct parent relationship when the
source has revealed it. Chapter `1.17` records Bob as the parent of the four newly
created replicants without inventing replicant-specific types, creator roles, or
cycle-management machinery. Beginning with Chapter `1.2`, Bob records Robert
Johansson as his direct source parent.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `../implementation-plan.md`
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0006-generalized-narrative-zero-state.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`
- `../adrs/0017-supplemental-mention-completeness.md`
- `BOB-028-pin-chapter-extraction-agent-configuration.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../.codex/skills/extract-bobiverse-chapter/references/claim-ledger.md`

No new ADR is required. This task adds an ordinary optional relationship within the
existing chapter-authored narrative authority and reader/story-time projection
semantics. It does not change source ownership, spoiler policy, persistence,
deployment, or the direct entity union. ADR-0004 requires this schema change to
replace the current contract in place without versioning, fallback fields, migration
logic, or a legacy compatibility path.

## Ratified decisions

1. `parent_id` is an optional field on any character. It is not restricted to
   replicants and may also represent biological genealogy.
2. The value references one direct source parent character. For a replicant, this is
   the character state or backup from which the child was copied, not necessarily the
   operator who initiated the cloning machinery.
3. Character updates may set or replace `parent_id`; `null` clears it through the
   existing patch semantics.
4. The relationship uses the existing character-reference visibility rules. A parent
   must be available from zero state, an earlier chapter, or an earlier introduction
   in the same chapter.
5. Zero-state character relationships use ADR-0006 whole-snapshot semantics. A
   zero-state character may reference another zero-state character regardless of
   their relative `entities` array order.
6. The model does not add cycle detection, a replicant marker, a character subtype,
   a creator field, reverse-authored child lists, or multiple parents.
7. Generated projections carry the effective `parent_id`; reverse genealogy is
   derived by consumers when needed rather than authored as duplicate state.
8. Beginning with Chapter `1.14`, `parent_id` is a typed structural reference for
   supplemental-mention nonredundancy.
9. The Chapter `1.17` candidate assigns
   `parent_id: "character:bob-replicant"` to Riker, Bill, Milo, and Mario. Spike has
   no source-supported parent and receives no field.
10. Bob's canonical Chapter `1.2` introduction assigns
    `parent_id: "character:robert-johansson"`.

## In scope

- Extend character introductions with optional `parent_id`.
- Extend character updates with nullable `parent_id`.
- Support `parent_id` on zero-state characters under whole-snapshot, array-order-
  independent reference resolution.
- Resolve the reference through the existing introduction/update validation path.
- Project set, replace, and clear operations under existing reader-order and
  story-time rules.
- Treat `parent_id` as a structural direct-character reference when validating
  supplemental mentions from Chapter `1.14` onward.
- Update current technical design, data-model definition, implementation plan,
  chapter-extraction guidance, the repository-local extraction skill, and its
  blind-safe claim-ledger contract.
- Add focused schema, reference-order, projection, update, clear, spoiler-boundary,
  and supplemental-mention regression coverage.
- Add Robert Johansson as Bob's canonical direct source parent at Bob's Chapter
  `1.2` introduction and cover the projected relationship.
- Produce a revised Chapter `1.17` candidate and temporary corpus under `/tmp` from
  the existing clean sealed-evidence reconciliation artifacts.
- Validate the revised candidate without promoting it canonically.

## Out of scope

- Cycle detection or prevention.
- Restricting the relationship to replicants.
- Character kinds, subtypes, or an `is_replicant` marker.
- Multiple parents, creator/operator attribution, provenance objects, or confidence
  fields.
- Authored child arrays or a committed genealogy projection.
- Genealogy UI, graph rendering, layout, navigation, or search.
- Retrospective source audits for earlier chapters.
- Canonical Chapter `1.17` promotion or a promotion-log entry without separate
  approval of the revised exact candidate.
- Source text, evidence excerpts, sealed ledgers, temporary candidates, or generated
  projections entering version control.

## Acceptance criteria

1. The machine-readable narrative schema and its identical documented listing accept
   optional character `parent_id` values matching `character_id`.
2. Character updates accept a character ID or `null` for `parent_id`, and the field
   participates in the existing at-least-one-property update requirement.
3. Semantic validation rejects an unavailable or later parent and accepts an
   earlier-chapter or earlier-same-chapter parent through the existing reference
   ordering rules.
4. A zero-state character may reference another zero-state character regardless of
   their relative `entities` array order, and the generated zero-state projection
   retains that relationship.
5. Projection exposes no parent before its source chapter, applies set and replacement
   updates, and represents a cleared effective relationship as `parent_id: null`
   under the existing patch contract.
6. No cycle or replicant-type validation is introduced.
7. From Chapter `1.14` onward, a character referenced through `parent_id` is
   structurally represented and cannot also appear in `mentions`.
8. Integrated documentation and extraction guidance define `parent_id` as one direct
   source-parent relationship, require source evidence, and forbid inferred ancestry.
9. The exact revised Chapter `1.17` candidate adds Bob as `parent_id` for Riker, Bill,
   Milo, and Mario only, while preserving all other reviewed baseline-candidate
   values.
10. The revised temporary Chapter `1.17` corpus passes narrative and astronomy
    validation; candidate and staged chapter bytes are identical.
11. Bob's canonical Chapter `1.2` introduction identifies
    `character:robert-johansson` as `parent_id`, and the relationship is present in
    the Chapter `1.2` projection.
12. Focused and full repository validation pass, no source/evidence artifact enters
    Git, and an independent implementation review reports `No findings.`

## Validation

```bash
python3 scripts/tasks.py check
test "$(sha256sum /home/maciek/bobiverse-project/source-text/1.17.txt | cut -d' ' -f1)" = \
  881631e8a031d1208d9bdaa7a054bc475341f55e66d6bff7e8b8df451f70f8b2
test "$(sha256sum /tmp/bobiverse-1.17-pass2-clean.4PA5sG/sealed-claims.json | cut -d' ' -f1)" = \
  afe545237990f685b7f84bcb4b95ca276cbe270d90a5842c8c5f44529293e0d6
test "$(sha256sum /tmp/bobiverse-1.17-pass2-clean.4PA5sG/candidate.json | cut -d' ' -f1)" = \
  4294391bd0890294bfa2db9db3dd62946cd965a95a236992622fbd69732c7a16
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
cmp -s data/schema/narrative-data-model.schema.json <(
  awk '
    !found && /^```json$/ { found = 1; inside = 1; next }
    inside && /^```$/ { exit }
    inside { print }
  ' docs/data-model-definition.md
)
node --input-type=module -e '
  import assert from "node:assert/strict";
  import chapter from "./data/narrative/chapters/1/2.json" with { type: "json" };
  const bob = chapter.introducing.find(
    (entity) => entity.id === "character:bob-replicant",
  );
  assert.equal(bob?.parent_id, "character:robert-johansson");
'
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm test -- tests/unit/narrative.test.ts \
  tests/unit/source-evidence-helper.test.ts
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /tmp/bobiverse-1.17-parent-lineage/narrative
npm run data:validate -- \
  --narrative-root /tmp/bobiverse-1.17-parent-lineage/narrative
cmp -s \
  /tmp/bobiverse-1.17-parent-lineage/candidate.json \
  /tmp/bobiverse-1.17-parent-lineage/narrative/chapters/1/17.json
node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFileSync } from "node:fs";
  const baseline = JSON.parse(readFileSync(
    "/tmp/bobiverse-1.17-pass2-clean.4PA5sG/candidate.json",
    "utf8",
  ));
  const revised = JSON.parse(readFileSync(
    "/tmp/bobiverse-1.17-parent-lineage/candidate.json",
    "utf8",
  ));
  const children = new Set([
    "character:riker",
    "character:bill",
    "character:milo",
    "character:mario",
  ]);
  const verified = new Set();
  for (const introduction of revised.introducing ?? []) {
    if (children.has(introduction.id)) {
      assert.equal(
        introduction.parent_id,
        "character:bob-replicant",
        `${introduction.id} must identify Bob as parent`,
      );
      verified.add(introduction.id);
      delete introduction.parent_id;
    } else {
      assert.equal(
        Object.hasOwn(introduction, "parent_id"),
        false,
        `${introduction.id} must not gain parent_id`,
      );
    }
  }
  assert.deepStrictEqual(verified, children);
  assert.deepStrictEqual(revised, baseline);
'
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run validate
git diff --check
```

## Documentation and generated artifacts

- Keep `data/schema/narrative-data-model.schema.json` and the JSON listing in
  `docs/data-model-definition.md` byte-identical.
- Update `docs/technical-design.md`, `docs/data-model-definition.md`,
  `docs/implementation-plan.md`, and `docs/chapter-extraction.md`.
- Update the repository-local extraction skill and claim-ledger reference without
  adding auxiliary documentation.
- Regenerate the ignored chapter manifest through the normal validation path.
- Keep the revised candidate, temporary corpus, and exact canonical diff under
  `/tmp/bobiverse-1.17-parent-lineage`.
- Do not write `data/narrative/chapters/1/17.json` or append
  `docs/chapter-promotion-log.md`.

## Chapter 1.17 prerequisite artifacts

The implementation baseline is the clean review-only Pass 2 package below. The
discarded `/tmp/bobiverse-1.17-extract.lMbqVa` Pass 2 package is not an input.

- Source:
  `/home/maciek/bobiverse-project/source-text/1.17.txt`
- Source SHA-256:
  `881631e8a031d1208d9bdaa7a054bc475341f55e66d6bff7e8b8df451f70f8b2`
- Clean sealed ledger:
  `/tmp/bobiverse-1.17-pass2-clean.4PA5sG/sealed-claims.json`
- Sealed-ledger SHA-256:
  `afe545237990f685b7f84bcb4b95ca276cbe270d90a5842c8c5f44529293e0d6`
- Source metadata:
  `/tmp/bobiverse-1.17-pass2-clean.4PA5sG/source-metadata.json`
- Source-metadata SHA-256:
  `a32352c2879ee9503fc1edda10981a9a81a2b67ec01b3425223acb356ec224de`
- Exact clean baseline candidate:
  `/tmp/bobiverse-1.17-pass2-clean.4PA5sG/candidate.json`
- Baseline-candidate SHA-256:
  `4294391bd0890294bfa2db9db3dd62946cd965a95a236992622fbd69732c7a16`
- Reconciliation report:
  `/tmp/bobiverse-1.17-pass2-clean.4PA5sG/reconciliation-report.md`
- Reconciliation-report SHA-256:
  `fa715ea636133f30393091852c8ab84468992c934882c1f2e02a5188a928e53a`
- Source-mention review:
  `/tmp/bobiverse-1.17-pass2-clean.4PA5sG/source-mention-review.md`
- Source-mention-review SHA-256:
  `f17e8aef2ab0d4e5856c4eb2f2b5a18905157895a382511d729186f987219f31`
- Claim classification:
  `/tmp/bobiverse-1.17-pass2-clean.4PA5sG/claim-classification.md`
- Claim-classification SHA-256:
  `d9371f982d05f2a7216cc8988be789a5a5251a4a3d58e51073f4837eefa9fb78`

The revised candidate is derived mechanically from that exact baseline by adding
`parent_id: "character:bob-replicant"` to the Riker, Bill, Milo, and Mario
introductions and changing no other candidate value. Compare canonicalized JSON with
those four fields removed against the exact baseline, and compare final candidate
bytes with the staged temporary chapter. This is candidate revision authority only;
it does not authorize canonical promotion.

## Risks and mitigations

- A schema-only field could validate but disappear during projection. Focused tests
  cover introduction, update, replacement, clear, and spoiler boundaries.
- A parent could be duplicated as a supplemental mention. The common structural
  reference collector and Chapter `1.14` regression coverage include `parent_id`.
- A child list could drift if authored independently. Only the forward `parent_id`
  is canonical; reverse children remain derived.
- An extraction could infer lineage from similarity or naming. Guidance requires
  explicit source support and preserves ambiguity instead of guessing.
- Broad genealogy machinery would exceed the Captain's simple-field decision. Cycle
  checks, character typing, multiple parents, creator attribution, and UI remain
  explicitly out of scope.

## Implementation plan

1. Add `parent_id` to character introduction/update schema, reference collection,
   zero-state whole-snapshot semantics, generated projection coverage, and focused
   tests.
2. Integrate the field into current design, data-model, roadmap, and extraction
   contracts.
3. Revise the clean Chapter `1.17` candidate with four source-parent references,
   prepare a temporary corpus, and run exact narrative/astronomy validation.
4. Run focused and full repository validation, complete independent review, record
   evidence, and mark the task `Done`.

## Completion evidence

- `python3 scripts/tasks.py check`: passed, 38 task files.
- Repository-local extraction skill validation: passed.
- Machine-readable and documented schema listings: byte-identical.
- Focused lineage, diagnostics, extraction-helper, and public-equivalence regression
  suite: passed, 60 tests across four files.
- Full Python data suite: passed, 73 tests.
- Full TypeScript suite: passed, 174 tests across 23 files.
- Canonical narrative corpus: valid with zero state and 16 chapter files.
- Temporary revised narrative corpus: valid with zero state and 17 chapter files.
- Canonical and temporary astronomy validation: passed against 119 reconciled
  systems and five pinned astronomy sources.
- Formatting, lint, type checking, production build, and `git diff --check`: passed.
- Complete `npm run validate`: passed.
- Bob's canonical Chapter `1.2` introduction contains
  `parent_id: "character:robert-johansson"`; focused projection coverage and the
  refreshed public-equivalence snapshot retain it.
- The temporary Chapter `1.17` corpus was rebuilt from the updated canonical
  preceding chapters and passed both validators.
- Revised candidate and staged temporary chapter: byte-identical, SHA-256
  `6014aa065a5f57ba87e629d8711071d660acf75d4b800cb5002ee4d6d4888f7f`.
- Exact canonical diff:
  `/tmp/bobiverse-1.17-parent-lineage/exact-canonical-diff.patch`, SHA-256
  `7a6d31ff29a1772b10dc97976ad2c384cafa90165ff158c18063ab2d082edd96`.
- Baseline-preservation assertion: passed; removing the four approved `parent_id`
  fields produces the exact clean reviewed candidate.
- Canonical Chapter `1.17` and the chapter-promotion log remain unchanged.
- Initial independent implementation review found and the implementation resolved:
  - `F-005`: character updates now resolve `parent_id` against introductions from
    the same chapter while update targets retain the earlier-chapter restriction;
  - `F-006`: character schema diagnostics recognize `parent_id`, report its typed-ID
    constraint, and suggest the field for close misspellings.
- Independent closure review pass 6: `No findings.`
- Post-backfill independent closure review pass 7: `No findings.`
