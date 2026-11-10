# BOB-20260805-XHVN3V: enforce refreshed runtime provenance integrity

Status: Done
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-11-10

## Objective

Make the astronomy refresh, snapshot-acceptance, and runtime-generation path
systematically prevent a generated runtime catalogue from retaining stale WDS
provenance after the refreshed WDS candidate manifest changes.

## User-visible outcome

Chapter-driven astronomy acquisition either produces one internally consistent,
reviewable source-and-runtime package or stops with an actionable diagnostic before
promotion. Once the package passes independent review, the already approved Chapter
`1.40` through `1.42` candidate chain can be promoted without weakening provenance,
identity, or astronomy-authority checks.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, astronomy authority and generated-runtime contracts
- `../implementation-plan.md`, Phase 2
- `../data/astronomy-pipeline.md`
- `../chapter-extraction.md`, staged chapter-driven astronomy acquisition
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`
- `BOB-030-mapped-anchor-bootstrap-integrity.md`
- `BOB-20260802-4HD54D-stage-chapter-astronomy-acquisition.md`

This task does not change catalogue authority, stable identities, coordinate
precedence, the ADR-0023 review boundary, or the exact approved chapter candidates.

## Root-cause evidence

- The exact approved Chapter `1.40` through `1.42` chain passes narrative validation.
- Chapter `1.40` adds the exact Epsilon Indi anchor
  `stellar-system-005631`, requiring staged GCNS acquisition.
- The staged refresh produced an independently reviewed, otherwise permitted
  candidate delta from value checksum
  `c4a53384393861da48a5033b4ff5117fc7cb1591491ffb127bede72a695781d5` to
  `0871608839059501eb0036903b2070fd5b93306f6b61c0ef047805c7085b5be9`.
- The refreshed WDS manifest records 3,430 candidates and checksum prefix
  `f274a653`, while the runtime inspected before refreshed-snapshot acceptance still
  retained the previous 3,428 rows and checksum prefix `d309dfd2`.
- `scripts/validate_data.py` correctly rejects that package because generated WDS
  provenance must equal the pinned manifest.
- The independent ADR-0023 reviewer found no prohibited identity, membership,
  naming, adopted-component, source-authority, accepted-WDS, ambiguity, or
  coordinate change, but rejected the complete package as internally stale.
- The staging instructions combined refresh and generation before their later
  fail-closed acceptance gate, making it possible to treat a legitimately stale
  pre-acceptance runtime as part of the candidate-snapshot review. The generator
  already refuses an unaccepted candidate checksum; the permanent repair makes the
  ordering explicit and adds direct generation-time provenance assertions.

## In scope

- Reproduce and identify the exact refresh/acceptance/generation ordering or data-flow
  defect that permits stale WDS runtime provenance.
- Make the normal staged workflow fail before writing inconsistent runtime data or
  regenerate it deterministically from the accepted refreshed source snapshot.
- Add focused regression coverage for changed WDS candidate count and checksum
  propagation into runtime source metadata.
- Preserve fail-closed acceptance of changed `system-candidates.json` under ADR-0023.
- Update directly affected pipeline and chapter-staging documentation.
- Rebuild the Epsilon Indi staged astronomy package, obtain a fresh independent
  ADR-0023 review, and validate the complete Chapter `1.40` through `1.42` chain.
- After the already approved candidate bytes and the corrected deterministic
  astronomy package pass all gates, present the exact combined chapter-and-astronomy
  diff and stop for the Captain's explicit approval.
- Only after that combined-diff approval, promote the three chapters and accepted
  astronomy package atomically and append their promotion-log rows.

## Exact approved chapter artifacts

The Captain approved these exact candidates on 2026-08-05:

| Chapter | Sealed ledger | Approved candidate |
| --- | --- | --- |
| `1.40` | `/tmp/bobiverse-1.40-pass1.yzTYZX/output/sealed-ledger.json` (`42cd0ce8af51c3e9ec88f3a27d7e9d192a78079a0fe490448d721f23489b169b`) | `/tmp/bobiverse-1.40-pass2/candidate.json` (`3b22a788f1419154182f4df7b2d351ad9814db1a389b6b823c0709a7d3d56dfb`) |
| `1.41` | `/tmp/bobiverse-1.41-pass1.vWBpte/output/sealed-ledger.json` (`a953dda833db9a2c5b4498cc7ae1c7d974ea424ccb09ae572994906ef991605b`) | `/tmp/bobiverse-1.41-pass2/candidate.json` (`a58d7de9fa40b476e3dbc9bedd84df3f7fa3ed7a08c09a270104ab8e3f0e50e0`) |
| `1.42` | `/tmp/bobiverse-1.42-pass1.Tb51Io/output/sealed-ledger.json` (`9c5112bca06f063db2502c0d49924e7988d51375b68a57b964a53eaddcf30688`) | `/tmp/bobiverse-1.42-pass2/candidate.json` (`cb3b1aff0260bca40ee3b498d6cac36dd1fc2d9629d5c05468209d02c5d79db1`) |

These paths are temporary operational inputs and must not enter version control. If
any artifact is absent or its SHA-256 differs, stop and rerun the applicable sealed
chapter-extraction workflow; the replacement candidate requires fresh exact approval
before this task may resume staging or promotion.

## Out of scope

- Changing the Chapter `1.40`, `1.41`, or `1.42` candidate content.
- Accepting fuzzy astronomy matches, new identity judgments, membership changes,
  adopted-component changes, accepted WDS edges, or source-authority changes.
- Weakening or bypassing candidate-checksum, runtime-provenance, acquisition-query,
  or independent-review validation.
- Hand-editing downloaded source manifests, normalized extracts, candidate snapshots,
  or generated runtime metadata to force validation.
- Unrelated astronomy refresh drift or broader pipeline refactoring.

## Acceptance criteria

1. A focused regression reproduces the stale WDS provenance failure from changed
   candidate count/checksum inputs.
2. The supported workflow cannot successfully emit or retain runtime metadata whose
   WDS candidate count or checksum differs from the current pinned WDS manifest.
3. Runtime WDS provenance is derived from the exact accepted refreshed snapshot,
   without weakening the requirement that `system-review.json` accept the complete
   candidate checksum before generation.
4. The fix preserves stable IDs, identities, memberships, names, aliases, adopted
   components, source authority, explicit review decisions, and coordinate
   precedence.
5. Directly affected workflow documentation states the required refresh, independent
   acceptance, generation, and validation order unambiguously.
6. The refreshed Epsilon Indi source/candidate snapshot receives a fresh clean
   independent ADR-0023 review, including exact old/new checksums and a prohibited-
   change audit.
7. The regenerated runtime WDS count and checksum equal the refreshed manifest and
   the full staged narrative and astronomy validators pass.
8. The exact validated combined chapter-and-astronomy diff is presented to the
   Captain, and no canonical file is changed until the Captain explicitly approves
   that complete package.
9. Canonical Chapters `1.40`, `1.41`, and `1.42` are JSON-value-identical to the
   approved candidates; only standard whitespace formatting may differ. Canonical
   generated artifacts are current, and one promotion-log row per chapter records
   successful validation and the final canonical SHA-256.
10. No source text, evidence ledger, temporary candidate, or staging checkout enters
   version control.

## Validation commands

```bash
python3 scripts/tasks.py check
sha256sum \
  /tmp/bobiverse-1.40-pass1.yzTYZX/output/sealed-ledger.json \
  /tmp/bobiverse-1.41-pass1.vWBpte/output/sealed-ledger.json \
  /tmp/bobiverse-1.42-pass1.Tb51Io/output/sealed-ledger.json \
  /tmp/bobiverse-1.40-pass2/candidate.json \
  /tmp/bobiverse-1.41-pass2/candidate.json \
  /tmp/bobiverse-1.42-pass2/candidate.json
