# BOB-030: enforce mapped-anchor bootstrap integrity

Status: Done
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-07-29

## Objective

Restore the repository-wide contract that every canonically mapped non-Sol narrative
location has exactly one source-backed astronomy bootstrap before acquisition
planning, generation, validation, or build proceeds.

Repair the immediate Epsilon Eridani omission, automatically derive bootstraps for
exact unambiguous matches already established by the accepted astronomy corpus,
replace uncontrolled dictionary lookups with one shared fail-fast resolver, and add
a staged routine-promotion preflight so an unsupported or ambiguous mapped anchor
never enters the canonical corpus.

## User-visible outcome

Chapter 1.12's Epsilon Eridani location remains mapped to the existing true-scale
astronomy system without requiring a redundant manual astronomy approval. Production
builds succeed from a self-consistent static corpus.

When a future chapter introduces a mapped stellar system whose exact normalized name
or alias resolves to one accepted source-backed astronomy system, extraction derives
the bootstrap automatically. Fuzzy, partial, multiple, unsupported, or
source-incomplete matches stop with a direct actionable error before canonical
chapter data or the promotion log changes.

## Binding references

- `../technical-design.md`, especially the offline astronomy pipeline and
  narrative-to-astronomy mapping contracts
- `../data-model-definition.md`, especially mapped narrative locations
- `../implementation-plan.md`, Phase 2
- `../data/astronomy-pipeline.md`
- `../chapter-extraction.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0012-20pc-census-identity-and-substellar-presentation.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `BOB-013-astronomy-neighbourhood-catalogue.md`
- `BOB-035-unified-vessels-and-authoring-quality.md`
- `BOB-037-seed-largest-planetary-moons.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

ADR-0016 authorizes deterministic automatic bootstrapping for exact unambiguous
accepted matches. This task does not change catalogue authority, coordinates, source
precedence, narrative mapping semantics, or runtime architecture. If implementation
would permit fuzzy or positional matching, infer coordinates, or change source
authority, stop and propose a superseding ADR rather than expanding scope silently.

## Root-cause evidence

- Canonical Chapter 1.12 names Epsilon Eridani and maps it to
  `stellar-system-005582`.
- `mapped_anchor_ids()` therefore returns `sol` and
  `stellar-system-005582`.
- `data/source/system-review.json` has no `anchor_bootstraps` entries.
- The accepted astronomy review gives `stellar-system-005582` the effective name
  `Epsilon Eridani`. The accepted candidate has no system review requirement, adopts
  `stellar-component-004725`, and that component has GCNS/Gaia source ID
  `5164707970261890560` with GCNS median Bayesian Cartesian geometry.
- The narrative name and accepted effective astronomy name are therefore an exact
  normalized match with one unambiguous source-backed result.
- `validate_acquisition_queries()` builds a bootstrap dictionary and immediately
  indexes `bootstrap_by_anchor[anchor]`. The absent manual record raises raw
  `KeyError: 'stellar-system-005582'` before the later controlled integrity check.
- Refresh, validation, and generation contain separate versions of the structural
  bootstrap rule, allowing their decisions and diagnostics to drift.
- BOB-035 validated Chapter 1.12 in a temporary narrative corpus while canonical
  astronomy validation still saw only the preceding canonical chapters. Routine
  promotion neither presented the temporary root to astronomy validation nor ran
  `npm run data:validate`, so the cross-domain invariant escaped until a later
  production build.

## Ratified repair

### Deterministic exact bootstrap resolution

Add one pure resolver in `scripts/common.py` and use it from every bootstrap consumer:
acquisition refresh, offline validation, runtime generation, and exact-source
validation.

Extend mapped-anchor discovery to replay effective location state in reading order:
start from the nested zero-state hierarchy, apply chapter introductions, and then
apply location updates in authored order. Return each stable astronomy ID with every
narrative location name paired with it during that replay, including name-only and
astronomy-ID-only updates. Accept an optional narrative-root path, defaulting to
canonical `data/narrative`.

For each mapped non-Sol anchor, the resolver must:

