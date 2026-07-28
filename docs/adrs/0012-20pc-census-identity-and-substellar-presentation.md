# ADR-0012: 20-pc census identity and substellar presentation enrichment

Status: Accepted
Date: 2026-07-28

## Context

ADR-0011 established CNS5, GCNS, Gaia DR3, and WDS as complementary authorities for
nearby-system inclusion, geometry, optional Gaia enrichment, and physical system
membership. BOB-013 implemented that decision and deliberately retained CNS5-only
objects when Gaia had no suitable source.

The neutral presentation fallback is misleading for the resulting ultracool objects.
The current Sol neighbourhood contains thirteen GJ-named systems whose components
have no accepted GCNS or Gaia correlation. Ten are known T- or Y-type brown dwarfs,
but the runtime has no recognizable WISE or 2MASS name, spectral type, effective
temperature, or substellar classification for them. They therefore render with the
same fixed-size additive pale marker as an unknown star. The other three are
low-mass multiple-star systems whose component-level catalogue identities were not
reconciled into the current CNS5-derived record.

The product needs a reproducible source for recognizable names and defensible
presentation facts without weakening ADR-0011's inclusion, geometry, provenance, or
offline-runtime boundaries.

## Decision

Add the published Kirkpatrick et al. 2024 full-sky 20-pc census as a narrowly scoped
identity and presentation-enrichment authority inside its stated 20-pc boundary:

- publication: *The Initial Mass Function Based on the Full-sky 20 pc Census of
  ~3600 Stars and Brown Dwarfs*, ApJS 271:55;
- publication DOI: <https://doi.org/10.3847/1538-4365/ad24e2>;
- machine-readable catalogue: VizieR `J/ApJS/271/55`;
- catalogue DOI: <https://doi.org/10.26093/cds/vizier.22710055>; and
- acquisition service: VizieR TAP at
  `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`.

The pinned input must include the projected Table 4 component census and the
reference data required to interpret adopted names, spectral types, effective
temperatures, masses, and system hierarchy. Notes required by an accepted identity
or hierarchy decision must be pinned as well. Refresh records the exact ADQL,
projected columns, catalogue version, endpoint, retrieval timestamp, row counts,
acknowledgement, and SHA-256 checksums. Only the explicit operator-run refresh may
access the network; generation, validation, tests, builds, and the browser remain
offline.

This source has the following authority and limits:

1. It may supply reviewed common names, default published names, WISE and 2MASS
   designations, spectral classifications, brown-dwarf effective temperatures,
   mass evidence, and component/system hierarchy evidence.
2. It does not control system inclusion, canonical position, distance, coordinate
   frame, or neighbourhood coverage. CNS5, GCNS, Gaia DR3, and WDS retain the roles
   assigned by ADR-0011.
3. Membership in the pinned Table 4 is the boundary predicate for this source role.
   The catalogue is the authors' published volume-membership decision; the project
   does not recompute it from parallax, uncertainty, canonical component geometry,
   or system-node geometry. A matched Table 4 row is eligible, including a row at
   the authors' inclusive 20-pc boundary. A candidate absent from Table 4 is
   ineligible. A disagreement with current canonical distance is reported for review
   but neither silently revokes the published row nor changes canonical geometry.
4. Automatic identity edges require an exact shared, normalized catalogue
   identifier. Positional proximity, similar proper motion, or compatible parallax
   may nominate a candidate but may not establish identity.
5. A CNS5-only object without a shared identifier requires a project-owned reviewed
   mapping that names both source records, cites the supporting evidence, and records
   the reason. Ambiguous, duplicate, conflicting, split, or merged identities fail
   generation until reviewed.
6. Census hierarchy is evidence, not an automatic topology rewrite. Any stable
   component merge, split, or reassignment continues through ADR-0011's identity
   registry and review rules.

