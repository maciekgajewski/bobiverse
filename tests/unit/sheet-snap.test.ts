import { describe, expect, it } from "vitest";
import {
  SHEET_SNAPS,
  cycleSnap,
  settleSnap,
  stepSnap,
} from "../../src/domain/sheet-snap";

const heights = { peek: 152, half: 422, full: 792 };

describe("detail sheet snaps", () => {
  it("orders the snaps from peek to full", () => {
    expect(SHEET_SNAPS).toEqual(["peek", "half", "full"]);
  });

  it("cycles peek, half, full and back to peek", () => {
    expect(cycleSnap("peek")).toBe("half");
    expect(cycleSnap("half")).toBe("full");
    expect(cycleSnap("full")).toBe("peek");
  });

  it("steps one snap at a time and stops at either end", () => {
    expect(stepSnap("peek", 1)).toBe("half");
    expect(stepSnap("half", 1)).toBe("full");
    expect(stepSnap("full", 1)).toBe("full");
    expect(stepSnap("full", -1)).toBe("half");
    expect(stepSnap("peek", -1)).toBe("peek");
  });

  it("settles a drag on the nearest snap height", () => {
    // Dragged up from peek to just under full.
    expect(settleSnap("peek", 760, -608, heights)).toBe("full");
    // Dragged down from full to just above half.
    expect(settleSnap("full", 450, 342, heights)).toBe("half");
    // Dragged down from half to near peek.
    expect(settleSnap("half", 180, 242, heights)).toBe("peek");
  });

  it("moves one snap for a short, deliberate drag", () => {
    // Nearest is still the start, but the travel is past the step threshold.
    expect(settleSnap("half", 480, -58, heights)).toBe("full");
    expect(settleSnap("half", 370, 52, heights)).toBe("peek");
  });

  it("stays put for a small wobble", () => {
    expect(settleSnap("half", 432, -10, heights)).toBe("half");
  });
});
