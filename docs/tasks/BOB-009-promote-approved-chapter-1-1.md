# BOB-009: promote approved chapter 1.1 candidate

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-25

## Objective

Promote the Captain-approved candidate produced by BOB-008 into the canonical chapter
1.1 source, and document the normal user-facing extraction and approval workflow.

## Scope

- Replace only `data/narrative/chapters/1/1.json` with the reviewed candidate held
  outside the repository at approval time.
- Add a short user-facing skill guide and link it from the repository README.
- Validate the resulting canonical narrative corpus.

## Acceptance criteria

1. Canonical chapter 1.1 has the same JSON content as the Captain-approved candidate.
2. The narrative corpus validates with the repository validator.
3. The README links to a concise guide that explains invocation and separate approval.
4. No source text, evidence excerpts, or intermediate extraction artifacts are added
   to the repository.

## Validation

```bash
npm run narrative:validate
npm run typecheck
npm run lint
git diff --check
```

## Completion evidence

The Captain explicitly approved the reviewed `candidate.json` for chapter 1.1. The
canonical file was replaced only with that candidate; source evidence and temporary
artifacts remain under `/tmp` and outside version control. The documented validation
commands passed on 2026-07-25.
