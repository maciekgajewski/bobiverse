# Astronomy data pipeline

## Status and runtime boundary

This document defines the implemented BOB-013/BOB-026 extraction pipeline under
ADR-0011 and ADR-0012.
The checked-in source snapshots, review artifacts, and generated runtime are validated
offline; only the explicit refresh command performs network access.

The browser imports one generated `src/data/nearby-systems.json` document at build
time. It makes no catalogue request. Canonical runtime positions remain Sun-centred
Galactic Cartesian coordinates in parsecs with the explicit render mapping:

```text
scene.x =  Xg
scene.y =  Zg
scene.z = -Yg
```

`data/config/map-display.json` remains the only production owner of the context
radius. Its default is exactly `20` light-years. Acquisition planning, generation,
independent validation, runtime filtering, tests, and relevant UI wording consume
that record.

Fictional or spoiler-dependent changes to astronomical objects are outside this
pipeline. They belong to a separate task.

## Source authority

### CNS5: local inclusion and initial grouping

CNS5 is the local-census authority inside 25 pc, approximately 81.5 light-years. Its
purpose here is to prevent important bright or multiple systems from disappearing
because Gaia does not provide a suitable source solution.

The importer retains at least:

- CNS5 object ID;
- Gaia EDR3 source ID when present;
- GJ and other supplied identifiers;
- component ID, component count, and system-primary relationship;
- adopted astrometry and its original authority;
- source flags needed to interpret the record; and
- the exact CNS5 release and correction version.

A CNS5 record remains eligible without a GCNS or Gaia DR3 match.

### GCNS: scalable selection, distance, and geometry

GCNS is the geometry authority for matched sources and the census authority between
25 and 100 pc. The importer uses the GCNS median Bayesian distance and the
corresponding median heliocentric Galactic Cartesian coordinates rather than
reconstructing distance as a simple inverse parallax.

The importer retains at least:

- EDR3/DR3 `source_id` as a decimal string;
- GCNS selection and quality fields needed to reproduce inclusion;
- distance percentiles, including the adopted median;
- median Galactic Cartesian `xcoord_50`, `ycoord_50`, and `zcoord_50`;
- source ICRS astrometry for auditability; and
- the GCNS release, query, endpoint, row count, and checksum.

GCNS has a hard 100 pc Sun-centred boundary. A required neighbourhood sphere that
crosses that boundary fails coverage validation.

### Gaia DR3: optional enrichment

Gaia DR3 enriches the union selected by CNS5 and GCNS. It does not decide whether a
source exists in the application and does not define physical system membership.

The direct join uses `source_id` because Gaia DR3 republishes the EDR3 source list,
astrometry, and broad-band photometry. This rule applies specifically to GCNS/EDR3
and DR3; source IDs must not be joined blindly to DR1, DR2, or a future source list.

The enrichment projection may include:

- G, BP, and RP photometry and `bp_rp`;
- effective temperature, luminosity, radius, gravity, and spectral or class products
  when available;
- variability classification and selected summary fields;
- radial velocity and uncertainty;
- non-single-star solution or multiplicity indicators; and
- the provenance of each product table.

Every enrichment field is nullable. A missing Gaia value never removes a selected
source or component.

### CNS5 and WDS: physical system membership

CNS5 grouping fields provide the initial component-to-system model inside 25 pc. WDS
supplements known double and multiple systems.

WDS is pair-oriented. Its rows may describe several pairs in one hierarchy and may
include optical or uncertain associations. Therefore:

- no positional match alone creates a physical system;
- WDS designations, component labels, coordinates, epochs, separation, identifiers,
  and notes are retained for review;
- deterministic matches must have a documented identifier or cross-match rule; and
- ambiguous, conflicting, or landmark membership is resolved in the project-owned
  review layer.

Gaia non-single-star indicators may support review but never override accepted
CNS5/WDS membership automatically.

