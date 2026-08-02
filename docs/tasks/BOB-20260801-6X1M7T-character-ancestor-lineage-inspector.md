# BOB-20260801-6X1M7T: character ancestor lineage inspector

Status: Done
Phase: 3 (character histories and genealogy)
Last updated: 2026-08-02

## Objective

Display a selected character's reader-visible direct ancestry in the shared object
inspector and add explicit chapter provenance for source-supported character births
and clonings.

## User-visible outcome

When a selected character has a known parent, the desktop right-hand inspector and
the shared compact inspector show an **Ancestors** section. Its vertically ordered
list starts with the direct parent and continues downward through each progressively
older known ancestor.

Each ancestor row uses the compact visual language of the left object-browser rows.
It shows the ancestor's name and independently includes the known birth/cloning
chapter and birth/cloning date when available. The name selects that ancestor. The
chapter link moves the reader view to that chapter and opens the chapter inspector.
The date is informational rather than a separate navigation target.

## Binding references

- `../../AGENTS.md`
- `../technical-design.md`
- `../implementation-plan.md`
- `../data-model-definition.md`
- `../adrs/0001-chapter-authored-narrative-state.md`
- `../adrs/0002-reader-order-visibility-and-story-time-projection.md`
- `../adrs/0004-unversioned-narrative-schema-contract.md`
- `BOB-015-phase-2-desktop-integration-and-acceptance.md`
- `BOB-036-chapter-inspector-and-compact-timeline.md`
- `BOB-20260731-6A6ZX0-character-parent-lineage.md`

No new ADR is expected. The task extends the existing chapter-authored character
contract with one optional relationship to an existing chapter and presents a
derived reader-safe traversal through the existing shared inspector. It does not add
a second narrative authority, genealogy graph, or visibility service. ADR-0004
requires the schema and all current consumers to change atomically without a legacy
compatibility path.

## Ratified decisions

1. The section is conditional and appears only when the selected reader-visible
   character has a resolvable `parent_id`.
2. The list is linear: direct parent first, then that parent's parent, continuing
   downward through progressively older ancestors.
3. The task adds optional `birth_chapter` to characters. It identifies the story
   chapter that depicts or clearly establishes the character's actual birth or
   cloning, not the chapter that merely reveals a date or first makes the character
   visible.
4. For a replicant, an explicitly initial activation as a newly created identity is
   its birth/cloning point. Activation alone is insufficient: reactivation, restart,
   hardware transfer, recovery, or bringing a pre-existing identity online does not
   establish `birth_chapter`.
5. Authors omit `birth_chapter` whenever that meaning is not clear from the source.
   UI code never infers it from introduction order, activity, `birth_date`, or a
   chapter's matching date.
6. Existing authored characters are reviewed and backfilled when `birth_chapter` is
   clearly supported. Unsupported or ambiguous values remain absent.
7. `birth_chapter` and `birth_date` are independent optional facts. An ancestor row
   displays either one without requiring the other.
8. The ancestor name selects that character through the existing transient inspector
   history. The date is informational.
9. The chapter is a distinct link. Activating it changes `viewChapter` to the linked
   chapter, switches to Chapter mode when necessary, and then opens that chapter in
   the inspector. This is ordinary chapter navigation, remains within
   `furthestChapterRead`, and does not alter reader progress.
10. Both wide and compact layouts render the same shared lineage content and behavior.
11. Traversal is derived only from the current `NarrativeWorld` projection. Missing
    or ineligible parents terminate the visible chain.
12. Because the canonical parent contract does not prohibit cycles, the UI traversal
    must terminate safely on a repeated character ID. It does not diagnose, repair,
    or expose invalid-looking speculative ancestry to the reader.
13. This task provides an ancestor list in character context, not the later
    full-screen Bob genealogical-tree tool.
14. Zero-state characters may not carry `birth_chapter`: there is no enclosing
    reader-visible source chapter against which to validate the reveal. Semantic
    validation rejects it even though introductions and zero state share the
    structural character schema.

## Inputs and evidence workflow

- The audit input is limited to the prepared canonical narrative corpus and its
  already-reviewed, original structured facts: chapter IDs, introductions, updates,
  summaries, and current-state descriptions. The implementation owner performs this
  audit directly; no plaintext book source, sealed evidence, extraction agent, or
  external provider participates.
- Verify that the audited chapter set exactly matches the prepared canonical
  manifest, currently Book 1 Chapters 1 through 21. A missing or invalid canonical
  chapter blocks the audit rather than reducing scope silently.
- Audit only the narrow claim “the existing structured facts explicitly state that
  this character's birth or cloning occurs in this enclosing chapter.” For a
  replicant, an initial activation qualifies only when those same facts identify it
  as the newly created identity's first activation. A mere introduction,
  `parent_id`, matching date, appearance, activity, later activation, restart,
  transfer, or recovery is insufficient. If the canonical facts only reveal that a
  character is a clone, or if determining the chapter would require rereading
  plaintext source, omit the value and defer it to a separately authorized editorial
  extraction workflow.
