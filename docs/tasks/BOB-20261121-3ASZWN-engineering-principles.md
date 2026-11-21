# BOB-20261121-3ASZWN: engineering principles (how we build)

Status: Done
Phase: process (contributor and agent docs)
Last updated: 2026-11-21

## Objective and user-visible outcome

Add `docs/engineering-principles.md`: Maciej's engineering principles for how
we build, kept short, paraphrased in our own words, with a link to the source.
`docs/design-principles.md` remains the product constitution; the new document
does not override it. Link the new document from the contributor and agent docs
wherever `docs/design-principles.md` is linked. Docs only: no reader-visible
change.

## Authorization

- The Piotr Developer Manager relayed approval on 2026-11-21 (Europe/Warsaw)
  to add `docs/engineering-principles.md`, link it from the contributor and
  agent docs, and land it under the standing LAN OK. Docs only.

## Binding references

- `../design-principles.md`
- `../../AGENTS.md`
- Source: <https://github.com/cursor/plugins/tree/main/pstack/skills>
  (`principle-*` skills)

## Scope

1. Add `docs/engineering-principles.md`.
2. Link it from the contributor and agent docs wherever
   `docs/design-principles.md` is linked.
3. Mark BOB-20261120-RQSMDX Done in a separate commit (already landed as
   `1cce5d4`).

## Out of scope

- Any code, schema, data, chapter JSON or ADR change.
- Changes to `docs/design-principles.md`.
- Marking this task Done before merge.
- Deploy and a production tag.

## Acceptance criteria

- The document states the eleven principles in one or two lines each, in our
  own words, and links the source.
- It states that `docs/design-principles.md` is the product constitution and
  that this document is about how we build.
- Contributor and agent docs that point at `docs/design-principles.md` also
  point at the new document.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
git diff --check
```

## Documentation and generated artifacts

`docs/engineering-principles.md` and the links listed in scope.

## Known risks or unresolved decisions

- None. The wording is a paraphrase; the source skills remain the external
  reference.

## Log

### 2026-11-21 (Europe/Warsaw)

- Created on master `1cce5d4` on local branch
  `bob-20261121-engineering-principles` in the
  `~/src/bobiverse-engprinciples` worktree. Docs only.
- Marked BOB-20261120-RQSMDX Done in a separate commit.
- Approved by the manager at `02b30a3` and landed on master with the no-ff
  merge `dfc87c4` ("Merge engineering principles doc"). Done. Landed as
  `dfc87c4`.
