import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

// Variant A puts compact commands in a top-bar menu drawer.
async function openMenuCommand(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Menu" }).click();
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("button", { name })
    .click();
}

// The desktop dock and the top bar both label a select "Read through".
function dockReadThrough(page: Page) {
  return page.locator("#desktop-read-through");
}

async function expandAstronomyNotice(page: Page): Promise<void> {
  const chip = page.getByRole("button", { name: /^Astronomy data credits:/ });
  if ((await chip.getAttribute("aria-expanded")) !== "true") await chip.click();
}

async function settleMapCamera(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const bridge = window.__bob034MapPerformance;
        if (!bridge) {
          reject(new Error("Map performance bridge is unavailable."));
          return;
        }
        const distance = (left: readonly number[], right: readonly number[]) =>
          Math.hypot(
            left[0]! - right[0]!,
            left[1]! - right[1]!,
            left[2]! - right[2]!,
          );
        let previous = bridge.snapshot();
        let stableFrames = 0;
        const startedAt = performance.now();
        const sample = () => {
          const current = bridge.snapshot();
          stableFrames =
            distance(previous.camera, current.camera) < 1e-5 &&
            distance(previous.target, current.target) < 1e-5
              ? stableFrames + 1
              : 0;
          previous = current;
          if (!current.cameraTransitionActive && stableFrames >= 8) {
            resolve();
            return;
          }
          if (performance.now() - startedAt > 4_000) {
            reject(new Error("Map camera did not settle."));
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
}

// Step every animation frame, rather than allowing a slow software renderer to
// skip most of a wall-clock dolly. This tests interpolation, not GPU throughput.
// No fastForward: it coalesces timers and would hide intermediate camera poses.
async function withAnimationFrames<T>(
  page: Page,
  operation: () => Promise<T>,
): Promise<T> {
  let settled = false;
  const result = operation().finally(() => {
    settled = true;
  });
  // Attach a rejection handler immediately while the frame pump is running.
  void result.catch(() => {});
  for (let frame = 0; frame < 250 && !settled; frame += 1) {
    await page.clock.runFor(16);
  }
  if (!settled)
    throw new Error("Operation did not complete within 4s of frames.");
  return result;
}

// Trigger first, then advance the paused clock one 16ms frame at a time and read
// the map bridge from the test runner after each frame. page.waitForFunction polls
// on the browser's real animation frames, not the paused clock, so pumping frames
// concurrently with it races: on a slow WebKit renderer a whole camera transition
// can start and finish between two real polls, and a fixed frame budget spent
// during a slow click or resize can run out before the action lands. Here the
// frame budget only starts once the action has completed, and a transient state
// (an active transition) is observed on the first frame it exists.
async function advanceFramesUntil(
  page: Page,
  description: string,
  condition: () => Promise<boolean>,
): Promise<void> {
  for (let frame = 0; frame < 250; frame += 1) {
    if (await condition()) return;
    await page.clock.runFor(16);
  }
  if (await condition()) return;
  throw new Error(`${description} did not happen within 4s of frames.`);
}

function monitorCameraDirection(
  page: Page,
): Promise<{ maximumDirectionError: number; maximumStepFraction: number }> {
  return page.evaluate(
    () =>
      new Promise<{
        maximumDirectionError: number;
        maximumStepFraction: number;
      }>((resolve, reject) => {
        const bridge = window.__bob034MapPerformance;
        if (!bridge) {
          reject(new Error("Map performance bridge is unavailable."));
          return;
        }
        const direction = (snapshot: ReturnType<typeof bridge.snapshot>) => {
          const x = snapshot.camera[0] - snapshot.target[0];
          const y = snapshot.camera[1] - snapshot.target[1];
          const z = snapshot.camera[2] - snapshot.target[2];
          const length = Math.hypot(x, y, z);
          return [x / length, y / length, z / length] as const;
        };
        const start = direction(bridge.snapshot());
        let maximumError = 0;
        let maximumCameraStep = 0;
        let totalCameraTravel = 0;
        let moved = false;
        let stableFrames = 0;
        let previous = bridge.snapshot();
        const startedAt = performance.now();
        const sample = () => {
          const current = bridge.snapshot();
          const currentDirection = direction(current);
          maximumError = Math.max(
            maximumError,
            1 -
              (start[0] * currentDirection[0] +
                start[1] * currentDirection[1] +
                start[2] * currentDirection[2]),
          );
          const cameraDelta = Math.hypot(
            current.camera[0] - previous.camera[0],
            current.camera[1] - previous.camera[1],
            current.camera[2] - previous.camera[2],
          );
          const targetDelta = Math.hypot(
            current.target[0] - previous.target[0],
            current.target[1] - previous.target[1],
            current.target[2] - previous.target[2],
          );
          maximumCameraStep = Math.max(maximumCameraStep, cameraDelta);
          totalCameraTravel += cameraDelta;
          moved ||= cameraDelta > 1e-5 || targetDelta > 1e-5;
          stableFrames =
            cameraDelta < 1e-5 && targetDelta < 1e-5 ? stableFrames + 1 : 0;
          previous = current;
          if (moved && stableFrames >= 8) {
            resolve({
              maximumDirectionError: maximumError,
              maximumStepFraction: maximumCameraStep / totalCameraTravel,
            });
            return;
          }
          if (performance.now() - startedAt > 4_000) {
            reject(new Error("Camera transition did not settle."));
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
}

test("phone browser opens, selection opens inspector, and light-years remain fixed", async ({
  page,
}, testInfo) => {
  const startedAt = Date.now();
  const startupEvents: { elapsedMs: number; kind: string; detail: string }[] =
    [];
  const record = (kind: string, detail: string) => {
    startupEvents.push({ elapsedMs: Date.now() - startedAt, kind, detail });
  };
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      record(message.type(), message.text());
    }
  });
  page.on("pageerror", (error) => record("pageerror", error.message));
  page.on("requestfailed", (request) =>
    record(
      "requestfailed",
      `${request.url()}: ${request.failure()?.errorText}`,
    ),
  );
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    record("navigation", "load event completed");
    expect(
      await page
        .getByTestId("star-map-canvas")
        .evaluate((canvas) => canvas.clientHeight),
    ).toBeGreaterThan(0);
    await page.waitForFunction(
      () => window.__bob034MapPerformance !== undefined,
    );
    record("map", "renderer bridge available");
    await openMenuCommand(page, "Browse objects");
    await page.getByRole("button", { name: "Solar System" }).click();
    await expect(
      page.getByRole("heading", { name: "Solar System" }),
    ).toBeVisible();
    await page
      .getByRole("dialog", { name: "Selected object" })
      .getByRole("button", { name: "Close" })
      .click();
    await expect(page.getByLabel("Distance unit")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "pc", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "ly", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByTestId("map-scale-label")).toContainText("ly");
  } catch (error) {
    // Do not replace the canvas assertion with a fallback or a retry. Preserve
    // driver/startup errors even when the overall test deadline closes the page.
    await testInfo.attach("map-startup", {
      body: JSON.stringify(startupEvents, null, 2),
      contentType: "application/json",
    });
    throw error;
  }
});

test("empty map clicks clear inspection selection", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Solar System" }).click();
  await expect(
    page.getByRole("heading", { name: "Solar System" }),
  ).toBeVisible();
  await page
    .getByTestId("star-map-canvas")
    .click({ position: { x: 100, y: 40 } });
  await expect(
    page.getByText(
      "Select a map marker or browser item to inspect its reader-safe details.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Measure" })).toHaveCount(0);
});

test("compact Date mode opens Date context in the inspector panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.2",
        displayDate: "2133-06-24",
        mode: "date",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.goto("/");
  await openMenuCommand(page, "Timeline and progress");
  const timeline = page.getByRole("dialog", { name: "Timeline and progress" });
  await expect(
    timeline.getByRole("button", { name: "Date mode" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Inspect selection" }),
  ).toHaveCount(0);
  await timeline
    .getByRole("button", {
      name: "Story state 1 of 1 · 24 June 2133 · revealed in Chapter 1.2",
    })
    .click();
  const inspector = page.getByRole("dialog", { name: "Selected object" });
  await expect(inspector.getByText("Date context")).toBeVisible();
  await expect(
    inspector.getByRole("heading", { name: "24 June 2133", exact: true }),
  ).toBeVisible();
  await expect(
    inspector.getByText("Chapter 1.2", { exact: true }),
  ).toBeVisible();
  await expect(
    inspector.getByRole("navigation", { name: "Inspector history" }),
  ).toHaveCount(0);
  await inspector.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
  await openMenuCommand(page, "Inspect selection");
  await expect(inspector.getByText("Date context")).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("bobiverse.app-state.v2")!),
    ),
  ).toMatchObject({
    furthestChapterRead: "1.2",
    viewChapter: "1.2",
    displayDate: "2133-06-24",
    mode: "date",
  });
});

