# ADR-0021: qualitative survey planet aggregates

Status: Accepted
Date: 2026-07-31

## Context

ADR-0018 requires every source-supported surveyed planet or dwarf planet to become a
spoiler-projected narrative location. It defines bounded anonymous authoring for moon
counts, but it does not define how to represent a qualitative planet aggregate whose
members are real yet individually unnamed and whose exact total is not stated.

Chapter `1.19` reports several outer Jovian planets in Omicron2 Eridani without an
exact count, individual designations, measurements, or distinguishing descriptions.
Omitting all of them loses source-supported system composition. Treating decorative
proxies as `planet` locations would instead falsely imply physical identities that
the narrative model does not support.

The Captain requires three outer Jovians to appear for the system's visual
composition, with each description identifying it only as part of the reported
plurality.

## Decision

- For Chapter `1.19`'s qualitative statement of `several` outer Jovian planets,
  author exactly three distinct anonymous physical planet locations. Three is the
  minimum cardinality guaranteed by `several`; it is not the asserted total.
- Use stable IDs `location:omicron2-outer-jovian-01` through
  `location:omicron2-outer-jovian-03` and reader-visible names `Outer Jovian 1`
  through `Outer Jovian 3`.
- Each location is a `planet` with `body_class: "gas_giant"`, an `orbits`
  relationship to `location:omicron-eridani-a`, and a minimal original description
  stating that it is one of several outer Jovian planets observed in the system.
- Preserve `several` in the system description. The three children form a known
  lower-bound inventory, not a complete count. Do not author unsupported size,
  colour, appearance, gravity, atmosphere, moons, habitability, orbital distance, or
  other physical properties.
- These locations represent three actual but unidentified members of the aggregate;
  they are not renderer-only decorations or proxies. Their ordinal labels are
  presentation identities and do not claim source-provided designations.
- Apply ADR-0020 ordering. The source establishes that these bodies are outside
  OE-2, so all three follow OE-2 in the sibling sequence. Their relative order is the
  deterministic invented schematic order 1, 2, 3 and is not catalogue astronomy or
  a measured orbital-distance claim.
- If a later chapter names one or more outer Jovians without uniquely linking the
  names to these anonymous bodies, bind new names in source-mention order to the
  lowest-numbered still-anonymous ordinal and retain the stable IDs. A unique
  source-supported identity link overrides that fallback.
- This decision is a Chapter `1.19` exception for one fingerprinted qualitative
  aggregate. It does not establish a general conversion rule for `several`, `many`,
  or other qualitative planet counts. Every individually identified surveyed body
  remains mandatory under ADR-0018.

This ADR narrows ADR-0018 only for the non-individuated qualitative outer-Jovian
aggregate in Chapter `1.19`. ADR-0018's source-completeness, observation, moon-cap,
and spoiler-projection rules otherwise remain unchanged.

## Consequences

- The projected system contains the minimum number of distinct planets established
  by the source while retaining the source's open-ended total.
- The renderer receives real narrative location identities rather than inventing
  bodies or maintaining a parallel visual-only planet list.
- Later evidence can refine anonymous identities without replacing stable IDs.
- Chapter `1.19` authoring depends on the ADR-0020 `orbital_order` source and
  projection contract so the known outer relationship and invented relative order
  are explicit and testable.
- A future qualitative planet aggregate requires its own reviewed decision unless a
  later ADR deliberately generalizes this convention.

## Alternatives considered

1. Keep the aggregate only in the system description. Rejected because it removes
   source-supported outer-planet composition from the projected hierarchy and the
   requested system view.
2. Create three visual-only renderer proxies. Rejected because the projected
   narrative hierarchy is the sole system-composition authority and the renderer may
   not invent bodies.
3. Claim that exactly three outer Jovians exist. Rejected because the source gives a
   qualitative plurality, not an exact total.
4. Create an arbitrary maximum or a general `several` conversion rule. Rejected
   because the Captain authorized this Chapter `1.19` representation, not a global
   semantic policy.

## Follow-up

- BOB-20260731-679GX9 implements the three anonymous locations, the required
  ADR-0020 ordering foundation, Chapter `1.19` reconciliation, and regression
  coverage.
- Integrate this chapter-specific exception into current technical and extraction
  documentation only where needed to keep the binding authoring contract explicit.
