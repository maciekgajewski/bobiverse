# ADR-0011: multi-catalogue astronomy authority

Status: Accepted
Date: 2026-07-27

## Context

ADR-0010 selected Gaia DR3 as the sole astronomy authority to minimize acquisition,
reconciliation, and refresh complexity. The resulting source-relative catalogue is
reproducible, but visual review exposed unacceptable gaps for the intended audience:
Sirius and Procyon were absent, and the Alpha Centauri system was represented only by
the Gaia source for Proxima Centauri.

Scientific precision is not the primary product requirement. The map must provide a
recognizable and defensible local stellar neighbourhood for science-fiction readers
who will notice missing landmark stars and incorrect component membership.

No single source satisfies every need:

- the Gaia Catalogue of Nearby Stars (GCNS), derived from Gaia EDR3, provides a
  clean nearby-source selection to 100 pc, Bayesian distance estimates, and
  heliocentric Galactic Cartesian coordinates;
- Gaia DR3 republishes the EDR3 source list, astrometry, and broad-band photometry and
  adds astrophysical parameters, variability, radial velocity, classification, and
  non-single-star products;
- CNS5 is designed for completeness and cleanliness within 25 pc, supplements Gaia
  with Hipparcos and ground-based astrometry, and records local component-to-system
  relationships; and
- the Washington Double Star Catalog (WDS) is the specialist authority for observed
  double and multiple-star component structure.

The direct `source_id` relationship is deliberately limited to GCNS/Gaia EDR3 and
Gaia DR3. Source IDs must not be assumed stable across unrelated Gaia releases.

## Decision

The astronomy pipeline uses four explicit, complementary source roles.

1. **CNS5 controls recognizable local inclusion inside 25 pc.** A CNS5 object is not
   discarded merely because it has no GCNS or Gaia DR3 match. This prevents Gaia's
   bright-star and close-multiple gaps from removing important local systems.
2. **GCNS controls scalable source selection and canonical geometry out to 100 pc.**
   Its median Bayesian distance and supplied heliocentric Galactic Cartesian
   coordinates are preferred when available.
3. **Gaia DR3 enriches matched EDR3/GCNS sources.** Enrichment is a left join by
   `source_id`; missing Gaia DR3 products remain explicit nulls and never remove a
   selected source.
4. **CNS5 and WDS control physical system membership.** CNS5 grouping fields are the
   first local authority. WDS supplements or corrects known double and multiple
   systems. Because WDS is pair-oriented and includes observational associations,
   WDS rows do not automatically become physical systems without deterministic
   reconciliation or an explicit project review.

For inclusion within 25 pc, the pipeline takes the union of CNS5 and GCNS rather than
their intersection. Between 25 and 100 pc, GCNS supplies the available census. A
required context sphere that crosses the 100 pc GCNS boundary fails coverage
validation; it may not be silently presented as complete.

Component-position precedence is:

1. GCNS median Bayesian Cartesian position for a matched source;
2. a reviewed CNS5 astrometric position for a CNS5-only source; then
3. no mapped coordinate. Coordinates are never invented from a name or narrative
   description.

The review layer separately selects the component or source-supplied system position
adopted by the interstellar node. A GCNS match for a secondary component does not
force that secondary to become the system position; in particular, Proxima's GCNS
record must not displace Alpha Centauri A/B as the reviewed Alpha Centauri system
position.

One map node remains one stellar system. Stable application system and component IDs
are independent of catalogue identifiers. Every retained source identifier and every
precedence or review decision remains in provenance. Components render as decorative
markers around the system node; catalogue component separations are not interstellar
map positions.

A project-owned landmark review explicitly requires recognizable local systems and
their accepted component membership. The initial fixtures include Sirius, Procyon,
and Alpha Centauri A, Alpha Centauri B, and Proxima Centauri. The review layer may
resolve source conflicts and names but may not introduce unsourced coordinates.

The generated runtime catalogue remains committed static JSON. Acquisition is an
explicit operator action; builds and the browser remain offline.

Narrative changes to astronomical objects are outside this decision. Fictional state,
including a star becoming a supernova, belongs to a separate task and must not be
designed into this extraction pipeline.

## Consequences

- Recognizable completeness takes precedence over the simplicity of one catalogue.
- Sirius, Procyon, Alpha Centauri, and other reviewed landmark systems become
  mandatory validation fixtures.
- The pipeline needs four pinned acquisition manifests, deterministic joins, explicit
  source precedence, and a reviewed cross-catalogue identity layer.
- CNS5-only bright or multiple stars remain representable even when Gaia enrichment
  is absent.
- Gaia DR3 astrophysical products are optional enrichment, not inclusion filters or
  system-membership authority.
- GCNS provides substantially wider geometry than CNS5, but its 100 pc boundary is
  still an explicit coverage limit.
- WDS refreshes may change observed component records; such changes require reviewed
  reconciliation rather than automatic membership churn.
- ADR-0010 is superseded. The existing Gaia-only runtime is a historical intermediate
  implementation and does not satisfy the revised BOB-013 acceptance criteria.

## Alternatives considered

1. Keeping Gaia DR3 alone was rejected because its quality-filtered source list omits
   recognizable bright and multiple systems.
2. Using GCNS alone was rejected because it inherits Gaia EDR3 observational gaps.
3. Using CNS5 alone was rejected because its 25 pc boundary cannot support the wider
   contextual catalogue.
4. Automatically treating every WDS pair as one physical system was rejected because
   WDS records observed pair relationships rather than a ready-made, unambiguous
   physical-system hierarchy.
5. Adding manually invented landmark coordinates was rejected because it would break
   the evidence and provenance contract.

## References

- Gaia Collaboration et al., *Gaia Early Data Release 3: The Gaia Catalogue of
  Nearby Stars*: <https://doi.org/10.1051/0004-6361/202039498>
- GCNS table description: <https://dc.g-vo.org/tableinfo/gcns.main>
- Gaia DR3 documentation: <https://gea.esac.esa.int/archive/documentation/GDR3/>
- Golovin et al., *The Fifth Catalogue of Nearby Stars*:
  <https://doi.org/10.1051/0004-6361/202244250>
- Washington Double Star Catalog:
  <https://www.astro.gsu.edu/wds/>

## Follow-up

BOB-013 replaces the Gaia-only extractor, source schema, reconciliation model,
validation, runtime data, and attribution with the pipeline defined by this ADR.
The integrated technical design and astronomy-pipeline documentation must carry the
same source boundaries and precedence. BOB-014 remains blocked until the revised
astronomy catalogue is validated.
