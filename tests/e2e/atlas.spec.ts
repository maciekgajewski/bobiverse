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
  await page.getByRole("button", { name: "Browse objects" }).click();
  await page.getByRole("button", { name: "Solar System" }).click();
  await expect(
    page.getByRole("heading", { name: "Solar System" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "pc" }).click();
  await expect(page.getByTestId("map-scale-label")).toContainText("pc");
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

test("compact inspector stays inside the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Browse objects" }).click();
  await page.getByRole("button", { name: "Solar System" }).click();
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
    .getByText(/This work has made use of data from.*mission Gaia/)
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
  await page.getByRole("button", { name: "Browse objects" }).click();
  await page.getByRole("button", { name: "Solar System" }).click();
  await expect(
    page.getByRole("heading", { name: "Solar System" }),
  ).toBeVisible();
});

test("reader progress is confirmed before chapter data is unlocked", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    "Pre-book zero state",
  );
  await expect(page.getByText("1 - Bob Version 1.0")).toHaveCount(0);
  await page.getByLabel("Read through").selectOption("1.1");
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
    "Universe in 2016",
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
  await expect(page.getByLabel("Read through")).toHaveValue("1.1");
  await expect(page.getByLabel("Knowledge through")).toHaveValue("");
  await page.getByLabel("Read through").selectOption("");
  await page.getByRole("button", { name: "Confirm read through" }).click();
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    "Pre-book zero state",
  );
  await page.getByLabel("Read through").selectOption("1.2");
  await page.getByRole("button", { name: "Confirm read through" }).click();
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
  const details = await selectedChapter
    .locator(".chapter-details")
    .boundingBox();
  expect(
    above && dot && above.y + above.height / 2 < dot.y + dot.height / 2,
  ).toBe(true);
  expect(
    dot && details && dot.y + dot.height / 2 < details.y + details.height / 2,
  ).toBe(true);
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
  await page.getByRole("button", { name: "2016", exact: true }).click();
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

  await page.getByLabel("Read through").selectOption("1.2");
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
