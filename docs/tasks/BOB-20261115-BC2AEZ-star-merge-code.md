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
- The 82 Eridani Chapter 1.51 description pin is updated because the
  Extractor condensed that text under Maciej's delegated-condensation rule,
  as relayed by the manager. No other pins are to be changed.

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
   to `6a45aa7d68257bb2`. Basis: condensed text accepted under Maciej's
   delegated-condensation rule, as relayed by the manager. If any other pin
   or snapshot breaks, stop and report; do not re-pin.
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
  because that condensed text was accepted under Maciej's
  delegated-condensation rule, as relayed by the manager. Any further pin or
  snapshot failure is reported, not silently re-pinned.
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
