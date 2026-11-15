# BOB-20261115-MKP51F: Disambiguate same-named Contains children

Status: Ready
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-15

## Objective and user-visible outcome

On the star-system info panel for **Epsilon Eridani** (and the same pattern at
Beta Hydri, 82 Eridani, Epsilon Indi and Delta Eridani), the **Contains** row
must not look like the system contains itself. The same-named primary star
stays in the list, labelled **Epsilon Eridani (star)** (and likewise for the
other systems), beside distinct children such as **Bill's skunkworks**. Names
that already differ from the current entity, such as **Sol** under **Solar
System**, stay unqualified.

## Authorization

- Bug report relayed by the Piotr Developer Manager on 2026-11-15
  (Europe/Warsaw): the live Epsilon Eridani info panel at Chapter 1.61 lists
  **Epsilon Eridani** in its own **Contains** row alongside **Bill's
  skunkworks**. Investigate first; if the star system has a legitimate
  same-named child (for example the primary star), fix it in presentation
  code and do not change `data/`. Authorised under the standing local-branch
  review process: implement on a branch for review; do not merge to master or
  deploy in this task. This is a separate branch from BOB-20261115-7FQJCG.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Section 9.2 (the projected location hierarchy:
  `member_of_system` star children of a `star_system`)
- `../data-model-definition.md` (permitted containment: `star_system` → `star`
  with `member_of_system`; planets orbit the star, not the system)
- `BOB-20261114-AYW3EN-info-panel-header.md` (location kind already shown under
  the panel name)
- `../visual-testing.md` (manual checklist updated by this task)

## Scope

1. `src/narrative/entity-label.ts`: `disambiguatedEntityLabel(target,
currentName)` returns the target's name, and when that name matches the
   current entity and the target is a location with a kind, appends the kind
   in the same form the header already uses (`star`, `star system`).
2. `src/components/ObjectInspector.tsx`: relationship links (Parent, Contains
   and the other inspector entity links) use that label.
3. Tests: unit tests for the helper (same-named star, unqualified Sol, Parent
   of the star, missing kind); a component test for Epsilon Eridani's
   **Contains** row; a cheap compact e2e at Chapter 1.61.
4. Docs: a short visual-testing checklist item.

## Out of scope

- Any change under `data/`. The entities and parent links are correct.
- Filtering the primary star out of **Contains**. That would hide the only
  designed `member_of_system` child and the path to planets, which orbit the
  star.
- Breadcrumb trails, which can also show two adjacent "Epsilon Eridani"
  crumbs; not in this bug report.

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

- **Code, not data.** `location:epsilon-eridani` (`star_system`, introduced in
  Chapter 1.12) correctly has child `location:epsilon-eridani-star` (`star`,
  `parent_relation: member_of_system`, introduced in Chapter 1.16), both named
  "Epsilon Eridani". `location:bill-skunkworks` is a separate `locale` child of
  the system. The same system/star name pair exists for Beta Hydri, 82
  Eridani, Epsilon Indi and Delta Eridani. Solar System / Sol already uses
  distinct names, so it does not show the bug.
- **Disambiguate, do not filter.** The data model requires a `star_system` to
  contain its `member_of_system` star, and planets orbit that star. Removing
  the star from **Contains** would look like a self-reference was deleted, but
  it would also drop the navigation path into the system's planets. Appending
  the kind matches the header's kind line and keeps the relationship.
- **Only when names collide.** Unqualified labels stay the default, so Sol,
  Bill's skunkworks and other uniquely named links do not grow a suffix.

## Log

### 2026-11-15 (Europe/Warsaw)

- Created on origin/master `8cd0485` under the authorization above, on local
  branch `bob-20261115-mkp51f-contains-self` in the
  `~/src/bobiverse-contains` worktree.

- Implemented in `8cc6d39`. Validation, all passed:
  `python3 scripts/tasks.py check` (88 task files, 30 ADRs), `npm run format:check`,
  `npm run lint`, `npm run typecheck`, `npm run test` (492 passed, 44 files),
  `npm run data:test` (90 passed), `npm run data:validate`,
  `npm run narrative:validate`, `npm run build`, `git diff --check` and
  `npx prettier --check` on the changed Markdown.
- Full e2e on spare port 5198 (untracked `playwright.alt5198.config.ts`, deleted
  afterwards), one worker, no retries. First run used a `$`-anchored
  `inspectFromBrowser` name regex that does not match recency text in the
  object-browser row. Chromium and Firefox each had 55 passed, 3 skipped and 1
  failed: the new Chapter 1.61 Contains test timed out on that click.
  WebKit loaded the already-edited regex from the worktree and had 56 passed
  and 3 skipped (the Enter system tests behind `ENABLE_ENTER_SYSTEM`).
- `d3b4e78` relaxes the browser match to `/^Epsilon Eridani(?! One)/`. The
  isolated Contains test then passed once each in Chromium (8.9s), Firefox
  (9.1s) and WebKit (9.9s). Combined with the first-run totals that is 56
  passed and 3 skipped per browser. No known-flake reruns were required. No
  icon-specimen PNG was rewritten.
- Before/after screenshots at 390×844 (Epsilon Eridani at Chapter 1.61) were
  taken for review outside the repository: Contains changes from a bare
  "Epsilon Eridani" child to "Epsilon Eridani (star)" beside "Bill's
  skunkworks".
- Not pushed and not merged. This branch is for review only.
