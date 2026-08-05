# BOB-20260805-ETXDXS: sentient-species editorial remediation

Status: Done
Phase: 2 (narrative data refinement)
Last updated: 2026-08-05

## Objective

Remove the non-sentient gorilloid species record and its typed references from
canonical chapter data, while retaining source-supported Gorilloid names in prose and
events; establish the editorial boundary for the Species list.

## User-visible outcome

The reader-visible Species browser contains only sentient, civilization-creating
populations. Narrative summaries, descriptions, and events retain the supported
Gorilloid names and facts without modeling Gorilloids as a Species-list entity.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, Sections 10 through 12
- `../data-model-definition.md`, especially Species and chapter-source contracts
- `../chapter-extraction.md`, especially the type-specific review checks
- `../implementation-plan.md`, Phase 2

## In scope

- Remove `species:gorilloids`, its Chapter `1.37` update, and its Chapter `1.39`
  supplemental mention.
- Preserve the original source-supported Gorilloid names in the prose and event data
  of Chapters `1.35`, `1.37`, and `1.39`.
- Add the editorial rule that the Species list is limited to sentient,
  civilization-creating populations; animals remain unmodeled unless another
  supported entity type applies.
- Update affected browser-test and visual-testing guidance without weakening the
  generic-style coverage.

## Out of scope

- A schema or runtime change to automatically decide sentience or civilization.
- Rewriting historical chapter-promotion-log entries or source-review evidence.
- Auditing other species records beyond the stated rule and gorilloid remediation.

## Acceptance criteria

1. Canonical narrative JSON contains no `species:gorilloids` reference. Chapters
   `1.35`, `1.37`, and `1.39` retain their source-supported Gorilloid prose and event
   data without a Gorilloid Species-list entity.
2. The Species authoring guidance clearly requires source-supported sentience and
   civilization-creating capacity, and directs animals away from `species:` records.
3. The browser assigned-style test and visual guide no longer name the removed record;
   the visual specimen and existing fixture coverage retain the Other / Unknown style
   check without adding an ineligible canonical species.
4. Task metadata, narrative validation, formatting, focused tests, and diff checks
   pass. Historical promotion records remain unchanged.

## Documentation and generated artifacts

- Update `docs/chapter-extraction.md`, `docs/data-model-definition.md`, and
  `docs/visual-testing.md`.
- Do not edit generated artifacts by hand; regenerate only through documented
  validation paths when required.

## Validation

```bash
python3 scripts/tasks.py check
./.venv/bin/python scripts/validate_data.py
npm run narrative:validate
npm run format:check
npm run test:e2e -- --grep "browser species rows"
npm run test -- --run tests/unit/species-presentation.test.ts
git diff --check
```

## Known risks and decisions

- This is a human editorial rule. The schema retains its general `species` contract;
  it cannot infer sentience or civilization from source text.
- Promotion-log entries are immutable audit history and intentionally retain their
  original descriptions of prior promotions.

## Validation status

Completed on 2026-08-05:

- `python3 scripts/tasks.py check`: passed; 53 task files validated.
- `./.venv/bin/python scripts/validate_data.py`: passed.
- `npm run narrative:validate`: passed; zero state and 39 chapter source files are
  valid.
- `npm run format:check`: passed.
- `npm run test -- --run tests/unit/species-presentation.test.ts`: passed; 7 tests.
- The focused browser regression passed in Chromium, Firefox, and WebKit on isolated
  port `5174`; port `5173` was already occupied by another worktree's Vite server and
  was left untouched.
- `git diff --check`: passed.
- The required `review-agent` was unavailable in this session. A manual final review
  checked every edited chapter, all removed typed references, the documentation rule,
  and the test change; no findings remain.
