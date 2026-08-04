# BOB-20260804-JSSM85: calendar-precision narrative dates

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-08-04

## Objective

Replace the opaque year-plus-index narrative date contract with explicit Gregorian
calendar precision plus an optional ordering suffix, migrate the complete canonical
corpus atomically, and reprepare Chapters 1.37–1.39 against a source-backed audit of
every Chapter 1.1–1.39 top-level date.

## User-visible outcome

Readers see every source-supported chapter-date precision: a year as `2165`, a month
as `August 2165`, and a full date as `17 August 2165`. Internal ordering suffixes
remain hidden. Intentionally vague source dates remain vague, while deterministic
chapter order resolves overlapping or otherwise equal chapter-authored moments.

Editors use one documented syntax and one comparison rule across canonical data,
assisted extraction, validation, projection, and presentation. The source-backed date
audit and Chapters 1.37–1.39 remain reviewable before any canonical write.

## Readiness and authority

The Captain selected the complete date syntax, comparison behavior, reader-facing
format, audit boundary, and atomic delivery boundary on 2026-08-04. This task is
therefore sufficiently specified as `Ready`, but Ready status does not authorize
implementation.

The new contract conflicts with accepted ADR-0002, ADR-0009, and ADR-0013 where they
define opaque year indices, mixed-precision incomparability, and tied indexed
moments. A new accepted ADR must explicitly supersede those statements before schema,
runtime, canonical-data, or UI implementation begins. Do not rewrite the historical
ADRs.

Exact candidate approval and application authority remain separate. Preparing and
validating the combined review package does not authorize canonical Chapter
1.1–1.39 edits, Chapter 1.37–1.39 promotion, or promotion-log updates.

## Binding references

- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0009-year-only-state-write-chapter-order.md`
- `../adrs/0013-chapter-order-for-narrative-moments.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`
- `../technical-design.md`, especially Section 12
- `../data-model-definition.md`, especially the `date` scalar and projection rules
- `../chapter-extraction.md`
- `../design/phase-2-desktop-ui.md`
- `../implementation-plan.md`, Phase 2 and Phase 4
- `BOB-027-generalized-narrative-moment-ordering.md`
- `BOB-20260803-RTJFZV-month-number-narrative-date-indices.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## Decisions

### Canonical syntax and validity

- Encode every narrative `date` as `YYYY[-MM[-DD]][.d+]`.
- `YYYY` is exactly four decimal digits and represents a positive year.
- `MM` and `DD` are zero-padded two-digit Gregorian calendar components. A day is
  valid only for its year and month, including leap-year behavior.
- The optional suffix is a non-negative base-10 ordering integer. It has no leading
  zero except for the single value `0` and is permitted at year, month, and day
  precision.
- An omitted suffix has effective ordering value `0`; explicit `.0` is ordering-
  equivalent. Canonical authoring omits `.0` unless source-backed ordering requires
  the explicit value for review clarity.
- The suffix is never a fractional year, month, or day and never appears in reader-
  facing text.
- Do not add a compatibility parser, legacy dual-write, migration fallback, or
  alternate accepted date syntax. This is one clean-break atomic migration.

### Ordering

- Interpret the calendar portion as its represented closed calendar range: a year,
  a month within that year, or one calendar day.
- Order non-overlapping ranges by Gregorian calendar order. A suffix never overrides
  that order.
- When two ranges overlap because one value is less precise, use canonical numeric
  source-chapter order for chapter-authored facts. Preserve the source's intentional
  vagueness rather than inventing month or day precision.
- When calendar portions are identical, compare effective suffix values first and
  use canonical numeric source-chapter order when those values are equal.
- Apply the same chapter-authored narrative-moment comparator to state writes,
  appearances, dated events, generated narrative activity, last-known-location
  derivation, and every other fact-to-fact consumer.
- Zero-state facts remain pre-book state and do not acquire a synthetic chapter.
- Fact-to-display-date eligibility uses calendar containment without inventing a
  source chapter. A fact is eligible when its range is earlier and non-overlapping,
  when its calendar portion is identical and its effective suffix is less than or
  equal to the display suffix, or when the display range strictly contains the fact
  range. A fact is ineligible when its range is later and non-overlapping or when the
  fact range strictly contains the less-precise display range.
