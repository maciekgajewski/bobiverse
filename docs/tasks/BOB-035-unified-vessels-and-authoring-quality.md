# BOB-035: unified vessels and authoring quality

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-29

## Objective

Replace the classification-only vessel-type model with unified vessel entities and
make extraction produce durable locations, brief current state, and entity-centered
encyclopedia descriptions that omit disclosure-gap prose.

## User-visible outcome

Readers can discover Heaven-1 as a vessel without an artificial ship/design split.
Object state is brief and current, descriptions explain the object rather than
retelling a character's actions or cataloguing what readers do not yet know, and
incidental places do not clutter the location browser or masquerade as
megastructures.

## Binding references

- `../adrs/0014-unified-vessel-entities-and-authoring-quality.md`
- `../adrs/0015-omit-disclosure-gaps-from-entity-descriptions.md`
- `../technical-design.md`, Sections 12 and 13
- `../implementation-plan.md`, Phases 2 and 4
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0007-additional-narrative-entity-types.md` as superseded by ADR-0014
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`, which supersedes ADR-0002's
  equal-year-only tie rule for chapter-authored facts
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## Decisions

- Apply ADR-0014 as a clean break with no `vessel_type` compatibility aliases.
- Keep historical completed tasks, reviews, and superseded ADR wording unchanged;
  migrate every live contract, runtime, UI, fixture, and integrated-documentation
  surface.
- Enforce one- or two-sentence `current_state` through authoring instructions,
  canonical regression audit, and review rather than JSON Schema sentence parsing.
- Apply entity-centered encyclopedia voice to every description type, allowing named
  relationships only when defining or explicitly attributed.
- Omit every semantic disclosure-gap statement from descriptions. Keep missing
  knowledge explicit in extraction evidence, reconciliation, uncertainty, and human
  review instead of reader-facing object prose.
- Require direct evidence that a capability belongs to the described entity;
  consulting an interface for documentation does not assign the capability to that
  interface.
- Preserve immutable sealed evidence while making reviewed overstatement corrections
  deterministic through a Pass-2-only registry keyed by chapter, source hash,
  sealed-ledger hash, and claim ID.
- Reserve `megastructure` for exceptional physical scale. Use `locale` for ordinary
  durable stations and bases.
- Omit the Chapter 1.12 launch station and use `location:earth`, its nearest
  established supported parent, as the chapter and Bob appearance location.
- Keep Chapter 1.12 review-only. This task revises and validates its temporary
  candidate but does not authorize canonical promotion.

## In scope

- Rename `vessel_type` schemas, IDs, entity types, updates, diagnostics, projection,
  activity, browser grouping, inspector labels, fixtures, and tests to `vessel`.
- Add optional clearable `current_state` to vessel introductions and updates.
- Update technical design, data-model definition, implementation plan, extraction
  documentation, Phase 2 desktop UI design, visual-testing guidance, README, and the
  repository-local extraction skill.
- Add durable extraction rules for vessel eligibility, megastructure scale, ordinary
  station/base representation, incidental-location omission, and nearest-parent
  fallback.
- Add authoring rules for brief current state and entity-centered descriptions.
- Add the disclosure-gap omission rule to every extraction instruction surface read
  by agents preparing chapter summaries and candidates.
- Audit all canonical Chapter 1.1-1.11 `current_state` values and descriptions against
  the new rules, correcting every violation at its original reader boundary.
- Audit zero state, canonical Chapters 1.1-1.11, and the temporary Chapter 1.12
  candidate for all semantic disclosure-gap variants and remove them from
  descriptions without inventing replacement facts.
- Record a complete checked-in editorial audit ledger covering every canonical
  `current_state` and `description` through Chapter 1.11, including compliant values
  that require no edit and the evidence for each correction.
- Revise the temporary Chapter 1.12 candidate to omit the station entity, use Earth,
  introduce mapped Epsilon Eridani and Heaven-1, keep Bob's state brief, and make all
  descriptions entity-centered.
- Add focused regression coverage for the clean-break ID/type contract, vessel state,
  vessel name replacement, UI grouping/inspection/icons, actionable diagnostics,
  canonical state brevity, and extraction guidance.
- Forward-test revised Pass 2 in a fresh Terra/high agent using the sealed Chapter
  1.12 ledger and only the Chapter 1.11 prior state.

## Out of scope

- Tracking separate vessel instances and design classes.
- Preserving `vessel_type`, `vessel_type:*`, aliases, or migration compatibility.
- Adding an `installation` location kind.
- Hard sentence parsing or `maxLength` constraints in JSON Schema.
- Re-extracting Chapters 1.1-1.11 from source text.
- Removing uncertainty from sealed ledgers, reconciliation reports, evidence review,
  or other non-reader-facing extraction artifacts.
