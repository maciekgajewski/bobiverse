import { expect, test, type Page } from "@playwright/test";
import { NEWEST_RELEASE_NOTES_VERSION } from "../../src/release-notes";

// Chapter links (BOB-20261115-446D62): the map badge's knowledge chapter and
// an info card's "Active / Last active in Chapter X" open that chapter's info
// card, without ever moving Read through.

const PROGRESS_KEY = "bobiverse.app-state.v2";

async function seed(page: Page, viewChapter: string) {
  await page.addInitScript(
    ([key, version, chapter]) => {
      if (window.sessionStorage.getItem("chapter-links-seeded")) return;
      window.sessionStorage.setItem("chapter-links-seeded", "1");
      window.localStorage.setItem("bobiverse.whats-new.last-seen", version);
      window.localStorage.setItem(
        key,
        JSON.stringify({
          furthestChapterRead: "1.20",
          viewChapter: chapter,
          displayDate: "2145",
          mode: "chapter",
          timelineZoom: 1,
          timelinePan: 0,
        }),
      );
    },
    [PROGRESS_KEY, NEWEST_RELEASE_NOTES_VERSION, viewChapter] as const,
  );
}

async function savedProgress(page: Page) {
  return page.evaluate(
    (key) =>
      JSON.parse(window.localStorage.getItem(key)!) as {
        furthestChapterRead: string;
        viewChapter: string;
      },
    PROGRESS_KEY,
  );
}

test("desktop: the badge and an info card's recency chapter open chapter cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, "1.20");
  await page.goto("/");
  const badge = page.locator(".map-narrative-badge");
  await expect(badge).toHaveText(
    "Latest known · Knowledge through Chapter 1.20",
  );
  const badgeLink = badge.getByRole("button", { name: "Chapter 1.20" });
  await badgeLink.focus();
  await expect(badgeLink).toBeFocused();
  await badgeLink.press("Enter");
  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  await expect(inspector.locator(".chapter-title-label")).toHaveText("Chapter");

  await page
    .getByRole("complementary", { name: "Object browser" })
    .getByRole("searchbox", { name: "Search visible objects" })
    .fill("Garfield");
  await page
    .getByRole("complementary", { name: "Object browser" })
    .getByRole("button", { name: /Garfield/ })
    .click();
  await expect(
    inspector.getByRole("heading", { name: "Garfield" }),
  ).toBeVisible();
  await expect(inspector.getByText("Narrative-known")).toHaveCount(0);
  const recency = inspector.locator(".recency-context");
  await expect(recency).toHaveText(/^(Last active|Active) in Chapter 1\.\d+/);
  const link = recency.getByRole("button", { name: /^Chapter 1\.\d+$/ });
  const chapter = (await link.textContent())!.replace("Chapter ", "");
  await link.click();
  await expect(inspector.locator(".chapter-title-label")).toHaveText("Chapter");
  await expect(badge).toHaveText(
    `Latest known · Knowledge through Chapter ${chapter}`,
  );
  expect(await savedProgress(page)).toMatchObject({
    furthestChapterRead: "1.20",
    viewChapter: chapter,
  });
});

for (const [width, height] of [
  [360, 800],
  [390, 844],
  [412, 915],
] as const) {
  test(`phone ${width}x${height}: the badge link fits beside Search and Reset view and opens the chapter`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await seed(page, "1.18");
    await page.goto("/");
    const badge = page.locator(".map-narrative-badge");
    const search = page.locator(".search-pill");
    const reset = page.getByRole("button", { name: "Reset view" });
    const link = badge.getByRole("button", { name: "Chapter 1.18" });
    for (const element of [badge, search, reset, link]) {
      await expect(element).toBeVisible();
      await expect(element).toBeInViewport({ ratio: 1 });
    }
    const [b, s, r] = await Promise.all(
      [badge, search, reset].map(
        async (element) => (await element.boundingBox())!,
      ),
    );
    expect(b.x + b.width).toBeLessThanOrEqual(s.x + 0.5);
    expect(s.x + s.width).toBeLessThanOrEqual(r.x + 0.5);
    // The chapter number is not clipped by the two-line clamp.
    const l = (await link.boundingBox())!;
    expect(l.y + l.height).toBeLessThanOrEqual(b.y + b.height + 0.5);
    expect(l.x + l.width).toBeLessThanOrEqual(b.x + b.width + 0.5);

    await link.click();
    const sheet = page.getByRole("dialog", { name: "Selected object" });
    await expect(sheet.locator(".chapter-title-label")).toHaveText("Chapter");
    expect(await savedProgress(page)).toMatchObject({
      furthestChapterRead: "1.20",
      viewChapter: "1.18",
    });
  });
}