./.venv/bin/python -m unittest discover -s tests/python -p 'test_*.py'
npm run data:refresh -- --reconcile
npm run data:generate
npm run data:validate
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --chapter 1.42 --output /tmp/bobiverse-world-1.42.json
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

The live networked path runs separately in the disposable staging checkout:

```bash
npm run data:refresh
git diff -- data/source
# Stop for independent ADR-0023 review when system-candidates.json changes.
# After the accepted checksum and review attribution are recorded:
npm run data:generate
npm run data:validate
```

After refresh, verify that the WDS manifest's `candidate_row_count` and
`candidate_sha256` match its rows before snapshot review. After acceptance and
generation, verify those exact two values match the generated runtime WDS source
metadata; the focused regression and `npm run data:validate` are the executable
proofs. Preserve the complete staged `git diff -- data/source
src/data/nearby-systems.json` for the fresh independent review. The canonical
worktree receives only the exact combined package after all staged checks pass and
the Captain explicitly approves that final diff.

## Documentation and generated artifacts

- Update `docs/data/astronomy-pipeline.md` and `docs/chapter-extraction.md` where the
  supported ordering or integrity guarantee changes.
- Update the extraction skill only if its operational sequence changes.
- Regenerate `data/source` and `src/data/nearby-systems.json` only through the normal
  pipeline.
