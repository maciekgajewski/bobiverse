# BOB-20261116-2AGQB7: Preflight item 8 on a revision's prior root

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-16

## Objective and user-visible outcome

Make extraction preflight item 8 check a revision target's prior root consistently,
so a correction to an existing mid-book chapter can pass preflight. Today the prior
root of a revision (for example 1.1-1.23 for 1.24) is a strict prefix of the
canonical chain, but item 8 validates it against the whole-chain species
presentation registry and the whole-chain pinned astronomy plan, so any mid-book
edit whose later chapters introduce a species or an anchor fails. There is no change
to the app.

## Authorization

- Relayed by the Piotr Developer Manager on 2026-11-16 (Europe/Warsaw): the
  Extractor's Captain-approved book 1 fix (`3c5bc2d` on
  `chapters/book1-dated-state-fixes`, touching 1.24, 1.39 and 1.56) passes full
  checks but fails preflight item 8 for 1.24 and 1.39 on the unchanged prior
  roots. Preflight is not bypassed: fix item 8 so prior roots are checked
  consistently, with tests, and send the commit for review.

## Binding references

- `../chapter-extraction.md` §Candidate assembly and temporary corpus, §Astronomy
  preflight and isolated acquisition (step 8: a prior root is not tested against a
  plan for a different anchor set)
- `../chapter-extraction-checklists.md` Checklist A items 7 and 8
- `scripts/extraction_preflight.py`, `scripts/common.py` (`mapped_anchor_names`),
  `src/narrative/model.ts` (species presentation validation)

## Scope

1. Item 7: when canonical chapters exist at or after the target (a revision), record
   them as `later_canonical_chapters` and scope the prior root's copy of
   `data/presentation/species.json`: withhold only the assignments whose species one
   of those chapters introduces, listed with the introducing chapter.
2. Item 8: for a revision, run the narrative validator on the prior root as before
   and the astronomy validator on the full canonical chain at the base revision,
   recording `astronomy_root` and a limit. A tip target (no later canonical chapter,
   including every pending chain) is unchanged.
3. Tests: fixture validators that model both whole-chain checks; revision pass,
   genuine prior-chain breaks still failing; a canonical-corpus test for 1.24.
4. Docs: Checklist A item 8, §Astronomy preflight, and the preflight help text.

## Out of scope

- Chapter data, including landing `3c5bc2d` (the Extractor reruns preflight and the
  developer lands it separately).
- `validate_data.py` and the exact-plan guard, which stay unchanged.
- The narrative validator and `prepare-corpus`.

## Acceptance criteria

- A revision of 1.2 in a 1.1-1.4 fixture whose 1.3 introduces a species and an
  anchor passes item 8; the same unscoped prefix fails both fixture validators as
  the real ones did.
- Item 8 still fails for a broken prior chapter, an assignment to a species no
  canonical chapter introduces, and a prior-chain anchor the pinned plan lacks.
- A tip target still validates both on the prior root.
- On the canonical corpus, 1.24's prefix lacks `species:delta-eridani-natives`
  (introduced in 1.27), scoping withholds it, and the prefix's anchors are a strict
  subset of the canonical ones.
- The fixed preflight passes item 8 for 1.24, 1.39 and 1.56 on `3c5bc2d`.

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
git diff --check
```

## Risks and decisions

- Option chosen: truncate the presentation input to match the chain, but validate
  astronomy on the full canonical chain. The registry can be scoped exactly (an
  assignment either names a species the prefix introduces, or one a later canonical
  chapter introduces, or neither, and only the second is withheld). Pinned
  astronomy cannot be truncated: the GCNS and CNS5 manifests and runtime coverage
  proofs are acquired for the whole chain's anchors, and the exact-plan guard is an
  equality check by design. Anchor discovery accumulates in reading order, so the
  prefix's anchors are a subset of the canonical ones and the canonical check covers
  them. Relaxing the guard to a subset check would weaken it, so it is not done.
- This narrows `§Astronomy preflight`'s "canonical-master success is not a
  substitute" for revision targets only. For a tip or pending chain the prior root
  contains every canonical chapter, so nothing changes there.
- The forward-species rule mirrors `model.ts`: a species is known from the zero
  state or a chapter's `introducing` entries with a `species:` ID.

## Log

### 2026-11-16 (Europe/Warsaw)

- Created on master `212b867` on local branch
  `bob-20261116-preflight-prior-roots` in the `~/src/bobiverse-preflight` worktree.
- Item 7 now records `later_canonical_chapters` and scopes the prior root's
  presentation registry for a revision; item 8 validates astronomy on the full
  canonical chain for a revision. Seven fixture tests (the unscoped prefix fails
  both fixture validators; a revision passes; genuine breaks still fail; a tip is
  unchanged) and three canonical-corpus tests for 1.24. Against the old script the
  revision tests fail as the Extractor's runs did.
- Real case: in a disposable clone of `3c5bc2d` with only this script applied (and
  a placeholder source file, so item 2's fingerprint is not the chapter's), the
  preflight passes item 8 for 1.24 (withholding `species:delta-eridani-natives`,
  introduced in 1.27), 1.39 and 1.56, with astronomy validated on the canonical
  chain. `~/extraction-scratch` was not modified; the clone was deleted.
- Validation passed: `tasks.py check`, format:check, lint, typecheck, test (60 files,
  801 tests), data:test (93 tests), data:validate, narrative:validate, build and
  `git diff --check`. No e2e (no UI change). Sent to the manager for review.
