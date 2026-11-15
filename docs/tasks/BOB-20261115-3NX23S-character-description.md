# BOB-20261115-3NX23S: optional character `description` (who they are)

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

Characters can carry an optional `description`: a stable identity blurb of who
they are (about 300 characters as a guideline, not a hard limit). It may appear
on the introduction and on later updates. The latest description in effect at
the viewed chapter wins, with the same reader-order and story-time projection
and spoiler gating as `current_state`. `current_state` remains the latest
condition. Inline `[[kind:slug]]` links are allowed, and
`narrative:validate` checks them like other prose fields.

In the character inspector Overview, a **Description** block appears when the
projected entity has a description, rendered with the same inline-link
renderer as other prose. **Current state** stays in its existing row and is
not used as a fallback for Description. Canonical chapter data is unchanged
in this task, so the live corpus still has no character descriptions until a
later data branch authors them.

## Authorization

- Maciej approved option A from the Extractor's Medeiros report, relayed as
  this local branch: implement on `bob-20261115-character-description` for
  review; no push, no merge to master, and no tag.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `../data-model-definition.md`
- `../chapter-extraction.md`
- ADR-0028 (backdated updates and chapter-view latest state)
- ADR-0029 (inline entity links)
- `BOB-20261115-4CNJ7E-entity-links.md`

## Scope

- `data/schema/narrative-data-model.schema.json`: optional `description` on
  `$defs/character` and `character_update` (nullable on updates), using the
  shared `#/$defs/description` type. The schema `description` states the
  identity-blurb meaning and the ~300-character guideline (not a `maxLength`).
- Narrative model: existing `applyProperties` projection already carries any
  source field, including `description`, with spoiler gating. Schema
  diagnostics include the new field. Link validation already treats
  `description` on introductions and updates as a link-capable field.
- `ObjectInspector` already has a character Overview Description slot
  (`entity.description` via `prose()`). No fallback from `current_state`.
- Docs: `docs/data-model-definition.md`, `docs/chapter-extraction.md`,
  `docs/technical-design.md`. AGENTS.md has no entity-field catalogue to
  update.
- Tests: schema accept/reject, resolver latest-up-to-viewed-chapter and
  date-mode isolation, link validation, inspector rendering. The
  narrative-equivalence snapshot is checked and left unchanged if the format
  does not require a new field (no canonical data).

## Out of scope

- Book text, `/home/maciek`, and any change under `data/` except the schema
  file named above. No canonical chapter or zero-state authoring of
  descriptions.
- Push, merge to master, tags, deploy, port 5173, and other worktrees.

## Acceptance criteria

1. The schema accepts a nonempty character `description` on the intro and on
   updates, accepts a `null` update to clear it, and rejects an empty or
   non-string intro value. Lengths over 300 characters remain valid.
2. `generateNarrativeWorld` exposes the latest description written at or
   before the viewed chapter (chapter mode) and does not leak a later-dated
   update into an earlier Date-mode cutoff.
3. `narrative:validate` flags unknown or later-introduced targets in a
   character `description` and accepts links to already-visible entities.
4. The inspector shows Overview **Description** with inline links when the
   field is present, and keeps **Current state** in its existing row. The
   Description heading is omitted when the field is absent.
5. Docs state the who-vs-condition split, the guideline, link permission, and
   that the field may appear on intro and updates.
6. Full validation and both e2e suites (normal 3-browser on port 5207,
   CSP on 4207) pass. No `data/narrative` content changes.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
git diff --check
# prettier on changed Markdown
# e2e: untracked alt Playwright config, port 5207, 1 worker, no retries, then
# delete the untracked config. Do not use port 5173.
# CSP e2e: npm run test:e2e:csp (port 4207 / playwright.csp.config.ts as on
# master, or an untracked override if that config still uses another port).
```

## Documentation and generated artifacts

- Update the data-model character contract and the extraction rules the
  Extractor follows.
- Do not update the narrative-equivalence snapshot unless its format requires
  a new field.

## Known risks or unresolved decisions

- None. Canonical characters still have no `description`, so the inspector
  slot stays hidden in the current corpus until a later data task authors
  values. That is accepted for this branch.
