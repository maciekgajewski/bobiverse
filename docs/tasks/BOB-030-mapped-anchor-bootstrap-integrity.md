# BOB-030: enforce mapped-anchor bootstrap integrity

Status: Ready
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-07-29

## Objective

Restore the repository-wide contract that every canonically mapped non-Sol narrative
location has exactly one reviewed, source-backed astronomy bootstrap before
acquisition planning, generation, validation, or build proceeds.

Repair the immediate Epsilon Eridani omission, replace the current uncontrolled
dictionary lookup with one shared fail-fast bootstrap check, and add a staged
routine-promotion preflight so a candidate with an unsupported mapped anchor never
enters the canonical corpus.

## User-visible outcome

Chapter 1.12's Epsilon Eridani location remains mapped to the existing true-scale
astronomy system. Production builds succeed from a self-consistent static corpus.
If a future chapter introduces another mapped stellar system without reviewed source
identity and geometry, promotion stops with a direct, actionable error instead of a
raw `KeyError` or a later broken build.

## Binding references

- `../technical-design.md`, especially the offline astronomy pipeline and
  narrative-to-astronomy mapping contracts
- `../data-model-definition.md`, especially mapped narrative locations
- `../implementation-plan.md`, Phase 2
- `../data/astronomy-pipeline.md`
- `../chapter-extraction.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0012-20pc-census-identity-and-substellar-presentation.md`
- `BOB-013-astronomy-neighbourhood-catalogue.md`
- `BOB-035-unified-vessels-and-authoring-quality.md`
- `BOB-037-seed-largest-planetary-moons.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

No ADR is expected. This task restores the accepted reviewed-bootstrap and offline
static-data contracts; it does not change catalogue authority, coordinates, source
precedence, narrative mapping semantics, or runtime architecture. If implementation
would permit an unreviewed anchor, infer coordinates, or change source authority,
stop and propose an ADR rather than expanding scope silently.

## Root-cause evidence

- Canonical Chapter 1.12 maps `location:epsilon-eridani` to
  `stellar-system-005582`.
- `mapped_anchor_ids()` therefore returns `sol` and
  `stellar-system-005582`.
- `data/source/system-review.json` currently has no `anchor_bootstraps` entries.
- The accepted astronomy candidate `stellar-system-005582` adopts
  `stellar-component-004725`. That component has GCNS/Gaia source ID
  `5164707970261890560` and GCNS median Bayesian Cartesian geometry.
- `validate_acquisition_queries()` builds a bootstrap dictionary and immediately
  indexes `bootstrap_by_anchor[anchor]`. The missing Epsilon Eridani record therefore
  raises raw `KeyError: 'stellar-system-005582'`.
- The validator's controlled exact-bootstrap check runs later and cannot report the
  inconsistency first. Refresh and generation contain separate versions of the same
  structural rule, allowing their diagnostics and behavior to drift.
- BOB-035 validated Chapter 1.12 in a temporary narrative corpus while canonical
  astronomy validation still saw only the preceding canonical chapters. Routine
  promotion subsequently made Chapter 1.12 canonical, but the documented promotion
  checks neither presented that temporary root to astronomy validation nor ran
  `npm run data:validate`. The cross-domain invariant therefore escaped until a
  later production build.

## Ratified repair

### Epsilon Eridani review record

Add this exact reviewed bootstrap to `data/source/system-review.json`:

```json
{
  "anchor_id": "stellar-system-005582",
  "system_id": "stellar-system-005582",
  "catalogue": "gcns",
  "source_id": "5164707970261890560"
}
```

GCNS is used because the accepted component's adopted position is explicitly
derived from GCNS median Bayesian Cartesian geometry. The record identifies an
existing accepted candidate and source row; it does not create a new astronomical
identity or invent coordinates.

### Shared fail-fast contract

Add one pure bootstrap-index helper in `scripts/common.py` and use it from every
bootstrap consumer: acquisition refresh, offline validation, runtime generation, and
the validator's exact-source check.

Given the ordered mapped-anchor IDs and the review document, the helper must:

- exclude `sol` from the required reviewed records;
- require exactly one record per mapped non-Sol anchor;
- reject duplicate, missing, and extra anchor records;
- require a non-empty `system_id`;
- accept only `gcns` or `cns5`;
- require a non-empty decimal-string `source_id`;
- preserve mapped-anchor order in its returned index or records; and
- raise stable `ValueError` diagnostics that identify the affected anchors.

The existing deeper checks remain responsible for proving that `system_id` exists,
that `source_id` is an exact member identity in that candidate system, and that the
adopted component has source-backed geometry within the GCNS coverage boundary.
No consumer may index a bootstrap record before the shared structural helper has
validated it.

Extend `mapped_anchor_ids()` with an optional narrative-root path, defaulting to the
canonical `data/narrative` root. Add `--narrative-root <path>` to
`scripts/validate_data.py` and ensure every mapped-anchor check in that validation run
uses the one anchor set discovered from the selected root. Refresh and generation
continue to use the canonical default.

### Acquisition artifacts

Run the sole networked command, `npm run data:refresh`, after adding the reviewed
record. This must record:

- an exact GCNS bootstrap query for source `5164707970261890560`;
- an Epsilon Eridani GCNS coverage query;
- refreshed query accounting and checksums; and
- deterministically reconciled candidates and generated source artifacts.

Epsilon Eridani is already present in the committed GCNS, CNS5, Gaia-enrichment,
candidate, identity-registry, and runtime artifacts. Review the complete refresh
diff. Its stable system/component IDs, accepted source identity, and adopted
GCNS geometry must remain unchanged.

Because the live catalogue can drift, do not silently fold unrelated upstream
changes into this repair. If refresh changes records outside the new bootstrap,
coverage envelope, their derived query accounting, or deterministic consequences,
stop and document the drift for separate Captain review. Do not hand-edit manifests,
checksums, normalized extracts, candidates, or generated runtime to avoid the
networked refresh.

### Staged promotion guard

Update both `docs/chapter-extraction.md` and the repository's
`extract-bobiverse-chapter` skill to require this order for an approved candidate:

1. Build a fresh temporary narrative root containing the current canonical baseline
   and chapters plus the exact approved candidate at its intended chapter path.
2. Run narrative validation against that temporary root.
3. Run `npm run data:validate -- --narrative-root <temporary-root>`.
4. Only if both preflight checks pass, write the exact candidate to the canonical
   chapter path.
5. Re-run canonical narrative and astronomy validation before logging success.

The temporary-root astronomy run uses canonical reviewed astronomy inputs and
generated runtime, changing only the narrative root used to discover mapped anchors.
If a candidate introduces an anchor without a reviewed exact bootstrap and generated
coverage, preflight fails with the shared actionable `ValueError`; the canonical
chapter files and promotion log remain byte-for-byte unchanged. That broader
astronomy addition requires its own authorized task before promotion can resume.

The focused astronomy checks are required even when the candidate itself changes
only narrative JSON, because narrative mappings are an input to astronomy acquisition
and runtime validation. A full production build remains part of task completion
below but is not added to every routine editorial promotion.

### Review provenance

When adding the BOB-030 bootstrap decision, update `system-review.json`'s `reviewer`
and `reviewed_at` metadata so it truthfully covers both the existing BOB-026 mappings
and the newly authorized BOB-030 anchor-bootstrap review. Do not leave the new
decision attributed solely to the 2026-07-28 BOB-026 review. Use the actual BOB-030
review date and wording that names both review scopes under Captain authorization.

## In scope

- Add the exact reviewed GCNS bootstrap for canonical Epsilon Eridani.
- Introduce and adopt the shared structural bootstrap-index helper across all
  acquisition, validation, and generation consumers.
- Allow offline astronomy validation to discover mapped anchors from an explicit
  temporary narrative root while retaining the canonical default for all existing
  invocations.
- Preserve the existing exact source-identity, geometry, coverage, and generated
  runtime checks after the structural check.
- Refresh and review the pinned astronomy source/query artifacts required by the new
  mapped anchor, then regenerate the static astronomy runtime.
- Add regression tests for missing, duplicate, extra, malformed, and valid mapped
  anchor bootstrap records, including proof that offline validation reports a
  controlled `ValueError` rather than `KeyError`.
- Add staged narrative/astronomy preflight and post-write validation to the routine
  chapter-promotion documentation and local extraction skill.
- Update the astronomy review metadata to truthfully include the BOB-030 bootstrap
  decision.
- Correct BOB-037's completion evidence, record BOB-030 closure, and mark BOB-037
  `Done` only after its previously blocked production build and all BOB-030
  validation pass.
- Update directly affected astronomy-pipeline documentation if the shared
  validation ownership or operator sequence needs to be stated explicitly.

## Out of scope

- Changing Chapter 1.12 or Chapter 1.13 narrative facts, mappings, or approved
  candidate content.
- Changing stable astronomy system/component IDs, coordinate authority, catalogue
  precedence, context radius, projection semantics, or browser-time behavior.
- Allowing a mapped non-Sol anchor without reviewed exact source identity.
- Adding fallback coordinates, fuzzy identity matching, automatic anchor selection,
  or compatibility behavior for malformed review records.
- Accepting unrelated live-catalogue drift without explicit Captain review.
- Redesigning the complete astronomy review schema or chapter-extraction workflow.

## Acceptance criteria

1. `system-review.json` contains exactly one Epsilon Eridani bootstrap with the
   ratified anchor ID, system ID, GCNS catalogue, and source ID.
2. Every mapped non-Sol canonical anchor has exactly one structurally valid reviewed
   bootstrap before any consumer accesses its fields.
3. Refresh, offline validation, generation, and exact-source validation share one
   bootstrap-index implementation rather than duplicating missing/invalid-record
   logic.
4. Missing, duplicate, extra, malformed-catalogue, malformed-source-ID, and missing
   system-ID fixtures fail with stable, anchor-specific `ValueError` messages. No
   such fixture can raise `KeyError`, `StopIteration`, or another incidental lookup
   exception.
5. The existing deeper validator proves Epsilon Eridani's source ID is an exact
   identity in `stellar-system-005582`, and generation uses its accepted
   source-backed GCNS position.
6. The refreshed GCNS manifest contains the exact bootstrap and coverage queries for
   Epsilon Eridani, with valid query accounting and checksums. Generated astronomy
   data remains offline and reproducible.
7. Epsilon Eridani retains stable system ID `stellar-system-005582`, component ID
   `stellar-component-004725`, source ID `5164707970261890560`, and its accepted GCNS
   median Bayesian Cartesian geometry.
8. The complete refresh diff contains no silently accepted unrelated catalogue
   drift and no manually fabricated source or manifest content.
9. `data:validate` accepts an explicit narrative root and uses that root consistently
   for every mapped-anchor check, while its default invocation remains canonical and
   backward compatible.
10. Both routine-promotion instruction surfaces require temporary-root narrative and
    astronomy preflight before any canonical write, then canonical validation before
    recording success.
11. A fixture candidate with an unbootstrapped mapped non-Sol anchor fails preflight
    with an actionable `ValueError`; before/after hashes prove that canonical chapter
    files and the promotion log remain unchanged.
12. Final `system-review.json` reviewer/date metadata truthfully attributes the
    BOB-030 bootstrap decision as well as the retained BOB-026 review scope.
13. Canonical Chapters 1.12 and 1.13, the moon-complete zero state, and all existing
    narrative projections remain valid and unchanged except for intended generated
    manifest effects.
14. BOB-037's inaccurate “unrelated” failure classification is corrected. Once the
    production build and all documented checks pass, BOB-037 and its index entry are
    `Done` with BOB-030 validation evidence.
15. Every documented validation command passes, or an exact blocking deviation is
    recorded without reducing scope.

## Validation commands

Focused regression checks during implementation:

```bash
npm run data:test
npm run data:validate
npm run data:validate -- --narrative-root /tmp/bobiverse-bob030-valid-narrative-root
npm run data:generate
```

Also prepare `/tmp/bobiverse-bob030-invalid-narrative-root` with one otherwise-valid
candidate that adds an unbootstrapped mapped anchor, then run:

```bash
npm run data:validate -- --narrative-root /tmp/bobiverse-bob030-invalid-narrative-root
```

This is an expected-failure check. Capture canonical narrative and promotion-log
hashes before and after; the command must fail with the expected `ValueError`, and
both hashes must remain unchanged.

The authorized networked refresh and deterministic follow-up:

```bash
npm run data:refresh
npm run data:generate
npm run data:test
npm run data:validate
```

Before accepting refreshed artifacts, inspect `git diff -- data/source
src/data/nearby-systems.json` and verify the stable Epsilon Eridani identities,
source ID, position derivation, and coordinates.

Full repository closure:

```bash
npm run narrative:manifest
npm run narrative:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

