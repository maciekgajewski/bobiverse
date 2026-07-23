import { expect, test } from "@playwright/test";

test("phone browser opens, selection opens inspector, and units remain available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page
      .getByTestId("star-map-canvas")
      .evaluate((canvas) => canvas.clientHeight),
  ).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Browse systems" }).click();
  await page.getByRole("button", { name: "Alpha Centauri" }).click();
  await expect(
    page.getByRole("heading", { name: "Alpha Centauri" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "pc" }).click();
  await expect(page.getByTestId("map-scale-label")).toContainText("pc");
});

test("empty map clicks clear inspection selection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Alpha Centauri" }).click();
  await page.getByTestId("star-map-canvas").click({ position: { x: 8, y: 8 } });
  await expect(
    page.getByText("Select a stellar system to inspect its catalogue facts."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Measure" })).toHaveCount(0);
});

test("compact inspector stays inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Browse systems" }).click();
  await page.getByRole("button", { name: "Alpha Centauri" }).click();
  await expect(page.locator(".mobile-panel.inspector")).toBeVisible();
  const bounds = await page
    .locator(".mobile-panel.inspector")
    .evaluate((panel) => panel.getBoundingClientRect().toJSON());
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(700);
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

test("desktop footer remains within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto("/");
  const bounds = await page
    .getByText(/This project uses the VizieR catalogue access tool/)
    .evaluate((footerText) =>
      footerText.parentElement?.getBoundingClientRect().toJSON(),
    );
  expect(bounds?.bottom).toBeLessThanOrEqual(700);
});

test("the permanent local backdrop preserves responsive map interaction", async ({
  page,
}) => {
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
  await page.getByRole("button", { name: "Browse systems" }).click();
  await page.getByRole("button", { name: "Alpha Centauri" }).click();
  await expect(
    page.getByRole("heading", { name: "Alpha Centauri" }),
  ).toBeVisible();
});