### Kirkpatrick et al. 2024 20-pc census: identity and presentation enrichment

The full-sky census in VizieR catalogue `J/ApJS/271/55` enriches only an accepted
match to a published Table 4 row. Presence in that table is the eligibility
predicate; the importer does not recompute the catalogue boundary from parallax.
The census may supply recognizable names, identifiers, hierarchy evidence, spectral
type, effective temperature, object class, and a false-infrared presentation tier.
It never supplies application inclusion, canonical position, distance, coverage, or
automatic component topology.

An automatic identity candidate requires one compatible typed identifier unique on
both sides. Coordinates may nominate a review candidate but never form an identity
edge. Ambiguous, contradictory, composite, or scope-incompatible identifiers remain
unaccepted until an explicit reviewed mapping names both records and its reason.
Unqualified identifiers on multi-component source rows receive an explicit
`SYSTEM/N` scope, while a comma-delimited PMJID value remains one
`COMPOSITE/N` token. Neither is interchangeable with a singleton or
component-qualified token.

## Binding source contracts

BOB-013 implementation must use the following contracts. Choosing a different
service, table, release, or WDS file is a design change and requires this document
and the task to be reviewed before acquisition code changes.

### GAVO TAP: GCNS and CNS5

Both census sources use the GAVO TAP synchronous endpoint:

```text
https://dc.g-vo.org/tap/sync
```

- GCNS is table `gcns.main`, the published Gaia EDR3 Catalogue of Nearby Stars
  described by `https://dc.g-vo.org/tableinfo/gcns.main` and
  `https://doi.org/10.1051/0004-6361/202039498`.
- CNS5 is table `cns5update.main`, the continuously updated CNS5 table described by
  `https://dc.g-vo.org/tableinfo/cns5update.main` and the CNS5 publication
  `https://doi.org/10.1051/0004-6361/202244250`. The original `cns5.main` and the
  VizieR `J/A+A/670/A19/cns5` table are not interchangeable refresh inputs.

The GCNS normalized projection is exactly:

```text
source_id, ra, dec, ra_error, dec_error, parallax, parallax_error,
pmra, pmra_error, pmdec, pmdec_error,
phot_g_mean_mag, phot_bp_mean_mag, phot_rp_mean_mag,
phot_bp_rp_excess_factor, ruwe, ipd_frac_multi_peak,
adoptedrv, adoptedrv_error, adoptedrv_refname, radial_velocity_is_valid,
gcns_prob, wd_prob, dist_1, dist_16, dist_50, dist_84,
xcoord_16, xcoord_50, xcoord_84,
ycoord_16, ycoord_50, ycoord_84,
zcoord_16, zcoord_50, zcoord_84
```

The CNS5 normalized projection is exactly:

```text
cns5_id, gj_id, component_id, n_components, primary_flag,
gj_system_primary, gaia_dr3_id, hip_id,
ra, dec, epoch, coordinates_bibcode,
parallax, parallax_error, parallax_bibcode,
pmra, pmra_error, pmdec, pmdec_error, pm_bibcode,
rv, rv_error, rv_bibcode,
g_mag, g_mag_error, bp_mag, bp_mag_error, rp_mag, rp_mag_error,
g_mag_resulting, g_mag_resulting_error,
g_rp_resulting, g_rp_resulting_error, g_rp_resulting_flag,
cns6_system_id, reference_object_cns5_id, multiplicity_bibcode, remarks
```

Each refresh manifest records the table's upstream data-update timestamp returned by
GAVO metadata, the retrieval timestamp, exact ADQL, projected columns, normalized
checksum, and the GAVO table citation plus associated publication. Because
`cns5update.main` changes over time, its committed normalized extract and checksum
are the reproducible snapshot; a later response is never treated as equivalent.

### Gaia DR3 TAP enrichment

Gaia uses the existing synchronous endpoint:

```text
https://gea.esac.esa.int/tap-server/tap/sync
```

