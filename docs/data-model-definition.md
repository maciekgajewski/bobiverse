# Narrative data-model definition

Status: In progress
Schema dialect: JSON Schema Draft 2020-12
Last updated: 2026-07-23

## Purpose and scope

This document defines the canonical JSON vocabulary for future narrative data.
Every record type uses JSON Schema Draft 2020-12 and reuses the scalar definitions in
this document rather than redefining their syntax. The first definitions are `date` and
`chapter`.

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
  "$id": "https://bobiverse.local/schema/narrative-data-model.json",
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
    "description": {
      "type": "string",
      "minLength": 1,
      "description": "Original, reader-visible plain-text summary; never copied book text or Markdown."
    },
    "state": {
      "type": "string",
      "minLength": 1,
      "description": "Reader-visible plain-text current state; no controlled vocabulary is imposed."
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
    "asset": {
      "type": "object",
      "required": ["id", "path", "source"],
      "properties": {
        "id": { "$ref": "#/$defs/asset_id" },
        "path": {
          "type": "string",
          "pattern": "^assets/(?:[A-Za-z0-9][A-Za-z0-9._-]*/)*[A-Za-z0-9][A-Za-z0-9._-]*$",
          "description": "Safe static path below public/assets, relative to public."
        },
        "source": {
          "type": "string",
          "minLength": 1,
          "description": "Plain-text provenance or rights note for this static file."
        }
      },
      "additionalProperties": false
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
    "location_kind": {
      "enum": [
        "star_system",
        "star",
        "planet",
        "dwarf_planet",
        "moon",
        "asteroid_belt",
        "kuiper_belt",
        "oort_cloud",
        "locale",
        "megastructure",
        "transit"
      ]
    },
    "parent_relation": {
      "enum": ["member_of_system", "orbits", "located_on", "contained_in"]
    },
    "astronomy_object_id": {
      "type": "string",
      "minLength": 1,
      "description": "Canonical ID of a reviewed astronomy-system record."
    },
    "unmapped_map_status": {
      "const": "unmapped",
      "description": "Explicitly states that no map placement is known."
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
        "current_state": { "$ref": "#/$defs/state" },
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
        "current_state": {
          "anyOf": [
            { "$ref": "#/$defs/state" },
            { "type": "null" }
          ]
        },
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
        "description": { "$ref": "#/$defs/description" },
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
        "description": {
          "anyOf": [
            { "$ref": "#/$defs/description" },
            { "type": "null" }
          ]
        },
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
        "description": { "$ref": "#/$defs/description" },
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
        "description": {
          "anyOf": [
            { "$ref": "#/$defs/description" },
            { "type": "null" }
          ]
        },
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
    "baseline_location": {
      "type": "object",
      "required": ["id", "name", "kind"],
      "properties": {
        "id": { "$ref": "#/$defs/location_id" },
        "name": { "type": "string", "minLength": 1 },
        "kind": { "$ref": "#/$defs/location_kind" },
        "description": { "$ref": "#/$defs/description" },
        "state": { "$ref": "#/$defs/state" },
        "astronomy_object_id": { "$ref": "#/$defs/astronomy_object_id" },
        "parent_relation": { "$ref": "#/$defs/parent_relation" },
        "children": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/baseline_location" }
        }
      },
      "allOf": [
        {
          "if": {
            "required": ["kind"],
            "properties": { "kind": { "const": "star_system" } }
          },
          "then": {
            "required": ["astronomy_object_id", "children"],
            "properties": {
              "id": { "const": "location:solar-system" },
              "name": { "const": "Solar System" },
              "astronomy_object_id": { "const": "sol" },
              "children": {
                "type": "array",
                "minItems": 1,
                "maxItems": 1,
                "items": { "$ref": "#/$defs/sol_star" }
              }
            },
            "not": { "required": ["parent_relation"] }
          }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": { "kind": { "const": "star" } }
          },
          "then": {
            "required": ["parent_relation", "children"],
            "properties": {
              "id": { "const": "location:sol" },
              "name": { "const": "Sol" },
              "parent_relation": { "const": "member_of_system" },
              "children": {
                "type": "array",
                "minItems": 1,
                "items": { "$ref": "#/$defs/solar_orbital_body" }
              }
            },
            "not": { "required": ["astronomy_object_id"] }
          }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": {
              "kind": { "enum": ["planet", "dwarf_planet"] }
            }
          },
          "then": {
            "required": ["parent_relation"],
            "properties": {
              "parent_relation": { "const": "orbits" },
              "children": {
                "type": "array",
                "minItems": 1,
                "items": { "$ref": "#/$defs/planetary_child" },
                "contains": {
                  "required": ["kind"],
                  "properties": { "kind": { "const": "moon" } }
                },
                "minContains": 0,
                "maxContains": 4
              }
            },
            "not": { "required": ["astronomy_object_id"] }
          }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": { "kind": { "const": "moon" } }
          },
          "then": {
            "required": ["parent_relation"],
            "properties": {
              "parent_relation": { "const": "orbits" },
              "children": {
                "type": "array",
                "minItems": 1,
                "items": { "$ref": "#/$defs/surface_locale" }
              }
            },
            "not": { "required": ["astronomy_object_id"] }
          }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": {
              "kind": {
                "enum": ["asteroid_belt", "kuiper_belt", "oort_cloud"]
              }
            }
          },
          "then": {
            "required": ["parent_relation"],
            "properties": { "parent_relation": { "const": "orbits" } },
            "not": {
              "anyOf": [
                { "required": ["astronomy_object_id"] },
                { "required": ["children"] }
              ]
            }
          }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": { "kind": { "const": "locale" } }
          },
          "then": {
            "required": ["parent_relation"],
            "properties": { "parent_relation": { "const": "located_on" } },
            "not": {
              "anyOf": [
                { "required": ["astronomy_object_id"] },
                { "required": ["children"] }
              ]
            }
          }
        }
      ],
      "unevaluatedProperties": false
    },
    "sol_star": {
      "allOf": [
        { "$ref": "#/$defs/baseline_location" },
        {
          "required": ["id", "name", "kind", "parent_relation"],
          "properties": {
            "id": { "const": "location:sol" },
            "name": { "const": "Sol" },
            "kind": { "const": "star" },
            "parent_relation": { "const": "member_of_system" }
          }
        }
      ]
    },
    "solar_orbital_body": {
      "allOf": [
        { "$ref": "#/$defs/baseline_location" },
        {
          "required": ["kind", "parent_relation"],
          "properties": {
            "kind": {
              "enum": [
                "planet",
                "dwarf_planet",
                "asteroid_belt",
                "kuiper_belt",
                "oort_cloud"
              ]
            },
            "parent_relation": { "const": "orbits" }
          }
        }
      ]
    },
    "planetary_child": {
      "oneOf": [
        {
          "allOf": [
            { "$ref": "#/$defs/baseline_location" },
            {
              "required": ["kind", "parent_relation"],
              "properties": {
                "kind": { "const": "moon" },
                "parent_relation": { "const": "orbits" }
              }
            }
          ]
        },
        { "$ref": "#/$defs/surface_locale" }
      ]
    },
    "surface_locale": {
      "allOf": [
        { "$ref": "#/$defs/baseline_location" },
        {
          "required": ["kind", "parent_relation"],
          "properties": {
            "kind": { "const": "locale" },
            "parent_relation": { "const": "located_on" }
          }
        }
      ]
    },
    "zero_state_solar_system": {
      "$ref": "#/$defs/baseline_location"
    },
    "location": {
      "type": "object",
      "required": ["id", "name", "kind"],
      "properties": {
        "id": { "$ref": "#/$defs/location_id" },
        "name": { "type": "string", "minLength": 1 },
        "kind": { "$ref": "#/$defs/location_kind" },
        "description": { "$ref": "#/$defs/description" },
        "state": { "$ref": "#/$defs/state" },
        "map_status": { "$ref": "#/$defs/unmapped_map_status" },
        "parent_location_id": { "$ref": "#/$defs/location_id" },
        "parent_relation": { "$ref": "#/$defs/parent_relation" },
        "astronomy_object_id": { "$ref": "#/$defs/astronomy_object_id" },
        "origin_location_id": { "$ref": "#/$defs/location_id" },
        "destination_location_id": { "$ref": "#/$defs/location_id" }
      },
      "allOf": [
        {
          "if": { "required": ["parent_location_id"] },
          "then": { "required": ["parent_relation"] }
        },
        {
          "if": { "required": ["parent_relation"] },
          "then": { "required": ["parent_location_id"] }
        },
        {
          "if": { "required": ["map_status"] },
          "then": { "not": { "required": ["astronomy_object_id"] } }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": { "kind": { "const": "star_system" } }
          },
          "then": {
            "not": {
              "anyOf": [
                { "required": ["parent_location_id"] },
                { "required": ["parent_relation"] },
                { "required": ["origin_location_id"] },
                { "required": ["destination_location_id"] }
              ]
            },
            "if": { "required": ["map_status"] },
            "then": { "not": { "required": ["astronomy_object_id"] } },
            "else": { "required": ["astronomy_object_id"] }
          }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": { "kind": { "const": "transit" } }
          },
          "then": {
            "required": ["map_status", "origin_location_id", "destination_location_id"],
            "not": {
              "anyOf": [
                { "required": ["parent_location_id"] },
                { "required": ["parent_relation"] },
                { "required": ["astronomy_object_id"] }
              ]
            }
          }
        },
        {
          "if": {
            "required": ["kind"],
            "properties": {
              "kind": {
                "not": { "enum": ["star_system", "transit"] }
              }
            }
          },
          "then": {
            "anyOf": [
              { "required": ["map_status"] },
              { "required": ["parent_location_id", "parent_relation"] }
            ],
            "not": {
              "anyOf": [
                { "required": ["astronomy_object_id"] },
                { "required": ["origin_location_id"] },
                { "required": ["destination_location_id"] }
              ]
            }
          }
        }
      ],
      "additionalProperties": false
    },
    "location_update": {
      "type": "object",
      "required": ["entity_id"],
      "properties": {
        "entity_id": { "$ref": "#/$defs/location_id" },
        "name": { "type": "string", "minLength": 1 },
        "kind": { "$ref": "#/$defs/location_kind" },
        "description": {
          "anyOf": [
            { "$ref": "#/$defs/description" },
            { "type": "null" }
          ]
        },
        "state": {
          "anyOf": [
            { "$ref": "#/$defs/state" },
            { "type": "null" }
          ]
        },
        "map_status": {
          "anyOf": [
            { "$ref": "#/$defs/unmapped_map_status" },
            { "type": "null" }
          ]
        },
        "parent_location_id": {
          "anyOf": [
            { "$ref": "#/$defs/location_id" },
            { "type": "null" }
          ]
        },
        "parent_relation": {
          "anyOf": [
            { "$ref": "#/$defs/parent_relation" },
            { "type": "null" }
          ]
        },
        "astronomy_object_id": {
          "anyOf": [
            { "$ref": "#/$defs/astronomy_object_id" },
            { "type": "null" }
          ]
        },
        "origin_location_id": {
          "anyOf": [
            { "$ref": "#/$defs/location_id" },
            { "type": "null" }
          ]
        },
        "destination_location_id": {
          "anyOf": [
            { "$ref": "#/$defs/location_id" },
            { "type": "null" }
          ]
        }
      },
      "anyOf": [
        { "required": ["name"] },
        { "required": ["kind"] },
        { "required": ["description"] },
        { "required": ["state"] },
        { "required": ["map_status"] },
        { "required": ["parent_location_id"] },
        { "required": ["parent_relation"] },
        { "required": ["astronomy_object_id"] },
        { "required": ["origin_location_id"] },
        { "required": ["destination_location_id"] }
      ],
      "additionalProperties": false
    },
    "introduced_entity": {
      "oneOf": [
        { "$ref": "#/$defs/character" },
        { "$ref": "#/$defs/species" },
        { "$ref": "#/$defs/event" },
        { "$ref": "#/$defs/location" }
      ]
    },
    "entity_update": {
      "oneOf": [
        { "$ref": "#/$defs/character_update" },
        { "$ref": "#/$defs/species_update" },
        { "$ref": "#/$defs/event_update" },
        { "$ref": "#/$defs/location_update" }
      ]
    },
    "chapter_source": {
      "type": "object",
      "required": ["chapter", "title", "summary", "date", "location_id"],
      "properties": {
        "chapter": { "$ref": "#/$defs/chapter" },
        "title": { "type": "string", "minLength": 1 },
        "summary": { "$ref": "#/$defs/description" },
        "date": { "$ref": "#/$defs/date" },
        "location_id": { "$ref": "#/$defs/location_id" },
        "introducing": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/introduced_entity" }
        },
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
        },
        "updates": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/entity_update" }
        }
      },
      "additionalProperties": false
    },
    "books_source": {
      "type": "object",
      "required": ["books"],
      "properties": {
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
    "assets_source": {
      "type": "object",
      "required": ["assets"],
      "properties": {
        "assets": {
          "type": "array",
          "items": { "$ref": "#/$defs/asset" }
        }
      },
      "additionalProperties": false
    },
    "chapter_manifest": {
      "type": "object",
      "required": ["chapters"],
      "properties": {
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

A chapter source record uses these scalar references as part of its complete contract;
this compact fragment illustrates the shared references:

```json
{
  "type": "object",
  "required": ["chapter", "date"],
  "properties": {
    "chapter": { "$ref": "https://bobiverse.local/schema/narrative-data-model.json#/$defs/chapter" },
    "date": { "$ref": "https://bobiverse.local/schema/narrative-data-model.json#/$defs/date" }
  }
}
```

Future record definitions must state their stable identifier, required fields, allowed
references, and spoiler-visibility behavior. They must not duplicate or loosen the
scalar definitions above.

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
source. They live in an asset registry with stable `asset:` IDs, safe static paths, and
plain-text source notes. Assets do not establish an additional domain truth or entity
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

The authored zero-state, asset, book, and chapter source has this canonical layout:

```text
data/narrative/baseline/solar-system.json
data/narrative/assets.json
data/narrative/books.json
data/narrative/chapters/<book>/<chapter>.json
generated/narrative/chapter-manifest.json
```

`baseline/solar-system.json` is the small, manually authored root snapshot of the
known Solar System. It is nested: a child's position in its parent's array supplies
the stable local rendering order. The generator flattens that authoring form into
parent links and derives runtime child lists; the source does not author a second
`sublocations` field. It validates against the externally selected
`zero_state_solar_system` schema. Like every narrative source file, it deliberately has
no embedded `schema_version` field. It contains location identity, names, kinds,
hierarchy, and optional plain-text
`description` and `state` values only; it must not copy astronomy measurements,
assets, or chapter-derived facts. Its entities are visible in the zero state and may
later be patched by chapter updates, but their IDs must never be introduced again in a
chapter.

The schema fixes this baseline's root to `location:solar-system`, named `Solar System`,
with `kind: "star_system"` and `astronomy_object_id: "sol"`. It has exactly one child:
`location:sol`, named `Sol`, with `kind: "star"` and
`parent_relation: "member_of_system"`. No other baseline object may carry an
`astronomy_object_id`.

Every baseline location requires a canonical `location:` ID, a nonempty `name`, and
the shared closed `location_kind` vocabulary used by later chapter locations. The
Solar-System completeness check limits this actual seed to its agreed subset. A nested
location also requires `parent_relation`. Leaves omit `children`; when supplied,
`children` is nonempty. The baseline's permitted containment pairs are:

| Parent | Child | Required `parent_relation` |
| --- | --- | --- |
| `star_system` | `star` | `member_of_system` |
| `star` | `planet`, `dwarf_planet`, `asteroid_belt`, `kuiper_belt`, `oort_cloud` | `orbits` |
| `planet`, `dwarf_planet` | `moon` | `orbits` |
| `planet`, `dwarf_planet`, `moon` | `locale` | `located_on` |

The source preserves every authored child-array order. Among a parent's children whose
relation is `orbits`, that order asserts inner-to-outer order; it contains no distances
or other measured orbital facts. A planet or dwarf planet may have at most four moon
children. Non-orbital children, such as Las Vegas beneath Earth, retain their authored
order but have no orbital-order meaning.

The Solar-System completeness check is separate from JSON Schema structure validation.
It requires Sol's child array to contain, in inner-to-outer order, exactly the eight
planet IDs from Mercury through Neptune, plus the asteroid belt between Mars and
Jupiter, then the Kuiper belt and Oort cloud after Neptune. It rejects a seeded
`dwarf_planet`, Kuiper-belt objects, duplicate IDs, or more than four moons under any
planet. Each planet's up-to-four moon entries are a deliberately curated subset rather
than a physical-astronomy-derived definition of "major".

`assets.json` is the sole direct registry of reusable static picture files. It has an
unversioned root object with an `assets` array, which may be empty until the project
adds its first image:

```json
{
  "assets": []
}
```

Each entry requires an immutable `asset:` ID, a unique `path`, and a nonempty plain-text
`source` provenance or rights note. `path` is relative to `public`, begins with
`assets/`, and may use nested directories such as `assets/characters/bob.webp`. It is
not a URL: absolute paths, `.` or `..` path segments, query strings, and fragments are
invalid. The schema intentionally accepts any filename extension. A registered path
must name one existing regular file below `public/assets/`; the project does not create
that directory until it adds its first asset.

Asset registry metadata is maintained directly in `assets.json`, outside chapter
chronology. Its `path` and `source` may be corrected there, while the `id` remains
stable. A chapter-controlled entity `picture_id` references an asset ID, so assigning
or changing a visible image remains spoiler-safe narrative state. Multiple entities may
reference one asset ID, but no two asset IDs may register the same static path.

`books.json` is the sole manually authored book catalogue. It uses a numeric-keyed
object: each key is the canonical positive book number and each value initially
contains only the nonempty `title`.

```json
{
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
  "chapters": [
    { "chapter": "1.1", "path": "chapters/1/1.json" }
  ]
}
```

The manifest is ordered by numeric `chapter` components, not JSON object order. The
static runtime uses it to load the individual chapter source files needed for a view;
it never relies on directory enumeration.

Every chapter source record validates against the shared Draft 2020-12 schema contract.
It requires the canonical `chapter` reference, nonempty reader-visible `title`,
original plain-text `summary`, story `date`, and a default `location_id`. The default
location may resolve to the baseline, an earlier chapter, or a location introduced in
the same chapter. It must never be an invented coordinate or an implicit unknown.

`introducing`, `appearances`, and `updates` are optional. An absent array means that
the chapter supplies none of that category; an authored array is always nonempty. When
`appearances` is present, it contains at least one `role: "lead"` entry. There is no
top-level `events` array: an event is introduced as an ordinary item or amended through
an ordinary update.

`introducing` is one ordered heterogeneous array. Each object is selected by its
type-prefixed ID and validates as a character, species, event, or location. An entry
may reference a seeded entity or an earlier item in the same array, never a later item;
this makes references deterministic and forbids introduction cycles. A chapter may not
introduce an ID already supplied by the baseline or an earlier chapter.

```json
{
  "chapter": "1.2",
  "title": "A new base",
  "summary": "The crew reaches a newly established research base on Earth.",
  "date": "2133.77",
  "location_id": "location:earth",
  "introducing": [
    {
      "id": "location:earth-research-base",
      "kind": "locale",
      "name": "Research Base",
      "parent_location_id": "location:earth",
      "parent_relation": "located_on"
    },
    {
      "id": "event:arrival-at-base",
      "name": "Arrival at Base",
      "location_id": "location:earth-research-base",
      "participant_ids": ["character:alex"]
    }
  ],
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

Every introduced record must have a globally unique, type-prefixed ID and must produce
its complete minimum valid state at the end of its introducing chapter. A seeded entity
is present before chapter 1; a non-seeded entity is introduced exactly once and remains
part of reader-visible knowledge in every later view. Their state-bearing properties
contribute to temporal world state only when their effective story dates are at or
before the selected chapter date.

### Updates

`updates` is deliberately human-readable rather than a generic patch language. An
update object has `entity_id` plus one or more ordinary properties of that entity:

- A chapter has at most one update object for a given entity.
- An omitted property is unchanged.
- A supplied scalar or object replaces its prior value.
- A supplied list replaces the complete prior list.
- `null` clears the prior value. It does not mean “unknown”; a field that supports
  unknown must define an explicit type-specific value.
- Semantic validation resolves `entity_id`, verifies that the entity was seeded or was
  introduced by an earlier chapter (never the current chapter), and permits only
  properties defined by that entity type's schema.

Unless an entity schema explicitly records an exception, this is the default update
policy for every introduced narrative entity: its `id` is immutable, every other
schema-defined field may be supplied by a later chapter update, and an optional field
may be cleared with `null`.

### Appearances and events

An appearance records `character_id`, `role`, and an optional location override. An
appearance array, when present, requires at least one `lead`; multiple `lead` entries
support a moot. If its location is absent, the appearance
inherits the chapter's `location_id`. If neither is available, it must reference an
explicit unmapped location entity rather than inventing or silently omitting a place.

An event is a first-class `event:` entity introduced in a chapter. Its complete
contract is defined below. The enclosing chapter supplies its reveal chapter, so the
event does not repeat that value.

## Entity and location schemas

Each entity type has a dedicated schema. The ratified contracts below cover characters,
species, events, assets, and locations; later entity types must add their own contract
before records of that type are authored.

| Record | Required initial contract | Derived rather than authored |
| --- | --- | --- |
| `character` | `id`, `name`, and the optional fields in the ratified character contract | last-known sighting; event history |
| `star_system` | `id`, `kind: "star_system"`, name, and `astronomy_object_id` when mapped | astronomical components and render facts; sublocations; last-known sightings and events |
| `planet`, `moon`, `locale`, `megastructure` | `id`, `kind`, name, and parent where non-root | sublocations; last-known sightings and events |
| `species` | `id`, `name`, and the optional fields in the ratified species contract | members and other reverse links |
| `event` | `id`, `name`, and the optional fields in the ratified event contract | location event list; participant event histories |
| `asset` | `id`, path, and source | no visible assignment; assignments are entity values |

Every present or future `description` and `state` field uses the shared schema types:
an optional, nonempty plain string. `description` is an original reader-visible
summary, never copied book text or Markdown. `state` is reader-visible free text with
no global controlled vocabulary. Both may be changed or cleared under the ordinary
per-entity update rules unless a record type explicitly says otherwise.

### Zero-state Solar-System locations

The recursive `baseline_location` and `zero_state_solar_system` definitions above are
the complete source contract for `baseline/solar-system.json`. They are intentionally
stricter than later chapter-introduced locations: the baseline is one known Solar
System, while later chapter location schemas remain able to represent fictional systems,
megastructures, transit roots, and explicitly unmapped locations. The generator
derives `parent_location_id` for every nested baseline child; it does not persist or
ask authors to duplicate that link.

### Chapter-introduced locations

All chapter locations use the same shared `location_kind` vocabulary as the baseline:
`star_system`, `star`, `planet`, `dwarf_planet`, `moon`, `asteroid_belt`,
`kuiper_belt`, `oort_cloud`, `locale`, `megastructure`, and `transit`. Each requires
an `id`, `name`, and `kind`; optional `description` and `state` use the shared plain
text types.

`map_status` is omitted for a mapped location and set only to `"unmapped"` when no map
placement is known. A mapped `star_system` is a root and requires an
`astronomy_object_id`; no other location carries that direct reference, because its
mapping context is inherited from its system ancestor. An unmapped location has no
astronomy reference. It may be a root or a child, but every descendant below an
unmapped location must explicitly be `"unmapped"` as well.

Every non-root location requires both `parent_location_id` and `parent_relation`.
Roots are `star_system`, `transit`, and explicitly unmapped locations. The shared
semantic parent table is:

| Parent kind | Child kind | Required `parent_relation` |
| --- | --- | --- |
| `star_system` | `star` | `member_of_system` |
| `star` | `planet`, `dwarf_planet`, `asteroid_belt`, `kuiper_belt`, `oort_cloud` | `orbits` |
| `star` | `megastructure` | `orbits` or `located_on` |
| `planet`, `dwarf_planet` | `moon` | `orbits` |
| `planet`, `dwarf_planet`, `moon`, `asteroid_belt`, `kuiper_belt`, `oort_cloud` | `megastructure` | `orbits` or `located_on` |
| `planet`, `dwarf_planet`, `moon` | `locale` | `located_on` |
| `megastructure` | `locale`, `megastructure` | `contained_in` |
| `locale` | `locale` | `contained_in` |

`transit` is always an unmapped root. It requires `origin_location_id` and
`destination_location_id`, each resolving to a distinct non-transit location; it has
neither a containment parent nor an astronomy reference. The second validation layer
checks all table pairs, parent-tree acyclicity, mapped-system ancestry, unmapped
propagation, and the final projected location after a location update. A
`location_update` permits every location property except `id`; after applying it, the
result must still satisfy these rules.

### Asset

An asset is a direct `assets.json` registry record using the shared `asset` schema. Its
required `id` is a stable `asset:` identifier; `path` and `source` are required direct
metadata, not chapter updates. The registry contains no rendering dimensions, alt text,
or external URLs. Image assignment belongs solely to an entity's optional
chapter-controlled `picture_id` field.

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

Locations form a one-parent tree. `sublocations` are generated by resolving reverse
parent links, never authored as a second list. The zero-state source's nested authoring
form is flattened into those links before this derivation; chapter locations author the
same hierarchy directly through `parent_location_id` and `parent_relation`.

Only a mapped `star_system` references a reviewed astronomy-system ID. The generator
joins that system context with descendant narrative locations; it must reject an
incompatible mapped ancestry and must never invent a coordinate. An explicitly
unmapped location remains valid but cannot receive a map placement. The zero-state and
chapter sources must not copy physical components, positions, sizes, colours, or other
astronomy render facts.

## Schema and semantic validation

JSON Schema validates the structural contract of every source record. Referential and
temporal rules that require looking up another record are a mandatory second validation
layer. It rejects at least:

- malformed scalar values or non-canonical IDs;
- malformed zero-state source or `books.json`, a chapter path that disagrees with its
  `chapter` value, a chapter whose book is absent from `books.json`, or an
  incomplete/out-of-order generated chapter manifest;
- a malformed asset registry, duplicate asset ID or path, an unsafe static asset path,
  a missing or non-regular registered file under `public/assets/`, or a `picture_id`
  that does not resolve to a registered asset;
- a zero-state source whose fixed Solar-System root, Sol child, location kind,
  parent-relation pair, leaf representation, or astronomy reference is invalid;
- a broken zero-state location tree, duplicate IDs across the baseline and chapter
  sources, a child array whose orbital subsequence is not inner-to-outer, more than
  four moons under one planet, an incomplete or misordered required Solar inventory,
  or a chapter introduction that repeats a seeded ID;
- duplicate entity introductions; an introduction reference that does not resolve to a
  seeded entity or an earlier item in the same `introducing` array; or a chapter default
  location that is neither previously available nor introduced in that chapter;
- an introduction that lacks the complete minimum state for its type;
- more than one update object for an entity in a chapter; an update targeting an entity
  introduced by the same chapter; or an update property not allowed by that entity
  type;
- invalid update `null` use, invalid list replacement values, or invalid references;
- an invalid character ID, name, aliases list, or typed species, asset, or death-event
  reference; a character death date that conflicts with its referenced event date;
- an invalid species ID, name, description, picture, or homeworld reference, including
  a homeworld that is transit or has not been seeded or introduced;
- an invalid event ID, name, description, picture, date, location, or participant
  reference; duplicate participant IDs; or a participant list that is not a complete
  replacement when updated;
- a chapter missing its required title, summary, date, or default location; an empty
  authored optional array; or an appearance array with no `lead` appearance;
- competing state writes that have equal or incomparable effective story dates, or a
  year-only selected chapter date that cannot determine a needed indexed transition;
- a broken location parent tree; a parent/child/relation combination outside the shared
  location table; invalid transit endpoints; an unmapped descendant without explicit
  status; a forbidden or missing mapped-system astronomy reference; or incompatible
  mapped astronomy ancestry;
- an appearance without an effective explicit location; and
- a generated record or snapshot presented as editable source data.
