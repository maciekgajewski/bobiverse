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
    page
      .getByRole("dialog", { name: "Selected object" })
      .getByRole("heading", { name: "Solar System" }),
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

test("guided system view drills down and browser Back restores the exact map", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const remoteSurfaceRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      request.resourceType() === "image" &&
      url.origin !== "http://127.0.0.1:5173"
    ) {
      remoteSurfaceRequests.push(request.url());
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Solar System" }).click();
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  const before = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  await page.getByRole("button", { name: "Enter system" }).click();
  await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
    "data-system-mode",
    "schematic",
  );
  const guided = page.getByRole("region", { name: "Visible system objects" });
  const solTarget = await guided
    .getByRole("button", { name: "Sol" })
    .evaluate((button) => button.getBoundingClientRect().toJSON());
  expect(solTarget.width).toBeGreaterThanOrEqual(44);
  expect(solTarget.height).toBeGreaterThanOrEqual(44);
  await guided.getByRole("button", { name: "Sol" }).click();
  await page.waitForFunction(() => {
    try {
      window.__bob034MapPerformance!.snapshot();
      return true;
    } catch {
      return false;
    }
  });
  const localBeforeGestures = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  const localCanvas = page.getByTestId("star-map-canvas");
  await localCanvas.dispatchEvent("pointerdown", {
    clientX: 260,
    clientY: 220,
    buttons: 1,
  });
  await localCanvas.dispatchEvent("pointermove", {
    clientX: 420,
    clientY: 310,
    buttons: 1,
  });
  await localCanvas.dispatchEvent("pointerup", {
    clientX: 420,
    clientY: 310,
    buttons: 0,
  });
  await localCanvas.dispatchEvent("wheel", { deltaY: 500 });
  await localCanvas.dispatchEvent("dblclick");
  expect(
    await page.evaluate(() => window.__bob034MapPerformance!.snapshot()),
  ).toEqual(localBeforeGestures);
  const breadcrumb = page.getByRole("navigation", {
    name: "System view breadcrumb",
  });
  for (const region of ["Asteroid Belt", "Kuiper Belt", "Oort Cloud"]) {
    await guided.getByRole("button", { name: region }).click();
    await expect(
      breadcrumb.getByRole("button", { name: region }),
    ).toBeVisible();
    await breadcrumb.getByRole("button", { name: "Sol", exact: true }).click();
  }
  await guided.getByRole("button", { name: "Earth" }).click();
  await guided.getByRole("button", { name: "Moon" }).click();
  await expect(
    breadcrumb.getByRole("button", { name: "Solar System" }),
  ).toBeVisible();
  await expect(
    breadcrumb.getByRole("button", { name: "Sol", exact: true }),
  ).toBeVisible();
  await expect(breadcrumb.getByRole("button", { name: "Earth" })).toBeVisible();
  await expect(breadcrumb.getByRole("button", { name: "Moon" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const returnBounds = await breadcrumb
    .getByRole("button", { name: "Return to map" })
    .evaluate((button) => button.getBoundingClientRect().toJSON());
  expect(returnBounds.height).toBeGreaterThanOrEqual(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);

  await page.goBack();
  await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
    "data-system-mode",
    "interstellar",
  );
  const after = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  expect(after).toEqual(before);
  await page.getByRole("button", { name: "Inspect selection" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Selected object" })
      .getByRole("heading", { name: "Solar System" }),
  ).toBeVisible();
  expect(remoteSurfaceRequests).toEqual([]);
});

test("normal-motion Return restores the captured map pose", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Solar System" }).click();
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  await page.waitForTimeout(900);
  const before = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  await page.getByRole("button", { name: "Enter system" }).click();
  await page.waitForTimeout(900);
  await page
    .getByRole("region", { name: "Visible system objects" })
    .getByRole("button", { name: "Sol" })
    .click();
  await page
    .getByRole("navigation", { name: "System view breadcrumb" })
    .getByRole("button", { name: "Return to map" })
    .click();
  await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
    "data-system-mode",
    "interstellar",
  );
  await page.waitForTimeout(900);
  expect(
    await page.evaluate(() => window.__bob034MapPerformance!.snapshot()),
  ).toEqual(before);
});

test("another-system active location exits and focuses its mapped system", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.14",
        viewChapter: "1.14",
        displayDate: "2144-08",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Solar System/ }).click();
  await page.getByRole("button", { name: "Enter system" }).click();
  const activeList = page.getByRole("region", {
    name: "Visible system objects",
  });
  await activeList
    .getByRole("button", { name: "Focus active location" })
    .click();
  await expect(page.getByTestId("star-map-canvas")).toHaveAttribute(
    "data-system-mode",
    "interstellar",
  );
  await page.waitForTimeout(300);
  const destination = await page.evaluate(() =>
    window.__bob034MapPerformance!.snapshot(),
  );
  expect(destination.target).toEqual([-2.0704846, -2.3949034, 0.5874979]);
});

