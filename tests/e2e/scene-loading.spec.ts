import { expect, test, type Route } from "@playwright/test";
import { NEWEST_RELEASE_NOTES_VERSION } from "../../src/release-notes";

// Scene asset loading must not hold up the rest of the app (BOB-20261120-Y9W13K).
// The starfield texture and the label font are held in flight, so the map scene
// is still loading while the reader opens and closes a dialog. Without Suspense
// boundaries inside <Canvas>, React Three Fiber rethrows the pending load to the
// app root and no app update commits until the assets arrive.

const STARFIELD = /galactic-starfield[^/]*\.avif/;
const FONT = /NotoSans-Regular[^/]*\.ttf/;

test("the app stays responsive while the map scene assets load", async ({
  page,
}) => {
  await page.addInitScript((version) => {
    window.localStorage.setItem("bobiverse.whats-new.last-seen", version);
  }, NEWEST_RELEASE_NOTES_VERSION);
  const held: Route[] = [];
  const seen = { starfield: false, font: false };
  let release = false;
  // Only the asset bytes are held; the dev server's `?import` URL modules are not.
  const hold = (key: keyof typeof seen) => async (route: Route) => {
    if (!["image", "fetch", "xhr"].includes(route.request().resourceType())) {
      await route.continue();
      return;
    }
    seen[key] = true;
    if (release) await route.continue();
    else held.push(route);
  };
  await page.route(STARFIELD, hold("starfield"));
  await page.route(FONT, hold("font"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("star-map-canvas")).toBeVisible();
  await expect.poll(() => seen.starfield && seen.font).toBe(true);

  const link = page
    .locator(".topbar-title")
    .getByRole("button", { name: "What\u2019s new" });
  await link.click();
  const dialog = page.getByRole("dialog", { name: /What.s new/ });
  await expect(dialog).toBeVisible({ timeout: 3000 });
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toHaveCount(0, { timeout: 3000 });
  await expect(link).toBeFocused({ timeout: 3000 });
  expect(held.length, "scene assets still loading").toBeGreaterThan(0);

  release = true;
  await Promise.all(held.splice(0).map((route) => route.continue()));
  await link.click();
  await expect(dialog).toBeVisible();
});
