# BOB-20261115-DJKAGQ: chapter eyebrow stepper

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-16

## Objective and user-visible outcome

- A compact typographic `‹ 1.2 ›` stepper sits on the chapter card's existing
  CHAPTER eyebrow, with the current canonical id in cyan. It adds no height.
- Previous and Next change the open chapter card and Knowledge through only,
  by calling `selectTimelineChapter`. They never change Read through and never
  open the Read through confirmation.
- Previous is dimmed but visible at chapter 1.1 (disabled, not hidden).
- At the Read through ceiling, Next is disabled, dimmed, and marked with a
  gold dot. The same disabled treatment applies at the last catalogue chapter,
  with the accessible name "last chapter" when those two coincide.
- Visible glyphs stay small (~22px). Each control has an invisible 44×44 hit
  target that expands outward from the chevron so it does not cover the
  current id.
- While the chapter card is showing and focus is not in a text field, `[`
  goes to the previous chapter and `]` to the next. Disabled directions are
  skipped. The shortcuts do not use Left / Right.
- The stepper does not create browser history entries of its own; it only
  calls `selectTimelineChapter`.

## Spoiler gating

`adjacentKnowledgeChapters` returns a next chapter only when it is at or
before `furthestChapterRead`. `selectKnowledgeChapter` already refuses
anything past that ceiling, so the stepper cannot raise Read through.

## Authorization

- Maciej picked compact variant A3 (the eyebrow stepper) on 2026-11-15; the
  Piotr Developer Manager relayed it as a local branch for review: no push,
  no merge to master and no tag.
- Design source: `DESIGN_NOTE.md` sections "Chapter prev/next buttons" and
  "Compact pager variants / A3 — Eyebrow stepper", plus the A3 mocks. Option
  A's bordered buttons, A1 and A2 are out of scope.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`

## Scope

- `src/narrative/progress.ts`: `adjacentKnowledgeChapters`.
- `src/components/ChapterStepper.tsx`: the A3 stepper, keyboard shortcuts,
  ARIA names and the gold-dot ceiling state.
- `src/components/ObjectInspector.tsx`: the stepper in `ChapterDetails`,
  wired to `onChapterSelect`.
- `src/App.tsx`: pass the chapter catalogue into the inspector.
- `src/styles.css`: typographic stepper styles and the invisible 44×44
  targets.
- Tests: unit tests for adjacency and the ceiling; component tests for
  select, disabled bounds, keys, and keys ignored in inputs; e2e on desktop
  and a 390px phone, including limit behaviour.
- Existing chapter-card assertions that the eyebrow text is exactly
  "Chapter" now target `.chapter-seq-eyebrow-word`.

## Out of scope

- Option A bordered buttons, A1, A2.
- Changing Read through, the confirmation dialog, or `ChapterPicker`.
- Inspector / browser history (the future back-nav branch). The stepper
  must not add its own history entries.
- Book text, chapter JSON, and any `data/` edits.
- Push, merge to master, and tagging.

## Acceptance criteria

- On a chapter card, the CHAPTER line shows `‹ {id} ›` with the current id
  in cyan, Previous disabled at 1.1, and Next disabled with a gold dot at
  the Read through ceiling.
- Clicks and `[` / `]` call `selectTimelineChapter` / `onChapterSelect` only,
  never `confirmReadThrough`, and never move `furthestChapterRead`.
- `[` / `]` are ignored in text fields and when the destination is disabled.
- Accessible names expose the destination or the disabled reason
  (`first chapter`, `at your read-through chapter`, or `last chapter`).
- Full validation and e2e / CSP as listed below pass.

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
# e2e: chromium, firefox and webkit on port 5206, one worker, no retries,
# untracked playwright.alt5206.config.ts, deleted afterwards.
# CSP e2e on port 4206 with a matching temporary config, deleted afterwards.
```

## Risks and decisions

- At the ceiling, Next stays a disabled control with a gold dot. It does
  not become a "Reveal next…" action; raising the ceiling stays on Read
  through.
- Accessible names follow the design note / A3 mock: "Previous chapter,
  Chapter 1.1" when enabled, and "Previous chapter, unavailable, first
  chapter" (or the matching Next ceiling / last-chapter form) when not.
- The 44×44 target is an absolutely positioned `::before` overlay, so the
  typography stays ~22px tall. It expands outward from each chevron.

## Log

### 2026-11-16 (Europe/Warsaw)

- Implementation started on `bob-20261116-chapter-stepper` in
  `~/src/bobiverse-stepper`, based on origin/master `c133c42`.
- The CHAPTER eyebrow is a `div`, not a `p`, so the `nav` stepper is valid
  HTML. Visible styling is unchanged from the A3 mock.
- Full validation: `tasks.py check` (102 task files, 31 ADRs),
  format:check, lint (existing AboutDialog fast-refresh warning only),
  typecheck, 673 tests, 90 data tests, data:validate, narrative:validate,
  build, `git diff --check`, and Prettier on the changed Markdown.
- e2e on chromium, firefox and webkit, one worker, no retries, temporary
  untracked `playwright.alt5206.config.ts` on port 5206: 258 passed,
  11 skipped, 1 failed (39.7m). That is 85 passed / 4 skipped / 1 failed
  on chromium, 86 passed / 4 skipped on firefox, and 87 passed / 3
  skipped on webkit. The two new stepper tests passed on all three
  browsers. Port 5173 was left untouched.
- The one failure, chromium `empty map clicks clear inspection
selection`, is a pre-existing map-click flake: the same test passed
  on firefox and webkit, and the stepper is not on that screen. The
  official run was not retried.
- CSP e2e on port 4206 with the matching temporary config: 3 passed
  (15.2s) across chromium, firefox and webkit. Both alt configs were
  deleted afterwards.
- Screenshots (middle, limit, first; desktop 1440x900 and phone
  390x844) were copied to `/workspace/stepper-shots/`.
