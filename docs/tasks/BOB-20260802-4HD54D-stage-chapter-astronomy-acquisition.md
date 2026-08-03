# BOB-20260802-4HD54D: stage chapter-driven astronomy acquisition

Status: Done
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-08-02

## Objective

Document and exercise a spoiler-safe staging workflow for chapter candidates whose
new mapped astronomy anchors require refreshed pinned acquisition artifacts before
the candidates can pass their mandatory astronomy preflight.

## User-visible outcome

An unapproved chapter candidate can drive a reproducible astronomy refresh in an
isolated checkout without entering the canonical narrative corpus. A fresh
independent agent reviews and may accept a tightly bounded deterministic astronomy
snapshot; the Captain still reviews one exact combined chapter-and-astronomy diff
before any canonical write.

## Binding references

- `../../AGENTS.md`
- `../chapter-extraction.md`
- `../technical-design.md`
- `../implementation-plan.md`
- `../data/astronomy-pipeline.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0016-deterministic-narrative-anchor-bootstrap.md`
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`
- `BOB-030-mapped-anchor-bootstrap-integrity.md`
- `../../.codex/skills/extract-bobiverse-chapter/SKILL.md`

This task does not change catalogue authority, stable astronomy identities,
coordinate precedence, or the rule that canonical narrative JSON requires exact
candidate approval.

## In scope

- Document an isolated staging-checkout path when temporary-root astronomy
  validation reports that acquisition queries differ from the exact plan.
- Require the exact candidate chain to be installed only in the isolated checkout.
- Refresh and regenerate astronomy there, inspect upstream drift, and validate the
  complete staged corpus.
- Delegate acceptance of a deterministic astronomy snapshot to a fresh, read-only
  independent review agent under the bounded gate below.
- Require one exact combined diff for Captain review before applying chapter or
  astronomy files to the real worktree.
- Exercise the workflow for Chapters 1.22 through 1.24 and their Alpha Centauri and
  82 Eridani anchors.
- Update the generated-runtime regression fixture for the validated 255-system union
  and the new Alpha Centauri and 82 Eridani coverage proofs.

## Exact staging inputs

The lawful source files remain outside the repository:

| Chapter | Source path | Sealed ledger | Review candidate |
| --- | --- | --- | --- |
| `1.22` | `../source-text/1.22.txt` (`5ac2938612d7c97aad66356dfc726681375412de747ba44be74cb6da5ca7273d`) | `/tmp/bobiverse-blind-122.8U2Nd2/output/sealed-claim-ledger.json` (`3fd86538770793631e59fa9a75935ff020aa8261bdd3630b514d56c2d53d3233`) | `/tmp/bobiverse-pass2-122.zyEC3p/candidate-1.22.json` (`e0a58fec180a6b83f5f5ca966d1fe7ade9c06802c9f8755297eb37bc4b70c188`) |
| `1.23` | `../source-text/1.23.txt` (`61fc0904ef361ce5fc97f2b6ff4c185f47a78be88daa03c3c4876b3ed857c2df`) | `/tmp/bobiverse-pass1-1.23-Cr5Xug/sealed-ledger.json` (`2a85bb5fa2c943a73845bb8ac706d7bcb5098f47b88b5580ddd3d7caa128f47c`) | `/tmp/bobiverse-pass2-123.r2xfkN/candidate-1.23.json` (`7a97668afe76b9d8f96b5c38042578b63d550dfc1d1623e69cd781ac6e745f2c`) |
| `1.24` | `../source-text/1.24.txt` (`e01ce068429fbe4e5435c625a54c6440c70123e0b1098752f0d3cc8c53ba51bd`) | `/tmp/bobiverse-124-pass1-8A6vI0/sealed/claim-ledger.sealed.json` (`e9efaaecd36dab186764423c54c079a51145c97cd7c3ced1b2e566eae6347dae`) | `/tmp/bobiverse-124-pass2.GaHsP8/candidate-1.24.json` (`7fd223fd0f15d1e195a3fa046de2161166d2380427d29b0604a40b2499ad0a73`) |

These absolute paths are active-task operational inputs, not durable repository
artifacts. If any path is absent or its hash differs, stop: rerun the applicable
blind Pass 1 and Pass 2 workflow, independently review the replacement candidate,
and update this task with the new exact paths and hashes before staging astronomy.

Install the candidates in numeric order at `data/narrative/chapters/1/22.json`,
`23.json`, and `24.json` only inside the isolated checkout. Chapter 1.22 introduces
Calvin, Goku, and Linus with `parent_id: "character:bill"`; Chapters 1.23 and 1.24
introduce no Bob replicants.

The exact deterministic anchor results are:

- Alpha Centauri: `stellar-system-005413`, adopted CNS5 source `3627`;
- 82 Eridani: `stellar-system-005566`, adopted GCNS source
  `4847957293278177024`.

## Out of scope

- Writing or promoting the chapter candidates without separate exact approval.
- Hand-editing downloaded manifests, checksums, source extracts, candidates, or
  generated astronomy output.
- Accepting unrelated live-catalogue drift.
- Changing runtime spoiler projection, astronomy authority, schemas, validator
  semantics, or acquisition-query semantics.
- Inventing coordinates, manually overriding coordinates, or changing an adopted
  system component. Deterministic adoption of higher-precedence source-backed GCNS
  geometry is explicitly in scope under ADR-0011 and ADR-0023.
- Committing source book text, evidence ledgers, candidates, or staging checkouts.

## Acceptance criteria

1. `docs/chapter-extraction.md` and the repository-local extraction skill describe
   the isolated staging-checkout workflow and its approval boundary consistently.
2. The workflow preserves the exact reviewed candidate bytes, sealed evidence, and
   preceding reader-visible candidate order.
3. The real worktree's canonical narrative and promotion log remain unchanged until
   the Captain approves the exact combined diff.
4. Astronomy refresh runs only in the isolated checkout and records explicit
   bootstrap and coverage acquisition for every new mapped anchor.
5. If refresh changes `system-candidates.json`, generation stops before anyone edits
   `system-review.json`. A fresh independent agent must inspect the complete baseline,
   refreshed source files, candidate snapshot, and formatted diff. It may accept only
   when all changes are the requested anchor acquisition, unchanged-source metadata,
   or deterministic consequences of existing authority and precedence rules.
6. If the candidate checksum is unchanged, record that fact and do not create a
   redundant astronomy-snapshot approval step.
7. The review agent must reject new or removed stable IDs, system membership or
   accepted-identity changes, preferred-name or alias changes, adopted-component
   changes, source-authority changes, unresolved ambiguities, newly accepted WDS
   edges, unrelated catalogue-row drift, unsupported coordinates, or any change
   requiring editorial judgment. Rejection stops for Captain review.
8. A clean agent acceptance identifies the old and new value checksums, names every
   permitted semantic change class, records the agent identity and UTC date, and
   explicitly states that no prohibited class changed. Only then may the orchestrator
   update `system-review.json` to the accepted checksum and that review attribution.
   The review agent never edits the acceptance metadata it is judging.
9. Narrative and astronomy validation pass against the complete staged corpus before
   the combined diff is offered for approval.
10. Chapters 1.22 through 1.24 retain the reviewed Bob-parent lineage decisions.
11. The runtime-data regression asserts the complete seven-anchor coverage metadata
    and 255-system generated union.

## Validation

```bash
python3 scripts/tasks.py check
git diff --check
sha256sum \
  ../source-text/1.22.txt \
  ../source-text/1.23.txt \
  ../source-text/1.24.txt \
  /tmp/bobiverse-blind-122.8U2Nd2/output/sealed-claim-ledger.json \
  /tmp/bobiverse-pass1-1.23-Cr5Xug/sealed-ledger.json \
  /tmp/bobiverse-124-pass1-8A6vI0/sealed/claim-ledger.sealed.json \
  /tmp/bobiverse-pass2-122.zyEC3p/candidate-1.22.json \
  /tmp/bobiverse-pass2-123.r2xfkN/candidate-1.23.json \
  /tmp/bobiverse-124-pass2.GaHsP8/candidate-1.24.json