## Documentation and generated artifacts

- Commit the reviewed `system-review.json` record and every deterministically
  refreshed source manifest/extract or generated runtime artifact required by the
  new anchor.
- Keep source snapshots, query accounting, checksums, candidate reconciliation, and
  generated runtime mutually consistent.
- Update `docs/chapter-extraction.md`, the repository extraction skill,
  astronomy-pipeline operator documentation, BOB-037, this task's completion
  evidence, and `docs/tasks/README.md`.
- Update `system-review.json` review metadata without erasing the retained BOB-026
  review scope.
- Do not commit source book text, temporary chapter evidence, local virtual
  environments, test output, or unrelated live-catalogue drift.

## Risks and unresolved decisions

- The explicit network refresh may observe catalogue changes since the committed
  snapshot. The task has a stop condition for unrelated drift rather than assuming
  it is safe.
- Epsilon Eridani is already within the current Sol-centred extract, but its explicit
  bootstrap and anchor-centred coverage queries are still required for reproducible
  future coverage if the configured radius or canonical anchor set changes.
- Running astronomy validation for every promotion adds an offline validation step
  but closes a real cross-domain consistency gap.
- No unresolved architecture or product decision remains.

## Preparation evidence

- Root cause reproduced on 2026-07-29 with the current canonical corpus:
  `scripts/validate_data.py` raised
  `KeyError: 'stellar-system-005582'` in `validate_acquisition_queries()`.
- The exact Epsilon Eridani candidate system, adopted component, GCNS source ID, and
  position derivation were verified against the committed source, candidate, and
  runtime artifacts.
- Independent pre-implementation task review raised two findings: promotion needed
  a pre-write atomicity guard, and the astronomy review metadata needed truthful
  BOB-030 provenance. Both were incorporated through the staged narrative-root
  preflight and explicit metadata requirements.
- Independent review pass 2 returned `No findings.`