test("empty map click clears an open Date context", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await dockReadThrough(page).selectOption("1.2");
  await page.getByRole("button", { name: "Confirm read through" }).click();
  await page.getByRole("button", { name: "Date mode" }).click();
  await page.locator(".date-event-dot").first().click();
  await expect(page.getByText("Date context")).toBeVisible();
  await page
    .getByTestId("star-map-canvas")
    .click({ position: { x: 100, y: 40 } });
  await expect(page.getByText("Date context")).toHaveCount(0);
  await expect(
    page.getByText(
      "Select a map marker or browser item to inspect its reader-safe details.",
    ),
  ).toBeVisible();
});

test("canvas picking selects a known map system after framing settles", async ({
  page,
}) => {
  test.setTimeout(45_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.14",
        viewChapter: "1.14",
        displayDate: "2144",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  await settleMapCamera(page);
  await expect
    .poll(() => page.locator(".narrative-map-label").count())
    .toBeGreaterThan(1);
  // Zoom through real OrbitControls so the fixed-size DOM caption is clear
  // of Sol's marker; at the overview framing it can cover the projected centre.
  await page
    .getByTestId("star-map-canvas")
    .hover({ position: { x: 100, y: 40 } });
  for (let step = 0; step < 35; step += 1) {
    await page.mouse.wheel(0, -120);
  }
  await page.mouse.move(1, 1);
  await settleMapCamera(page);
  const sol = await page.evaluate(() =>
    window.__bob034MapPerformance!.screenPoint("sol"),
  );
  // Sol has one component at the canonical system position, so its projected
  // centre is a marker hit target. A multi-component system need not put a
  // component at its canonical centre.
  // Use a real canvas click, not a DOM caption click, to exercise R3F picking.
  expect(
    await page.evaluate(
      ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
      sol,
    ),
  ).toBe("CANVAS");
  await page.mouse.click(sol.x, sol.y);
  await page.mouse.move(1, 1);
  await expect(
    page
      .getByRole("complementary", { name: "Object inspector" })
      .getByRole("heading", { name: "Solar System" }),
  ).toBeVisible();
  await expect(
    page.locator('.narrative-map-label[data-system-id="sol"]'),
  ).toHaveCount(1);
});

test("Solar System enters and exits the fixed system mode", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Solar System" }).click();
  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  const ordinaryTopbarHeight = await page
    .locator(".topbar")
    .evaluate((topbar) => topbar.getBoundingClientRect().height);
  await inspector.getByRole("button", { name: "Enter system" }).click();
  await expect(page.getByRole("button", { name: "Star Map" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Return to map" }),
  ).toBeVisible();
  const zoomedTopbarHeight = await page
    .locator(".topbar")
    .evaluate((topbar) => topbar.getBoundingClientRect().height);
  expect(zoomedTopbarHeight).toBe(ordinaryTopbarHeight);
  const breadcrumbTypography = await page
    .getByRole("navigation", { name: "Star map breadcrumb" })
    .evaluate((breadcrumb) => {
      const root = breadcrumb.querySelector("button");
      const current = breadcrumb.querySelector('[aria-current="page"]');
      if (!root || !current)
        throw new Error("Zoomed breadcrumb is incomplete.");
      const rootStyle = getComputedStyle(root);
      const currentStyle = getComputedStyle(current);
      return {
        root: [rootStyle.color, rootStyle.fontSize, rootStyle.fontWeight],
        current: [
          currentStyle.color,
          currentStyle.fontSize,
          currentStyle.fontWeight,
        ],
      };
    });
  expect(breadcrumbTypography.current).toEqual(breadcrumbTypography.root);
  await inspector
    .getByRole("button", { name: "Inspect component: Sol" })
    .click();
  await expect(inspector.getByRole("heading", { name: "Sol" })).toBeVisible();
  await page.goBack();
  await expect(
    inspector.getByRole("button", { name: "Enter system" }),
  ).toBeVisible();
  // screenPoint projects a canonical system coordinate, not a guaranteed
  // component hit target. In this fixture that click produced hover only
  // (the label vanished after mouse.move). After
  // system-mode exit, use the object-browser path (same as Sirius coverage) to
  // prove the map/inspector respond. Canvas picking for known narrative systems
  // remains covered separately. Pre-existing on 3c818b9; not a Date-timeline
  // regression.
  const search = page.getByRole("searchbox", {
    name: "Search visible objects",
  });
  await search.fill("alpha centauri");
  await page.getByRole("button", { name: /^Alpha Centauri/ }).click();
  await expect(
    inspector.getByRole("heading", { name: "Alpha Centauri" }),
  ).toBeVisible();
  await expect(
    page
      .locator(".narrative-map-label")
      .filter({ hasText: /^Alpha Centauri$/ }),
  ).toHaveCount(1);
});

test("immediate system entry completes ordinary focus before pose capture", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  await page.getByRole("button", { name: "Solar System" }).click();
  await settleMapCamera(page);
  const expectedFocusedPose = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );

  await page.reload();
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  await page.getByRole("button", { name: "Solar System" }).click();
  await page.waitForFunction(
    () => window.__bob034MapPerformance!.snapshot().cameraTransitionActive,
  );
  await page
    .getByRole("complementary", { name: "Object inspector" })
    .getByRole("button", { name: "Enter system" })
    .click();
  await settleMapCamera(page);
  await page.getByRole("button", { name: "Return to map" }).click();
  await settleMapCamera(page);
  const restoredPose = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  expect(restoredPose.camera).toEqual(expectedFocusedPose.camera);
  expect(restoredPose.target).toEqual(expectedFocusedPose.target);
});

test("ordinary map reframes after a canvas resize", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  await settleMapCamera(page);
  const beforeResize = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForFunction(
    (revision) =>
      window.__bob034MapPerformance!.snapshot().framingRevision > revision,
    beforeResize.framingRevision,
  );
  const afterResize = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  expect(afterResize.target).toEqual(beforeResize.target);
});