- Therefore display `2165` includes facts at `2165`, `2165-08`, and `2165-08-17`;
  display `2165-08` includes `2165-08` and `2165-08-17` but excludes vague fact
  `2165`; and display `2165-08-17` excludes vague facts `2165` and `2165-08`.
  Identical calendar portions compare missing suffix as zero, so fact `2165-08` is
  eligible at display `2165-08.1`, while fact `2165-08.1` is not eligible at display
  `2165-08`.
- Meaningful-date options may include ordering-distinct values with the same visible
  calendar label. UI consumers use the shared eligibility result and never invent a
  chapter fallback for a display control.

### Presentation

- Display year precision as `2165`.
- Display month precision in English as `August 2165`.
- Display day precision in English day-first form as `17 August 2165`.
- Hide every ordering suffix from readers.
- Use one shared formatter for timeline, browser activity, inspectors, travel
  history, chapter detail, accessible text, and other narrative-date surfaces.
- The linear Date-mode axis places a value at the start of its represented calendar
  range. `2165` is January 1, `2165-08` is August 1, and `2165-08-17` is the start of
  August 17. Its numeric coordinate is
  `year + elapsed_whole_days_before_range_start / days_in_year`, using 365 or 366
  days under Gregorian leap-year rules. All suffixes on one calendar portion share
  that coordinate and use the existing stacked/accessible choice treatment; a suffix
  does not create metric elapsed time or a visible axis offset.
- Start-of-range placement is a non-semantic rendering anchor for a point-based axis.
  It does not normalize an imprecise fact to January 1 or the first day of a month,
  narrow its represented range, or assert that the occurrence happened on that day.
  Labels and accessible text retain the authored precision.

### Persisted application state

- Replace `bobiverse.app-state.v1` with `bobiverse.app-state.v2` as a clean break.
- Do not migrate reading progress, chapter selection, mode, display date, inspector
  state, or any other v1 field. On initialization, remove only the exact legacy v1
  key and start from the ordinary v2 defaults; never clear unrelated local storage.
- The application never parses a persisted old decimal date under the new grammar.
  Malformed v2 state continues to fail closed through the versioned progress-state
  validation boundary.

### Source audit and chapter candidates

- Audit only the top-level `date` of Chapters 1.1–1.39 against each corresponding
  lawfully obtained UTF-8 source outside version control.
- The required execution-time inputs are exactly the 39 matching chapter files below
  `../source-text/`, using the extraction workflow's accepted names
  `<book>.<chapter>.txt` or `<book>.<chapter> - <source title>.txt`. Chapters 1.1 and
  1.2 currently use their titled forms; Chapters 1.3–1.39 currently use untitled
  forms. Before source reading, run `source_evidence.py metadata` for every explicit
  chapter/path pair and record all 39 SHA-256 values in the temporary audit manifest.
- If any source is absent, has an invalid/mismatched filename, is not UTF-8, or a
  Chapter 1.37–1.39 fingerprint differs from the recorded baseline below, stop before
  audit or candidate work, leave canonical data unchanged, and mark the task
  `Blocked` with the exact missing or mismatched input. Never substitute another
  edition or recover text from a hash.
- Treat the explicit chapter heading or opening-scene date as the authoritative
  source boundary. Ignore dates stated only in memories, forecasts, dialogue, or
  other non-opening context for this field.
- Upgrade or downgrade canonical precision strictly to match source evidence. The
  audit records separate `value_result` (`unchanged` or `corrected`) and
  `precision_result` (`unchanged`, `upgraded`, or `downgraded`) fields so a same-
  precision value correction is representable. Record every chapter with its source
  SHA-256 and bounded sealed evidence. Never infer a missing calendar component.
- Chapter 1.1 is the sole Captain-approved audit exception. Its exact source has no
  heading or opening-scene calendar date, so retain canonical `2016`, record the
  absence of source evidence explicitly, and do not infer a replacement from elapsed
  time or later dates. The Captain approved this bounded exception on 2026-08-04.
- Replace the reviewed 2158 month-number encodings with real month precision:
  Chapter 1.31 `2158-01`, Chapter 1.33 `2158-03`, Chapters 1.34 and 1.36 `2158-09`,
  and Chapter 1.32 `2158-10`.
- Reconcile Chapters 1.37–1.39 in order against the complete audited predecessor
  chain under the new date contract. Source-supported August and October 2165 become
  `2165-08` and `2165-10`; Chapter 1.38's source-supported November 2158 becomes
  `2158-11`.
- Preserve the immutable sealed claim ledgers for Chapters 1.37–1.39. Date-contract
  changes belong in reconciliation and candidate representation, not in blind source
  claims.