The initial enrichment contract is deliberately limited to:

- `gaiadr3.gaia_source` for `phot_g_mean_mag`, `phot_bp_mean_mag`,
  `phot_rp_mean_mag`, `bp_rp`, `radial_velocity`, `radial_velocity_error`,
  `phot_variable_flag`, and `non_single_star`;
- `gaiadr3.astrophysical_parameters` for nullable `teff_gspphot`, `logg_gspphot`,
  `lum_flame`, `radius_flame`, `spectraltype_esphs`, and
  `classprob_dsc_combmod_star`; and
- `gaiadr3.vari_classifier_result` for nullable `best_class_name` and
  `best_class_score`.

Every query is a left-join projection over the sorted selected decimal-string
`source_id` set, with at most one returned row per input ID from each table. Duplicate
IDs in any projection fail refresh. No other Gaia table is part of the initial
contract. Adding a Gaia product table requires an explicit projection, cardinality
rule, provenance entry, and validation update. The manifest carries the official
Gaia DR3 acknowledgement already used by the repository and links the Gaia DR3
credit and citation instructions.

### Washington Double Star Catalog snapshot

WDS acquisition uses:

```text
https://www.astro.gsu.edu/wds/Webtextfiles/wds_precise.txt
https://www.astro.gsu.edu/wds/Webtextfiles/wdsweb_format.txt
```

The first file is the current precise-coordinate WDS catalogue; the second is its
fixed-width format contract. Both complete files are downloaded in the same refresh
and committed as pinned source inputs. The catalogue is stored as deterministic gzip
with timestamp `0`; the format file is stored verbatim. The manifest records the
download URLs, retrieval and HTTP `Last-Modified` values when supplied, compressed
and uncompressed checksums, and row count.

The normalized project extract may contain only candidate rows, but independent
validation decompresses the committed full catalogue and repeats candidate
selection. A checksum without the corresponding complete bytes is not sufficient.
The required acknowledgement is: “This research has made use of the Washington
Double Star Catalog maintained at the U.S. Naval Observatory.”

### VizieR 20-pc census snapshot

The census refresh pins the catalogue ReadMe with history date `04-Jun-2024` and the
exact Table 4, notes, and references ADQL projections specified by BOB-026. The
logical baseline is 4,407 Table 4 rows, 4,407 notes, and 688 references. VizieR TAP
currently transports the long `BD+39 2376 AB` note as two adjacent rows, so the
manifest records 4,408 transport rows and deterministic normalization reconstructs
one logical note using continuation `recno` 1980. `recno` is source sequence only and
never becomes an identity.

The committed artifact records exact query bytes, projected columns, endpoint,
catalogue and publication DOIs, publication bibcode, retrieval timestamp, counts,
checksums, and the required VizieR acknowledgement. Identity uses a content-derived
`c20pc-2024:<sha256>` key. The source is:

```text
https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync
J/ApJS/271/55/table4
J/ApJS/271/55/notes4
J/ApJS/271/55/refs
```

Every reference code retained from the projected Table 4 fields must resolve through
the pinned references table or the exact source-documented external-code baseline:
`Allen1899`, `Gaia DR2`, `Gaia DR3`, `Gaia DR3-NSS`, `Gaia EDR3`, `IAU`, and
`SIMBAD`. Any other unresolved code fails refresh and independent validation.

## Pinned acquisition artifacts

Network acquisition is one explicit operator action:

```bash
npm run data:refresh
```

The implemented command orchestrates five independently inspectable acquisition
stages. Each user-facing acquisition script must implement `--help`.

Each source produces:

1. a normalized raw extract containing only source fields, without project naming or
   reconciliation;
2. a manifest recording catalogue, release or snapshot date, endpoint, exact query or
   selection, retrieval timestamp, normalized row count, normalized-file SHA-256, and
   required acknowledgement; and
3. a deterministic source-specific schema validation result.

The target logical artifacts are:

```text
data/source/gcns-neighbourhood.csv
data/source/gcns-neighbourhood.json
data/source/cns5-nearby-components.csv
data/source/cns5-nearby-components.json
data/source/gaia-dr3-enrichment.csv
data/source/gaia-dr3-enrichment.json
data/source/wds-precise.txt.gz
data/source/wdsweb-format.txt
data/source/wds-membership.json
data/source/twenty-parsec-census.json
data/source/twenty-parsec-census-readme.txt
data/source/identity-registry.json
data/source/system-candidates.json
data/source/system-review.json
data/source/major-local-systems.json
```

Exact filenames may change during implementation only if the task, schemas, and this
document are updated together. Raw extracts remain source-specific. The pipeline must
not flatten conflicting source facts before provenance is recorded.

`data/schema/astronomy-source-extract.schema.json` validates the normalized
source-specific row shapes, nullable-as-empty-string representation, and pinned
manifest provenance. `data/schema/nearby-systems.schema.json` validates the static
runtime including WDS review designations and source checksums.

For a continuously updated source such as WDS, the manifest must identify the
upstream snapshot date and checksum used for extraction. A later remote response is
not assumed equivalent.

## Extraction stages

### Stage 1: bootstrap source-backed anchor geometry

1. Inventory every canonical mapped stellar-system anchor as its stable application
   ID; Sol is the canonical origin. Replay effective location state from zero state
   through chapter introductions and updates in reading order, recording every
   effective narrative name-to-anchor pairing, including independent name-only and
   astronomy-ID-only updates.
2. Resolve each non-Sol ID to an exact GCNS or CNS5 source identifier. Derive the
   bootstrap automatically only when ADR-0016's exact normalized accepted-name or
   alias match and unambiguous accepted-position rules pass. Otherwise require one
   explicit reviewed bootstrap record.
3. Query those exact source records from the pinned GAVO tables before any
   neighbourhood envelope is planned.
4. Choose the anchor coordinate through the normal GCNS-then-CNS5 source precedence.
5. Fail if an anchor has no accepted source identity, has no source-backed coordinate,
   has only a fuzzy or partial name match, or resolves ambiguously.

Anchor lookup queries and returned rows are part of the corresponding GCNS or CNS5
extract and manifest; they are not an untracked preliminary cache. When a prior
runtime catalogue contains the anchor, validation compares the new source-backed
coordinate to it but never uses the prior runtime coordinate as acquisition
authority. This permits a newly mapped anchor to bootstrap without invented geometry
or a circular dependency on the previous generated catalogue.

### Stage 2: plan required coverage

1. Read the validated context radius.
2. Express each source-backed anchor neighbourhood as a canonical Euclidean sphere.
3. Fail planning if any required sphere crosses the 100 pc GCNS boundary.

The acquisition plan is sorted by stable anchor ID and committed in source manifests.
Overlapping query envelopes may be merged for acquisition efficiency, but coverage
proof remains per anchor.

### Stage 3: acquire CNS5 local membership

Acquire the pinned CNS5 records required for the union of:

- all objects whose adopted distance can place them inside a required neighbourhood
  within the 25 pc CNS5 volume;
- every component belonging to a selected CNS5 system; and
- every project-reviewed major local system fixture.

Selection uses a conservative uncertainty envelope. Exact nominal inclusion is
decided later at system level. The normalized extract preserves CNS5-only objects
that lack Gaia IDs and all Stage 1 anchor seed rows.

### Stage 4: acquire GCNS geometry

Acquire GCNS records whose median Cartesian position falls inside, or whose distance
uncertainty can plausibly intersect, a required neighbourhood. The extract includes
the fields required to recompute the adopted median position and the conservative
acquisition envelope.

Within 25 pc, GCNS records are unioned with CNS5 records rather than intersected.
From 25 to 100 pc, GCNS is the available census authority. All Stage 1 GCNS anchor
seed rows remain in the normalized extract even when an anchor lies outside another
anchor's neighbourhood.