- Regenerate `generated/narrative/chapter-manifest.json` after canonical promotion.
- Append three rows to `docs/chapter-promotion-log.md` only after canonical validation.

## Risks and unresolved decisions

- Live catalogue metadata may drift during the fresh staged rerun. ADR-0023 permits
  metadata-only churn but requires independent rejection of unrelated substantive
  changes.
- The defect may be command ordering rather than generator logic. Implementation must
  repair the narrowest shared contract that prevents recurrence and must not add a
  second generation path.
- If the reproduction reveals an architecture or authority conflict, stop and record
  it rather than expanding this task silently.

## Log

### 2026-11-09

- Prepared PR-2 branch `chapters/40-plus` from the captured WIP at `84f73a9`.
- Updated `tests/unit/data.test.ts` for 277 systems: Chapter `1.40` maps Epsilon
  Indi (`stellar-system-005631`) as a neighbourhood anchor; its 20 ly ball adds six
  catalogue systems (Alpha Piscis Austrini, GJ 884, GJ 1286, GJ 13282, GJ 4274,
  GJ 667) that were outside all prior anchors.
- Cherry-picked PR #1 green fixes `89d9821`, `4365fe3`, `74c8252` so this branch
  validates independently; drop them when rebasing onto master after PR #1 merges.
- Noted documentation conflict: task lists approved candidate SHA
  `cb3b1aff...` for `1.42`, while the promotion log and canonical file SHA are
  `14d087b5...` (log says standard whitespace formatting). Original `/tmp`
  candidate is gone; file matches the promotion log byte-for-byte. Status remains
  Done for the provenance task itself; PR-2 does not extend extraction past `1.42`.

### 2026-11-10 (PR #3 preparation; Captain-approved 1.42 replacement)

- Saved the pre-existing uncommitted test/log work outside the repository in
  `~/bobiverse-pr3-backup/pre-rebuild.patch`; retained the old head on local branch
  `backup/pr3-pre-rebuild-2dfb4aa`. Rebuilt `chapters/40-plus` on `origin/master`
  `8c108a0` using only the chapters/astronomy WIP. The three PR #1 cherry-picks
  are dropped because the squash merge already includes them; the saved patch is
  restored. Nothing is pushed or published by this preparation.
- Superseding exact Chapter `1.42` approval: Maciej said
  **"Promote the Extractor's merged 1.42."** and
  **"No, leave the Original Bob mapping out."**
  Provenance is the Bobiverse Extractor's final candidate at
  `/home/grok-developer/extraction-scratch/1.42-verify/final/candidate.json`,
  independently retained in `~/bobiverse-approved-chapters` at commit
  `b6ff548974ecbb63d7a5388d5200bd92e403d173`, annotated tag
  `chapter-1.42-approved`, path `chapters/1.42/candidate.json`. Both copies and
  the tagged Git blob have the approved file SHA-256
  `8980ef57e99dbfa6b7c5f04db32fec7637cc5c88cc8d11a89fb45e1de3f7039f`.
- **NON-CONFORMING, explicitly Captain-approved:** own-model two-pass extraction,
  not the documented `gpt-5.6-terra` Codex model, then merged and reconciled.
  The Original Bob mapping (`/mentions/3`, `character:robert-johansson`) was omitted
  per Maciej. This is a recorded one-off approval, not a change to the extraction
  contract or permission to extract additional chapters using that workflow.
- This approval supersedes the earlier re-approval of file SHA-256
  `14d087b5b08d335c57e7ba34abe15136a0e5756e34decef6df90757b01fb9ffd`.
  That checksum is the old file's SHA-256, **not** a normalized/value checksum.
  `cb3b1aff0260bca40ee3b498d6cac36dd1fc2d9629d5c05468209d02c5d79db1`
  is the old file's indent-2 reformat. The historical artifact table above remains
  a historical record, not the current `1.42` application authority.
- Installed the final candidate byte-for-byte at
  `data/narrative/chapters/1/42.json`, then applied standard Prettier whitespace
  only: committed-file SHA-256 is
  `29da2c7f6a4bb65b88abd0947658234a0fb841e230d2f934870f0246685aa0e4`.
  JSON values are identical to the approved candidate; both hashes are recorded
  because `npm run format` would change its bytes.
