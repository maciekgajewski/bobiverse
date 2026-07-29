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

| Task                                                                    | Status | Purpose                                                                    |
| ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| [BOB-001](BOB-001-nearby-star-map.md)                                   | Done   | Deliver the 20-system astronomy map vertical slice.                        |
| [BOB-002](BOB-002-narrative-data-model-definition.md)                   | Done   | Define the Phase 2 narrative JSON data model.                              |
| [BOB-003](BOB-003-visual-system-and-application-shell.md)               | Done   | Establish the responsive visual system and application shell.              |
| [BOB-004](BOB-004-narrative-zero-state-and-projection.md)               | Done   | Validate the zero state and generate reader-safe chapter projections.      |
| [BOB-005](BOB-005-galactic-starfield-backdrop.md)                       | Done   | Add an aligned, permanent real-sky backdrop to the map.                    |
| [BOB-006](BOB-006-generalized-narrative-zero-state.md)                  | Done   | Generalize the zero state beyond the Solar-System location tree.           |
| [BOB-007](BOB-007-additional-narrative-entity-types.md)                 | Done   | Add technology, organization, and vessel-type narrative entities.          |
| [BOB-008](BOB-008-codex-assisted-chapter-extraction-pilot.md)           | Done   | Pilot blind, evidence-backed Codex extraction for one chapter.             |
| [BOB-009](BOB-009-promote-approved-chapter-1-1.md)                      | Done   | Promote the approved chapter 1.1 candidate into canonical narrative data.  |
| [BOB-010](BOB-010-important-mentions-and-narrative-activity.md)         | Done   | Add important mentions and generated cross-type narrative activity.        |
| [BOB-011](BOB-011-reader-progress-and-temporal-navigation.md)           | Done   | Add guarded progress and chapter/date temporal navigation.                 |
| [BOB-012](BOB-012-progressive-object-browser-and-inspectors.md)         | Done   | Add the progressive grouped browser and type-aware inspectors.             |
| [BOB-013](BOB-013-astronomy-neighbourhood-catalogue.md)                 | Done   | Guarantee recognizable, reconciled astronomy context around story systems. |
| [BOB-014](BOB-014-narrative-aware-map-integration.md)                   | Done   | Join narrative knowledge and activity to the true-scale map.               |
| [BOB-015](BOB-015-phase-2-desktop-integration-and-acceptance.md)        | Done   | Integrate and accept the complete Phase 2 desktop workspace.               |
| [BOB-016](BOB-016-phase-2-mobile-design-and-responsive-adaptation.md)   | Draft  | Design and implement the first-class Phase 2 mobile composition.           |
| [BOB-017](BOB-017-audit-important-mentions-for-chapters-1-1-and-1-2.md) | Done   | Audit important mentions for canonical chapters 1.1 and 1.2.               |
| [BOB-018](BOB-018-promote-approved-chapter-1-2-mentions.md)             | Done   | Promote the approved important mentions into canonical chapter 1.2.        |
| [BOB-019](BOB-019-correct-chapter-1-2-names-and-state.md)               | Done   | Correct chapter 1.2 acronym naming and Robert's confirmed death state.     |
| [BOB-020](BOB-020-year-only-state-write-ordering.md)                    | Done   | Order equal year-only state writes by canonical chapter.                   |
| [BOB-021](BOB-021-encyclopedic-entity-descriptions.md)                  | Done   | Author spoiler-safe mini-encyclopedia descriptions during extraction.      |
| [BOB-022](BOB-022-seed-ami-zero-state.md)                               | Done   | Seed AMI before the book and reconcile its chapter 1.7 reference.          |
| [BOB-023](BOB-023-settlement-scale-location-authoring.md)               | Done   | Keep extracted locations at settlement or base scale.                      |
| [BOB-024](BOB-024-significant-narrative-event-authoring.md)             | Done   | Reserve events for consequential, memorable narrative turning points.      |
| [BOB-025](BOB-025-fixed-light-year-presentation.md)                     | Done   | Remove unit selection and use light-years for all displayed distances.     |
| [BOB-026](BOB-026-ultracool-dwarf-identity-and-presentation.md)         | Done   | Give CNS5-only ultracool objects recognizable names and presentation.      |
| [BOB-027](BOB-027-generalized-narrative-moment-ordering.md)             | Done   | Order equal year-only narrative facts by canonical chapter.                |
| [BOB-029](BOB-029-responsive-chapter-projection-pipeline.md)            | Done   | Prepare narrative data once and keep chapter transitions responsive.       |

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

Routine promotion of an exact, explicitly approved chapter candidate is not tracked
as a task. Follow `../chapter-extraction.md` and append the result to
`../chapter-promotion-log.md`. Create a task when chapter work also changes code,
schemas, contracts, tooling, or includes broader editorial remediation.
