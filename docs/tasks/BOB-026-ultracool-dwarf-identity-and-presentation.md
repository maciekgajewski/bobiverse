# BOB-026: ultracool-dwarf identity and presentation enrichment

Status: Ready
Phase: 1B corrective refinement
Last updated: 2026-07-28

## Objective

Enrich CNS5-only nearby objects with source-backed recognizable identities,
classifications, and presentation facts so ultracool brown dwarfs no longer clutter
the map as bright pale stars with obscure recently assigned GJ names.

## User-visible outcome

Known nearby brown dwarfs appear under recognizable WISE, 2MASS, UGPS, or reviewed
short-form names, retain their GJ identifiers as searchable alternates, and render as
visually subordinate infrared/substellar objects rather than normal bright stars.
Nearby stellar multiples exposed by the same audit receive better source-backed names
without inventing component membership.

## Readiness and authority

The Captain accepted
`../adrs/0012-20pc-census-identity-and-substellar-presentation.md` on 2026-07-28, so
this task is `Ready`. ADR acceptance and Ready status do not authorize
implementation. Implementation still requires a later explicit `proceed` or
`make it so`.

## Baseline evidence

The current generated Sol neighbourhood contains:

- 69 systems whose preferred name starts with `GJ`;
- 13 GJ-named systems whose components have no accepted GCNS or Gaia identity; and
- 10 of those 13 that resolve to T/Y brown dwarfs in the published 20-pc census.

The thirteen audited systems are:

| CNS5 ID | Current name | Full published identity | Expected preferred name | Classification |
| ------- | ------------ | ----------------------- | ----------------------- | -------------- |
| 965     | GJ 10528     | WISE J035000.32-565830.2 | WISE 0350-5658          | Y1 brown dwarf |
| 1054    | GJ 10582     | 2MASSI J0415195-093506   | 2MASS 0415-0935         | T8 brown dwarf |
| 1828    | GJ 11075     | UGPS J072227.51-054031.2 | UGPS 0722-0540          | T9 brown dwarf |
| 2194    | GJ 11286     | WISE J085510.83-071442.5 | WISE 0855-0714          | Y brown dwarf |
| 2383    | GJ 11388     | 2MASSI J0937347+293142   | 2MASS 0937+2931         | T6 brown dwarf |
| 2389    | GJ 11394     | 2MASS J09393548-2448279  | 2MASS 0939-2448         | T8 brown dwarf |
| 2747    | GJ 11600     | 2MASS J11145133-2618235  | 2MASS 1114-2618         | T7.5 brown dwarf |
| 3866    | GJ 12260     | WISEPA J154151.66-225025.2 | WISE 1541-2250        | Y1 brown dwarf |
| 4091    | GJ 12393     | WISE J163940.86-684744.6 | WISE 1639-6847          | Y0 peculiar brown dwarf |
| 4370    | GJ 12549     | WISEPA J174124.26+255319.5 | WISE 1741+2553        | T9 brown dwarf |
| 1610    | GJ 234       | Ross 614                  | Ross 614                | low-mass stellar binary |
| 4217    | GJ 661       | HD 155876                 | HD 155876               | low-mass stellar multiple |
| 5550    | GJ 860       | HD 239960 / `** KR 60`   | Kruger 60               | low-mass stellar binary |

The source audit used current CNS5 astrometry to locate candidates, but implementation
may accept an identity only through an exact shared identifier or the explicit
reviewed mapping required by ADR-0012. This table is a required review fixture, not
authorization for positional-only matching.

All current components use `marker_radius: 0.09`. A component with no accepted Gaia
or WDS presentation fact falls to `color_family: neutral`, which maps to pale
blue-white `#d8e6ff` and uses the same additive core/halo shader as a star. The
result is technically explicit but visually misleading.

## Binding references

- accepted
  `../adrs/0012-20pc-census-identity-and-substellar-presentation.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../data/astronomy-pipeline.md`
- `../technical-design.md`, especially Sections 8.1, 8.2, 8.4, and 8.5
- `../implementation-plan.md`, Phase 1B
- `BOB-013-astronomy-neighbourhood-catalogue.md`
- `../../AGENTS.md`

## Source contract

Use the published Kirkpatrick et al. 2024 full-sky 20-pc census:

