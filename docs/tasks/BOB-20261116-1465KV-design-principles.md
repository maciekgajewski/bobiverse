# BOB-20261116-1465KV: design principles (the app's constitution)

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-16

## Objective and user-visible outcome

Write `docs/design-principles.md`: Maciej's governing design principles, in his
words, made coherent, for developers, agents and readers. It is the app's
constitution and supersedes every conflicting earlier rule, document or ADR. It
defines the hard ceiling (Read through) and the soft ceiling (the chronological
point chosen by chapter or date), the map and info-card rules, proposed edge rules
pending Maciej's confirmation, an Implications section listing every superseded
rule and code conflict, and a plan with a proposed What's new bullet for the
release that ships the soft ceiling. Maciej accepted it on 2026-11-16 and
ADR-0031 ratifies it. Every conflicting earlier rule is removed from the ADRs
and docs. Docs only: no reader-visible change.

## Authorization

- Relayed by the Piotr Developer Manager on 2026-11-16 (Europe/Warsaw): write
  `docs/design-principles.md` on a new branch, docs only, no code changes; bring
  it to the manager at a commit for review and Maciej; do not merge.
- Maciej's additions, relayed the same evening: frame the document as the
  constitution, list each superseded rule in the Implications section, and add a
  plan with a proposed What's new sentence. Do not change What's new code or data.
- Maciej accepted the document on 2026-11-16, relayed by the manager: "Yes to all,
  including suggestions on the document." Finalise it on the same branch: status
  Accepted, the edge rules folded in as accepted rules plus three more (calendar
  precision, description hard-ceiling only, cards before existence), a chapter's
  soft ceiling at its latest date, and a ratifying ADR.
- Maciej, relayed the same evening: "Remove all the superseded decisions so that
  they don't clutter the context". Delete the conflicting rules from the ADRs,
  docs and AGENTS.md instead of marking them superseded, keep the ratifying ADR
  short, and shrink the constitution's implications to the open code and data
  work.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md` §12
- `../chapter-extraction.md` §Descriptions, §Reading order and story dates
- ADR-0002, ADR-0005, ADR-0013,
  `../adrs/0026-calendar-precision-narrative-dates.md`, ADR-0028
- `src/narrative/model.ts`, `src/narrative/sentence-preservation.ts`,
  `src/narrative/progress.ts`, `src/App.tsx`

## Scope

1. Add `docs/design-principles.md`.
2. List the new document first among the authoritative documents in
   `AGENTS.md`.
3. Add ADR-0031 (`docs/adrs/0031-design-principles-constitution.md`) ratifying
   the document.
4. Remove the conflicting rules from ADR-0002, ADR-0005, ADR-0013, ADR-0014,
   ADR-0028, `docs/technical-design.md`, `docs/data-model-definition.md`,
   `docs/chapter-extraction.md`, `docs/chapter-extraction-checklists.md`,
   `docs/implementation-plan.md`, `docs/visual-testing.md` and
   `docs/design/phase-2-desktop-ui.md`, leaving one pointer line to the
   constitution where a removal would leave a gap.

## Out of scope

- Any code, schema, data, chapter JSON or What's new change.
- `docs/chapter-promotion-log.md` and landed task files (historical records).
- UI labels quoted in `docs/visual-testing.md` and
  `docs/design/phase-2-desktop-ui.md`, which change with the code.
- Fixing any listed conflict.
- Pushing or merging to master.

## Acceptance criteria

- The document states Maciej's six principles without changing their intent and
  uses "non-linear chapter" as the term for chapters out of story-time order.
- The document is Accepted; rules (a)–(g) are accepted rules, and a chapter's
  latest date is defined from real data-model fields.
- ADR-0031 is Accepted and short; no superseded rule remains in the ADRs or docs
  outside historical records, and the constitution lists only open code and data
  work.
- The Implications section cites files, sections and ADR decisions verified on
  master `fd81ca8` and invents nothing.
- The plan contains a one-sentence proposed What's new bullet, marked as
  proposed.

## Validation

```bash
python3 scripts/tasks.py check
npx prettier --check <changed Markdown>
npm run format:check
npm run lint
git diff --check
```

## Risks and decisions

- Code and data still differ from the constitution until the plan's steps land;
  the constitution's §5 lists the gaps.
- The What's new wording is proposed for the soft-ceiling release; it is not in
  `src/release-notes.ts`.

## Log

### 2026-11-16 (Europe/Warsaw)

- Created on master `fd81ca8` on local branch `bob-20261116-design-principles`
  in the `~/src/bobiverse-principles` worktree. Docs only.
- First commit `915ad34`: proposed document, AGENTS.md entry, this task.
- Maciej accepted the document. Finalised it as Accepted, folded in rules (a)–(g)
  and the chapter latest-date definition, and added ADR-0031. Then, per
  Maciej, removed the superseded rules from the ADRs and docs and shrank the
  constitution's implications to the open code and data work.
