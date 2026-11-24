# ADR-0034: catalogued star mapping guard

Status: Proposed
Date: 2026-11-24

## Context

Narrative `star_system` locations may remain explicitly unmapped
(`map_status: "unmapped"`, no `astronomy_object_id`) when no sky placement is
known. AGENTS.md and the data model forbid inventing coordinates. The converse
was unenforced: a location whose name, slug, or designation uniquely identifies
a system already in the runtime catalogue `src/data/nearby-systems.json` could
still land as unmapped and disappear from the map (LAN report: Delta Pavonis
after Book 2 through 2.77).

Validators already reject an authored `astronomy_object_id` that is not in
`knownAstronomyObjectIds`. They do not require a uniquely catalogued star to be
mapped. Plan step (A), authorised by the Captain via the manager on 24 Nov 2026
("Don't block on me. Use existing rules to verify the changes"), adds that
requirement.

This is a narrative data-authority rule: when an unmapped star system is allowed
to remain unmapped.

## Decision

`narrative:validate` inspects the latest accumulated state after all chapters.
A `kind: "star_system"` location with no `astronomy_object_id` that uniquely
matches one runtime catalogue system is an error, unless its id is on a versioned
allowlist (`data/config/unmapped-star-allowlist.json`) that records a reason for
each entry.

Matching is conservative and exact after normalisation, never fuzzy:

- Narrative keys: location `name` and `id` slug (`location:` stripped, hyphens
  become spaces). The `aliases` path is reserved but unused until the location
  schema allows aliases.
- Catalogue keys: system `name`, `alternates`, component `designation`, and
  HIP / GJ / Bayer / Flamsteed / published-name identifier fields (including
  constructed `HIP <id>` and `GJ <id>`).
- Normalisation: Unicode NFKC normalization, JavaScript `toLowerCase()`, dash and
  whitespace collapse; Gliese / GJ
  designations use the same rule as `normalize_astronomy_name` in
  `scripts/common.py` (canonical `gj <number>`, optional letter-only component
  suffix retained); HIP designations become `hip <number>`.
- A trailing component letter is not stripped: `Gamma Leporis A` does not match
  `Gamma Leporis`.
- Uniqueness is per entity: collect the union of catalogue systems matched by
  any of the entity's keys, and raise this error only if that union is exactly
  one system.

The allowlist cannot rot: an entry whose location is now mapped, is missing, or
is not a `star_system` is itself an error. The runtime catalogue (the generated
337-system file), not `system-candidates.json`, is the matching authority, so a
star that exists only as a candidate is not flagged until it enters the runtime
catalogue.

Standing allowlist entries at acceptance of this ADR include the documented
exception `location:gamma-leporis-a` and `location:hip-84051` (not yet in the
runtime catalogue). Temporary entries for pending mappings may exist only until
the corresponding data batch maps them.

## Consequences

- A chapter batch cannot land a uniquely catalogued star as unmapped without an
  allowlist entry and a recorded reason.
- Extraction preflight item 8 inherits the rule through `narrative:validate`.
- Mapping remains Extractor-owned (`astronomy_object_id` on chapter JSON). The
  guard does not invent coordinates or invent catalogue rows.
- Authors must add a reasoned allowlist entry when a star is intentionally left
  unmapped despite a unique catalogue match, and must remove the entry when the
  location is mapped.

## Alternatives considered

1. **Per-chapter check instead of latest state.** Rejected as the default
   because a later chapter may legitimately add `astronomy_object_id`; the
   latest state is the landing condition that matters.
2. **Match against system-candidates or CNS5 as well as the runtime catalogue.**
   Rejected for this ADR: an id that is not in `nearby-systems.json` cannot be
   authored as `astronomy_object_id` today, so flagging it would block landing
   without a catalogue change.
3. **Fuzzy or suffix-stripping name match.** Rejected because it would attach
   component labels such as `Gamma Leporis A` to the system `Gamma Leporis`.
4. **Hard-coded exception list in source.** Rejected in favour of a reviewed
   data file with reasons and a stale-entry check.

## Follow-up

BOB-20261124-SWF7EZ implements the validator, allowlist, tests, and the brief
data-model and extraction-guidance notes. Plan step (B) maps the temporary
allowlisted systems and removes those entries. Plan step (C) adds HIP 84051 /
GJ 12454 to the runtime catalogue; the `location:hip-84051` entry remains until
that location is mapped.