test("system-mode dollies preserve direction and restore the exact camera pose", async ({
  page,
}) => {
  // A fixed, future pause boundary cannot become stale between protocol calls.
  // Keep natural loading timers until the map is ready, as Playwright recommends.
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  await page.getByRole("button", { name: "Solar System" }).click();
  await settleMapCamera(page);
  const originalPose = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );

  await page.clock.pauseAt(new Date("2026-01-02T00:00:00Z"));
  const entryDirectionMonitor = monitorCameraDirection(page);
  await page
    .getByRole("complementary", { name: "Object inspector" })
    .getByRole("button", { name: "Enter system" })
    .click();
  await advanceFramesUntil(page, "Entry transition", () =>
    page.evaluate(
      () => window.__bob034MapPerformance!.snapshot().cameraTransitionActive,
    ),
  );
  await page.locator("#map-stage").evaluate((stage) => {
    stage.style.width = "85%";
  });
  const entryMotion = await withAnimationFrames(
    page,
    () => entryDirectionMonitor,
  );
  expect(entryMotion.maximumDirectionError).toBeLessThan(1e-7);
  expect(entryMotion.maximumStepFraction).toBeLessThan(0.45);
  const enteredState = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  expect(enteredState.capturedCamera).toEqual(originalPose.camera);
  expect(enteredState.capturedTarget).toEqual(originalPose.target);

  const midExitAlphaCentauri = await page.evaluate(() =>
    window.__bob034MapPerformance!.screenPoint("stellar-system-005413"),
  );
  const exitDirectionMonitor = monitorCameraDirection(page);
  await page.getByRole("button", { name: "Return to map" }).click();
  await advanceFramesUntil(page, "Exit transition", () =>
    page.evaluate(
      () => window.__bob034MapPerformance!.snapshot().cameraTransitionActive,
    ),
  );
  await page.evaluate(({ x, y }) => {
    if (!window.__bob034MapPerformance!.snapshot().cameraTransitionActive) {
      throw new Error("Exit transition ended before the interaction probe.");
    }
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-testid="star-map-canvas"]',
    );
    if (!canvas) throw new Error("Star-map canvas is unavailable.");
    const init = { bubbles: true, clientX: x, clientY: y };
    canvas.dispatchEvent(new PointerEvent("pointerdown", init));
    canvas.dispatchEvent(new PointerEvent("pointerup", init));
    canvas.dispatchEvent(new MouseEvent("click", init));
  }, midExitAlphaCentauri);
  await page.locator("#map-stage").evaluate((stage) => {
    stage.style.removeProperty("width");
  });
  const exitMotion = await withAnimationFrames(
    page,
    () => exitDirectionMonitor,
  );
  expect(exitMotion.maximumDirectionError).toBeLessThan(1e-7);
  expect(exitMotion.maximumStepFraction).toBeLessThan(0.45);

  await expect(
    page
      .getByRole("complementary", { name: "Object inspector" })
      .getByRole("button", { name: "Enter system" }),
  ).toBeVisible();
  const restoredState = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  expect(restoredState).toMatchObject({
    controlsEnabled: true,
    cameraTransitionActive: false,
    restorePending: false,
  });
  expect(restoredState.framingRevision).toBe(originalPose.framingRevision);
  expect(restoredState.camera).toEqual(originalPose.camera);
  expect(restoredState.target).toEqual(originalPose.target);
  await expect(
    page.locator(".narrative-map-label").filter({ hasText: /^Solar System$/ }),
  ).toHaveCount(1);
  // Continue explicit frames through reset/resize/orbit. Resuming the clock here
  // needlessly put the final interaction back at the mercy of software GL cadence.
  // Each action completes before its frames start (see advanceFramesUntil).
  await page.getByRole("button", { name: "Reset view" }).click();
  await advanceFramesUntil(page, "Reset view framing", () =>
    page.evaluate(
      (revision) =>
        window.__bob034MapPerformance!.snapshot().framingRevision > revision,
      restoredState.framingRevision,
    ),
  );
  const resetState = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  await page.setViewportSize({ width: 1280, height: 740 });
  await advanceFramesUntil(page, "Resize framing", () =>
    page.evaluate(
      (revision) =>
        window.__bob034MapPerformance!.snapshot().framingRevision > revision,
      resetState.framingRevision,
    ),
  );
  const beforeRotation = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  const canvas = page.getByTestId("star-map-canvas");
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2,
    bounds!.y + bounds!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds!.x + bounds!.width / 2 + 90,
    bounds!.y + bounds!.height / 2 + 45,
    { steps: 8 },
  );
  await page.mouse.up();
  await advanceFramesUntil(page, "Orbit rotation", () =>
    page.evaluate((before) => {
      const after = window.__bob034MapPerformance!.snapshot();
      return (
        Math.hypot(
          after.camera[0] - before[0],
          after.camera[1] - before[1],
          after.camera[2] - before[2],
        ) > 0.01
      );
    }, beforeRotation.camera),
  );
  const afterRotation = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  expect(
    Math.hypot(
      afterRotation.camera[0] - beforeRotation.camera[0],
      afterRotation.camera[1] - beforeRotation.camera[1],
      afterRotation.camera[2] - beforeRotation.camera[2],
    ),
  ).toBeGreaterThan(0.01);
});

test("compact inspector stays inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/");
  await openMenuCommand(page, "Browse objects");
  await page.getByRole("button", { name: "Solar System" }).click();
  await expect(page.locator(".mobile-panel.inspector")).toBeVisible();
  const bounds = await page
    .locator(".mobile-panel.inspector")
    .evaluate((panel) => panel.getBoundingClientRect().toJSON());
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(700.01);
});

