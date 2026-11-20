# BOB-20261120-RQSMDX: view labels without "Knowledge through"

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-20

## Objective and user-visible outcome

Make the view labels follow the constitution (§5 item 8, §6 step 3; plan T6).
The world is built from everything up to Read through (hard ceiling), and the
selected chapter or date is only the soft ceiling, but the map badge ("Latest
known · Knowledge through Chapter X", "Universe in Y · Knowledge through
Chapter X") and the "Knowledge through" select still name the selected chapter
as the knowledge bound. The labels drop the "Knowledge through" wording and name
the soft ceiling instead.

## Authorization

- The Piotr Developer Manager relayed approval on 2026-11-20 (Europe/Warsaw) to
  start T6 under the approved constitution plan, after T5
  (BOB-20261120-73F83F) landed as `e7eb26d`.

## Binding references

- `../design-principles.md` §1, §2.5, §3.1, §5 item 8, §6 step 3
- `../adrs/0031-design-principles-constitution.md`
- `BOB-20261116-TB1C66-two-ceiling-projection.md` (follow-up for T6)
- `BOB-20261120-C3EY9W-read-through-knowledge.md` (interim badge risk)
- `BOB-20261120-73F83F-as-of-cards.md` (the card "as of …" wording)

## Scope

1. The map badge in `src/App.tsx` (`viewStatus` and the rendered badge with
   its chapter link) in chapter view and Date view.
2. The "Knowledge through" select label in `src/components/ProgressControls.tsx`
   (desktop dock and the phone's Timeline and progress panel).
3. The stale "Chapter view has no story-time cutoff (ADR-0028)" comment by the
   badge (chapter view's soft ceiling is the chapter's latest date, §3.1).
4. Tests that pin these labels, and the docs that quote them:
   `docs/visual-testing.md`, `docs/design/phase-2-desktop-ui.md`,
   `docs/technical-design.md`, `README.md`, constitution §5 item 8.

## Out of scope

- The card "as of …" line (T5), the Read through controls and their
  confirmation, the timeline track, "Pre-book zero state", the release notes
  (`src/release-notes.ts` is edited in the release change, `../release-process.md`).

## Decision

The manager's call on 2026-11-20 (Europe/Warsaw), from the options in the
blocked report; Maciej confirms it in the combined acceptance pass after T6:

- Badge, chapter view: "As of Chapter X", the chapter kept as a link to its card.
- Badge, Date view: "As of Y", the selected date in the app's date format.
- The select's visible and accessible label is "As of"; its options stay "Zero
  state" and "Chapter X". "Pre-book zero state" is unchanged.

## Acceptance criteria

- No reader-facing label or user-facing doc says "Knowledge through" (historical
  ADR and task text may keep it).
- The map badge and the top-bar status read "As of Chapter X" in chapter view
  (the badge's chapter a link) and "As of Y" in Date view, with no chapter link.
- The select is labelled "As of", visibly and accessibly.
- Pre-book zero state is unchanged.

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
git diff --check
```

Plus e2e on chromium, firefox and webkit (one worker, no retries) and the CSP
check, since reader-facing labels change.

## Documentation and generated artifacts

The docs listed in scope item 4.

## Known risks or unresolved decisions

- The Date-view badge no longer names or links a chapter; the Read through
  control stays visible. Maciej may revisit the wording in acceptance.
- The select still exists only in Chapter mode, as before.

## Log

### 2026-11-20 (Europe/Warsaw)

- Created on master `e7eb26d` on local branch `bob-20261120-ceiling-labels` in
  the `~/src/bobiverse-t6` worktree. Marked BOB-20261120-73F83F Done.
- Blocked before implementation (`bb3f99b`): the replacement wording was not
  specified. The manager decided it the same day (see Decision); status In
  progress.
- Implemented in `5052be9`. Full validation on `5052be9` passed:
  `tasks.py check`, format:check, lint, typecheck, test (64 files, 836
  tests), data:test, data:validate, narrative:validate, build and
  `git diff --check`; e2e with one worker and no retries on chromium (95
  passed, 4 skipped), firefox (95 passed, 4 skipped) and webkit (96 passed, 3
  skipped); the CSP check (3 passed).
- Awaiting manager review.
