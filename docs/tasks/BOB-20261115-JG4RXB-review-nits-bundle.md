# BOB-20261115-JG4RXB: review nits from the 2026-11-15 landings

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

Small reviewer follow-ups to the tasks landed on 2026-11-14 and 2026-11-15
(inline entity links, the breadcrumb, the About caption, single-pass click
targets and read-through). Each item is a minimal change. No new behaviour beyond
the breadcrumb tooltip for an ellipsized parent crumb.

## Authorization

- The Piotr Developer Manager authorised this routine, in-design housekeeping task
  on 2026-11-15 (Europe/Warsaw) as a list of reviewer nits, in priority order, on a
  local branch for review; do not merge to master or deploy in this task.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `../adrs/0029-inline-entity-links.md`
- `BOB-20261115-4CNJ7E-entity-links.md`
- `BOB-20261115-6C60VA-breadcrumb-same-name.md`
- `BOB-20261114-ANZFK6-guppi-about-caption.md`
- `BOB-20261114-AYW3EN-info-panel-header.md`
- `BOB-20261114-WT522P-single-pass-click-targets.md`
- `BOB-20261114-CTS3FN-read-through-drives-view.md`
- `BOB-011-reader-progress-and-temporal-navigation.md`

## Scope

1. `NarrativeText` never shows a raw target ID.
2. Memoise the chapter synopsis entity map.
3. Zero-state prose allows links only in the ADR-0029 field table for its record's
   entity type.
4. The chapter summary opening-date check runs on display text.
5. Breadcrumb crumbs carry their full label as a tooltip, for an ellipsized parent.
6. The "permanent local backdrop" e2e test gets a 60 s timeout.
7. Correct the FSHPA9 test block comment.
8. About caption JSX built from the caption constants; the shared image credit
   moves to a neutral module.
9. Mark BOB-011 acceptance criterion 3 superseded by CTS3FN.
10. The click-target ring e2e test looks up its component ID instead of hardcoding
    it.

## Out of scope

- Any larger item from the reviews.

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

- Recorded as the items land.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on origin/master `824e7ca` under the authorization above, on local
  branch `bob-20261115-nits-bundle` in the `~/src/bobiverse-nitsbundle` worktree
  (`~/src/bobiverse-nits` already holds an older branch).