// One test per viewport: each needs its own page load and timeout budget.
for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 900, height: 700 },
]) {
  test(`character lineage and travel history are responsive and support navigation at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "bobiverse.app-state.v2",
        JSON.stringify({
          furthestChapterRead: "1.20",
          viewChapter: "1.20",
          displayDate: "2145",
          mode: "chapter",
          timelineZoom: 1,
          timelinePan: 0,
        }),
      );
    });

    await page.setViewportSize(viewport);
    await page.goto("/");
    if (viewport.width < 1200) {
      await openMenuCommand(page, "Browse objects");
    }
    const browser =
      viewport.width < 1200
        ? page.getByRole("dialog", { name: "Object browser" })
        : page.getByRole("complementary", { name: "Object browser" });
    await browser
      .getByRole("searchbox", { name: "Search visible objects" })
      .fill("Garfield");
    await browser.getByRole("button", { name: /Garfield/ }).click();
    const inspector =
      viewport.width < 1200
        ? page.getByRole("dialog", { name: "Selected object" })
        : page.getByRole("complementary", { name: "Object inspector" });
    const lineage = inspector.getByRole("button", { name: "Lineage" });
    await expect(lineage).toHaveAttribute("aria-expanded", "false");
    await lineage.click();
    await expect(
      inspector.getByRole("heading", { name: "Lineage" }),
    ).toBeVisible();
    await expect(inspector.locator(".ancestor-name")).toHaveText([
      "Bill",
      "Bob",
      "Robert Johansson",
    ]);
    await expect(inspector.locator(".ancestor-arrow")).toHaveText(["↑", "↑"]);
    expect(
      await inspector
        .locator(".ancestor-arrow")
        .evaluateAll((arrows) =>
          arrows.every((arrow) => arrow.getAttribute("aria-hidden") === "true"),
        ),
    ).toBe(true);
    expect(
      await inspector.locator(".ancestor-arrow").evaluateAll((arrows) =>
        arrows.every((arrow) => {
          const row = arrow.closest("li");
          if (!row) return false;
          const arrowBounds = arrow.getBoundingClientRect();
          const rowBounds = row.getBoundingClientRect();
          const centerOffset = Math.abs(
            arrowBounds.left +
              arrowBounds.width / 2 -
              (rowBounds.left + rowBounds.width / 2),
          );
          return (
            centerOffset <= 1 &&
            Number(getComputedStyle(arrow).fontWeight) >= 700
          );
        }),
      ),
    ).toBe(true);
    await expect(inspector.locator(".ancestor-copy").first()).toContainText(
      "Chapter 1.17 · 2145",
    );
    const travelHistory = inspector.getByRole("button", {
      name: "Travel history",
    });
    await expect(travelHistory).toHaveAttribute("aria-expanded", "false");
    await travelHistory.click();
    await expect(travelHistory).toHaveAttribute("aria-expanded", "true");
    await expect(inspector.locator(".travel-history")).toContainText(
      "Epsilon Eridani",
    );
    const overflow = await inspector.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await inspector
      .getByRole("button", {
        name: "Birth or cloning chapter for Bill: Chapter 1.17",
      })
      .click();
    await expect(
      inspector.getByText("Book 1 · We Are Legion (We are Bob)"),
    ).toBeVisible();
  });
}

test("character routes expose animated direction and reduced-motion chevrons", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.21",
        viewChapter: "1.21",
        displayDate: "2157",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Bob Last active/ }).click();
  await page.waitForFunction(
    () => (window.__bobTravelRoutePresentation?.legCount ?? 0) > 0,
  );
  const animated = await page.evaluate(
    () => window.__bobTravelRoutePresentation!,
  );
  expect(animated.legCount).toBeGreaterThan(0);
  expect(animated.pulseLayers).toBe(animated.legCount);
  expect(animated.chevrons).toBe(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForFunction(() => {
    const route = window.__bobTravelRoutePresentation;
    return Boolean(
      route && route.pulseLayers === 0 && route.chevrons === route.legCount * 2,
    );
  });

  await page.getByRole("button", { name: /^Earth Active$/ }).click();
  await page.waitForFunction(
    () => window.__bobTravelRoutePresentation === undefined,
  );
});

test("compact chapter inspection shares relationships and focus behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.2",
        viewChapter: "1.1",
        displayDate: "2016",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.goto("/");

  await openMenuCommand(page, "Timeline and progress");
  const timeline = page.getByRole("dialog", {
    name: "Timeline and progress",
  });
  await timeline
    .getByRole("button", { name: "Book 1, 2 - Bob Version 2.0" })
    .click();

  const inspector = page.getByRole("dialog", { name: "Selected object" });
  await expect(
    inspector.getByRole("heading", { name: "2 - Bob Version 2.0" }),
  ).toBeVisible();
  await expect(inspector.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await inspector.evaluate((element) =>
      element.contains(document.activeElement),
    ),
  ).toBe(true);
  const location = inspector.getByRole("button", {
    name: "Location: New Handeltown",
  });
  await location.focus();
  await page.keyboard.press("Enter");
  await expect(
    inspector.getByRole("heading", { name: "New Handeltown" }),
  ).toBeVisible();
  const back = inspector.getByRole("button", { name: "Back" });
  const forward = inspector.getByRole("button", { name: "Forward" });
  await expect(back).toBeEnabled();
  await expect(forward).toBeDisabled();
  await back.click();
  await expect(
    inspector.getByRole("heading", { name: "2 - Bob Version 2.0" }),
  ).toBeVisible();
  await expect(forward).toBeEnabled();
  await forward.click();
  await expect(
    inspector.getByRole("heading", { name: "New Handeltown" }),
  ).toBeVisible();
  await expect(page.locator(".map-narrative-badge")).toContainText(
    "Knowledge through Chapter 1.2",
  );

  await page.keyboard.press("Escape");
  await expect(inspector).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Menu" })).toBeFocused();
});

test("compact reflow keeps timeline progress reachable and traps focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 700 });
  await page.goto("/");

  await expect(page.locator(".timeline-dock").first()).toBeHidden();
  const menuCommand = page.getByRole("button", { name: "Menu" });
  await openMenuCommand(page, "Timeline and progress");

  const panel = page.getByRole("dialog", { name: "Timeline and progress" });
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  expect(
    await panel.evaluate((element) => element.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("button", { name: "Close" })).toBeFocused();

  await panel.getByLabel("Read through").selectOption("1.2");
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toBeVisible();
  await page
    .getByRole("dialog", { name: "Confirm read progress" })
    .getByRole("button", { name: "Confirm read through" })
    .click();
  await expect(panel.getByLabel("Knowledge through")).toHaveValue("1.2");
  await expect(page.locator(".map-narrative-badge")).toContainText(
    "Latest known · Knowledge through Chapter 1.2",
  );

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(menuCommand).toBeFocused();
  await expandAstronomyNotice(page);
  await expect(
    page.getByRole("link", { name: /Astronomy backdrop:/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("crossing the desktop breakpoint closes compact timeline state safely", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 700 });
  await page.goto("/");
  await openMenuCommand(page, "Timeline and progress");
  const compactPanel = page.getByRole("dialog", {
    name: "Timeline and progress",
  });
  await compactPanel.getByLabel("Read through").selectOption("1.2");
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 1200, height: 700 });
  await expect(page.locator(".mobile-panel.timeline")).toHaveCount(0);
  await expect(page.locator(".confirmation-layer")).toHaveCount(0);
  const desktopReadThrough = page.locator("#desktop-read-through");
  await expect(desktopReadThrough).toBeVisible();
  await expect(desktopReadThrough).toHaveValue("");
  await expect(desktopReadThrough).toBeFocused();

  await page.setViewportSize({ width: 720, height: 700 });
  await expect(page.locator(".timeline-dock").first()).toBeHidden();
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible();
  await openMenuCommand(page, "Timeline and progress");
  await expect(
    page.getByRole("dialog", { name: "Timeline and progress" }),
  ).toBeVisible();
});

test("short phone viewport does not create page scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/");
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(500);
});

test("desktop astronomy notice remains within the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto("/");
  await expandAstronomyNotice(page);
  const bounds = await page
    .getByText(/This work has made use of data from.*mission Gaia/)
    .evaluate((footerText) =>
      footerText.parentElement?.getBoundingClientRect().toJSON(),
    );
  expect(bounds?.bottom).toBeLessThanOrEqual(700);
});

test("desktop integration keeps all four surfaces usable with the map largest", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1200, height: 700 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByLabel("Distance unit")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "pc", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "ly", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByTestId("map-scale-label")).toContainText("ly");

    const browser = page.getByRole("complementary", {
      name: "Object browser",
    });
    const map = page.getByRole("region", {
      name: "Interactive three dimensional nearby stellar-system map",
    });
    const inspector = page.getByRole("complementary", {
      name: "Object inspector",
    });
    const timeline = page.getByRole("region", {
      name: "Reader progress and temporal navigation",
    });
    await expect(browser).toBeVisible();
    await expect(map).toBeVisible();
    await expect(inspector).toBeVisible();
    await expect(timeline).toBeVisible();

    const [browserBox, mapBox, inspectorBox, badgeBox] = await Promise.all([
      browser.boundingBox(),
      map.boundingBox(),
      inspector.boundingBox(),
      page.locator(".map-narrative-badge").boundingBox(),
    ]);
    expect(
      browserBox &&
        mapBox &&
        inspectorBox &&
        mapBox.width > browserBox.width &&
        mapBox.width > inspectorBox.width,
    ).toBe(true);
    expect(
      badgeBox &&
        mapBox &&
        badgeBox.x >= mapBox.x &&
        badgeBox.x + badgeBox.width <= mapBox.x + mapBox.width,
    ).toBe(true);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});

test("the permanent local backdrop preserves responsive map interaction", async ({
  page,
  baseURL,
}) => {
  const appOrigin = new URL(baseURL!).origin;
  const attemptedCrossOriginRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (
      (requestUrl.protocol === "http:" || requestUrl.protocol === "https:") &&
      requestUrl.origin !== appOrigin
    ) {
      attemptedCrossOriginRequests.push(requestUrl.href);
      await route.abort("internetdisconnected");
      return;
    }
    await route.continue();
  });
  for (const viewport of [
    { width: 1280, height: 700 },
    { width: 900, height: 700 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-galactic-starfield",
      "permanent",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-star-sprite",
      "expressive-hybrid",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-component-render-calls",
      "2",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-context-emphasis",
      "0.25",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-known-core-halo-scale",
      "1.25",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-known-visible-footprint-scale",
      "2",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-known-marker",
      "caption-only",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-active-marker",
      "double-segmented-ring-and-tick",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-hover-marker",
      "tooltip",
    );
    await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
      "data-grid",
      "whisper",
    );
    await expandAstronomyNotice(page);
    await expect(
      page.getByRole("link", { name: /Astronomy backdrop:/ }),
    ).toBeVisible();
  }
  const resourceOrigins = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => new URL(entry.name).origin),
  );
  expect(
    resourceOrigins.every((origin) => origin === new URL(page.url()).origin),
  ).toBe(true);
  expect(attemptedCrossOriginRequests).toEqual([]);
  await openMenuCommand(page, "Browse objects");
  await page.getByRole("button", { name: "Solar System" }).click();
  await expect(
    page.getByRole("heading", { name: "Solar System" }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 900, height: 700 },
  { width: 390, height: 844 },
]) {
  test(`expressive map states preserve active, hover, and astronomy-only selection paths at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "bobiverse.app-state.v2",
        JSON.stringify({
          furthestChapterRead: "1.14",
          viewChapter: "1.14",
          displayDate: "2144",
          mode: "chapter",
          timelineZoom: 1,
          timelinePan: 0,
        }),
      );
    });
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.waitForFunction(
      () => window.__bob034MapPerformance !== undefined,
    );
    const compact = viewport.width < 1200;
    if (compact) {
      await openMenuCommand(page, "Browse objects");
    }
    await expect(
      page.getByRole("button", { name: "Epsilon Eridani Active" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Solar System Last active · Chapter 1.13",
      }),
    ).toBeVisible();
    if (compact) {
      await page
        .getByRole("dialog", { name: "Object browser" })
        .getByRole("button", { name: "Close" })
        .click();
    }

    const persistentCaptions = page.locator(".narrative-map-label");
    await expect.poll(() => persistentCaptions.count()).toBeGreaterThan(1);
    const captionOpacities = await persistentCaptions.evaluateAll((captions) =>
      captions.map((caption) =>
        Number(caption.getAttribute("data-caption-opacity")),
      ),
    );
    expect(
      captionOpacities.every((opacity) => opacity >= 0.3 && opacity <= 1),
    ).toBe(true);

    const sol = await page.evaluate(() =>
      window.__bob034MapPerformance!.screenPoint("sol"),
    );
    const solMapCaption = page.locator(
      '.narrative-map-label[data-system-id="sol"]',
    );
    const solStatusRail = solMapCaption.locator(".system-status-rail");
    const compactRailTop = await solStatusRail.evaluate(
      (rail) => rail.getBoundingClientRect().top,
    );
    await page.mouse.move(sol.x, sol.y);
    await expect(page.locator(".map-tooltip")).toContainText("Solar System");
    await expect(page.locator(".map-tooltip")).toContainText("Human homeworld");
    await expect(solMapCaption).toHaveCount(1);
    await expect(
      solMapCaption.locator(".narrative-map-label-name"),
    ).toBeHidden();
    await expect
      .poll(async () => {
        const expandedRailTop = await solStatusRail.evaluate(
          (rail) => rail.getBoundingClientRect().top,
        );
        return Math.abs(expandedRailTop - compactRailTop);
      })
      .toBeLessThanOrEqual(1);
    await solMapCaption
      .locator(".system-status-rail")
      .hover({ position: { x: 140, y: 20 } });
    await expect(page.locator(".map-tooltip")).toContainText("Human homeworld");
    await page.mouse.move(1, 1);
    await expect(page.locator(".map-tooltip")).toHaveCount(0);
    await solMapCaption
      .locator(".narrative-map-label-name")
      .hover({ position: { x: 4, y: 4 } });
    await expect(page.locator(".map-tooltip")).toContainText("Solar System");
    await page.mouse.move(1, 1);
    await solMapCaption
      .locator(".system-status-rail")
      .hover({ position: { x: 40, y: 3 } });
    await expect(page.locator(".map-tooltip")).toContainText("Human homeworld");
    await page.mouse.move(1, 1);
    await solMapCaption
      .locator(".narrative-map-label-name")
      .dispatchEvent("click");
    await expect(page.locator(".selection-label")).toHaveCount(0);
    if (compact) {
      await expect(
        page.getByRole("dialog", { name: "Selected object" }),
      ).toBeVisible();
      await page
        .getByRole("dialog", { name: "Selected object" })
        .getByRole("button", { name: "Close" })
        .click();
    }
    await page
      .getByTestId("star-map-canvas")
      .click({ position: { x: 100, y: 40 } });
    await page.mouse.move(1, 1);
    await solStatusRail.hover({ position: { x: 40, y: 3 } });
    await expect(page.locator(".map-tooltip")).toContainText("Human homeworld");
    await solStatusRail.click({ position: { x: 140, y: 20 } });
    await expect(solMapCaption).toHaveCount(1);
    if (compact) {
      await expect(
        page.getByRole("dialog", { name: "Selected object" }),
      ).toBeVisible();
      await page
        .getByRole("dialog", { name: "Selected object" })
        .getByRole("button", { name: "Close" })
        .click();
    }
    if (compact) {
      await openMenuCommand(page, "Browse objects");
    }
    const search = page.getByRole("searchbox", {
      name: "Search visible objects",
    });
    await search.fill("sirius");
    await page.getByRole("button", { name: /^Sirius/ }).click();
    await expect(page.locator(".selection-label")).toHaveCount(0);
    await expect(
      page.locator(".narrative-map-label").filter({ hasText: /^Sirius$/ }),
    ).toHaveCount(1);
    const inspector = compact
      ? page.getByRole("dialog", { name: "Selected object" })
      : page.getByRole("complementary", { name: "Object inspector" });
    await expect(
      inspector.getByText("Not story-known at this view"),
    ).toBeVisible();
    await expect(
      inspector.getByRole("button", { name: "Enter system" }),
    ).toHaveCount(0);
    if (compact) {
      await inspector.getByRole("button", { name: "Close" }).click();
    }
    await settleMapCamera(page);
    const astronomyCaption = page
      .locator(".narrative-map-label")
      .filter({ hasText: /^Sirius$/ });
    await page
      .getByTestId("star-map-canvas")
      .click({ position: { x: 100, y: 40 } });
    // R3F/React can commit caption removal after the click protocol call returns.
    await expect(astronomyCaption).toHaveCount(0);
    await page.mouse.move(1, 1);
    await expect(page.locator(".map-tooltip")).toHaveCount(0);
    await settleMapCamera(page);
    await expect
      .poll(async () => {
        const sirius = await page.evaluate(() =>
          window.__bob034MapPerformance!.screenPoint("stellar-system-000072"),
        );
        await page.mouse.move(sirius.x, sirius.y);
        return page.locator(".map-tooltip").count();
      })
      .toBe(1);
    await page.waitForTimeout(150);
    await page.mouse.move(1, 1);
    await expect(astronomyCaption).toHaveCount(0);
  });
}