When a newly acquired GCNS row carries a Gaia ID already present as an exact source
alias in one CNS5 `reference_object_cns5_id` group, it enriches that accepted
component and does not create a second singleton identity. Both reconciliation and
independent validation apply this rule. The promoted Chapter `1.19` expansion pins
separate coverage records for Sol, Epsilon Eridani, Omicron2 Eridani, Delta Eridani,
and Beta Hydri. Omicron2 resolves through the accepted `40 Eridani` alias and its
source-backed adopted component.

### Stage 5: acquire Gaia DR3 enrichment

Build the sorted unique set of non-null EDR3/DR3 `source_id` values from CNS5 and
GCNS. Query Gaia DR3 in deterministic chunks and left-join the returned products.

The manifest records:

- the ordered input-ID checksum;
- each exact ADQL query and projected table;
- per-query and union row counts; and
- IDs with no returned enrichment.

Missing enrichment is expected. Unexpected duplicate base-source rows, an
unrecognized product-table cardinality, or a returned ID outside the input set fails
the refresh.

### Stage 6: acquire WDS membership evidence

Start with CNS5 systems marked as multiple, GCNS/Gaia multiplicity candidates, and
the major-local-system fixtures. Retrieve the relevant WDS rows using pinned
identifiers or conservative positional envelopes.

Normalize WDS pair designations and component labels without inferring a physical
hierarchy. A reviewed decision lists component IDs in the same primary-to-secondary
order as the WDS component label; combined spectral types are split only when their
cardinality matches that ordered list. Record unmatched candidates and ambiguous
matches for review.

### Stage 7: reconcile source identities

Build a source graph whose nodes are source-specific records and whose edges have an
explicit reason:

- exact EDR3/DR3 `source_id`;
- CNS5-supplied system or component identifier;
- accepted WDS designation or cross-match; or
- explicit project review.

Positional proximity alone is evidence for review, not an accepted identity edge.
Every source record may belong to at most one accepted application component, and
every component may belong to exactly one application system.

After accepted identity edges are applied, each remaining connected source-record
group becomes one application component. A component without accepted CNS5, WDS, or
reviewed system-membership evidence becomes a one-component stellar system; ordinary
ungrouped GCNS records therefore do not disappear from the promised census.

`data/source/identity-registry.json` owns catalogue-independent stable IDs for both
reviewed and automatically retained identities. Component identity is assigned
first; system membership and system identity are assigned second:

- existing component graph groups reuse a component registry ID when any accepted
  exact source
  cross-reference matches;
- reviewed merges and splits must name the surviving or newly allocated IDs and
  record the reason;
- new component graph groups are sorted by a deterministic source-identity key, then
  receive the next opaque monotonic `stellar-component-NNNNNN` value;
- CNS5, accepted WDS, and review membership groups the assigned components; an
  ungrouped component forms a singleton membership group;
- existing membership groups reuse a system registry ID through their component IDs;
  new membership groups are sorted by their component-ID tuple, then receive the next
  opaque monotonic `stellar-system-NNNNNN` value;
- removed identities are tombstoned and their IDs are never reused; and
- an exact source identity that returns after tombstoning reactivates the same ID and
  records the reactivation in the refresh diff; and
- conflicting registry matches, one source record reaching two registry entries, or
  a changed graph that requires an unreviewed merge or split fails refresh.

ID allocation occurs only during explicit `npm run data:refresh`. Normal generation,
validation, build, and test commands treat the committed registry as immutable.
Although exact catalogue references provide registry match keys, no catalogue name
or identifier is encoded in an application ID.

Every automatically retained component and system receives deterministic review
candidates:

- preferred-name precedence is an explicit reviewed name, `GJ <gj_id>`,
  `HIP <hip_id>`, `Gaia DR3 <source_id>`, then `CNS5 <cns5_id>`;
