# BOB-20261115-BC2AEZ: Star-merge code, tests and docs

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; guided system view)
Last updated: 2026-11-15

## Objective and user-visible outcome

The Extractor's `chapters/star-merge` data (head `184fce51`) merges five
single-star systems (Epsilon Eridani, Delta Eridani, Beta Hydri, 82 Eridani
and Epsilon Indi) into their system entities. This branch, stacked on that
data head, updates tests, Enter-system eligibility, and docs so the app
matches that model. Sol is out of scope. This branch does not edit `data/`
or chapter JSON.

After the change:

- Live Epsilon Eridani tests inspect the merged system and a uniquely named
  child such as **Epsilon Eridani One**, not a removed **Epsilon Eridani
  (star)** link. Same-name disambiguation (BOB-20261115-MKP51F and
  BOB-20261115-6C60VA) stays covered by synthetic unit fixtures.
- A system whose planets orbit it directly, with no star child, is eligible
  for Enter system. The button stays hidden while `ENABLE_ENTER_SYSTEM` is
  false; eligibility is tested at the unit level, including the merged
  Epsilon Eridani system at Chapter 1.61.
- Docs state that in a single-star system, planets may orbit the system
  directly.

## Authorization

- Relayed by the Piotr Developer Manager on 2026-11-15 (Europe/Warsaw):
  build the star-merge code, tests and docs branch on top of the Extractor's
  data branch `184fce51e96d0daca4f0debaf6534688e6d0bc33` (base `824e7ca`).
  Local only: do not push or merge to master. Do not edit `data/` or chapter
  JSON.
- The 82 Eridani Chapter 1.51 description pin is updated under the
  delegated-condensation rule (Maciej, 2026-11-14 22:54). The fact
  survives in the 1.51 chapter summary (verified). No other pins are to
  be changed.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Section 9.2
- `../data-model-definition.md` (zero-state and shared semantic parent
  tables)
- `BOB-20261115-MKP51F-contains-self.md` and
  `BOB-20261115-6C60VA-breadcrumb-same-name.md` (same-name labels; live EE
  data no longer has a same-named star)
- Extractor survey and review: `~/extraction-scratch/star-merge/SURVEY.md`
  and `REVIEW.md`

## Scope

1. Re-point the live Epsilon Eridani App and e2e tests from the removed star
   entity to the merged system and a uniquely named child. Keep MKP51F and
   6C60VA unit coverage on synthetic fixtures.
2. Update only the `tests/fixtures/narrative-meaning.json` pin for
   `location:82-eridani` description at Chapter 1.51, from `ac27d84970d17a3a`
   to `6a45aa7d68257bb2`. The fixture `basis` field must match
   `^[A-Za-z0-9 .:()-]{1,48}$`, so it stores
   `delegated-condensation (Maciej 2026-11-14 22:54)`. The full citation
   and the verified 1.51 chapter-summary note are in the log. If any other
   pin or snapshot breaks, stop and report; do not re-pin.
3. `src/system-view.ts`: a star system with recognized `orbits` children
   hanging directly off the system, and no star child, is enterable. Unit
   tests include a synthetic case and the merged Epsilon Eridani system at
   Chapter 1.61. No new e2e for Enter system while the flag is off.
4. Docs: data-model parent tables and technical-design §9.2. Confirm the
   chapter validator does not require planets to orbit a star (the data
   branch already passed `narrative:validate`).
5. Grep for other star-child assumptions and fix real breakage with a test.

## Out of scope