- publication DOI: <https://doi.org/10.3847/1538-4365/ad24e2>;
- VizieR catalogue: `J/ApJS/271/55`;
- VizieR catalogue DOI: <https://doi.org/10.26093/cds/vizier.22710055>;
- TAP endpoint:
  `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`; and
- primary component table: `J/ApJS/271/55/table4`, containing 4,407 published
  component/system rows.

### Exact acquisition

Pin the catalogue `ReadMe` whose history identifies `04-Jun-2024`, plus the results
of these exact ADQL queries. Quoted names are required VizieR TAP identifiers.

Table 4:

```sql
SELECT
  "recno",
  "Name", "NcTR",
  "IMass", "e_IMass", "n_IMass",
  "Mass", "e_Mass", "n_Mass", "r_Mass",
  "Massl", "e_Massl", "n_Massl", "r_Massl",
  "Teff", "e_Teff",
  "Syst", "Ncomp", "SystCode",
  "OName", "HD", "Ross", "WD", "2MASS", "WISE", "Gaia", "HIP", "GJ",
  "PMJID", "Mult", "NamesRef",
  "RAJ2000", "DEJ2000",
  "RAPdeg", "e_RAPdeg", "DEPdeg", "e_DEPdeg", "NoteEpoch",
  "Plx", "e_Plx", "pmRA", "e_pmRA", "pmDE", "e_pmDE", "PlxPMRef",
  "SpTOpt", "SpTOptCode", "r_SpTOpt",
  "SpTNIR", "SpTNIRCode", "r_SpTNIR",
  "2Mcont", "WISEcont"
FROM "J/ApJS/271/55/table4"
ORDER BY "recno"
```

Table 4 notes:

```sql
SELECT "recno", "Name", "NcTR", "RAJ2000", "DEJ2000", "Note"
FROM "J/ApJS/271/55/notes4"
ORDER BY "recno"
```

References:

```sql
SELECT "Ref", "Auth", "BibCode", "Comm"
FROM "J/ApJS/271/55/refs"
ORDER BY "Ref", "BibCode"
```

The pinned baseline is 4,407 Table 4 rows, 4,407 notes rows, and 688 reference rows.
Refresh must reject a missing projected column, duplicate normalized row, unstable
ordering, a missing/duplicate/non-contiguous `recno` in Table 4 or notes, an
unresolved retained reference code, or catalogue identity other than
`J/ApJS/271/55`. It records the TAP endpoint, exact query bytes, VizieR catalogue
DOI, publication DOI and bibcode `2024ApJS..271...55K`, ReadMe history date,
retrieval timestamp, media type, row counts, and SHA-256 for the ReadMe and every
normalized result. `recno` is retained only as source sequence and is excluded from
identity keys, matching, runtime aliases, and astronomical provenance IDs.

Attribution must cite Kirkpatrick et al. 2024 and include this VizieR wording:
“This research has made use of the VizieR catalogue access tool, CDS, Strasbourg,
France (DOI: 10.26093/cds/vizier).”

The import must not use VizieR `recno` as an identity. Create
`c20pc-2024:<sha256>` from ADR-0012's exact `c20pc-identity-v1` object. Normalize
output as UTF-8 JSON with NFC strings, JSON `null` for missing values, finite JSON
numbers, lexicographically sorted object keys, and the query order above before
hashing.

### Source boundary

Presence in the pinned Table 4 is the sole 20-pc eligibility predicate for this
enrichment role. Do not recompute membership from parallax or coordinates. A matched
row is eligible at the catalogue's inclusive boundary even when its parallax is
uncertain; an absent row is ineligible. A canonical-distance disagreement is a
review warning and never replaces canonical geometry.

### Identifier grammar

Implement ADR-0012 identifiers as typed
`(catalogue, release, value, component_scope)` tuples:

- apply Unicode NFKC, trim, collapse ASCII whitespace, and case-fold prefixes;
- for `GJ`, `HIP`, `HD`, and `Ross`, remove numeric leading zeroes but preserve
  decimals and parse any component suffix into `component_scope`;
- for Gaia, preserve the explicit DR2, EDR3, or DR3 release and decimal source ID;
- preserve every coordinate digit, sign, decimal point, and the distinct `WISE`,
  `WISEA`, `WISEPA`, `2MASS`, `2MASSI`, and `UGPS` namespaces;
- split only source-documented `Name` ampersands and `Mult` commas; and
- never equate qualified, unqualified, composite, or system-level scopes.