- remaining source designations become alternate names without changing application
  identity; and
- a singleton's sole component and an unambiguous CNS5 source primary are proposed as
  the adopted system-position component.

For an unreviewed multiple system, the candidate system name comes from the proposed
adopted component; ties in component or alternate designations sort by normalized
designation and then stable component ID.

The project-owned review layer accepts one complete candidate snapshot by checksum
and overrides candidates when the source graph, membership, landmark presentation,
or naming is ambiguous. It may supply:

- reserved stable application system and component IDs;
- preferred and alternate name overrides;
- accepted catalogue cross-references;
- component hierarchy and recognizable component count;
- the adopted component for a multiple system when source grouping has no
  unambiguous primary;
- conflict-resolution reason and reviewer note; and
- whether the system is a mandatory landmark fixture.

Stable IDs do not encode GCNS, Gaia, CNS5, WDS, GJ, or HIP identifiers.

After the base graph is stable, the importer derives typed census-identifier
candidates and applies only exact unique edges or the explicit `c20pc_mappings` in
the accepted review artifact. Accepted census keys attach to existing registry
components without allocating, merging, splitting, or renumbering them. The
candidate artifact retains every exact proposal, ambiguity flag, accepted mapping,
source fact, and content key for review.

For a GJ/CNS5 fallback with an accepted census match, explicit landmark/project names
remain first and the reviewed census preferred name may replace only that fallback.
Coordinate names use collision-safe `WISE`, `2MASS`, or `UGPS HHMM±DDMM` display
forms while the complete published spelling and original prefix remain aliases.
Accepted runtime enrichment retains the complete projected Gaia, HIP, HD, Ross, WD,
WISE, 2MASS, GJ, PMJID, multiple-star, published-name, and common-name identifier
fields as nullable source facts. Comma-separated PMJID members are additionally
projected as individual searchable aliases without changing the retained source
value.

### Stage 8: choose canonical system geometry

For each accepted component:

1. use the GCNS median Bayesian Cartesian position when matched;
2. otherwise transform a CNS5 astrometry candidate with Astropy; or
3. leave the component unmapped and fail if it is needed as the adopted system
   position.

For ADR-0011's “reviewed CNS5 astrometry” requirement, a CNS5 record is accepted
as a review candidate when right ascension, declination, and positive parallax are
finite and in range, available uncertainties are finite and non-negative, and the
coordinate and parallax source bibcodes are retained. It becomes accepted only
through the reviewed candidate-snapshot checksum described in Stage 9. A missing
required value, conflicting cross-match, or source warning that disputes the identity
or astrometry requires an explicit per-system override; review may reject the
coordinate but may not invent a replacement.

The 20-pc census parallax never replaces that canonical geometry. For an accepted
match, the candidate artifact records a review warning when the absolute difference
between canonical and census distances exceeds the larger of `0.1 pc` and three
times their combined propagated one-sigma distance uncertainty. Missing or unusable
uncertainty narrows only the statistical term; it does not turn census astrometry
into geometry authority.

Before adopting GCNS Cartesian values, validation confirms their parsec units, origin,
axis orientation, and handedness against independently transformed fixtures. Any
required axis mapping is explicit; source columns are never silently relabelled as
canonical coordinates.

For each stellar system, candidate position precedence is:

1. an explicit reviewed adopted component or source-supplied system position;
2. the sole component of a singleton system; then
3. an unambiguous CNS5 source-primary component.

A multiple system with no mapped or unambiguous adopted component fails for review.
The pipeline must not average component positions into an invented barycentre. A
matched secondary component does not automatically become the system position;
Proxima must not displace Alpha Centauri A/B merely because Proxima has the easiest
Gaia/GCNS match.

Exact system inclusion in each neighbourhood uses the adopted canonical system
position, not component sprite offsets, parallax envelopes, or screen coordinates.

### Stage 9: accept the reconciled review snapshot

