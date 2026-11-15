import { describe, expect, it } from "vitest";
import {
  CAPTION_CLICK_DEDUPE_MS,
  COARSE_POINTER_PICK_RADIUS_PX,
  FINE_POINTER_PICK_RADIUS_PX,
  PICK_DRAG_THRESHOLD_PX,
  createCaptionClickDedupe,
  createPickGesture,
  effectivePickRadiusPx,
  nearestScreenPick,
  pointerMovedBeyondPickThreshold,
  pointerPickRadiusPx,
  type ScreenPickCandidate,
} from "../../src/domain/star-picking";

function candidate(
  overrides: Partial<ScreenPickCandidate> &
    Pick<ScreenPickCandidate, "systemId" | "x" | "y">,
): ScreenPickCandidate {
  return {
    componentId: `${overrides.systemId}-component`,
    pickRadiusPx: 2,
    depth: 30,
    ...overrides,
  };
}

describe("pointer pick radius", () => {
  it("uses 22 CSS px for a coarse pointer and 10 for a fine pointer", () => {
    expect(pointerPickRadiusPx(true)).toBe(COARSE_POINTER_PICK_RADIUS_PX);
    expect(pointerPickRadiusPx(false)).toBe(FINE_POINTER_PICK_RADIUS_PX);
    expect(COARSE_POINTER_PICK_RADIUS_PX).toBe(22);
    expect(FINE_POINTER_PICK_RADIUS_PX).toBe(10);
  });

  it("never shrinks below the projected 0.09 pc quad", () => {
    expect(effectivePickRadiusPx(22, 2.4)).toBe(22);
    expect(effectivePickRadiusPx(10, 2.4)).toBe(10);
    expect(effectivePickRadiusPx(22, 81.97)).toBe(81.97);
    expect(effectivePickRadiusPx(10, 40.98)).toBe(40.98);
  });
});

describe("nearest screen pick", () => {
  it("selects the nearest centre on screen even when a farther one is closer in depth", () => {
    const pick = nearestScreenPick(
      [
        candidate({
          systemId: "wise",
          x: 140,
          y: 430,
          depth: 44,
          pickRadiusPx: 1.9,
        }),
        candidate({
          systemId: "sol",
          x: 195,
          y: 448,
          depth: 10,
          pickRadiusPx: 1.8,
        }),
      ],
      { x: 140, y: 430 },
      COARSE_POINTER_PICK_RADIUS_PX,
    );
    expect(pick?.systemId).toBe("wise");
  });

  it("uses camera depth only as a tie-break when screen distances are equal", () => {
    const pick = nearestScreenPick(
      [
        candidate({
          systemId: "far",
          x: 10,
          y: 0,
          depth: 40,
          pickRadiusPx: 22,
        }),
        candidate({
          systemId: "near",
          x: -10,
          y: 0,
          depth: 8,
          pickRadiusPx: 22,
        }),
      ],
      { x: 0, y: 0 },
      COARSE_POINTER_PICK_RADIUS_PX,
    );
    expect(pick?.systemId).toBe("near");
  });

  it("skips locked or otherwise omitted candidates", () => {
    const locked = candidate({ systemId: "locked", x: 0, y: 0 });
    const pickable = candidate({ systemId: "pickable", x: 8, y: 0 });
    // Callers omit locked, spoiler-hidden and unpickable objects.
    expect(
      nearestScreenPick(
        [locked, pickable],
        { x: 0, y: 0 },
        COARSE_POINTER_PICK_RADIUS_PX,
      )?.systemId,
    ).toBe("locked");
    expect(
      nearestScreenPick(
        [pickable],
        { x: 0, y: 0 },
        COARSE_POINTER_PICK_RADIUS_PX,
      )?.systemId,
    ).toBe("pickable");
    expect(
      nearestScreenPick([], { x: 0, y: 0 }, COARSE_POINTER_PICK_RADIUS_PX),
    ).toBeNull();
  });

  it("does not pick a centre outside its effective radius", () => {
    expect(
      nearestScreenPick(
        [candidate({ systemId: "sol", x: 0, y: 0, pickRadiusPx: 2 })],
        { x: 22.1, y: 0 },
        COARSE_POINTER_PICK_RADIUS_PX,
      ),
    ).toBeNull();
    expect(
      nearestScreenPick(
        [candidate({ systemId: "sol", x: 0, y: 0, pickRadiusPx: 2 })],
        { x: 22, y: 0 },
        COARSE_POINTER_PICK_RADIUS_PX,
      )?.systemId,
    ).toBe("sol");
    expect(
      nearestScreenPick(
        [candidate({ systemId: "sol", x: 0, y: 0, pickRadiusPx: 2 })],
        { x: 10.1, y: 0 },
        FINE_POINTER_PICK_RADIUS_PX,
      ),
    ).toBeNull();
  });

  it("lets a star centre within R beat a nearby caption that would otherwise steal the tap", () => {
    // Zoomed-out 390x844 geometry from the investigation: WISE's centre
    // sits ~42 CSS px from Sol, inside Sol's 74x41 caption box, while
    // Sol is closer to the camera.
    const wise = candidate({
      systemId: "stellar-system-000138",
      x: 153.1,
      y: 436.0,
      depth: 44.2,
      pickRadiusPx: 1.86,
    });
    const sol = candidate({
      systemId: "sol",
      x: 195.0,
      y: 448.0,
      depth: 45,
      pickRadiusPx: 1.82,
    });
    const atWise = nearestScreenPick(
      [wise, sol],
      { x: wise.x, y: wise.y },
      COARSE_POINTER_PICK_RADIUS_PX,
    );
    expect(atWise?.systemId).toBe("stellar-system-000138");
    const onSolCaption = nearestScreenPick(
      [wise, sol],
      { x: 195, y: 448 + 30 },
      COARSE_POINTER_PICK_RADIUS_PX,
    );
    expect(onSolCaption).toBeNull();
  });
});

