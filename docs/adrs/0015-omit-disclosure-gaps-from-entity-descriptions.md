# ADR-0015: omit disclosure gaps from entity descriptions

Status: Accepted
Date: 2026-07-29

## Context

ADR-0014 requires concise, entity-centered encyclopedia descriptions, but the current
extraction guidance also recommends sentences such as “Its operating principle has
not yet been revealed.” Chapter 1.12 exposed that these sentences add catalogue-like
absence notices instead of explaining the object. Repeating every unrevealed
attribute makes descriptions longer without adding positive reader knowledge.

The extraction workflow still needs to preserve uncertainty and missing evidence so
agents do not invent completeness. That reconciliation concern does not require
publishing the absence as reader-facing description prose.

## Decision

- Entity descriptions contain positive reader-visible facts and explicitly
  attributed, source-supported assessments only.
- Omit every disclosure-gap statement from descriptions. This includes semantic
  variants such as “has not yet been revealed,” “remains unknown,” “has not been
  explained,” “full specifications are unavailable,” and clauses whose only purpose
  is to announce missing knowledge.
- When a sentence mixes a supported positive fact with a disclosure gap, retain only
  the supported positive fact when it remains coherent and useful; otherwise omit
  the sentence.
- Missing definitions, expansions, mechanisms, capabilities, limitations, and other
  unresolved details remain explicit in the sealed claim ledger, reconciliation
  report, uncertainty list, and human-review package. They are absent from the
  reader-facing description.
- Do not import later knowledge or invent a replacement merely to make a partial
  description appear complete. A short positive description is valid.
- Apply the rule at every reader boundary, including zero state, canonical chapters,
  and review-only candidates.

## Consequences

- Pass 1 continues capturing unrevealed and uncertain checklist items as evidence and
  uncertainty claims.
- Pass 2 must keep those gaps in reconciliation and review artifacts while excluding
  them from candidate descriptions.
- Existing canonical descriptions require a retroactive audit and correction at
  their original reader boundaries.
- Chapter 1.12 must be regenerated or revised and revalidated without disclosure-gap
  prose before it can be reviewed for promotion.
- Regression coverage checks canonical descriptions, extraction guidance, and the
  temporary candidate for semantic disclosure-gap forms.

## Alternatives considered

1. Ban only the exact phrase “has not yet been revealed.” Rejected because agents
   could emit equivalent absence notices with different wording.
2. Keep one standardized “unknown” sentence per description. Rejected because it
   still foregrounds absent information rather than useful object knowledge.
3. Fill missing details from later chapters or model knowledge. Rejected because it
   violates spoiler safety and evidence authority.

## Follow-up

- BOB-035 integrates the rule into authoring guidance, skill instructions,
  regression coverage, the canonical editorial audit, and the Chapter 1.12 dry-run
  candidate.
- ADR-0014 remains authoritative except where its recommended explicit
  disclosure-gap prose is superseded by this decision.
