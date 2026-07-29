# BOB-028: pin chapter-extraction agent configuration

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-28

## Objective

Make the chapter-extraction workflow select GPT-5.6 Terra with high reasoning
explicitly at the orchestration boundary instead of inheriting a model or reasoning
level from the parent conversation.

## User-visible outcome

Every blind extraction and reconciliation pass requests the Captain-approved
Terra/high configuration. The workflow stops for approval instead of silently
substituting another model or reasoning level, and its review output records the
requested configuration.

## Binding references

- `../technical-design.md`, Section 13
- `../implementation-plan.md`, Phase 4
- `../chapter-extraction.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

This pins an implementation detail inside the provider-independent offline extraction
workflow. It does not change the application architecture, data authority, spoiler
model, or provider-independent architecture boundary, so it does not require an ADR.

## Decisions

- Both blind Pass 1 extraction and Pass 2 reconciliation use GPT-5.6 Terra with high
  reasoning.
- The orchestrator explicitly supplies `model: gpt-5.6-terra` and
  `reasoning_effort: high`; neither value may be inherited from the parent
  conversation.
- Pass 1 uses `fork_turns: none` so no parent-conversation state crosses the blind
  extraction boundary.
- Pass 2 also runs in a separately spawned Terra/high context, staged only with the
  sealed Pass 1 ledger and the canonical material permitted by the extraction
  workflow.
- If the exact model or reasoning level is unavailable, the workflow stops and asks
  the Captain before substituting.
- Human-review output records the requested model and reasoning configuration for
  both passes.

## In scope

- Replace the Sol/high instruction in the repository-local extraction skill.
- Define explicit Terra/high spawning requirements for Pass 1 and Pass 2.
- Preserve the blind Pass 1 isolation boundary.
- Add regression coverage for the exact orchestration contract.
- Add the selected agent configuration to the documented human-review output.

## Out of scope

- Adding a launcher, provider SDK, or runtime model-introspection mechanism.
- Changing evidence, reconciliation, validation, approval, or canonical-promotion
  behavior.
- Changing historical task records that accurately describe earlier runs.
- Running a chapter extraction or sending source text to a model.

## Documentation and generated artifacts

- Update the repository-local extraction skill and this task's status surfaces.
- No user-facing extraction guide change is required because the selected Codex
  execution model is an orchestration detail rather than part of the
  provider-independent workflow contract presented to operators.
- No generated artifact is retained by this task. The focused `npm run test`
  validation may refresh the ignored chapter manifest through `pretest`; that
  transient artifact remains outside version control.

## Acceptance criteria

1. The extraction skill requires `model: gpt-5.6-terra` and
   `reasoning_effort: high` for both extraction and reconciliation.
2. The skill prohibits inheriting either setting from the orchestrating
   conversation.
3. Blind Pass 1 explicitly uses `fork_turns: none`.
4. Pass 2 uses a separately spawned Terra/high context with only its permitted
   reconciliation inputs.
5. Unavailable model or reasoning configuration causes a stop for Captain approval,
   not silent substitution.
6. Human-review output identifies the requested configuration for both passes.
7. Focused regression coverage and skill validation pass.

## Validation commands

```bash
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
npm run test -- --run tests/unit/source-evidence-helper.test.ts
npm run format:check
git diff --check
```

## Risks and cautions

- Markdown cannot inspect the runtime-selected model. Enforcement is therefore at
  the orchestration request boundary, with the requested configuration included in
  review output for auditability.
- A future rename of model identifiers must update the skill and its regression test
  together; it must not silently fall back to inherited defaults.
- Pass 2 needs canonical context, but it must not inherit the orchestrator's broader
  conversation or receive later-chapter state.

## Validation status

Implementation validation completed on 2026-07-28.

- The skill validator passed.
- The focused source-evidence helper suite passed with 3 tests.
- Prettier and `git diff --check` passed.
- The focused regression covers explicit Terra/high/non-forked spawning, inherited
  configuration rejection, Pass 2 staging, stop-before-substitution behavior, and
  human-review configuration reporting.
- The worktree had no local dependencies. Validation temporarily reused the
  lockfile-identical `node_modules` from the adjacent canonical checkout, and `tsx`
  required permitted local IPC outside the managed sandbox. The temporary dependency
  link was removed after validation.
- Post-implementation findings BOB-028-R2 and BOB-028-R3 were remediated by expanding
  the regression contract and rerunning the exact documented validation.
- A fresh post-implementation independent review returned `No findings.`
