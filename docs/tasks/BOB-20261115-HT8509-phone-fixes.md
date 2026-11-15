# BOB-20261115-HT8509: phone fixes after the 0.9.0 LAN check (top bar, What's new sheet)

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-15

## Objective and user-visible outcome

Maciej checked LAN build `2384f2a` on his Android phone (Chrome, portrait) and
reported four problems, all fixed here:

1. **Top bar gone (regression).** After What's new, the map showed only the
   knowledge badge, Search and Home: no title bar and no **Menu**, so What's new
   and **What is this?** were unreachable. The top bar now always stays on
   screen.
2. **What's new sheet cut off.** The sheet ran under the browser's bottom bar
   and its last bullets could not be reached. It now fits the visible viewport
   (`dvh`, `vh` fallback), keeps the safe-area inset at the bottom and scrolls
   inside.
3. **Caption credits.** The Jeeves caption shows only "Jeeves" (a link to his
   card once he is reader-known, plain text before Chapter 1.13). The credits
   stay in the image's alt text and in About > Credits.
4. **"What is this?" in the notes** is a button that closes What's new and
   opens About.

## Root cause of the missing top bar

`body { min-height: 100vh }` (and the desktop `.app-shell { min-height: 100vh }`)
let the document grow taller than the visible page on Android Chrome: there
`100vh` is the _large_ viewport (address bar hidden), while the app shell is
`100svh` (address bar shown). The document was therefore scrollable by the
address bar's height (about 56px). Nothing in the app normally scrolls it (the
shell clips and the map takes every touch), but `2384f2a` added What's new,
which opens by itself for a returning reader as a bottom sheet whose body
scrolls. Scrolling that body past its end chained the scroll to the document,
which moved up by the address bar's height and took the 52px top bar off the
top of the screen. After closing the sheet nothing could scroll it back.
Desktop emulation could not show it because there `vh` equals `svh`; with an
extra-tall body standing in for the large viewport, a wheel scroll in the sheet
reproduces the report exactly (`scrollY` 56, top bar at -56px).

Fix: the root is the small viewport and never scrolls vertically (`html` is
`100svh` with `overflow-y: hidden`, `body` is `100%`, the shell is `100svh`
without the `100vh` minimum), the dialog body has `overscroll-behavior:
contain`, and App snaps any vertical document scroll back to the top.

## Authorization

- Maciej reported the issues on 2026-11-15 after the LAN check; the Piotr
  Developer Manager relayed them as one local branch for review: no push, no
  merge to master and no tag.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `BOB-20261115-M0MP2Y-release-readiness.md`

## Scope

- `src/styles.css`: root and shell heights, the compact About/What's new sheet
  (`max-height` in `dvh` with a `vh` fallback, safe-area bottom padding,
  contained scroll), the caption credit style removed.
- `src/App.tsx`: the document-scroll guard and What's new's "What is this?".
- `src/release-notes.ts`: highlights may contain an in-app link to About.
- `src/components/WhatsNewDialog.tsx`: caption without credits; linked
  highlights.
- Tests: component tests for the caption, the notes link and the scroll guard;
  `tests/e2e/phone.spec.ts` for the phone top bar, the Menu rows, the sheet's
  last bullet and the notes link at 390x844, 412x915 and 360x800.

## Out of scope

- Book text, `data/`, tags, the release itself.

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
# e2e: chromium, firefox and webkit on port 5204, one worker, no retries,
# untracked alt config, deleted afterwards.
npm run test:e2e:csp
```

## Manual test checklist (for Maciej, on the Android phone)

1. Open the LAN build as a returning reader (or run
   `localStorage.setItem("bobiverse.whats-new.last-seen", "0.8.0")` and reload).
   What's new opens as a bottom sheet.
2. Scroll the sheet to the end and keep swiping: the last bullet is fully
   visible above the browser's bottom bar, and the page behind does not move.
3. Close the sheet: the top bar with the title and **Menu** is still there.
4. The caption under Jeeves says only "Jeeves" (plain text before Chapter 1.13,
   a link to his card from then on).
5. In What's new, tap **What is this?** in the last bullet: What's new closes and
   About opens; closing About returns to the map with the top bar.
6. **Menu** shows **What's new** and **What is this?**.

## Risks and decisions

- The root no longer scrolls vertically anywhere. The app was already a fixed
  full-screen layout with a clipped shell; below the 320px minimum width the
  page still scrolls sideways.
- The Jeeves alt text already carried the full credit (painting, both likeness
  references and their licence), so it is unchanged; only the visible caption
  lost the credit line.

## Log

### 2026-11-15 (Europe/Warsaw)

- Reproduced against the deployed LAN build `2384f2a` in Playwright with an
  extra-tall body standing in for Android's large viewport; fixed as above.
