# BOB-20261115-YM65RA: screen-space map picking for finger-sized taps

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-15

## Objective and user-visible outcome

Tapping a star on the 3D map with a finger was hard. Marker picking used
mesh raycasts against a 0.09 pc (and, for narrative-known stars, an
accidental 0.18 pc visible) billboard, so at the home or zoomed-out view a
star's hit target was only a few CSS pixels across. Unlabelled astronomy-only
stars such as WISE 0855-0714 were effectively un-tappable, and Sol's DOM
caption could steal a tap meant for a nearby star.

Picking is now a screen-space test against each pickable component's
projected centre. The nearest centre within the effective radius wins. On a
phone a star is tappable in a finger-sized disk around its glyph; a caption
is only a fallback when no star centre is close enough.

## Authorization

The Piotr Developer Manager approved the investigation's proposed fix on
2026-11-15 (Europe/Warsaw), with one change: a star centre within the pick
radius of the tap beats a caption box. Caption selection is a fallback only.
Implementation is on a local branch: no push, no merge to master and no tag.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md` (§8.4 marker picking)
- `../implementation-plan.md` (Phase 5)

## Scope

- `src/domain/star-picking.ts`: screen-space pick helper, coarse/fine
  radii, drag threshold and nearest-centre selection with a depth
  tie-break.
- `src/components/MapScene.tsx`: pointerup picking and desktop hover use
  that helper; visible sprites no longer raycast; the unused invisible
  click-target mesh is removed; caption DOM clicks defer to the
  screen-space test; a pick commits only when the pointer moved less than
  the drag threshold.
- `docs/technical-design.md` §8.4 describes the new behaviour.
- Unit and e2e coverage listed under acceptance criteria.
- This task file.

## Out of scope

- Book text, `data/`, tags, a push or merge to master.
- Changing OrbitControls' rotate-without-deadzone behaviour beyond ignoring
  a pointerup that moved too far.

## Acceptance criteria

1. Coarse pointers (`(pointer: coarse)`) use a 22 CSS px base radius; fine
   pointers use 10 CSS px. The effective radius is never smaller than the
   projected 0.09 pc pick quad.
2. The nearest projected centre wins; camera depth is only a tie-break.
3. Locked, spoiler-hidden and otherwise unpickable objects are skipped.
   Zoomed cluster mode only considers that system's components.
4. A drag whose movement is 10 CSS px or more does not pick.
5. Tapping WISE 0855-0714's centre at the home view and at the zoomed-out
   (`maxDistance` 45 pc) view selects WISE, not Solar System, even when
   Sol's caption covers that area. Tapping Sol's caption at a point outside
   every star's effective radius still selects Sol.
6. Desktop hover uses the same screen-space path.

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
# e2e: chromium, firefox and webkit on port 5208, one worker, no retries,
# untracked playwright.alt5208.config.ts, deleted afterwards.
npm run test:e2e:csp
```

## Risks and decisions

- OrbitControls still starts rotating on the first pointer move. The 10 CSS
  px slop only suppresses the _pick_, so a sloppy tap may nudge the camera
  slightly. That is existing OrbitControls behaviour.
- Caption hits are geometric (the pointer is over a `.narrative-map-label`
  and no centre is within R). A star centre within R always wins, including
  when the event target is the caption itself.
- Screen-space picking projects every rendered pickable component (97
  context systems / 119 components at the zero-state home view; 317 in the
  full catalogue) once per pointer event. That is cheap.

## Log

### 2026-11-15 (Europe/Warsaw)

- Investigation on a discarded scratch worktree measured official mesh
  hits of about 2.4 CSS px at the home view and 1.8 CSS px zoomed out on a
  390×844 phone, versus the 44 CSS px finger guideline. Sol was tappable
  only through its 74.4×41.3 caption, which stole taps aimed at WISE
  0855-0714 when zoomed out.
- Implemented screen-space picking as authorised, on
  `bob-20261115-screen-pick` in `~/src/bobiverse-screenpick`.
- Full validation on this worktree, still based on `f794a35` (master
  `3c71990` was not merged in): `tasks.py check` (99 task files, 31 ADRs),
  format:check, lint (existing AboutDialog fast-refresh warning only),
  typecheck, 633 tests, 90 data tests, data:validate, narrative:validate,
  build, `git diff --check`, and Prettier on the changed Markdown.
- e2e on chromium, firefox and webkit, one worker, no retries, temporary
  untracked `playwright.alt5208.config.ts` on port 5208: 238 passed, 11
  skipped (40.2m). That is 79 passed / 4 skipped on chromium and firefox,
  80 passed / 3 skipped on webkit, including the new WISE-vs-Sol and drag
  cases. Port 5173 was left untouched.
- CSP e2e on port 4208 with the matching temporary config: 3 passed
  (21.0s) across chromium, firefox and webkit. Both alt configs were
  deleted afterwards.
- Review fix: a second pointer during a gesture now cancels the pick and
  suppresses further picks until every tracked pointer is up, so a pinch
  whose first finger stays still does not select on release. Caption
  `onClick` skips when a tracked pointerup just handled the same tap, so
  `onSelect` fires once. Unit tests cover the pinch, the still-finger
  release, and the single caption-tap `onSelect`.