Stage 7 and Stage 8 emit deterministic
`data/source/system-candidates.json` containing every proposed component identity,
system membership, fallback name, accepted source cross-reference, astrometry choice,
and adopted system-position component. Its checksum covers the complete normalized
document.

`data/source/system-review.json` records:

- the exact accepted candidate-snapshot SHA-256;
- explicit narrative-anchor bootstrap exceptions that cannot be derived by
  ADR-0016's exact deterministic rule;
- explicit overrides and their reasons;
- unresolved ambiguities; and
- reviewer and review-date metadata.

Generation fails when the current candidate checksum differs from the accepted
checksum, any ambiguity remains unresolved, or an override references a missing
candidate. A review helper may update the one accepted checksum after the operator
inspects the candidate, source, identity-registry, and generated diffs; it must not
silently accept as part of `data:refresh`. This makes ordinary singleton handling
scalable without bypassing ADR-0011's review layer.

### Stage 10: derive approximate presentation

Presentation values are deliberately approximate:

1. an accepted census brown dwarf uses its reviewed `infrared-cool` or
   `infrared-warm` tier;
2. otherwise prefer an accepted Gaia DR3 effective-temperature or classification
   product;
3. otherwise use Gaia `bp_rp`;
4. otherwise use an accepted CNS5/WDS spectral value when supplied with provenance;
5. otherwise use the explicit neutral family.

The derivation and source record are retained with each component. Missing
presentation data does not remove the component. Brown dwarfs use base visible
radius `0.05` and additive intensity `0.25`; ordinary markers retain base radius
`0.09` and intensity `1.0`. ADR-0018 may scale the final narrative-known visible
plane without changing these emitted base values. Intensity multiplies final sprite
alpha exactly once. Every component keeps at least a `0.09` pointer target
independently of visible size. These values are presentation, not physical radius or
luminosity.

Multiple components render as a deterministic decorative cluster around one system
node. The offsets are not orbital or Cartesian component coordinates.

### Stage 11: emit the runtime catalogue

Emit Sol followed by the deduplicated systems sorted by adopted distance from Sol and
stable ID. The output contains:

- stable system and component identities;
- preferred and alternate names;
- canonical and render coordinates;
- distance and uncertainty;
- component membership;
- approximate presentation facts;
- all relevant source identifiers;
- field-level or grouped provenance;
- per-anchor coverage proof; and
- source-manifest checksums.

The runtime output remains below the reviewed system-count and file-size budgets.

## Required landmark fixtures

`data/source/major-local-systems.json` is a reviewed validation roster, not an
astrometry source. It is the sole testable definition of “major local stars”; the
generator does not apply a second subjective fame rule. At the default 20-light-year
Sol neighbourhood, the complete initial system roster is:

- Alpha Centauri;
- Barnard's Star;
- Wolf 359;
- Lalande 21185;
- Sirius;
- Luyten 726-8 (BL Ceti / UV Ceti);
- Ross 154;
- Ross 248;
- Epsilon Eridani;
- Lacaille 9352;
- Ross 128;
- EZ Aquarii;
- Procyon;
- 61 Cygni;
- Struve 2398;
- Groombridge 34;
- DX Cancri;
- Epsilon Indi;
- GJ 1061;
- Tau Ceti;
- Luyten's Star;
- Teegarden's Star;
- 40 Eridani;
- Altair;
- 70 Ophiuchi;
- Sigma Draconis;
- Eta Cassiopeiae; and
- 36 Ophiuchi.

The roster requires recognizable component membership for every listed multiple. At
minimum it explicitly names Sirius A/B, Procyon A/B, Alpha Centauri
A/B/Proxima, Luyten 726-8 A/B, 61 Cygni A/B, 40 Eridani A/B/C, 70 Ophiuchi A/B,
and 36 Ophiuchi A/B/C. A reviewed roster edit is required to add or remove a product
landmark. Increasing the configured radius does not silently make every famous
distant star a landmark; the roster must be reviewed with that configuration change.