1. require its `astronomy_object_id` to identify exactly one accepted candidate
   system;
2. obtain the system's effective accepted name and aliases from the review override,
   falling back to the candidate names only when no override exists;
3. normalize names only through Unicode-aware case folding, trimming, and collapsing
   whitespace;
4. require every narrative name for the anchor to equal one effective accepted name
   or alias after that normalization and require that normalized name not to be
   accepted for another candidate system;
5. reject unresolved review requirements or ambiguities; an accepted
   adopted-component override may resolve the candidate's original position review
   requirement;
6. select the adopted component through the accepted system override or deterministic
   candidate adoption;
7. require source-backed position geometry;
8. derive `gcns` plus the exact Gaia/GCNS source ID for GCNS geometry, or `cns5` plus
   the exact CNS5 ID for the reviewed CNS5 fallback; and
9. return one ordered bootstrap containing `anchor_id`, `system_id`, `catalogue`, and
   decimal-string `source_id`.

Normalization must not remove punctuation, expand abbreviations, or perform fuzzy,
partial, phonetic, coordinate, or model-based matching.

Optional explicit reviewed `anchor_bootstraps` remain available only for exceptions
that automatic resolution cannot establish. Require every explicit record to keep
`system_id == anchor_id`; an exception may authorize only the otherwise non-automatic
narrative name-to-system link. Its catalogue and source ID must still match the
accepted adopted position component and that component's GCNS-then-CNS5 position
derivation. It may not redirect the narrative mapping, select a secondary component,
or change source precedence. Reject duplicate, missing, extra, mismatched-system,
non-adopted-source, wrong-precedence, and malformed explicit records. An explicit
exception and automatic resolution must produce only one effective bootstrap for an
anchor. Preserve mapped-anchor order and raise stable anchor-specific `ValueError`
diagnostics before any consumer indexes a record or source row.

The shared resolver proves that the final `system_id` exists and that the bootstrap
catalogue/source is the exact accepted identity and derivation of its adopted
position component. Existing deeper checks remain responsible for proving source-row
presence, source-backed geometry, and coverage within the GCNS boundary.

### Epsilon Eridani result

Do not add a redundant manual Epsilon Eridani record to `system-review.json`.
Deterministic resolution must produce exactly:

```json
{
  "anchor_id": "stellar-system-005582",
  "system_id": "stellar-system-005582",
  "catalogue": "gcns",
  "source_id": "5164707970261890560"
}
```

The result identifies an existing accepted candidate and source row. It does not
create a new astronomical identity, infer coordinates, or require new review
metadata. Existing BOB-026 review attribution remains unchanged because no new manual
astronomy decision is recorded there.

### Explicit narrative-root validation

Add `--narrative-root <path>` to `scripts/validate_data.py`. Discover one anchor set
from that root and use it consistently for acquisition-query, exact-source, coverage,
and runtime checks in the validation run. Refresh and generation continue to use the
canonical default.

Add `--review-path <path>` as a validation-only fixture input, defaulting to canonical
`data/source/system-review.json`, so an ambiguity can be exercised without mutating
accepted astronomy evidence.

### Acquisition artifacts

Run the sole networked command, `npm run data:refresh`, after deterministic resolution
is implemented. It must record:

- an exact GCNS bootstrap query for source `5164707970261890560`;
- an Epsilon Eridani GCNS coverage query;
- refreshed query accounting and checksums; and
- deterministically reconciled candidates and generated source artifacts.

Epsilon Eridani is already present in the committed GCNS, CNS5, Gaia-enrichment,
candidate, identity-registry, and runtime artifacts. Review the complete refresh
diff. Stable system/component IDs, accepted source identity, effective name, and
adopted GCNS geometry must remain unchanged.

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
4. Allow an exact unambiguous bootstrap to resolve automatically without separate
   Captain approval.
5. If either preflight fails, leave canonical chapters and the promotion log
   byte-for-byte unchanged.
6. Only if both preflight checks pass, write the exact candidate canonically.
7. Re-run canonical narrative and astronomy validation before logging success.

