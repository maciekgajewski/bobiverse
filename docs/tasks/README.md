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

## Generated index

Task files are the sole authority for task IDs, titles, and statuses. The repository
does not commit a duplicated index, so creating a task or changing its status modifies
only that task file.

From the repository root, print the current task index:

```bash
python3 scripts/tasks.py list
```

Useful variants:

```bash
python3 scripts/tasks.py list --status Ready
python3 scripts/tasks.py list --status "In progress"
python3 scripts/tasks.py list --format markdown
python3 scripts/tasks.py check
```

The commands locate `docs/tasks/` from the script path, so they can also be invoked
through an absolute or otherwise valid path from another working directory. Generated
plain or Markdown output is transient and must not be committed.

## Task IDs

Existing `BOB-NNN` task IDs remain valid. New tasks use:

```text
BOB-YYYYMMDD-XXXXXX
```

- `YYYYMMDD` is the UTC creation date.
- `XXXXXX` is a securely random six-character Crockford Base32 suffix using
  `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
- The ID does not encode priority, phase order, dependencies, or authorization.
- The filename appends a lowercase, hyphen-separated descriptive slug, for example
  `BOB-20260730-7K3MPQ-task-index-workflow.md`.

Generate an available ID instead of allocating a sequential number:

```bash
python3 scripts/tasks.py new-id
```

The generator checks IDs visible in the current task directory. After integrating
parallel branches or worktrees, run `python3 scripts/tasks.py check`; it rejects any
duplicate IDs even when their filename slugs differ. No parent-directory counter or
other shared allocation state is used.

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
