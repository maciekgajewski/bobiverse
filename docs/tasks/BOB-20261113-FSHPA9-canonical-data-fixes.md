# BOB-20261113-FSHPA9: canonical data fixes for chapters 1.22, 1.42 and 1.51

Status: In progress
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-11-13

## Objective

Correct three approved canonical chapter records so chapter view, where the chapter
read last wins a competing write, keeps every reviewed fact and never shows an older
state over a newer one. The fixes are bounded editorial remediation of approved
chapters, so they need this task and the Captain's approval of the exact change
(`../chapter-extraction.md` §Scope and authority, items 2–3; precedent: BOB-019).

**Awaiting Captain approval of the exact change.** The PR is do-not-merge until his
approval of the exact before and after values is recorded on it.

## User-visible outcome

- Knowledge through 1.22 or 1.23, chapter view: Riker and Homer show chapter 1.21's
  at-Sol state, not 1.22's older departure state. Both remain active in 1.22 as
  supplemental mentions.
- Knowledge through 1.42 or later, chapter view: VR's description keeps chapter 1.40's
  fact about Linus giving Henry a realistic sailing life.
- Knowledge through 1.51 or later, chapter view: EE-2's state keeps chapter 1.42's
  fact that Riker has promised seed transport.

## Binding references

- `../chapter-extraction.md` §Scope and authority, items 2–3
- `../adrs/0017-supplemental-mention-completeness.md`
- `../adrs/0028-backdated-updates.md`
- `../development-process.md` §Relayed approvals
- `BOB-019-correct-chapter-1-2-names-and-state.md` (precedent)
- Decision (c): task BOB-20261113-WZGAM4 in PR #23, not yet merged
- `../chapter-promotion-log.md`

## Authorisation chain

All relayed by the manager (Piotr Developer Manager), 2026-11-13:

1. 19:59 CET, the Captain chose (c): "Gap: (c) chapter view uses last chapter read,
   date view keeps story date".
2. 20:01 CET, the Captain chose: "Merge: (a) keep full merged texts".
3. About 20:29 CET, the manager asked for this bundle: the 1.22 drop, the 1.51 seeds
   clause (found by the Extractor; the manager reported that the Captain knows about
   it), and the VR merge at 1.42. The manager will obtain the Captain's approval of
   the exact before and after values in the PR body before merging.
4. Pending: the Captain's approval of the exact change, to be recorded on the PR with
   its date and his quoted wording.

## In scope

1. `data/narrative/chapters/1/22.json`: remove the `current_state` updates for
   `character:riker` and `character:homer`, and add both IDs to `mentions`, because
   the chapter still references them and ADR-0017 requires a supplemental mention for
   a reference with no other structural record.
2. `data/narrative/chapters/1/42.json`: append chapter 1.40's sentence about Linus
   and Henry to the `technology:vr` description.
3. `data/narrative/chapters/1/51.json`: insert chapter 1.42's sentence about Riker's
   seed promise into the `location:ee-2` state, between the existing two sentences.
4. Regression facts in `tests/fixtures/narrative-meaning.json` and focused tests in
   `tests/unit/narrative-meaning.test.ts`.
5. Promotion-log rows for the three changed chapters.

## Out of scope

- Code, schema or contract changes; decision (c) itself is BOB-20261113-WZGAM4.
- Any other wording in the three chapters.
- `character:bill` `current_state` at 1.42 over 1.41, which (c) also changes in
  chapter view; it was not part of the requested bundle.
- Dating the merged facts: the Captain accepted that merged texts may show a later
  fact early in date view.

## Acceptance criteria

1. Chapter 1.22 writes no `current_state` for Riker or Homer, and lists both as
   supplemental mentions. Narrative validation passes.
2. At read points 1.22 and 1.23, chapter view shows 1.21's Riker and Homer states,
   both before and after decision (c).
3. Chapter 1.42's VR description contains chapter 1.40's last sentence, and chapter
   view at 1.42 shows it under either write order.
4. Chapter 1.51's EE-2 state contains chapter 1.42's last sentence, and chapter view
   at 1.51 shows it.
5. A before-and-after world dump at every read point in chapter view, and at every
   date in date view for read points 1.22, 1.23, 1.42, 1.51 and 1.53, shows changes
   only in the intended fields.
6. No book text in the repository, commits or PR body.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run build
npx prettier --check <changed Markdown>
git diff --check
```

Plus e2e chromium on a throwaway, uncommitted config on port 5186.

## Risks and resolved decisions

- In date view, VR's description at 2162-04 to 2165-03 now carries a 1.40 fact dated
  2165-04, before Henry's own introduction date. The Captain accepted this class of
  anachronism on 2026-11-13 at 20:01 CET ("keep full merged texts").
- Under the current story-order chapter view, the 1.22 drop changes only date view:
  from 2150-09 Riker shows his 1.18 state until 1.19's 2152-07 write, and Homer his
  1.20 state until 1.21's 2157-01 write. Under (c) it also fixes chapter view at
  read points 1.22 and 1.23.
- Recording the Captain's approval in this file after review would need a new push
  and a new review, so it is recorded on the PR instead (`../development-process.md`
  allows "Task log or PR"). A later PR marks this task Done and cites it.

## Log

- 2026-11-13: implemented on a branch from master `916470ba6cb7`; awaiting the
  Captain's approval of the exact change.
