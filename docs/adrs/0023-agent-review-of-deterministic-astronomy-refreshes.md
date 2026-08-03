# ADR-0023: agent review of deterministic astronomy refreshes

Status: Accepted
Date: 2026-08-02

## Context

Chapter candidates may introduce exact, already accepted narrative astronomy anchors
whose bootstrap and context-sphere acquisition changes the complete reconciled
astronomy candidate checksum. The refresh can also expose additional GCNS rows and
therefore replace CNS5-transformed component positions with the higher-precedence
GCNS geometry required by ADR-0011.

ADR-0016 permits deterministic anchor resolution without separate human approval but
states that review metadata describes human decisions only. The integrated pipeline
still requires the complete changed candidate checksum to be accepted before runtime
generation. Requiring the Captain to inspect large machine-generated catalogue diffs
is a poor allocation of review authority when a fresh independent agent has access to
the source artifacts, validators, exact diff, and deterministic contracts.

The Captain delegates this bounded validation and acceptance decision to an
independent agent. Narrative candidate approval and astronomy changes requiring
scientific or editorial judgment remain human decisions.

## Decision

A fresh independent review agent may accept a refreshed complete astronomy candidate
snapshot without a separate Captain decision only when every semantic change is one
of:

- an exact bootstrap or context-sphere acquisition for a source-backed narrative
  anchor resolved under ADR-0016;
- query accounting, retrieval metadata, checksums, or formatting produced by that
  refresh;
- additional source rows returned inside those exact context spheres;
- deterministic source joins and unaccepted review candidates derived from those
  rows; or
- deterministic adoption of higher-precedence source-backed geometry required by
  ADR-0011, without changing an adopted system component.

The review agent must use a fresh context, remain read-only, inspect the complete
baseline and refreshed artifacts, recompute the old and new normalized candidate
checksums, and verify all relevant validation invariants. Its acceptance record must
identify the agent, UTC date, exact checksums, permitted semantic change classes, and
the absence of every prohibited class.

The agent must reject and escalate to the Captain if the refresh adds or removes a
stable system or component ID; changes system membership, accepted identity, names,
aliases, adopted components, source authority, explicit review overrides, or accepted
WDS edges; introduces or clears ambiguity; substantively changes source rows or
candidate facts outside the requested source queries; invents coordinates; or
requires scientific or editorial judgment. Refresh timestamps, query accounting,
checksums, and formatting for otherwise byte- or value-equivalent sources are
permitted non-semantic metadata churn.

After a clean independent acceptance, the orchestrator may update only the complete
accepted candidate checksum and transparent reviewer/date attribution in
`system-review.json`. The reviewer string must state that the decision was an
independent agent review under Captain-delegated authority; it must not imply direct
human inspection. The reviewing agent must not edit the metadata it judged.

This decision supersedes ADR-0016 only where it restricts review metadata to direct
human decisions. ADR-0016's exact-name, unique-identity, source-backed geometry,
normalization, explicit-exception, and fail-closed rules remain accepted.

## Consequences

- Deterministic chapter-driven astronomy acquisition can proceed without asking the
  Captain to audit large mechanical source diffs.
- Reviewer independence and explicit evidence become mandatory before a changed
  candidate checksum is accepted.
- GCNS geometry replacing CNS5-transformed geometry is reviewable as a deterministic
  source-precedence consequence, not treated as a manual coordinate decision.
- Ambiguous identity, membership, authority, adopted-component, or unrelated source
  changes still stop for Captain review.
- Final chapter candidates and their combined canonical diff still require exact
  Captain approval before promotion.

## Alternatives considered

1. Require the Captain to approve every astronomy candidate checksum. Rejected
   because the relevant evidence and invariants are machine-verifiable and the
   Captain explicitly delegated this bounded review.
2. Let the orchestrating agent silently accept its own refresh. Rejected because it
   removes independent review and makes mistakes self-ratifying.
3. Accept every deterministic refresh automatically in code. Rejected because live
   source drift and reconciliation consequences still require a semantic diff audit.
4. Permit agents to resolve ambiguous identities or memberships. Rejected because
   those decisions require scientific or editorial judgment beyond this delegation.

## Follow-up

- BOB-20260802-4HD54D implements the independent review gate.
- Update `../chapter-extraction.md`, `../data/astronomy-pipeline.md`,
  `../technical-design.md`, and the repository-local extraction skill.