The temporary-root astronomy run uses canonical reviewed astronomy inputs and
generated runtime, changing only the narrative root used to discover mapped anchors.
An ambiguous or unsupported anchor requires its own authorized astronomy task before
promotion can resume.

The focused astronomy checks are required even when the candidate itself changes
only narrative JSON. A full production build remains part of BOB-030 completion but
is not added to every routine editorial promotion.

## In scope

- Derive the exact Epsilon Eridani GCNS bootstrap automatically.
- Introduce and adopt the shared deterministic bootstrap resolver across all
  acquisition, validation, and generation consumers.
- Preserve optional explicit reviewed exception records without requiring one for an
  exact deterministic match.
- Allow offline astronomy validation to discover mapped anchors and their names from
  an explicit temporary narrative root.
- Preserve exact source-identity, geometry, coverage, and generated-runtime checks.
- Refresh and review pinned astronomy source/query artifacts required by the new
  anchor, then regenerate static astronomy runtime.
- Add regression tests for exact normalized accepted-name and alias matches; case and
  whitespace normalization; fuzzy, partial, punctuation-different, multiple,
  unsupported, review-required, source-incomplete, duplicate, extra, and malformed
  records; and controlled errors rather than incidental lookup exceptions.
- Add staged narrative/astronomy preflight and post-write validation to routine
  chapter-promotion documentation and the local extraction skill.
- Correct BOB-037's completion evidence, record BOB-030 closure, and mark BOB-037
  `Done` only after its blocked production build and all BOB-030 validation pass.
- Update directly affected integrated and operator documentation.

## Out of scope

- Changing Chapter 1.12 or Chapter 1.13 narrative facts, mappings, or approved
  candidate content.
- Changing stable astronomy system/component IDs, coordinate authority, catalogue
  precedence, context radius, projection semantics, or browser-time behavior.
- Fuzzy, partial, phonetic, coordinate-based, or model-confidence identity matching.
- Automatically accepting a candidate with unresolved review requirements.
- Adding fallback coordinates, automatic source-authority changes, or compatibility
  behavior for malformed records.
- Accepting unrelated live-catalogue drift without explicit Captain review.
- Redesigning the complete astronomy review schema or chapter-extraction workflow.

## Acceptance criteria

1. Epsilon Eridani resolves automatically to system `stellar-system-005582`,
   component `stellar-component-004725`, GCNS source `5164707970261890560`, and its
   accepted median Bayesian Cartesian geometry without a manual anchor record.
2. Every mapped non-Sol canonical anchor has exactly one structurally valid effective
   bootstrap before any consumer accesses its fields.
3. Refresh, offline validation, generation, and exact-source validation share one
   resolver rather than duplicating missing/invalid-record logic.
4. Exact accepted-name and alias matches succeed after case-folding and whitespace
   normalization only.
5. Fuzzy, partial, punctuation-different, multiple, unsupported, review-required,
   and source-incomplete matches fail with stable anchor-specific `ValueError`
   messages.
6. Duplicate, extra, mismatched-system, non-adopted-component source,
   CNS5-when-GCNS-adopted, malformed-catalogue, malformed-source-ID, and
   missing-system-ID explicit fixtures fail without `KeyError`, `StopIteration`, or
   another incidental lookup exception.
7. The deeper validator proves the derived Epsilon source ID is an exact identity in
   its accepted system, and generation uses its accepted source-backed GCNS position.
8. The refreshed GCNS manifest contains exact bootstrap and coverage queries for
   Epsilon Eridani with valid accounting and checksums.
9. Epsilon Eridani's stable IDs, accepted effective name, source ID, position
   derivation, and coordinates remain unchanged.
10. The refresh diff contains no silently accepted unrelated catalogue drift and no
    manually fabricated source or manifest content.
11. `data:validate` accepts an explicit narrative root and uses it consistently for
    every mapped-anchor check; default invocation remains canonical.
12. Both promotion instruction surfaces require temporary-root narrative and
    astronomy preflight before canonical write, then canonical validation before
    recording success.