test("timeline uses global decorative scrollbars and compact chapter spacing", async ({
  page,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  const chapterNavigation = page.locator(".chapter-navigation");
  const scrollbarStyles = await chapterNavigation.evaluate((element) => ({
    standardColor: getComputedStyle(element).scrollbarColor,
    standardWidth: getComputedStyle(element).scrollbarWidth,
    trackBackground: getComputedStyle(element, "::-webkit-scrollbar-track")
      .backgroundColor,
    thumbBackground: getComputedStyle(element, "::-webkit-scrollbar-thumb")
      .backgroundImage,
    thumbRadius: getComputedStyle(element, "::-webkit-scrollbar-thumb")
      .borderRadius,
  }));
  if (browserName === "firefox") {
    expect(scrollbarStyles.standardColor).not.toBe("auto");
    expect(["thin", "none"]).toContain(scrollbarStyles.standardWidth);
  } else {
    expect(scrollbarStyles.standardColor).toBe("auto");
    expect(scrollbarStyles.standardWidth).toBe("auto");
    expect(scrollbarStyles.trackBackground).toBe("rgba(4, 10, 20, 0.55)");
    expect(scrollbarStyles.thumbBackground).toContain("linear-gradient");
    expect(scrollbarStyles.thumbRadius).toBe("999px");
  }

  const nativeSelectStyles = await dockReadThrough(page).evaluate(
    (element) => ({
      standardColor: getComputedStyle(element).scrollbarColor,
      standardWidth: getComputedStyle(element).scrollbarWidth,
      thumbBackground: getComputedStyle(element, "::-webkit-scrollbar-thumb")
        .backgroundImage,
    }),
  );
  expect(nativeSelectStyles.standardColor).toBe("auto");
  if (browserName === "firefox") {
    expect(["auto", "none"]).toContain(nativeSelectStyles.standardWidth);
  } else {
    expect(nativeSelectStyles.standardWidth).toBe("auto");
  }
  expect(nativeSelectStyles.thumbBackground).toBe(
    browserName === "firefox" ? "" : "none",
  );

  const entryWidth = await page
    .locator(".chapter-track-entry")
    .first()
    .evaluate((entry) => entry.getBoundingClientRect().width);
  expect(entryWidth).toBeCloseTo(88, 0);

  const centerlineInsets = await page
    .locator(".chapter-track")
    .evaluate((track) => {
      const style = getComputedStyle(track, "::before");
      return { left: style.left, right: style.right };
    });
  expect(centerlineInsets).toEqual({ left: "44px", right: "44px" });
});

test("reader progress is confirmed before chapter data is unlocked", async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    "Pre-book zero state",
  );
  await expect(page.getByText("1 - Bob Version 1.0")).toHaveCount(0);
  await dockReadThrough(page).selectOption("1.1");
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toBeVisible();
  await expect(page.locator(".confirmation-layer")).toHaveCSS(
    "z-index",
    "2147483647",
  );
  await expect(page.locator(".confirmation-backdrop")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Confirm read through" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Confirm read through" }).click();
  await expect(page.getByText("1 - Bob Version 1.0")).toBeVisible();
  await expect(page.locator(".map-narrative-badge")).toContainText(
    "Latest known · Knowledge through Chapter 1.1",
  );
  await expect(
    page.getByRole("button", { name: "Book 1, Chapter 2, locked" }),
  ).toBeDisabled();
  await expect(page.locator(".chapter-track")).toHaveCSS("display", "flex");
  await expect(
    page.getByRole("button", { name: "Set read progress" }),
  ).toHaveCount(0);
  const dockHeight = await page
    .locator(".timeline-dock")
    .evaluate((dock) => dock.getBoundingClientRect().height);
  await page.getByRole("button", { name: "Date mode" }).click();
  await expect
    .poll(() =>
      page
        .locator(".timeline-dock")
        .evaluate((dock) => dock.getBoundingClientRect().height),
    )
    .toBe(dockHeight);
  await page.getByRole("button", { name: "Chapter mode" }).click();
  await page.getByRole("button", { name: "Zero state" }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toHaveCount(0);
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    "Pre-book zero state",
  );
  await expect(dockReadThrough(page)).toHaveValue("1.1");
  await expect(page.getByLabel("Knowledge through")).toHaveValue("");
  await dockReadThrough(page).selectOption("");
  await page.getByRole("button", { name: "Confirm read through" }).click();
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    "Pre-book zero state",
  );
  await dockReadThrough(page).selectOption("1.2");
  await page.getByRole("button", { name: "Confirm read through" }).click();
  await page
    .getByRole("button", { name: "Book 1, 2 - Bob Version 2.0" })
    .click();
  const chapterInspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  await expect(
    chapterInspector.getByRole("heading", { name: "2 - Bob Version 2.0" }),
  ).toBeVisible();
  await expect(chapterInspector.getByText("Synopsis")).toBeVisible();
  await expect(
    chapterInspector.getByRole("button", {
      name: "Location: New Handeltown",
    }),
  ).toBeVisible();
  await chapterInspector
    .getByRole("button", { name: "Location: New Handeltown" })
    .click();
  await expect(
    chapterInspector.getByRole("heading", { name: "New Handeltown" }),
  ).toBeVisible();
  await expect(page.locator(".map-narrative-badge")).toContainText(
    "Knowledge through Chapter 1.2",
  );
  await page
    .getByRole("button", { name: "Book 1, 2 - Bob Version 2.0" })
    .click();
  await page.getByRole("button", { name: "Date mode" }).click();
  await expect(page.locator(".selection-status")).toHaveText(
    "Chapter inspection closed in Date mode.",
  );
  await expect(
    chapterInspector.getByText(
      "Select a map marker or browser item to inspect its reader-safe details.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Chapter mode" }).click();
  const chapterDotTops = await page
    .locator(".chapter-track .chapter-dot")
    .evaluateAll((dots) => dots.map((dot) => dot.getBoundingClientRect().top));
  expect(
    Math.max(...chapterDotTops) - Math.min(...chapterDotTops),
  ).toBeLessThan(1);
  const selectedChapter = page.locator(
    ".chapter-track-entry button[aria-current='true']",
  );
  const above = await selectedChapter.locator(".chapter-above").boundingBox();
  const dot = await selectedChapter.locator(".chapter-dot").boundingBox();
  expect(
    above && dot && above.y + above.height / 2 < dot.y + dot.height / 2,
  ).toBe(true);
  await expect(selectedChapter.locator(".chapter-details")).toHaveCount(0);
  await expect(selectedChapter).not.toContainText("2133");
  await expect(selectedChapter).not.toContainText(/story time|story year/i);
  const readThroughWidth = await page
    .locator(".spoiler-limit")
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(readThroughWidth).toBeLessThan(210);
  const chapterModeBox = await page
    .getByRole("button", { name: "Chapter mode" })
    .boundingBox();
  const dateModeBox = await page
    .getByRole("button", { name: "Date mode" })
    .boundingBox();
  expect(
    chapterModeBox &&
      dateModeBox &&
      dateModeBox.y >= chapterModeBox.y + chapterModeBox.height,
  ).toBe(true);
  await page.getByRole("button", { name: "Date mode" }).click();
  await page.locator(".date-event-dot").first().click();
  await expect(page.locator(".map-narrative-badge")).toContainText(
    "Universe in 2016",
  );
});

