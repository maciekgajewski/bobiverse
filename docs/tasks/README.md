# Tasks

Task files are the authoritative source for active implementation scope. They are
derived from `../implementation-plan.md` and must remain consistent with
`../technical-design.md` and accepted ADRs.

## Statuses

- `Draft`: incomplete or still awaiting decisions.
- `Ready`: sufficiently specified, but not automatically authorized for execution.
- `In progress`: explicitly authorized and currently being implemented.
- `Blocked`: cannot proceed without a recorded external decision or dependency.
- `Done`: acceptance criteria and validation are complete.

## Index

| Task | Status | Purpose |
| --- | --- | --- |
| [BOB-001](BOB-001-nearby-star-map.md) | Done | Deliver the 20-system astronomy map vertical slice. |
| [BOB-002](BOB-002-narrative-data-model-definition.md) | In progress | Define the Phase 2 narrative JSON data model. |

## Task requirements

Every task must contain:

- Status and owning phase.
- Objective and user-visible outcome.
- Binding design and ADR references.
- In-scope and out-of-scope boundaries.
- Exact acceptance criteria.
- Validation commands or an explicit note that they must be established during the
  task.
- Documentation and generated-artifact expectations.
- Known risks or unresolved decisions.

`Ready` means the task is implementable without recovering conversation history. It
does not replace the requirement for explicit authorization from the Captain.
