import { devices, expect, test, type Page } from "@playwright/test";
import { NEWEST_RELEASE_NOTES_VERSION } from "../../src/release-notes";

// Phone layout checks (BOB-20261115-HT8509): Maciej's Android Chrome lost the
// top bar after the auto-shown What's new sheet, and the sheet's last bullets
// ran under the browser's bottom bar.

const WHATS_NEW_KEY = "bobiverse.whats-new.last-seen";
const PHONES = [
  { name: "390x844", width: 390, height: 844 },
  { name: "Pixel 7 412x915", width: 412, height: 915 },
  { name: "small Android 360x800", width: 360, height: 800 },
] as const;

// A returning reader who has not seen the newest notes, so What's new opens by
// itself, as it did on Maciej's phone. Seeded once per test, so a reload sees
// the recorded version.
async function seedReturningReader(page: Page) {
  await page.addInitScript((key) => {
    if (window.sessionStorage.getItem("phone-seeded")) return;
    window.sessionStorage.setItem("phone-seeded", "1");
    window.localStorage.setItem(key, "0.0.1");
    window.localStorage.setItem(
      "bobiverse.app-state.v2",
      JSON.stringify({
        furthestChapterRead: "1.1",
        viewChapter: "1.1",
        displayDate: null,
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  }, WHATS_NEW_KEY);
}

async function seedSeenNotes(page: Page) {
  await page.addInitScript(
    ([key, version]) => window.localStorage.setItem(key, version),
    [WHATS_NEW_KEY, NEWEST_RELEASE_NOTES_VERSION] as const,
  );
}

async function expectTopBarOnScreen(page: Page) {
  const topbar = page.locator("header.topbar");
  await expect(topbar).toBeVisible();
  await expect
    .poll(async () => (await topbar.boundingBox())?.y ?? -1)
    .toBeCloseTo(0, 0);
  await expect(page.locator(".topbar h1")).toHaveText("Star Map");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  const box = (await menu.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 0.5);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
}

for (const phone of PHONES) {
  test.describe(`phone ${phone.name}`, () => {
    test.use({
      viewport: { width: phone.width, height: phone.height },
      hasTouch: true,
      // Firefox has no mobile emulation; it still gets the phone viewport.
      isMobile: async ({ browserName }, provide) =>
        provide(browserName !== "firefox"),
    });

    test("shows the top bar and a Menu with What's new and What is this?", async ({
      page,
    }) => {
      await seedSeenNotes(page);
      await page.goto("/");
      await expect(page.locator(".map-narrative-badge")).toBeVisible();
      await expectTopBarOnScreen(page);
      await page.getByRole("button", { name: "Menu" }).click();
      const drawer = page.getByRole("dialog", { name: "Menu" });
      for (const name of ["What\u2019s new", "What is this?"]) {
        const row = drawer.getByRole("button", { name });
        await row.scrollIntoViewIfNeeded();
        await expect(row).toBeVisible();
        await expect(row).toBeInViewport();
      }
    });

    test("keeps the top bar after the auto-shown What's new sheet", async ({
      page,
    }) => {
      await seedReturningReader(page);
      await page.goto("/");
      const dialog = page.getByRole("dialog", { name: "What\u2019s new" });
      await expect(dialog).toBeVisible();
      // Scroll the sheet's body all the way down and try to push past it.
      const body = dialog.locator(".about-body");
      await body.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.evaluate(() => window.scrollTo(0, 200));
      await dialog.getByRole("button", { name: "Close" }).click();
      await expect(dialog).toHaveCount(0);
      await expectTopBarOnScreen(page);
    });

    test("fits the What's new sheet so its last bullet scrolls into view", async ({
      page,
    }) => {
      await seedSeenNotes(page);
      await page.goto("/");
      await page.getByRole("button", { name: "Menu" }).click();
      await page
        .getByRole("dialog", { name: "Menu" })
        .getByRole("button", { name: "What\u2019s new" })
        .click();
      const dialog = page.getByRole("dialog", { name: "What\u2019s new" });
      await expect(dialog).toBeVisible();
      const viewport = page.viewportSize()!;
      const sheet = (await dialog.boundingBox())!;
      expect(sheet.y).toBeGreaterThanOrEqual(0);
      expect(sheet.y + sheet.height).toBeLessThanOrEqual(viewport.height + 0.5);
      const body = dialog.locator(".about-body");
      expect(
        await body.evaluate((element) => getComputedStyle(element).overflowY),
      ).toBe("auto");
      const last = dialog.getByRole("listitem").last();
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport({ ratio: 1 });
      const item = (await last.boundingBox())!;
      const bodyBox = (await body.boundingBox())!;
      expect(item.y + item.height).toBeLessThanOrEqual(
        Math.min(bodyBox.y + bodyBox.height, viewport.height) + 0.5,
      );
    });
  });
}

// Android Chrome's 100vh is the large viewport (address bar hidden), taller
// than the visible page while the bar shows. This stands in for it with an
// extra-tall body and checks that nothing can scroll the top bar away, even a
// wheel scroll chained out of the What's new sheet.
test("a large-viewport body cannot scroll the phone top bar away", async ({
  page,
}) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await seedReturningReader(page);
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "body { min-height: calc(100vh + 56px) !important; }";
      document.head.append(style);
    });
  });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "What\u2019s new" });
  await expect(dialog).toBeVisible();
  const sheet = (await dialog.boundingBox())!;
  await page.mouse.move(sheet.x + sheet.width / 2, sheet.y + sheet.height / 2);
  for (let step = 0; step < 8; step += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(50);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expectTopBarOnScreen(page);
});

