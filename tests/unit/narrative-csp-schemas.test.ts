import { describe, expect, it } from "vitest";
import { shouldCompileNarrativeSchemas } from "../../src/narrative/model";

describe("shouldCompileNarrativeSchemas", () => {
  it("stays enabled in Vitest so unit tests still compile Ajv validators", () => {
    expect(import.meta.env.PROD).toBe(false);
    expect(shouldCompileNarrativeSchemas()).toBe(true);
  });
});
