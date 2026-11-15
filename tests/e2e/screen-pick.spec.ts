import { expect, test, type Page } from "@playwright/test";
import { PICK_DRAG_THRESHOLD_PX } from "../../src/domain/star-picking";

const WISE_COMPONENT = "stellar-component-000138";
const SOL_COMPONENT = "stellar-component-sol";

async function settleMapCamera(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const bridge = window.__bob034MapPerformance!;
        const distance = (
          a: [number, number, number],
          b: [number, number, number],
        ) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
        let previous = bridge.snapshot();
        let stable = 0;
        const started = performance.now();
        const sample = () => {
          const current = bridge.snapshot();
          stable =
            distance(previous.camera, current.camera) < 1e-5 &&
            distance(previous.target, current.target) < 1e-5
              ? stable + 1
              : 0;
          previous = current;
          if (!current.cameraTransitionActive && stable >= 8) {
            resolve();
            return;
          }
          if (performance.now() - started > 6000) {
            reject(new Error("camera did not settle"));
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
}

async function openHomeMap(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await settleMapCamera(page);
}

function inspectorHeading(page: Page, name: string) {
  const sheet = page
    .getByRole("dialog", { name: "Selected object" })
    .getByRole("heading", { name, exact: true });
  const sidebar = page
    .getByRole("complementary", { name: "Object inspector" })
    .getByRole("heading", { name, exact: true });
  return sheet.or(sidebar);
}

async function captionPointAwayFromStars(page: Page): Promise<{
  x: number;
  y: number;
} | null> {
  return page.evaluate(async () => {
    const bridge = window.__bob034MapPerformance!;
    const label = document.querySelector<HTMLElement>(
      '.narrative-map-label[data-system-id="sol"]',
    );
    if (!label) return null;
    const box = label.getBoundingClientRect();
    const centres = bridge.fixture.componentIds.map((componentId) => {
      const radii = bridge.componentScreenRadii(componentId);
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const radius = Math.max(coarse ? 22 : 10, radii.pickRadiusPx);
      return { x: radii.x, y: radii.y, radius };
    });
    const step = 2;
    for (let y = box.top + 2; y <= box.bottom - 2; y += step) {
      for (let x = box.left + 2; x <= box.right - 2; x += step) {
        const clear = centres.every(
          (centre) => Math.hypot(centre.x - x, centre.y - y) > centre.radius,
        );
        if (clear) return { x, y };
      }
    }
    return null;
  });
}

test.describe("screen-space picking on a phone", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("tapping WISE 0855-0714 at the home view selects it, not Solar System", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await openHomeMap(page);
    const wise = await page.evaluate(
      (componentId) =>
        window.__bob034MapPerformance!.componentScreenRadii(componentId),
      WISE_COMPONENT,
    );
    await page.touchscreen.tap(wise.x, wise.y);
    await expect(inspectorHeading(page, "WISE 0855-0714")).toBeVisible();
    await expect(inspectorHeading(page, "Solar System")).toHaveCount(0);
  });

  test("tapping WISE 0855-0714 at the zoomed-out view selects it, not Solar System", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await openHomeMap(page);
    await page.evaluate(() =>
      window.__bob034MapPerformance!.setCameraDistance(45),
    );
    await settleMapCamera(page);
    const wise = await page.evaluate(
      (componentId) =>
        window.__bob034MapPerformance!.componentScreenRadii(componentId),
      WISE_COMPONENT,
    );
    await page.touchscreen.tap(wise.x, wise.y);
    await expect(inspectorHeading(page, "WISE 0855-0714")).toBeVisible();
    await expect(inspectorHeading(page, "Solar System")).toHaveCount(0);
  });

  test("tapping Sol's caption away from any star centre still selects Sol", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await openHomeMap(page);
    await expect(
      page.locator('.narrative-map-label[data-system-id="sol"]'),
    ).toBeVisible();
    const point = await captionPointAwayFromStars(page);
    expect(
      point,
      "Sol caption should have a point outside every pick radius",
    ).not.toBeNull();
    await page.touchscreen.tap(point!.x, point!.y);
    await expect(inspectorHeading(page, "Solar System")).toBeVisible();
  });
});

test.describe("screen-space picking with a mouse", () => {
  test("a drag over the threshold does not pick the star under the pointer", async ({
    page,
  }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openHomeMap(page);
    const canvas = page.getByTestId("star-map-canvas");
    await canvas.hover({ position: { x: 100, y: 40 } });
    for (let step = 0; step < 35; step += 1) {
      await page.mouse.wheel(0, -120);
    }
    await page.mouse.move(1, 1);
    await settleMapCamera(page);
    const sol = await page.evaluate(
      (componentId) =>
        window.__bob034MapPerformance!.componentScreenRadii(componentId),
      SOL_COMPONENT,
    );
    expect(
      await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.tagName,
        sol,
      ),
    ).toBe("CANVAS");
    await page.mouse.move(sol.x, sol.y);
    await page.mouse.down();
    await page.mouse.move(sol.x + PICK_DRAG_THRESHOLD_PX + 8, sol.y, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(inspectorHeading(page, "Solar System")).toHaveCount(0);
  });
});
