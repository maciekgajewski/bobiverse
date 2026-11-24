# BOB-20261124-32HDP4: VizieR CFA ASU transport fallback

Status: In progress
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-11-24

## Objective and user-visible outcome

Keep acquiring the same VizieR catalogues when TAPVizieR is unreachable,
without changing catalogue authority. CFA ASU is a live fallback only for
`IV/27A/catalog` (already shown to match the pinned checksum). The 20-pc
census (`J/ApJS/271/55` table4, notes4, refs, and ReadMe) stays TAP-only:
if TAP is unreachable, reuse the committed pins byte-for-byte. No
reader-visible change is expected. This branch does not re-pin source data.

The review branch is ready for review (the task-status vocabulary has no
"In review" value, so the formal Status stays In progress until the branch
lands and this file can be marked Done).

## Authorization

The Captain (Maciej) directed a search for an alternative star catalogue on
2026-11-24 at 13:53 (Europe/Warsaw), verbatim: "Look for alternative star
catalog. This one may be diwn permanently". The Piotr Developer Manager
authorised the CFA fallback implementation at 14:02 (Europe/Warsaw) the
same day. After the first gate, the manager agreed plan (A) at 15:05
(Europe/Warsaw): CFA fallback only for IV/27A; reuse the committed 20-pc
pins when TAP is down. Data re-pinning, if needed later, remains subject to
ADR-0023 independent review.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`, astronomy sources
- `../data/astronomy-pipeline.md`
- `../adrs/0011-multi-catalogue-astronomy-authority.md`
- `../adrs/0023-agent-review-of-deterministic-astronomy-refreshes.md`
- `../adrs/0022-classical-and-reader-visible-system-naming.md`
- `scripts/astronomy_pipeline.py` (`refresh_classical_names_snapshot`,
  `refresh_c20pc_snapshot`)
- `scripts/classical_names.py`, `scripts/c20pc_census.py`
- `scripts/validate_data.py`
- `data/schema/astronomy-source-extract.schema.json`
- `data/schema/twenty-parsec-census.schema.json`

## Scope

1. `refresh_classical_names_snapshot`: ordered transport list. First try
   the current TAPVizieR ADQL on
   `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`. If that transport
   fails, fall back to CFA ASU at
   `https://vizier.cfa.harvard.edu/viz-bin/asu-tsv` with the same catalogue
   ID and columns, `-out.max=unlimited`, and a check that the result is
   complete. Feed parsed rows through the existing `HIP IS NOT NULL` filter
   and `normalise_rows`. Record the endpoint actually used and the ASU
   request when that transport is used. `data:validate` accepts either
   allowed endpoint for this source. Current TAP-pinned manifests must
   still validate without new required fields.
2. `refresh_c20pc_snapshot`: TAP only. If TAPVizieR is unreachable or does
   not produce a usable census, do not fetch from CFA or any other mirror.
   Reuse the committed data rows and ReadMe byte-for-byte. Record reuse
   provenance (no fetch, pin reused, the reason, the timestamp of the attempt)
   in the census manifest; that manifest update is the only allowed census JSON
   change. The guard still checks the committed
   ReadMe for `04-Jun-2024` and bibcode `2024ApJS..271...55K`. If TAP
   succeeds but the official cdsarc ReadMe is unreachable, reuse the
   committed ReadMe the same way. `data:validate` accepts both the original
   TAP-only manifest and the optional reuse-provenance form.
3. Lean Python unit tests: ASU TSV parsing, classical fallback order, and
   the 20-pc data-row / ReadMe reuse paths.
4. Short documentation in `docs/data/astronomy-pipeline.md`. No new ADR;
   catalogue authority is unchanged.

## Out of scope

- Re-pinning or overwriting `data/source/` extracts, CSVs, or the 20-pc
  ReadMe in this branch (a later refresh task does that, with ADR-0023
  review if accepted candidates change).
- A CFA or other mirror fetch for `J/ApJS/271/55`.
- Changing GCNS, CNS5, Gaia DR3, or WDS transports or catalogues.
- Replacing VizieR catalogues with a different census.
- Full `npm run data:refresh`, e2e, UI, book text, `source-text/`, and
  landing this branch.

## Acceptance criteria

- TAPVizieR is still tried first for IV/27A; CFA ASU is used only when
  that transport fails.
- ASU requests use `-out.max=unlimited` and fail if the service reports a
  truncated result or an incomplete row count.
- Classical-name manifests record the endpoint actually used plus the
  request. `data:validate` and the JSON schema accept either
  `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` or
  `https://vizier.cfa.harvard.edu/viz-bin/asu-tsv` for IV/27A. Today's
  committed TAP manifests still pass `npm run data:validate`.
- The 20-pc refresh has no CFA path. A TAP failure leaves the committed data
  rows/extract and ReadMe byte-identical, changes only reuse provenance in the
  census manifest, and still applies the date and bibcode guard.