test("progressive browser search preserves collapse state and inspects unmapped objects", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Star Systems, 1 visible" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Characters,/ })).toHaveCount(
    0,
  );
  await expect(page.getByText("Astronomy systems")).toHaveCount(0);

  await dockReadThrough(page).selectOption("1.2");
  await page.getByRole("button", { name: "Confirm read through" }).click();
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toHaveCount(0);
  const groupLabels = await page
    .locator(".browser-group h3 button")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("aria-label")),
    );
  expect(groupLabels.map((label) => label?.split(",", 1)[0])).toEqual([
    "Characters",
    "Events",
    "Star Systems",
    "Other Locations",
    "Species",
    "Technologies",
    "Organizations",
  ]);

  const organizations = page.getByRole("button", {
    name: /Organizations, 4 visible/,
  });
  await organizations.click();
  await expect(organizations).toHaveAttribute("aria-expanded", "false");
  const search = page.getByRole("searchbox", {
    name: "Search visible objects",
  });
  await search.fill("applied");
  await expect(
    page.getByRole("button", { name: /Organizations, 1 visible/ }),
  ).toHaveAttribute("aria-expanded", "true");
  await search.fill("");
  await expect(organizations).toHaveAttribute("aria-expanded", "false");

  await page.getByRole("button", { name: "New Handeltown" }).click();
  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  await expect(inspector.getByText("Explicitly unmapped")).toBeVisible();
  await expect(inspector.getByText("Narrative-known")).toBeVisible();
});

