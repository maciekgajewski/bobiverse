# Architecture decision records

ADRs record significant decisions made after the approved baseline in
`../technical-design.md`. The technical design itself captures the initial ratified
architecture, so it is not duplicated as a set of retrospective ADRs.

Create an ADR when a proposal changes:

- A core technology or ownership boundary.
- Runtime static deployment or persistence.
- Astronomy source authority, coordinate frame, units, or geometry invariants.
- The system/component identity model.
- Narrative data authority or spoiler semantics.
- A security, privacy, or intellectual-property boundary.

Do not create ADRs for ordinary implementation details already permitted by the
technical design.

## Naming

Use `NNNN-short-title.md`, beginning with `0001`.

## Statuses

- `Proposed`
- `Accepted`
- `Superseded by ADR-NNNN`
- `Rejected`

## Template

```markdown
# ADR-NNNN: title

Status: Proposed
Date: YYYY-MM-DD

## Context

What decision is needed, and what constraints make it significant?

## Decision

What is being chosen?

## Consequences

What becomes easier, harder, required, or prohibited?

## Alternatives considered

What credible alternatives were rejected, and why?

## Follow-up

Which tasks and integrated documents must change if this ADR is accepted?
```

Once an ADR is accepted, update the technical design when practical so agents do not
need to reconstruct the integrated architecture from a long ADR chain. Never rewrite
an accepted ADR to change history; supersede it.

