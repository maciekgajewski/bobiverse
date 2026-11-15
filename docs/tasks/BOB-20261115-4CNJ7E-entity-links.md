# BOB-20261115-4CNJ7E: inline entity links in narrative prose

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

Narrative prose (descriptions, states and chapter summaries) can contain inline
links to other entities, written `[[kind:slug]]` or `[[kind:slug|label]]`. In the
inspector a link to an entity the current view shows is an inline button that opens
that entity's card, like a relationship link, so Back and Forward work. A link to
an entity the current view does not show is plain text. `narrative:validate`
rejects malformed links, unknown or later-introduced targets, self-links and link
markup in fields that do not allow it.

This task adds the code, validators, tests and docs. It does not add links to
chapter data; the Extractor does that later in a separate data branch.

## Authorization

- The Captain's request (Maciej, 2026-11-14 22:54 Europe/Warsaw): "Descriptions
  should be able to contain links to other entities." Relayed by the Piotr
  Developer Manager as Task D on 2026-11-15 (Europe/Warsaw), with the syntax spec
  (draft 1) confirmed by the manager as written, including the new ADR-0029 and
  normalising link markup before the sentence-preservation check. Authorised under
  the standing local-branch review process: implement on a branch for review; do
  not merge to master or deploy in this task.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `../data-model-definition.md`
- `../chapter-extraction.md` §Descriptions
- `../adrs/0029-inline-entity-links.md`
- `../adrs/0017-supplemental-mention-completeness.md` (prose is not structure)
- `../adrs/0028-backdated-updates.md` (the write's chapter, not its date, gates
  reveal)
- `BOB-20261113-JRV53G-sentence-preservation-check.md`

## Scope

1. `src/narrative/inline-links.ts`: the one parser shared by the validator, the
   renderer and the sentence-preservation normaliser, plus
   `inlineLinksToPlainText`.
2. `src/narrative/model.ts`: semantic validation of link markup, targets and
   fields in the zero state, chapters, books and assets; default-label fallback
   names precomputed in `prepareNarrativeCorpus`.
3. `src/narrative/sentence-preservation.ts` and `scripts/narrative-cli.ts`:
   compare display text; reject markup in exception reasons.
4. `src/components/NarrativeText.tsx` and `src/components/ObjectInspector.tsx`:
   render prose with inline entity buttons and spoiler gating.
5. Schema `$defs/description` wording; docs for the data model, extraction
   guidance and the inspector.
6. Unit, validator, component and e2e tests.

## Out of scope

- Adding links to chapter data under `data/narrative/`.
- Links in names, titles, aliases or survey observations.
- Search over prose.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
npx prettier --check <changed Markdown>
git diff --check
# e2e: chromium, firefox and webkit on port 5199, one worker, no retries,
# untracked playwright.alt5199.config.ts, deleted afterwards.
```

## Risks and decisions

- Recorded as the implementation lands.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on origin/master `01f1281` under the authorization above, on local
  branch `bob-20261115-4cnj7e-entity-links` in the `~/src/bobiverse-entitylinks`
  worktree. ADR-0029 added with this task file.