- Produce an ignored quote-free audit record under `/tmp` containing the canonical
  manifest fingerprint, every currently authored character ID, its supported
  entity/chapter pair or explicit ambiguous/unsupported outcome, and the exact
  proposed candidate. Review that candidate against the canonical structured facts
  before applying it through the character's canonical introduction or update.
- Document the quote-free audit outcome and validation in the task. No external
  source, evidence excerpt, or temporary audit artifact enters Git.

## In scope

- Add optional `birth_chapter` to character introductions and nullable
  `birth_chapter` to character updates under the existing patch semantics.
- Reject `birth_chapter` on zero-state characters during semantic validation.
- Retain the effective reader/story-projected value on characters.
- Validate `birth_chapter` syntax and require it to reference a canonical authored
  chapter no later in reader order than the source record that reveals the fact.
- Update the machine-readable schema and its identical documented schema listing.
- Document the distinction between actual birth/cloning chapter, reveal chapter,
  introduction chapter, and `birth_date`.
- Review every currently authored character and backfill only source-supported,
  unambiguous birth/cloning chapters.
- Derive the ordered ancestor chain from projected `parent_id` relationships with
  missing-reference and repeated-ID guards.
- Render the conditional lineage section in `ObjectInspector` for both wide and
  compact consumers.
- Reuse or extract the left-browser row primitives needed for consistent bullet,
  spacing, typography, hover, focus, and selected-link treatment without coupling
  inspector behavior to `ObjectBrowser` state.
- Provide separate accessible controls for the ancestor name and birth-chapter link.
- Wire birth-chapter navigation through the centralized reader-view and selection
  state so the linked chapter becomes `viewChapter` in Chapter mode before chapter
  inspection.
- Add schema, semantic-validation, projection, derivation, rendering, keyboard,
  navigation, spoiler-boundary, and responsive regression coverage.
- Update directly affected technical design, data-model, implementation-plan, and
  source-authoring guidance in the same change.

## Out of scope

- Descendant lists or reverse child derivation in the inspector.
- A branching tree, graph layout, generation labels, relationship lines, or the
  Phase 3 Bob genealogical-tree tool.
- Multiple parents, creator/operator attribution, character subtypes, or a
  replicant marker.
- Inferring a birth/cloning chapter from a matching date, introduction, appearance,
  activity record, or current lineage.
- Adding dates or chapters unsupported by reviewed source evidence.
- Making dates clickable or switching to Date mode from an ancestor row.
- Opening an arbitrary historical chapter inspector without changing `viewChapter`.
- Changing `furthestChapterRead`, deep-link behavior, browser history, or URL state.
- Retrospective changes to `parent_id` unless a concrete data error is discovered and
  separately surfaced.
- Full mobile redesign under BOB-016.

## Acceptance criteria

1. The machine-readable narrative schema and its identical documented listing accept
   optional character `birth_chapter` values using the canonical chapter-ID format.
2. Character updates accept a chapter ID or `null` for `birth_chapter`; setting,
   replacing, clearing, and omission follow existing character patch semantics.
3. Semantic validation rejects a nonexistent or later-reader-order
   `birth_chapter`, while accepting a canonical same-chapter or earlier chapter.
4. Semantic validation rejects `birth_chapter` on a zero-state character and focused
   coverage proves that the shared structural character schema does not bypass this
   rule.
5. Reader/story-time projections expose only the effective reader-visible
   `birth_chapter` and do not reconstruct it from other fields.
6. Every currently authored character receives a `birth_chapter` only when the
   existing canonical structured facts explicitly place the actual birth or cloning
   in that chapter. A replicant's initial activation qualifies only when the facts
   establish it as the newly created identity's first activation; ambiguous cases
   stay absent and are documented.
7. Selecting a character with a resolvable projected parent renders an
   **Ancestors** section in the shared inspector; a character without one renders no
   empty section or placeholder.
8. Rows are ordered direct parent first and progressively older ancestors downward,
   and include each eligible ancestor at most once.
9. Each row always shows the ancestor name, shows `birth_chapter` and `birth_date`
   independently when present, and omits unavailable metadata without placeholder
   text.
10. Activating an ancestor name selects that projected character through existing
   inspector Back/Forward history without changing reader progress.
11. Activating a birth-chapter link from either Chapter or Date mode switches to
    Chapter mode, changes `viewChapter` to that eligible chapter, and opens its
    chapter inspector without changing `furthestChapterRead`.
12. The ancestry chain uses only the current centralized projection, never raw
    chapter JSON or a second spoiler filter, and terminates on a missing parent or
    repeated ID.
13. The list has left-browser-consistent visual hierarchy and clear hover, keyboard
    focus, and link affordances without copying browser group state or semantics.
14. Wide and compact inspectors expose equivalent content and interaction, remain
    within their scrollable viewport, and introduce no horizontal overflow at the
    established responsive breakpoints and 200% desktop zoom.
15. Accessible names distinguish the character and chapter links; keyboard users can
    operate both in row order, and automated coverage verifies focus and navigation.