test("simultaneous activity lists every mapped system without choosing a winner", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.18",
        viewChapter: "1.18",
        displayDate: "2145",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.goto("/");
  await page.getByRole("button", { name: /^Solar System/ }).click();
  await page.getByRole("button", { name: "Enter system" }).click();
  const list = page
    .getByRole("heading", { name: "Active locations" })
    .locator("..");
  await expect(list.getByRole("button")).toHaveText([
    /Beta Hydri/,
    /Delta Eridani/,
    /Epsilon Eridani/,
    /Solar System \/ Sol/,
  ]);
});

test("system controls reflow in a 200%-zoom-equivalent CSS viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 450 });
  await page.goto("/");
  await page.getByRole("button", { name: "Browse objects" }).click();
  await page.getByRole("button", { name: "Solar System" }).click();
  await page.getByRole("button", { name: "Enter system" }).click();
  const breadcrumb = page.getByRole("navigation", {
    name: "System view breadcrumb",
  });
  await expect(breadcrumb).toBeVisible();
  const bounds = await breadcrumb.evaluate((element) =>
    element.getBoundingClientRect().toJSON(),
  );
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(640.01);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("multiple-star fixture keeps each star's authored descendants separate", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/system-view.html");
  await expect(page.getByLabel("Projected fixture nodes")).toHaveText(
    "fixture a a-belt b b-belt",
  );
  await expect(page.getByText("Fixture A", { exact: true })).toBeVisible();
  await expect(page.getByText("Fixture B", { exact: true })).toBeVisible();
  await expect(page.getByText("A Belt", { exact: true })).toHaveCount(0);
  await expect(page.getByText("B Belt", { exact: true })).toHaveCount(0);

  await page.evaluate(() => window.__systemViewFixture!.focus("a"));
  await expect(page.getByText("A Belt", { exact: true })).toBeVisible();
  await expect(page.getByText("B Belt", { exact: true })).toHaveCount(0);

  await page.evaluate(() => window.__systemViewFixture!.focus("b"));
  await expect(page.getByText("B Belt", { exact: true })).toBeVisible();
  await expect(page.getByText("A Belt", { exact: true })).toHaveCount(0);
});

test("WebGL-unavailable system mode retains the guided DOM hierarchy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "WebGL unavailable" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Solar System" }).click();
  await page.getByRole("button", { name: "Enter system" }).click();
  await expect(
    page.getByRole("region", { name: "Visible system objects" }),
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Visible system objects" })
    .getByRole("button", { name: "Sol" })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "System view breadcrumb" })
      .getByRole("button", { name: "Sol", exact: true }),
  ).toBeVisible();
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

test("compact chapter inspection shares relationships and focus behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
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

  await page.getByRole("button", { name: "Timeline and progress" }).click();
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
  await expect(
    page.getByRole("button", { name: "Inspect selection" }),
  ).toBeFocused();
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

test("expressive map states preserve active, hover, and astronomy-only selection paths", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
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
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 900, height: 700 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.waitForFunction(
      () => window.__bob034MapPerformance !== undefined,
    );
    const compact = viewport.width < 1200;
    if (compact) {
      await page.getByRole("button", { name: "Browse objects" }).click();
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

    const sol = await page.evaluate(() =>
      window.__bob034MapPerformance!.screenPoint("sol"),
    );
    const solMapCaption = page
      .locator(".narrative-map-label")
      .filter({ hasText: /^Sol$/ });
    await expect(solMapCaption).toBeVisible();
    await page.mouse.move(sol.x, sol.y);
    await expect(page.locator(".map-tooltip")).toContainText("Sol");
    await expect(solMapCaption).toHaveCount(0);
    await page.mouse.move(1, 1);
    await expect(page.locator(".map-tooltip")).toHaveCount(0);
    await expect(solMapCaption).toBeVisible();
    await page.mouse.move(sol.x, sol.y);
    await expect(page.locator(".map-tooltip")).toContainText("Sol");
    await expect(solMapCaption).toHaveCount(0);
    await page.mouse.click(sol.x, sol.y);
    await expect(page.locator(".selection-label")).toHaveText("Sol");
    if (compact) {
      await expect(
        page.getByRole("dialog", { name: "Selected object" }),
      ).toBeVisible();
      await page
        .getByRole("dialog", { name: "Selected object" })
        .getByRole("button", { name: "Close" })
        .click();
    }
    const alphaCentauri = await page.evaluate(() =>
      window.__bob034MapPerformance!.screenPoint("stellar-system-005413"),
    );
    await page.mouse.click(alphaCentauri.x, alphaCentauri.y);
    await expect(page.locator(".selection-label")).toHaveText("Alpha Centauri");
    const inspector = compact
      ? page.getByRole("dialog", { name: "Selected object" })
      : page.getByRole("complementary", { name: "Object inspector" });
    await expect(
      inspector.getByText("Not story-known at this view"),
    ).toBeVisible();
  }
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

test("chapter 1.11 Bob selection resolves through New Handeltown to Sol", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("Read through").selectOption("1.11");
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
  await expect(page.locator(".selection-label")).toHaveText("Sol");
  await expect(page.locator(".selection-status")).toHaveText(
    "Bob restored from inspector history.",
  );
});