The import gives every Table 4 row a content-addressed source key. The key is
`c20pc-2024:` plus the SHA-256 of a canonical JSON object with exactly these members:
`version` (`c20pc-identity-v1`), normalized `Name`, integer `NcTR`, nullable integer
`SystCode`, the sorted unique typed identifiers extracted from `Name`, `HD`, `Ross`,
`WD`, `2MASS`, `WISE`, `Gaia`, `HIP`, `GJ`, `PMJID`, and `Mult`, and numeric
`RAJ2000` and `DEJ2000`. Missing members are JSON null and the object keys are
lexicographically sorted before hashing. VizieR's `recno` is explicitly excluded
because VizieR says it must not be used for identification. A changed identity tuple
appears as a removed and added source record at refresh and invalidates an attached
review decision; a duplicate key is a hard failure.

The pinned import may retain VizieR `recno` solely as the upstream publication-row
sequence needed to reconstruct deterministic Table 4 and continuation-note order.
It must be unique and contiguous within each pinned table, is excluded from matching
and source keys, and is not emitted as an astronomical identifier.

Identifiers are typed values, not unqualified strings. The normalized key is
`(catalogue, release when applicable, primary value, component scope)`. Normalization
is limited to Unicode NFKC, trimming, collapsing ASCII whitespace, ASCII
case-folding of catalogue prefixes, and catalogue-specific numeric formatting.
Punctuation and coordinate precision remain significant. In particular, WISE,
WISEA, WISEPA, 2MASS, 2MASSI, and UGPS prefixes are distinct identity namespaces,
and Gaia DR2, EDR3, and DR3 identifiers never cross-match. GJ, HIP, HD, and Ross
numeric identifiers drop leading zeroes but preserve decimal numbers. A component
suffix (`A`, `B`, `AB`, and so on) is a separate, case-normalized scope: qualified,
unqualified, system-level, and composite scopes never collapse automatically.
Only delimiters documented for that source field are expanded (`&` for the census
`Name` system entries and comma for `Mult`); no general punctuation splitting is
allowed.

An automatic edge requires the same typed identifier to be unique on both sides and
to have compatible component scope. Multiple shared identifiers must all nominate
the same pair. A duplicate token, collision, cardinality mismatch, incompatible
component scope, or disagreement between shared identifiers is ambiguous and
requires review. Accepted census keys and aliases attach to the existing
catalogue-independent component or system identity; they never replace a stable ID
or create inclusion.

Existing explicit project/landmark names remain highest precedence. For a system
whose current display name is only the automatic GJ/CNS5 fallback, an accepted census
match may supply a reviewed common or published default name. Full designations and
the GJ identifier remain searchable alternates. A shortened coordinate designation
is a display abbreviation, not a new astronomical identity: it must be derived
deterministically from a retained full identifier, remain unique in the generated
catalogue, and fall back to additional coordinate precision on collision.

For presentation, an accepted census brown-dwarf classification or effective
temperature outranks the neutral fallback. It does not override a more specific
explicit project decision. Ordinary stellar presentation with accepted Gaia facts
retains its current precedence.

Runtime object class is a nullable source fact with the closed values `star`,
`white_dwarf`, and `brown_dwarf`; null means the active sources do not support a
classification. It is derived only for an accepted census match:

- an accepted optical or near-infrared spectral type whose normalized primary class
  is `T` or `Y` establishes `brown_dwarf`;
- an accepted optical spectral type in the white-dwarf `D` family together with a
  non-empty `WD` designation establishes `white_dwarf`;
- an accepted optical or near-infrared spectral type whose normalized primary class
  is `O`, `B`, `A`, `F`, `G`, `K`, or `M` establishes `star`; and
- all other cases remain null. In particular, an `L` type, mass, temperature, or
  designation alone does not establish a class.

