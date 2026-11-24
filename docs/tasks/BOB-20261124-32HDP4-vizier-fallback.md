# BOB-20261124-32HDP4: VizieR CFA ASU transport fallback

Status: In progress
Phase: 2 (narrative and astronomy integration)
Last updated: 2026-11-24

## Objective and user-visible outcome

Keep the same VizieR catalogues (`IV/27A/catalog` and `J/ApJS/271/55`
table4/notes4/refs) when TAPVizieR is unreachable, by adding an ordered
transport fallback to the CFA VizieR ASU interface. No reader-visible change
is expected if the CFA pull matches the current pinned checksums. This branch
does not re-pin source data.

## Authorization

The Captain (Maciej) directed a search for an alternative star catalogue on
2026-11-24 at 13:53 (Europe/Warsaw), verbatim: "Look for alternative star
catalog. This one may be diwn permanently". The Piotr Developer Manager
authorised this CFA fallback implementation at 14:02 (Europe/Warsaw) the same
day: research-and-plan only is complete; build this review branch in parallel
with other landings. Data re-pinning, if needed, belongs to a later refresh
and remains subject to ADR-0023 independent review.

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

1. In `refresh_classical_names_snapshot` and `refresh_c20pc_snapshot` only,
   use an ordered transport list. First try the current TAPVizieR ADQL on
   `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync`. If that transport
   fails, fall back to CFA ASU at
   `https://vizier.cfa.harvard.edu/viz-bin/asu-tsv` with the same catalogue
   IDs and columns, `-out.max=unlimited`, and a check that the result is
   complete (not truncated). Feed parsed rows through the existing
   normalisers (`normalise_rows`, `normalize_census_tables`, including the
   `HIP IS NOT NULL` filter for IV/27A). Prefer a shared endpoint-list
   config over duplicated hard-coding, if that stays lean.
2. Record in the refresh manifest the endpoint actually used and the
   request (existing `adql` remains the logical selection; record the ASU
   request when that transport is used). Keep `normalised_sha256` and
   `row_count` as today. `data:validate` must accept either allowed
   endpoint for these two sources. Current TAP-pinned manifests must still
   validate without new required fields.
3. 20-pc ReadMe: try the official cdsarc URL first. If it is unreachable,
   reuse the committed ReadMe pin with no re-fetch and no overwrite, and
   record that explicitly in provenance (no fetch, pin reused, the reason).
   The guard still checks the committed ReadMe for `04-Jun-2024` and
   bibcode `2024ApJS..271...55K`.
4. Lean Python unit tests: TSV parsing, fallback order, and the
   ReadMe-unreachable path.
5. Short documentation in `docs/data/astronomy-pipeline.md` (the repo's
   astronomy-source documentation). No new ADR; catalogue authority is
   unchanged.

## Out of scope

- Re-pinning or overwriting `data/source/` extracts, CSVs, or the 20-pc
  ReadMe in this branch (a later refresh task does that, with ADR-0023
  review if accepted candidates change).
- Changing GCNS, CNS5, Gaia DR3, or WDS transports or catalogues.
- Replacing VizieR catalogues with a different census.
- Full `npm run data:refresh`, e2e, UI, book text, `source-text/`, and
  landing this branch.

## Acceptance criteria

- TAPVizieR is still tried first; CFA ASU is used only when that transport
  fails.
- ASU requests use `-out.max=unlimited` and fail if the service reports a
  truncated result or an incomplete row count.
- Manifests record the endpoint actually used plus the request.
  `data:validate` and the JSON schemas accept either
  `https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync` or
  `https://vizier.cfa.harvard.edu/viz-bin/asu-tsv` for these two entries.
  Today's committed TAP manifests still pass `npm run data:validate`.
- A ReadMe fetch failure reuses the committed pin, does not overwrite the
  file, records provenance, and still applies the date and bibcode guard.
- Unit tests cover TSV parsing, fallback order, and the ReadMe-unreachable
  path.
- Gate (must pass before commit, and must not write tracked data files): a
  full CFA pull of all four extracts, compared to the current pins:
  - classical names: `64279ff81b83e607afa56b3655cad56baf1afea7c115461fb617f28c1d9f6faf`, 3569 rows
  - table4: `f860a4a2c6b67e4a509bb94f68668e8c3d5fd2b3b14116f8dfa475ca1e3675e7`, 4407 rows
  - notes4: `f5bca249cd51f4cccb22e451926fdbe7f29748a6550f9a5397934a5b262b97f6`, 4407 rows (4408 transport rows)
  - refs: `41bbe0d303d5ebc58f9158005db00b33e785f0b00bf2cbe40f49b2945858060b`, 688 rows
  If any hash or count differs, stop and report counts and first differing
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

1. Confirm the current pins from the committed manifests (do not assume the
   hashes above if master has moved).
2. With the new code, pull IV/27A (HIP not null, existing normaliser) and
   the three 20-pc tables from CFA ASU, `-out.max=unlimited`.
3. Compare each extract's `normalised_sha256` and `row_count` to the
   current pins (for notes4, also the 4408 transport rows).
4. If all four match, record a pass. If any differs, stop and report the
   counts and the first differing rows; do not re-pin data on this branch.

After the code change, also confirm `npm run data:validate` still passes on
the unchanged TAP-pinned manifests.

## Documentation and generated artifacts

- Update `docs/data/astronomy-pipeline.md` so the VizieR snapshot sections
  describe the ordered transport list, the CFA ASU fallback, manifest
  provenance (endpoint actually used plus request), `data:validate`
  accepting either endpoint, and the ReadMe reuse-pin behaviour.
- Do not invent a new ADR. Catalogue authority in ADR-0011 is unchanged.
- Do not commit refreshed `data/source/` artifacts in this task.

## Known risks or unresolved decisions

- A full CFA pull may not be byte-identical after normalisation. If the
  gate hashes differ, this branch stops without a data re-pin.
- TAP connection timeouts should be short enough that fallback is usable
  during an outage, without shortening the overall timeout of a live TAP
  query so far that a slow but working TAP is abandoned.
- The official cdsarc ReadMe path may stay down; reuse of the committed
  pin is then the documented behaviour until a later refresh can re-fetch
  it.

## Log

### 2026-11-24 (Europe/Warsaw)

- Task created after the research-and-plan step. Manager GO at 14:02 for
  the CFA fallback on branch `bob-20261124-vizier-fallback` from
  `origin/master` `77c9394`.
