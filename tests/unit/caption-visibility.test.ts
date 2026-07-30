import { describe, expect, it } from "vitest";
import { resolveCaptionVisibility } from "../../src/domain/caption-visibility";

describe("caption collision visibility", () => {
  it("suppresses ordinary captions but reserves active, hovered-tooltip, and selected slots", () => {
    const visible = resolveCaptionVisibility([
      { id: "known", priority: 0, x: 100, y: 100, visible: true },
      { id: "suppressed", priority: 0, x: 110, y: 105, visible: true },
      { id: "active", priority: 1, x: 110, y: 105, visible: true },
      { id: "hovered", priority: 2, x: 110, y: 105, visible: true },
      { id: "selected", priority: 3, x: 110, y: 105, visible: true },
    ]);
    expect([...visible].sort()).toEqual(["active", "hovered", "selected"]);
  });
});