test("What is this? in the release notes opens About", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSeenNotes(page);
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu" });
  await menu.click();
  await page
    .getByRole("dialog", { name: "Menu" })
    .getByRole("button", { name: "What\u2019s new" })
    .click();
  const whatsNew = page.getByRole("dialog", { name: "What\u2019s new" });
  const link = whatsNew
    .getByRole("listitem")
    .last()
    .getByRole("button", { name: "What is this?" });
  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(whatsNew).toHaveCount(0);
  const about = page.getByRole("dialog", { name: "What is this?" });
  await expect(about).toBeVisible();
  await about.getByRole("button", { name: "Close" }).click();
  await expect(about).toHaveCount(0);
  await expect(menu).toBeFocused();
});

// iPhone Safari scrolls a focused input into view when the keyboard opens.
// The top bar's snap-back must not fight that: the Search box stays in view
// and the top bar stays put.
test.describe("iPhone Search focus", () => {
  const iPhone = devices["iPhone 13"];
  test.use({
    viewport: iPhone.viewport,
    userAgent: iPhone.userAgent,
    deviceScaleFactor: iPhone.deviceScaleFactor,
    isMobile: async ({ browserName }, provide) =>
      provide(browserName !== "firefox"),
    hasTouch: true,
  });

  test("keeps the focused Search box and the top bar in view", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "webkit", "iPhone emulation runs in WebKit");
    await seedSeenNotes(page);
    await page.goto("/");
    await expect(page.locator(".map-narrative-badge")).toBeVisible();
    await page.evaluate(() => {
      (window as unknown as { __scrolls: number }).__scrolls = 0;
      window.addEventListener("scroll", () => {
        (window as unknown as { __scrolls: number }).__scrolls += 1;
      });
    });
    await page.getByRole("button", { name: "Search", exact: true }).tap();
    const search = page.getByRole("searchbox", {
      name: "Search visible objects",
    });
    await expect(search).toBeVisible();
    await search.focus();
    await expect(search).toBeFocused();
    await search.fill("alpha");
    await expect(search).toBeInViewport({ ratio: 1 });
    await expect(search).toBeFocused();
    await expectTopBarOnScreen(page);
    // Nothing scrolled the document, so the snap-back never ran.
    expect(
      await page.evaluate(
        () => (window as unknown as { __scrolls: number }).__scrolls,
      ),
    ).toBe(0);
  });
});
