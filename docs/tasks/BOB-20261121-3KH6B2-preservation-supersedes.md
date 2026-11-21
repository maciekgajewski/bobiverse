# BOB-20261121-3KH6B2: supersedes marker for back-dated state

Status: In progress
Phase: 2 (narrative foundation and chapter timeline)
Last updated: 2026-11-21

## Objective and user-visible outcome

Make the sentence-preservation check accept a legitimate state replacement
without an exception row, and keep it where an accidental loss is plausible
(design D, approved by the manager on 2026-11-21).

- `state` and `current_state` use the `back-dated` policy instead of
  `same-date`. A write dated at its chapter (no `effective_date`, or one not
  earlier than the chapter date) is the newer state and replaces a same-date
  earlier-read state, as the soft-ceiling projection does when dates tie. It is
  not checked.
- A back-dated write (`effective_date` strictly earlier than the chapter date)
  must keep every sentence of the latest-read earlier write of an equal or
  overlapping date, or its update must carry `"supersedes": true`.
- The marker is an error unless the update is back-dated and its `state` or
  `current_state` would drop a sentence. It never exempts `description` or
  `visual_description`, and it never affects projection.
- Schema: optional `supersedes` (`const: true`) on `character_update`,
  `organization_update` and `vessel_update`, mirrored in
  `docs/data-model-definition.md`.

Case: the Extractor's 1.2 `character:robert-johansson` update back-dated to
2016 replaces 1.1's 2016 state; with the marker it passes.

No reader-visible change.

## Authorization

- The manager relayed Maciej's request (2026-11-21, Europe/Warsaw) to fix the
  preservation rule for legitimate superseding updates, then approved design D
  and this scope on 2026-11-21.
- Chapter data (`data/narrative/chapters/**`) is out of scope: the Extractor
  adds the markers. `docs/design-principles.md` is out of scope: the §5 item 9
  rewording goes to Maciej for approval.

## Binding references

- `../design-principles.md` (§2.5, §5 item 9)
- `../adrs/0031-design-principles-constitution.md`
- `../engineering-principles.md`
- `../chapter-extraction.md` §Post-write validation

## Scope

1. `src/narrative/sentence-preservation.ts`: the `back-dated` policy, the
   marker, and `findUnusedSupersedesMarkers`; `scripts/narrative-cli.ts` reports
   unused markers.
2. `src/narrative/model.ts`: `supersedes` is update metadata, never projected.
3. Schema and `docs/data-model-definition.md`.
4. Delete the 14 state exception rows the new policy makes unused; keep the 1.51
   `character:milo` row until the Extractor's marker replaces it.
5. Behaviour tests in `tests/unit/sentence-preservation.test.ts`.
6. Docs: the module comment, `docs/chapter-extraction.md`,
   `docs/development-process.md`, and the extraction skill.
7. Mark BOB-20261121-3ASZWN Done in a separate commit.

## Out of scope

- Chapter data, including the markers for 1.2 and 1.51.
- `docs/design-principles.md` (proposed wording goes to Maciej).
- Narrowing the exception `field` list to `description` and
  `visual_description` (possible once the milo row is gone).
- Deploy and a production tag.

## Acceptance criteria

- A later-read same-date write dated at its chapter that drops sentences
  passes.
- A back-dated write that drops a same-date sentence fails, with a message that
  names the marker; with `"supersedes": true` it passes.
- A marker on an update that is not back-dated, keeps every sentence, or writes
  no state is reported and fails `narrative:validate`.
- The marker does not excuse a dropped description sentence.
- `npm run narrative:validate` passes on master data with 74 exception rows.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
git diff --check
```

No UI change, so no e2e and no CSP run (Maciej's rule, 2026-11-21).

Manual check: no UI change; `npm run narrative:validate` passes on master data.

## Documentation and generated artifacts

The docs listed in scope item 6, the schema and its mirror. No generated
artifact changes.

## Known risks or unresolved decisions

- Maciej approves the `docs/design-principles.md` §5 item 9 rewording.

## Log

### 2026-11-21 (Europe/Warsaw)

- Created on master `dfc87c4` on local branch
  `bob-20261121-preservation-supersedes` in the `~/src/bobiverse-supersede`
  worktree.
- Marked BOB-20261121-3ASZWN Done in a separate commit.
- Implemented design D. Full validation on the working tree: `tasks.py check`,
  format, lint (0 errors; 1 existing warning), typecheck, unit tests (842
  passed), data:test (93 OK), data:validate, narrative:validate, build and
  `git diff --check` pass. No UI change, so no e2e or CSP run.
- Verified on a temporary copy with the Extractor's `d4d490cc` 1.2 chapter: it
  fails without the marker with a message naming `"supersedes": true`, passes
  with it, and the marker is reported when the update is not back-dated. With
  the 1.51 `character:milo` marker added as well and its row removed, it passes
  with no state exception rows left.
- Awaiting manager review.
