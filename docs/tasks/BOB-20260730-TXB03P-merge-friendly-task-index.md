# BOB-20260730-TXB03P: merge-friendly task indexing

Status: Done
Phase: repository workflow
Last updated: 2026-07-30

## Objective

Remove the manually maintained task table as a recurring merge-conflict hotspot and
replace it with a generated, read-only view of authoritative task-file metadata.
Adopt collision-resistant task identifiers that independent agents can create in
parallel branches and worktrees without coordinating a shared sequence counter.

## User-visible outcome

Agents and maintainers can list and validate tasks with one repository command.
Creating a task or changing its status modifies only that task file. New task IDs are
readable, date-grouped, and sufficiently collision-resistant for independent creation
without shared mutable state.

## Binding references

- `../../AGENTS.md`
- `../implementation-plan.md`
- `../technical-design.md`
- `README.md`

No accepted ADR governs task-index presentation or repository-local identifier
allocation. This task changes repository workflow only; it does not change application
architecture, runtime data, spoiler behavior, or delivery-phase boundaries.

## Decisions

### Index authority

- Each task file is the sole authority for its ID, title, and status.
- `docs/tasks/README.md` retains workflow guidance, status definitions, task
  requirements, and task-ID rules, but contains no manually maintained task entries.
- The task index is generated on demand and is not committed.
- Index generation must fail on malformed task metadata rather than silently omitting
  a task.

### New task IDs

- Existing sequential `BOB-NNN` IDs remain valid and are never renamed.
- New tasks use `BOB-YYYYMMDD-XXXXXX`.
- `YYYYMMDD` is the task's UTC creation date.
- `XXXXXX` contains six independently generated uppercase Crockford Base32
  characters using `0123456789ABCDEFGHJKMNPQRSTVWXYZ`.
- The random suffix is generated with Python's cryptographically secure `secrets`
  module and checked against IDs in the current task directory before being emitted.
- If a locally generated ID already exists, generation retries rather than
  overwriting or reusing it.
- IDs are opaque identifiers. Their date and suffix do not encode priority,
  dependency order, phase order, or authorization.
- The repository does not use a shared counter outside the checkout. Such a counter
  would coordinate only worktrees on one host, would not protect other clones, and
  would introduce an additional lock and recovery contract.

### Task filenames and metadata

- A task filename begins with its complete ID followed by a lowercase descriptive
  slug and `.md`.
- The slug matches `[a-z0-9]+(?:-[a-z0-9]+)*`; it is nonempty, uses only lowercase
  ASCII letters and digits, and separates words with single hyphens.
- The first line is `# <ID>: <title>`.
- Each task contains exactly one top-level `Status: <status>` field.
- Supported statuses remain `Draft`, `Ready`, `In progress`, `Blocked`, and `Done`.
- Legacy and new-format IDs may coexist indefinitely.

## In scope

- Add a standard-library-only Python task utility under `scripts/`.
- Add focused Python unit and command-line regression coverage.
- Remove the committed task table from `docs/tasks/README.md`.
- Document generated listing, validation, ID generation, and the new naming scheme.
- Update `AGENTS.md` so status changes no longer require editing a shared index.
- Update this task with completion evidence and final status.

## Out of scope

- Renaming or rewriting existing task IDs.
- Changing any existing task status as part of the migration.
- Adding task priority, ownership, dependency, or scheduling metadata.
- Generating task documents or slugs automatically.
- Committing generated index output.
- Adding a cross-host allocation service, parent-directory lock file, database, or
  network dependency.
- Changing ADR numbering.

## Command-line contract

The new `scripts/tasks.py` command has these exact invocation forms:

```text
python3 scripts/tasks.py [--tasks-dir PATH] list [--format {plain,markdown}] [--status STATUS]
python3 scripts/tasks.py [--tasks-dir PATH] check
python3 scripts/tasks.py [--tasks-dir PATH] new-id [--date YYYY-MM-DD]
```

`--tasks-dir` is a global option and defaults to the repository's `docs/tasks`
directory, resolved from the script location rather than the caller's current
directory. `--date` accepts one zero-padded Gregorian calendar date in ISO `YYYY-MM-DD`
form and defaults to the current UTC date. `--status` accepts one of the documented
status strings, including the quoted shell argument `"In progress"`.

For the default task directory, displayed paths are relative to the repository root,
such as `docs/tasks/BOB-034-expressive-starfield-visual-hierarchy.md`. For an explicit
`--tasks-dir`, displayed paths are relative to that supplied directory. These bases
are independent of the caller's current working directory.

The command must:

- implement `--help` without side effects;
- provide `list`, `check`, and `new-id` subcommands;
- locate the repository task directory by default regardless of the caller's current
  directory;
