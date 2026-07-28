import { expect, test } from "@playwright/test";

test("phone browser opens, selection opens inspector, and light-years remain fixed", async ({
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
  await page
    .getByRole("dialog", { name: "Selected object" })
    .getByRole("button", { name: "Close" })
    .click();
  await expect(page.getByLabel("Distance unit")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "pc" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "ly" })).toHaveCount(0);
  await expect(page.getByTestId("map-scale-label")).toContainText("ly");
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
  expect(bounds.bottom).toBeLessThanOrEqual(700.01);
});

test("compact reflow keeps timeline progress reachable and traps focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 720, height: 700 });
  await page.goto("/");

  await expect(page.locator(".timeline-dock").first()).toBeHidden();
  const timelineCommand = page.getByRole("button", {
    name: "Timeline and progress",
  });
  await timelineCommand.click();

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
    "Universe in 2133 · Knowledge through Chapter 1.2",
  );

  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(timelineCommand).toBeFocused();
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
  await page.getByRole("button", { name: "Timeline and progress" }).click();
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
  const timelineCommand = page.getByRole("button", {
    name: "Timeline and progress",
  });
  await expect(timelineCommand).toBeVisible();
  await timelineCommand.click();
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
    await expect(page.getByRole("button", { name: "pc" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "ly" })).toHaveCount(0);
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
  test.slow();
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
  await page.getByLabel("Read through").selectOption("1.2");
  await page.getByRole("button", { name: "Confirm read through" }).click();

  const sharedChapterStatus =
    "Universe in 2133 · Knowledge through Chapter 1.2";
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
  await page.getByRole("button", { name: "2016", exact: true }).click();
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
