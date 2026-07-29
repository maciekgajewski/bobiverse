# BOB-037: seed largest planetary moons

Status: Blocked
Phase: 2 (narrative foundation)
Last updated: 2026-07-29

## Objective

Complete the pre-book Solar-System zero state with up to four natural satellites per
planet, selecting each planet's largest moons by mean radius and retaining the
selected moons in inner-to-outer orbital order.

## User-visible outcome

Before any chapter is selected, the location tree exposes the Moon, both Martian
moons, and the four largest moons of each giant planet. Titan is therefore already a
known Solar-System location when Chapter 1.13 reveals primitive life and a USE
research station there; the chapter updates Titan rather than introducing its
astronomical identity.

## Binding references

- `../data-model-definition.md`, especially the zero-state Solar-System inventory
- `../technical-design.md`, Section 12
- `../implementation-plan.md`, Phase 2
- `../project-idea.md`
- `../chapter-extraction.md`
- `../adrs/0003-zero-state-solar-system-baseline.md`
- `../adrs/0006-generalized-narrative-zero-state.md`
- `BOB-006-generalized-narrative-zero-state.md`
- `../../AGENTS.md`

No ADR is expected. This task fills the existing zero-state moon contract and
replaces its unspecified curated-subset policy with an objective selection rule. It
does not change source ownership, topology, projection semantics, schema shape, or
the four-moon limit. If implementation requires any of those changes, stop and
propose an ADR rather than expanding scope silently.

## Decisions

- A planet with four or fewer known natural satellites includes all of them. A
  planet with more than four includes the four satellites with the greatest mean
  radius.
- Selection is based on satellites with a numeric mean radius in JPL Solar System
  Dynamics' planetary-satellite physical-parameter table. A known satellite without
  a numeric JPL mean radius is outside this comparison because the objective rule
  cannot rank it. A future numeric value or revised ranking requires a separately
  reviewed canonical-data update.
- Radius and orbital values remain review evidence in this task; measured values are
  not copied into narrative JSON.
- The selected moon records remain ordered by orbit from inner to outer, following
  the existing zero-state child-order contract rather than size order.
- The canonical zero-state inventory is:
  - Mercury: none;
  - Venus: none;
  - Earth: Moon;
  - Mars: Phobos, Deimos;
  - Jupiter: Io, Europa, Ganymede, Callisto;
  - Saturn: Dione, Rhea, Titan, Iapetus;
  - Uranus: Ariel, Umbriel, Titania, Oberon;
  - Neptune: Larissa, Proteus, Triton, Nereid.
- Stable IDs use lowercase kebab-case names under the existing `location:` namespace.
  Every moon has `kind: "moon"` and `parent_relation: "orbits"`. Nested authoring
  supplies the parent; it does not add `parent_location_id`.
- Zero-state moon records contain only universally known identity and topology:
  `id`, `name`, `kind`, and `parent_relation`. They contain no radius, distance,
  colour, description, state, or book-derived fact.
- Chapter 1.13 remains review-only. Its temporary candidate updates seeded Titan
  with the reader-visible life and research-station description and does not
  introduce `location:titan`. This task does not promote Chapter 1.13.

## Selection evidence

Reviewed on 2026-07-29 against:

- JPL Solar System Dynamics,
  [Planetary Satellite Physical Parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html),
  for numeric mean radii;
