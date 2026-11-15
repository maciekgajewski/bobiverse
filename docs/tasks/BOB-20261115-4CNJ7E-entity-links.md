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

Where the spec left a choice, the implementation takes these:

- **Fallback labels are keyed by text.** `preparedInlineLinkFallbackLabels` maps
  each prose value to its links' labels in order. When two writes share the exact
  text, the earliest write's names win; that write is never later than one a reader
  can see, so the name stays reader-safe.
- **`$defs/state` wording too.** The spec names the `$defs/description` text; the
  `$defs/state` text gets the same note, because location `state` and every
  `current_state` allow links. The optional schema `not` guard on fields without
  links is not added: the semantic layer already rejects markup in every such
  string, including books, assets and exception reasons.
- **What "fields without links" covers.** In a chapter file, every string except
  the top-level `summary` and `description`, `state` and `current_state` directly
  on an `introducing` or `updates` record (so survey observation text is covered).
  In the zero state, `description`, `state` and `current_state` on any record with
  an `id` allow links. The whole book catalogue and asset registry reject them. A
  lone `\` in such a field is not an escape and stays allowed.
- **A stray `]]` is malformed.** Only `[[` and `]]` are reserved, so a `]]` outside
  a link must be escaped.
- **Offsets** are zero-based character offsets in the decoded string, after JSON
  unescaping.
- **Self-links** compare with the `id` of an introduction or zero-state record and
  the `entity_id` of an update. A summary has no owner.
- **The summary opening-sentence date check** still runs on the raw text, labels
  included, so a date inside a label is still caught.
- **Sentence preservation default.** Without a resolver,
  `findSentencePreservationViolations` shows a bare `[[id]]` as its ID; the
  `narrative:validate` CLI always passes the name-as-of-chapter resolver.
- **Renderer last resort.** If a hidden bare link has no fallback (only when a
  caller passes none; the app always passes the prepared map), it shows the
  target ID rather than nothing.
- **e2e data.** No canonical data has links yet and chapter data is out of scope,
  so the e2e test rewrites Earth's zero-state `description` in the dev server's
  JSON module through a test-only `page.route`. The app then validates and
  renders it through the normal path.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on origin/master `01f1281` under the authorization above, on local
  branch `bob-20261115-4cnj7e-entity-links` in the `~/src/bobiverse-entitylinks`
  worktree. ADR-0029 added with this task file.
