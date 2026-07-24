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
});
