# BOB-20261115-E8GXGA: Align data-model docs with the single-star rule

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; guided system view)
Last updated: 2026-11-15

## Objective and user-visible outcome

The Extractor's `chapters/single-star-rule` commit (`0064182`) records the
standing rule in the chapter-extraction contract and skill: a single-star
system is one `star_system` location with no separate `star` entity, so
planets and belts orbit the system directly, and Sol is the permanent
exception. This branch, stacked on that docs head, updates the data-model
and technical-design wording that still said a single-star system _may_
omit the star. No `data/` or chapter JSON changes.

## Authorization

- Relayed on 2026-11-15 (Europe/Warsaw): build a local-only docs follow-up
  on the Extractor's approved `chapters/single-star-rule` head
  `0064182ef71d69ffdf8ea9c2c96a687644f1cfe6` (base `38bbb1f`). Do not push
  or merge to master. Do not edit `data/` or chapter JSON. Do not touch
  port 5173 or other worktrees.

## Binding references

- `../../AGENTS.md`
- `../chapter-extraction.md`, §Star systems (`0064182`)
- `.codex/skills/extract-bobiverse-chapter/SKILL.md` (`0064182`)
- `../data-model-definition.md` (zero-state and shared semantic parent
  tables)
- `../technical-design.md`, Section 9.2
- `BOB-20261115-BC2AEZ-star-merge-code.md` (landed the merge and the earlier
  "may omit" wording)

## Scope

1. Replace the "may omit" / "may orbit" wording in
   `docs/data-model-definition.md` (zero-state table note and semantic
   parent table note) and `docs/technical-design.md` §9.2 with the standing
   rule, consistent with the Extractor's wording on `0064182`.
2. Grep the docs for other "may omit" or "planets orbit a star" phrasing
   that now contradicts the rule. Update live specification docs; leave
   historical landed task files unchanged.

## Out of scope

- Any change under `data/` or to chapter JSON.
- Changing the Extractor's `chapter-extraction.md` or skill text.
- Editing landed task files (including BOB-20261115-BC2AEZ and
  BOB-20261115-MKP51F).
- Pushing or merging to master.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npx prettier --check <changed Markdown>
git diff --check
```

## Risks and decisions

- **Stacked on the Extractor docs head, not on a moving master.** Another
  landing was in flight in the main clone; this worktree must not touch
  master or other worktrees.
- **Historical task text stays historical.** BOB-20261115-MKP51F still
  cites "planets orbit the star, not the system" as a binding reference to
  the pre-merge model, and BOB-20261115-BC2AEZ's objective still says
  planets _may_ orbit the system. Those are landed records, not the live
  specification.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on Extractor `chapters/single-star-rule` `0064182` (parent
  `38bbb1f`) under the authorization above, on local branch
  `bob-20261115-single-star-rule-docs` in the `~/src/bobiverse-ssrule`
  worktree.
- Replaced the "may omit" wording in `data-model-definition.md` and
  `technical-design.md` §9.2. Live specification docs no longer say a
  single-star system may omit the star. Left landed task files unchanged.
- Validation: `scripts/tasks.py check` (93 task files, 31 ADRs),
  `format:check`, Prettier on the changed Markdown, and `git diff --check`
  all passed.
