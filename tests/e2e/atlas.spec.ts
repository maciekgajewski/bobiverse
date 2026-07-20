import { expect, test } from "@playwright/test";

test("directory selection, unit switch, and measurement survive a phone-sized viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Alpha Centauri" }).click();
  await expect(
    page.getByRole("heading", { name: "Alpha Centauri" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Measure" }).click();
  await expect(page.getByText("Choose endpoint A")).toBeVisible();
  await page.getByRole("button", { name: "Sol" }).click();
  await expect(page.getByText("Choose endpoint B")).toBeVisible();
  await page.getByRole("button", { name: "Barnard's Star" }).click();
  await expect(page.getByLabel("Measured separation")).toContainText(
    "ly straight-line separation",
  );
  await page.getByRole("button", { name: "pc" }).click();
  await expect(page.getByLabel("Measured separation")).toContainText(
    "pc straight-line separation",
  );
});
