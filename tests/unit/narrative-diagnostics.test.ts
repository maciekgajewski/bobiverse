import { describe, expect, it } from "vitest";
import { parseJsonDocument } from "../../src/narrative/json-source-map";
import { narrativeSchemaErrors } from "../../src/narrative/model";
import { formatSchemaDiagnostics } from "../../src/narrative/schema-diagnostics";

describe("narrative schema diagnostics", () => {
  it("reports all actionable schema errors at their authored JSON positions", () => {
    const document = parseJsonDocument(`{
  "chapter": "1.1",
  "title": "Fixture chapter",
  "summary": "A fictional fixture.",
  "date": "2200",
  "location_id": "location:bad_name",
  "introducing": [
    {
      "id": "species:fixture",
      "name": "Fixture species",
      "homeworld_location_id": "location:earth"
    }
  ]
}`);

    const diagnostics = formatSchemaDiagnostics(
      narrativeSchemaErrors("chapter_source", document.value),
      document.value,
      document.locations,
    );

    expect(diagnostics).toEqual([
      {
        location: { line: 6, column: 18 },
        message:
          '/location_id: must match pattern "^location:[a-z0-9][a-z0-9-]*$"',
      },
      {
        location: { line: 11, column: 32 },
        message:
          '/introducing/0/homeworld_location_id: unexpected property "homeworld_location_id"; did you mean: homeworld_id, description, picture_id',
      },
    ]);
  });

  it("uses the shared entity diagnostics for zero-state entities", () => {
    const document = parseJsonDocument(`{
  "locations": {
    "id": "location:solar-system",
    "name": "Solar System",
    "kind": "star_system",
    "astronomy_object_id": "sol",
    "children": [{
      "id": "location:sol",
      "name": "Sol",
      "kind": "star",
      "parent_relation": "member_of_system",
      "children": [{
        "id": "location:earth",
        "name": "Earth",
        "kind": "planet",
        "parent_relation": "orbits"
      }]
    }]
  },
  "entities": [
    {
      "id": "species:fixture",
      "name": "Fixture species",
      "homeworld_location_id": "location:earth"
    }
  ]
}`);

    const diagnostics = formatSchemaDiagnostics(
      narrativeSchemaErrors("zero_state_source", document.value),
      document.value,
      document.locations,
    );

    expect(diagnostics).toContainEqual({
      location: { line: 24, column: 32 },
      message:
        '/entities/0/homeworld_location_id: unexpected property "homeworld_location_id"; did you mean: homeworld_id, description, picture_id',
    });
  });

  it("suggests current_state for unified vessel records", () => {
    const document = parseJsonDocument(`{
  "id": "vessel:fixture",
  "name": "Fixture vessel",
  "curent_state": "Ready."
}`);

    const diagnostics = formatSchemaDiagnostics(
      narrativeSchemaErrors("vessel", document.value),
      document.value,
      document.locations,
    );

    expect(diagnostics.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\/curent_state: unexpected property "curent_state"; did you mean: current_state(?:,|$)/,
        ),
      ]),
    );
  });

  it("suggests surveyed-body observation properties for locations", () => {
    const document = parseJsonDocument(`{
  "id": "location:fixture-planet",
  "name": "Fixture planet",
  "kind": "planet",
  "parent_location_id": "location:sol",
  "parent_relation": "orbits",
  "surface_gravty_g": 1.2
}`);

    const diagnostics = formatSchemaDiagnostics(
      narrativeSchemaErrors("location", document.value),
      document.value,
      document.locations,
    );

    expect(diagnostics.map(({ message }) => message)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^\/surface_gravty_g: unexpected property "surface_gravty_g"; did you mean: surface_gravity_g(?:,|$)/,
        ),
      ]),
    );
  });

  it("reports misplaced surveyed-body properties with eligible kinds", () => {
    for (const [definition, json, expectedPointer] of [
      [
        "location",
        `{
  "id": "location:fixture-locale",
  "name": "Fixture locale",
  "kind": "locale",
  "color": "rust red",
  "parent_location_id": "location:earth",
  "parent_relation": "located_on"
}`,
        "/color",
      ],
      [
        "location_update",
        `{
  "entity_id": "location:fixture",
  "kind": "locale",
  "visual_description": "A cratered surface."
}`,
        "/visual_description",
      ],
    ] as const) {
      const document = parseJsonDocument(json);
      const diagnostics = formatSchemaDiagnostics(
        narrativeSchemaErrors(definition, document.value),
        document.value,
        document.locations,
      );

      expect(diagnostics).toEqual([
        {
          location: document.locations.get(expectedPointer),
          message: `${expectedPointer}: survey property "${expectedPointer.slice(1)}" requires effective location kind planet, dwarf_planet, or moon; got locale`,
        },
      ]);
    }
  });
});