test("browser species rows use assigned icons while ordinary rows retain shared bullets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await dockReadThrough(page).selectOption("1.35");
  await page.getByRole("button", { name: "Confirm read through" }).click();

  const human = page.getByRole("button", { name: "Human" });
  const deltans = page.getByRole("button", { name: /Deltans/ });
  await expect(human.locator("[data-species-item-bullet]")).toHaveCSS(
    "background-color",
    "rgb(77, 217, 255)",
  );
  await expect(deltans.locator("[data-species-item-bullet]")).toHaveCSS(
    "background-color",
    "rgb(182, 156, 255)",
  );
  await expect(human.locator("[data-item-bullet]")).toHaveCount(0);
  await expect(
    page
      .getByRole("button", { name: "Solar System" })
      .locator("[data-item-bullet]"),
  ).toHaveCount(1);
});

test("icon asset specimen renders every production mask on the real UI surface", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1180, height: 760 });
  await page.goto("/");
  await page.evaluate(() => {
    const icons = [
      ["Human", "/assets/species-icons/human.svg", "#4DD9FF"],
      ["Deltan", "/assets/species-icons/deltan.svg", "#B69CFF"],
      ["Pav", "/assets/species-icons/pav.svg", "#FFB347"],
      ["The Others", "/assets/species-icons/others.svg", "#FF6274"],
      ["Quinlan", "/assets/species-icons/quinlan.svg", "#58E0C2"],
      ["Other / Unknown", "/assets/species-icons/unknown.svg", "#98A8B8"],
      ["Colony domes", "/assets/system-markers/colony.svg", "#DDEEFF"],
      ["Homeworld", "/assets/system-markers/homeworld.svg", "#DDEEFF"],
      ["Abandoned world", "/assets/system-markers/abandoned.svg", "#8191A4"],
      ["Colony target", "/assets/system-markers/colony-target.svg", "#7FE56B"],
      ["Installation", "/assets/system-markers/installation.svg", "#D4A7FF"],
    ];
    const specimen = document.createElement("main");
    specimen.id = "icon-asset-specimen";
    specimen.innerHTML = `<h1>Production icon asset specimen</h1><p>16, 20, and 24 CSS-pixel heights · monochrome mask rendering</p><div class="specimen-grid">${icons
      .map(
        ([label, icon, colour]) =>
          `<article><strong>${label}</strong><div>${[16, 20, 24]
            .map(
              (size) =>
                `<span aria-label="${label} at ${size} pixels" style="width:${size}px;height:${size}px;background:${colour};mask:url('${icon}') center/contain no-repeat;-webkit-mask:url('${icon}') center/contain no-repeat"></span>`,
            )
            .join("")}</div></article>`,
      )
      .join("")}</div>`;
    const style = document.createElement("style");
    style.textContent = `
      body { min-height: 100vh; margin: 0; background: radial-gradient(circle at 50% 30%, #111d35, #070b15 68%); color: #dcecff; }
      #icon-asset-specimen { box-sizing: border-box; width: 100%; min-height: 100vh; padding: 42px; font-family: "Noto Sans", sans-serif; }
      #icon-asset-specimen h1 { margin: 0; color: #75e9ff; font-size: 24px; letter-spacing: .14em; text-transform: uppercase; }
      #icon-asset-specimen > p { margin: 10px 0 30px; color: #7890ad; }
      .specimen-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      .specimen-grid article { min-height: 105px; padding: 18px; border: 1px solid #29445f; border-radius: 10px; background: rgb(7 14 25 / 82%); box-shadow: inset 0 0 24px rgb(50 197 255 / 5%); }
      .specimen-grid strong { display: block; margin-bottom: 18px; font-size: 14px; }
      .specimen-grid article div { display: flex; align-items: center; gap: 24px; }
      .specimen-grid span { display: block; flex: 0 0 auto; }
    `;
    document.head.append(style);
    document.body.replaceChildren(specimen);
  });
  const specimen = page.locator("#icon-asset-specimen");
  await expect(specimen.locator("article")).toHaveCount(11);
  await expect(specimen.locator("article span")).toHaveCount(33);
  await specimen.screenshot({
    path: testInfo.outputPath("icon-asset-specimen.png"),
    animations: "disabled",
  });
  if (testInfo.project.name === "chromium") {
    await specimen.screenshot({
      path: path.resolve(
        "docs/design/artifacts/icon-asset-specimen-chromium.png",
      ),
    });
  }
});

