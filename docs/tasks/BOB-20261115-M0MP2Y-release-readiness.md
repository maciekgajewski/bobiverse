# BOB-20261115-M0MP2Y: release readiness (version, What's new, Jeeves art)

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-15

## Objective and user-visible outcome

Prepare the first public release, `v0.9.0`:

- **Version.** The app knows its version. A release build gets it from the
  Sysadmin's release script (`VITE_APP_VERSION`, `BOBIVERSE_COMMIT`); dev and LAN
  builds fall back to `git describe` (`0.9.0-dev+<sha>`), or to the
  `package.json` version, and never fail without git. About shows it at the end,
  in small muted text: "Version 0.9.0 (abc1234)". `package.json` is `0.9.0`.
- **What's new.** A dialog in About's frame and style lists the release notes
  from `src/release-notes.ts`, newest first, beside the approved Jeeves
  illustration. It opens from a **What's new** link next to **What is this?** on
  desktop and a **What's new** row just above **What is this?** in the phone
  menu. It opens by itself once for a returning reader whose last-seen notes are
  older than the newest entry, never on a first visit.
- **Jeeves.** `technology:jeeves` (introduced in Chapter 1.13) gets the approved
  head crop in his info-panel header, like GUPPI. The What's new caption's
  "Jeeves" opens his card only once he is reader-known; before that it is plain
  text, as About's "GUPPI" is.
- **Release process.** `docs/release-process.md` describes tags, release notes,
  the LAN check, Maciej's go and the Sysadmin's release script.

## Authorization

- Maciej requested release readiness on 2026-11-15; the Piotr Developer Manager
  relayed and authorised it as one local branch for review: no push, no merge to
  master and no tags (the manager creates and pushes the tag after approval).
- Maciej approved the final Jeeves art (v3b-3) and its credit text, supplied as
  `jeeves.webp`, `jeeves-head.webp` and `CREDITS.md`.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../release-process.md` (new)
- `BOB-20261114-KA0X30-about-dialog.md`
- `BOB-20261114-ANZFK6-guppi-about-caption.md`
- `BOB-20261114-AYW3EN-info-panel-header.md`
- `BOB-20261115-3FQXTN-about-credits.md`

## Scope

1. `src/version-resolution.ts` (pure resolution and the About label),
   `src/app-version.ts` (reads the values `vite.config.ts` defines),
   `vite.config.ts` (`define`), `package.json` version `0.9.0`.
2. About: the version line, and a Jeeves line in **Credits** with both likeness
   references.
3. `src/release-notes.ts`: the release notes, newest first, with the `v0.9.0`
   entry. **Maciej may edit this file directly**: change the wording, or add an
   entry at the top for each release. Keep it short and spoiler-free.
4. `src/whats-new.ts`: the auto-show rule and the last-seen record, stored as
   `bobiverse.whats-new.last-seen` (the newest notes version seen), so
   **Forget my progress** clears it.
5. `src/components/WhatsNewDialog.tsx` on a shared `InfoDialogFrame` extracted
   from `AboutDialog` (same markup, classes, focus trap and close behaviour);
   the desktop link, the menu row and the Jeeves caption link in `App.tsx`.
6. `public/assets/jeeves.webp` (150×200) and `jeeves-head.webp` (66×66), copied
   unchanged, and their credits appended to `public/assets/CREDITS.md`; Jeeves's
   header illustration in `src/narrative/header-illustration.ts`.
7. `docs/release-process.md` and a pointer from `development-process.md`.
8. Tests: unit (version resolution, auto-show, release notes, Jeeves header),
   component (What's new dialog, About version and credit, App auto-show, menu
   entry, desktop link, Jeeves gating, Forget), e2e (menu, desktop link,
   auto-show once). Existing e2e, CSP and performance seeds record the notes as
   seen, so the dialog does not cover the map in unrelated tests.

## Out of scope

- Creating or pushing tags, deploying, and the release script itself.
- Any change to narrative data.

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
# e2e: chromium, firefox and webkit on port 5203, one worker, no retries,
# untracked alt config, deleted afterwards.
npm run test:e2e:csp
env VITE_APP_VERSION=0.9.0 BOBIVERSE_COMMIT=<sha> npx vite build  # About shows it
```

## Manual test checklist (for Maciej, in a browser)

1. Open the site in a private window (first visit). What's new does **not** open
   by itself.
2. Desktop (at least 1200px wide): the top bar shows **What is this?** and
   **What's new**. Click **What's new**: the dialog shows "Version 0.9.0", the
   notes and the Jeeves picture with "Jeeves" and two reference links under it.
   Close it with the X, with Escape and by clicking outside; focus returns to the
   link each time.
3. Phone (or a narrow window): open **Menu**. **What's new** is just above
   **What is this?**. Tap it; the dialog opens as a bottom sheet with the picture
   above the notes. Close it; focus returns to **Menu**.
4. With **Read through** before Chapter 13, "Jeeves" in the caption is plain text.
   Set **Read through** to Chapter 13 or later, open What's new and tap "Jeeves":
   the dialog closes and Jeeves's info card opens, with his head in the header.
5. Open **What is this?**: the last line reads "Version 0.9.0 (…)" on the public
   release (on the LAN deploy, "Version 0.9.0-dev+…"). **Credits** has a Jeeves
   line with the Alan Light and Bruce Baker links.
6. Returning reader: in the browser console run
   `localStorage.setItem("bobiverse.whats-new.last-seen", "0.8.0")` and reload.
   What's new opens by itself; close it and reload: it stays closed.
7. **What is this?** → **Forget my progress** → **Forget progress**, then reload:
   this counts as a first visit again, so What's new does not open.

## Risks and decisions

- The last-seen record stores the newest **release-notes** version, not the
  build's version, so dev builds (`0.9.0-dev+…`) behave like the release.
- A reader with saved app state but no record (from before What's new existed) is
  a returning reader and sees the notes once.
- "Jeeves" stays visible as plain text before Chapter 13, as "GUPPI" does in
  About; only his card is withheld.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on origin/master `995523c` (CSP fix landed) on local branch
  `bob-20261115-release-readiness` in `~/src/bobiverse-release`.
- Implemented in `a0b00a2` (versioning and release docs) and `3b81256` (What's
  new, Jeeves art and the About version). The Jeeves files are byte-identical to
  the approved `~/jeeves-final/` copies.
- Validation on `3b81256`: tasks check, format:check, lint (one pre-existing
  fast-refresh warning in `AboutDialog.tsx`), typecheck, test (616 passed in 54
  files), data:test (90), data:validate, narrative:validate, build, prettier on
  the changed Markdown and `git diff --check` all passed. e2e on port 5203, one
  worker, no retries: chromium, firefox and webkit each 64 passed and 3 skipped;
  no known-flake reruns were needed. `npm run test:e2e:csp`: 3 passed.
- A local release build (`VITE_APP_VERSION=0.9.0 BOBIVERSE_COMMIT=3b81256…`)
  shows "Version 0.9.0 (3b81256)" at the end of About. Screenshots for visual
  acceptance (What's new at 1440×900 and 390×844, Jeeves's info header at both
  sizes, About with the version) were taken outside the repository.
