# BOB-20261115-HSV8RT: run under a strict Content-Security-Policy

Status: In progress
Phase: 2 (publication readiness; public hosting)
Last updated: 2026-11-15

## Objective and user-visible outcome

Public hosting at bobiverse.space will serve a strict Content-Security-Policy
without `unsafe-eval` and without any third-party origin. The live bundle
contained two problems that that policy would hit:

1. Ajv compiles narrative JSON Schema validators with `Function(...)`. Under
   `script-src 'self'` that throws `EvalError` during startup, so the app
   never renders. Empirically confirmed against the Sysadmin's staged
   headers at `http://127.0.0.1:18099/` (build `c2a78a9`,
   `index-ByrWTfBL.js`) in Chromium and Firefox: the document, script and
   stylesheet loaded from self, then boot failed with Ajv's "Error compiling
   schema" / `Function() blocked by CSP`.
2. troika-three-text's unicode-font-resolver falls back to
   `https://cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver@v1.0.1/packages/data`
   when a 3D `Text` glyph is missing from the configured font, even if
   `font` is set. A failed custom `unicodeFontsURL` also retries that CDN.
   The current axis labels (`Galactic center · +Xg`, `Galactic north · +Zg`)
   and name fields are fully covered by bundled Noto Sans, but a future
   missing glyph would make a third-party request and violate both the CSP
   and the privacy note (no third-party requests at runtime).

After this change the production bundle boots and is usable under:

`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`

There is no intentional user-visible behaviour change. Missing-glyph 3D
characters simply do not pull a fallback font from a CDN.

## Authorization

Relayed by the Piotr Developer Manager on 2026-11-15 (Europe/Warsaw), from
the Sysadmin's strict-CSP staging for public hosting and the Captain's
privacy constraint (no third-party requests at runtime). Local only: do not
push or merge to master.

The production-browser skip of Ajv compilation follows the existing
N53C8T pattern (`isViteProductionBuild`): `npm run build` already ran
`narrative:validate` over the same authored corpus. Development, Vitest
and the CLI still compile and run every validator, including the
generated-world check. This is recorded in `docs/technical-design.md` and
`docs/data-model-definition.md`.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md` (narrative preparation; this task updates the
  production-build Ajv exception)
- `../data-model-definition.md`

## In scope

1. Do not compile Ajv validators in production browser builds.
2. Make troika's unicode-font-resolver CDN fallback impossible (strip the
   jsDelivr default and the "retry default CDN" catch; do not hang when
   no fallback fonts are returned).
3. Set troika's `defaultFontURL` to the bundled Noto Sans Regular font
   so a future `<Text>` without an explicit `font` does not send every
   character to the resolver.
4. Keep the two existing map axis `<Text>` nodes on the bundled font.
5. Force troika typography onto its main-thread fallback so typesetting
   does not use `importScripts(blob:...)`, which `script-src 'self'`
   blocks.
6. This task file, the design-doc note, unit tests, and an e2e test that
   exercises the production bundle under the strict CSP and asserts zero
   non-self requests and zero CSP violations, including after injecting a
   label with glyphs missing from Noto Sans (`你好★`).
7. A small `scripts/serve-csp-preview.mjs` test harness that serves `dist/`
   with the strict CSP. It is not the production server.

## Out of scope

- Deploying the CSP on the live site (Sysadmin).
- Adding `'unsafe-eval'` to the public policy.
- Precompiling standalone Ajv validators (possible later if we want the
  generated-world schema check in the production browser without eval).
- Editing `data/` or chapter JSON.
- Pushing or merging to master.

## Acceptance criteria

1. A production build served with the strict CSP above boots: the map
   canvas and "What is this?" control are visible.
2. Under that CSP, exercising the map, labels, search, a chapter switch,
   the inspector and About produces zero requests to a non-self origin
   and zero CSP violations, in Chromium, Firefox and WebKit.
3. Injecting a troika `Text` string with glyphs missing from Noto Sans
   still produces zero non-self requests and zero CSP violations.
4. Development, Vitest and `npm run narrative:validate` still compile and
   run Ajv validators. Existing structural-rejection tests stay green.
5. The production bundle (and every troika JS file after the Vite
   transform) does not contain the unicode-font-resolver jsDelivr URL.
6. No canonical data, book text, or generated chapter bytes change.

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
# e2e under CSP: untracked alt Playwright config, port 5202 or the next
# free port if 5202 is occupied, 1 worker, no retries, then delete the
# untracked config.
```

## Manual browser checklist

1. Open a production preview served with the strict CSP.
2. Confirm the atlas boots (map, "What is this?", Solar System label).
3. Search for Alpha Centauri, open the inspector, switch chapter, open
   About, and confirm no CSP or missing-script errors in the console.
4. In the network panel, confirm there are no requests to jsDelivr or any
   other third-party origin.
