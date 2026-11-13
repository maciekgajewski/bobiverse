# BOB-20261113-7GWNFC: process docs for the data-only chapter PR flow

Status: In progress
Phase: Cross-cutting (development process and governance)
Last updated: 2026-11-13

## Objective and user-visible outcome

Write down the Captain's new chapter flow. The Extractor submits approved chapters as
its own data-only PRs, and the manager reviews and merges them. Per-chapter regression
facts and promotion-log rows are dropped. The developer does code only, plus
content-specific UI when a chapter warrants it. The generic validators stay required,
and a merged-text sentence-preservation check is added as a requirement.
Documentation only.

## Binding references

- `../development-process.md` (roles, merge gate).
- `../chapter-extraction.md` (§Checksum provenance, §Promotion, §Post-write
  validation) and `../chapter-extraction-checklists.md` (Checklist C).
- `../chapter-promotion-log.md`, `../../AGENTS.md`, `README.md`.
- `../technical-design.md` Section 13: chapter approval stays with the Captain
  (unchanged).

## Authorisation

The Captain decided the flow on 2026-11-13 at 21:43 CET. The manager (Piotr Developer
Manager) relayed it the same evening and assigned this PR. No verbatim Captain wording
was relayed; the manager's summary is the source.

## Scope

1. `development-process.md`: Developer and Extractor roles; a new §Data-only chapter
   PRs section; merge gate item 4 for data PRs.
2. `chapter-extraction.md`: the data PR replaces the promotion-log row; the
   generic validators and the merged-text sentence-preservation check are required.
3. `chapter-extraction-checklists.md`: Checklist C items 4–6.
4. `chapter-promotion-log.md`: a short note that the log is frozen as history.
5. `AGENTS.md` and `docs/tasks/README.md`: the promotion pointers.

## Out of scope

- Implementing the sentence-preservation check (follow-up PR).
- Changing `scripts/chapter_promotion.py`, which still appends a log row.
- Deleting existing facts in `tests/fixtures/narrative-meaning.json`.
- ADR bodies and GitHub settings.

## Acceptance criteria

1. No doc still requires a per-chapter promotion-log row or per-chapter fixture facts.
2. The data-only PR flow, its gate and the quoted-approval rule are stated once, in
   `development-process.md`, and the other docs point to it.
3. The sentence-preservation check is documented as required and marked as coming in
   a follow-up.
4. No code, script, data or ADR file changes. Validation passes.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npx prettier --check AGENTS.md docs/development-process.md docs/chapter-extraction.md docs/chapter-extraction-checklists.md docs/tasks/README.md docs/tasks/BOB-20261113-7GWNFC-chapter-flow-process-docs.md
git diff --check
```

`docs/chapter-promotion-log.md` is left out of the prettier check: its table already
fails prettier on master (a known nit), and reformatting it would rewrite every row.

## Documentation and generated artifacts

The documentation files listed in Scope and this task file. No generated artifacts.

## Risks

- `chapter_promotion.py promote` still appends a log row, so a data PR may carry one
  by accident. Mitigation: the docs say to drop it. A follow-up can change the script.
- Until the sentence-preservation check exists, the check is manual.

## Log

### 2026-11-13 (Europe/Warsaw)

- Created from origin/master `90dab38` and implemented under the manager's relayed
  assignment. No accepted ADR mandates promotion-log rows or per-chapter fixture
  facts, so no superseding ADR is needed.
- Validation (Node 22.23.1, fresh `npm ci`): tasks check (74 task files, 30 ADRs),
  format:check, lint, prettier `--check` on the six other changed Markdown files and
  `git diff --check` all passed. Docs only, so no unit, e2e or build run.