npm run data:refresh
npm run data:generate
./node_modules/.bin/tsx scripts/narrative-cli.ts validate --root <staged-narrative-root>
npm run data:validate -- --narrative-root <staged-narrative-root>
git diff -- data/source src/data/nearby-systems.json
git diff --exit-code -- \
  data/narrative/chapters/1/22.json \
  data/narrative/chapters/1/23.json \
  data/narrative/chapters/1/24.json \
  docs/chapter-promotion-log.md
```

Run the final `git diff --exit-code` in the real worktree, not the isolated checkout;
the candidate files intentionally exist in the latter. Before refresh, record the
isolated checkout baseline and candidate hashes. After refresh, inspect every changed
source row, manifest query, checksum, candidate identity, membership, adopted
component, coordinate, and generated runtime consequence. The permitted diff is
limited to the two required bootstrap/coverage plans and their deterministic derived
consequences. Any unrelated source identity, membership, coordinate, catalogue row,
or upstream-snapshot change stops for Captain review.

## Documentation and generated artifacts

- Update `docs/chapter-extraction.md` and
  `.codex/skills/extract-bobiverse-chapter/SKILL.md` together.
- Update `docs/data/astronomy-pipeline.md` and `docs/technical-design.md` with the
  bounded agent-review authority from ADR-0023.
- Keep staging checkouts, book text, ledgers, evidence excerpts, and temporary
  candidates outside version control.
- Preserve refreshed pinned astronomy sources and generated runtime data only as an
  approval-ready combined diff until canonical promotion is authorized.
- Never let the orchestrating agent self-review a changed `system-candidates.json`
  checksum. The fresh independent agent's bounded astronomy-snapshot acceptance and
  the Captain's final combined-diff approval are distinct gates.

## Risks and unresolved decisions

- Live catalogues may have drifted since the pinned snapshot. The independent agent
  must reject any change outside the required anchor bootstrap, coverage envelopes,
  unchanged-source metadata, query accounting, and deterministic consequences; such
  a rejection requires Captain review.
- The isolated checkout must use the same repository revision and exact candidate
  chain as the real-worktree review package.

## Execution evidence

The isolated checkout is
`/tmp/bobiverse-chapters-22-24-stage.A3e85M/repository`, created from the current
`HEAD`. The three installed candidate hashes match the table above, and staged
narrative validation passes with 24 chapters.

Before promotion, the Captain adjudicated Lucy in Chapter 1.23 as a VR dog not worth
representing as a durable companion character. The Chapter 1.23 reconciliation now
records that source claim as intentionally not modeled, and the exact approved
candidate contains neither a Lucy introduction nor a Lucy appearance.

After reviewing the prepared chapter and astronomy change set, the Captain gave
explicit application authority on 2026-08-02: all three chapter candidates were
approved subject only to removing Lucy from Chapter 1.23, followed by the direct
instruction to promote the chapters. The approved mutation was applied exactly;
Chapter 1.23's canonical SHA-256 is
`7a97668afe76b9d8f96b5c38042578b63d550dfc1d1623e69cd781ac6e745f2c`.
No other candidate content changed after that approval.

The networked refresh completed with GCNS 397 rows, CNS5 6,521 rows, and Gaia DR3
5,477 rows. Its formatted astronomy diff is
`/tmp/bobiverse-chapters-22-24-stage.A3e85M/astronomy-refresh-formatted.diff`.
The accepted candidate value checksum would change from
`0506e48247efb03a7550598b7ecbb920027b5807c20a49a5fe3dc4b9e5c1b3c1` to
`ef111b0df712de3445a402b3272f0fb849a7a82f616ae6b99c326c593c9ff073`.

The refresh adds 14 GCNS coverage rows and three derived WDS candidate rows. Fourteen
existing components adopt higher-precedence GCNS median Bayesian Cartesian geometry
instead of CNS5-transformed astrometry. It changes no system or component stable-ID
set, system membership, or accepted system identity. Unchanged classical-name, CNS5,
Gaia DR3, and 20-pc source hashes confirm that their only substantive changes are the
required CNS5 bootstrap query or refresh timestamps. Before independent review,
`system-review.json` remained unchanged.

Fresh reviewer `/root/astronomy_snapshot_review` returned `ACCEPTED` on 2026-08-02.
It independently verified the exact bootstrap and coverage queries; all 14 new GCNS
rows inside the requested envelopes; all 14 GCNS-precedence coordinates against
their source rows; unchanged stable IDs, identities, names, aliases, memberships,
adopted components, source authority, overrides, and ambiguity state; and three new
WDS candidates that remain explicitly unaccepted. It found every ADR-0023 prohibited
change class absent.

The isolated checkout now records value checksum
`ef111b0df712de3445a402b3272f0fb849a7a82f616ae6b99c326c593c9ff073`
with transparent independent-agent attribution. Generation emits 255 reconciled
systems. `npm run validate` passes formatting, lint, typecheck, 78 Python tests, 189
Vitest tests, astronomy validation for 255 systems and six pinned sources, narrative
validation for zero state plus 24 chapters, and the production build. The directly
affected runtime regression now asserts the 255-system union and all seven coverage
records.

After canonical promotion, `npm run validate` passed the same complete gate in the
real worktree. Canonical spoiler projections for Chapters 1.22, 1.23, and 1.24 were
generated successfully under `/tmp`; the task registry validated all 45 task files;
`git diff --check` passed; Chapter 1.23 contains no Lucy record; and Calvin, Goku, and
Linus each retain `parent_id: "character:bill"`.

The required independent post-implementation review initially found that the task
had not explicitly recorded the Captain's application authority. After this evidence
was added, reviewer `/root/review_staging_task` repeated the review and returned
`No findings.` on 2026-08-02.