Each roster entry references stable application IDs and expected component IDs. It
does not contain invented coordinates or replace source provenance.

## Independent validation

`npm run data:validate` must independently verify:

- every manifest's source identity, release, endpoint, query or selection, row count,
  checksum, and acknowledgement;
- the census ReadMe/version evidence, exact projections, 4,407/4,407/688 logical
  counts, 4,408-note transport count, continuation reconstruction, content keys, and
  accepted mapping bindings;
- the committed full WDS catalogue's compressed and uncompressed checksums, format
  file, row count, and exact candidate selection;
- the exact GCNS/CNS5 inclusion union inside 25 pc and GCNS selection from 25 to
  100 pc;
- complete left-join accounting between EDR3/GCNS IDs and Gaia DR3 enrichment;
- preservation of CNS5-only objects when Gaia enrichment is absent;
- a singleton component and system for every otherwise ungrouped retained source
  record;
- suppression of a duplicate singleton when a GCNS Gaia ID is already an exact
  source alias inside one CNS5 reference-object component;
- identity-registry reuse, monotonic allocation, tombstones, and rejection of
  unreviewed merges or splits;
- exact candidate-snapshot checksum acceptance and rejection of stale or unresolved
  review;
- accepted CNS5/WDS/review component-to-system membership and one-system ownership;
- deterministic candidate names and singleton/system-primary position adoption;
- the complete mandatory landmark roster, including Alpha Centauri A/B/Proxima;
- source precedence and every recorded conflict resolution;
- GCNS median Cartesian adoption or independent Astropy transformation of the CNS5
  fallback;
- nominal system-level Euclidean inclusion for every mapped anchor;
- per-anchor coverage counts and proof that no sphere crosses a source boundary;
- canonical-to-scene mapping, units, ordering, uniqueness, and finite values;
- exact equality between expected and emitted system/component IDs;
- presentation derivation, object class, census facts, marker size/intensity/pick
  separation, and null fallback;
- deterministic regeneration from committed inputs; and
- the runtime node-count and file-size budgets.

Validation must include negative fixtures for:

- a missing Sirius or Procyon system;
- Alpha Centauri collapsed to Proxima alone;
- a CNS5-only source dropped by a Gaia inner join;
- an ungrouped retained source omitted instead of emitted as a singleton;
- identity renumbering, ID reuse, or an unreviewed identity merge or split;
- an automatically retained singleton without a deterministic preferred name or
  adopted system-position component;
- a changed candidate snapshot without matching explicit review acceptance;
- a WDS candidate extract that cannot be reproduced exactly from the committed full
  snapshot and format;
- a new anchor planned from a prior runtime coordinate without an exact source-backed
  bootstrap record;
- an ambiguous WDS pair accepted without review;
- a conflicting source assigned to two systems;
- a direct `source_id` join attempted against an unsupported Gaia release; and
- a context sphere that crosses the 100 pc GCNS boundary.

## Refresh review

Before committing a refresh, review:

- all five source-manifest diffs;
- the compressed full WDS snapshot and format diff, checksums, and row count;
- added and removed systems and components;
- unmatched and multiply matched identifiers;
- changed GCNS distances or positions;
- changed CNS5/WDS membership;
- lost or newly available Gaia enrichment;
- new, removed, ambiguous, or changed census candidates, accepted names,
  classifications, temperatures, hierarchy evidence, and presentation tiers;
- every landmark fixture;
- coverage and runtime-size changes; and
- all acknowledgement changes.

Ordinary `npm run build`, `npm run test`, and browser runtime never access GCNS,
Gaia, CNS5, WDS, or VizieR. Refresh is never implicit. For a source-only census
refresh, `npm run data:refresh -- --c20pc-only` pins the new source bytes; a separate
`npm run data:refresh -- --reconcile` emits the review-sensitive candidate diff and
never updates its own accepted checksum.