- Any change under `data/` or to chapter JSON.
- Merging Sol / Solar System, or changing Alpha Centauri or Omicron2 Eridani.
- Turning `ENABLE_ENTER_SYSTEM` on.
- Pushing or merging to master.

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
git diff -- 184fce51 -- data/
# e2e: chromium, firefox and webkit on port 5200, one worker, no retries,
# untracked playwright.alt5200.config.ts, deleted afterwards.
```

Manual: the Captain's check after deployment (checklist in
`../visual-testing.md`).

## Risks and decisions

- **Stacked on the Extractor data head, not on origin/master.** Landing must
  wait for a review of this code branch and for the data branch itself.
- **One meaning pin only.** The 1.51 82 Eridani description hash changes
  under the delegated-condensation rule (Maciej, 2026-11-14 22:54). The
  fixture basis field is length- and charset-limited; see the log. Any
  further pin or snapshot failure is reported, not silently re-pinned.
- **Enter-system tests stay at unit level** while `ENABLE_ENTER_SYSTEM` is
  false. Existing e2e Enter system tests already skip.
- **Zero-state Sol is unchanged.** The zero-state parent table still
  describes Sol; a note points to the chapter rule for single-star systems.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on Extractor `chapters/star-merge` `184fce51` (ancestor `824e7ca`,
  not `origin/master`) under the authorization above, on local branch
  `bob-20261115-star-merge-code` in the `~/src/bobiverse-starmerge` worktree.
  Dev and e2e use port 5200.

### 2026-11-15 (Europe/Warsaw) — implementation and validation

Implementation is complete on this branch. Not pushed; not merged to master.

The only meaning pin changed is `location:82-eridani` description at
Chapter 1.51, now `sha256:6a45aa7d68257bb2`. The fixture `basis` field
must match `^[A-Za-z0-9 .:()-]{1,48}$`, so the exact steering citation
`delegated-condensation rule (Maciej, 2026-11-14 22:54)` (54 characters,
and it contains a comma) cannot be stored verbatim, and the
chapter-summary note cannot fit beside it. The stored basis is
`delegated-condensation (Maciej 2026-11-14 22:54)`. The fact was verified
to survive in the 1.51 chapter summary: one sentence mentions Milo, 82
Eridani, promising, and colonisation. Chapter 1.51 no longer writes a
description for `location:82-eridani`. The "holds every pinned fact"
test passed; no other pin was changed.

No remaining live system/star pair shares a name (Alpha Centauri versus
A/B, Omicron2 Eridani versus Omicron Eridani A, Solar System versus
Sol). `ObjectInspector.test.tsx` and `narrative-breadcrumb.test.ts` keep
synthetic same-name coverage. The live `App.test.tsx` and e2e cases now
walk merged Epsilon Eridani to **Epsilon Eridani One**.

`src/system-view.ts` treats recognized `orbits` children hanging directly
off the system as enterable, still behind `ENABLE_ENTER_SYSTEM`. Unit
tests cover a synthetic direct-orbit case, a star-less locale-only
rejection, and live merged Epsilon Eridani at Chapter 1.61. The only
production star-child assumption found was `system-view.ts`.

Docs in `data-model-definition.md`, `technical-design.md` §9.2, and
`visual-testing.md` (MKP51F, 6C60VA, and a new BC2AEZ section) were
updated as planned. Zero-state Sol is unchanged.

Validation at `5b631b4` (08:11 Europe/Warsaw):

- `scripts/tasks.py check`: 92 task files and 31 ADRs.
- `format:check`, `lint`, `typecheck`: passed.
- `npm test`: 47 files, 557 tests passed.
- `data:test`: 90 passed.
- `data:validate`: 277 reconciled systems.
- `narrative:validate`: zero state and 61 chapter source files.
- `build`, `git diff --check`, and Prettier on the changed Markdown:
  passed.
- `git diff -- 184fce51 -- data/` is empty.

E2e on port 5200 with untracked `playwright.alt5200.config.ts`, one
worker, no retries, `xvfb-run`, chromium, firefox, and webkit: 183
passed, 9 skipped (the three `ENABLE_ENTER_SYSTEM` tests in each
browser), 0 failed, 30.1 minutes, finished 08:44 Europe/Warsaw. The
merged Epsilon Eridani test passed in all three browsers. The known
flake cases (permanent local backdrop; canvas picking after framing
settles) passed in all three; no isolated rerun. Port 5173 stayed
HTTP 200. The alt config was deleted afterwards.
