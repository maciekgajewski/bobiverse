# BOB-20261116-35B47D: chapter titles in the UI

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-16

## Objective and user-visible outcome

Book 2 chapters have source titles (book 1 has titles only on 1.1 and 1.2).
Wherever a chapter is shown, a read chapter now names its title:

- the map's Latest-known badge and an entity card's Active / Last active line
  (`ChapterLink`): `Chapter 2.3 · Title`, clamped to one line with an
  ellipsis and the full reference as the tooltip and accessible name;
- the chapter card's stepper: previous and next controls name the title in
  their accessible name and tooltip (the CHAPTER line keeps the number; the
  card heading right under it already shows the stored title in full);
- the Knowledge through and desktop Read through selectors: `Chapter 2.3 ·
Title` (long titles shortened to 40 characters with an ellipsis, full text
  in the option tooltip);
- the Read through picker grid: number cells; a titled read chapter gets the
  title as the cell tooltip (its accessible description), while the
  accessible name stays `Book N · Chapter M`;
- the timeline track: book 1 keeps its existing label (`3`, or the stored
  `1 - Bob Version 1.0`); later books show the full reference
  (`2.1 — Title`, or `2.5` untitled) so an entry stays unambiguous when the
  `Book N` divider has scrolled away. Titled labels ellipsize at 12rem with
  the full label as the tooltip, and each divider has the book title (from
  `books.json`) as its tooltip;
- elsewhere a chapter is already named in full (`Chapter 2.1`, `2.1` in the
  stepper, `Book 2 · Chapter 1` in the Read through selector, `2 · Ch 1` on
  the top-bar chip); the picker's number cells stay inside their book tab.

Untitled chapters (the bare number) render exactly as before. What's new has
no chapter references, so it is unchanged.

## Data contract (unchanged)

The required chapter `title` keeps its extraction form from
`docs/chapter-extraction.md` §Inputs: the bare local number (`3`) for an
untitled chapter, `N - Source title` for a titled one. No schema or data
change. The pure helper `chapterDisplayTitle` (in
`src/narrative/progress.ts`) strips the leading `<number> - ` prefix (also
`–`, `—`, `:`); a bare number, or text equal to the chapter number, means
untitled. Other text is used as is. 1.1 and 1.2 therefore show "Bob Version
1.0" and "Bob Version 2.0" in the new places; the manager approved this on
2026-11-16.

## Spoiler gating

A title is chapter content. `visibleChapterTitle` returns a title only for a
chapter at or before Read through (`furthestChapterRead`); with no Read
through, or for a later chapter, every control, label, tooltip, and
accessible name keeps the number-only form. The selectors list later chapters
(Read through options, picker cells) number-only. The confirmation dialog for
a pending Read through names only the number.

## Authorization

- Maciej asked, relayed by the Piotr Developer Manager on 2026-11-16, for
  the UI to handle book 2 chapter titles, on a local branch for review.
- The manager confirmed the derive-from-existing-title plan (no new field)
  and showing 1.1 and 1.2 titles.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md` §12
- `../chapter-extraction.md` §Inputs
- `BOB-20261115-DJKAGQ` (chapter stepper), `BOB-20261115-446D62` (chapter
  links)

## Scope

- `src/narrative/progress.ts`: `chapterDisplayTitle`, `visibleChapterTitle`,
  `chapterReferenceLabel`, `truncateChapterTitle`.
- `ChapterLink` (an optional `chapters` prop from `App` and the inspector),
  `ChapterStepper`, `ChapterPicker`, `ProgressControls`, `TimelineDock`,
  styles.
- Book 2 ordering is checked with fixtures: numeric sort (2.10 after 2.9),
  stepping from 1.61 to 2.1, the Read through clamp, and timeline / picker
  grouping by book.
- Docs: `docs/technical-design.md` §12.

## Out of scope

- `data/` (including `books.json`) and the extraction preflight /
  predecessor logic: the separate book 2 preflight branch
  (`bob-20261116-book2-preflight`) owns them. Real book 2 chapters also need
  that branch's book 2 catalogue entry before the runtime can load them.
- Push, merge, tags, deploy, port 5173, and other worktrees.

## Acceptance criteria

1. `chapterDisplayTitle` strips `N - `, treats a bare number as untitled,
   and leaves the existing timeline label unchanged.
2. No title for a chapter after Read through appears in the DOM (text,
   `title` attributes, or accessible names), in component tests and in e2e.
3. Book 2 fixture chapters (1.60, 1.61, 2.1, 2.2, 2.9, 2.10) sort, step,
   clamp, and group correctly.
4. At 390x844 a long fixture title stays on one line with an ellipsis in the
   Latest-known badge (two badge lines at most) and never widens the card or
   the page; the full title is in the tooltip and the card heading.
5. Untitled chapters render as before; existing book 1 e2e expectations hold.
6. Full validation, 3-browser e2e, and CSP e2e pass.

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
# e2e: untracked alt Playwright config, port 5210, 1 worker, no retries,
# chromium, firefox, webkit; then delete the untracked config. Never 5173.
# CSP e2e: playwright.csp.config.ts (port 4202) or an untracked override on
# 4210.
```

`tests/e2e/chapter-titles.spec.ts` rewrites the dev server's 1.60 and 1.61
chapter modules in flight with fixture titles; set
`CHAPTER_TITLE_SHOTS_DIR` to save review screenshots outside the repository.

## Known risks or unresolved decisions

- The top-bar view status (desktop) stays number-only; the map badge below
  it names the title. One atlas e2e that compared the two now expects the
  badge suffix ` · Bob Version 2.0`.
- Component fixtures that used words as titles for book 1 chapters now use
  the bare number (the real untitled form); two App tests now expect the 1.1
  title in the picker and stepper.
