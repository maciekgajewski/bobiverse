import { expect, test } from "@playwright/test";
import { EARTH_IMAGE_ALT, MOON_IMAGE_ALT } from "../../src/about-image";

// Earth's and the Moon's inspector headers show their public-domain NASA
// photographs from the pre-book zero state (BOB-20261115-446D62).
test("Earth and Moon info cards show their photographs and descriptions before the books", async ({
  page,
}) => {
  await page.addInitScript(() =>
    window.localStorage.setItem("bobiverse.whats-new.last-seen", "999.0.0"),
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".map-narrative-badge")).toHaveText(
    "Pre-book zero state",
  );
  const browser = page.getByRole("complementary", { name: "Object browser" });
  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  for (const [name, alt, src, description] of [
    ["Earth", EARTH_IMAGE_ALT, "/assets/earth-head.webp", "Mostly harmless."],
    ["Moon", MOON_IMAGE_ALT, "/assets/moon-head.webp", "Is a harsh mistress."],
  ] as const) {
    await browser
      .getByRole("searchbox", { name: "Search visible objects" })
      .fill(name);
    await browser
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .first()
      .click();
    await expect(
      inspector.getByRole("heading", { name, level: 2 }),
    ).toBeVisible();
    const image = inspector.locator("img.inspector-header-illustration");
    await expect(image).toHaveAttribute("src", src);
    await expect(image).toHaveAttribute("alt", alt);
    await expect
      .poll(() =>
        image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      )
      .toBe(66);
    await expect(inspector.getByText(description)).toBeVisible();
  }
});
