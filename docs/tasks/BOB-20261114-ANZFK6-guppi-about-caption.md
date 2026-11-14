# BOB-20261114-ANZFK6: GUPPI link in the About caption

Status: Ready
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-14

## Objective and user-visible outcome

The About ("What is this?") dialog's picture caption currently reads "Guppy, or
Admiral Ackbar". The Captain asked for it to name GUPPI correctly and to lead to
GUPPI's info card:

- The caption reads exactly "GUPPI, or Admiral Ackbar".
- When GUPPI is known at the reader's knowledge chapter, "GUPPI" is a link-styled
  control. Activating it closes the About dialog and selects GUPPI
  (`technology:guppi-interface`) as a fresh inspector root, exactly like a pick from
  **Browse objects**: the desktop inspector shows GUPPI's card and focus returns to
  the **What is this?** link; on compact layouts the detail sheet opens at half with
  focus on its X.
- "Admiral Ackbar" keeps its new-tab link to the source illustration.
- Spoiler rule: in the pre-book zero state, or at a knowledge chapter where GUPPI is
  not yet reader-visible (GUPPI is introduced in Chapter 1.2), "GUPPI" is plain text.
  There is no link, no button and no other way to open the card from the caption.

## Authorization

- The Captain's design decision of 2026-11-14 at 22:30 (Europe/Warsaw), relayed by
  Piotr Developer Manager: "the caption in the 'about' window should read 'GUPPI',
  not 'guppy', and be a link to info card for GUPPI". The manager specified
  "GUPPI, or Admiral Ackbar", GUPPI opening GUPPI's card, "Admiral Ackbar" keeping
  its source link, and the spoiler rule above. Authorised under the standing "deploy
  once ready" OK: separate branch, review, then deploy.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Section 11 (updated by this task) and the spoiler model
  in Section 12
- `BOB-20261114-KA0X30-about-dialog.md` (the About dialog and its credit)
- `../visual-testing.md` (manual checklist added by this task)

## Scope

1. `src/components/AboutDialog.tsx`: `ABOUT_IMAGE_CAPTION` becomes
   "GUPPI, or Admiral Ackbar"; a new `ABOUT_CAPTION_ENTITY_ID`
   (`technology:guppi-interface`); an optional `onOpenGuppi` prop. With the prop,
   "GUPPI" is a `<button type="button">` styled like the caption link (it opens a
   card rather than navigating, as the desktop **What is this?** control does);
   without it, "GUPPI" is plain text.
2. `src/App.tsx`: passes `onOpenGuppi` only when a knowledge chapter is selected and
   GUPPI is selectable in the projected world (`isSelectionEligibleForMap`, the same
   rule that keeps or clears any selection). The handler re-checks that rule, closes
   About and calls the existing `selectExternalObject` path.
3. `src/styles.css`: the caption button matches the caption link (inline, same
   colour, underline, hover and focus ring).
4. Tests: component tests for the dialog (plain text without the prop, the control
   and its callback with it, focus-trap order) and for the app (zero state and
   Chapter 1.1 stay plain text; Chapter 1.2 opens the card on desktop and in the
   compact sheet). E2E: zero state and Chapter 1.1 plain text, and Chapter 1.2 on
   desktop (1280×800) and compact (390×844). The shared About e2e helper expects the
   new caption.
5. Docs: technical design Section 11 and the visual-testing checklist.

## Out of scope

- The About image, its alt text and `public/assets/CREDITS.md` (unchanged).
- Any data, schema, projection or inspector-content change; GUPPI's own card content
  and any GUPPI illustration (BOB-20261114-AYW3EN).
- The read-through and info-panel changes from the same feedback round.

## Acceptance criteria

1. The figcaption text is exactly "GUPPI, or Admiral Ackbar" in every state.
2. At a knowledge chapter where GUPPI is reader-visible, "GUPPI" is a button named
   "GUPPI" inside the caption; activating it closes About and shows GUPPI's card
   (desktop inspector, or the compact sheet with focus on its X).
3. In zero state and at Chapter 1.1, the caption has no GUPPI button or link, and
   clicking the text leaves the dialog open and selects nothing.
4. "Admiral Ackbar" is still a new-tab link to
   <https://starwars.fandom.com/wiki/File:Ackbar-NEGTC.png>; the image, alt text and
   `public/assets/CREDITS.md` are unchanged.
5. The focus trap still cycles through every control, including "GUPPI" when shown.
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

Manual: the Captain's check on desktop and a phone after deployment (checklist in
`../visual-testing.md`).

## Risks and decisions

- **Which chapter decides "known".** The caption follows the projected world at the
  reader's view (knowledge) chapter, the same world the inspector and browser use, so
  the link appears exactly when GUPPI could be opened from **Browse objects**.
- **Button, not anchor.** "GUPPI" opens an in-app card, so it is a button styled as a
  link, consistent with the About trigger itself.
- **Focus after opening.** Desktop returns focus to **What is this?** (the dialog's
  trigger) while the inspector updates in place; compact follows the sheet's normal
  rule and focuses its X.

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on origin/master `5c2d9d7` under the authorization above, on local branch
  `bob-20261114-anzfk6-guppi-about-caption` in the `~/src/bobiverse-guppicap`
  worktree.