- allow an explicit task directory for isolated tests;
- make `list` validate all matching task files before output;
- print a compact human-readable list by default, sorted by ID;
- support Markdown table output without modifying a repository file;
- optionally filter listing by one supported status;
- make `check` report every discovered metadata error and exit nonzero when any
  exists;
- make `new-id` accept an optional creation date for reproducible invocation and emit
  exactly one available ID on standard output;
- write diagnostics to standard error and use nonzero exit status for invalid input
  or malformed task metadata.

The utility must not modify task files, the README, or any allocation state.

## Acceptance criteria

1. `docs/tasks/README.md` contains no per-task index entries and clearly identifies
   task files as the sole metadata authority.
2. Creating a task or changing a task status requires editing only that task file.
3. The task utility discovers every current `BOB-*.md` task and validates the
   filename ID, required nonempty lowercase-hyphenated slug, heading ID, nonempty
   title, exactly one top-level status, and supported status value.
4. Legacy `BOB-NNN` and new `BOB-YYYYMMDD-XXXXXX` IDs are both accepted; malformed
   and duplicate IDs are rejected.
5. Plain and Markdown listings are deterministic, ID-sorted generated views containing
   ID, status, title, and relative task-file path.
6. Status filtering accepts only the documented statuses.
7. ID generation uses the documented UTC-date plus secure six-character Crockford
   Base32 scheme, checks the current task directory, and has regression coverage for
   collision retry.
8. `--help` exits successfully without creating or changing files.
9. `AGENTS.md` directs agents to validate the task directory rather than synchronize
   task status into `docs/tasks/README.md`.
10. Existing task filenames, IDs, statuses, and bodies remain otherwise unchanged.
11. Focused tests cover valid legacy and new tasks; missing, empty, uppercase, and
    otherwise malformed slugs; malformed filenames and headings; missing, duplicate,
    and invalid statuses; deterministic ordering and formatting; stable path bases;
    status filtering; ID generation; and collision retry.
12. The task utility uses only the Python standard library.

## Validation

Implementation must establish and pass:

```bash
python3 scripts/tasks.py --help
python3 scripts/tasks.py check
python3 scripts/tasks.py list --format plain
python3 scripts/tasks.py list --format markdown
python3 scripts/tasks.py list --status Ready
python3 scripts/tasks.py new-id --date 2026-07-30
python3 -m unittest discover -s tests/python -p 'test_tasks.py'
git diff --check
```

The implementation review must also verify that `git diff -- docs/tasks/` changes
only this task and `docs/tasks/README.md`.

## Documentation and generated artifacts

- `docs/tasks/README.md` documents the generated-index workflow and both ID formats.
- `AGENTS.md` records the single-authority status workflow.
- Generated plain or Markdown listings are transient command output and must not be
  committed.

## Risks and mitigations

- Random IDs cannot provide a mathematical cross-branch uniqueness guarantee without
  shared coordination. Six Crockford Base32 characters provide 30 random bits per UTC
  date. The generator rejects collisions visible in its current task directory, and
  the required `python3 scripts/tasks.py check` validation rejects duplicate IDs after
  branches or worktrees are integrated, including duplicates carried by filenames
  with different slugs. Git itself is not relied upon to detect those collisions.
- A parser could omit malformed files and create false confidence. Both `list` and
  `check` therefore validate every matching task file and aggregate errors.
- A generated view could drift if it duplicates metadata. It reads ID, title, and
  status directly from the authoritative task files and persists no generated copy.

## Implementation plan

1. Implement parsing, validation, listing, filtering, and collision-resistant ID
   generation in `scripts/tasks.py`.
2. Add focused standard-library unit and subprocess tests in
   `tests/python/test_tasks.py`.
3. Replace the README table with command usage and ID rules, and update `AGENTS.md`.
4. Run focused validation, review the completed change, record evidence here, and
   mark the task `Done`.

## Completion evidence

Completed on 2026-07-30.

- `python3 -m unittest discover -s tests/python -p 'test_tasks.py'` passed all 16
  focused task-tooling tests.
- `npm run data:test` passed the complete Python test suite, including the new task
  tooling coverage.
- `python3 scripts/tasks.py --help`, `check`, plain and Markdown `list`, Ready-status
  filtering, and dated `new-id` generation all exited successfully.
- `python3 scripts/tasks.py check` validated all 36 task files after this task moved
  to `Done`.
- `git diff --check` passed.
- Task-directory inspection confirmed that the migration changes only this task and
  `docs/tasks/README.md`; existing task files remain unchanged.
- Independent task-definition review resolved all three initial findings with no new
  findings.
- Independent implementation review resolved invalid calendar/Unicode IDs,
  duplicate-diagnostic aggregation, and CommonMark fenced-status parsing; the final
  review returned `No findings.`
