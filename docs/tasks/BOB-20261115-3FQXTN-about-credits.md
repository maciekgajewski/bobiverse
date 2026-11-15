# BOB-20261115-3FQXTN: About Credits, Privacy and forget progress

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

The About (**What is this?**) dialog keeps Maciej's existing copy verbatim and
gains a compact **Credits** section and a **Privacy** section. Credits cover
the NASA SVS 4851 starfield, every distinct catalogue acknowledgement in
`src/data/nearby-systems.json` (derived at run time so they cannot drift), the
bundled Noto Sans OFL notice, and the GUPPI / Admiral Ackbar illustration
already credited in the dialog and in `public/assets/CREDITS.md`. Privacy
states only claims verified against the source and the production bundle.
**Forget my progress** clears the app's localStorage keys after a confirmation
step and resets the in-memory reader state.

## Authorization

- Relayed by the Piotr Developer Manager on 2026-11-15 (Europe/Warsaw), from
  Maciej: implement on a local branch from origin/master; do not push or merge
  to master. Do not edit `data/` or chapter JSON. Do not touch port 5173 or
  other worktrees (a landing was in flight in the main clone).

## Binding references

- `../../AGENTS.md`
- `../visual-testing.md`
- `../../src/domain/galactic-starfield.ts`
- `../../src/data/nearby-systems.json`
- `../../public/assets/CREDITS.md`
- `../../src/assets/fonts/OFL.txt`
- `BOB-20261114-KA0X30-about-dialog.md` and
  `BOB-20261114-ANZFK6-guppi-about-caption.md`
- `BOB-20261115-7FQJCG-search-pill.md` (mark Done: visually accepted 2026-11-15;
  landed `01f1281`)

## Scope

1. Mark `BOB-20261115-7FQJCG` Done with the accepted/landed log line. If the
   done-marking landing adds a log line first, merge origin/master later and
   resolve the expected trivial conflict.
2. Add Credits and Privacy to the About dialog without changing Maciej's
   verbatim copy. Layout must work on phone and desktop.
3. Verify every privacy claim against `src/`, `index.html` and the built
   `dist/` before writing it. Add **Forget my progress** with confirmation if
   clearing the app's own keys is straightforward.
4. Component tests, cheap e2e, and the visual-testing checklist.

## Out of scope

- Any change under `data/` or to chapter JSON.
- Pushing or merging to master.
- Rewriting icon-specimen PNGs.

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
# e2e: chromium, firefox and webkit on port 5202 (5201 is taken by
# piotr-voice-hub), one worker, no retries, untracked
# playwright.alt5202.config.ts, deleted afterwards.
```

## Risks and decisions

- **Worktree path and port.** `~/src/bobiverse-about` already holds the
  landed KA0X30 About-dialog worktree, and port 5201 is bound by
  `piotr-voice-hub`. This task uses `~/src/bobiverse-aboutcredits` and port 5202.
- **Privacy claims are evidence-backed.** If a claim does not hold in the
  bundle, it is omitted, not softened into something false.
- **OFL notice.** The bundled licence requires the copyright and OFL text to
  ship with the fonts (`src/assets/fonts/OFL.txt`). It does not require an
  in-app About credit; the Credits line is a concise user-visible
  attribution and a link to the licence.
- **Maciej's About copy stays pinned.** Credits and Privacy sit outside
  `.about-copy`. Existing verbatim and link tests are scoped to that copy.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created from origin/master `38bbb1f` on local branch
  `bob-20261115-about-credits` in `~/src/bobiverse-aboutcredits`.

- Privacy copy is short and friendly, as Maciej asked: "No cookies or
  tracking. Your reading progress and app preferences stay in this
  browser." Claims verified against `src/`, `index.html` and `dist/`.
  The third-party-request claim was omitted: `MapScene` uses
  `@react-three/drei` `Text`, and the production bundle includes
  troika's unicode-font-resolver with default base
  `https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data`
  plus `XMLHttpRequest` font loading, so that claim would be false.
  Web-server and IP-address logging are not mentioned.
- **Forget my progress** clears every `localStorage` key with the
  `bobiverse.` prefix (`APP_STORAGE_PREFIX`) after confirmation, so a
  later last-seen-version key will be cleared without a hardcoded list.
  Persisting default progress still removes only the app-state keys.
- Publication-readiness notes in `docs/implementation-plan.md` (Phase 5
  and the Phase 1A Safari gap) and the standing section of
  `docs/visual-testing.md` now record: iPhone Safari verified working by
  Maciej, 2026-11-15; desktop Safari still unverified.
- Full validation on this tree (base `38bbb1f`), 2026-11-15 10:46
  Europe/Warsaw: `tasks check` 93 files and 31 ADRs; format:check;
  lint 0 errors, 1 pre-existing react-refresh warning; typecheck;
  `npm test` 48 files, 565 tests passed; `data:test` 90; data:validate
  277 systems; narrative:validate zero state and 61 chapters; build OK;
  prettier; `git diff --check`.
- Full e2e on port 5202 (5201 is `piotr-voice-hub`), untracked
  `playwright.alt5202.config.ts`, 1 worker, no retries, xvfb-run,
  chromium/firefox/webkit: 182 passed, 9 skipped (Enter system),
  1 failed. The failure was Firefox tabbing into the scrollable
  `.about-body`. Fixed with `tabIndex={-1}` on that container.
  Isolated rerun of "About dialog opens" in all three browsers: 9
  passed in 1.6m. Known flakes (permanent local backdrop, canvas
  picking) passed in the full run, so they were not rerun with
  `--repeat-each=3`. Config deleted after the rerun.
- Screenshots of the open About dialog at 390×844 and 1440×900, scrolled
  so Credits and Privacy are visible, saved on piotr under
  `~/src/bobiverse-aboutcredits/artifacts/about-shots/` and copied to
  the box at `/workspace/about-shots/`.
