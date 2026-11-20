# BOB-20261120-RQSMDX: view labels without "Knowledge through"

Status: Blocked
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

## Acceptance criteria

- No reader-facing label says "Knowledge through".
- The badge names the soft ceiling: the selected chapter in chapter view and
  the selected date in Date view, with the chapter link kept.
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

- **Blocked on wording.** The constitution says only that view labels "drop
  'Knowledge through' wording" (§6 step 3); it gives no replacement for the
  badge or the select, and no UI Designer spec exists. Dropping the suffix alone
  would leave the chapter-view badge as a bare "Latest known", which no longer
  holds either: chapter view now cuts at the chapter's latest date (§3.1). The
  select needs a new visible and accessible label. Options are recorded in the
  report to the manager; the wording waits for a decision.

## Log

### 2026-11-20 (Europe/Warsaw)

- Created on master `e7eb26d` on local branch `bob-20261120-ceiling-labels` in
  the `~/src/bobiverse-t6` worktree. Marked BOB-20261120-73F83F Done.
- Blocked before implementation: the replacement wording is not specified.