13. A staged exact-match fixture resolves automatically. Unsupported and ambiguous
    fixture candidates fail before canonical files or the promotion log change, with
    before/after hashes proving atomicity.
14. `system-review.json` truthfully attributes acceptance of the refreshed candidate
    snapshot while containing no redundant manual Epsilon anchor decision.
15. Canonical Chapters 1.12 and 1.13, the moon-complete zero state, and all existing
    narrative projections remain valid and unchanged except for intended generated
    manifest effects.
16. BOB-037's inaccurate “unrelated” failure classification is corrected and, after
    successful production validation, BOB-037 and its index entry are `Done`.
17. Every documented validation command passes, or an exact blocking deviation is
    recorded without reducing scope.

## Validation commands

Focused regression checks:

```bash
npm run data:test
npm run data:validate
npm run data:validate -- --narrative-root /tmp/bobiverse-bob030-valid-narrative-root
npm run data:generate
```

Prepare temporary exact-match and unsupported narrative roots, plus a temporary
review fixture that gives a second accepted system the exact Epsilon Eridani alias.
Run astronomy validation against each. The exact match must pass; the other two are
expected failures with actionable `ValueError` diagnostics:

```bash
npm run data:validate -- --narrative-root /tmp/bobiverse-bob030-exact-narrative-root
npm run data:validate -- --narrative-root /tmp/bobiverse-bob030-unsupported-narrative-root
npm run data:validate -- --narrative-root /tmp/bobiverse-bob030-exact-narrative-root --review-path /tmp/bobiverse-bob030-ambiguous-review.json
```

Capture canonical narrative and promotion-log hashes before and after the
expected-failure checks. They must remain unchanged.

Authorized network refresh and deterministic follow-up:

```bash
npm run data:refresh
npm run data:generate
npm run data:test
npm run data:validate
```

Before accepting refreshed artifacts, inspect
`git diff -- data/source src/data/nearby-systems.json` and verify stable Epsilon
Eridani identity, source, name, position derivation, and coordinates.

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

- Commit every deterministically refreshed source manifest/extract or generated
  runtime artifact required by the new anchor.
- Keep source snapshots, query accounting, checksums, candidate reconciliation, and
  generated runtime mutually consistent.
- Update ADR-0016, `docs/technical-design.md`,
  `docs/data/astronomy-pipeline.md`, `docs/chapter-extraction.md`, the repository
  extraction skill, BOB-037, this task's completion evidence, ADR/task indexes where
  applicable, and `docs/tasks/README.md`.
- Do not commit source book text, temporary chapter evidence, local virtual
  environments, test output, or unrelated live-catalogue drift.

## Risks and unresolved decisions

- Exact normalized matching intentionally rejects punctuation differences and
  plausible synonyms. Those cases require explicit review rather than broader
  automatic matching.
- The explicit network refresh may observe catalogue changes since the committed
  snapshot. The task has a stop condition for unrelated drift.
- Epsilon Eridani is already within the current Sol-centred extract, but its explicit
  bootstrap and anchor-centred coverage queries remain required for reproducible
  future coverage.
- Running astronomy validation for every promotion adds an offline step but closes a
  demonstrated cross-domain consistency gap.
- No unresolved architecture or product decision remains.

## Preparation evidence

- Root cause reproduced on 2026-07-29 against the current canonical corpus:
  `npm run data:validate` raises raw
  `KeyError: 'stellar-system-005582'` in `validate_acquisition_queries()`.
- `npm run data:generate` fails with the controlled missing-bootstrap error.
- `npm run narrative:validate` passes with zero state and 13 chapter source files,
  proving the immediate failure is the cross-domain astronomy contract.
- The exact Epsilon Eridani candidate system, effective reviewed name, adopted
  component, GCNS source ID, position derivation, committed source row, and runtime
  entry were verified.
- The Captain ratified automatic resolution only for exact normalized accepted system
  name or alias matches. Fuzzy, partial, and multiple matches remain fail-closed.

## Implementation evidence