- The 271 to 277 system count is caused by the new Chapter `1.40` Epsilon Indi
  anchor, `stellar-system-005631`, not arbitrary catalogue growth. Its 20 ly
  neighbourhood adds Alpha Piscis Austrini, GJ 884, GJ 1286, GJ 13282, GJ 4274,
  and GJ 667 beyond the prior union. The data test asserts the chapter's exact
  anchor mapping, catalogue identity, and coverage proof.
- The documented astronomy preflight diagnostic is
  `GCNS acquisition queries differ from the exact plan`
  (`scripts/validate_data.py`, around line 560). It is not bypassed: the validator
  and normal build gate remain unchanged. A follow-up task must resolve the exact
  acquisition plan rather than suppressing the check. Validation evidence below
  distinguishes this chapter/astronomy WIP from master instead of assuming master
  shares the failure.
- Historical preflight conflict is qualified by fresh evidence: the normal
  refreshed-branch `npm run data:validate` passes (277 systems), as does clean
  master `8c108a0` with its own canonical corpus (271 systems). The refreshed
  branch also passes with the prior corpus through `1.41` (before replacing
  `1.42`). The exact known failure is reproduced only in the additional diagnostic
  pairing master astronomy inputs with that staged prior-`1.41` narrative root:
  `ValueError: GCNS acquisition queries differ from the exact plan` at line 560.
  Thus the pre-existing prior-corpus failure is real in that unrefreshed staging
  context, but is not a failure of either coherent canonical checkout today.
  No guard was bypassed, source manifest hand-edited, or validator weakened.
  The follow-up must reconcile the reported source/root contexts and fix any
  remaining acquisition-plan defect, not assume canonical master currently fails.
  The general green-preflight promotion contract remains unchanged. **Done** is
  the inherited WDS repair status; publication, independent PR review, hosted CI,
  and Maciej's browser acceptance remain outside this local preparation.
- Maciej: **"Wait for the extraction docs and astronomy check fixes before 1.43."**
  Chapter `1.43` remains blocked on both follow-ups.


### 2026-11-10 (local validation; publication handoff)

- Node `22.23.1` / npm `10.9.8`: task check (56 files), format check, lint,
  typecheck, Vitest (240 tests / 29 files), Python data tests (79), astronomy
  validation (277 systems / six pinned sources), narrative validation (42 chapters),
  projections for `1.40`, `1.41`, and `1.42`, normal production build, and
  `git diff --check origin/master` all pass. The normal build includes the
  unmodified astronomy preflight; there is no bypass or known failing final gate.
- Full Playwright: **93/93 passed**, 31 each in Chromium, Firefox, and WebKit,
  with `CI=1 --workers=1 --retries=0`; no retry was used. Read the repository
  config first: it hardcodes 5173 with `reuseExistingServer: false` and has no
  environment port override. Used supported `--config` CLI override with a
  temporary, uncommitted wrapper at
  `~/bobiverse-pr3-backup/playwright.pr3.config.mts`. It imports the normal config,
  changes both `use.baseURL` and `webServer.url` to `http://127.0.0.1:5174`, and
  launches `npm run narrative:manifest && ./node_modules/.bin/vite --host
  127.0.0.1 --port 5174 --strictPort`, retaining `reuseExistingServer: false`.
  Verified 5174 was free before launch. Neither port 5173 nor acceptance-server
  PID 2556940 was touched, reused, or killed; no committed port policy changed.
- Exact invocation: `CI=1 npm run test:e2e -- --config
  "$HOME/bobiverse-pr3-backup/playwright.pr3.config.mts" --workers=1 --retries=0`.
  All validation logs, the diagnostic master worktree results, HTML browser report,
  and any failure artifacts are retained outside Git in
  `~/bobiverse-pr3-backup/`. Approved chapter `1.40` and `1.41` file checksums
  remain unchanged; `1.42` is value-identical to the final approved candidate.
- The local PR body and manual browser checklist are in
  `~/src/bobiverse-pr3-body.md`. No push, force-push, or PR creation is performed.
  Hosted CI, fresh independent exact-SHA review, and Maciej's manual browser
  acceptance remain publication-time gates; HS0NZP remains **In progress**.

### 2026-11-10 (Europe/Amsterdam; post-merge status clarification)

- PR #3 is now squash-merged as `63bbd98` (reviewed head `08c9de9`), so Done is
  correct for this merged work. Manager clarification: set Done only after merge
  going forward; implemented/local/in-review work remains In progress. This does
  not waive any separately pending Captain visual-acceptance requirement.