## Baseline extraction evidence

The review-only extraction begun before this task produced these immutable inputs
under `/tmp/bobiverse-37-39.sUYWYV`:

| Chapter | Source SHA-256 | Sealed-ledger SHA-256 | Superseded candidate SHA-256 |
| ------- | ------------- | -------------------- | --------------------------- |
| 1.37 | `31b86d5fcafd3970d60fa0b9f03c0549320b39d602cc9a6e5000b0b87a78f073` | `afdf738eb29510a747269ad81897cfa141126e1a511dbf344da7438f5591565f` | `f6c3336013f9d4e4713ff3b578cb66ea4b368da69c26ac23eccf070921cd657d` |
| 1.38 | `347d1674d3511c505df95c756fd33896eaec8071c6f4c30714a09331e4ac4cd2` | `edebd1f438723f0f5982a5e133c9c9f2d17f4945fb10c7721277626a2c6ee59e` | `200e9c70ea204eb6a3007749bf1abb80749f61c56edd687ff7a7e70531b89f2f` |
| 1.39 | `70173c1d55034865e42045d5adcb88d8e3f1fb228389fac4eb1b5f1a6390f710` | `70bf45400bfa5f52faaa23cb94e48ebd12b846044eaeb4af37184dec3fecb71a` | `be9dfe95ce43ba28d193c7496718b4418ab95e514a1069e31f8638724e5e1124` |

The three listed candidates are superseded review artifacts, not approved canonical
content. Chapter 1.37 failed the old temporal validator because `2165.8` was treated
as an opaque index beside a year-only 2165 state write. Chapter 1.39 also requires
astronomy acquisition/review for Kappa Ceti and identity resolution for Gamma Leporis
A under the existing extraction workflow. If `/tmp` artifacts are unavailable,
rerun the exact source-evidence and chapter-extraction workflow from the recorded
source bytes and verify the listed source fingerprints; do not reconstruct sealed
evidence from this task document.

## In scope

- Write and obtain acceptance for one ADR defining the calendar-precision syntax,
  range semantics, ordering suffix, chapter fallback, display-date eligibility, and
  reader presentation, explicitly superseding the conflicting accepted decisions.
- Replace the shared schema, TypeScript date parser/comparators, narrative-moment
  comparator, validation, projection, meaningful-date selection, generated-world
  handling, and source diagnostics atomically.
- Audit every date comparison call site and classify it as fact-to-fact, fact-to-
  display-date, serialization, axis positioning, or reader formatting.
- Introduce one shared date formatter and use it on every reader-visible narrative
  date surface, including accessible labels.
- Preserve reader-order spoiler gating independently from story-time comparison.
- Migrate all canonical narrative date values to the new syntax, including every
  supported top-level precision correction from the Chapter 1.1–1.39 source audit
  and any non-top-level opaque ordering values that must remain suffixes.
- Produce a temporary, sealed, source-backed Chapter 1.1–1.39 top-level date audit
  table outside version control.
- Reprepare, reconcile, and validate Chapters 1.37–1.39 as one ordered candidate
  chain, preserving all extraction evidence, mention accounting, and unresolved
  editorial questions.
- Complete any required isolated astronomy staging and ADR-0023 independent review
  for the exact Chapter 1.37–1.39 candidate chain before presenting the final diff.
- Keep Gamma Leporis A explicitly unmapped unless exact normalized identity resolution
  succeeds under ADR-0016 or the Captain separately and explicitly approves the
  non-exact system identity. ADR-0023 refresh review cannot grant identity authority.
  An explicitly unmapped candidate is an acceptable task outcome; an approved mapping
  requires its own identity authority before acquisition and remains distinct from
  candidate quality approval and canonical application authority.
- Update directly affected integrated design, data-model, extraction, editor, UI,
  and validation documentation in the same atomic change.
- Present one exact combined schema, runtime, documentation, canonical-date,
  candidate, and astronomy diff for review before applying any canonical book data.

## Out of scope

- Auditing or changing event, birth, death, appearance, update, or other non-top-level
  source dates merely because their containing chapter source is open.
- Inferring a month or day from elapsed time, neighboring chapters, model memory,
  astronomy, chapter order, or any source passage outside the explicit chapter
  heading/opening-scene boundary.
- Displaying the ordering suffix or converting it into elapsed time.
- Adding clock times, timezones, durations, seasons, quarters, approximate-date flags,
  or another calendar system.