describe("pick drag threshold", () => {
  it("allows a tap under 10 CSS px of movement and rejects a drag at or beyond it", () => {
    expect(PICK_DRAG_THRESHOLD_PX).toBe(10);
    expect(
      pointerMovedBeyondPickThreshold({ x: 0, y: 0 }, { x: 9.9, y: 0 }),
    ).toBe(false);
    expect(
      pointerMovedBeyondPickThreshold({ x: 0, y: 0 }, { x: 10, y: 0 }),
    ).toBe(true);
    expect(
      pointerMovedBeyondPickThreshold({ x: 0, y: 0 }, { x: 6, y: 8 }),
    ).toBe(true);
  });
});

describe("multi-touch pick gesture", () => {
  it("allows a single-pointer tap on the map to pick", () => {
    const gesture = createPickGesture();
    gesture.pointerDown({ id: 1, x: 10, y: 20 }, true);
    const up = gesture.pointerUp(1);
    expect(up.tracked).toBe(true);
    expect(up.mayPickFrom).toEqual({ id: 1, x: 10, y: 20 });
  });

  it("ignores a pointer that starts off the map", () => {
    const gesture = createPickGesture();
    gesture.pointerDown({ id: 1, x: 10, y: 20 }, false);
    expect(gesture.pointerUp(1)).toEqual({ mayPickFrom: null, tracked: false });
  });

  it("does not pick when a second pointer arrives, even if the first stays still", () => {
    const gesture = createPickGesture();
    gesture.pointerDown({ id: 1, x: 40, y: 80 }, true);
    gesture.pointerDown({ id: 2, x: 120, y: 90 }, true);
    // The moving pinch finger lifts first; the still finger then releases
    // on the same star it went down on.
    expect(gesture.pointerUp(2)).toEqual({ mayPickFrom: null, tracked: true });
    expect(gesture.pointerUp(1)).toEqual({ mayPickFrom: null, tracked: true });
  });

  it("does not pick if the still first finger lifts before the second", () => {
    const gesture = createPickGesture();
    gesture.pointerDown({ id: 1, x: 40, y: 80 }, true);
    gesture.pointerDown({ id: 2, x: 120, y: 90 }, true);
    expect(gesture.pointerUp(1).mayPickFrom).toBeNull();
    expect(gesture.pointerUp(2).mayPickFrom).toBeNull();
  });

  it("allows a new single-pointer tap after every pointer is up", () => {
    const gesture = createPickGesture();
    gesture.pointerDown({ id: 1, x: 40, y: 80 }, true);
    gesture.pointerDown({ id: 2, x: 120, y: 90 }, true);
    gesture.pointerUp(2);
    gesture.pointerUp(1);
    gesture.pointerDown({ id: 3, x: 15, y: 15 }, true);
    const up = gesture.pointerUp(3);
    expect(up.mayPickFrom).toEqual({ id: 3, x: 15, y: 15 });
  });

  it("cancelling the first pointer while a second is down keeps picks suppressed", () => {
    const gesture = createPickGesture();
    gesture.pointerDown({ id: 1, x: 40, y: 80 }, true);
    gesture.pointerDown({ id: 2, x: 120, y: 90 }, true);
    gesture.pointerCancel(1);
    expect(gesture.pointerUp(2).mayPickFrom).toBeNull();
    gesture.pointerDown({ id: 3, x: 15, y: 15 }, true);
    expect(gesture.pointerUp(3).mayPickFrom).toEqual({ id: 3, x: 15, y: 15 });
  });
});

describe("caption click dedupe", () => {
  it("lets onSelect fire once when pointerup and caption click handle the same tap", () => {
    const gesture = createPickGesture();
    const dedupe = createCaptionClickDedupe();
    const selections: string[] = [];

    const commitPointerUp = (id: number, nowMs: number) => {
      const { mayPickFrom, tracked } = gesture.pointerUp(id);
      if (tracked) dedupe.rememberPointerUp(nowMs);
      if (!mayPickFrom) return;
      if (pointerMovedBeyondPickThreshold(mayPickFrom, { x: 80, y: 40 })) {
        return;
      }
      selections.push("sol");
    };
    const captionClick = (nowMs: number) => {
      if (dedupe.shouldSkip(nowMs)) return;
      selections.push("sol");
    };

    gesture.pointerDown({ id: 1, x: 80, y: 40 }, true);
    commitPointerUp(1, 1_000);
    captionClick(1_001);
    expect(selections).toEqual(["sol"]);
  });

  it("still selects from a synthetic caption click that had no pointerup", () => {
    const dedupe = createCaptionClickDedupe();
    const selections: string[] = [];
    if (!dedupe.shouldSkip(1_000)) selections.push("sol");
    expect(selections).toEqual(["sol"]);
  });

  it("allows a later caption click after the dedupe window", () => {
    const dedupe = createCaptionClickDedupe();
    const selections: string[] = [];
    dedupe.rememberPointerUp(1_000);
    if (!dedupe.shouldSkip(1_000 + CAPTION_CLICK_DEDUPE_MS + 1)) {
      selections.push("sol");
    }
    expect(selections).toEqual(["sol"]);
  });
});