- Unit tests cover TSV parsing, classical fallback order, and the 20-pc
  reuse-provenance path.
- Gate (must pass before the review commit, and must not write tracked
  data files): a CFA pull of IV/27A matches pin
  `64279ff81b83e607afa56b3655cad56baf1afea7c115461fb617f28c1d9f6faf`,
  3569 rows; the 20-pc reuse path leaves the committed data rows/extract and
  ReadMe byte-identical, changing only reuse provenance in the census manifest.
  Confirm the exact pins from the manifests. If the
  classical hash differs, stop and report counts and first differing
  rows. Do not commit re-pinned data.

## Validation

Automated:

```bash
python3 scripts/tasks.py check
npm run data:test
npm run data:validate
npx prettier --check data/schema/*.json
```

No e2e or UI checks: there is no user-interface change.

## Manual check

Run the gate as a standalone comparison that does not overwrite tracked
files under `data/` (or revert any accidental writes afterwards):

1. Confirm the current pins from the committed manifests.
2. Pull IV/27A from CFA ASU (`-out.max=unlimited`, existing HIP filter
   and normaliser) and compare `normalised_sha256` and `row_count` to
   `64279ff8…` / 3569.
3. Exercise the 20-pc TAP-failure reuse path and confirm the census data
   rows/extract and committed ReadMe remain byte-identical; only
   `source.reuse_provenance` changes in `data/source/twenty-parsec-census.json`.
4. After the code change, confirm `npm run data:validate` still passes on
   the unchanged TAP-pinned manifests.

## Documentation and generated artifacts

- Update `docs/data/astronomy-pipeline.md` so the VizieR snapshot sections
  describe the IV/27A TAP-then-CFA fallback, 20-pc TAP-only reuse-pin
  behaviour, manifest provenance, and `data:validate` accepting both
  provenance forms for 20-pc and either endpoint for IV/27A.
- Do not invent a new ADR. Catalogue authority in ADR-0011 is unchanged.
- Do not commit refreshed `data/source/` artifacts in this task.

## Known risks or unresolved decisions

- A later 20-pc refresh that succeeds on TAP may still need a reviewed
  re-pin if upstream content has moved. CFA is not used for that census
  because a live CFA pull did not match the current pins (RAJ2000 last-bit
  floats, and refs row order).
- TAP connection timeouts should be short enough that IV/27A fallback is
  usable during an outage, without abandoning a live TAP query that is
  already transferring.

## Log

### 2026-11-24 (Europe/Warsaw)

- Task created after the research-and-plan step. Manager GO at 14:02 for
  the CFA fallback on branch `bob-20261124-vizier-fallback` from
  `origin/master` `77c9394`.
- First CFA gate: IV/27A matched the pin; 20-pc hashes did not (RAJ2000
  ULP differences and refs order). No data re-pin, no review push then.
- Manager agreed plan (A) at 15:05: CFA fallback only for IV/27A; reuse
  the committed 20-pc pins when TAP is down. Merged `origin/master`
  `a091a7f` (no rebase). Implementation narrowed accordingly; review
  branch prepared for review.
- Plan A gate passed (Europe/Warsaw, afternoon of 24 Nov): IV/27A via
  CFA reproduced `64279ff8…` and 3569 rows; the 20-pc reuse path left
  the committed extract and ReadMe byte-identical. No `data/source/`
  writes.
- Review of `98a6ed9` came back BLOCK. One fix commit addresses all five
  points: CFA also pin-checks the committed IV/27A normalised hash; IV/27A
  falls back to CFA on HTTPException and TAP parse/pin failure (CFA still
  pin-checked); 20-pc reuse provenance is written into the manifest and
  the CLI reports reused; reused ReadMe sha256 is checked against the
  manifest pin; ASU transport provenance is required and pinned for CFA
  IV/27A, and forbidden on TAP manifests. Current TAP-pinned
  `data/source/` artifacts are unchanged. Fast checks after the fix
  (Europe/Warsaw, 15:43): `data:test` 160 OK; `data:validate` 337 systems
  and six sources; `tasks.py check` 126 tasks / 35 ADRs; prettier on
  `data/schema/*.json` OK.
- Approved follow-up: TAP CSV parser errors also fall back to CFA; regression
  coverage pins the classical row count, prevents writes after CFA pin rejection,
  and rejects incomplete 20-pc reuse provenance. The current TAP-pinned source
  artifacts remain unchanged. Fast checks (Europe/Warsaw, 15:55): `data:test`
  162 OK; `data:validate` 337 systems and six sources; `tasks.py check`
  126 tasks / 35 ADRs; prettier on `data/schema/*.json` OK. Deleting the
  local row-count pin check made the new same-hash/different-count test fail;
  the check was restored before commit.
