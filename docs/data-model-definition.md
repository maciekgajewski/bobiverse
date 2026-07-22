# Narrative data-model definition

Status: In progress
Schema dialect: JSON Schema Draft 2020-12
Last updated: 2026-07-22

## Purpose and scope

This document defines the canonical JSON vocabulary for future narrative data.
Every record type will have a versioned JSON Schema and will reuse the scalar
definitions in this document rather than redefine their syntax. The first
definitions are `date` and `chapter`.

This document does not add book-derived records or source text. It records only
the data contract needed before those records are authored. ADR-0001 is binding for
the chapter-authored source and generated-projection boundary.

## Shared JSON Schema definitions

Record schemas must use JSON Schema Draft 2020-12 and may import the following
definitions from this document's eventual machine-readable schema. The fragment
is normative for the scalar types below.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://bobiverse.local/schema/narrative-data-model-0.1.0.json",
  "$defs": {
    "date": {
      "type": "string",
      "pattern": "^[1-9][0-9]*(?:\\.(?:0|[1-9][0-9]*))?$",
      "description": "Calendar year, optionally followed by a non-negative within-year ordering index."
    },
    "chapter": {
      "type": "string",
      "pattern": "^[1-9][0-9]*\\.[1-9][0-9]*$",
      "description": "Visible chapter reference: positive book number followed by positive chapter number."
    },
    "entity_id": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9_]*:[a-z0-9][a-z0-9-]*$",
      "description": "Globally unique, type-prefixed entity identifier."
    },
    "character_id": {
      "type": "string",
      "pattern": "^character:[a-z0-9][a-z0-9-]*$",
      "description": "Globally unique reference to a character entity."
    },
    "species_id": {
      "type": "string",
      "pattern": "^species:[a-z0-9][a-z0-9-]*$",
      "description": "Globally unique reference to a species entity."
    },
    "asset_id": {
      "type": "string",
      "pattern": "^asset:[a-z0-9][a-z0-9-]*$",
      "description": "Globally unique reference to a manually curated asset."
    },
    "event_id": {
      "type": "string",
      "pattern": "^event:[a-z0-9][a-z0-9-]*$",
      "description": "Globally unique reference to an event entity."
    },
    "location_id": {
      "type": "string",
      "pattern": "^location:[a-z0-9][a-z0-9-]*$",
      "description": "Globally unique reference to a location entity."
    },
    "appearance": {
      "type": "object",
      "required": ["character_id", "role"],
      "properties": {
        "character_id": {
          "$ref": "#/$defs/character_id"
        },
        "role": { "enum": ["lead", "other"] },
        "location_id": { "$ref": "#/$defs/location_id" }
      },
      "additionalProperties": false
    },
    "character": {
      "type": "object",
      "required": ["id", "name"],
      "properties": {
        "id": { "$ref": "#/$defs/character_id" },
        "name": { "type": "string", "minLength": 1 },
        "gender": { "type": "string", "minLength": 1 },
        "species_id": { "$ref": "#/$defs/species_id" },
        "current_state": { "type": "string", "minLength": 1 },
        "picture_id": { "$ref": "#/$defs/asset_id" },
        "aliases": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "uniqueItems": true
        },
        "birth_date": { "$ref": "#/$defs/date" },
        "death_date": { "$ref": "#/$defs/date" },
        "death_event_id": { "$ref": "#/$defs/event_id" }
      },
      "additionalProperties": false
    },
    "character_update": {
      "type": "object",
      "required": ["entity_id"],
      "properties": {
        "entity_id": { "$ref": "#/$defs/character_id" },
        "name": { "type": "string", "minLength": 1 },
        "gender": { "type": ["string", "null"], "minLength": 1 },
        "species_id": {
          "anyOf": [
            { "$ref": "#/$defs/species_id" },
            { "type": "null" }
          ]
        },
        "current_state": { "type": ["string", "null"], "minLength": 1 },
        "picture_id": {
          "anyOf": [
            { "$ref": "#/$defs/asset_id" },
            { "type": "null" }
          ]
        },
        "aliases": {
          "type": ["array", "null"],
          "items": { "type": "string", "minLength": 1 },
          "uniqueItems": true
        },
        "birth_date": {
          "anyOf": [
            { "$ref": "#/$defs/date" },
            { "type": "null" }
          ]
        },
        "death_date": {
          "anyOf": [
            { "$ref": "#/$defs/date" },
            { "type": "null" }
          ]
        },
        "death_event_id": {
          "anyOf": [
            { "$ref": "#/$defs/event_id" },
            { "type": "null" }
          ]
        }
      },
      "anyOf": [
        { "required": ["name"] },
        { "required": ["gender"] },
        { "required": ["species_id"] },
        { "required": ["current_state"] },
        { "required": ["picture_id"] },
        { "required": ["aliases"] },
        { "required": ["birth_date"] },
        { "required": ["death_date"] },
        { "required": ["death_event_id"] }
      ],
      "additionalProperties": false
    },
    "species": {
      "type": "object",
      "required": ["id", "name"],
      "properties": {
        "id": { "$ref": "#/$defs/species_id" },
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": "string", "minLength": 1 },
        "picture_id": { "$ref": "#/$defs/asset_id" },
        "homeworld_id": { "$ref": "#/$defs/location_id" }
      },
      "additionalProperties": false
    },
    "species_update": {
      "type": "object",
      "required": ["entity_id"],
      "properties": {
        "entity_id": { "$ref": "#/$defs/species_id" },
        "name": { "type": "string", "minLength": 1 },
        "description": { "type": ["string", "null"], "minLength": 1 },
        "picture_id": {
          "anyOf": [
            { "$ref": "#/$defs/asset_id" },
            { "type": "null" }
          ]
        },
        "homeworld_id": {
          "anyOf": [
            { "$ref": "#/$defs/location_id" },
            { "type": "null" }
          ]
        }
      },
      "anyOf": [
        { "required": ["name"] },
        { "required": ["description"] },
        { "required": ["picture_id"] },
        { "required": ["homeworld_id"] }
      ],
      "additionalProperties": false
    },
    "event": {
      "type": "object",
      "required": ["id", "name"],
      "properties": {
        "id": { "$ref": "#/$defs/event_id" },
        "name": { "type": "string", "minLength": 1 },
        "location_id": { "$ref": "#/$defs/location_id" },
        "picture_id": { "$ref": "#/$defs/asset_id" },
        "date": { "$ref": "#/$defs/date" },
        "description": { "type": "string", "minLength": 1 },
        "participant_ids": {
          "type": "array",
          "items": { "$ref": "#/$defs/character_id" },
          "uniqueItems": true
        }
      },
      "additionalProperties": false
    },
    "event_update": {
      "type": "object",
      "required": ["entity_id"],
      "properties": {
        "entity_id": { "$ref": "#/$defs/event_id" },
        "name": { "type": "string", "minLength": 1 },
        "location_id": {
          "anyOf": [
            { "$ref": "#/$defs/location_id" },
            { "type": "null" }
          ]
        },
        "picture_id": {
          "anyOf": [
            { "$ref": "#/$defs/asset_id" },
            { "type": "null" }
          ]
        },
        "date": {
          "anyOf": [
            { "$ref": "#/$defs/date" },
            { "type": "null" }
          ]
        },
        "description": { "type": ["string", "null"], "minLength": 1 },
        "participant_ids": {
          "type": ["array", "null"],
          "items": { "$ref": "#/$defs/character_id" },
          "uniqueItems": true
        }
      },
      "anyOf": [
        { "required": ["name"] },
        { "required": ["location_id"] },
        { "required": ["picture_id"] },
        { "required": ["date"] },
        { "required": ["description"] },
        { "required": ["participant_ids"] }
      ],
      "additionalProperties": false
    },
    "chapter_source": {
      "type": "object",
      "required": ["schema_version", "chapter", "date", "appearances"],
      "properties": {
        "schema_version": { "const": "1.0.0" },
        "chapter": { "$ref": "#/$defs/chapter" },
        "date": { "$ref": "#/$defs/date" },
        "location_id": { "$ref": "#/$defs/location_id" },
        "appearances": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/appearance" },
          "contains": {
            "type": "object",
            "required": ["role"],
            "properties": { "role": { "const": "lead" } }
          },
          "minContains": 1
        }
      }
    },
    "books_source": {
      "type": "object",
      "required": ["schema_version", "books"],
      "properties": {
        "schema_version": { "const": "1.0.0" },
        "books": {
          "type": "object",
          "minProperties": 1,
          "patternProperties": {
            "^[1-9][0-9]*$": {
              "type": "object",
              "required": ["title"],
              "properties": {
                "title": { "type": "string", "minLength": 1 }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "chapter_manifest": {
      "type": "object",
      "required": ["schema_version", "chapters"],
      "properties": {
        "schema_version": { "const": "1.0.0" },
        "chapters": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["chapter", "path"],
            "properties": {
              "chapter": { "$ref": "#/$defs/chapter" },
              "path": {
                "type": "string",
                "pattern": "^chapters/[1-9][0-9]*/[1-9][0-9]*\\.json$"
              }
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    }
  }
}
```

Until the shared fragment is published as a schema file, a record schema may
embed an identical definition in its own `$defs`. It must not change the pattern
or semantics.

## `date`

### Meaning

`date` represents a calendar year in the story universe. It is deliberately not
an ISO 8601 timestamp and does not encode a month, day, clock time, timezone, or
duration. Its optional index provides only a stable way to order multiple events
known to occur within the same calendar year. The index is metadata and must
never be shown in the user interface.

### Canonical encoding

The JSON value is always a string in one of two forms:

| Form | Meaning | Valid examples |
| --- | --- | --- |
| `"<year>"` | A year is known; no within-year order is asserted. | `"2026"`, `"10000"` |
| `"<year>.<index>"` | A year and within-year ordering index are known. | `"2026.0"`, `"2026.77"` |

`year` is a positive base-10 integer with no leading zero. `index` is a
non-negative base-10 integer with no leading zero except for the single value
`0`. Therefore `"02026"`, `"0"`, `"2026.007"`, `"2026."`, and `2026.77`
(a JSON number) are invalid.

### Ordering rules

1. Compare years numerically; an earlier year precedes a later year.
2. If two values have the same year and both have an index, compare their indices
   numerically. For example, `"2026.9"` precedes `"2026.10"`.
3. A year-only value is less precise than an indexed value in that year. It is
   intentionally unordered relative to every indexed value with the same year;
   consumers must not normalize it to `"<year>.0"` or to a synthetic end-of-year
   index.

The resulting comparison is a partial order, not a total chronology. A consumer
that needs a deterministic display order must use an explicit record-specific
tie-breaker and must not present that tie-breaker as story chronology.

## `chapter`

### Meaning

`chapter` identifies a visible position in the book series. Both components are
mandatory and visible to readers. The first chapter of the first book is
`"1.1"`.

### Canonical encoding

The JSON value is always the string `"<book>.<chapter>"`:

- `book` is a positive base-10 integer with no leading zero.
- `chapter` is a positive base-10 integer with no leading zero.
- The separator is exactly one period (`.`).

Consequently, `"1.1"` and `"12.34"` are valid; `"01.01"`, `"0.1"`,
`"1.0"`, `"1"`, `"1.1.1"`, and `1.1` (a JSON number) are invalid.

For series reading order, compare the two numeric components in order: book
first, then chapter. Thus `"1.10"` follows `"1.9"`, and `"2.1"` follows all
chapters in book 1. String lexicographic comparison is invalid for this purpose.

## Story time and reader order

`date` represents story time. `chapter` represents the reader-visible chapter
reference and supports series reading order. They are independent dimensions:
chapters may be non-chronological, and a date must not be used as a spoiler
visibility key. Future revealed-claim and reader-progress schemas will use the
reader-order model explicitly while retaining `date` for in-universe chronology.

## Record-schema usage

A later chapter record will define its own schema and reference these scalars;
this is illustrative only, not a complete chapter schema:

```json
{
  "type": "object",
  "required": ["chapter", "date"],
  "properties": {
    "chapter": { "$ref": "narrative-data-model-0.1.0.json#/$defs/chapter" },
    "date": { "$ref": "narrative-data-model-0.1.0.json#/$defs/date" }
  }
}
```

Future record definitions must state their schema version, stable identifier,
required fields, allowed references, and spoiler-visibility behavior. They must
not duplicate or loosen the scalar definitions above.

## Authority and generated-data boundary

There are exactly three sources of domain truth:

1. The astronomy source owns stellar and interstellar physical facts: system and
   component identity, coordinates, dimensions, colour, and measured render facts.
2. The zero-state source owns the reader-visible, pre-book Solar-System location tree.
   Its nested child order is a deliberately non-metric local rendering order; it must
   not contain coordinates, distances, sizes, colours, or other measured astronomy
   facts.
3. The chapter source owns book revelations: new entities, visible state changes to
   seeded or previously introduced entities, appearances, events, and chapter reveal
   order.

The following are generated data and must never be edited manually: the stable entity
registry, an entity's state at a selected chapter, location child lists, character
last-known sightings, events-at-location lists, character event histories, and the
render-ready join of astronomy and narrative locations. Deterministic generated caches
or checkpoints are permitted only as rebuildable optimizations.

Image files are the sole manually curated non-generated content besides the zero-state
source. They live in an asset registry with stable `asset:` IDs, paths, attribution,
and validation metadata. Assets do not establish an additional domain truth or entity
state; their assignment to an entity is still a chapter-controlled narrative value such
as `picture_id`.

## Reader progress and projection

The application keeps two optional global values:

- `furthestChapterRead`: a guarded progress value. Advancing it requires an explicit
  UX action so a reader cannot accidentally reveal later material. It is absent before
  the reader marks any chapter as read.
- `viewChapter`: the freely selected chapter from the chapter list. It may equal or
  precede `furthestChapterRead`, but it must never exceed it. It is absent before a
  chapter is selected.

Projection begins with the zero-state source. Before a reader selects a chapter, the
generated world is that baseline alone; neither optional progress value is required for
that result. A chapter view applies the following two independent stages to the
baseline:

1. Reader order is the spoiler gate. Select only chapter records at or before
   `viewChapter`, comparing the numeric components of `chapter`. Those records are
   the facts the reader is allowed to know.
2. Story time is the world-state gate. Every state-bearing property supplied by an
   introduction or ordinary update has the effective story date of its enclosing
   chapter. From the reader-visible records, apply only values whose effective date
   is definitively at or before
   `viewChapter.date`, then use the chronologically latest value for each entity
   property.

Reader order never breaks a story-time tie. Identical canonical date values are equal,
so a state value dated exactly like `viewChapter.date` is eligible. A year-only date is
otherwise unordered relative to an indexed date in the same year, so it cannot decide
a state transition between them. Source data must supply an index whenever a state
write or selected chapter requires that within-year ordering. Competing writes to one
entity property with equal or incomparable effective dates are invalid.

An event uses its projected optional `date` for its in-universe occurrence. If that
value is absent, it remains reader-visible after its introduction but is not placed at
a precise story-time point. Story `date` is never used to grant reader visibility.

## Zero-state and chapter-authored source records

### Source layout and book catalogue

The authored zero-state, book, and chapter source has this canonical layout:

```text
data/narrative/baseline/solar-system.json
data/narrative/books.json
data/narrative/chapters/<book>/<chapter>.json
generated/narrative/chapter-manifest.json
```

`baseline/solar-system.json` is the small, manually authored root snapshot of the
known Solar System. It is nested: a child's position in its parent's array supplies
the stable local rendering order. The generator flattens that authoring form into
parent links and derives runtime child lists; the source does not author a second
`sublocations` field. It contains location identity, names, kinds, and hierarchy only;
it must not copy astronomy measurements or chapter-derived facts. Its entities are
visible in the zero state and may later be patched by chapter updates, but their IDs
must never be introduced again in a chapter.

`books.json` is the sole manually authored book catalogue. It uses a numeric-keyed
object: each key is the canonical positive book number and each value initially
contains only the nonempty `title`.

```json
{
  "schema_version": "1.0.0",
  "books": {
    "1": { "title": "Book title" }
  }
}
```

Every chapter is a separate source JSON file. A chapter whose canonical reference is
`"1.1"` must be at `data/narrative/chapters/1/1.json` and contains the canonical
`"chapter": "1.1"` reference—not redundant `book` or `chapter_number` fields.

The generator scans these source files, validates the path/reference/book-catalogue
agreement, and emits the ordered chapter manifest. The manifest is generated and must
not be edited by hand. Its entries intentionally contain only the canonical chapter
reference and source path; it does not duplicate story dates or narrative metadata.

```json
{
  "schema_version": "1.0.0",
  "chapters": [
    { "chapter": "1.1", "path": "chapters/1/1.json" }
  ]
}
```

The manifest is ordered by numeric `chapter` components, not JSON object order. The
static runtime uses it to load the individual chapter source files needed for a view;
it never relies on directory enumeration.

Every chapter source record has its own versioned JSON Schema. It contains the required
`chapter` and story `date` scalars, a nonempty `appearances` array with at least one
`role: "lead"` entry, and zero or more `introducing` and `updates` sections. A root
`location_id` is optional and supplies the default location for appearances in that
chapter. The shared `chapter_source` fragment enforces the required chapter identity,
story date, nonempty appearances, and lead requirement; the complete chapter schema
adds the typed `introducing` and `updates` contracts. A chapter may update a baseline
entity but must not introduce an ID already supplied by the baseline.

```json
{
  "schema_version": "1.0.0",
  "chapter": "1.2",
  "date": "2133.77",
  "location_id": "location:earth",
  "introducing": {
    "locales": [
      {
        "id": "location:earth-research-base",
        "kind": "locale",
        "name": "Research Base",
        "parent_location_id": "location:earth"
      }
    ],
    "events": [
      {
        "id": "event:arrival-at-base",
        "name": "Arrival at Base",
        "location_id": "location:earth-research-base",
        "participant_ids": ["character:alex"]
      }
    ]
  },
  "updates": [
    {
      "entity_id": "character:alex",
      "current_state": "injured",
      "aliases": ["Alex"],
      "picture_id": null
    }
  ],
  "appearances": [
    {
      "character_id": "character:alex",
      "role": "lead",
      "location_id": "location:earth-research-base"
    }
  ]
}
```

The keys in `introducing` are typed plural collections, beginning with
`characters`, `star_systems`, `planets`, `moons`, `locales`, `megastructures`,
`species`, and `events`. New entity types add their own schema and collection key;
they do not weaken an existing type schema. Every introduced record must have a
globally unique, type-prefixed ID and must produce its complete minimum valid state at
the end of its introducing chapter. A seeded entity is present before chapter 1; a
non-seeded entity is introduced exactly once and remains part of reader-visible
knowledge in every later view. Their state-bearing properties contribute to temporal
world state only when their effective story dates are at or before the selected chapter
date.

### Updates

`updates` is deliberately human-readable rather than a generic patch language. An
update object has `entity_id` plus one or more ordinary properties of that entity:

- A chapter has at most one update object for a given entity.
- An omitted property is unchanged.
- A supplied scalar or object replaces its prior value.
- A supplied list replaces the complete prior list.
- `null` clears the prior value. It does not mean “unknown”; a field that supports
  unknown must define an explicit type-specific value.
- Semantic validation resolves `entity_id`, verifies that the entity was already
  seeded or introduced, and permits only properties defined by that entity type's
  schema.

Unless an entity schema explicitly records an exception, this is the default update
policy for every introduced narrative entity: its `id` is immutable, every other
schema-defined field may be supplied by a later chapter update, and an optional field
may be cleared with `null`.

### Appearances and events

An appearance records `character_id`, `role`, and an optional location override.
`role` is either `lead` or `other`; every chapter requires at least one `lead`, and
multiple `lead` entries support a moot. If its location is absent, the appearance
inherits the chapter's `location_id`. If neither is available, it must reference an
explicit unmapped location entity rather than inventing or silently omitting a place.

An event is a first-class `event:` entity introduced in a chapter. Its complete
contract is defined below. The enclosing chapter supplies its reveal chapter, so the
event does not repeat that value.

## Entity and location schemas

Each entity type has a dedicated versioned schema. The character contract is ratified
below. The other type-specific fields remain to be defined before their records are
authored.

| Record | Required initial contract | Derived rather than authored |
| --- | --- | --- |
| `character` | `id`, `name`, and the optional fields in the ratified character contract | last-known sighting; event history |
| `star_system` | `id`, `kind: "star_system"`, name, and `astronomy_object_id` when mapped | astronomical components and render facts; sublocations; last-known sightings and events |
| `planet`, `moon`, `locale`, `megastructure` | `id`, `kind`, name, and parent where non-root | sublocations; last-known sightings and events |
| `species` | `id`, `name`, and the optional fields in the ratified species contract | members and other reverse links |
| `event` | `id`, `name`, and the optional fields in the ratified event contract | location event list; participant event histories |
| `asset` | `id`, file path, attribution, and validation metadata | no visible assignment; assignments are entity values |

### Character

A character introduction uses the `character` schema above. Its only required fields
are a canonical `character:` ID and a nonempty reader-visible `name`.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `character_id` | Immutable stable identifier. |
| `name` | nonempty string | Reader-visible display name. |
| `gender` | optional nonempty string | Reader-visible free text; no global gender vocabulary is imposed. |
| `species_id` | optional `species_id` | Reference to an introduced species entity. |
| `current_state` | optional nonempty string | The character's known mutable state at the enclosing chapter's story date. |
| `picture_id` | optional `asset_id` | Chapter-controlled assignment of a manually curated image asset. |
| `aliases` | optional array of unique nonempty strings | Additional reader-visible names that become searchable only when introduced or updated. |
| `birth_date` | optional `date` | Known birth date at the available story-time precision. |
| `death_date` | optional `date` | Known death date at the available story-time precision. |
| `death_event_id` | optional `event_id` | Reference to the event that records the death. |

The `character_update` schema permits every character field except `id`. `name` must
remain a nonempty string; every optional field may be supplied with `null` to clear its
prior value. A list supplied for `aliases` replaces the complete previous list. A
character introduction or update must not use a reference until its target entity has
been seeded or introduced. When both `death_date` and the referenced event's own
`date` are present, their canonical values must be identical. No ordering comparison is
imposed between `birth_date` and `death_date`.

`current_state` does not establish a character location. A character location is only
confirmed by an appearance with an effective location. From reader-visible appearances
whose effective story dates are definitively at or before `viewChapter.date`, the
generated projection may expose a `last_known_location` only when one appearance has a
uniquely latest, definitively comparable story date. That generated value records the
source chapter and story date of the sighting, is labelled as a last-known sighting, and
must not be treated as current presence or used to position the character on the map.
Tied or incomparable appearance dates produce no singular last-known location.

### Species

A species introduction uses the `species` schema above. Its only required fields are a
canonical `species:` ID and a nonempty reader-visible `name`.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `species_id` | Immutable stable identifier. |
| `name` | nonempty string | Reader-visible display name. |
| `description` | optional nonempty string | Original reader-visible summary; it must not copy book text. |
| `picture_id` | optional `asset_id` | Chapter-controlled assignment of a manually curated image asset. |
| `homeworld_id` | optional `location_id` | Reference to a seeded or introduced, non-transit narrative location; an explicitly unmapped location remains valid. |

The `species_update` schema permits every species field except `id`. `name` must remain
a nonempty string; `description`, `picture_id`, and `homeworld_id` may be supplied with
`null` to clear their prior values. A supplied homeworld reference must resolve to an
already seeded or introduced non-transit location.

### Event

An event introduction uses the `event` schema above. Its only required fields are a
canonical `event:` ID and a nonempty reader-visible `name`.

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | `event_id` | Immutable stable identifier. |
| `name` | nonempty string | Reader-visible event name. |
| `location_id` | optional `location_id` | Reference to any seeded or introduced narrative location, including transit or explicitly unmapped locations. |
| `picture_id` | optional `asset_id` | Chapter-controlled assignment of a manually curated image asset. |
| `date` | optional `date` | Story-time occurrence date; when absent, the event remains chronologically unplaced. |
| `description` | optional nonempty string | Original reader-visible summary; it must not copy book text. |
| `participant_ids` | optional array of unique `character_id` values | Named character participants. Omission asserts no participant information; `[]` states that no named character participates. |

The `event_update` schema permits every event field except `id`; optional fields may be
supplied with `null` to clear their prior values. A supplied list replaces the complete
previous `participant_ids` list. Each supplied location, asset, or character reference
must resolve to an already seeded or introduced entity of the matching type.

An event's effective occurrence date is its currently projected `date`. If that value
is absent, the event remains reader-visible but has no precise story-time placement. A
later reader-visible update may therefore reveal, correct, or clear an event date.
Event visibility remains governed by reader order; the occurrence date places an
already visible event in story time and never grants spoiler visibility.

Locations form a one-parent tree. A root has no `parent_location_id`; every non-root
location has exactly one. `sublocations` are generated by resolving the reverse parent
links, never authored as a second list. The zero-state source's nested authoring form
is flattened into those links before this derivation. This supports structures such as
star system → planet → moon → locale, star system → planet → locale, and star system
→ megastructure without imposing a fixed depth.

A transit location is a root with `origin_location_id` and `destination_location_id`.
It has no containment parent because a journey is between places. An unmapped or
ambiguous location is also valid; it has an explicit unmapped kind or state and no
invented astronomy coordinate.

Any narrative location may contain an optional `astronomy_object_id`. Mapped
parent-child locations must agree with the astronomy source's ancestry whenever both
ends have astronomy references. The generator joins stellar astronomy data with the
zero-state and visible narrative location trees to produce the renderer's system
description. The zero-state and chapter sources must not copy physical components,
positions, sizes, colours, or other astronomy render facts.

## Schema and semantic validation

JSON Schema validates the structural contract of every source record. Referential and
temporal rules that require looking up another record are a mandatory second validation
layer. It rejects at least:

- unexpected schema versions, malformed scalar values, or non-canonical IDs;
- malformed zero-state source or `books.json`, a chapter path that disagrees with its
  `chapter` value, a chapter whose book is absent from `books.json`, or an
  incomplete/out-of-order generated chapter manifest;
- a broken zero-state location tree or local child order, duplicate IDs across the
  baseline and chapter sources, or a chapter introduction that repeats a seeded ID;
- duplicate entity introductions or references to entities not yet introduced or
  seeded;
- an introduction that lacks the complete minimum state for its type;
- more than one update object for an entity in a chapter, or an update property not
  allowed by that entity type;
- invalid update `null` use, invalid list replacement values, or invalid references;
- an invalid character ID, name, aliases list, or typed species, asset, or death-event
  reference; a character death date that conflicts with its referenced event date;
- an invalid species ID, name, description, picture, or homeworld reference, including
  a homeworld that is transit or has not been seeded or introduced;
- an invalid event ID, name, description, picture, date, location, or participant
  reference; duplicate participant IDs; or a participant list that is not a complete
  replacement when updated;
- a chapter with no appearances or no `lead` appearance;
- competing state writes that have equal or incomparable effective story dates, or a
  year-only selected chapter date that cannot determine a needed indexed transition;
- a broken location parent tree, invalid transit endpoints, or incompatible mapped
  astronomy ancestry;
- an appearance without an effective explicit location; and
- a generated record or snapshot presented as editable source data.
