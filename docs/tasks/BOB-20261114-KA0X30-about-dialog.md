# BOB-20261114-KA0X30: About ("What is this?") dialog

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-14

## Objective and user-visible outcome

A first-time visitor has no way to learn what the app is for or how to use it. This
task adds a small **What is this?** control that opens an About dialog with the
Captain's own description and usage notes, contact and source links, and a credited
Admiral Ackbar illustration.

- Desktop (≥ 1200px): a muted **What is this?** text link right after "Star Map" in
  the top bar opens a centred 520px modal, picture on the left and text on the right.
- Phone (< 1200px, Variant A): **What is this?** is the last, visually quieter row of
  the menu drawer. It opens a bottom sheet with the picture above the text; on short
  landscape screens the picture (108×144) sits beside the text.
- Close (44×44), Escape and a backdrop click close the dialog. Focus moves to Close on
  open, stays inside the dialog, and returns to the desktop link or the Menu button.

## Authorization

- The Captain approved the design on 2026-11-13 at 22:12 CET: "Approve the About
  window design". Relayed by Piotr Developer Manager.
- The Captain chose the picture (candidate #3) and accepted fair use on 2026-11-13:
  "Can you get the image yourself? It's fair use, just find something on the web",
  then "Use Ackbar #3", then "Just make sure it is credited correctly". This
  supersedes the design note's "no Star Wars art" placeholder frame for this one
  image. Piotr Developer Manager supplied the credit text from the source page.
- The body text was provided by the Captain on 2026-11-14 (typos fixed by Piotr
  Developer Manager) and is used verbatim.
- The design (spec and mockups) was produced by Bobiverse UI Designer outside the
  repository ("About dialog" section of its design note, chrome as built in PR #21).

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Sections 10, 11 and 14 (10 and 11 updated by this task)
- `../design/phase-2-desktop-ui.md`, Section 5 (updated by this task)
- `BOB-20261113-3VCGFP-mobile-map-chrome.md` (Variant A top bar and menu drawer)

## Scope

1. `src/components/AboutDialog.tsx`: the dialog (`role="dialog"`, `aria-modal`,
   `aria-labelledby="about-title"`), rendered in a portal on `document.body`, with
   the Close button, Escape and backdrop handling and a Tab/Shift+Tab focus trap.
   The body copy lives in one `AboutCopy` component; the numbered list is an `<ol>`.
   External links open in a new tab with `rel="noopener noreferrer"`; the contact
   address is a `mailto:` link.
2. `src/App.tsx`: the desktop `.about-link` after the breadcrumb in `.topbar-title`
   (hidden below 1200px) and the compact `.menu-about` row as the last menu item. The
   menu closes when About opens. The app shell is `inert` while the dialog is open.
   On close, focus returns to the desktop link, or to the Menu button on compact
   layouts (consistent with every compact panel).
3. `src/styles.css`: link, menu row, backdrop, dialog, Close, body, figure and copy
   rules, plus the compact bottom sheet and the short-landscape layout, using the
   existing Variant A tokens.
4. `public/assets/ackbar.webp`: the source illustration cropped to the head and upper
   body (3:4), resized to 150×200 and encoded as WebP (about 8 KB), alt text
   "Admiral Ackbar". Caption, verbatim: "Admiral Ackbar illustration by Michael
   Sutfin, from The New Essential Guide to Characters. Star Wars © Lucasfilm Ltd.
   Used under fair use."
5. `public/assets/CREDITS.md`: the same credit, the source URL
   <https://starwars.fandom.com/wiki/File:Ackbar-NEGTC.png> and a note that the asset
   is a cropped, resized derivative.
6. Tests: component tests for the dialog (copy, links, image, caption, Close, Escape,
   backdrop, focus trap) and for both entry points with focus return; e2e tests for
   the desktop link and the compact menu at 390×844 and 844×390. The existing desktop
   chrome e2e test now expects exactly one top-bar button, **What is this?**.

## Out of scope

- Any other copy, data, spoiler, projection or 3D change.
- Assistant characters (Section 11 still requires original artwork for them).
- The full-size source image; only the small derivative is committed.

## Acceptance criteria

1. At ≥ 1200px **What is this?** is visible after "Star Map" and opens the dialog;
   below 1200px it is absent from the bar and is the last menu row, at least 44px
   tall.
2. The dialog shows the Captain's text verbatim, with the three links: "Dennis E.
   Taylor" (`http://dennisetaylor.org/status-of-things/`, new tab),
   "maciek@bobiverse.space" (`mailto:`) and "github.com/maciekgajewski/bobiverse"
   (`https://github.com/maciekgajewski/bobiverse`, new tab). No placeholder text
   remains.
3. The picture loads with alt text "Admiral Ackbar" and the exact caption above.
4. Close, Escape and a backdrop click each close it; focus starts on Close, is
   contained while open and returns to the trigger (the Menu button on compact).
5. Layout: centred 520px modal on desktop, full-width bottom sheet on phone portrait,
   side-by-side 108×144 picture on phone landscape, always inside the viewport.
6. All validation commands below pass.

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
npx playwright test --project=chromium
npx playwright test --project=firefox   # via xvfb-run, as npm run test:e2e does
npx playwright test --project=webkit
npx prettier --check <changed Markdown>
git diff --check
```

Manual: the Captain's visual check on desktop and a phone after deployment.

## Risks and decisions

- **Third-party art in a public repository.** Section 11 of the technical design
  forbids an Admiral Ackbar likeness for assistant characters, and Section 14 asks
  for an intellectual-property review before a public release. The Captain approved
  this picture as fair use; Section 11 now records it as a separate decorative
  exception, and the credit is shown in the dialog and in `public/assets/CREDITS.md`.
- **Design note superseded.** The design note specified placeholder copy and a dashed
  placeholder frame with no Star Wars art; the Captain's later text and picture
  replace both. The frame keeps the 150×200 (108×144 landscape) size.
- **Link semantics.** The desktop "link" is a `<button>` styled as a link, because it
  opens a dialog rather than navigating.
- **Focus return on compact.** The design allowed either keeping the menu open or
  closing it; this task closes the menu and returns focus to the Menu button, as the
  mockup does.

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on master `c825272` under the approvals above; moved straight to In
  progress.
- Implemented scope items 1 to 6 on a local branch (no PR, per the local review
  flow). The focus trap filters focusable elements in document order, because
  jsdom's selector engine returns a selector list grouped by selector.
- Validation: `python3 scripts/tasks.py check`, `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm run test` (415 passed),
  `npm run data:test`, `npm run data:validate`, `npm run narrative:validate` and
  `npm run build` all passed, as did `git diff --check` and `npx prettier --check`
  on the changed Markdown.
- E2E on a spare dev-server port, one worker, no retries: chromium, firefox and
  webkit each passed 38/38. No icon-specimen PNG was rewritten.
- Screenshots of the open dialog at 1280×800, 390×844 and 844×390 were taken for
  review outside the repository.
- Remains In progress until review, merge and the Captain's visual check after
  deployment.
