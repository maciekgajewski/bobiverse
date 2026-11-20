import { expect, test, type Page } from "@playwright/test";

// In-app Back (BOB-20261116-ZBZF9F): browser Back and Forward walk the card
// stack and dialogs. Real Android Back and iOS swipe-back stay a manual
// check; page.goBack() / goForward() fire the same popstate.

const PROGRESS_KEY = "bobiverse.app-state.v2";
const EMPTY_INSPECTOR =
  "Select a map marker or browser item to inspect its reader-safe details.";

async function seed(page: Page, whatsNewSeen: string) {
  await page.addInitScript(
    ([key, seen]) => {
      if (window.sessionStorage.getItem("back-nav-seeded")) return;
      window.sessionStorage.setItem("back-nav-seeded", "1");
      window.localStorage.setItem("bobiverse.whats-new.last-seen", seen);
      window.localStorage.setItem(
        key,
        JSON.stringify({
          furthestChapterRead: "1.2",
          viewChapter: "1.2",
          displayDate: "2133-06-24",
          mode: "chapter",
          timelineZoom: 1,
          timelinePan: 0,
        }),
      );
    },
    [PROGRESS_KEY, whatsNewSeen] as const,
  );
}

const historyLength = (page: Page) =>
  page.evaluate(() => window.history.length);

async function openChapterFromBadge(page: Page, chapter: string) {
  const badge = page.locator(".map-narrative-badge");
  await expect(badge).toContainText(`As of Chapter ${chapter}`);
  await badge.getByRole("button", { name: `Chapter ${chapter}` }).click();
}

for (const layout of [
  { name: "desktop", width: 1440, height: 900, compact: false },
  { name: "phone", width: 390, height: 844, compact: true },
] as const) {
  test.describe(`${layout.name} ${layout.width}x${layout.height}`, () => {
    const inspector = (page: Page) =>
      layout.compact
        ? page.getByRole("dialog", { name: "Selected object" })
        : page.getByRole("complementary", { name: "Object inspector" });
    const expectCardClosed = async (page: Page) => {
      if (layout.compact) await expect(inspector(page)).toBeHidden();
      else await expect(inspector(page)).toContainText(EMPTY_INSPECTOR);
    };

    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({
        width: layout.width,
        height: layout.height,
      });
    });

    test("Back closes What's new, walks the cards, closes the card, then leaves; Forward restores one step", async ({
      page,
    }) => {
      // A page the reader used before opening the atlas. Firefox skips
      // history entries the user never interacted with, so it gets a click.
      await page.setContent("<button>Before the atlas</button>");
      await page.getByRole("button", { name: "Before the atlas" }).click();
      await seed(page, "0.0.1");
      await page.goto("/");
      const whatsNew = page.getByRole("dialog", { name: "What\u2019s new" });
      await expect(whatsNew).toBeVisible();
      // Browsers skip entries pushed before any user interaction, so the
      // reader touches the notes first, as a real reader would.
      await whatsNew.getByRole("heading", { name: "Version 0.9.0" }).click();
      await expect
        .poll(() => page.evaluate(() => window.history.state?.layer))
        .toBe("dialog");
      await page.goBack();
      await expect(whatsNew).toBeHidden();

      await openChapterFromBadge(page, "1.2");
      const card = inspector(page);
      await expect(
        card.getByRole("heading", { name: "Bob Version 2.0" }),
      ).toBeVisible();
      await card
        .getByRole("button", { name: "Location: New Handeltown" })
        .click();
      await expect(
        card.getByRole("heading", { name: "New Handeltown" }),
      ).toBeVisible();

      await page.goBack();
      await expect(
        card.getByRole("heading", { name: "Bob Version 2.0" }),
      ).toBeVisible();
      await page.goForward();
      await expect(
        card.getByRole("heading", { name: "New Handeltown" }),
      ).toBeVisible();
      await page.goBack();
      await expect(
        card.getByRole("heading", { name: "Bob Version 2.0" }),
      ).toBeVisible();
      await page.goBack();
      await expectCardClosed(page);

      // The base entry is the page itself; one more Back leaves the site.
      await page.goBack();
      await expect(page).toHaveURL("about:blank");
    });

    test("the stepper adds no entries and soft Back matches device Back", async ({
      page,
    }) => {
      await seed(page, "9.9.9");
      await page.goto("/");
      await openChapterFromBadge(page, "1.2");
      const card = inspector(page);
      await expect(card.locator(".chapter-seq-current")).toHaveText("1.2");
      const length = await historyLength(page);
      await card
        .getByRole("button", { name: "Previous chapter, Chapter 1.1" })
        .click();
      await expect(card.locator(".chapter-seq-current")).toHaveText("1.1");
      await card
        .getByRole("button", { name: "Next chapter, Chapter 1.2" })
        .click();
      await expect(card.locator(".chapter-seq-current")).toHaveText("1.2");
      expect(await historyLength(page)).toBe(length);

      await card
        .getByRole("button", { name: "Location: New Handeltown" })
        .click();
      await expect(
        card.getByRole("heading", { name: "New Handeltown" }),
      ).toBeVisible();
      expect(await historyLength(page)).toBe(length + 1);
      // Soft Back is history.back(): the same step as device Back.
      await card.getByRole("button", { name: "Back" }).click();
      await expect(
        card.getByRole("heading", { name: "Bob Version 2.0" }),
      ).toBeVisible();
      // Device Back at index 0 closes the card instead of stepping chapters.
      await page.goBack();
      await expectCardClosed(page);
    });
  });
}

test("desktop: a confirmed read-through clears the stack so Back and Forward cannot restore it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page, "9.9.9");
  await page.goto("/");
  const card = page.getByRole("complementary", { name: "Object inspector" });
  await openChapterFromBadge(page, "1.2");
  await card.getByRole("button", { name: "Location: New Handeltown" }).click();
  await expect(
    card.getByRole("heading", { name: "New Handeltown" }),
  ).toBeVisible();

  await page.locator("#desktop-read-through").selectOption("1.1");
  await page.getByRole("button", { name: "Confirm read through" }).click();
  await expect(card).toContainText(EMPTY_INSPECTOR);
  await expect
    .poll(() => page.evaluate(() => window.history.state?.layer))
    .toBe("base");

  await page.goForward();
  await expect(card).toContainText(EMPTY_INSPECTOR);
  await expect(
    card.getByRole("heading", { name: "New Handeltown" }),
  ).toHaveCount(0);
  const saved = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key)!),
    PROGRESS_KEY,
  );
  expect(saved).toMatchObject({ furthestChapterRead: "1.1" });
});
