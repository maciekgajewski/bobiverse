# BOB-20261124-SWF7EZ: Pav icon assignment and catalogued-star mapping guard

Status: Done
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-24

## Objective and user-visible outcome

Two LAN follow-ups from the read-through through 2.77, plan step (A):

1. The Pav species icon is already registered (`species-style:pav`, `asset:species-pav`,
   `public/assets/species-icons/pav.svg`) but `species:pav` has no presentation
   assignment, so it falls through to `species-style:unknown`. After this task,
   `species:pav` uses the Pav style.
2. A `star_system` location that is still unmapped at the latest narrative state
   (no `astronomy_object_id`, including `map_status: "unmapped"`) must not uniquely
   match a system in the runtime catalogue `src/data/nearby-systems.json`.
   `narrative:validate` rejects that case, with a small explicit allowlist so
   documented exceptions and temporary pending mappings can land. A now-mapped
   allowlist entry is also an error, so the list cannot rot.

No chapter JSON is edited. With the allowlist in place, current master data
continues to pass validation. The Pav assignment is the only reader-visible change.

## Authorization

- The Captain, via the Piotr Developer Manager, 24 Nov 2026 12:20 Europe/Warsaw:
  "Don't block on me. Use existing rules to verify the changes" (12:10).
- Plan step (A) of the 24 Nov LAN triage: Pav icon assignment, the catalogued-star
  mapping guard, temporary allowlist entries for the five pending mappings, and
  standing exceptions for `location:gamma-leporis-a` and `location:hip-84051`.

## Binding references

- `../adrs/0024-species-presentation-registry.md`
- `../adrs/0034-catalogued-star-mapping-guard.md` (this task; Accepted)
- `../data-model-definition.md` (`map_status`, `astronomy_object_id`, unmapped
  locations)
- `../chapter-extraction.md`
- AGENTS.md: unknown book locations remain explicitly unmapped; never invent
  coordinates
- `scripts/common.py` `normalize_astronomy_name` (Gliese / GJ equivalence; keep
  component suffixes)

## In scope

1. Add `{ "species_id": "species:pav", "style_id": "species-style:pav" }` to
   `data/presentation/species.json` assignments, and a unit test that
   `species:pav` resolves to the Pav style (`src/narrative/species-presentation.ts`).
   Update the existing pinned-assignments assertion in
   `tests/unit/species-presentation.test.ts`.
2. A `narrative:validate` guard in `src/narrative/model.ts` (final accumulated
   state after all chapters, next to the existing `knownAstronomyObjectIds`
   checks) as specified under Acceptance criteria.
3. Allowlist file, schema, and `data:validate` hook.
4. Unit tests with fixtures, including a real-catalogue check that the five
   temporary entries are caught when removed from the allowlist, and that current
   data passes with the allowlist.
5. Brief documentation in `docs/data-model-definition.md` and
   `docs/chapter-extraction.md`, plus ADR-0034.
6. This task file.

## Out of scope

- Mapping the pending systems (plan step B) or adding HIP 84051 / GJ 12454 to
  the runtime catalogue (plan step C).
- Editing chapter JSON, demoting non-sentient `species:` records, Eta Cas
  description or Mulder links, or any LAN deploy / production tag.
- Changing preflight unless item 8 does not already run `narrative:validate`.

## Acceptance criteria

1. `resolveSpeciesPresentations` on a world that includes `species:pav` uses
   `species-style:pav` (Pav icon path and colour), not the default Unknown style.
   The Others assignment is unchanged.
2. After all chapters, every `kind: "star_system"` location with no
   `astronomy_object_id` is checked against the runtime catalogue. A unique
   match is an error unless the location is on the allowlist.
