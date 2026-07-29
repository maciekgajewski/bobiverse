import os from "node:os";
import { expect, test, type Page } from "@playwright/test";

const samplesPerScenario = 10;
const maximumMedianMs = 100;
const maximumSampleMs = 150;
const chapterStatus = (chapter: string) =>
  `Knowledge through Chapter ${chapter}`;

function chapterButton(page: Page, chapter: string) {
  return page.locator(`.chapter-track-entry button[data-chapter="${chapter}"]`);
}

async function assertRendered(page: Page, chapter: string): Promise<void> {
  await expect(chapterButton(page, chapter)).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(page.locator(".map-narrative-badge")).toContainText(
    chapterStatus(chapter),
  );
}

async function assertSelectionRetained(page: Page): Promise<void> {
  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  await expect(
    inspector.getByRole("heading", { name: "Solar System" }),
  ).toBeVisible();
  await expect(page.locator(".selection-status")).not.toContainText(
    "Selection cleared",
  );
}

async function assertChapterInspected(
  page: Page,
  chapter: string,
): Promise<void> {
  const inspector = page.getByRole("complementary", {
    name: "Object inspector",
  });
  await expect(
    inspector.locator(`.chapter-inspector-details[data-chapter="${chapter}"]`),
  ).toBeVisible();
}

async function prepareSourceSelection(
  page: Page,
  selectedObjectExpected: boolean,
): Promise<void> {
  if (selectedObjectExpected) {
    await page
      .getByRole("button", { name: /^Solar System(?: Active)?$/ })
      .first()
      .click();
    await assertSelectionRetained(page);
    return;
  }
  await page
    .getByTestId("star-map-canvas")
    .click({ position: { x: 100, y: 40 } });
  await expect(
    page.getByText(
      "Select a map marker or browser item to inspect its reader-safe details.",
    ),
  ).toBeVisible();
}

async function transition(
  page: Page,
  chapter: string,
  selectedObjectExpected: boolean,
): Promise<number> {
  await prepareSourceSelection(page, selectedObjectExpected);
  const button = chapterButton(page, chapter);
  await button.evaluate((element, targetChapter) => {
    window.__bob029Duration = undefined;
    element.addEventListener(
      "click",
      () => {
        const start = performance.now();
        const finishWhenRendered = () => {
          const selected = element.getAttribute("aria-current") === "true";
          const badge = document.querySelector(".map-narrative-badge");
          if (
            selected &&
            badge?.textContent?.includes(
              `Knowledge through Chapter ${targetChapter}`,
            )
          ) {
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                window.__bob029Duration = performance.now() - start;
              }),
            );
            observer.disconnect();
          }
        };
        const observer = new MutationObserver(finishWhenRendered);
        observer.observe(document.body, {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true,
        });
      },
      { capture: true, once: true },
    );
  }, chapter);
  await button.click();
  await assertRendered(page, chapter);
  await assertChapterInspected(page, chapter);
  await page.waitForFunction(() => window.__bob029Duration !== undefined);
  return page.evaluate(() => window.__bob029Duration!);
}

async function loadPreparedState(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.11",
        viewChapter: "1.10",
        displayDate: "2133",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.goto("/");
  await assertRendered(page, "1.10");
}

async function warm(
  page: Page,
  selectedObjectExpected: boolean,
): Promise<void> {
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await transition(page, "1.11", selectedObjectExpected);
    await transition(page, "1.10", selectedObjectExpected);
  }
}

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return (sorted[4]! + sorted[5]!) / 2;
}

test("warmed production chapter transitions stay within budget", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);
  const cpu = os.cpus()[0]?.model ?? "unknown";
  const browserIdentity = `${browser.browserType().name()} ${browser.version()}`;
  const results: Array<{
    scenario: string;
    median: number;
    maximum: number;
  }> = [];

  for (const selectedObjectExpected of [false, true]) {
    await loadPreparedState(page);
    const bundleIdentity = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => new URL(entry.name).pathname)
        .filter((path) => path.startsWith("/assets/"))
        .sort()
        .join(","),
    );
    await warm(page, selectedObjectExpected);
    const samples: number[] = [];
    for (let index = 0; index < samplesPerScenario; index += 1) {
      const chapter = index % 2 === 0 ? "1.11" : "1.10";
      samples.push(await transition(page, chapter, selectedObjectExpected));
    }
    const scenario = selectedObjectExpected
      ? "selected-object-replacement"
      : "unselected";
    const scenarioMedian = median(samples);
    const scenarioMaximum = Math.max(...samples);
    console.log(
      JSON.stringify({
        scenario,
        samples_ms: samples.map((sample) => Number(sample.toFixed(2))),
        median_ms: Number(scenarioMedian.toFixed(2)),
        maximum_ms: Number(scenarioMaximum.toFixed(2)),
        bundle: bundleIdentity,
        browser: browserIdentity,
        node: process.version,
        platform: `${os.hostname()} ${os.platform()} ${os.release()} ${os.arch()}`,
        cpu,
      }),
    );
    results.push({
      scenario,
      median: scenarioMedian,
      maximum: scenarioMaximum,
    });
  }
  for (const result of results) {
    expect(result.median, `${result.scenario} median`).toBeLessThanOrEqual(
      maximumMedianMs,
    );
    expect(result.maximum, `${result.scenario} maximum`).toBeLessThanOrEqual(
      maximumSampleMs,
    );
  }
});

declare global {
  interface Window {
    __bob029Duration?: number;
  }
}
