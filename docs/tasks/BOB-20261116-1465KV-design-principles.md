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
release that ships the soft ceiling. Docs only: no reader-visible change.

## Authorization

- Relayed by the Piotr Developer Manager on 2026-11-16 (Europe/Warsaw): write
  `docs/design-principles.md` on a new branch, docs only, no code changes; bring
  it to the manager at a commit for review and Maciej; do not merge.
- Maciej's additions, relayed the same evening: frame the document as the
  constitution, list each superseded rule in the Implications section, and add a
  plan with a proposed What's new sentence. Do not change What's new code or data.

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

## Out of scope

- Any code, schema, data, chapter JSON or What's new change.
- Amending or superseding ADRs (a follow-up ADR is part of the document's plan).
- Fixing any listed conflict.
- Pushing or merging to master.

## Acceptance criteria

- The document states Maciej's six principles without changing their intent and
  uses "non-linear chapter" as the term for chapters out of story-time order.
- Edge rules (a)–(d) are marked as pending Maciej's confirmation.
- The Implications section cites files, sections and ADR decisions verified on
  master `fd81ca8` and invents nothing.
- The plan contains a one-sentence proposed What's new bullet, marked as
  proposed.

## Validation

```bash
python3 scripts/tasks.py check
npx prettier --check AGENTS.md docs/design-principles.md docs/tasks/BOB-20261116-1465KV-design-principles.md
git diff --check
```

## Risks and decisions

- The document is proposed until Maciej approves it. Code still follows the
  superseded ADRs until the plan's steps land.
- Edge rules (a)–(d) and the What's new wording await Maciej.

## Log

### 2026-11-16 (Europe/Warsaw)

- Created on master `fd81ca8` on local branch `bob-20261116-design-principles`
  in the `~/src/bobiverse-principles` worktree. Docs only.