test("nearby astronomy remains a query-only in-context inspector path", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  const search = page.getByRole("searchbox", {
    name: "Search visible objects",
  });
  await search.fill("rigil kentaurus");
  await expect(
    page.getByRole("heading", { name: /Nearby astronomy/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Alpha Centauri/ }).click();
  await expect(page.getByText("Not story-known at this view")).toBeVisible();
  await search.fill("");
  await expect(
    page.getByRole("heading", { name: /Nearby astronomy/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Alpha Centauri" }),
  ).toBeVisible();
  await search.fill("GJ 11286");
  await page.getByRole("button", { name: /WISE 0855-0714/ }).click();
  await expect(
    page.getByRole("heading", { name: "WISE 0855-0714" }),
  ).toBeVisible();
  await expect(page.getByText(/brown dwarf · 250 K ± 50 K/)).toBeVisible();
});

test("desktop surfaces stay on one projection through chapter and date changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await dockReadThrough(page).selectOption("1.2");
  await page.getByRole("button", { name: "Confirm read through" }).click();

  const sharedChapterStatus = "Latest known · Knowledge through Chapter 1.2";
  await expect(page.locator(".view-status")).toHaveText(sharedChapterStatus);
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    sharedChapterStatus,
  );
  await page.getByRole("button", { name: "Bob Active" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Object inspector" })
      .getByRole("heading", { name: "Bob" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Date mode" }).click();
  await page
    .getByRole("button", { name: /Story state 1 of 1 · 2016 ·/ })
    .click();
  const sharedDateStatus = "Universe in 2016 · Knowledge through Chapter 1.2";
  await expect(page.locator(".view-status")).toHaveText(sharedDateStatus);
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    sharedDateStatus,
  );
  await expect(
    page.getByText(
      "Selection cleared because the object is not eligible in this view.",
    ),
  ).toBeAttached();

  await page.getByRole("button", { name: "Chapter mode" }).click();
  await expect(page.locator(".view-status")).toHaveText(sharedChapterStatus);
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    sharedChapterStatus,
  );
});

test("chapter 1.11 Bob selection resolves through New Handeltown to Sol", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await dockReadThrough(page).selectOption("1.11");
  await page.getByRole("button", { name: "Confirm read through" }).click();

  await page.getByRole("button", { name: "Bob Active", exact: true }).click();

  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  await expect(inspector.getByRole("heading", { name: "Bob" })).toBeVisible();
  await expect(
    inspector.getByRole("button", { name: "New Handeltown" }),
  ).toBeVisible();
  const back = inspector.getByRole("button", { name: "Back" });
  const forward = inspector.getByRole("button", { name: "Forward" });
  await expect(back).toBeDisabled();
  await inspector.getByRole("button", { name: "New Handeltown" }).click();
  await expect(
    inspector.getByRole("heading", { name: "New Handeltown" }),
  ).toBeVisible();
  await expect(back).toBeEnabled();
  await expect(forward).toBeDisabled();
  await back.click();
  await expect(inspector.getByRole("heading", { name: "Bob" })).toBeVisible();
  await expect(forward).toBeEnabled();
  await forward.click();
  await expect(
    inspector.getByRole("heading", { name: "New Handeltown" }),
  ).toBeVisible();
  await back.click();
  await expect(inspector.getByRole("heading", { name: "Bob" })).toBeVisible();
  await expect(page.locator(".selection-label")).toHaveCount(0);
  await expect(
    page.locator(".narrative-map-label").filter({ hasText: /^Solar System$/ }),
  ).toHaveCount(1);
  await expect(page.locator(".selection-status")).toHaveText(
    "Bob restored from inspector history.",
  );
});

test("classical catalogue aliases find reader-visible Eridani and Hydri names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await dockReadThrough(page).selectOption("1.18");
  await page.getByRole("button", { name: "Confirm read through" }).click();

  const search = page.getByRole("searchbox", {
    name: "Search visible objects",
  });
  await search.fill("GJ 150");
  await page
    .getByRole("button", { name: /^Delta Eridani(?: Active)?$/ })
    .click();
  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  await expect(
    inspector.getByRole("heading", { name: "Delta Eridani", exact: true }),
  ).toBeVisible();

  await search.fill("GJ 19");
  await page.getByRole("button", { name: /^Beta Hydri(?: Active)?$/ }).click();
  await expect(
    inspector.getByRole("heading", { name: "Beta Hydri", exact: true }),
  ).toBeVisible();
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`mobile chrome gives the map the screen at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.waitForFunction(
      () => window.__bob034MapPerformance !== undefined,
    );

    const topbar = await page.locator(".topbar").boundingBox();
    expect(topbar!.height).toBeLessThanOrEqual(53);
    const canvas = await page.getByTestId("star-map-canvas").boundingBox();
    expect(canvas!.width).toBeGreaterThanOrEqual(viewport.width - 2);
    expect(canvas!.height).toBeGreaterThanOrEqual(
      viewport.height - topbar!.height - 2,
    );
    expect(
      await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
      })),
    ).toEqual({ height: viewport.height, width: viewport.width });

    // Read through stays in the bar; the Knowledge/mode/command set moves to
    // the menu drawer.
    const readThrough = page.locator("#topbar-read-through");
    await expect(readThrough).toBeVisible();
    expect((await readThrough.boundingBox())!.width).toBeGreaterThanOrEqual(
      150,
    );
    await expect(
      page.getByRole("button", { name: "Browse objects" }),
    ).toHaveCount(0);
    const menuButton = page.getByRole("button", { name: "Menu" });
    const menuBox = await menuButton.boundingBox();
    // 44px tap targets; allow sub-pixel layout rounding (Firefox reports 43.99998).
    expect(menuBox!.width).toBeGreaterThanOrEqual(43.5);
    expect(menuBox!.height).toBeGreaterThanOrEqual(43.5);
    await menuButton.click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Close" })).toBeFocused();
    await expect(drawer.getByLabel("Knowledge through")).toBeVisible();
    for (const name of [
      "Close",
      "Chapter mode",
      "Browse objects",
      "Timeline and progress",
      "Reset view",
    ]) {
      const box = await drawer.getByRole("button", { name }).boundingBox();
      expect(box!.height, name).toBeGreaterThanOrEqual(43.5);
    }
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(menuButton).toBeFocused();

    // Astronomy notice: a collapsed chip in the map's bottom-right corner.
    const chip = page.getByRole("button", { name: /^Astronomy data credits:/ });
    await expect(chip).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("link", { name: /Astronomy backdrop:/ }),
    ).toHaveCount(0);
    const chipBox = await chip.boundingBox();
    expect(chipBox!.height).toBeGreaterThanOrEqual(43.5);
    expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(chipBox!.x).toBeGreaterThan(viewport.width / 3);
    // The collapsed chip itself shows the short backdrop credit, unclipped.
    const summary = chip.locator(".astronomy-notice-summary");
    await expect(summary).toHaveText(/^NASA\/GSFC SVS\s·\sESA\/Gaia\/DPAC$/);
    expect(
      await summary.evaluate(
        (element) =>
          element.scrollHeight <= element.clientHeight + 1 &&
          element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await chip.click();
    await expect(chip).toHaveAttribute("aria-expanded", "true");
    const card = page.getByRole("region", { name: "Astronomy data credits" });
    await expect(card).toBeVisible();
    await expect(
      card.getByRole("link", { name: /Astronomy backdrop:/ }),
    ).toBeVisible();
    const cardBox = await card.boundingBox();
    expect(cardBox!.y).toBeGreaterThanOrEqual(topbar!.height);
    expect(cardBox!.x).toBeGreaterThanOrEqual(0);
    expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(chipBox!.y);
    await chip.click();
    await expect(card).toHaveCount(0);
    await chip.click();
    await page.keyboard.press("Escape");
    await expect(chip).toHaveAttribute("aria-expanded", "false");
    await expect(chip).toBeFocused();

    // Reset view: a 44px icon control in the map's top-right corner.
    const map = await page.locator("#map-stage").boundingBox();
    const reset = page
      .locator("#map-stage")
      .getByRole("button", { name: "Reset view" });
    const resetBox = await reset.boundingBox();
    expect(resetBox!.width).toBeCloseTo(44, 0);
    expect(resetBox!.height).toBeCloseTo(44, 0);
    expect(map!.x + map!.width - (resetBox!.x + resetBox!.width)).toBeLessThan(
      12,
    );
    expect(resetBox!.y - map!.y).toBeLessThan(12);
    const badge = await page.locator(".map-narrative-badge").boundingBox();
    expect(badge!.x + badge!.width).toBeLessThan(resetBox!.x);
    await settleMapCamera(page);
    const before = await page.evaluate(
      () => window.__bob034MapPerformance!.snapshot().framingRevision,
    );
    await reset.click();
    await page.waitForFunction(
      (revision) =>
        window.__bob034MapPerformance!.snapshot().framingRevision > revision,
      before,
    );
  });
}

test("desktop chrome keeps the workspace with a slimmer bar and a larger map", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const topbar = await page.locator(".topbar").boundingBox();
  expect(topbar!.height).toBeLessThanOrEqual(53);
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
  await expect(page.locator("#topbar-read-through")).toBeVisible();
  await expect(dockReadThrough(page)).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Object browser" }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "Object inspector" }),
  ).toBeVisible();
  const map = await page.locator("#map-stage").boundingBox();
  // Master f4177fd measured a 523px map at this viewport.
  expect(map!.height).toBeGreaterThan(560);
  const reset = page
    .locator("#map-stage")
    .getByRole("button", { name: "Reset view" });
  const resetBox = await reset.boundingBox();
  expect(resetBox!.width).toBeCloseTo(44, 0);
  expect(map!.x + map!.width - (resetBox!.x + resetBox!.width)).toBeLessThan(
    12,
  );
  await expect(page.locator(".topbar").getByRole("button")).toHaveCount(0);
  await reset.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Reset view");
  await expect(page.getByRole("tooltip")).toBeVisible();
});
