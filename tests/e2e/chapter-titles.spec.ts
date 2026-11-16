import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { NEWEST_RELEASE_NOTES_VERSION } from "../../src/release-notes";

// Chapter titles (BOB-20261116-35B47D). Real data has no long titles, so the
// dev server's chapter modules for 1.60 and 1.61 are rewritten in flight with
// obviously fake fixture titles. Nothing under data/ changes.

const PROGRESS_KEY = "bobiverse.app-state.v2";
const LONG_TITLE =
  "Fixture Title Alpha With An Extremely Long Name That Never Fits On A Phone Screen";
const FUTURE_TITLE = "Fixture Title Future";
// Screenshots only when asked for (review evidence), never into the repo.
const SHOT_DIR = process.env.CHAPTER_TITLE_SHOTS_DIR ?? "";
if (SHOT_DIR) mkdirSync(SHOT_DIR, { recursive: true });

async function shot(page: Page, name: string) {
  if (!SHOT_DIR) return;
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: false });
}

async function withFixtureTitles(page: Page) {
  const titles: Record<string, string> = {
    "60": `60 - ${LONG_TITLE}`,
    "61": `61 - ${FUTURE_TITLE}`,
  };
  await page.route(
    /\/data\/narrative\/chapters\/1\/(60|61)\.json/,
    async (route) => {
      const response = await route.fetch();
      const local = /\/(60|61)\.json/.exec(route.request().url())![1]!;
      const body = await response.text();
      const rewritten = body.replace(
        `export const title = ${JSON.stringify(local)};`,
        `export const title = ${JSON.stringify(titles[local])};`,
      );
      expect(rewritten, "fixture title injected").not.toBe(body);
      await route.fulfill({ response, body: rewritten });
    },
  );
}

async function seed(page: Page, viewChapter: string, furthest: string) {
  await page.addInitScript(
    ([key, version, chapter, ceiling]) => {
      if (window.sessionStorage.getItem("chapter-titles-seeded")) return;
      window.sessionStorage.setItem("chapter-titles-seeded", "1");
      window.localStorage.setItem("bobiverse.whats-new.last-seen", version);
      window.localStorage.setItem(
        key,
        JSON.stringify({
          furthestChapterRead: ceiling,
          viewChapter: chapter,
          displayDate: null,
          mode: "chapter",
          timelineZoom: 1,
          timelinePan: 0,
        }),
      );
    },
    [
      PROGRESS_KEY,
      NEWEST_RELEASE_NOTES_VERSION,
      viewChapter,
      furthest,
    ] as const,
  );
}

/** The future chapter's title is nowhere in the DOM: text, attributes, aria. */
async function expectNoFutureTitle(page: Page) {
  expect(await page.content()).not.toContain(FUTURE_TITLE);
}

async function expectNoHorizontalOverflow(page: Page, width: number) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(width);
}