- Changing reader-order spoiler visibility, canonical chapter identity, or the
  `furthestChapterRead`/`viewChapter` ownership model.
- Retaining the old `YYYY.d+`-only interpretation as a compatibility contract.
- Committing source book text, source files, evidence excerpts, claim ledgers,
  temporary candidates, audit reports, generated worlds, or staging checkouts.
- Treating task implementation authority, candidate quality approval, or astronomy
  review as canonical application authority.

## Acceptance criteria

1. A new Accepted ADR defines `YYYY[-MM[-DD]][.d+]`, Gregorian component validity,
   effective suffix zero, overlap ordering, final chapter fallback, display-date
   eligibility, presentation, and clean-break migration, and explicitly supersedes
   the conflicting parts of ADR-0002, ADR-0009, and ADR-0013.
2. The published schema accepts valid year, month, day, and optional-suffix forms;
   rejects invalid padding, zero or non-four-digit years, invalid months, impossible
   days, invalid leap days, malformed suffixes, JSON numbers, and legacy-invalid
   spellings; semantic validation supplies actionable source locations.
3. Non-overlapping calendar ranges order chronologically. Overlapping unequal-
   precision chapter-authored facts use canonical chapter order. Identical calendar
   portions compare missing/`.0` as zero, then suffix, then canonical chapter.
4. State validation/projection, appearances, events, activity, browser recency,
   last-known locations, travel history, and every other fact-to-fact consumer use
   the shared narrative-moment contract without UI-local chronology.
5. Fact-to-display-date eligibility remains independent of chapter order and follows
   the complete range rule: earlier non-overlap is eligible, later non-overlap is not,
   identical calendar portions compare effective suffixes, display containment is
   eligible, and fact containment is not. Tests cover `2165`/`2165-08`/`2165-08-17`
   in both unequal-precision directions plus missing/`.0`/positive suffixes.
6. Every reader-visible narrative date uses one shared English formatter: `2165`,
   `August 2165`, or `17 August 2165`. Ordering suffixes are absent from visible and
   accessible text.
7. The Date-mode axis uses the exact start-of-range formula and Gregorian year length:
   year-only values occupy January 1, month values occupy day 1 of that month, day
   values occupy their day start, and all suffix variants share that coordinate.
   Focused tests cover a common year, leap year, February 29, and year boundary.
8. A sealed temporary audit accounts for Chapters 1.1–1.39 exactly once and records
   each explicit external source path and fingerprint, bounded heading/opening
   evidence, previous date, proposed date, `value_result`, and `precision_result`.
   Every proposal except the documented Chapter 1.1 retention is supported by that
   boundary; the audit records that sole Captain-approved exception without invented
   evidence; same-precision corrections are representable; and no non-top-level field
   changes through this audit. Missing, invalid, or mismatched inputs fail closed and
   set the task to `Blocked`.
9. The five reviewed 2158 month values migrate to `2158-01`, `2158-03`, `2158-09`,
   `2158-09`, and `2158-10` in Chapters 1.31, 1.33, 1.34, 1.36, and 1.32
   respectively. All other canonical migrations match the approved audit.
10. Fresh Chapter 1.37–1.39 candidates reconcile in order against the audited chain,
    use `2165-08`, `2158-11`, and `2165-10`, preserve immutable evidence and complete
    mention accounting, and pass the required narrative and data validators in a
    temporary corpus.
11. Astronomy preflight and any required isolated acquisition staging follow
    ADR-0016, ADR-0023, and `chapter-extraction.md`; any changed candidate snapshot
    receives a fresh ADR-0023 independent review and no unrelated astronomy drift is
    accepted. Gamma Leporis A remains explicitly unmapped unless an exact automatic
    match succeeds or the Captain separately approves the non-exact identity; refresh
    review, candidate approval, and canonical application do not imply that authority.
12. Focused unit and integration coverage proves Gregorian parsing, leap years,
    suffix normalization, range overlap, chapter fallback, calendar order, display-
    date eligibility, formatting, axis placement, state writes, sightings, activity,
    travel history, and representative canonical regressions.
13. Runtime persistence uses only `bobiverse.app-state.v2`, removes only the exact v1
    key, migrates no v1 fields, and initializes ordinary v2 defaults. Regression tests
    cover a populated v1 state containing `2158.9`, valid v2 state, malformed v2
    dates, year-only v2 state, and preservation of unrelated local-storage keys.
