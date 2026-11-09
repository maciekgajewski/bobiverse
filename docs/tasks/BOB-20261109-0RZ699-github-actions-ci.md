# BOB-20261109-0RZ699: GitHub Actions continuous integration

Status: In progress
Phase: 1 (verification infrastructure; supports all delivery phases)
Last updated: 2026-11-09

## Objective

Run repository validation and cross-browser interaction tests on free, standard
GitHub-hosted Linux runners instead of relying solely on piotr's compute.

## User-visible outcome

Pull requests show independent repository and browser checks, with downloadable
failure evidence. CI green is required before merge; manual visual acceptance
remains the Captain's responsibility.

## Binding references

- `../../AGENTS.md`, Validation and completion and content/IP rules
- `../technical-design.md`, Sections 5.2, 5.3, and 7
- `../implementation-plan.md`, Phase 1 verification foundation
- `../visual-testing.md`
- `../adrs/0025-spoiler-projected-location-status-and-system-markers.md` (baseline
  snapshot prerequisite only)
- `../tasks/README.md`

No new ADR: this automates the existing verification contract without changing
application architecture, narrative data, or accepted ADR behavior.

## In scope

- A standalone `CI` workflow for pull requests, pushes to master, and manual dispatch.
- Node from `.nvmrc`, npm clean installation/caching, Python 3.14, requirements-keyed
  pip caching, and a fresh `.venv` matching existing data script paths.
- Task, formatting, lint, typecheck, Vitest, Python/data validation, and build checks.
- Chromium, Firefox, and WebKit matrix jobs, one worker and at most one retry;
  retained failure reports and diagnostics for seven days.
- Read-only token, official major-version-pinned actions, standard free runners.
- Directly affected merge and browser-testing documentation.
- Four minimal, separately attributed prerequisite corrections already present in
  PR #1: two build type fixes, the justified Earth snapshot refresh, and the existing
  astronomy-only selection test repair. PR #1 itself remains unchanged.

## Out of scope

- Changing PR #1's branch/head, merging, deploying, paid/larger/self-hosted runners.
- Secrets, branch-protection settings, extracting additional chapters, or reading,
  copying, uploading, or committing source book text or external working datasets.
- Silently masking pre-existing failures, weakening assertions, or performance gates.

## Acceptance criteria

1. CI triggers on pull requests, master pushes, and manual dispatch; superseded runs
   for one pull request cancel without cancelling unrelated pull requests.
2. Repository checks run every documented validation command using tracked inputs
   and an isolated Python environment; no local checkout-only dependency is needed.
3. All three browser targets run independently (`fail-fast: false`) using one worker
   and one retry at most, with browser/system dependencies installed.
4. Failed browser jobs upload uniquely named reports and test-results for seven days.
5. All runners are `ubuntu-latest`, token permissions are `contents: read`, checkout
   does not persist credentials, and no secrets or third-party actions are used.
6. AGENTS.md requires the named CI workflow to be green before merge and browser
   guidance explains commands, failures/artifacts, and the manual acceptance boundary.
7. Workflow YAML/action validation and equivalent local checks are recorded. A PR
   run is observed and per-job results are reported; failures remain explicit.
8. Independent task/implementation review and the Captain's browser checklist occur
   before completion; the task stays In progress until those gates are satisfied.

## Validation

```bash
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-astronomy.txt
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e -- --project=chromium --workers=1 --retries=1
npm run test:e2e -- --project=firefox --workers=1 --retries=1
npm run test:e2e -- --project=webkit --workers=1 --retries=1
.venv/bin/python -c 'import yaml; yaml.safe_load(open(".github/workflows/ci.yml"))'
actionlint .github/workflows/ci.yml
git diff --check
```

Local browser system libraries are already installed; no sudo on piotr. If 5173 is
occupied, report rather than terminating another worker's server. Observe the PR's
Checks tab and actual GitHub run statuses separately from local validation.

## Documentation and generated artifacts

- Update AGENTS.md and docs/visual-testing.md; no duplicate task index.
- Commit only workflow, directly affected guidance, and this task unless a separately
  explained prerequisite repair is necessary.
- Keep node_modules, .venv, generated manifests, browser reports, and logs untracked.
- Preserve browser failure diagnostics locally and in short-lived CI artifacts.

## Known risks and decisions

- Captain authorised via the manager, 2026-11-09.
- Master initially contains known WIP failures separately fixed in PR #1. Preserve
  its head; carry only the four prerequisite repairs in this independent CI branch
  and distinguish red baseline results from repaired results.
- Parallel local runs previously flaked on WebKit dolly-step fraction and Chromium
  expressive-map timeout; both passed serially. Single-worker jobs and one retry
  limit contention without hiding repeatedly failing behavior.