for (const layout of [
  { name: "phone", width: 390, height: 844, compact: true },
  { name: "desktop", width: 1440, height: 900, compact: false },
] as const) {
  test(`${layout.name} ${layout.width}x${layout.height}: long titles truncate and a future title never renders`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: layout.width, height: layout.height });
    await withFixtureTitles(page);
    await seed(page, "1.59", "1.60");
    await page.goto("/");

    // Latest-known badge: number-only for untitled 1.59.
    const badge = page.locator(".map-narrative-badge");
    await expect(badge).toContainText("Knowledge through Chapter 1.59");
    await expect(badge.locator(".chapter-link-title")).toHaveCount(0);
    await badge.getByRole("button", { name: "Chapter 1.59" }).click();
    const inspector = layout.compact
      ? page.getByRole("dialog", { name: "Selected object" })
      : page.getByRole("complementary", { name: "Object inspector" });
    await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.59");

    // Stepper next names the read chapter's title.
    const stepper = inspector.getByRole("navigation", { name: "Chapter" });
    const next = stepper.getByRole("button", {
      name: `Next chapter, Chapter 1.60 · ${LONG_TITLE}`,
    });
    await expect(next).toHaveAttribute(
      "title",
      `Next chapter, 1.60 · ${LONG_TITLE}`,
    );
    await expectNoFutureTitle(page);
    await next.click();
    await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.60");

    // The card heading keeps the stored title in full; the badge truncates.
    await expect(inspector.getByRole("heading", { level: 2 })).toHaveText(
      `60 - ${LONG_TITLE}`,
    );
    await expect(badge.locator(".chapter-link-title")).toHaveText(
      ` · ${LONG_TITLE}`,
    );
    const link = badge.locator(".chapter-link.titled .chapter-link-clamp");
    const metrics = await link.evaluate((element) => {
      const style = window.getComputedStyle(element);
      const box = element.getBoundingClientRect();
      const badgeElement = element.closest(".map-narrative-badge")!;
      const badgeStyle = window.getComputedStyle(badgeElement);
      return {
        truncated: element.scrollHeight > element.clientHeight + 1,
        lineClamp: style.getPropertyValue("-webkit-line-clamp"),
        lineHeight:
          parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5,
        height: box.height,
        right: box.right,
        badgeRight: badgeElement.getBoundingClientRect().right,
        badgeHeight: badgeElement.getBoundingClientRect().height,
        badgeLineHeight: parseFloat(badgeStyle.lineHeight),
      };
    });
    expect(metrics.lineClamp).toBe("1");
    expect(metrics.truncated).toBe(true);
    // One line: the clamp ellipsizes the rest of the title.
    expect(metrics.height).toBeLessThan(2 * metrics.lineHeight);
    // Two lines at most: the badge text, then the ellipsized link.
    expect(metrics.badgeHeight).toBeLessThanOrEqual(
      2 * metrics.badgeLineHeight + 12,
    );
    expect(metrics.right).toBeLessThanOrEqual(metrics.badgeRight + 0.5);
    expect(metrics.right).toBeLessThanOrEqual(layout.width);
    await expect(
      badge.getByRole("button", { name: `Chapter 1.60 · ${LONG_TITLE}` }),
    ).toHaveAttribute("title", `Chapter 1.60 · ${LONG_TITLE}`);
    await expect(
      stepper.getByRole("button", {
        name: "Next chapter, unavailable, at your read-through chapter",
      }),
    ).toBeDisabled();
    await expectNoHorizontalOverflow(page, layout.width);
    await expectNoFutureTitle(page);
    await shot(
      page,
      `${layout.name}-card-badge-${layout.width}x${layout.height}.png`,
    );

    // Read through picker: 1.60 titled, 1.61 (future) number-only.
    if (layout.compact) await page.keyboard.press("Escape");
    await page.locator("#topbar-read-through").click();
    const picker = page.getByRole("dialog", { name: "Read through" });
    await expect(
      picker.getByRole("radio", {
        name: `Book 1 · Chapter 60 · ${LONG_TITLE}`,
      }),
    ).toHaveAttribute("title", LONG_TITLE);
    const future = picker.getByRole("radio", { name: "Book 1 · Chapter 61" });
    await expect(future).not.toHaveAttribute("title");
    await future.scrollIntoViewIfNeeded();
    await expectNoFutureTitle(page);
    await shot(
      page,
      `${layout.name}-picker-${layout.width}x${layout.height}.png`,
    );
    await picker.getByRole("button", { name: "Close" }).click();
    await expect(picker).toHaveCount(0);

    if (!layout.compact) {
      // Desktop dock: the Knowledge through selector and the timeline track.
      const knowledge = page.locator("#desktop-knowledge-through");
      await expect(knowledge.locator('option[value="1.60"]')).toHaveAttribute(
        "title",
        `Chapter 1.60 · ${LONG_TITLE}`,
      );
      expect(
        await knowledge.locator('option[value="1.60"]').textContent(),
      ).toMatch(/^Chapter 1\.60 · Fixture Title Alpha.*…$/);
      const entry = page.locator(
        '.chapter-track [data-chapter="1.60"] .chapter-above',
      );
      await expect(entry).toHaveClass(/titled/);
      await entry.scrollIntoViewIfNeeded();
      await expect(
        page.locator('.chapter-track [data-chapter="1.61"]'),
      ).toHaveAccessibleName("Book 1, Chapter 61, locked");
      await expectNoFutureTitle(page);
      await shot(page, `desktop-dock-${layout.width}x${layout.height}.png`);

      // An entity card's last-active line: a lead of 1.60 is active there.
      await inspector.getByRole("button", { name: "Khan" }).first().click();
      const recency = inspector.locator(".chapter-link.titled");
      await expect(recency).toHaveAccessibleName(
        `Chapter 1.60 · ${LONG_TITLE}`,
      );
      expect(
        await recency
          .locator(".chapter-link-clamp")
          .evaluate(
            (element) => element.scrollHeight > element.clientHeight + 1,
          ),
      ).toBe(true);
      // The long link never widens the card: nothing overflows the panel.
      expect(
        await inspector.evaluate(
          (element) => element.scrollWidth <= element.clientWidth + 1,
        ),
      ).toBe(true);
      await expectNoFutureTitle(page);
      await shot(
        page,
        `desktop-entity-card-${layout.width}x${layout.height}.png`,
      );
    }
  });
}

test("phone 390x844: book 1 source titles show for read chapters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, "1.2", "1.2");
  await page.goto("/");
  const badge = page.locator(".map-narrative-badge");
  await expect(
    badge.getByRole("button", { name: "Chapter 1.2 · Bob Version 2.0" }),
  ).toBeVisible();
  await badge.getByRole("button", { name: /^Chapter 1\.2/ }).click();
  const sheet = page.getByRole("dialog", { name: "Selected object" });
  await expect(sheet.locator(".chapter-seq-current")).toHaveText("1.2");
  await expect(
    sheet.getByRole("button", {
      name: "Previous chapter, Chapter 1.1 · Bob Version 1.0",
    }),
  ).toBeEnabled();
  await expectNoHorizontalOverflow(page, 390);
  await shot(page, "phone-book1-1.2-390x844.png");
});