An automatic edge requires one compatible typed token unique on each side. All
shared tokens must nominate the same edge. Duplicates, collisions, incompatible
scope/cardinality, or contradictory tokens fail for review. Attach accepted census
keys and aliases to existing stable identities without creating components, systems,
or inclusion.

### Preferred-name algorithm

Existing explicit project/landmark names remain first. For an eligible GJ/CNS5
fallback, select the first non-empty accepted value in this order:

1. the reviewed mapping's `preferred_name`, which must cite its exact census
   field/value and transformation;
2. census `OName`;
3. a single-object census `Name`;
4. `WISE`;
5. `2MASS`;
6. `HD`;
7. `Ross`; and
8. the existing GJ fallback.

Source name values are trimmed and have ASCII whitespace collapsed while preserving
published spelling. A multi-valued `OName` or a `Name` containing the source's `&`
system delimiter is not selected automatically; it requires a reviewed
`preferred_name`. No arbitrary first alias is taken.

The thirteen baseline rows have the exact preferred-name outputs shown in the
baseline table. `Kruger 60` is a reviewed human-readable expansion of the retained
`Mult` designation `** KR 60`; the full `HD 239960` and `Mult` values remain aliases
and provenance.

For a selected WISE-family, 2MASS-family, or UGPS coordinate designation, normalize
the display prefix to `WISE`, `2MASS`, or `UGPS`, then truncate without rounding to
`PREFIX HHMM±DDMM`. Collision scope is the case-folded preferred names of the entire
generated catalogue. Every member of a collision group expands together first to
`PREFIX HHMMSS±DDMMSS`, then to all coordinate digits from its retained full
designation. If full normalized designations still collide, generation fails.
The original full designation and original prefix remain searchable aliases.

## Decisions

- The new census is an identity and presentation-enrichment source inside 20 pc. It
  does not control inclusion, canonical position, distance, or coverage.
- Existing reviewed landmark names remain highest precedence.
- Only systems still using an automatic GJ/CNS5 fallback are automatically eligible
  for a census-backed preferred-name proposal. Existing recognizable names do not
  churn merely because the census offers another designation.
- The complete full designation remains in provenance and searchable alternates.
  A shorter coordinate-based display name is allowed only through one deterministic,
  collision-safe formatter.
- Exact shared identifiers may form deterministic candidate edges. All other matches
  require an explicit reviewed mapping with both source identities and a reason.
- The thirteen baseline mappings are mandatory reviewed fixtures. Refresh must also
  report every additional CNS5-only runtime component for which the census proposes
  an identity.
- Census hierarchy may nominate a component correction but does not automatically
  merge, split, add, or reassign a stable component.
- Runtime `object_class` is exactly `star`, `white_dwarf`, `brown_dwarf`, or null,
  derived only for accepted census matches. T/Y establishes `brown_dwarf`; a
  white-dwarf `D` optical type plus a `WD` designation establishes `white_dwarf`;
  and an O/B/A/F/G/K/M optical or near-infrared type establishes `star`. L type,
  mass, temperature, or designation alone leaves the value null. A typeless record
  needs explicit review of temperature plus mass evidence to establish
  `brown_dwarf`. Conflicting non-null classes fail review, explicit reviewed project
  classification wins, and unaffected components do not get bulk-reclassified.
  Accepted source types and their primary classes use ADR-0012's exact
  unbracketed/reference-backed normalization rule; composite-class conflicts never
  take the first token.
- An accepted Y type or reviewed brown dwarf below `500 K` uses the
  `infrared-cool` false-colour family (`#725a82`). An accepted T type or reviewed
  brown dwarf from `500 K` through `1,399 K` uses `infrared-warm` (`#9a6548`). A
  conflicting type/temperature tier fails for review.
- Both brown-dwarf families use visible glyph radius `0.05` and additive intensity
  `0.25`; the unchanged ordinary stellar values are radius `0.09` and intensity
  `1.0`. These are presentation values, not physical radius or luminosity.
- Marker intensity multiplies final shader alpha exactly once. It does not also scale
  RGB under additive blending.
- Visible glyph size, additive intensity, and pointer hit target are independent.
  Brown dwarfs retain a pointer hit-target radius of at least `0.09`.
- The neutral fallback remains available for genuinely unknown objects but must no
  longer apply to an accepted census-classified brown dwarf.
- Runtime remains committed static JSON with field-level or grouped provenance.

