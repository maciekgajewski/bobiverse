# BOB-20261115-6C60VA: Disambiguate same-named adjacent breadcrumbs

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

When a compact **Object trail** would show two adjacent crumbs with the same
name, such as **Epsilon Eridani › Epsilon Eridani** for the star system and
its primary star, both crumbs append their kind in the same form as
BOB-20261115-MKP51F: **Epsilon Eridani (star system) › Epsilon Eridani
(star)**. The current object's own crumb is included in that rule. Unique
neighbours, and a trail of a single crumb, stay unqualified. The interstellar
**Star Map** breadcrumb is unchanged.

## Authorization

- Follow-up requested by the Piotr Developer Manager on 2026-11-15
  (Europe/Warsaw), after BOB-20261115-MKP51F: breadcrumb trails can show two
  adjacent crumbs with the same name. Apply the same helper and label form
  when adjacent crumbs share a name. Authorised under the standing
  local-branch review process: implement on a branch for review; do not merge
  to master or deploy in this task.
- **Stacked base.** This branch is stacked on
  `8323ab77222c27b0db2f7316cc7c28303a533fcc` (MKP51F's resolution merge of
  `origin/master` `01f1281`, pending re-review). It is not based on
  `origin/master`. Landing must wait until MKP51F has landed, or restack if
  that merge is revised.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Section 9.2 and Section 10 (object trail of real
  parent links in the compact detail-sheet header)
- `BOB-20261115-MKP51F-contains-self.md` (shared `disambiguatedEntityLabel`
  form: `star`, `star system`)
- `BOB-20261114-H960PW-mobile-snap-sheet.md` (object trail in the sheet
  header)
- `../visual-testing.md` (manual checklist updated by this task)

## Scope

1. A small extension of `disambiguatedEntityLabel` qualifies a crumb when its
   name matches an adjacent crumb, using the same kind form. The trail
   builder in `src/narrative/breadcrumb.ts` applies it. The current object's
   crumb is qualified when it shares a name with its neighbour.
2. The map **Star Map** breadcrumb (`Star Map / {entered system}`) is a
   two-level interstellar/system exit trail, not a `parent_location_id`
   chain, and cannot show two adjacent same-named location crumbs. No change
   there.
3. Tests: unit tests for the adjacent-label rule and the trail; a compact
   component test; a cheap extension of the Chapter 1.61 Contains e2e.
4. Docs: a short visual-testing checklist item.

## Out of scope

- Any change under `data/`.
- Filtering same-named ancestors out of the trail.
- Changes to MKP51F relationship-link behaviour, except reuse of its helper.

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
# e2e: chromium, firefox and webkit on port 5198, one worker, no retries,
# untracked playwright.alt5198.config.ts, deleted afterwards.
```

Manual: the Captain's check after deployment (checklist in
`../visual-testing.md`).

## Risks and decisions

- **Current crumb is included.** The rule is about adjacent names, not about
  excluding the selected object. The requested example is **Epsilon Eridani
  (star system) › Epsilon Eridani (star)** when the star is selected, so the
  last crumb also gets a kind. A one-crumb trail (the system itself) has no
  neighbour and stays bare.
- **Qualify both sides of a collision, only those sides.** A planet under
  that star with a distinct name, or **Solar System › Sol › Earth**, stays
  unqualified. If three adjacent crumbs shared a name, all three would be
  qualified.
- **Labels are computed in the trail builder**, so the visible crumbs and the
  collapsed "…" tooltip stay consistent. The renderer keeps printing
  `crumb.label`.
- **Stacked on pending MKP51F.** Do not merge this branch to master until
  MKP51F has landed.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on MKP51F merge `8323ab7` (not `origin/master`) under the
  authorization above, on local branch
  `bob-20261115-6c60va-breadcrumb-same-name` in the
  `~/src/bobiverse-crumbs` worktree.

- Implemented in `4435e6b` and `844461e`. Validation, all passed:
  `python3 scripts/tasks.py check` (90 task files, 30 ADRs), `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm run test` (499 passed, 44 files),
  `npm run data:test` (90 passed), `npm run data:validate`,
  `npm run narrative:validate`, `npm run build`, `git diff --check` and
  `npx prettier --check` on the changed Markdown.
- Full e2e on spare port 5198 (untracked `playwright.alt5198.config.ts`, deleted
  afterwards), one worker, no retries: Chromium, Firefox and WebKit each 60
  passed and 3 skipped (the Enter system tests behind `ENABLE_ENTER_SYSTEM`),
  including the extended Chapter 1.61 Contains and object-trail test. No
  known-flake reruns were required. No icon-specimen PNG was rewritten.
- Before/after screenshots at 390×844 (the Epsilon Eridani star at Chapter 1.61)
  were taken for review outside the repository. The object trail changes from
  two bare "Epsilon Eridani" crumbs to "Epsilon Eridani (star system) ›
  Epsilon Eridani (star)". On that narrow width the ancestor crumb ellipsizes
  so the current name stays in full; the link's accessible name remains
  complete.
- Not pushed and not merged. This branch is stacked on pending MKP51F
  `8323ab7` and is for review only.

- 2026-11-15: Landed at `a992e18` and live; awaiting Maciej's visual
  acceptance.