14. The integrated technical design, data-model definition, extraction guide,
    repository-local extraction skill, desktop UI design, visual-testing guide, and
    affected operator guidance agree with the accepted ADR and expose the complete
    editor rule without rewriting historical ADRs or completed-task evidence.
15. One exact combined diff and review package shows the accepted ADR, source audit,
    migration, candidates, evidence hashes, validation output, astronomy review,
    unresolved items, and all canonical effects before application.
16. Canonical chapter files, astronomy snapshots, and the promotion log remain
    unchanged until the Captain explicitly approves and asks to apply that exact
    combined diff. After authorized application, all standard validation passes and
    append-only promotion records capture the affected chapter hashes and material
    date decisions.
17. All documented automated validation commands pass, required remote visual
    acceptance passes, and a fresh independent implementation review reports
    `No findings.`

## Validation commands

Before any canonical application, validate the exact temporary narrative and
astronomy result:

```bash
python3 scripts/tasks.py check
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /absolute/path/to/temporary/narrative-root
npm run data:validate -- \
  --narrative-root /absolute/path/to/temporary/narrative-root
npm run narrative:generate -- \
  --root /absolute/path/to/temporary/narrative-root \
  --chapter 1.39 \
  --output /tmp/bobiverse-bob-20260804-jssm85-world-1.39.json
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

After the Captain explicitly authorizes the exact combined canonical application:

```bash
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm run narrative:generate -- \
  --chapter 1.39 \
  --output /tmp/bobiverse-bob-20260804-jssm85-canonical-world-1.39.json
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
python3 scripts/tasks.py check
git diff --check
```

Manual acceptance from a remote workstation in a real supported browser:

1. Start the trusted-LAN development server on `0.0.0.0:5173` with strict-port and
   exact permitted-host behavior.
2. Inspect representative year, month, and day chapter dates in Chapter and Date
   modes on wide and compact layouts.
3. Confirm `2165`, `August 2165`, and `17 August 2165` formatting, truthful within-
   year start-of-range placement, same-coordinate suffix clustering, hidden suffixes,
   accessible labels, spoiler-ceiling behavior, and deterministic navigation.

## Documentation and generated artifacts

- Add one new ADR; do not edit historical accepted ADR decisions.
- Update `../technical-design.md`, `../data-model-definition.md`,
  `../chapter-extraction.md`, `../design/phase-2-desktop-ui.md`,
  `../visual-testing.md`, the repository-local extraction skill, versioned persisted-
  state documentation, and directly affected operator guidance.
- Update the implementation plan only if the accepted ADR changes a phase boundary;
  otherwise leave historical roadmap wording intact.
- Keep source files, evidence ledgers, review excerpts, audit tables, candidates,
  temporary corpora, astronomy staging checkouts, generated worlds, browser traces,
  screenshots, and videos outside version control except failed Playwright artifacts
  already governed by repository policy.
- After authorized canonical application and successful post-write validation,
  append promotion-log rows without modifying historical rows.

## Risks and cautions

- Treating the non-semantic start-of-range axis anchor as the occurrence date would
  invent chronology. A vague year still represents the complete year, not January 1;
  overlap fallback belongs only to two chapter-authored facts, and display-date
  eligibility must remain determinate without a synthetic chapter.
- A date regex cannot enforce Gregorian day validity by itself. Schema and semantic
  validation must agree, and every consumer must use the shared parser.
- Lexical sorting fails for optional precision and suffixes. No consumer may sort raw
  date strings.
- `.0` and an omitted suffix are order-equivalent but not necessarily byte-identical;
  canonical formatting and equality tests must distinguish representation from
  ordering semantics deliberately.
- Migrating top-level chapter dates changes the effective date of introductions,
  updates, appearances, chapter locations, and generated activity. The audit must
  inspect all resulting state-write, event, activity, location, and Date-mode effects
  even though it edits only top-level fields.
- Chapter order can resolve overlapping source precision for chapter-authored facts,
  but it must not override non-overlapping calendar order or an unequal suffix on an
  identical calendar portion.
- Month/day UI placement can reveal hidden precision if derived before reader-safe
  projection. All date options and labels must originate from the selected prepared
  corpus.
- The Chapter 1.39 candidate introduces astronomy work. Narrative acceptance must not
  bypass exact-identity, acquisition, checksum, or independent-review requirements.
- The source audit spans copyrighted text. Never commit or log source prose, and do
  not send it outside the Captain-approved extraction workflow.