- Dependency availability and GitHub runner graphics/system libraries may differ
  from piotr; record any environmental-only failure rather than bypassing it.
- Public standard hosted runner usage is free; making the repository private or
  switching runner classes requires a new billing decision.
- A fresh tracked worktree with only npm/Python installs and generated manifests
  passes data:test and data:validate: no source text, external extraction datasets,
  or untracked benchmark artifacts are dependencies.
- Repository-requested independent review is coordinated by the manager; no review
  agent tool is available in this executor.

## Log

### 2026-11-09

- Prepared this self-contained task from the manager's authorised CI brief; created
  branch `bob-20261109-0rz699-github-actions-ci` in `~/src/bobiverse-ci` from
  `origin/master`, independently of PR #1 at `29af45a`.
- Plan: automate existing script contracts, create `.venv` rather than rewriting
  scripts, run isolated browser matrix jobs, document gates and failure evidence.
- Validation and independent review results will be appended after execution.

- Dependency audit: npm ci reports 25 existing advisories (1 low, 16 moderate,
  8 high); dependency upgrades are outside this CI automation task.
- Validated workflow with checksum-verified actionlint 1.7.12. The Ubuntu 24.04
  hosted-runner inventory lists xvfb; runtime checks also handle image changes.
- Corrected stale visual-testing wording claiming headed Firefox: the existing
  Playwright configuration sets headless true and the npm wrapper retains Xvfb.

- Baseline validation from a fresh worktree at f86294d: npm ci, Python 3.14 venv and
  pinned requirements install, task check (55 tasks), formatting, lint, typecheck,
  78 Python tests, data validation (271 systems/six pinned sources), YAML parsing,
  actionlint, workflow-policy assertions, and diff whitespace checks pass.
- Baseline Vitest: 234/235 pass; the sole failure is the stale Earth colony_of
  snapshot. Confirmed baseline/zero-state.json already contains species:human and
  ADR-0025 requires an inhabited homeworld to record colony_of.
- Baseline build: fails at tsc -b in ObjectInspector.tsx (unknown ReactNode) and
  TimelineDock.tsx (MapIterator.map and implicit-any callback). The separate npm
  typecheck script passes because its root noEmit invocation differs from the
  build's project-reference check; CI deliberately retains both commands.
- These are the exact existing prerequisites already repaired in PR #1. To keep
  the CI task independently green without changing PR #1, carry its two type
  corrections, justified snapshot refresh, and astronomy-only selection-test repair
  into this branch in a separate, explicitly attributed prerequisite commit.

- Baseline Chromium: 25/26 pass in 3.4 minutes; the known Alpha Centauri label test
  fails both initially and on its sole retry. Firefox reproduced the same failure
  before the baseline run was deliberately interrupted; WebKit baseline not run.
  Stopped only this task's own runner/Playwright processes, retaining Chromium
  reports and interrupted Firefox evidence outside the worktree.
- Applied the exact four-file prerequisite diff from PR #1 head 29af45a onto
  f86294d. No new behavioral interpretation or weakened assertions; the existing
  browser repair selects astronomy-only Alpha Centauri through the object browser,
  asserts inspector selection, then retains the map-label assertion. The snapshot
  refresh matches the already-authored zero-state/ADR-0025 contract.

- Corrected sequence: all requested checks pass after a second npm ci and pinned
  Python requirements install: 55 task files, formatting, lint, typecheck, 235/235
  Vitest tests across 29 files, 78/78 Python tests, runtime validation of 271 systems
  and six source catalogues, and production build. Narrative validation covers zero
  state and 39 chapter source files. YAML parsing, actionlint 1.7.12, workflow-policy
  assertions, and git diff --check pass. Build emits its existing large-chunk warning.
- Local browser verification uses preinstalled system libraries (no sudo) and
  Playwright's cached browser installations. The workflow performs --with-deps on
  clean GitHub runners and verifies Xvfb/xauth separately.

- Full corrected browser run: Chromium 26/26 (3.2 minutes), Firefox 26/26
  (2.2 minutes), WebKit 26/26 (3.0 minutes): 78/78 pass with CI=true, one worker,
  one allowed retry, and no retries/flakes observed. The CLI override deliberately
  caps the existing config's two CI retries without changing that shared config.
- Confirmed PR #1's main checkout remains on its original branch/head 29af45a;
  the chapters worktree and read-only owner/project/source-text directories were
  not modified or read. Only this new worktree's tracked corpus is used.
- Publication and actual hosted CI observation are still outstanding: this executor
  has only relayed authorisation for external writes, so no branch push or PR
  creation was attempted. Parent/manager must handle publication under its direct
  user-authorisation context, then observe the real GitHub run. No hosted CI result
  or workflow-push permission result is claimed here. Task remains In progress.
- Independent review and the Captain's workflow-browser checklist remain required.
