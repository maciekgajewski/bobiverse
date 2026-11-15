# BOB-20261115-446D62: chapter links, no status tags, zero-state descriptions

Status: In progress
Phase: 5 (publication readiness)
Last updated: 2026-11-15

## Objective and user-visible outcome

- **Info card recency line.** In "Active in Chapter X" and "Last active in
  Chapter X", the chapter is a link, in the inline entity link style, that opens
  that chapter's info card (the same chapter selection as the travel-stop
  chapter links).
- **Map knowledge badge.** In "Latest known · Knowledge through Chapter X" (and
  "Universe in … · Knowledge through Chapter X" in Date mode), the chapter is a
  link to that chapter's info card. It is a real button with a visible focus
  ring and still fits beside Search and Reset view at 360-412px.
- **No status tags.** The info card no longer shows the "Narrative-known ·
  Active · Unmapped" tag row (Maciej, 2026-11-15). The recency line keeps Active
  or Last active; a location's Map context still says "Explicitly unmapped". The
  Object Browser's "Active" / "Last active ·" row subtitles are a separate
  component (`ObjectBrowser.tsx`) and are unchanged.
- **Zero-state descriptions.** Maciej's own texts are in the zero-state
  baseline, so they show from the pre-book state with no chapter activity:
  Earth "Mostly harmless.", Moon "Is a harsh mistress." and Human "Homo sapiens
  non urinat in ventum."
- **Earth and Moon illustrations.** Their info-card headers show the UI
  Designer's approved 66x66 lossless WebP crops, wired like GUPPI's and
  Jeeves's (the same 3.5rem header frame, the credit as alt text):
  `earth-head.webp` (Apollo 17 Blue Marble, AS17-148-22727) and
  `moon-head.webp` (NASA/GSFC/ASU LRO nearside colour mosaic), both public
  domain, credited in `public/assets/CREDITS.md` and About > Credits. Earth and
  the Moon are known in the zero state, so their pictures show from the start.
  The Human species icon is unchanged.

## Spoiler gating

Chapter links open a chapter only up to the reader's Read through chapter:
`ChapterLink` renders a later chapter (which the projection should never show)
as plain text, and the chapter selection itself (`selectKnowledgeChapter`)
refuses chapters beyond Read through. Following a link can move the knowledge
view back, never Read through forward. Opening a chapter's card selects that
chapter in Chapter mode, as the travel-stop chapter links already do, so from
Date mode it switches to Chapter mode.

## Authorization

- Maciej requested the chapter links, the tag removal and the zero-state
  descriptions on 2026-11-15; the Piotr Developer Manager relayed them as one
  local branch for review: no push, no merge to master and no tag.
- The data change is a narrow, explicit exception for
  `data/narrative/baseline/zero-state.json` only. These are Maciej's own texts,
  not book text. The Extractor's `chapters/canonical-descriptions` (`7edd45a`)
  was used only as a reference for the `description` field; it is not merged
  or cherry-picked, and no chapter file changes.

## Binding references

- `../../AGENTS.md`
- `../development-process.md`

## Scope

- `src/components/ObjectInspector.tsx`: `ChapterLink`, the linked recency
  line, the tag row removed.
- `src/App.tsx`, `src/styles.css`: the linked knowledge badge and its focus
  ring.
- `data/narrative/baseline/zero-state.json` and the narrative-equivalence
  snapshot (only the three descriptions).
- `src/about-image.ts`, `src/narrative/header-illustration.ts`,
  `src/components/AboutDialog.tsx`, `public/assets/earth-head.webp`,
  `public/assets/moon-head.webp`, `public/assets/CREDITS.md`: the Earth and
  Moon illustrations and their credits.
- Tests: component tests for the links, their gating and the missing tags;
  `tests/e2e/chapter-links.spec.ts` for both links on desktop and at 360x800,
  390x844 and 412x915.

## Out of scope

- Book text, chapter JSON, tags, the release itself.

## Validation

```bash
python3 scripts/tasks.py check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run data:test
npm run data:validate
npm run narrative:validate
npm run build
npx prettier --check <changed Markdown>
git diff --check
# e2e: chromium, firefox and webkit on port 5205, one worker, no retries,
# untracked alt config, deleted afterwards.
npm run test:e2e:csp
```

## Manual test checklist (for Maciej)

1. Set Read through to a chapter after 1.1. The map badge reads "Latest known ·
   Knowledge through Chapter X" with "Chapter X" underlined; click or tap it:
   that chapter's info card opens.
2. Open a character, for example Garfield: there is no "Narrative-known ·
   Active" row, and "Last active in Chapter Y" (or "Active in …") links to
   Chapter Y's card. Read through does not change.
3. On a phone (360-412px wide) the badge, Search and Reset view fit on one row
   and the chapter number is visible.
4. Tab to the badge's chapter link: the badge shows a cyan focus ring.
5. In the pre-book state, open Earth, the Moon and Human: their descriptions are
   "Mostly harmless.", "Is a harsh mistress." and "Homo sapiens non urinat in
   ventum.". Earth and the Moon show their NASA photographs in the header.

## Risks and decisions

- "Unmapped" was removed with the tag row: in the data only two locations are
  explicitly unmapped, and a location's Map context section already shows
  "Explicitly unmapped", so the tag carried no extra information.

## Log

### 2026-11-15 (Europe/Warsaw)

- Implemented on `bob-20261115-chapter-links` from `f794a35`.
- Added the Earth and Moon header illustrations (manager-approved assets from
  the UI Designer, byte-identical to the supplied files).
