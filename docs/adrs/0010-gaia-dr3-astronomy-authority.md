# ADR-0010: Gaia DR3 astronomy authority

Status: Accepted
Date: 2026-07-26

## Context

The Phase 1A map uses a curated CNS5 subset plus separate visual-property sources.
Phase 2 requires a reproducible neighbourhood around every mapped narrative stellar
system, including anchors whose context sphere may extend beyond CNS5's local-volume
boundary. Maintaining several active catalogues would increase acquisition,
identifier reconciliation, provenance, and refresh complexity.

The product needs robust spatial context more than precise stellar astrophysics. The
Captain approved one broad, simple source and accepted source-relative completeness
and approximate visual styling.

## Decision

Gaia Data Release 3 (`gaiadr3.gaia_source`) is the sole active external astronomy
catalogue.

The catalogue contract includes every Gaia DR3 row returned by the committed
neighbourhood query that has:

- a five- or six-parameter astrometric solution;
- finite right ascension, declination, positive parallax, and parallax uncertainty;
- `parallax_over_error >= 10`;
- at least eight visibility periods; and
- `ruwe < 1.4`.

The acquisition query uses a conservative angular and radial envelope around each
mapped anchor. The offline generator performs the authoritative nominal three-
dimensional Euclidean radius test in the canonical Sun-centred Galactic Cartesian
frame. Completeness means all Gaia DR3 rows satisfying this explicit contract within
the configured neighbourhoods. It does not claim that Gaia observes every physical
star or resolves every component.

Each Gaia source is conservatively treated as a one-component stellar system unless
the project-owned system-review record explicitly groups multiple Gaia source IDs.
Review may supply a stable application ID, preferred name, alternate designations,
and component membership, but it may not add astrometry from another catalogue.

The runtime retains Gaia astrometry, uncertainty, photometry, identifiers, release,
query, retrieval timestamp, and snapshot checksum. Application IDs use the reviewed
stable ID when one exists and otherwise `gaia-dr3-<source_id>`. A future Gaia release
requires explicit identifier review rather than assuming source IDs remain stable.

Marker presentation no longer claims a reviewed MK spectral class or physical stellar
radius for every source. Gaia `bp_rp` supplies a documented coarse colour family when
available; missing colour uses a neutral marker. All catalogue markers use one fixed
readable glyph radius. Sol remains an explicit generated origin with the same
presentation fields. These values are visual cues, not stellar-property measurements.

Network access occurs only during an explicit operator-run refresh. The committed
snapshot records the exact ADQL, Gaia release, archive endpoint, retrieval timestamp,
row count, and SHA-256. Generation, validation, tests, builds, and browser runtime are
offline.

## Consequences

- One external catalogue and one identifier namespace drive astronomy acquisition.
- Coverage can extend beyond CNS5 without adding a second source-precedence system.
- Source-relative completeness is precise and independently testable.
- The project accepts Gaia's observational gaps and the loss of precise
  component-level spectral-class and radius claims.
- System membership remains conservative; unresolved or unreviewed multiples may
  appear as separate system candidates until reviewed.
- The existing CNS5 and auxiliary visual-property snapshots leave the active
  pipeline. Their historical role remains recorded in BOB-001 and version history.
- Gaia credit, release citation, known limitations, and refresh instructions are
  required in the integrated documentation and application attribution.

## Alternatives considered

1. Retaining CNS5 beside Gaia DR3 was rejected because it requires precedence,
   duplicate reconciliation, and two refresh contracts.
2. CNS5 alone was rejected because its local-volume boundary cannot guarantee future
   neighbourhoods.
3. Manual Gaia Archive exports were rejected because a committed scripted query is
   more reproducible.
4. Bulk Gaia downloads were rejected because neighbourhood extracts do not justify
   the operational size and complexity.
5. Requiring precise spectral class and physical radius for every marker was rejected
   because it reintroduces auxiliary sources and excludes otherwise valid context
   records.

## Follow-up

BOB-013 implements the source migration, validated display configuration,
neighbourhood acquisition and generation, coverage proof, runtime schema changes,
tests, and documentation. The integrated technical design and astronomy-pipeline
documentation must reflect this decision.
