# BOB-018: promote approved chapter 1.2 mentions

Status: Done
Phase: 2 (narrative editorial data)
Last updated: 2026-07-26

## Objective

Promote the Captain-approved mention-only candidate produced by BOB-017 into the
canonical chapter 1.2 source.

## Scope

- Add only the exact reviewed `mentions` array to
  `data/narrative/chapters/1/2.json`.
- Confirm that every other chapter value remains identical to the pre-promotion
  canonical source.
- Validate the canonical narrative corpus and generated mention activity.
- Keep source text, evidence excerpts, ledgers, candidates, and temporary corpora
  outside version control.

## Binding references

- `BOB-017-audit-important-mentions-for-chapters-1-1-and-1-2.md`
- `../adrs/0008-important-mentions-and-narrative-activity.md`
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## Acceptance criteria

1. Canonical chapter 1.2 contains exactly the three approved mention IDs, in the
   approved order.
2. Removing `mentions` leaves a value-identical copy of the pre-promotion canonical
   chapter.
3. The canonical narrative corpus validates.
4. Generated activity contains chapter 1.2 `mention` records for all three approved
   IDs with effective date `2133`.
5. No source text or intermediate extraction artifact is added to the repository.

## Validation

```bash
npm run narrative:validate
npm run narrative:generate -- --chapter 1.2 --output /tmp/bobiverse-bob-018-world.json
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

## Approval

The Captain approved the exact chapter 1.2 mention-only candidate on 2026-07-26 and
requested its application.

## Completion evidence

- Canonical chapter 1.2 has SHA-256
  `891d2a053bb73c5b777a4d5b87fc72fd99d70c7c9eb578aa54bbc4046384a846`,
  exactly matching the approved candidate.
- The only narrative diff adds `character:robert-johansson`,
  `event:bob-road-incident`, and `organization:cryoeterna` to `mentions`, in that
  order.
- Canonical validation passed with zero state and two chapter sources.
- The generated chapter 1.2 projection contains one `mention` activity record for
  each approved ID, all with effective date `2133`.
- All documented validation commands passed on 2026-07-26.