An explicit reviewed project classification outranks this derivation. Otherwise,
facts proposing more than one non-null class are a conflict and fail review; no
source-order tie-break is allowed. A census record with no published type requires
explicit review before effective temperature plus supporting mass evidence may
establish `brown_dwarf`. Unaffected components without an accepted census match
remain unchanged or null; the new source does not bulk-reclassify the catalogue.

For this decision, an accepted source type is non-empty, unbracketed, and has a
non-empty corresponding census reference field. After Unicode NFKC, whitespace
collapse, and ASCII uppercasing, the primary class is the first spectral letter
after an optional `D/SD`, `SD`, `ESD`, or `USD` metallicity prefix. A leading `D`
with a white-dwarf suffix (`DA`, `DB`, `DC`, `DO`, `DQ`, `DZ`, or `DX`) is instead
the white-dwarf `D` family. A composite type proposing different primary classes is
a conflict, not a first-token match.

Brown-dwarf markers receive an explicit substellar visual treatment derived from the
retained classification or effective-temperature fact:

- `infrared-cool` represents an accepted Y type or a reviewed brown dwarf below
  `500 K` and maps to `#725a82`;
- `infrared-warm` represents an accepted T type or a reviewed brown dwarf from
  `500 K` through `1,399 K` and maps to `#9a6548`;
- a conflicting type/temperature tier fails for review;
- both families use visible glyph radius `0.05`, compared with the existing ordinary
  stellar radius `0.09`; and
- both families use additive intensity `0.25`, compared with ordinary stellar
  intensity `1.0`.

These are infrared-oriented false-colour and presentation values, not claims of
visible colour, measured physical radius, or luminosity. The 20-pc census does not
provide a uniform direct radius measurement, so the application must not manufacture
one from mass or temperature. A separate picking target with radius at least `0.09`
preserves interaction independently of visible glyph size.

The shader applies marker intensity exactly once to final alpha; it does not also
scale RGB and accidentally square the perceived attenuation under additive blending.

## Consequences

- The ten currently misrepresented T/Y dwarfs can receive recognizable source-backed
  names, substellar classifications, and temperature-backed visual treatment.
- Ross 614, HD 155876, and Kruger 60 gain published identity and hierarchy evidence
  even where the current CNS5 row lacks a Gaia identifier.
- The active astronomy pipeline gains one additional pinned source and therefore one
  more acquisition, schema, provenance, attribution, refresh-diff, and validation
  contract.
- The source's fixed 20-pc boundary is explicit; it is not a general replacement for
  CNS5 or GCNS around distant narrative anchors.
- Published aliases and component hierarchy can reveal conflicts in the existing
  identity registry. Those conflicts require review rather than silent churn.
- Visual marker size, brightness, and click target become separate concepts.

## Alternatives considered

1. **Use live SIMBAD as the production source.** Rejected because SIMBAD is useful
   for investigation but its continuously changing aggregate view is a weaker
   reproducibility boundary than a pinned published catalogue.
2. **Use the UltracoolSheet as the sole source.** Rejected for this task because its
   strongest machine-readable release focuses on ultracool objects, while the
   Kirkpatrick census also provides the stellar component and hierarchy evidence
   needed for the three non-brown-dwarf exceptions.
3. **Hand-author thirteen presentation overrides.** Rejected because it fixes the
   current symptom without a refreshable source contract or a systematic way to
   catch additional CNS5-only ultracool objects.
4. **Derive physical radius from mass or effective temperature.** Rejected because
   brown-dwarf radius is model- and age-dependent and the selected catalogue does not
   provide a uniform measured-radius fact.
5. **Remove unmatched objects from the map.** Rejected because it violates
   ADR-0011's CNS5/GCNS inclusion union and would make the neighbourhood less
   complete.

## Follow-up

BOB-026 implements the pinned source, reviewed identity edges, naming and
presentation precedence, schemas, generated data, rendering changes, tests,
attribution, and integrated documentation. `docs/technical-design.md` and
`docs/data/astronomy-pipeline.md` must incorporate this decision before BOB-026 is
complete.
