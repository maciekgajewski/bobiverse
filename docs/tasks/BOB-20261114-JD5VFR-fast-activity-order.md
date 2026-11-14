# BOB-20261114-JD5VFR: fast narrative activity ordering

Status: In progress
Phase: 2 (narrative foundation and chapter timeline; responsive shell)
Last updated: 2026-11-14

## Objective and user-visible outcome

Switching chapters is slow, and it gets steeply slower in later chapters. Profiling
the deployed build `3c3d368` showed that about 97% of a switch goes to
`orderNarrativeActivity` in `src/narrative/model.ts`: a repeated-scan sort that is
roughly cubic in the number of activity records and re-parses both date strings on
every comparison. It runs on every `generateNarrativeWorld` call and again in
`meaningfulNarrativeDateOptions` on the first visit of a chapter. At Chapter 1.50
(739 records) a switch cost about 2 s on desktop and about 9 s on a 4x-throttled
phone profile.

After this task, a chapter switch spends milliseconds on activity ordering, and the
order of every activity list is exactly the same as before. Nothing else that the
reader sees changes.

## Authorization

- Piotr Developer Manager authorised the fix as routine in-design work with no
  behaviour change on 2026-11-14 at 18:02 (Europe/Warsaw), after reviewing the
  profiling results: "Option 1 first: cache date and chapter parsing, use a
  topological sort with the same tie-break, and share the result between both
  callers", with an old-versus-new identical-order test for every chapter and the
  performance test moved to switch around 1.50↔1.61 with a budget that would have
  caught this. It goes on its own local branch with a SHA for review, and is
  deployed under the standing OK after review.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`
- `../technical-design.md`
- `../visual-testing.md`, "Production chapter-transition performance" (updated by
  this task)
- `BOB-029-responsive-chapter-projection-pipeline.md` (the chapter-transition
  benchmark and its 100 ms median / 150 ms maximum budget)

## Scope

1. `src/narrative/model.ts`:
   - Memoize parsed chapter IDs and parsed date ranges by their string. Invalid
     dates still throw and are never cached. `compareNarrativeChapters`,
     `compareNarrativeDates` and `compareNarrativeMoments` keep their signatures
     and results and use the cached forms.
   - Replace the repeated scan in `orderNarrativeActivity` with Kahn's
     topological sort: count each record's predecessors once, then repeatedly emit
     the ready record that is first under the unchanged `activityStableTieOrder`,
     with the input position breaking exact ties, as the old stable sort did.
   - Split the unordered collection out of `generateNarrativeActivity` as
     `collectNarrativeActivity`, and cache the ordered activity per knowledge
     chapter in the prepared-corpus indexes. `generateNarrativeWorld` gets a deep
     copy of the cached list; `meaningfulNarrativeDateOptions` reads it directly.
   - `orderNarrativeActivity` and `collectNarrativeActivity` are exported for the
     equivalence test only.
2. `tests/unit/narrative-activity-order.test.ts` (new): keeps the old algorithm
   and its date and chapter comparators as a reference implementation and asserts
   an identical order for every chapter of the real corpus, both from
   `orderNarrativeActivity` and from `generateNarrativeWorld`. It also covers
   undated records, the precedence cycle error, input-order independence and the
   copy that each world gets.
3. `tests/performance/chapter-transition.spec.ts`: adds a late pair that seeds
   reading through 1.61 with 1.50 selected and alternates 1.50↔1.61, with a median
   budget of 250 ms and a 400 ms maximum. The early 1.10↔1.11 pair keeps BOB-029's
   100 ms / 150 ms budget, so the accepted budget is not weakened. Seeding now goes
   through `sessionStorage` and a reload so that one page can visit both pairs.
4. `docs/visual-testing.md`: the chapter-transition section describes the new
   chapters and budget.

## Out of scope

- Skipping `assertProjectedLocationConstraints` in production builds (side
  finding (a), a separate task) and the other page-load cost (side finding (b)).
- Any change to data, schemas, projection results, ordering rules or UI.

## Equivalence argument

The old loop emits, at each step, the `activityStableTieOrder`-first record (input
position breaking exact ties, since `Array.prototype.sort` is stable and
`remaining` keeps input order) among the remaining records that no other remaining
record definitively precedes. Kahn's algorithm tracks, for each record, the number
of remaining records that precede it, which is exactly that condition, and its
priority queue uses the same order with the same position tie-break. Neither needs
the precedence relation to be transitive: both only ever ask whether some remaining
record precedes a candidate. When no record is ready while records remain, both
throw `Narrative activity ordering contains a cycle.` The real-corpus test checks
the result for every chapter.

## Acceptance criteria

1. For every chapter in the corpus, the new activity order equals the reference
   implementation's order, and `generateNarrativeWorld(...).activity` equals it.
2. `generateNarrativeWorld` for 1.50 or 1.61 takes milliseconds rather than
   seconds in Node.
3. The production chapter-transition benchmark alternates 1.50↔1.61 and passes its
   budget on the new code; the old code fails it. The 1.10↔1.11 pair still passes
   BOB-029's budget.
4. All validation commands below pass.

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
npx playwright test --project=chromium --workers=1
npx playwright test --project=firefox --workers=1   # via xvfb-run, as npm run test:e2e does
npx playwright test --project=webkit --workers=1
npm run performance
npx prettier --check <changed Markdown>
git diff --check
```

Manual: the Captain switches between early and late chapters on desktop and on a
phone after deployment and checks that the switch feels immediate and that the
object browser, timeline and Date-mode date list look the same as before.

## Risks and decisions

- **Cache growth.** The date and chapter caches hold one entry per distinct string
  seen, which is bounded by the corpus vocabulary plus any stored display date.
- **Shared activity.** The cached activity list is frozen; each generated world
  gets its own deep copy, so mutating a world cannot leak into another.
- **Reference test cost.** The reference scan memoizes its pure precedence
  predicate per record pair so that checking all chapters takes seconds.

## Log

### 2026-11-14 (Europe/Warsaw)

- Created on origin/master `c8ce3cc` after the manager's authorisation of
  2026-11-14 18:02.
- Implemented and validated on piotr. The real-corpus test matches the reference
  order for all chapters (about 6.6 s for the whole file). Full validation passed,
  including e2e in chromium, firefox and webkit with one worker and no retries; a
  first webkit run timed out once in the backdrop test while the machine was under
  heavy load from other jobs (load average about 13), and the full webkit rerun
  passed.
- Production benchmark on piotr (chromium, medians, 10 samples): new code 1.10↔1.11
  60 ms / 56 ms and 1.50↔1.61 117 ms / 119 ms (maximum 198 ms), so it passes;
  `c8ce3cc` with the new benchmark 1.10↔1.11 79 ms / 69 ms but 1.50↔1.61
  3,024 ms / 3,234 ms (maximum 5.2 s), so it fails the late budget. With 4x CPU
  throttling (an untracked one-off variant, 4 samples), 1.50↔1.61 took about
  0.39 s / 0.43 s on the new code against about 12.3 s / 11.5 s on `c8ce3cc`.
