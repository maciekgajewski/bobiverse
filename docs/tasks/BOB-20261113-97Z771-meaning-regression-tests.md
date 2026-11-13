# BOB-20261113-97Z771: meaning-level regression tests for the canonical narrative

Status: Ready
Phase: 4 (LLM-assisted editorial pipeline; process hardening)
Last updated: 2026-11-13

## Objective and user-visible outcome

Process item 6. Accuracy of extraction is the main goal, but today nothing pins
what the canonical chapters mean. Validators check structure and the snapshot test
(`narrative-equivalence.test.ts`) pins exact output for three early chapters. A
re-extraction or a projection change can still move a character, drop an
introduction or leak a later fact earlier, and every check stays green.

This task adds a small table of **meaning-level expectations**. Each one is a fact
about the projected world at a reading position, written only as stable IDs and
values (for example, at `1.43`, `character:homer` is at `location:earth`). A unit
test asserts them against the canonical corpus in CI. Changing a pinned fact then
becomes a visible, reviewed decision instead of a silent side effect.

## Binding references

- `../chapter-extraction.md` §Approval, promotion, and provenance.
- `../development-process.md` (reserved decisions: disputed book facts).
- `../../AGENTS.md` (no book text in the repository).
- `BOB-20261112-1TWD9T-extraction-contract.md` (queued this task).

## Scope

1. **Expectations file**: `tests/fixtures/narrative-meaning.json`, a list of
   entries `{ chapter, kind, subject, expected, basis }`. It holds IDs, chapter
   refs, dates and enum values only, never prose or quotes. Four kinds:
   - `location`: at `chapter`, `subject` (a character) has
     `last_known_location.location_id` equal to `expected`;
   - `visible` / `not_visible`: at `chapter`, `subject` is or isn't in the projected
     world, which pins introduction boundaries (both sides of a reveal);
   - `field`: at `chapter`, one scalar field of `subject` (for example a status or
     species ID) equals `expected`.

   `basis` names where the fact was confirmed (for example "Captain approval
   2026-11-13 (1.43)" or a promotion-log row), not the book.

2. **Generic invariant** over every canonical chapter: an ID introduced in chapter
   N is not visible in the world projected at the chapter just before N (no
   spoiler leak by reading order). It's computed from the corpus, with no table
   entries.
3. **Test**: `tests/unit/narrative-meaning.test.ts` loads the canonical corpus
   through the existing `narrativeCorpus` / `generateNarrativeWorld`, evaluates each
   entry and the invariant, and reports failures as `chapter / kind / subject:
expected X, got Y`. It runs in `npm run test`, so CI's Repository checks job
   covers it with no workflow change. A schema-check test rejects malformed entries
   and any string field longer than an ID-sized limit, a cheap guard against prose.
4. **Seed set**: a small set from facts already confirmed:
   - Homer and Charles at Earth at 1.43 (the Captain's approval wording);
   - Riker and Arthur in Sol at 1.43 (canonical data; counts only under Q1 (b));
   - a few introduction boundaries from the promotion log.

   About 10–20 entries in total, not a full backfill.

5. **Docs**: one line in Checklist C. When promoting, add expectations for facts
   worth guarding, especially ones an approval answer decided (Q2). Changing an existing expectation
   counts as a disputed book fact (a reserved decision), so the PR must cite the
   Captain's decision.

## Out of scope

- Book text, excerpts or quotes anywhere in the fixtures, tests, logs or PR.
- Free-text or description comparisons, LLM-judged checks and similarity scores.
- Checksums or byte-level comparisons (Git and the existing snapshot cover bytes).
- A full backfill of chapters 1.1–1.42, astronomy data, the UI, e2e and schema
  changes.

## Acceptance criteria

1. The seed expectations pass on the current canonical corpus, and so does the
   no-early-visibility invariant.
2. Mutation check: changing one seeded fact in a temporary copy of the corpus
   (synthetic edit, test-only) fails the test with a message naming the entry.
3. A malformed entry, or one with a prose-length string, is rejected.
4. Fixtures contain only IDs, refs, dates and enums.
5. Validation passes, and CI runs the new test.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:validate
npm run build
git diff --check
```

## Manual check for Maciej

1. Read `tests/fixtures/narrative-meaning.json` and confirm each seeded fact is
   right from your reading.
2. Break one entry locally (for example, Homer at `location:sol` at `1.43`) and run
   `npx vitest run tests/unit/narrative-meaning.test.ts`. It fails and names the
   entry.

## Decisions

Manager decisions under its delegation, 2026-11-13 15:50:

- **Q1 = (b).** The developer may pin facts read from canonical data; Maciej sees
  them in the PR.
- **Q2: no fixed rule.** When promoting a chapter, add an expectation whenever a
  fact is worth guarding, especially one an approval answer decided (for example,
  Homer and Charles at `location:earth` in 1.43).

## Log

### 2026-11-13 (Europe/Amsterdam)

- The manager requested this proposal at 15:46 as process item 6. It's a task doc
  only, with status Draft until the manager review and the Captain's answers to Q1
  and Q2.
- Worktree `~/src/bobiverse-item6` on
  `bob-20261113-97z771-meaning-regression-tests`, from origin/master `279b626`.
- The manager approved the scope at 15:50 and decided Q1 and Q2 under its
  delegation (above). Status Ready; the implementation follows in the same PR (#16).
