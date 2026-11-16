import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { NEWEST_RELEASE_NOTES_VERSION } from "../../src/release-notes";

// A3 eyebrow stepper (BOB-20261115-DJKAGQ): ‹ 1.2 › on the chapter card
// changes Knowledge through via selectTimelineChapter and never Read through.

const PROGRESS_KEY = "bobiverse.app-state.v2";
const SHOT_DIR = path.join(import.meta.dirname, "../../stepper-shots");

mkdirSync(SHOT_DIR, { recursive: true });

async function seed(page: Page, viewChapter: string, furthest = "1.3") {
  await page.addInitScript(
    ([key, version, chapter, ceiling]) => {
      if (window.sessionStorage.getItem("chapter-stepper-seeded")) return;
      window.sessionStorage.setItem("chapter-stepper-seeded", "1");
      window.localStorage.setItem("bobiverse.whats-new.last-seen", version);
      window.localStorage.setItem(
        key,
        JSON.stringify({
          furthestChapterRead: ceiling,
          viewChapter: chapter,
          displayDate: chapter === "1.1" ? "2016" : "2133-06-24",
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

async function openChapterFromBadge(
  page: Page,
  chapter: string,
  compact: boolean,
) {
  const badge = page.locator(".map-narrative-badge");
  await expect(badge).toContainText(`Knowledge through Chapter ${chapter}`);
  await badge.getByRole("button", { name: `Chapter ${chapter}` }).click();
  const inspector = compact
    ? page.getByRole("dialog", { name: "Selected object" })
    : page.getByRole("complementary", { name: "Object inspector" });
  await expect(inspector.locator(".chapter-seq-current")).toHaveText(chapter);
  return inspector;
}

test("desktop: the eyebrow stepper walks chapters up to Read through", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, "1.2");
  await page.goto("/");
  const inspector = await openChapterFromBadge(page, "1.2", false);
  const stepper = inspector.getByRole("navigation", { name: "Chapter" });
  await expect(stepper.locator(".chapter-seq-current")).toHaveText("1.2");
  await page.screenshot({
    path: path.join(SHOT_DIR, "desktop-middle-1440x900.png"),
    fullPage: false,
  });

  await stepper
    .getByRole("button", { name: "Next chapter, Chapter 1.3" })
    .click();
  await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.3");
  await expect(page.locator(".map-narrative-badge")).toContainText(
    "Knowledge through Chapter 1.3",
  );
  await expect(
    stepper.getByRole("button", {
      name: "Next chapter, unavailable, at your read-through chapter",
    }),
  ).toBeDisabled();
  await expect(stepper.locator(".chapter-seq-dot")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toHaveCount(0);
  expect(await savedProgress(page)).toMatchObject({
    furthestChapterRead: "1.3",
    viewChapter: "1.3",
  });
  await page.screenshot({
    path: path.join(SHOT_DIR, "desktop-limit-1440x900.png"),
    fullPage: false,
  });

  await stepper
    .getByRole("button", { name: "Previous chapter, Chapter 1.2" })
    .click();
  await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.2");
  await page.keyboard.press("[");
  await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.1");
  await expect(
    stepper.getByRole("button", {
      name: "Previous chapter, unavailable, first chapter",
    }),
  ).toBeDisabled();
  expect(await savedProgress(page)).toMatchObject({
    furthestChapterRead: "1.3",
    viewChapter: "1.1",
  });
  await page.screenshot({
    path: path.join(SHOT_DIR, "desktop-first-1440x900.png"),
    fullPage: false,
  });

  await page.keyboard.press("]");
  await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.2");
  await page.keyboard.press("]");
  await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.3");
  await page.keyboard.press("]");
  await expect(inspector.locator(".chapter-seq-current")).toHaveText("1.3");
  expect(await savedProgress(page)).toMatchObject({
    furthestChapterRead: "1.3",
    viewChapter: "1.3",
  });
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toHaveCount(0);
});

test("phone 390x844: the eyebrow stepper walks chapters up to Read through", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, "1.2");
  await page.goto("/");
  const sheet = await openChapterFromBadge(page, "1.2", true);
  const stepper = sheet.getByRole("navigation", { name: "Chapter" });
  await expect(stepper.locator(".chapter-seq-current")).toHaveText("1.2");
  await expect(stepper).toBeVisible();
  await page.screenshot({
    path: path.join(SHOT_DIR, "phone-middle-390x844.png"),
    fullPage: false,
  });

  await stepper
    .getByRole("button", { name: "Next chapter, Chapter 1.3" })
    .click();
  await expect(sheet.locator(".chapter-seq-current")).toHaveText("1.3");
  await expect(page.locator(".map-narrative-badge")).toContainText(
    "Knowledge through Chapter 1.3",
  );
  await expect(
    stepper.getByRole("button", {
      name: "Next chapter, unavailable, at your read-through chapter",
    }),
  ).toBeDisabled();
  await expect(stepper.locator(".chapter-seq-dot")).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Confirm read progress" }),
  ).toHaveCount(0);
  expect(await savedProgress(page)).toMatchObject({
    furthestChapterRead: "1.3",
    viewChapter: "1.3",
  });
  await page.screenshot({
    path: path.join(SHOT_DIR, "phone-limit-390x844.png"),
    fullPage: false,
  });

  await stepper
    .getByRole("button", { name: "Previous chapter, Chapter 1.2" })
    .click();
  await expect(sheet.locator(".chapter-seq-current")).toHaveText("1.2");
  await stepper
    .getByRole("button", { name: "Previous chapter, Chapter 1.1" })
    .click();
  await expect(sheet.locator(".chapter-seq-current")).toHaveText("1.1");
  await expect(
    stepper.getByRole("button", {
      name: "Previous chapter, unavailable, first chapter",
    }),
  ).toBeDisabled();
  expect(await savedProgress(page)).toMatchObject({
    furthestChapterRead: "1.3",
    viewChapter: "1.1",
  });
  await page.screenshot({
    path: path.join(SHOT_DIR, "phone-first-390x844.png"),
    fullPage: false,
  });
});