- JPL Solar System Dynamics,
  [Planetary Satellite Mean Elements](https://ssd.jpl.nasa.gov/sats/elem/sep.html),
  for semimajor axes and inner-to-outer order.

The selected names below are listed in authored inner-to-outer order. Mean radii
establish membership, not JSON ordering.

| Planet  | Selected moons: mean radius in km; semimajor axis in km                                              | Nearest excluded numeric candidate |
| ------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Mercury | None; JPL lists no planetary satellite.                                                              | None                               |
| Venus   | None; JPL lists no planetary satellite.                                                              | None                               |
| Earth   | Moon: 1737.4; 384400                                                                                 | None                               |
| Mars    | Phobos: 11.08; 9375; Deimos: 6.2; 23457                                                              | None                               |
| Jupiter | Io: 1821.49; 421800; Europa: 1560.80; 671100; Ganymede: 2631.20; 1070400; Callisto: 2410.30; 1882700 | Himalia: 85.00 km                  |
| Saturn  | Dione: 561.40; 377700; Rhea: 763.50; 527200; Titan: 2574.76; 1221900; Iapetus: 734.30; 3561700       | Tethys: 531.10 km                  |
| Uranus  | Ariel: 578.9; 190929; Umbriel: 584.7; 265986; Titania: 788.9; 436298; Oberon: 761.4; 583511          | Miranda: 235.8 km                  |
| Neptune | Larissa: 96.00; 73500; Proteus: 208.00; 117600; Triton: 1352.60; 354800; Nereid: 170.00; 5513900     | Galatea: 79.00 km                  |

The table retains the reviewed live-source snapshot needed to verify both sides of
each four-moon selection boundary. Upstream JPL drift does not silently change
canonical data.

## Chapter 1.13 reconciliation input

The current authorized replay uses:

- external source: `../source-text/1.13.txt`;
- source SHA-256:
  `031ce63e90a98d4f9469f5fb4593261f8c9fce9ff42a5293fefb22fac3684fbd`;
- authoritative sealed Pass 1 ledger:
  `/tmp/bobiverse-1.13.qKDk28/pass1-sealed.json`;
- sealed-ledger SHA-256:
  `ffd30535b81555411afaa1b57d4d55e261b84f7f566c7c3881918ab022b46dae`.

Ignore every other Chapter 1.13 ledger. Verify both hashes before use. Because the
source claims are unchanged, replay only Pass 2 against a newly generated Chapter
1.12 projection containing the corrected zero state. Run Pass 2 in a separately
spawned `gpt-5.6-terra` agent with high reasoning and `fork_turns: none`, as required
by the extraction skill.

If the pinned sealed ledger is unavailable or its hash differs, do not substitute
another ledger. Re-run the complete extraction workflow from the pinned external
source in fresh Pass 1 and Pass 2 `gpt-5.6-terra`, high-reasoning, non-forked agents.
Verify the source hash first and record the new sealed-ledger hash in completion
evidence.

## In scope

- Add the ratified 19 moon records to
  `data/narrative/baseline/zero-state.json`.
- Add focused canonical-corpus regression coverage for the exact moon inventory,
  parentage, kinds, relations, per-planet cap, and inner-to-outer ordering.
- Update the integrated data-model, technical-design, implementation-plan, and
  project-idea documentation with the objective largest-by-mean-radius selection
  rule.
- Verify and replay the pinned Chapter 1.13 sealed extraction ledger against the
  corrected preceding projection, or perform the specified full re-extraction
  fallback. Regenerate its temporary review-only candidate and exact diff outside
  version control, and validate a newly prepared temporary corpus.
- Update this task with completion evidence and any deviations.

## Out of scope

- Adding dwarf planets, dwarf-planet moons, asteroids, rings, artificial satellites,
  orbital distances, radii, coordinates, colours, or other measured astronomy facts
  to narrative data.
- Changing the JSON Schema shape, the maximum of four moons per planet, location
  kinds, parent relations, projection semantics, or runtime rendering.
- Adding narrative descriptions or mutable state to zero-state moon records.
- Promoting or committing Chapter 1.13, source text, evidence excerpts, ledgers,
  temporary candidates, or generated projections.
- Reworking completed historical task or ADR text except where current integrated
  documentation must state the active selection rule.

## Acceptance criteria

1. The zero state contains exactly the ratified 19 moon records beneath their
   planets, with stable IDs, canonical names, `kind: "moon"`, and
   `parent_relation: "orbits"`.
2. Each selected moon subset follows the largest-by-mean-radius rule, while each
   planet's authored child order is inner-to-outer. No planet contains more than four
   moons.
3. Zero-state moon records contain no measured astronomy facts or book-derived
   descriptions or state.
4. Pre-book projection exposes every seeded moon with the correct generated parent
   link and preserves the existing Solar-System root inventory.
5. Focused regression coverage asserts the exact canonical moon inventory and
   parentage so later edits cannot silently change the selection or order.
6. Current integrated documentation states the largest-by-mean-radius selection rule
   and distinguishes selection order from authored orbital order. This task retains
   the reviewed JPL URLs, access date, numeric selection boundary, missing-value
   policy, and orbital-order evidence.
7. The regenerated Chapter 1.13 review candidate updates `location:titan` and does
   not introduce it. Its newly prepared temporary baseline contains seeded Titan,
   and the authoritative validator passes against that exact temporary root.
8. No Chapter 1.13 source, evidence, ledger, candidate, temporary corpus, or generated
   projection enters version control.
9. Every documented validation command passes, or an exact deviation is recorded
   here without reducing scope.

## Validation commands

```bash
npm run narrative:manifest
npm run narrative:validate
npm run narrative:generate -- --output /tmp/bobiverse-zero-state-with-moons.json
npm run test -- tests/unit/narrative.test.ts
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Chapter 1.13 temporary-corpus validation:

```bash
./node_modules/.bin/tsx scripts/narrative-cli.ts validate \
  --root <new-temporary-narrative-root>
```

Before validation, inspect that exact root: its baseline must contain seeded Titan,
and its Chapter 1.13 candidate must contain a Titan update and no Titan introduction.
Record the actual temporary root plus the source, sealed-ledger, candidate, and exact
diff SHA-256 values in completion evidence.

## Risks and unresolved decisions

- Mean-radius rankings can change if JPL revises physical parameters. Such a future
  update is an explicit reviewed data change, not an automatic browser-time import.
- Several selected moons are not the four closest moons. Size determines membership;
  orbital distance determines authored order.
- The existing Chapter 1.13 review artifact was produced against a zero state without
  Titan and must not be promoted unchanged.
- No unresolved product decision remains.

## Completion evidence

Implementation on 2026-07-29:

- Seeded all 19 ratified moon records in canonical zero state. The generated pre-book
  projection is `/tmp/bobiverse-zero-state-with-moons.json`.
- Added focused assertions for the exact moon identities, generated parent links,
  orbital child order, leaf shape, and four-moon cap. Updated the canonical narrative
  equivalence snapshot and the zero-state browser count for the intentional 19-location
  expansion. The snapshot refresh also incorporates current committed canonical
  narrative state that its previous expectation had not yet captured.
- Pre-implementation task-document review completed after two corrected findings and
  returned `No findings.` on the final pass.
- Post-implementation review inspected the complete diff, regenerated snapshot,
  Chapter 1.13 artifacts, and validation evidence and returned `No findings.`

Chapter 1.13 Pass 2 replay:

- Temporary workspace:
  `/tmp/bobiverse-1.13-moons.mPEZgC`.
- Spawned agent configuration: `gpt-5.6-terra`, high reasoning,
  `fork_turns: none`.
- Source SHA-256:
  `031ce63e90a98d4f9469f5fb4593261f8c9fce9ff42a5293fefb22fac3684fbd`.
- Sealed-ledger SHA-256:
  `ffd30535b81555411afaa1b57d4d55e261b84f7f566c7c3881918ab022b46dae`.
- Candidate SHA-256:
  `a7aa2bcccd8f9c5d81eee4534a5498cbef8713cf50b8403a91a6e7038630c945`.
- Exact-diff SHA-256:
  `61c6d419e5dc07bcede5b43e9b47a0e2df54dccd44ff2660ad537785fb1b17b1`.
- The prepared baseline contains seeded `location:titan` exactly once. The candidate
  contains no Titan introduction and one Titan description update.
- `./node_modules/.bin/tsx scripts/narrative-cli.ts validate --root
/tmp/bobiverse-1.13-moons.mPEZgC/pass2-narrative-root` passed:
  `Narrative corpus is valid: zero state and 13 chapter source file(s).`

Subsequent separately authorized Chapter 1.13 promotion:

- The Captain explicitly approved the exact candidate and requested promotion after
  BOB-037 implementation.
- `data/narrative/chapters/1/13.json` is byte-identical to the approved candidate and
  retains SHA-256
  `a7aa2bcccd8f9c5d81eee4534a5498cbef8713cf50b8403a91a6e7038630c945`.
- Canonical manifest generation, validation, Chapter 1.13 projection, format check,
  lint, typecheck, the 135-test suite, and `git diff --check` passed. The append-only
  chapter-promotion log records the result.
- The production build stops in the astronomy validator with
  `KeyError: 'stellar-system-005582'` before reaching narrative validation.
  Diagnosis showed that canonical Chapter 1.12 added this mapped anchor without the
  reviewed acquisition bootstrap required by the integrated narrative/astronomy
  contract. [BOB-030](BOB-030-mapped-anchor-bootstrap-integrity.md) specifies the
  repository-level repair and promotion guard.

Validation results:

- `npm run narrative:manifest`: passed.
- `npm run narrative:validate`: passed with zero state and 12 canonical chapter
  sources.
- `npm run narrative:generate -- --output
/tmp/bobiverse-zero-state-with-moons.json`: passed.
- `npm run test -- tests/unit/narrative.test.ts`: passed, 30 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run test`: passed, 23 files and 135 tests.
- `git diff --check`: passed.
- `npm run build`: blocked in astronomy-data validation before narrative validation
  or compilation. `scripts/validate_data.py` raises
  `KeyError: 'stellar-system-005582'` while resolving acquisition-query bootstrap
  anchors. The immediate trigger is the canonical Chapter 1.12 narrative mapping;
  the uncontrolled lookup and missing promotion guard are repository-level defects,
  not an unrelated BOB-037 failure. BOB-037 stays `Blocked` pending BOB-030
  implementation and a passing production build.

No source text, evidence ledger, candidate, temporary corpus, generated projection,
`node_modules`, or `.venv` artifact is tracked.