## In scope

- Add the pinned 20-pc census acquisition, normalized schema, manifest, reference
  data, and acknowledgement to the explicit `data:refresh` path.
- Add exact-identifier candidate matching and project-reviewed mappings without
  positional-only automatic identity.
- Extend candidate/review artifacts so accepted census identities and any proposed
  topology changes are independently visible and checksum-bound.
- Add source identifiers, published names, object class, spectral type, effective
  temperature, uncertainty, and derivation/provenance fields required by this task.
- Add deterministic preferred-name and alternate-name selection for eligible
  GJ/CNS5 fallbacks.
- Add collision-safe short coordinate-designation formatting where selected for
  display.
- Add a dedicated substellar presentation family, bounded marker radius, and bounded
  additive-intensity value.
- Separate visible marker geometry from its minimum picking target.
- Regenerate the static astronomy catalogue and update source/runtime schemas.
- Update inspectors so the accepted classification, temperature when available,
  source catalogue, and full aliases are visible without presenting visual glyph
  size as a physical measurement.
- Add refresh-diff reporting for new, removed, ambiguous, or changed census matches,
  names, classifications, temperatures, hierarchy evidence, and presentation tiers.
- Add focused data, generator, validator, domain, component, and Playwright
  regressions.
- Update the technical design, astronomy-pipeline documentation, attribution,
  operator instructions, task status surfaces, and directly affected visual-testing
  guidance.

## Out of scope

- Changing the CNS5/GCNS inclusion union or the configured neighbourhood radius.
- Replacing canonical GCNS/CNS5 astrometry, distance, coordinates, or coverage with
  20-pc census values.
- Treating the 20-pc census as complete outside 20 pc from Sol.
- Runtime calls to VizieR, SIMBAD, or any other astronomy service.
- Automatically changing stable component topology from census proximity or
  hierarchy alone.
- A general repair of every multiple system in CNS5, GCNS, Gaia, or WDS.
- Claiming a measured physical radius, luminosity, or visible colour when the source
  does not provide one.
- Physically scaling interstellar geometry or component offsets by mass or radius.
- Removing brown dwarfs or other faint objects from the source-complete
  neighbourhood.
- Changing narrative rings, spoiler visibility, selection identity, or map
  measurement semantics.

## Acceptance criteria

1. ADR-0012 is Accepted before implementation begins, and the technical design and
   astronomy-pipeline documentation integrate its source role, boundary, precedence,
   and review rules.
2. The explicit refresh path pins the three exact VizieR projections and ReadMe
   documented above, validates the 4,407/4,407/688 baseline counts, and records exact
   query bytes, endpoint, catalogue/publication identity, version evidence,
   retrieval timestamp, acknowledgement, and checksums.
3. Generation, validation, tests, builds, and the browser consume only committed
   inputs and make no network request.
4. Every accepted census match uses an exact shared normalized identifier or an
   explicit reviewed mapping naming both source records and its evidence. A
   positional-only candidate cannot become an identity edge.
5. Duplicate, ambiguous, conflicting, out-of-boundary, missing, merged, or split
   matches fail or remain unresolved for review rather than changing identity
   silently.
6. All thirteen baseline CNS5 records are present as golden review fixtures. The ten
   T/Y objects resolve to the full identities, exact preferred names, and
   brown-dwarf classifications listed above; Ross 614, HD 155876, and Kruger 60
   resolve to their exact preferred names and published stellar identities without
   automatic topology churn.
7. Eligible systems receive deterministic recognizable preferred names, retain their
   GJ and complete catalogue designations as unique searchable alternates, and reject
   a colliding short designation.
8. Existing explicit landmark and reviewed names remain unchanged unless the review
   artifact contains a source-backed override.
9. Runtime components retain accepted object class, spectral type, effective
   temperature and uncertainty when available, full source identifiers, presentation
   derivation, and catalogue/reference provenance. Missing optional facts remain
   explicit nulls.
10. Every accepted T/Y brown dwarf uses `infrared-cool` or `infrared-warm` rather
    than `neutral`, with visible radius exactly `0.05` and additive intensity exactly
    `0.25` applied exactly once to final alpha. Ordinary stellar markers retain
    radius `0.09` and intensity `1.0`.
11. Marker radius and intensity are documented and validated as fixed presentation
    values. Runtime and inspector wording do not claim that either is a measured
    physical radius or luminosity.
