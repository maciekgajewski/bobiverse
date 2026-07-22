import { describe, expect, it } from "vitest";
import { closestMarkerSystemId } from "../../src/domain/star-picking";

describe("star picking", () => {
  it("selects the closest selectable marker and ignores decoration hits", () => {
    expect(
      closestMarkerSystemId([
        { distance: 1, object: { userData: {} } },
        { distance: 4, object: { userData: { systemId: "groombridge-34" } } },
        { distance: 2, object: { userData: { systemId: "ross-248" } } },
      ]),
    ).toBe("ross-248");
  });

  it("returns null when no selectable marker was hit", () => {
    expect(
      closestMarkerSystemId([{ distance: 1, object: { userData: {} } }]),
    ).toBeNull();
  });
});
