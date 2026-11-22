# BOB-20261122-9QM6T9: record the 15 Nov passing-mention rule in ADR-0017

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-11-22

## Objective and user-visible outcome

ADR-0017 and the extraction, data-model, and technical-design docs still said
that every source-supported reference to an already-visible entity needs a
supplemental mention. Maciej's 15 Nov 2026 rule is that references in passing
do not become mentions. This task records that rule as a short amendment to
ADR-0017 and qualifies the parallel completeness sentences in place, so the
docs agree. No reader-visible change; no code or data changes.

## Authorization

The Piotr Developer Manager authorised this docs-only amendment on 22 Nov 2026
(Europe/Warsaw): add a short amendment to ADR-0017 and a matching note in
`docs/chapter-extraction.md` stating that the 15 Nov 2026 rule governs passing
and bare-list references.

After the rule was found to be recorded only in chat, not in the repository, the
manager directed the citation form at 17:36 (Europe/Warsaw) on 22 Nov 2026: use
the date (15 Nov 2026), Maciej's verbatim sentence ("Skip mentions \"in
passing\"."), and the context (his answer on the 1.40 Medeiros mention), and
say it was relayed by the manager. The amendment itself is the in-repo record.
Also apply the same minimal qualifier to the parallel sentences in
`docs/data-model-definition.md` and `docs/technical-design.md`. No behaviour,
code, or data changes. Do not edit `docs/design-principles.md`.

The manager approved reviewed head
`56adadd6071ae6204c4851f4d8d649ab6039a9af` at 17:49 (Europe/Warsaw) on
2026-11-22, agreed that no constitution clause is needed, and gave the go
to land. Do not edit `docs/design-principles.md`.

## Binding references

- `../adrs/0017-supplemental-mention-completeness.md`
- `../chapter-extraction.md` (§Supplemental mentions)
- `../data-model-definition.md`
- `../technical-design.md`
- `../design-principles.md` (constitution; not edited)
- `../adrs/0031-design-principles-constitution.md`

## Scope

1. Qualify the ADR-0017 Decision sentence in place so a reference only in
   passing, or in a bare list, does not become a supplemental mention, and so
   that rule governs over the "no importance or curation threshold" wording for
   those references.
2. Add a dated Amendment (2026-11-22) to ADR-0017 citing the 15 Nov 2026 rule
   as directed in Authorization.
3. Apply the same minimal qualifier to `docs/chapter-extraction.md`
   §Supplemental mentions, and to the parallel sentences in
   `docs/data-model-definition.md` and `docs/technical-design.md`.

## Out of scope

- Code, tests, schema, or `data/` changes.
- Editing `docs/design-principles.md`.
- Landing or pushing the branch.
- Touching `~/src/bobiverse`, `~/extraction-scratch`, or source-text.

## Acceptance criteria

- ADR-0017's Decision and the three live specification docs no longer require
  a supplemental mention for a reference only in passing or in a bare list.
- ADR-0017 has a 2026-11-22 amendment that records Maciej's 15 Nov 2026
  verbatim sentence, the 1.40 Medeiros context, and that the manager relayed
  it.
- No code, schema, or data files change.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run narrative:validate
npx prettier --check <changed Markdown>
git diff --check
```

Lint, unit tests, and e2e are not required: this is docs-only, and no script
parses ADR body text (`scripts/tasks.py check` only verifies ADR filenames).

## Documentation and generated artifacts

The four specification files in Scope, plus this task file. No generated
artifacts.

## Known risks or unresolved decisions

`docs/design-principles.md` has no principle that clearly governs which source
references become mentions, as opposed to when already-recorded facts are
shown. The amendment therefore does not claim a constitutional derivation, and
the constitution is not edited.

## Log

### 2026-11-22 (Europe/Warsaw)

- Created on origin/master `a247d7d` on local branch
  `bob-20261122-adr17-passing` in the `~/src/bobiverse-adr17` worktree, under
  the authorization above.

- Qualified the ADR-0017 Decision in place, added the 2026-11-22 amendment
  citing Maciej's 15 Nov 2026 verbatim ruling on the 1.40 Medeiros mention
  (relayed by the manager), and applied the same qualifier in
  `docs/chapter-extraction.md`, `docs/data-model-definition.md`, and
  `docs/technical-design.md`. Did not edit `docs/design-principles.md`: no
  constitution principle clearly governs which source references become
  mentions.

- Fast checks on this branch, 2026-11-22 17:48 (Europe/Warsaw):
  `python3 scripts/tasks.py check` (122 task files, 34 ADRs),
  `format:check`, `narrative:validate` (71 chapters, 4 candidates),
  Prettier on the Markdown files that were already Prettier-clean on origin
  (ADR-0017, the data model, and this task file), and `git diff --check`
  all passed. `docs/chapter-extraction.md` and `docs/technical-design.md`
  already fail Prettier on origin and were not reformatted. No lint, unit
  tests, or e2e (docs-only; `scripts/tasks.py check` only verifies ADR
  filenames). Not landed or pushed.

- The manager approved reviewed head
  `56adadd6071ae6204c4851f4d8d649ab6039a9af` at 17:49 (Europe/Warsaw) on
  2026-11-22, and agreed that no constitution clause is needed. Status set
  to Done in this docs-only recording commit; landing follows.
