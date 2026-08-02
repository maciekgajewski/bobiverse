import os from "node:os";
import { expect, test, type Page } from "@playwright/test";

const samplesPerScenario = 10;
const maximumMedianMs = 100;
const maximumSampleMs = 150;

function characterButton(page: Page, name: "Bob" | "Riker") {
  return page
    .getByRole("complementary", { name: "Object browser" })
    .getByRole("button", {
      name: new RegExp(
        `^${name}(?: Active| Last active · Chapter \\d+\\.\\d+)?$`,
      ),
    });
}

async function selectCharacter(
  page: Page,
  name: "Bob" | "Riker",
): Promise<number> {
  const button = characterButton(page, name);
  await button.evaluate((element, characterName) => {
    window.__bobTravelSelectionDuration = undefined;
    element.addEventListener(
      "click",
      () => {
        const start = performance.now();
        const finishWhenRendered = () => {
          const heading = document.querySelector(
            ".right-rail .narrative-details h2",
          );
          const travel = document.querySelector(
            '.right-rail [aria-controls="character-section-travel-history"]',
          );
          if (heading?.textContent !== characterName || !travel) return;
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              window.__bobTravelSelectionDuration = performance.now() - start;
            }),
          );
          observer.disconnect();
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
  }, name);
  await button.click();
  await expect(
    page
      .getByRole("complementary", { name: "Object inspector" })
      .getByRole("heading", { name }),
  ).toBeVisible();
  await page.waitForFunction(
    () => window.__bobTravelSelectionDuration !== undefined,
  );
  return page.evaluate(() => window.__bobTravelSelectionDuration!);
}

function median(samples: readonly number[]): number {
  const sorted = [...samples].sort((left, right) => left - right);
  return (sorted[4]! + sorted[5]!) / 2;
}

test("warmed character travel selection stays within budget", async ({
  browser,
  page,
}) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: "1.21",
        viewChapter: "1.21",
        displayDate: "2145",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  });
  await page.goto("/");
  await expect(characterButton(page, "Bob")).toBeVisible();
  await expect(characterButton(page, "Riker")).toBeVisible();
  for (let cycle = 0; cycle < 2; cycle += 1) {
    await selectCharacter(page, "Bob");
    await selectCharacter(page, "Riker");
  }
  const samples: number[] = [];
  for (let index = 0; index < samplesPerScenario; index += 1) {
    samples.push(
      await selectCharacter(page, index % 2 === 0 ? "Bob" : "Riker"),
    );
  }
  const scenarioMedian = median(samples);
  const scenarioMaximum = Math.max(...samples);
  console.log(
    JSON.stringify({
      scenario: "character-travel-selection",
      samples_ms: samples.map((sample) => Number(sample.toFixed(2))),
      median_ms: Number(scenarioMedian.toFixed(2)),
      maximum_ms: Number(scenarioMaximum.toFixed(2)),
      browser: `${browser.browserType().name()} ${browser.version()}`,
      node: process.version,
      platform: `${os.hostname()} ${os.platform()} ${os.release()} ${os.arch()}`,
      cpu: os.cpus()[0]?.model ?? "unknown",
    }),
  );
  expect(scenarioMedian).toBeLessThanOrEqual(maximumMedianMs);
  expect(scenarioMaximum).toBeLessThanOrEqual(maximumSampleMs);
});

declare global {
  interface Window {
    __bobTravelSelectionDuration?: number;
  }
}
