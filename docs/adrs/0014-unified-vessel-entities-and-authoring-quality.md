# ADR-0014: unified vessel entities and authoring quality

Status: Accepted
Date: 2026-07-28

## Context

ADR-0007 introduced `vessel_type` as a classification-only direct narrative entity.
Chapter 1.12 exposes the practical mismatch: Heaven-1 is both a named spacecraft
design and the first vessel associated with that design, following the naval
tradition in which subsequent ships of a design may inherit the first ship's name as
their class name. Excluding it because the source first presents one ship loses a
durable narrative object, while inventing a separate instance/type split is not
useful to the companion.

The same extraction exposed three authoring-quality failures. An unnamed, short-lived
station was promoted to `megastructure`; character `current_state` accumulated a
synopsis; and technology descriptions described what Bob did with a technology
instead of defining its general capabilities.

## Decision

- Replace the direct entity type `vessel_type` with `vessel` as a clean break.
  Stable IDs use `vessel:*`; no `vessel_type` alias or compatibility path remains.
- A `vessel` record may represent a named spacecraft, a reusable design, or the ship
  family associated with its first vessel. The companion does not create a separate
  instance/type identity layer.
- A vessel requires immutable `id` and nonempty `name`. It may contain optional,
  clearable, original plain-text `description` and optional, clearable
  `current_state`.
- A later vessel update may replace `name`, and may replace or clear `description`
  and `current_state`. It never changes `id`.
- A vessel description defines the vessel or design, intended role, durable systems,
  capabilities, and limitations. Its current state records only a meaningful latest
  operational condition.
- Every `current_state`, regardless of entity type, is an editorially enforced
  one- or two-sentence account of the latest known condition. It is not a biography,
  identity definition, chapter summary, or accumulated adventure log.
- Every entity description is a concise encyclopedia entry centered on the entity.
  Describe capabilities in general language such as `It can` or `It is used to`.
  Named-character relationships appear only when they are defining or when a
  source-supported assessment must be attributed.
- Reserve location kind `megastructure` for engineered structures exceptional in
  physical scale. Ordinary durable stations and bases use `locale`.
- Do not create a location merely because a chapter or appearance needs one.
  Incidental, unnamed, or short-lived places remain unmodeled.
- Use the most specific eligible, reader-visible location supported by the source.
  If a fine-grained locale is unavailable or omitted, use its nearest established
  reader-visible parent. Never invent a containment relationship.

## Consequences

- Schema definitions, stable-ID unions, semantic validation, projection, generated
  entity types, browser groups, inspectors, diagnostics, tests, and integrated
  documentation use `vessel` and `vessel:*`.
- Historical completed tasks and superseded ADR wording remain unchanged as records
  of the former contract. Integrated current-authority documents must use the new
  contract.
- Existing chapter-authored state and descriptions require a retroactive editorial
  audit at every reader boundary, not only in the latest projection.
- Chapter 1.12 uses Earth as the supported parent location instead of introducing its
  unnamed launch station. Epsilon Eridani remains a mapped destination, and Heaven-1
  becomes the first vessel record.
- Sentence brevity and encyclopedia voice remain editorial rules with regression
  coverage; JSON Schema does not attempt brittle sentence parsing.

## Alternatives considered

1. Retain `vessel_type` internally and relabel it in the UI. Rejected because the
   contract would continue to contradict the unified concept.
2. Add separate `vessel` and `vessel_type` records. Rejected because the project does
   not need instance tracking and naval naming makes the split artificial here.
3. Keep vessel descriptions immutable and store operational condition only in
   summaries. Rejected because named vessels need spoiler-safe, chapter-projected
   current state.
4. Add an ordinary `installation` location kind. Rejected in favor of using `locale`
   for durable ordinary stations and bases.
5. Preserve required fine-grained placeholder locations. Rejected because disposable
   entities weaken the companion and invent precision.

## Follow-up

- BOB-035 implements the clean-break contract, retroactive audit, extraction rules,
  Chapter 1.12 candidate revision, tests, and integrated documentation.
- ADR-0007 remains historical but is superseded wherever it defines
  classification-only `vessel_type` entities.
