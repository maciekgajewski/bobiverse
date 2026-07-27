# BOB-023: settlement-scale location authoring

Status: Done
Phase: 4 (LLM-assisted editorial pipeline)
Last updated: 2026-07-27

## Objective

Prevent chapter extraction from turning rooms and other internal spaces into
narrative location entities. Make settlement scale the minimum ordinary location
granularity while retaining distinct bases and installations.

## User-visible outcome

The location browser remains focused on places useful for navigation and story
orientation: cities, towns, settlements, bases, installations, and larger places.
Rooms, corridors, laboratories, offices, individual buildings, and similar internal
spaces remain readable chapter context without becoming standalone locations.

## Binding references

- `../technical-design.md`, Section 12
- `../implementation-plan.md`, Phase 4
- `../data-model-definition.md`
- `../chapter-extraction.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0005-chapter-location-and-date-projection-refinements.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`
- `../../AGENTS.md`

This is an editorial-authoring restriction inside the existing location schema. It
does not remove schema-supported granularity, change projection behavior, or alter
location field ownership, so it does not require an ADR.

## Decisions

- A narrative location must normally be settlement scale or larger.
- A city, town, settlement, or distinct base or installation is eligible for a
  location entity when supported by reader-visible evidence.
- Rooms, corridors, laboratories, offices, floors, individual buildings, and other
  internal facility spaces are not eligible location entities.
- Pass 1 still records fine-grained source location and movement claims with sealed
  evidence. It must not erase source facts because they are below canonical
  granularity.
- Pass 2 classifies an ineligible fine-grained place as contextual `not-modeled`
  material and retains relevant facts in the chapter summary, an event description,
  or another suitable entity description.
- Chapter, appearance, and event location fields use the nearest supported eligible
  location. They must not point to an internal space.
- The rule begins with the review-only chapter `1.8` candidate and applies
  prospectively. Canonical chapters `1.1` through `1.7` are not retrospectively
  audited.

## In scope

- Add the mandatory granularity rule to the repository-local extraction skill.
- Add Pass 1 and Pass 2 handling guidance to the claim-ledger reference.
- Document the same editorial rule in `docs/chapter-extraction.md`.
- Remove `location:project-computer-room` from the review-only chapter `1.8`
  candidate and reconcile every affected temporary review artifact.
- Preserve the supported computer-room facts as prose context.
- Rebuild and validate a temporary corpus containing canonical chapters through
  `1.7` and the revised candidate.
- Run an independent workflow and source-fidelity review.

## Out of scope

- Editing or promoting canonical chapter `1.8`.
- Retrospectively auditing or changing canonical chapters `1.1` through `1.7`.
- Changing the narrative schema, validator, projector, location kinds, or
  parent-relation contract.
- Prohibiting eligible named bases or installations.
- Dropping fine-grained source claims or evidence from blind Pass 1.
- Re-running or editing the immutable chapter `1.8` sealed ledger.

## Acceptance criteria

1. The skill states that settlement scale is the minimum ordinary narrative location
   granularity and explicitly permits distinct bases and installations.
2. The skill forbids rooms and comparable internal spaces as location introductions,
   updates, chapter defaults, appearance locations, and event locations.
3. Pass 1 and claim-ledger guidance still require fine-grained source location and
   movement evidence to be captured.
4. Pass 2 retains relevant ineligible-place facts in prose and records an explicit
   `not-modeled` granularity decision.
5. `docs/chapter-extraction.md` exposes the same rule to human reviewers.
6. The revised chapter `1.8` candidate contains no computer-room location entity or
   location reference while preserving the supported discovery in its summary and
   candidate-selection event update.
7. The revised candidate, exact absent-file diff, and temporary-corpus copy are
   byte-identical and pass authoritative narrative validation.
8. The immutable ledger remains unchanged and an independent Terra Medium review
   returns no unresolved findings.

## Validation commands

```bash
python3 /home/maciek/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/extract-bobiverse-chapter
python3 .codex/skills/extract-bobiverse-chapter/scripts/source_evidence.py --help
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root /tmp/bobiverse-1.8-pass2-8DSWHO/corpus-location-granularity-final
npm run format:check
npm run lint
npm run typecheck
git diff --check
```

## Validation status

All documented commands passed on 2026-07-27. The updated skill passed
`quick_validate.py`, and its evidence helper exposes the expected command interface.
A fresh-context Terra Medium forward test applied the rule without being given the
intended candidate edit: it kept both rooms as prose context, used New Handeltown for
structured locations, and passed authoritative temporary-corpus validation.

The final revised chapter `1.8` candidate contains no location introduction and all
three authored `location_id` values resolve to `location:new-handeltown`. Its
temporary corpus reported:

```text
Narrative corpus is valid: zero state and 8 chapter source file(s).
```

The candidate, exact absent-file diff, and
`corpus-location-granularity-final/chapters/1/8.json` are byte-identical. The
candidate SHA-256 is
`3008021258b984f8d5d4df2458c4cf586b56973299a0ca133dc58690d3e69c93`;
the immutable sealed-ledger SHA-256 remains
`bf4772dff364bf8e5b0a2feba0fa5f9239b10e1d8f852d02a267e13ec6dace99`.
An independent Terra Medium workflow and source-fidelity closure review returned
`No findings.` Canonical chapter `1.8`, source text, and sealed evidence were not
modified.

## Risks and cautions

- The canonical schema permits smaller locations, so this workflow restriction must
  be visible to every extraction agent rather than assumed from validator behavior.
- Treating fine-grained places as ineligible entities must not erase important scene
  facts from summaries and event or entity descriptions.
- A generic building is not promoted merely by calling it a base; an eligible base or
  installation must be a distinct supported story place.
- Choosing the nearest eligible location must not license invented containment,
  coordinates, or continuity.
- The chapter `1.8` candidate remains review-only until the Captain approves the
  exact revised artifact and explicitly authorizes application.
