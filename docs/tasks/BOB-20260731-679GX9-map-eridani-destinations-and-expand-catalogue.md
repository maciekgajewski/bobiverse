# BOB-20260731-679GX9: map Eridani destinations and expand catalogue coverage

Status: Done
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-07-31

## Objective

Map the real stellar destinations named in Chapters `1.18` and `1.19` to their
existing accepted astronomy identities, expand the generated catalogue around the
new Beta Hydri narrative anchor, and revise the review-only Chapter `1.19` candidate
to represent three non-exhaustive outer Jovian planets.

Deliver the astronomy aliases, source-backed anchor coverage, canonical Chapter
`1.18` correction, and revised Chapter `1.19` through `1.21` candidate chain as one
atomic change. Do not leave a state in which narrative locations carry astronomy IDs
that the accepted aliases, acquisition manifests, coverage checks, or generated
runtime cannot support.

## User-visible outcome

Delta Eridani, Beta Hydri, and Omicron2 Eridani appear at their real, true-scale
catalogue positions rather than as unmapped story locations. Entering the surveyed
Omicron2 Eridani system shows Vulcan, Romulus, OE-2, its capped moon inventory, and
three anonymous outer Jovians representing the source-supported minimum cardinality.
They communicate the source's qualitative plurality without claiming an exact total,
measured orbit, or catalogue-derived relative order.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, especially Sections 8, 9.2, 12, and 13
- `../implementation-plan.md`, especially Phases 1B, 2, and 4
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../chapter-promotion-log.md`
- `../data/astronomy-pipeline.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0012-20pc-census-identity-and-substellar-presentation.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0018-spoiler-projected-system-survey-observations.md`
- `../adrs/0020-guided-system-view-and-orbital-presentation.md`
- `../adrs/0021-qualitative-survey-planet-aggregates.md`
- `BOB-013-astronomy-neighbourhood-catalogue.md`
- `BOB-030-mapped-anchor-bootstrap-integrity.md`
- `BOB-20260730-PEMMHF-system-survey-body-observations.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`

ADR-0016 already permits exact accepted-alias bootstrap, BOB-013 already requires a
reproducible context sphere around every mapped narrative anchor, and ADR-0020 already
defines non-metric orbital ordering. ADR-0021 records the Captain's Chapter `1.19`
decision for the qualitative outer-Jovian aggregate and explicitly narrows ADR-0018
only for that fingerprinted case. No further ADR is required. This task does not
change astronomy authority, coordinate derivation, context radius, mapping semantics,
or runtime architecture. If implementation would require fuzzy or positional
identity matching, a different source authority, a radius change, or a general rule
that every qualitative planet count becomes three bodies, stop and propose the
required architecture decision instead.

## Verified starting evidence

- Canonical Chapter `1.18` introduces `location:delta-eridani` and
  `location:beta-hydri` as unmapped stars.
- `Delta Eridani` is the book-visible name for accepted candidate
  `stellar-system-003918`, currently emitted as `GJ 150`. Its adopted component is
  `stellar-component-004724`, with GCNS/Gaia source `5164120762333028736` and
  source-backed GCNS median Bayesian Cartesian geometry. The runtime currently
  includes this system but does not accept `Delta Eridani` as a name or alias.
- `Beta Hydri` is the book-visible name for accepted candidate
  `stellar-system-003557`, currently named `GJ 19`. Its adopted component is
  `stellar-component-004282`, with GCNS/Gaia source `4683897617110115200` and
  source-backed GCNS median Bayesian Cartesian geometry. It is present in the
  reconciled candidate corpus but absent from the current generated runtime because
  it lies outside the existing mapped-anchor union.
- The Chapter `1.19` candidate introduces `location:omicron2-eridani` as unmapped.
  `Omicron2 Eridani` is the book-visible name for accepted
  `stellar-system-002424`, currently emitted as `40 Eridani`. Its adopted component
  is `stellar-component-002943`, with GCNS/Gaia source
  `3195919528989223040` and source-backed GCNS median Bayesian Cartesian geometry.
  The accepted review currently gives it no `Omicron2 Eridani` alias.
- Chapter `1.19` source SHA-256 is
  `062f9914310265af73b10f68ccabb4227a1a4cec43322055e692c96038eb395c`.
  Its sealed ledger SHA-256 is
  `cbc7a8f4b27f3eabbba3630164ecd45e0f950a59aaca9b302239ed954b48e0b7`.
- Chapter `1.20` source SHA-256 is
  `6334d84a7f5166f06858153ff9e139eefec455d5e27cedceb46bf847c7a3b3a8`.
  Its sealed ledger SHA-256 is
  `cc7727fcfff4becba43f6da953d38cce0fd1e3260d296500678a50d27d91bae9`.
- Chapter `1.21` source SHA-256 is
  `40747de63712d3523aeddfa939946510a7927277a96c38e343249b3635e3cb72`.
  Its sealed ledger SHA-256 is
  `3ebc97e4d45a3475833a8edf22349a06872c13e279792cd23856b5c89b32e2cc`.
- The current review-only candidate SHAs are Chapter `1.19`
  `3b8c0e77fcd5760a2e9d7c9aeadc522b967683d6b40d568ed42b065eb16ed74d`,
  Chapter `1.20`
  `548f9a735c538461b2a757f8aa7048628155b27487436fca5154526fe78a76f5`,
  and Chapter `1.21`
  `db0313316627809c31b2d5e4135bd341a7709c3651e23537bc0a03fe0c7feb9e`.
  They are comparison inputs, not canonical authority.

## Ratified decisions

1. `Delta Eridani`, `Beta Hydri`, and `Omicron2 Eridani` are real stellar
   identities and must not remain unmapped merely because the accepted review lacks
   their book-visible aliases or the generated runtime lacks their anchor sphere.
2. Add the exact book-visible spellings as accepted alternate names for their
   existing stable astronomy systems. Do not rename their accepted preferred names
   or change system/component IDs.
3. Map `location:delta-eridani` to `stellar-system-003918` and
   `location:beta-hydri` to `stellar-system-003557` in canonical Chapter `1.18`.
   Change both location kinds from `star` to `star_system`, because only a mapped
   root stellar system may directly own `astronomy_object_id`.
4. Map `location:omicron2-eridani` to `stellar-system-002424` in the revised Chapter
   `1.19` candidate and remove its `map_status: "unmapped"` value. Preserve the
   existing narrative child hierarchy beneath that root.
5. Let ADR-0016 derive all three bootstraps from exact aliases and accepted adopted
   components. Do not add redundant explicit `anchor_bootstraps` or use the previous
   runtime coordinates as authority.
6. Build a complete isolated repository staging copy under
   `/tmp/bobiverse-eridani-staging/repository` after the canonical Chapter `1.18`
   correction and revised review-only candidates exist. Install the exact candidates
   as Chapters `1.19`–`1.21` only inside that copy, then run the unchanged canonical
   refresh, generation, narrative, and astronomy commands from the copy. This gives
   every tool the same staged canonical anchor set without writing unapproved
   chapters in the working repository or adding a second CLI contract.
7. Expand the pinned acquisition and generated runtime around every newly mapped
   anchor using the existing configured `20` light-year context radius and BOB-013
   source precedence. This includes complete per-anchor query and coverage records
   for Delta Eridani, Beta Hydri, and Omicron2 Eridani, even when an anchor system is
   already present in the old Sol-centred runtime.
8. Add three Chapter `1.19` locations named `Outer Jovian 1`, `Outer Jovian 2`, and
   `Outer Jovian 3`, with stable IDs
   `location:omicron2-outer-jovian-01` through
   `location:omicron2-outer-jovian-03`. Each is a `planet` with
   `body_class: "gas_giant"`, is an `orbits` child of
   `location:omicron-eridani-a`, and has an original minimal description identifying
   it as one of several outer Jovian planets observed in the system.
9. Under ADR-0021, the three Jovians are distinct anonymous physical members forming
   the minimum cardinality guaranteed by `several`, not renderer proxies and not an
   asserted complete count. Their numbering is a stable presentation identity. They
   claim no measured distance, catalogue order, size, colour, gravity, atmosphere,
   moons, or habitability.
10. Implement the already-accepted ADR-0020 `orbital_order` data foundation needed by
    this candidate: schema, documented schema, TypeScript model, semantic validation,
    projection, diagnostics, and focused tests. This task does not implement the
    guided renderer or other BOB-20260731-ACPTAB UI scope. Author the complete
    Omicron Eridani A sibling sequence as Vulcan, Romulus, asteroid belt, OE-2,
    Outer Jovian 1, Outer Jovian 2, Outer Jovian 3. The source establishes the broad
    inner/outer groups; Vulcan before Romulus and ordinals 1 through 3 are the
    deterministic invented schematic order permitted by ADR-0020.
11. This is a Chapter `1.19` decision under ADR-0021, not a general extraction rule
    that converts `several` into three planets. Do not add an anonymous-planet proxy
    type or change ADR-0018 or the extraction skill to generalize it. The only schema
    change authorized here is the already-accepted ADR-0020 `orbital_order` field.
12. Reconcile the revised Chapter `1.19` candidate from its immutable sealed ledger;
    do not rewrite sealed evidence. Then run fresh isolated Pass 2 reconciliation for
    Chapter `1.20` against the revised through-`1.19` projection and for Chapter
    `1.21` against the revised through-`1.20` projection. Reclassify every source
    mention and regenerate each chapter's reconciliation and exhaustive mention
    review even when its candidate JSON remains byte-identical.
13. Preserve the existing append-only Chapter `1.18` promotion-log row as historical
    evidence of its original promotion. Record this correction and its validation in
    this task rather than rewriting that row or presenting the correction as a second
    routine promotion.
14. Chapters `1.19`, `1.20`, and `1.21` remain review-only. Do not write them
    canonically or append their promotion-log rows without the Captain's separate
    approval of the revised exact candidates.

## In scope

- Add the three exact book-visible aliases to accepted system review data.
- Preserve the three existing astronomy identities, adopted components, source IDs,
  geometry derivations, and preferred names.
- Correct canonical Chapter `1.18` so Delta Eridani and Beta Hydri are mapped
  stellar-system roots.
- Refresh the pinned astronomy acquisition artifacts for Delta Eridani, Beta Hydri,
  and each 20-light-year context sphere in the working repository. In the isolated
  staging copy, refresh Omicron2 Eridani and the complete three-anchor union using
  the exact revised candidate chain.
- Regenerate candidate, identity, query-accounting, and static runtime astronomy
  artifacts through the established pipeline.
- Review the refresh diff and stop on unrelated upstream catalogue drift rather than
  accepting it silently.
- Revise Chapter `1.19` with the mapped 40 Eridani identity and three anonymous
  lower-bound outer Jovians under ADR-0021.
- Update Chapter `1.19` reconciliation and human-review artifacts outside version
  control.
- Rebuild and validate the ordered Chapter `1.19`–`1.21` temporary candidate chain.
- Add focused regression coverage for all three exact aliases, bootstrap resolution,
  Beta Hydri acquisition coverage, stable IDs, and the three anonymous Jovians.
- Implement the ADR-0020 `orbital_order` source, validation, projection, diagnostic,
  and documented-schema foundation required to author and verify the complete
  Omicron Eridani A sibling order. Update BOB-20260731-ACPTAB so its remaining scope
  consumes rather than duplicates that completed foundation.
- Run fresh clean Pass 2 reconciliation and regenerate review artifacts for Chapters
  `1.19`, `1.20`, and `1.21` in order.
- Update directly affected astronomy, narrative, extraction, and implementation
  documentation for the isolated staging workflow, orbital-order foundation,
  ADR-0021 exception, and corrected mappings.

## Out of scope

- Changing the configured 20-light-year context radius or 2,000-system/5-MiB runtime
  budgets.
- Changing coordinate frames, units, source precedence, identity rules, or accepted
  adopted components.
- Fuzzy, partial, punctuation-insensitive, positional, or model-confidence matching.
- Renaming `GJ 150`, `GJ 19`, or `40 Eridani` as the preferred astronomy names.
- Adding explicit bootstrap exceptions when exact accepted aliases suffice.
- Inventing exact orbital positions, distances, measured physical order,
  measurements, or a total outer-Jovian count. ADR-0020's explicitly non-metric
  invented schematic order remains in scope.
- A reusable anonymous-planet schema or a global qualitative-count conversion rule.
- Guided system renderer, texture, navigation, interaction, accessibility, visual
  acceptance, or other BOB-20260731-ACPTAB UI work beyond the orbital-order data
  foundation.
- Revisiting other mapped or unmapped narrative locations.
- Changing Chapter `1.20` or `1.21` facts merely because their preceding temporary
  corpus changes.
- Canonically promoting Chapters `1.19`–`1.21`, appending their promotion-log rows,
  or committing source text, ledgers, evidence excerpts, candidates, or temporary
  roots.
- Accepting unrelated live-catalogue drift without explicit Captain review.
- UI, WebGL, orbital-layout, interaction, or performance redesign.

## Acceptance criteria

1. Accepted astronomy naming owns exact unique aliases `Delta Eridani`, `Beta Hydri`,
   and `Omicron2 Eridani` for systems `stellar-system-003918`,
   `stellar-system-003557`, and `stellar-system-002424`, respectively.
2. Alias normalization remains limited to Unicode-aware case folding, trimming, and
   whitespace collapsing; no weaker matching path is introduced.
3. Each alias resolves through ADR-0016 to the existing accepted system, adopted
   component, GCNS source ID, and source-backed geometry without an explicit
   bootstrap exception.
4. Canonical Chapter `1.18` authors Delta Eridani and Beta Hydri as mapped
   `star_system` roots with the exact astronomy IDs above. All unrelated Chapter
   `1.18` values remain unchanged.
5. The corrected Chapter `1.18` projection places both destinations at canonical
   true-scale astronomy coordinates and remains spoiler-safe.
6. A fresh isolated repository staging copy contains the corrected Chapter `1.18`
   and exact review-only Chapters `1.19`–`1.21`, while the working repository still
   lacks canonical Chapters `1.19`–`1.21`. Refresh, generation, narrative validation,
   and astronomy validation all run from that copy and therefore discover one
   identical staged anchor set without new CLI options or temporary mutation of the
   working repository.
7. Delta Eridani, Beta Hydri, and Omicron2 Eridani each have exact bootstrap,
   acquisition-query, context-sphere, and runtime-coverage records derived from the
   staged candidate chain. Every complete source-available 20-light-year
   neighbourhood is acquired, reconciled, validated, and emitted under BOB-013
   authority and budgets.
8. The working-repository refresh accounts for the canonical Delta Eridani and Beta
   Hydri anchors. The staged-copy refresh additionally accounts for Omicron2 Eridani
   and produces the exact future astronomy diff required alongside a later approved
   Chapter `1.19` promotion. Neither reviewed diff contains silently accepted
   unrelated live catalogue drift.
9. Delta Eridani and 40 Eridani retain their existing stable IDs, accepted adopted
   components, source identities, position derivations, and coordinates. Beta Hydri
   retains its existing candidate/system/component identity and source-backed
   coordinates as it enters the runtime.
10. The revised Chapter `1.19` candidate maps Omicron2 Eridani to
    `stellar-system-002424`, removes the unmapped marker, and preserves the existing
    surveyed hierarchy beneath it.
11. The revised Chapter `1.19` candidate introduces exactly three distinct anonymous
    outer Jovians with the ADR-0021 IDs, names, parent, relation, class, and minimal
    lower-bound descriptions. The system description retains `several`; the
    candidate authors no unsupported physical properties or exact total.
12. The narrative schema and identical documented listing accept optional positive
    safe-integer `orbital_order` on eligible flat `orbits` locations and nullable
    updates under ADR-0020. Semantic validation and projection implement uniqueness,
    append, retain, reparent/remove, and deterministic simultaneous-omission rules
    with source-aware diagnostics and focused regression coverage.
13. The Chapter `1.19` projection derives the complete Omicron Eridani A child order
    as Vulcan, Romulus, asteroid belt, OE-2, Outer Jovian 1, Outer Jovian 2, Outer
    Jovian 3. The three anonymous ordinals follow OE-2 and use their accepted
    invented relative schematic order without claiming measured distances.
14. The revised Chapter `1.19` reconciliation report explicitly records the
    Captain-authorized anonymous lower-bound treatment and retains the immutable
    source and sealed-ledger fingerprints.
15. Fresh isolated Pass 2 reconciliation runs for Chapter `1.19`, Chapter `1.20`
    against revised state through `1.19`, and Chapter `1.21` against revised state
    through `1.20`. Verified source and sealed-ledger fingerprints, complete claim
    classifications, exhaustive mention reviews, and bounded evidence reviews exist
    for all three chapters even when a downstream candidate remains byte-identical.
16. Temporary narrative and astronomy validation passes for Chapter `1.19`, then for
    the full ordered candidate chain through Chapters `1.20` and `1.21`. Each staged
    chapter is byte-identical to its reported exact candidate.
17. The revised exact candidates, SHA-256 fingerprints, complete mention reviews,
    bounded evidence review, astronomy bootstrap/coverage results, and exact
    promotion diff are presented to the Captain for approval. Chapters `1.19`–`1.21`
    remain absent from canonical narrative data until that approval and a separate
    application command.
18. The historical Chapter `1.18` promotion-log row remains unchanged. This task
    records the canonical correction and its validation without falsifying the
    original promotion record.
19. Focused and full repository validation pass, generated runtime stays within the
    accepted node/file-size budgets, source text and temporary evidence stay outside
    Git, and an independent implementation review reports `No findings.`

## Completion evidence

- The promoted working refresh validates `242` systems with exact Delta Eridani, Beta
  Hydri, and Omicron2 Eridani bootstrap and 20-light-year coverage records. The
  isolated rehearsal produced the same accepted candidate checksum without changing
  stable candidate identities or membership.
- After the temporary artifacts were lost in a host crash, fresh isolated blind Pass
  1 and preceding-state-only Pass 2 runs regenerated the exact candidates. Their
  SHA-256 fingerprints are Chapter `1.19`
  `429c9d99eee4112c39c17933b54516f788218ba6e01420214be296c2bb9fbe07`,
  Chapter `1.20`
  `6ad5fcf7d8707c1af5cb5c4c9a031d38651b0725078eaf1df53b21508ab5bfb2`,
  and Chapter `1.21`
  `b593f405f637e03ed28eb09a8a6f61fad392cdc0f18b84987fc040274eb07930`.
  Their fresh sealed-ledger fingerprints are respectively
  `eb43b909e5ec54d6a26c99fc6ee35f88966e84d607fa6bdbaf9e8aced7dcb5e4`,
  `a59811e981c1fb27afd66c2ab5a49fc0d989e42390b795723fe6a29054ba2aaa`,
  and `0240c62969b241759523758bc7f0a657592a3b303f290404e4bd55ae5e6b96b6`.
  Every local artifact in each checksum manifest passes `sha256sum -c`.
- The isolated candidate corpus and promoted working corpus both validate through
  Chapter `1.21`. The exact approved bytes are canonical, and append-only promotion
  rows record Chapters `1.19`-`1.21`; the historical Chapter `1.18` row remains
  unchanged.
- `npm run validate` passes formatting, lint, type checking, 75 Python tests,
  astronomy validation, 176 Vitest tests, narrative validation, and production build.
  `python3 scripts/tasks.py check` validates all 40 task files, `git diff --check`
  passes, and the final independent implementation review reports `No findings.`

## Validation commands

```bash
python3 scripts/tasks.py check
npm run data:test
npm run data:generate
npm run data:validate
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter 1.18 --output /tmp/bobiverse-world-1.18.json
test -e data/narrative/chapters/1/19.json
test -e data/narrative/chapters/1/20.json
test -e data/narrative/chapters/1/21.json
test -d /tmp/bobiverse-eridani-staging/repository
(cd /tmp/bobiverse-eridani-staging/repository && npm run narrative:manifest)
(cd /tmp/bobiverse-eridani-staging/repository && npm run narrative:validate)
(cd /tmp/bobiverse-eridani-staging/repository && npm run data:generate)
(cd /tmp/bobiverse-eridani-staging/repository && npm run data:validate)
(cd /tmp/bobiverse-eridani-staging/repository && \
  npm run narrative:generate -- \
    --chapter 1.21 \
    --output /tmp/bobiverse-eridani-staging/world-1.21.json)
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run validate
git diff --check
```

The implementation must also run the sole networked refresh command first in the
working repository for canonical Delta Eridani and Beta Hydri coverage, then in the
isolated staging copy for the exact three-anchor candidate set:

```bash
npm run data:refresh
(cd /tmp/bobiverse-eridani-staging/repository && npm run data:refresh)
```

Create the staging copy from the post-correction working repository before installing
the exact review-only candidates there. Keep its `.git`, dependencies, generated
manifest, source snapshots, acquisition manifests, and runtime isolated from the
working repository. Review the working and staged refreshed source/manifests as
separate diffs before accepting either output. If network access is unavailable or a
refresh exposes unrelated upstream drift, record the exact blocker without
substituting hand-edited acquisition data.

## Review-only extraction inputs and artifacts

- Chapter `1.19` source:
  `/home/maciek/bobiverse-project/source-text/1.19.txt`
- Chapter `1.19` source SHA-256:
  `062f9914310265af73b10f68ccabb4227a1a4cec43322055e692c96038eb395c`
- Current sealed ledger, if still present:
  `/tmp/bob-ch19-FNYsh9/sealed-ledger.json`
- Sealed-ledger SHA-256:
  `cbc7a8f4b27f3eabbba3630164ecd45e0f950a59aaca9b302239ed954b48e0b7`
- Current Chapter `1.19` candidate, comparison only:
  `/tmp/bob-ch19-FNYsh9/candidate-1.19.json`
- Current Chapter `1.20` candidate, comparison only:
  `/tmp/bob-ch20-BFU3eJ/candidate-1.20.json`
- Chapter `1.20` source:
  `/home/maciek/bobiverse-project/source-text/1.20.txt`
- Current Chapter `1.20` sealed ledger, if still present:
  `/tmp/bob-ch20-BFU3eJ/chapter-1.20-pass1-sealed.json`
- Chapter `1.20` sealed-ledger SHA-256:
  `cc7727fcfff4becba43f6da953d38cce0fd1e3260d296500678a50d27d91bae9`
- Current Chapter `1.21` candidate, comparison only:
  `/tmp/bob-ch21-ugciCu/candidate-1.21.json`
- Chapter `1.21` source:
  `/home/maciek/bobiverse-project/source-text/1.21.txt`
- Current Chapter `1.21` sealed ledger, if still present:
  `/tmp/bob-ch21-ugciCu/sealed-claim-ledger.json`
- Chapter `1.21` sealed-ledger SHA-256:
  `3ebc97e4d45a3475833a8edf22349a06872c13e279792cd23856b5c89b32e2cc`

If a temporary sealed ledger is unavailable or its fingerprint does not match, rerun
the complete blind extraction workflow for that chapter. Never reconstruct or edit a
sealed ledger from the candidate. Keep all source text, evidence, ledgers, candidates,
temporary corpora, and generated world projections outside version control.

## Documentation and generated artifacts

- Update `docs/data/astronomy-pipeline.md` for the implemented canonical and staged
  anchor/coverage sets and their validation evidence.
- Update `docs/technical-design.md`, `docs/data-model-definition.md`,
  `docs/implementation-plan.md`, and `docs/chapter-extraction.md` for the implemented
  ADR-0020 ordering foundation and ADR-0021 Chapter `1.19` exception.
- Update the repository-local extraction skill only as needed to route this exact
  ADR-0021 exception without exposing it to blind Pass 1 or generalizing qualitative
  planet counts.
- Update BOB-20260731-ACPTAB so its remaining renderer/UI implementation consumes the
  completed orbital-order foundation rather than claiming duplicate ownership.
- Preserve `docs/chapter-promotion-log.md` byte-for-byte.
- Commit regenerated astronomy source, manifest, review, identity, and runtime files
  owned by the established pipeline when they are direct deterministic consequences
  of the accepted aliases and canonical Delta Eridani/Beta Hydri anchor expansion.
- Keep Omicron2-only acquisition/runtime expansion in the isolated staging diff until
  the exact Chapter `1.19` candidate is separately approved.
- Regenerate the ignored chapter manifest through the normal validation path.
- Keep revised Chapter `1.19`–`1.21` candidates and every extraction/reconciliation
  artifact under `/tmp/bobiverse-eridani-candidate-chain`.

## Risks and stopping conditions

- Live GCNS, CNS5, Gaia, or WDS data may have drifted since the pinned snapshot.
  Stop rather than accepting unrelated drift silently.
- Beta Hydri's 20-light-year sphere may materially increase runtime size. The task
  must preserve the accepted node and file-size budgets or stop for a reviewed
  performance decision.
- An accepted alias may collide after exact normalization. Stop on any duplicate
  owner rather than weakening uniqueness validation.
- A source candidate, adopted component, source row, or geometry may fail current
  integrity checks. Do not substitute a coordinate or identity from model knowledge,
  narrative prose, or the previous runtime.
- Chapter `1.18` is already canonical. Preserve unrelated content and the historical
  promotion record while making only the authorized mapping correction.
- The anonymous Jovians intentionally improve visual composition but are not a
  complete physical inventory. Their descriptions and review must not imply otherwise.
