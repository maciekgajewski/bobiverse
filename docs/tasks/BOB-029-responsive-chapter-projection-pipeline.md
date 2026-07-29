# BOB-029: responsive chapter projection pipeline

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-07-28

## Objective

Remove interaction-time narrative-schema compilation and redundant world generation
from chapter navigation. Introduce one explicit prepared-corpus boundary shared by the
browser and CLI, and keep each reader-progress transition to one atomic reader-safe
projection.

## User-visible outcome

Selecting an unlocked knowledge chapter updates the timeline, map, browser, and
inspector promptly. On the reference host, a warmed chapter transition in the
production bundle has a median click-to-render duration no greater than 100 ms, with
no measured transition above 150 ms.

## Binding references

- `../technical-design.md`, especially Sections 6, 10, and 12
- `../data-model-definition.md`, especially reader progress and projection
- `../implementation-plan.md`, Phase 2
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../adrs/0006-generalized-narrative-zero-state.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`
- `BOB-004-narrative-zero-state-and-projection.md`
- `BOB-011-reader-progress-and-temporal-navigation.md`
- `BOB-012-progressive-object-browser-and-inspectors.md`
- `BOB-014-narrative-aware-map-integration.md`
- `BOB-015-phase-2-desktop-integration-and-acceptance.md`
- `../../AGENTS.md`

No ADR is expected: the task preserves the accepted static-data, validation,
projection, and spoiler-ownership boundaries. If implementation requires changing
narrative authority, spoiler semantics, persistence, or static deployment, stop and
propose an ADR rather than expanding this task silently.

## Profiling evidence

The 2026-07-28 Chrome trace for a chapter-selector interaction reported 2,061 ms INP,
including 1,988 ms of scripting and no material rendering or painting cost. Its main
thread repeatedly entered `validatorFor`, `assertSchema`,
`validateNarrativeCorpus`, `meaningfulNarrativeDateOptions`, and
`generateNarrativeWorld`.

The canonical narrative corpus contained 11 chapter files and approximately 31 KB of
narrative JSON. Local focused measurements on the development host found:

- one complete corpus validation: 276-431 ms;
- one meaningful-date calculation: approximately 278 ms;
- one world generation: approximately 286 ms;
- live development chapter click without a selected object: approximately 979 ms;
- live development chapter click with a selected object: approximately 1,164 ms;
- existing production-bundle click without a selected object: approximately 561 ms;
- existing production-bundle click with a selected object: approximately 750 ms.

The interaction does not parse source JSON. `validatorFor` currently constructs an
Ajv instance, adds the complete schema, and resolves a compiled validator for every
schema assertion. Complete corpus validation is then repeated by meaningful-date and
world-generation calls, while selected-object eligibility triggers an additional
world generation before React calculates the shared render projection.

These measurements are diagnostic baselines, not permanent expected values. Record
the exact post-change commands, environment, sample results, and comparison in this
task's completion evidence.

## Decisions

- Use a systematic fix rather than limiting the change to an Ajv cache.
- Add an explicit `prepareNarrativeCorpus(rawCorpus)` boundary. It validates the raw
  authored corpus once and returns the immutable, indexed input accepted by runtime
  projection APIs.
- A prepared corpus must be isolated from later mutation of the raw input. Later raw
  mutation must neither alter prepared results nor bypass validation.
- Compile and register each narrative JSON Schema validator once per application or
  CLI module lifetime. Reuse compiled validators for source diagnostics, preparation,
  and generated-world validation.
- In the CLI, source-located schema diagnostics are the structural part of the single
  preparation pass, not a preliminary validation followed by the same structural
  validation again. Semantic validation continues only after structural diagnostics
  are clean.
- Keep complete structural and semantic corpus validation in normal offline, CLI,
  test, development, and build paths.
- Keep runtime projection guarded. Preparation and projection failures must still
  reach the established actionable `Narrative projection unavailable` state.
- Centralize application projection coordination. One reader-progress transition
  calculates at most one `NarrativeWorld` and commits normalized progress, meaningful
  dates, map projection, and selection eligibility atomically.
- Preserve one shared projection result for timeline, browser, map, and inspector.
  Do not add UI-local spoiler filtering or independently reconstructed projections.
- Precompute or cache immutable corpus-derived chapter ordering, lookup, and
  meaningful-date inputs where doing so removes repeated work without making reader
  progress or display date part of global mutable state.
- Use a layered performance gate:
  - deterministic tests prove validator reuse, one-time preparation, and one world
    projection per chapter transition;
  - a production Chromium benchmark measures 10 warmed chapter transitions, requires
    a median no greater than 100 ms, and permits no sample above 150 ms.
- The production benchmark is the performance authority. Development-mode timing is
  diagnostic because React and Vite development checks add non-production work.

## In scope

- Separate raw `NarrativeCorpus` authoring input from the prepared runtime corpus
  accepted by projection and meaningful-date APIs.
- Validate, clone or otherwise isolate, and make the prepared corpus immutable.
- Compile the Draft 2020-12 schema and its named validators once and reuse them.
- Preserve source-specific schema diagnostics from `scripts/narrative-cli.ts`,
  including file, line, and column reporting.
- Prepare the browser corpus once in `src/narrative/runtime.ts`.
- Prepare the CLI corpus once per invocation and reuse it for validation and optional
  generation.
- Pre-index canonical numeric chapter order and chapter lookup.
- Remove repeated full-corpus validation from steady-state chapter and date
  transitions.
- Remove the second selected-object world generation in the application transition
  path.
- Keep progress normalization, meaningful-date options, world state, map projection,
  selection eligibility, and error handling synchronized in one transition result.
- Preserve immediate user-visible selection clearing and its status announcement
  when a selected object becomes ineligible.
- Ensure unrelated UI state changes, including browser search, group expansion,
  mobile-panel state, and map-scale updates, do not regenerate the narrative world.
- Add focused unit and component coverage for preparation immutability, validation
  failure behavior, validator reuse, projection counts, selection invalidation, and
  zero-state/chapter/date transitions.
- Before changing production implementation files, add a focused canonical
  equivalence test which can serialize one public comparison matrix to an explicit
  path under `/tmp` when `BOB_029_CAPTURE` is set. The matrix contains meaningful-date
  options through chapter 1.11 plus worlds for the zero state, Chapter mode at 1.1,
  1.10, and 1.11, and Date mode at every date in those options. Keep the test as
  enduring coverage; ordinary test runs compare values without writing a file.
- Add a Chromium-only production performance configuration or equivalent isolated
  harness. It must build the current source, serve the production bundle on a strict
  local port, warm the application, exercise both unselected and selected-object
  chapter transitions, and emit individual samples plus median and maximum.
- Use this exact performance protocol:
  - the reference environment is host `piotr`, with its AMD Ryzen 5 5600 CPU, Node
    22.23.1, the repository-pinned Playwright 1.61.1, and Playwright's installed
    headless Chromium; record the actual CPU, Node, browser, and bundle identity in
    every run so later intentional reference-host changes are explicit;
  - use a 1440 x 1000 desktop viewport, reduced motion, no DevTools recording, no CPU
    throttling, a strict `127.0.0.1:4173` production preview, and no concurrent
    repository build, test, or benchmark process;
  - seed progress through chapter 1.11 with chapter 1.10 selected in Chapter mode,
    then wait for chapter 1.10's `aria-current` state and the matching map narrative
    badge;
  - before each measured scenario, perform two complete excluded warm-up cycles
    between chapters 1.10 and 1.11;
  - collect 10 samples per scenario by alternating chapters 1.10 and 1.11, beginning
    with 1.11;
  - start each sample at capture of the actual chapter-button `click` event; finish
    only after the target button has `aria-current`, the map badge reports the target
    knowledge chapter, and two animation frames have completed;
  - run the first scenario with no selection;
  - reload the prepared initial state for the second scenario, select the zero-state
    narrative object `location:solar-system`, and assert after every warm-up and
    measured transition that **Solar System** remains selected in the inspector and
    no selection-cleared announcement occurred.
- Keep the performance harness separate from the existing cross-browser development
  E2E suite so its production base URL, timing budget, and Chromium-only scope are
  explicit.
- Add a package command for the performance gate. It must be suitable for the
  repository's local/manual validation workflow and must not require Internet access.
- Update directly affected integrated documentation and this task's completion
  evidence.

## Out of scope

- Changes to narrative JSON Schema meaning, authored chapter data, entity identity,
  spoiler rules, date ordering, or generated world contents.
- Moving schema or semantic validation to a server or worker.
- Runtime network requests, server persistence, or committed per-chapter world
  snapshots.
- Weak-reference or object-identity caching as a substitute for the explicit prepared
  corpus contract.
- Disabling React Strict Mode to conceal development overhead.
- Deferring chapter work with `startTransition` while retaining the same synchronous
  CPU cost.
- Map rendering, camera, marker, layout, or visual-design changes.
- General application performance work unrelated to reader-progress projection.
- Treating one fast manual click or a DevTools trace alone as regression coverage.
- Changing the existing cross-browser functional suite into a Chromium-only suite.

## Acceptance criteria

1. Raw authored data crosses one explicit preparation boundary before use by
   meaningful-date and world-projection APIs.
2. Preparation performs one complete structural and semantic corpus-validation pass
   for one prepared instance. Each raw source is schema-evaluated once during that
   pass, and malformed source data still fails with the established actionable
   diagnostics.
3. The prepared corpus is immutable and isolated: mutating the raw input after
   preparation cannot change a projection, meaningful-date result, index, or prior
   validation outcome.
4. Each named JSON Schema validator is compiled no more than once during one browser
   application lifetime or CLI invocation and is reused for all candidates of that
   definition.
5. `narrative:validate` and `narrative:generate` share the prepared-corpus path without
   weakening file/line/column diagnostics or validating the same canonical corpus
   again during generation.
6. Initial load, persisted-state restoration, zero-state navigation, Chapter mode,
   and Date mode retain their existing guarded failure behavior and reader-safe
   results.
7. One chapter or date transition generates at most one `NarrativeWorld`, including
   when an astronomy or narrative object is selected.
8. Progress, meaningful dates, world state, map projection, and selection eligibility
   are committed coherently; no surface renders a projection from a different
   knowledge chapter or display date.
9. A newly ineligible selection is absent from browser, map, and inspector output on
   the new view and produces the existing selection-cleared announcement.
10. Search, browser-group, panel, map-scale, and other projection-independent UI
    changes generate no new narrative world.
11. Deterministic tests fail if validator compilation becomes per-assertion, corpus
    preparation repeats for one runtime corpus, or a selected-object chapter
    transition generates more than one world.
12. The isolated production Chromium gate follows the exact reference environment,
    initialization, warm-up, transition, selection, and rendered-completion protocol
    in this task. It measures 10 transitions in each of the unselected and
    selected-object scenarios. Each scenario has a median duration of at most 100 ms
    and no sample above 150 ms.
13. The timing gate prints all samples, median, maximum, production bundle identity,
    browser identity, and enough host/runtime context to investigate a failure.
14. The performance run uses the production bundle, a strict localhost preview port,
    no external network or service dependency beyond that required loopback preview,
    and no DevTools recording. The existing development E2E suite remains the
    functional cross-browser authority.
15. Public `NarrativeWorld` values remain deeply equal for the zero state, Chapter
    mode at chapters 1.1, 1.10, and 1.11, and Date mode at every meaningful date
    exposed with knowledge through chapter 1.11. Prepared indexes must not appear in
    the public value. Before implementation, capture the current CLI's zero-state and
    chapter 1.1, 1.10, and 1.11 serialized JSON under `/tmp`; the corresponding
    post-change CLI output must be byte-for-byte identical.
16. Technical design and data-model documentation describe raw-source preparation,
    prepared-corpus ownership, validator lifetime, and one-projection transition
    flow. No new committed generated runtime artifact is introduced.
17. All documented validation commands pass, the task records before/after evidence,
    and a fresh independent implementation review reports `No findings.`

## Validation commands

Implementation must establish the exact package command name for the production
performance gate. The intended validation surface is:

```bash
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter 1.11 --output /tmp/bobiverse-bob-029-world-1.11.json
./node_modules/.bin/vitest run tests/unit/narrative.test.ts tests/unit/narrative-progress.test.ts tests/component/App.test.tsx
npm run performance
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run validate
git diff --check
```

`npm run performance` is the planned command name. If implementation selects a
different explicit package command, update this task before changing its status from
`In progress`. The command must build the current source before measuring; it may
reuse that exact build during its own preview run.

The generated world under `/tmp` is diagnostic and must not be committed. Preserve
normal Playwright screenshots, traces, and videos for functional failures. The
performance gate must print its timing samples even when it fails.

Before changing production implementation files, first add the focused canonical
equivalence test described under **In scope**. Then capture its complete public
zero-state, Chapter-mode, meaningful-date-option, and Date-mode matrix:

```bash
env BOB_029_CAPTURE=/tmp/bobiverse-bob-029-before-matrix.json ./node_modules/.bin/vitest run tests/unit/narrative-equivalence.test.ts
```

Also capture the CLI equivalence baselines:

```bash
npm run narrative:generate -- --output /tmp/bobiverse-bob-029-before-zero.json
npm run narrative:generate -- --chapter 1.1 --output /tmp/bobiverse-bob-029-before-1.1.json
npm run narrative:generate -- --chapter 1.10 --output /tmp/bobiverse-bob-029-before-1.10.json
npm run narrative:generate -- --chapter 1.11 --output /tmp/bobiverse-bob-029-before-1.11.json
```

After implementation, capture
`/tmp/bobiverse-bob-029-after-matrix.json`, generate matching CLI `after` files, and
compare every before/after pair with `cmp`. The focused test must retain deep
assertions over the public zero-state, Chapter-mode, and Date-mode matrix described by
acceptance criterion 15; internal prepared indexes are not comparison exclusions
because they must never enter `NarrativeWorld`.

## Documentation and generated artifacts

- Update `../technical-design.md` with the raw -> prepared -> projected runtime flow,
  validator lifetime, and atomic application projection ownership.
- Update `../data-model-definition.md` where it describes shared runtime validation
  and projection.
- Update `../visual-testing.md` with the production performance-gate procedure and
  the distinction between production authority and development diagnostics.
- Update this task and `README.md` only where the new validation command or developer
  workflow is directly affected.
- Update `../implementation-plan.md` only if implementation deviates from its existing
  static validated-data and shared-projection design.
- Keep `generated/narrative/chapter-manifest.json`, generated world projections,
  production `dist/`, Playwright output, and benchmark artifacts ignored and
  reproducible.

## Risks and cautions

- Caching a successful validation by raw object identity is unsafe if the raw object
  can later mutate. The prepared boundary must isolate its accepted state.
- Freezing only a top-level wrapper is insufficient when nested chapters, entities,
  arrays, maps, or sets remain mutable.
- Ajv validators carry mutable `errors` from their most recent invocation. Reuse must
  copy diagnostics before another validation and must not expose a shared mutable
  errors array.
- Source diagnostics operate on raw documents and source maps; preparation must not
  replace their candidate identity before diagnostics are formatted.
- A cache keyed only by chapter is incorrect in Date mode. Projection identity
  includes knowledge chapter and requested display date; progress ceilings govern
  which knowledge chapter is eligible but do not independently change a fixed
  projection.
- React memoization is an optimization aid, not the ownership contract. The
  application transition model must prevent duplicate projection even if components
  rerender or Strict Mode evaluates render logic diagnostically.
- Selection eligibility joins the new world with astronomy context. Removing its
  pre-render projection must not permit one stale selected frame or inspector result.
- Wall-clock browser tests fluctuate. Warm before sampling, keep the production
  environment isolated, print every sample, and use the chosen median-plus-maximum
  layered budget rather than weakening or silently retrying failures.
- Production bundling and browser startup are setup costs and are excluded from the
  click-to-render samples, but the performance command must include setup so it tests
  the current build reproducibly.
- Preserve unrelated and pre-existing worktree changes.

## Authorization

`Ready` means this task is sufficiently specified. It does not authorize
implementation; wait for the Captain to say `proceed` or `make it so`.

## Completion evidence

Implementation authorized by the Captain on 2026-07-28.

- Added the mandatory canonical matrix snapshot before changing production files and
  captured all required `/tmp/bobiverse-bob-029-before-*` files.
- The post-change equivalence command was:
  `env BOB_029_CAPTURE=/tmp/bobiverse-bob-029-after-matrix.json ./node_modules/.bin/vitest run tests/unit/narrative-equivalence.test.ts`.
  The exact CLI generation and comparison commands were:

  ```bash
  npm run narrative:generate -- --output /tmp/bobiverse-bob-029-after-zero.json
  npm run narrative:generate -- --chapter 1.1 --output /tmp/bobiverse-bob-029-after-1.1.json
  npm run narrative:generate -- --chapter 1.10 --output /tmp/bobiverse-bob-029-after-1.10.json
  npm run narrative:generate -- --chapter 1.11 --output /tmp/bobiverse-bob-029-after-1.11.json
  cmp /tmp/bobiverse-bob-029-before-matrix.json /tmp/bobiverse-bob-029-after-matrix.json
  cmp /tmp/bobiverse-bob-029-before-zero.json /tmp/bobiverse-bob-029-after-zero.json
  cmp /tmp/bobiverse-bob-029-before-1.1.json /tmp/bobiverse-bob-029-after-1.1.json
  cmp /tmp/bobiverse-bob-029-before-1.10.json /tmp/bobiverse-bob-029-after-1.10.json
  cmp /tmp/bobiverse-bob-029-before-1.11.json /tmp/bobiverse-bob-029-after-1.11.json
  ```

  All five `cmp` commands exited 0.

- `npm run performance` builds the current production bundle and runs the isolated
  Chromium protocol. Reference run context: host `piotr`, AMD Ryzen 5 5600, Node
  22.23.1, Chromium 149.0.7827.55, bundle
  `index-DBqO2gQ7.js` / `index-n5MlpF3x.css`.
- The unselected samples were
  `[51.0, 49.2, 49.7, 48.1, 50.7, 49.1, 49.5, 48.6, 49.7, 49.2]` ms:
  49.35 ms median and 51.0 ms maximum. The selected-object samples were
  `[54.2, 51.2, 50.6, 48.3, 51.4, 46.6, 53.8, 47.8, 51.6, 48.3]` ms:
  50.9 ms median and 54.2 ms maximum.
- The corrected final `npm run validate` passed 53 Python tests and 131 Vitest tests,
  including the production build. The focused post-review command passed all 57 tests
  across the narrative unit, equivalence, diagnostics, CLI-output, progress, and App
  component files. The final post-review `npm run test:e2e` passed all 42 Chromium,
  Firefox, and WebKit tests.
- Fresh independent review pass 3 reported `No findings.`