12. Brown-dwarf markers remain hoverable, clickable, keyboard/DOM-search accessible,
    focusable through the existing system-selection flow, and visually identifiable
    when selected.
13. Star-marker presentation outside the changed source-backed cases retains
    regression coverage against unintended colour, size, intensity, or naming churn.
14. Refresh diff and independent validation report all census identity, naming,
    classification, temperature, hierarchy, and presentation changes.
15. The regenerated runtime remains within BOB-013's 2,000-system and 5 MiB runtime
    budgets, preserves true-scale positions, and passes all documented validation.
16. Manual real-browser acceptance at the Sol 20-light-year view confirms that the
    ten brown dwarfs no longer resemble bright pale stars or dominate visual density,
    their names are understandable, selection remains practical, and ordinary stars
    retain the accepted visual hierarchy.

## Required regression fixtures

At minimum, automated coverage must include:

- GJ 11286 / WISE 0855-0714 as the canonical CNS5-only Y-dwarf identity,
  classification, naming, temperature, provenance, and presentation case;
- one T dwarf whose preferred published name is 2MASS-based;
- one T/Y dwarf whose preferred published name is WISE-based;
- one reviewed mapping without a shared CNS5/census identifier;
- one exact shared-identifier match;
- equivalent allowed spacing/case/numeric variants of that exact identifier;
- component-qualified, composite, and unqualified identifiers that remain distinct;
- duplicate tokens and contradictory shared identifiers;
- one rejected positional-only candidate;
- one ambiguous or duplicate census candidate;
- the tied `BD+39 2376 AB` continuation-note rows reconstructed in `recno` order,
  with repeated acquisitions producing byte-identical normalized notes;
- one short-name collision requiring additional coordinate precision;
- Ross 614 or Kruger 60 as a multiple-system identity that must not rewrite topology
  automatically;
- one existing reviewed landmark name protected from source-name churn;
- one genuinely unknown component retaining the neutral fallback; and
- positive `star`, `white_dwarf`, and `brown_dwarf` derivations, a class conflict,
  and an explicit-null class;
- a Table 4 member at/near the boundary, a matched row with uncertain parallax, an
  absent candidate, and a canonical-distance disagreement; and
- pointer selection at the smallest accepted brown-dwarf glyph.

## Validation commands

Implementation must preserve and pass:

```bash
npm run data:refresh
npm run data:generate
npm run data:test
npm run data:validate
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run validate
git diff --check
```

`npm run data:refresh` remains the only networked command. A focused dry-run or
candidate-review helper may be added, but it must implement `--help` and must not
accept its own generated review checksum implicitly.

## Generated-artifact and documentation expectations

- Commit one normalized 20-pc census extract and manifest plus the pinned references
  and only those notes required by accepted decisions.
- Extend source schemas, candidate/review artifacts, the stable identity registry
  only when accepted mappings require it, and the runtime schema together.
- Regenerate `src/data/nearby-systems.json`; do not hand-edit generated runtime
  output.
- Update `docs/data/astronomy-pipeline.md`, `docs/technical-design.md`, source
  attributions, refresh instructions, visual-testing guidance, this task, and
  `docs/tasks/README.md` in the same implementation.
- Record the final source row counts, runtime count/size, review checksum, automated
  validation, independent review, and Captain's real-browser acceptance.

## Risks and mitigations

- **Risk:** High-proper-motion coordinate differences create false matches.
  **Mitigation:** Coordinates may nominate candidates only; accepted edges require an
  exact shared identifier or explicit reviewed mapping.
- **Risk:** A new catalogue churns already-good landmark names.
  **Mitigation:** Restrict automatic proposals to GJ/CNS5 fallbacks and preserve
  explicit reviewed-name precedence.
- **Risk:** Published hierarchy causes stable-ID merge or split churn.
  **Mitigation:** Treat hierarchy as review evidence and fail unresolved topology
  changes.
- **Risk:** A smaller visual marker becomes difficult to select.
  **Mitigation:** Separate visible glyph size from a tested minimum pointer target.
- **Risk:** False colour or marker radius is mistaken for a measured property.
  **Mitigation:** Retain source facts and derivation, label the treatment as
  approximate, and expose no fabricated physical radius.
- **Risk:** The 20-pc source is applied around a distant narrative anchor.
  **Mitigation:** Validate the Sun-centred source boundary before accepting any
  enrichment row.