16. Technical design, data-model definition, implementation plan, and relevant
    source-authoring guidance agree on provenance, visibility, navigation, and scope
    boundaries.
17. The temporary quote-free audit covers exactly the canonical authored chapter set,
    accounts for every authored character, records the canonical manifest
    fingerprint, and produces an exact candidate; no temporary audit artifact enters
    Git.
18. Focused tests and the full documented validation pass, manual visual acceptance
    is recorded, and an independent implementation review reports `No findings.`

## Validation

```bash
python3 scripts/tasks.py check
npm run narrative:manifest
npm run narrative:validate
npm run data:validate
npm test -- tests/unit/narrative.test.ts tests/unit/narrative-browser.test.ts \
  tests/component/ObjectInspector.test.tsx tests/component/App.test.tsx
npm run typecheck
npm run lint
npm run build
npm run test:e2e -- tests/e2e/atlas.spec.ts
git diff --check
```

Any additional focused test file added by implementation must also be included in the
command above. Component coverage must begin chapter-link navigation from both
Chapter and Date modes. Manual visual acceptance must cover a multi-generation
character in the wide right panel and the compact inspector at normal zoom and 200%
desktop zoom.

## Documentation and generated artifacts

- Keep `data/schema/narrative-data-model.schema.json` byte-identical to the JSON
  schema listing embedded in `docs/data-model-definition.md`.
- Update `docs/technical-design.md` with `birth_chapter`, projected lineage
  derivation, and chapter-link navigation semantics.
- Update `docs/implementation-plan.md` Phase 3 to distinguish this contextual
  ancestor list from the later genealogical-tree tool.
- Update source-authoring guidance wherever character `birth_date` and `parent_id`
  are currently defined. Do not change the separate chapter-extraction workflow in
  this task.
- Regenerate only ignored runtime artifacts produced by the normal validation path;
  do not commit generated projections or source evidence.
- Do not commit book text, evidence excerpts, sealed ledgers, or temporary audit
  material.

## Known risks and unresolved decisions

- The current parent model permits cycles. The UI repetition guard is required for
  bounded rendering but is not domain validation.
- A chapter-link activation changes the projected world before selecting the chapter.
  State coordination must avoid an intermediate stale ancestor selection or duplicate
  accessibility announcement.
- Shared browser-row styling may currently be coupled to browser-specific selectors.
  Extract the smallest presentation primitive necessary and preserve ownership of
  browser grouping and inspector navigation.
- The canonical-data audit may find no clear `birth_chapter` for some or most
  characters. Absence is a valid outcome and must not be filled by inference or an
  unauthorized plaintext-source audit.
- Manual visual acceptance remains required before the task may become `Done`.

## Canonical-data audit outcome

The implementation audit covered the prepared Book 1 Chapter 1 through 21 manifest
and all 18 canonically authored characters. The ignored exact audit record is
`/tmp/bobiverse-birth-chapter-audit.json`; its manifest SHA-256 is
`417277652845259f82856b6ae7478b1a61b10b3c2e751a680e13ff89e28b7516`.

The existing Chapter 1.17 structured facts explicitly identify Riker, Bill, Milo,
and Mario as newly created identities receiving their initial activation in the
chapter's year `2145`, so those four characters receive both
`birth_chapter: "1.17"` and `birth_date: "2145"`. Bob, Garfield, and Homer remain
ambiguous under the ratified rule; every other character lacks qualifying structured
facts. No value was inferred from introduction, `parent_id`, unrelated date matching,
or activity, and no plaintext source or evidence excerpt was read or committed.

The task-document review closed with `No findings.` before implementation. A fresh
implementation review and the Captain's manual visual acceptance remain required.

## Validation record

- `npm run validate`: passed, including formatting, lint, typecheck, 78 Python tests,
  astronomy and narrative validation, 189 unit/component tests, and production build.
- Focused lineage Playwright regression: passed in Chromium, Firefox, and WebKit for
  wide and compact layouts.
- Full `tests/e2e/atlas.spec.ts`: the lineage regression passed after its locator was
  corrected, but the suite remains red on the unrelated pre-existing
  **Solar System enters and exits the fixed system mode** assertion that expects an
  Alpha Centauri map caption. The exact failing test was rerun independently and
  failed in all three browsers. This task does not change map-caption behavior or
  that assertion.
- Manual visual acceptance by the Captain passed on 2026-08-02.

The first visual inspection found that the Chapter 1.17 lineage row omitted its known
year because the audit had populated `birth_chapter` without the same structured
chapter fact's `birth_date`. The four qualifying characters now carry both values;
focused component and browser coverage require the rendered `Chapter 1.17 · 2145`
metadata.

The next visual inspection requested clearer lineage direction. Consecutive ancestor
rows now have a small presentation-only upward arrow between them. The arrows do not
create additional list items, focus stops, or accessible content.

The arrows were refined during visual inspection to use the app's bold cyan visual
language and to center between the full-width lineage rows.
