# BOB-019: correct chapter 1.2 names and state

Status: Done
Phase: 2 (narrative editorial data)
Last updated: 2026-07-26

## Objective

Correct two Captain-reviewed facts in canonical chapter 1.2 and make acronym-first
entity naming an explicit chapter-extraction rule.

## User-visible outcome

At knowledge through chapter 1.2, the organization introduced as FAITH is displayed
and searchable by the acronym used in the source, while its description supplies the
expanded name. Robert Johansson's projected state records his confirmed death in the
2016 road incident rather than retaining chapter 1.1's provisional wording.

## Binding references

- `../data-model-definition.md`
- `../technical-design.md`, especially the narrative projection and object-browser
  contracts
- `../implementation-plan.md`, Phases 2 and 4
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0007-additional-narrative-entity-types.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

## In scope

- In `data/narrative/chapters/1/2.json`, use `FAITH` as the canonical organization
  `name` and begin its description with the expanded name, Free American Independent
  Theocratic Hegemony.
- Add a chapter 1.2 update for `character:robert-johansson` with
  `current_state: "Dead."`, `death_date: "2016"`, and
  `death_event_id: "event:bob-road-incident"`.
- Remove Robert's now-redundant chapter 1.2 important mention because the update
  becomes his structural representation in the chapter. Retain the road-incident and
  CryoEterna mentions.
- Require chapter extraction to preserve an acronym as the canonical `name` when the
  source primarily names the entity by that acronym, and to put a known expanded form
  in the original description.
- Add focused regression coverage for the canonical source and projected chapter 1.2
  world.

## Out of scope

- Adding alias fields or changing the narrative schema.
- Re-extracting either chapter from source text.
- Changing chapter 1.1's spoiler-safe provisional state.
- Changing the identity or stable ID of FAITH, Robert Johansson, Bob's replicant, or
  the road incident.
- Adding unsupported book quotations or evidence artifacts.

## Acceptance criteria

1. Chapter 1.2 introduces
   `organization:free-american-independent-theocratic-hegemony` with canonical name
   `FAITH`.
2. The same record's original description expands FAITH as Free American Independent
   Theocratic Hegemony.
3. Chapter 1.2 updates Robert Johansson to `current_state: "Dead."`,
   `death_date: "2016"`, and `death_event_id: "event:bob-road-incident"`.
4. Chapter 1.1 continues to expose only its existing presumed-dead state, while the
   chapter 1.2 projection exposes the confirmed-death fields.
5. Chapter 1.2 no longer lists Robert as an important mention; his update supplies
   chapter activity, while the road-incident and CryoEterna mentions remain.
6. The extraction skill and user-facing extraction documentation state the
   acronym-first naming rule without requiring invented expansions.
7. The canonical narrative corpus and focused regression tests pass.
8. No source text or extraction artifact is added to version control.

## Validation

```bash
npm run narrative:validate
npm run narrative:generate -- --chapter 1.2 --output /tmp/bobiverse-bob-019-world.json
npx vitest run tests/unit/narrative.test.ts
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

## Approval

The Captain chose acronym-first naming with the expanded form in the description,
selected the complete Robert Johansson death update including the date and event
link, and explicitly authorized implementation with `proceed` on 2026-07-26.

## Risks and resolved decisions

- The acronym is the source-facing canonical name, not an alias or a parenthetical
  suffix.
- The expanded form is included only because it is known; extraction must not invent
  an expansion when the source does not supply or support one.
- Robert Johansson and the Bob replicant remain distinct character identities.
- The existing Robert important mention becomes invalid under the accepted
  non-redundancy contract once chapter 1.2 updates him, so the update replaces that
  mention as his chapter representation.

## Completion evidence

Completed on 2026-07-26.

- Canonical chapter 1.2 has SHA-256
  `a174255e0bc7d16f8b7898525d37160855bb4b5b382b5fd639cdaa96c48dd978`.
- The generated chapter 1.2 world displays and finds FAITH by that canonical name,
  expands it in the description, and projects Robert Johansson as dead with
  `death_date: "2016"` and the road-incident death-event link.
- The chapter 1.1 projection retains `Presumed dead after the road incident.` and has
  no `death_date`.
- Robert's redundant important mention was removed. The road-incident and CryoEterna
  important mentions remain, and Robert receives chapter 1.2 `update` activity.
- `npm run narrative:validate`,
  `npm run narrative:generate -- --chapter 1.2 --output
  /tmp/bobiverse-bob-019-world.json`,
  `npx vitest run tests/unit/narrative.test.ts`, `npm run format:check`,
  `npm run lint`, `npm run typecheck`, and `git diff --check` passed.
