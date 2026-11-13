# BOB-20261113-JRV53G: merged-text sentence-preservation check

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline; process hardening)
Last updated: 2026-11-13

## Objective

Under the new chapter flow (the Captain's decision of 2026-11-13 21:43 CET, relayed
by the manager; PR #27), chapters arrive as data-only PRs without per-chapter
regression facts or promotion-log rows. The generic validators stay, plus one new
safety net the manager asked for: when a chapter writes a merged prose field, it
keeps every sentence of the earlier canonical value visible for that field. Before
this check, a 1.56 candidate dropped 1.51's EE-2 seed-transport sentence and a 1.58
candidate reworded 1.42's VR opening sentence, and nothing caught either.

The same PR makes `scripts/chapter_promotion.py` stop writing promotion-log rows.

## Binding references

- `../adrs/0028-backdated-updates.md`: decision (c), chapter view takes the
  latest-read chapter's write; "Merge: (a) keep full merged texts".
- `../chapter-extraction.md` §Descriptions (full-field update rule for
  `description`; `current_state` holds only the latest known condition),
  §Post-write validation.
- PR #27 (`bob-20261113-7gwnfc-chapter-flow-process-docs`): the data-only chapter
  PR flow.

## Scope

1. `src/narrative/sentence-preservation.ts`: sentence splitting, the check,
   exception parsing and matching. Pure functions; projection never calls them.
2. `scripts/narrative-cli.ts validate` runs the check and fails on any write that
   no exception excuses.
3. `data/narrative/sentence-preservation-exceptions.json`: the reviewed opt-out
   list. It starts with the writes already on master that fail the check, each with
   the reason "pre-existing, predates check".
4. `scripts/chapter_promotion.py`: `promote` no longer reads or appends the
   promotion log and prints the provenance for the data PR body instead (full
   40-hex approved-chapters commit); `verify` no longer needs the log and only
   counts historical rows when the log exists.
5. Tests: `tests/unit/sentence-preservation.test.ts` and the updated
   `tests/unit/chapter-promotion.test.ts`.

## Out of scope

- Any canonical chapter data change.
- Canonical process wording that belonged to PR #27 was left unchanged until #27
  merged; this PR now updates it after merging `10e1871`.
- Zero-state values: only chapter-authored writes are compared.

## Design

- **Earlier value.** For each chapter in reading order, the earlier value of an
  entity field is the write of the latest-read earlier chapter, which is what
  chapter view shows just before that chapter (ADR-0028, decision (c)). Within one
  chapter, the story-date-latest write is the chapter's write. Introductions and
  updates both count.
- **Fields and policy.** `description` and `visual_description` are always checked
  (§Descriptions full-field update rule). `state` and `current_state` are checked
  only when the new write's story date (`effective_date ?? chapter date`) is not
  later than the earlier write's: earlier, the same date, or an overlapping date
  of different precision. That is the ADR-0028 case, where a later-read but
  earlier-dated write
  would otherwise hide what is known; the 1.56 EE-2 write is one. A later-dated
  `state` or `current_state` write is the new latest condition, which §Descriptions
  says replaces the old one. Checking those always would flag 116 more `current_state` and 10 `state` writes on master, plus 20 `current_state` writes in the 1.54–1.58 candidates alone. The policy is one constant, `sentencePreservationPolicy`, if the Captain wants it
  stricter.
- **Sentence rule.** A sentence ends at a run of `.`, `!` or `?`, with any directly
  following closing quotes or brackets, when whitespace or the end of the text
  follows. A single full stop does not end a sentence after a single letter or a
  dotted run of single letters (initials, `U.S.`), or after a listed abbreviation
  (`approx`, `ca`, `cf`, `Dr`, `e.g`, `etc`, `i.e`, `Jr`, `Mr`, `Mrs`, `Ms`, `Mt`,
  `No`, `Prof`, `Sr`, `St`, `vs`). A decimal point is never followed by whitespace,
  so it never splits. Sentences are trimmed with whitespace collapsed, and each
  earlier sentence must equal one sentence of the new write. On master, none of the
  failures is a splitting artefact: no missing sentence occurs verbatim anywhere in
  the new text.
- **Opt-out.** A small allowlist file rather than a field-level marker: chapter
  updates are open property bags whose keys become entity fields, so a marker would
  need schema and projection changes, and the brief forbids touching data for the
  pre-existing cases. One entry (`chapter`, `entity_id`, `field`, `reason`) excuses
  one chapter's write to one field. An entry that excuses nothing fails validation
  of the root that owns the file, so the list cannot go stale. A candidate root
  built by `prepare-corpus` has no copy, so it uses the canonical file.
- **Where it runs.** In `narrative:validate`, which is the one validator run on the
  canonical corpus (build, CI, §Post-write validation) and on candidate roots
  (extraction preflight, `chapter_promotion.py promote`). It is not in
  `prepareNarrativeCorpus`, because that also runs in the browser, which has no
  exceptions file and must never fail at runtime over an editorial rule.
- **Errors.** Each failure names the file, line and column of the write, the
  chapter, JSON pointer, entity, field, the earlier chapter, the missing sentence's
  1-based index and count, and its first eight words.

## Acceptance criteria

1. `npm run narrative:validate` passes on master data with the exceptions file, and
   fails when an entry is removed or a stale one is added.
2. The old 1.56 and 1.58 candidates fail with the EE-2 state and VR description
   errors.
3. `promote` writes no log row and works with the log missing or damaged; `verify`
   works without the log.
4. Full validation passes.

## Validation

`python3 scripts/tasks.py check`, `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm run test`, `npm run data:test`, `npm run data:validate`,
`npm run narrative:validate`, `npm run build`, `prettier --check` on changed
Markdown, `git diff --check`. No UI code changes, so no e2e.

## Log

### 2026-11-13 (Europe/Warsaw)

- Created and moved to In progress on the manager's request (relaying the 21:43 CET
  process change). Branch `bob-20261113-jrv53g-sentence-preservation-check`, from
  origin/master `90dab38`, rebased (unpublished) onto `a7017da` (PR #26) before the first push.
- Pre-existing failures on master: 39 missing sentences in 28 writes (27
  `description`, 1 `current_state`), all added to the exceptions file as
  "pre-existing, predates check".
- Checked read-only against the closed 1.54–1.58 candidates (PR #25 branch, v1):
  the check fails 1.56 `location:ee-2.state` (sentences 1 and 2 of 1.51's three),
  1.58 `technology:vr.description` (sentences 1 and 5 of 1.42's seven) and 1.55
  `species:delta-eridani-natives.description` (sentence 9 of 1.53's 14).
- Review nits after approval of `7a74b46`: equal same-precision `state` /
  `current_state` dates are now checked (skip only when the new write is strictly
  later); added equal-date and `visual_description` tests. Status stays In progress
  until merge: a Done task's Log must cite the merge commit SHA. The tighter date
  rule newly flags 13 missing sentences in 9 pre-existing `current_state` writes,
  all equal-date (comparison 0), added to the exceptions file as "pre-existing,
  predates check": 1.13 `character:bob-replicant`, 1.16 `character:bob-replicant`,
  1.26 `character:riker`, 1.26 `character:homer`, 1.30 `character:bob-replicant`,
  1.51 `character:milo`, 1.53 `character:bob-replicant`, 1.53 `character:marvin`,
  1.53 `character:archimedes`.
- After #27 merged as `10e1871`, merged `origin/master` and updated the stale
  process-doc lines: the sentence-preservation check now runs in
  `narrative:validate`; `promote` prints provenance for the PR body and no longer
  appends a log row (`chapter-extraction.md`, `chapter-promotion-log.md`, and the
  matching checklist item).