- Changing source evidence or the sealed Chapter 1.12 ledger.
- Canonically promoting Chapter 1.12 without separate exact-candidate approval.
- Rewriting historical completed tasks, review ledgers, or superseded ADRs merely to
  replace old terminology.

## Chapter 1.12 external handoff

The source is
`/home/maciek/bobiverse-project/source-text/1.12.txt`, SHA-256
`db175c854075f6d104ea3c89e755e43d810d1f0bee6cf75402ab81c59b10b3ee`.
The current sealed Pass 1 ledger is
`/tmp/bobiverse-1-12-pass1.4yJAXN/sealed-ledger.json`, SHA-256
`5dc73600f60241dc4f149fddbdc4506291ef084b92b6ed466b4856c4ec2d019c`.
The superseded pre-BOB-035 candidate is
`/tmp/bobiverse-1-12-pass2.AinVcm/candidate-1.12.json`; it is review-only and
must not be promoted.

If the `/tmp` ledger is unavailable, recreate only blind Pass 1 with
`$extract-bobiverse-chapter 1.12
"/home/maciek/bobiverse-project/source-text/1.12.txt"` in the mandated fresh
Terra/high context. Verify the source fingerprint above, seal the ledger, verify all
chunks were processed, and require the sealed-ledger SHA-256 above before beginning
Pass 2. A mismatch stops implementation for Captain review.

After implementing the new contract and skill, run a fresh Terra/high Pass 2 from the
sealed ledger into deterministic workspace `/tmp/bobiverse-bob035-1.12`. Build its
temporary corpus at `/tmp/bobiverse-bob035-1.12/narrative-root-final`.

## Acceptance criteria

1. Live schema, TypeScript, validation, projection, activity, diagnostics, fixtures,
   tests, and UI use `vessel` and `vessel:*`; legacy vessel-type forms are rejected.
2. Vessel introductions support optional nonempty `description` and `current_state`;
   updates may replace `name`, may replace or clear `description` and
   `current_state`, and never change `id`. Focused projection coverage proves name
   replacement and clearing behavior under the shared reader/story ordering rules.
3. The browser uses a `Vessels` group and the inspector identifies an entity as
   `Vessel`, while preserving generated activity and spoiler projection behavior.
4. Integrated documentation and the extraction skill define the unified naval
   vessel/design model without retaining the classification-only restriction.
5. `megastructure` is explicitly reserved for exceptionally large engineered
   structures; ordinary durable stations/bases use `locale`; incidental, unnamed, or
   short-lived locations are omitted.
6. Location authoring uses the most specific supported location and falls back to the
   nearest established reader-visible parent without inventing containment.
7. Every canonical `current_state` through Chapter 1.11 is a one- or two-sentence
   latest-condition statement rather than identity prose, history, or synopsis.
8. Every canonical description through Chapter 1.11 passes an entity-centered audit
   at its reader boundary and uses general capability language, with named-character
   relationships retained only when defining or explicitly attributed. A checked-in
   audit ledger enumerates every description, every current-state value, its result,
   and each correction; focused regression coverage prevents the known failure forms
   from returning.
9. The revised Chapter 1.12 candidate uses Earth for chapter/Bob location, introduces
   no station, maps Epsilon Eridani to `stellar-system-005582`, introduces
   `vessel:heaven-1` with description and brief current state, keeps Bob's current
   state brief, and contains entity-centered technology descriptions.
10. Canonical corpus validation and generation through Chapter 1.11 pass; the
    temporary Chapter 1.12 corpus validates with exactly 12 chapters.
11. A fresh Terra/high Pass 2 forward test independently applies the new rules and a
    fresh post-implementation review returns no unresolved findings.
12. No zero-state or canonical Chapter 1.1-1.11 description contains a statement or
    clause whose purpose is to announce unrevealed, unknown, unexplained, unavailable,
    unspecified, or otherwise missing knowledge.
13. The revised Chapter 1.12 candidate satisfies the same rule; Pass 1 evidence and
    Pass 2 reconciliation retain the missing-knowledge claims outside descriptions.
14. The extraction skill, claim-ledger reference, integrated authoring guidance, and
    focused tests make the rule visible and actionable for agents preparing summaries
    and candidates.
15. A fresh forward test omits disclosure-gap prose and does not assign a capability
    to an interface merely because the interface supplied its documentation.
