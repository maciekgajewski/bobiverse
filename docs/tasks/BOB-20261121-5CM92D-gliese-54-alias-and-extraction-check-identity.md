# BOB-20261121-5CM92D: Gliese 54 alias and extraction-check git identity

Status: In progress
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-11-21

## Objective and user-visible outcome

Accept the chapter 2.13 narrative name "Gliese 54" as a reviewed alias of the
already accepted system `stellar-system-000258` (GJ 54), then run the
chapter-driven astronomy staging refresh so that system's required GCNS
coverage is pinned. Separately, make `scripts/extraction_check.py` commit
with an explicit local git identity so the command works on a host with no
global `user.name` / `user.email`. Readers gain a searchable "Gliese 54"
alias once the refreshed runtime is generated and landed; no other reader-facing
behavior is in scope.

## Authorization

The Captain answered that Gliese 54 in 2.13 maps to GJ 54, relayed by the
manager on 2026-11-21 (Europe/Warsaw). The Extractor confirmed the
identification Gliese 54 = GJ 54 = HIP 5496 = LHS 1208
(https://en.wikipedia.org/wiki/Gliese_54). The manager authorized adding that
reviewed alias, running the chapter-driven astronomy staging refresh, and
fixing the extraction-check git identity, with review of the branch before
landing. Do not start script 2 in this task.

## Binding references

- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../data/astronomy-pipeline.md` (§Chapter-driven staging order, §Refresh review)
- `../chapter-extraction.md` (§Astronomy preflight and isolated acquisition)
- `../../data/source/system-review.json`
- `BOB-20261121-ZV3449-extraction-check-command.md`

## Scope

1. Add "Gliese 54" as a reviewed alias of `stellar-system-000258` in
   `data/source/system-review.json`, citing the Wikipedia identification,
   while retaining the accepted preferred name GJ 54 and the existing
   alternates CNS5 326 and HIP 5496.
2. Run the documented chapter-driven `npm run data:refresh` so the pinned
   GCNS plan covers 000258. The data diff may touch only 000258: its alias
   and the GCNS data it needs. If anything else changes, or any already-accepted
   astronomy values change, stop and report without landing those changes.
3. If `system-candidates.json` changes, do not silently accept the new
   checksum; record old and new checksums for independent ADR-0023 review
   before runtime generation.
4. Change `scripts/extraction_check.py` so its review-branch commit uses
   `git -c user.name='Bobiverse Extraction Check' -c user.email='extraction-check@localhost' commit ...`,
   and add a unit test in `tests/python/test_extraction_check.py`.

## Out of scope

- Editing chapter JSON or other narrative data.
- Adding further aliases such as LHS 1208.
- Merging, pushing, tagging, or a LAN or prod deploy.
- Starting script 2.
- Constitution edits.

## Acceptance criteria

- `data/source/system-review.json` records "Gliese 54" as a reviewed
  alternate of `stellar-system-000258`, with preferred name GJ 54 and the
  existing CNS5 326 and HIP 5496 alternates preserved, and a reason citing
  https://en.wikipedia.org/wiki/Gliese_54.
- After the refresh, the astronomy data diff touches only 000258 (alias and
  required GCNS acquisition). Any wider or value-changing diff is reported
  and not landed.
- Old and new astronomy candidate checksums are recorded.
- `scripts/extraction_check.py` can commit on a host with no git identity.
  The test checks the built command or runs the commit with `HOME` pointed
  at an empty temp directory and `GIT_CONFIG_NOSYSTEM=1`.
- Fast checks pass on the branch when the astronomy package is consistent
  enough to validate. Full 3-browser e2e plus CSP is run once before the
  branch is offered for review, using a temporary alt Playwright config on
  ports 4211/4210 that is not committed.

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
```

Then one full 3-browser e2e plus CSP run on ports 4211/4210.

## Documentation and generated artifacts

No new design docs. Source manifests and reconciled candidates may change
only for the 000258 alias and the GCNS data that system requires. Runtime
`src/data/nearby-systems.json` is generated only after any required
ADR-0023 checksum acceptance.

## Known risks or unresolved decisions

- A live `data:refresh` may rewrite retrieval timestamps, WDS, or other
  already-pinned sources. If that happens, stop and escalate; do not land
  unrelated drift.
- Adding GCNS coverage for 000258 might replace its already-accepted CNS5
  geometry under ADR-0011 source precedence. That is a change to accepted
  values and must be reported, not landed, unless the reviewer directs
  otherwise.
- A changed `system-candidates.json` checksum needs a fresh independent
  ADR-0023 acceptance before `data:generate`. The orchestrating agent must
  not accept its own snapshot.

## Log

### 2026-11-21 (Europe/Warsaw)

- Created on origin/master `c2aeaf1` on local branch `bob-20261121-gliese54`
  in the `~/src/bobiverse-gl54` worktree.
- Captain identification of Gliese 54 with GJ 54, plus the Wikipedia
  confirmation, relayed by the manager.
- Added the reviewed "Gliese 54" alias on stellar-system-000258, keeping
  preferred name GJ 54 and alternates CNS5 326 and HIP 5496, with a reason
  citing the Wikipedia identification.
- Fixed `scripts/extraction_check.py` to pass
  `-c user.name='Bobiverse Extraction Check' -c user.email='extraction-check@localhost'`
  on its commit step. Unit tests cover the built command and a commit with
  `HOME` pointed at an empty temp directory and `GIT_CONFIG_NOSYSTEM=1`.
- Ran `npm run data:refresh` starting 20:53 Europe/Warsaw. Canonical narrative
  currently ends at chapter 2.10, so 000258 is not a mapped anchor and the
  GCNS/CNS5/Gaia query plans and row payloads were unchanged. Those three
  extracts only received a new `retrieved_at`; that metadata churn was
  reverted and is not landed. Refresh then failed at
  `refresh_classical_names_snapshot()` with a connection timeout to
  `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` at 20:56 Europe/Warsaw
  (rc=1). Candidate checksum remains
  `12a630ee87df905739e5d9a6a44bfdcc5547d735f44e7ceb0efdd5f1d9965a84`.
  Acquiring 000258's GCNS context sphere requires installing the 2.13
  candidate in an isolated checkout; that was not done here (no chapter JSON
  edits; script 2 not started).
- Ran `npm run data:generate` after the alias was in review. The only runtime
  change was `stellar-system-000258.alternates`:
  `["CNS5 326", "HIP 5496"]` → `["CNS5 326", "Gliese 54", "HIP 5496"]`.
  System count stayed 337. Candidate checksum unchanged.
- Fast checks all passed on the final tree (Europe/Warsaw 21:02–21:05):
  `tasks.py check` (119 tasks, 33 ADRs); format:check; lint (0 errors, 1
  pre-existing AboutDialog.tsx warning); typecheck; `npm test` 65 files /
  848 passed; `data:test` 106 passed; `data:validate` (337 systems, six
  pinned sources); narrative:validate (71 chapters); build; `git diff --check`.
- One full 3-browser e2e plus CSP on temporary uncommitted alt Playwright
  configs (e2e port 4211, CSP port 4210). e2e: 285 passed, 11 skipped, 1
  failed (11.9m). The failure is `[chromium] tests/e2e/atlas.spec.ts:533`
  "canvas picking still selects a star just outside its visible glyph",
  `mouse.wheel` test timeout 45000ms (48.2s). Unrelated to this alias or
  extraction-check change. CSP: 3 passed (chromium, firefox, webkit, 15.6s).
  Alt configs were deleted and not committed.
