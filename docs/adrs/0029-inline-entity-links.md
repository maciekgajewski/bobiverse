# ADR-0029: inline entity links in narrative prose

Status: Accepted
Date: 2026-11-15

## Context

Maciej asked (2026-11-14 22:54 CET): "Descriptions should be able to contain links
to other entities." Until now every narrative prose field was plain text with no
markup: ADR-0005 defines the chapter summary as original plain text, and ADR-0007
and ADR-0014 do the same for `description`. The inspector renders prose as React
text nodes. The only way to move from one entity to another was a typed
relationship link, which exists only where the data model has a structural
reference field.

Entity IDs already carry their kind (`location:sol`) and are globally unique, so a
link can name its target by ID alone. The corpus contains no `[`, `]`, `|` or `\`
in any prose field, so a bracket syntax needs no migration.

## Decision

- **Syntax.** A link is `[[kind:slug]]` or `[[kind:slug|label]]`. The target is an
  entity ID, verbatim; the kinds are exactly the supplemental-mention target kinds
  (`character`, `species`, `technology`, `organization`, `vessel`, `event` and
  `location`). Inside the brackets the syntax is strict: no whitespace, at most one
  `|`, no line break, and a label with no leading or trailing whitespace and none of
  `[`, `]`, `|` or `\`. Outside links, `\[[`, `\]]` and `\\` write a literal `[[`,
  `]]` and `\`; a `\` before anything else is an error. Lone `[`, `]` and `|` are
  ordinary text.
- **Fields.** Links are allowed in every `description` (species, technology,
  organization, vessel, event and location), location `state`, character,
  organization and vessel `current_state`, and the chapter `summary`, in
  introductions, updates and the zero state. Every other string, including names,
  aliases, titles, survey `visual_description` and `color`, asset `source`, book
  titles and sentence-preservation exception reasons, rejects link markup and
  escapes.
- **Spoiler safety.** A link target must exist and must be introduced in the
  write's own chapter or earlier in reading order. `effective_date` does not change
  the write's chapter. Zero-state prose may link only zero-state entities. A record
  may not link to itself. `narrative:validate` enforces these rules in the semantic
  layer, using the shared parser in `src/narrative/inline-links.ts`; the JSON Schema
  stays structural.
- **Rendering.** The inspector renders a link whose target is in the current
  projected world as an inline entity button that selects the target like a
  relationship link. A target that the current view does not project, such as an
  entity whose date is after the Date-mode display date or an undated event in Date
  mode, renders as plain text with no hint. `[[id]]` displays the target's current
  projected name when visible, and otherwise its name as of the write's chapter,
  which is precomputed when the corpus is prepared. Other surfaces use display plain
  text and never show raw markup.
- **Prose, not structure.** ADR-0017 still holds: a link is prose. It adds no
  narrative activity, does not satisfy or make redundant a supplemental mention,
  and is not a structural reference.
- **Sentence preservation.** The merged-text check compares display text: link
  markup becomes its label or default name and escapes are removed before sentences
  are split. Adding, removing or retargeting markup around unchanged words is not a
  violation; changing the visible words still is.

This amends the plain-text wording of ADR-0005 (summary), ADR-0007 and ADR-0014
(`description`): those fields are plain text with optional inline entity links, and
still never Markdown.

## Consequences

- Readers can move from prose to the entities it names without new structural
  fields.
- A link can never reveal a later-introduced entity in Chapter mode. In Date mode a
  link to a not-yet-projected entity degrades to plain text.
- The validator rejects malformed markup, so raw `[[…]]` never reaches readers.
- Authoring links is a separate data change by the Extractor, validated by
  `narrative:validate`.

## Alternatives considered

- **Markdown links.** Rejected: prose stays free of Markdown, and URLs are not the
  target vocabulary.
- **Name matching at render time.** Rejected: ambiguous across aliases and kinds,
  and not reviewable in source.
- **Links as structural references.** Rejected: prose is not structure (ADR-0017).

## Follow-up

- Implementation and tests: `../tasks/BOB-20261115-4CNJ7E-entity-links.md`.
- The Extractor adds links to chapter data in a separate data branch.