3. Matching is conservative and exact after normalisation, not fuzzy:
   - Narrative keys come from the location `name`, `id` slug (strip the
     `location:` prefix; hyphens become spaces), and `aliases` if present.
   - Catalogue keys come from each runtime system's `name`, `alternates`,
     component `designation`, and HIP / GJ / Bayer / Flamsteed / published-name
     identifier fields (construct `HIP <id>` and `GJ <id>` from `hip_id` /
     `gj_id`).
   - Normalise by Unicode case-fold and whitespace collapse. Port the Gliese / GJ
     rule already in `scripts/common.py` `normalize_astronomy_name`: after
     case-folding, a designation whose first token is `gliese` or `gj` rewrites
     to canonical `gj <number>` and keeps an optional letter-only component
     suffix, so `Gliese 54` matches `GJ 54` but `Gliese 540` does not, and
     `Gliese 54 A` matches `GJ 54 A` but not unsuffixed `GJ 54`.
   - HIP designations normalise to `hip <number>` (`HIP 14101`, `hip-14101`,
     `HIP14101`).
   - Bayer / proper names match only as the full normalised phrase
     (`Delta Pavonis` / `delta-pavonis` → `delta pavonis`). Do not strip a
     trailing component letter: `Gamma Leporis A` must not match catalogue
     `Gamma Leporis`.
   - A key that belongs to more than one catalogue system is not a unique match
     and must not raise this error (components of one system still count as one
     system id).
   - Do not fuzzy-match substrings, typo-tolerant names, or bare numbers.
4. Allowlist: a small JSON file (recommended
   `data/config/unmapped-star-allowlist.json`) with a schema and a reason per
   `location_id`. Required entries:
   - `location:gamma-leporis-a` — existing documented explicit unmapped
     exception.
   - `location:hip-84051` — not in the runtime catalogue yet (plan C).
   - Temporary, to be removed in data batch (B): `location:gamma-pavonis`,
     `location:delta-pavonis`, `location:hip-14101`, `location:gliese-54`,
     `location:gliese-877`.
5. An allowlist entry whose location is now mapped (`astronomy_object_id` set)
   is an error. An allowlist id that is missing, or is not a `star_system`, is
   also an error.
6. Unit tests with fixtures prove: unique catalogue matches fail; allowlisted
   unmapped locations pass; a stale (now mapped) allowlist entry fails;
   non-unique or non-exact keys do not fail; `Gamma Leporis A` does not match
   `Gamma Leporis`; `Gliese 54` matches `GJ 54`. A test using the real runtime
   catalogue and current chapter data fails on the five temporary ids when they
   are removed from the allowlist, and passes with the allowlist present.
7. `npm run narrative:validate` passes on current data with the allowlist.
   `scripts/extraction_preflight.py` item 8 picks the guard up through
   `narrative:validate`; change preflight only if that is not already true.
8. Fast checks pass, then full e2e (three browsers) and CSP on alt ports 4211
   and 4210 (never 5173). Baselines: 95 / 95 / 96 passed, CSP 3/3.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run narrative:manifest
npm run narrative:validate
npm run build
git diff --check
```

Then e2e (chromium, firefox, webkit) and CSP with the temporary alt Playwright
configs on ports 4211 and 4210.

## Documentation and generated artifacts

- One short paragraph in `docs/data-model-definition.md` (near the `map_status`
  / mapped `star_system` rules) and a matching note in `docs/chapter-extraction.md`.
- ADR-0034, Status: Accepted, recording the unique-match rule, conservative
  normalisation, and allowlist-with-stale-entry check. Conventions require an
  ADR here because this is a narrative data-authority rule (when an unmapped
  star system is allowed to remain unmapped).
- Schema and `data:validate` coverage for the allowlist file.
- No chapter JSON or runtime catalogue regeneration.

## Known risks or unresolved decisions

- The check uses the latest accumulated state after all chapters, not a
  per-chapter snapshot, so an introduction that is unmapped and a later update
  that sets `astronomy_object_id` is valid.
- `location:gamma-leporis-a` is allowlisted as a documented exception even if
  conservative matching would not uniquely match `Gamma Leporis`.
- Matching inspects only the runtime 337-system catalogue, not
  `system-candidates.json`. HIP 84051 therefore needs the standing allowlist
  until plan C puts `stellar-system-004437` in `nearby-systems.json`.

## Log

### 2026-11-24 (Europe/Warsaw)

- Implemented on branch `bob-20261124-unmapped-guard` from `77c9394`, worktree
  `~/src/bobiverse-guard`. Head `cdf3dcc` added the Pav assignment and
  catalogued-star mapping guard; review nits were folded in `ccadb0b`.
- The manager checked `ccadb0b` (OK) and approved the landing after (B) landed
  on origin/master as `a091a7f`. Merged `origin/master` (`a091a7f`) into this
  branch (no rebase).
- ADR-0034 set to Accepted (date 2026-11-24). Status set to Done in this
  docs-only recording commit; landing follows.