16. The reviewed Chapter 1.12 claim-019 correction is fingerprinted in a Pass-2-only
    exception registry, is invisible to blind Pass 1, and leaves the sealed ledger
    unchanged.

## Validation commands

```bash
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter 1.11 --output /tmp/bobiverse-world-1.11.json
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /tmp/bobiverse-bob035-1.12/narrative-root-final
npm run test -- --run \
  tests/unit/narrative.test.ts \
  tests/unit/narrative-browser.test.ts \
  tests/unit/narrative-diagnostics.test.ts \
  tests/unit/source-evidence-helper.test.ts \
  tests/component/ObjectBrowserIcons.test.tsx \
  tests/component/ObjectInspector.test.tsx
npm run format:check
npm run lint
npm run typecheck
npm run build
git diff --check
```

## Documentation and generated artifacts

- Update all integrated current-authority documentation named in scope, including
  `docs/design/phase-2-desktop-ui.md` and `docs/visual-testing.md`, plus this task and
  the task index.
- Add `docs/reviews/BOB-035-editorial-audit.md` as the durable retroactive audit
  ledger; it contains original project-authored structured prose only, never source
  excerpts.
- Regenerate the ignored chapter manifest through the normal validation path; do not
  retain generated world projections in version control.
- Keep the revised Chapter 1.12 candidate, sealed evidence, reconciliation report,
  evidence excerpts, and temporary corpus under `/tmp`.
- Do not add source text, evidence artifacts, or generated projections to Git.

## Risks and cautions

- The clean break touches identity parsing, update ownership, activity grouping, and
  UI exhaustiveness. Partial migration can silently hide vessels even when schema
  validation passes.
- Unified records intentionally conflate a first named ship with its derived design
  family. Descriptions must make the revealed scope clear without inventing later
  instances.
- Parent-location fallback is valid only when the hierarchy is established. It must
  not become permission to infer an unsupported parent.
- Retroactive description replacement must preserve all useful reader-visible prior
  knowledge at each chapter boundary.
- Brief current state must not erase durable identity; move defining information to
  `description` when the entity type owns one.

## Validation status

Implementation validation completed on 2026-07-28:

- Repository-local extraction skill validation passed.
- Canonical narrative validation passed with zero state and 11 chapter files.
- Chapter 1.11 projection generation passed.
- Fresh Pass 2 ran in an explicitly requested `gpt-5.6-terra`, high-reasoning,
  non-forked worker. Candidate SHA-256:
  `dbc03bd205c4ed945e3cec9bedfb2f973d0c68ae7aabb8a21b3525f275a41385`
  after resolving post-implementation finding BOB035-F-007.
- The temporary final corpus validated with exactly 12 chapter files.
- All 6 focused test files passed: 47 tests.
- Formatting, lint, typecheck, production build, and `git diff --check` passed.
- The production build retained its existing advisory for a client chunk larger
  than 500 kB; it is not a BOB-035 regression or failure.

Post-implementation finding BOB035-F-007 removed an unsupported GUPPI capability
from the temporary Chapter 1.12 candidate. The rebuilt corpus validated, and the
repeat independent review returned `No findings.`

The 2026-07-29 ADR-0015 follow-up is authorized. Its pre-implementation review
returned `No findings.`

ADR-0015 follow-up validation:

- Zero state and all canonical descriptions through Chapter 1.11 were audited; the
  durable ledger now covers 50 zero-state/canonical description and current-state
  values.
- Five canonical descriptions were corrected without changing IDs, relationships,
  dates, locations, mentions, or reveal boundaries.
- The minimally revised review-only Chapter 1.12 candidate SHA-256 is
  `81c9ba6bf4aaad27968527b39d097dc05a2ff52ccdc9ebbbda054faac4deb51b`;
  its rebuilt temporary corpus validates with exactly 12 chapters.
- An initial fresh forward test omitted disclosure gaps but repeated the reviewed
  claim-019 GUPPI attribution error. That result drove the fingerprinted,
  Pass-2-only reconciliation exception registry.
- A subsequent fresh `gpt-5.6-terra`, high-reasoning, non-forked Pass 2 applied the
  registry, omitted disclosure gaps, authored no GUPPI update, and validated its
  separate 12-chapter corpus. Its evaluation candidate SHA-256 is
  `88cb130583af481d0e4d59ddc44c29fd72a62e98abe4942ac1f543f4486ee896`.
- Repository-local skill validation passed.
- All 6 focused test files passed: 48 tests.
- Canonical validation, Chapter 1.11 projection generation, formatting, lint,
  typecheck, production build, and `git diff --check` passed.

The post-implementation ADR-0015 follow-up review returned `No findings.`