Implementation began after the Captain's `make it so` authorization and the bounded
decision that automatic resolution accepts only exact normalized effective names or
aliases. ADR-0016 records that architecture. The required independent
pre-implementation review raised two findings: explicit exceptions could redirect an
anchor to another system or select a non-adopted/wrong-precedence source. Both were
closed by requiring `system_id == anchor_id` and requiring every explicit
catalogue/source to equal the adopted position component's deterministic source.
Fresh closure review returned `No findings.`

The shared resolver in `scripts/common.py` now:

- discovers mapped anchor IDs and all narrative names from the canonical or explicit
  narrative root;
- normalizes only through case folding and whitespace collapse;
- requires each automatic name to be unique across effective accepted system names
  and aliases;
- derives the exact adopted GCNS or CNS5 source identity;
- validates optional explicit exceptions without permitting system redirection,
  secondary-component selection, or source-precedence changes; and
- returns stable anchor-specific `ValueError` diagnostics before lookup.

Refresh, validation, generation, exact-source validation, runtime coverage
validation, and the extraction/promotion workflow use that shared result. Epsilon
Eridani resolves automatically to:

```json
{
  "anchor_id": "stellar-system-005582",
  "system_id": "stellar-system-005582",
  "catalogue": "gcns",
  "source_id": "5164707970261890560"
}
```

`system-review.json` contains no manual Epsilon bootstrap record. Its accepted
candidate checksum and review metadata instead truthfully record inspection of the
deterministic BOB-030 coverage-refresh candidate snapshot.

The authorized 2026-07-29 refresh:

- retained all 147 prior GCNS rows without structured-record changes;
- added exactly 50 GCNS rows from the Epsilon Eridani bootstrap and coverage queries;
- retained CNS5, Gaia DR3, the pinned WDS source snapshot, and 20-pc census content
  unchanged apart from retrieval metadata;
- retained all 6,072 component IDs and 5,404 system IDs without additions,
  removals, or renumbering;
- applied GCNS geometry precedence to the 50 newly covered stable components and
  supplied deterministic adopted components for two previously positionless systems;
  and
- retained Epsilon Eridani's stable system/component IDs, source identity, effective
  name, position derivation, and coordinates.

The generated runtime contains 119 system nodes. Its independent coverage proof
records 96 non-Sol systems around Sol and 85 systems around Epsilon Eridani, with
overlap deduplicated by stable system identity.

Temporary-root promotion checks used
`/tmp/bobiverse-bob030-roots.zrVtQg`:

- all exact, unsupported-name, and non-accepted-catalogue-name roots passed narrative
  validation with zero state and 13 chapter files;
- the exact canonical root passed astronomy validation;
- the unsupported Alpha Centauri name failed with an anchor-specific exact-name
  `ValueError`;
- the non-accepted `GJ 144` name for Epsilon Eridani failed with the same controlled
  contract;
- a temporary review fixture assigning `Epsilon Eridani` to a second accepted system
  failed with the controlled “not unique across accepted astronomy systems”
  `ValueError`; and
- canonical narrative aggregate SHA-256
  `b0e0db9614795feb4af37e2b6caf87ae28cdd007c692695bbcb0cac74b6bd12e`
  and promotion-log SHA-256
  `a8ef8785456dfdecac52255d539a9af325af72dd77e35a87ef255ea7eaf83c3d`
  were unchanged before and after both expected failures.

Validation completed on 2026-07-29:

- `npm run data:test`: passed, 57 Python tests, including effective-state replay for
  independent name-only and astronomy-ID-only location updates.
- `npm run data:validate`: passed, 119 systems and five pinned sources.
- explicit narrative-root exact-match validation: passed.
- explicit unsupported, non-accepted-name, and duplicate-owner validations: failed
  as expected with controlled anchor-specific `ValueError` diagnostics.
- `npm run validate`: passed formatting, lint, typecheck, Python tests, astronomy
  validation, 23 Vitest files and 135 tests, narrative manifest and validation, and
  production build.
- `npm run test:e2e`: passed 42 tests across Chromium, Firefox, and WebKit.
- `git diff --check`: passed before the final documentation closure.
- Fresh independent post-implementation review: `No findings.`
