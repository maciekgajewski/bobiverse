import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const fixture = {
  chapter: "1.14",
  knownSystemIds: {
    count: 2,
    ids: ["sol", "stellar-system-005582"],
    sha256: "a6ade58e82a771675324c2e62a61ffc7e9e53a14e76d7017f39466a04110a18d",
  },
  activeSystemIds: {
    count: 1,
    ids: ["stellar-system-005582"],
    sha256: "27fd4d5893c7c9f362b80ae7e7ecb9608251b0f0b6e4a7b2c9cba529c17b52ff",
  },
  systemIds: {
    count: 119,
    sha256: "59edd1bf20f11470559a370948c28b8226afe9f9b902e18a6a3dd1ba6f312ac0",
  },
  componentIds: {
    count: 144,
    sha256: "53a6aa4570f19c575cdbcbf7e0f71139fc98ad46c1abd99e83c516d597096fe1",
  },
} as const;

interface SweepMetrics {
  median_ms: number;
  p95_ms: number;
  over_50_ms: number;
  maximum_ms: number;
  interval_count: number;
}

interface RunMetrics {
  median_ms: number;
  p95_ms: number;
  median_over_50_ms: number;
  maximum_ms: number;
  sweeps: SweepMetrics[];
}

interface BaselineEvidence {
  fixture: typeof fixture;
  runs: RunMetrics[];
  bundle: string[];
  renderer: string;
  browser: string;
  node: string;
  cpu: string;
  host: string;
  platform: string;
}

const baselinePath = path.join(
  process.cwd(),
  "tests/performance/fixtures/bob-034-map-baseline.json",
);
const captureBaseline = process.env.BOB034_CAPTURE_BASELINE === "1";
const settleTimeoutMs = 4_000;
const maximumFinalMedianMs = 33.4;

function sha256(ids: readonly string[]): string {
  return crypto
    .createHash("sha256")
    .update(
      [...ids]
        .sort()
        .map((id) => `${id}\n`)
        .join(""),
    )
    .digest("hex");
}

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index]!;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function summarize(intervals: readonly number[]): SweepMetrics {
  return {
    median_ms: Number(median(intervals).toFixed(2)),
    p95_ms: Number(percentile(intervals, 0.95).toFixed(2)),
    over_50_ms: intervals.filter((interval) => interval > 50).length,
    // Keep the raw maximum for the absolute 100 ms gate. Rounding here could turn
    // a real over-budget interval into an apparent boundary pass.
    maximum_ms: Math.max(...intervals),
    interval_count: intervals.length,
  };
}

function assertRunShape(run: RunMetrics): void {
  expect(run.sweeps).toHaveLength(5);
  for (const value of [
    run.median_ms,
    run.p95_ms,
    run.median_over_50_ms,
    run.maximum_ms,
  ]) {
    expect(Number.isFinite(value)).toBe(true);
  }
  for (const sweep of run.sweeps) {
    expect(sweep.interval_count).toBeGreaterThan(240);
    expect(sweep.median_ms).toBeGreaterThan(0);
    expect(sweep.p95_ms).toBeGreaterThan(0);
    expect(sweep.maximum_ms).toBeGreaterThan(0);
    expect(sweep.over_50_ms).toBeGreaterThanOrEqual(0);
  }
}

async function settle(page: Page): Promise<Bob034MapPerformanceSnapshot> {
  return page.evaluate(
    (timeoutMs) =>
      new Promise<Bob034MapPerformanceSnapshot>((resolve, reject) => {
        const started = performance.now();
        let previous = window.__bob034MapPerformance!.snapshot();
        let stableFrames = 0;
        let cameraDelta = Number.POSITIVE_INFINITY;
        let targetDelta = Number.POSITIVE_INFINITY;
        const distance = (
          left: [number, number, number],
          right: [number, number, number],
        ) =>
          Math.hypot(
            left[0] - right[0],
            left[1] - right[1],
            left[2] - right[2],
          );
        const inspect = () => {
          const current = window.__bob034MapPerformance!.snapshot();
          cameraDelta = distance(current.camera, previous.camera);
          targetDelta = distance(current.target, previous.target);
          const stable = cameraDelta < 1e-5 && targetDelta < 1e-5;
          stableFrames = stable ? stableFrames + 1 : 0;
          previous = current;
          if (stableFrames >= 12) {
            resolve(current);
            return;
          }
          if (performance.now() - started >= timeoutMs) {
            reject(
              new Error(
                `Map camera did not settle within 4 seconds: camera delta ${cameraDelta}, target delta ${targetDelta}, stable frames ${stableFrames}.`,
              ),
            );
            return;
          }
          requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
      }),
    settleTimeoutMs,
  );
}

function expectSamePose(
  actual: Bob034MapPerformanceSnapshot,
  expected: Bob034MapPerformanceSnapshot,
): void {
  for (const key of ["camera", "target"] as const) {
    for (let index = 0; index < 3; index += 1) {
      expect(
        Math.abs(actual[key][index]! - expected[key][index]!),
        `${key}[${index}] reset pose`,
      ).toBeLessThan(1e-5);
    }
  }
}

async function reset(
  page: Page,
  expectedPose?: Bob034MapPerformanceSnapshot,
): Promise<Bob034MapPerformanceSnapshot> {
  await page.getByRole("button", { name: "Reset view" }).click();
  const pose = await settle(page);
  if (expectedPose) expectSamePose(pose, expectedPose);
  return pose;
}

async function sweep(page: Page, record: boolean): Promise<number[]> {
  await page
    .getByTestId("star-map-canvas")
    .evaluate(async (element, shouldRecord) => {
      const canvas = element as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      const y = bounds.top + bounds.height * 0.5;
      const startX = bounds.left + bounds.width * 0.7;
      const endX = bounds.left + bounds.width * 0.3;
      const dispatch = (
        type: "pointerdown" | "pointermove" | "pointerup",
        clientX: number,
        buttons: number,
      ) => {
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerId: 1,
            pointerType: "mouse",
            isPrimary: true,
            button: 0,
            buttons,
            clientX,
            clientY: y,
          }),
        );
      };
      const originalSetPointerCapture = canvas.setPointerCapture;
      const originalReleasePointerCapture = canvas.releasePointerCapture;
      canvas.setPointerCapture = () => undefined;
      canvas.releasePointerCapture = () => undefined;
      if (shouldRecord) {
        const intervals: number[] = [];
        let prior: number | null = null;
        let running = true;
        const capture = (now: number) => {
          if (prior !== null) intervals.push(now - prior);
          prior = now;
          if (running) requestAnimationFrame(capture);
        };
        window.__bob034Intervals = intervals;
        window.__bob034StopIntervals = () => {
          running = false;
        };
        requestAnimationFrame(capture);
      }
      dispatch("pointerdown", startX, 1);
      for (let step = 1; step <= 120; step += 1) {
        await new Promise(requestAnimationFrame);
        dispatch("pointermove", startX + ((endX - startX) * step) / 120, 1);
      }
      for (let step = 1; step <= 120; step += 1) {
        await new Promise(requestAnimationFrame);
        dispatch("pointermove", endX + ((startX - endX) * step) / 120, 1);
      }
      dispatch("pointerup", startX, 0);
      canvas.setPointerCapture = originalSetPointerCapture;
      canvas.releasePointerCapture = originalReleasePointerCapture;
    }, record);
  await settle(page);
  if (!record) return [];
  return page.evaluate(() => {
    window.__bob034StopIntervals!();
    return window.__bob034Intervals!;
  });
}

async function loadFixture(page: Page): Promise<void> {
  await page.addInitScript((chapter) => {
    window.localStorage.setItem(
      "bobiverse.app-state.v1",
      JSON.stringify({
        furthestChapterRead: chapter,
        viewChapter: chapter,
        displayDate: "2144",
        mode: "chapter",
        timelineZoom: 1,
        timelinePan: 0,
      }),
    );
  }, fixture.chapter);
  await page.goto("/");
  await expect(page.locator(".map-narrative-badge")).toContainText(
    `Knowledge through Chapter ${fixture.chapter}`,
  );
  await page.waitForFunction(() => window.__bob034MapPerformance !== undefined);
  const actual = await page.evaluate(
    () => window.__bob034MapPerformance!.fixture,
  );
  for (const key of [
    "knownSystemIds",
    "activeSystemIds",
    "systemIds",
    "componentIds",
  ] as const) {
    expect(actual[key]).toHaveLength(fixture[key].count);
    expect(sha256(actual[key]), `${key} SHA-256`).toBe(fixture[key].sha256);
  }
  expect([...actual.knownSystemIds].sort()).toEqual([
    ...fixture.knownSystemIds.ids,
  ]);
  expect([...actual.activeSystemIds].sort()).toEqual([
    ...fixture.activeSystemIds.ids,
  ]);
}

async function measuredRun(
  page: Page,
  resetPose: Bob034MapPerformanceSnapshot,
): Promise<RunMetrics> {
  await reset(page, resetPose);
  for (let warmup = 0; warmup < 2; warmup += 1) {
    await reset(page, resetPose);
    await sweep(page, false);
  }
  const sweeps: SweepMetrics[] = [];
  for (let sample = 0; sample < 5; sample += 1) {
    await reset(page, resetPose);
    sweeps.push(summarize(await sweep(page, true)));
  }
  return {
    median_ms: Number(
      median(sweeps.map((sample) => sample.median_ms)).toFixed(2),
    ),
    p95_ms: Number(median(sweeps.map((sample) => sample.p95_ms)).toFixed(2)),
    median_over_50_ms: median(sweeps.map((sample) => sample.over_50_ms)),
    maximum_ms: Math.max(...sweeps.map((sample) => sample.maximum_ms)),
    sweeps,
  };
}

test("production map interaction preserves the BOB-034 fixture and frame budgets", async ({
  browser,
  page,
}) => {
  test.setTimeout(300_000);
  await loadFixture(page);
  const resetPose = await reset(page);
  const runs: RunMetrics[] = [];
  for (let run = 0; run < 3; run += 1) {
    runs.push(await measuredRun(page, resetPose));
  }
  const identity = {
    fixture,
    runs,
    bundle: await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((entry) => new URL(entry.name).pathname)
        .filter((entry) => entry.startsWith("/assets/"))
        .sort(),
    ),
    renderer: await page.evaluate(() =>
      window.__bob034MapPerformance!.renderer(),
    ),
    browser: `chromium ${browser.version()}`,
    node: process.version,
    cpu: os.cpus()[0]?.model ?? "unknown",
    host: os.hostname(),
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  };
  console.log(`BOB034_MAP_RESULT=${JSON.stringify(identity)}`);

  if (captureBaseline) return;
  const baseline = JSON.parse(
    fs.readFileSync(baselinePath, "utf8"),
  ) as BaselineEvidence;
  expect(baseline.fixture).toEqual(fixture);
  expect(baseline.runs).toHaveLength(3);
  baseline.runs.forEach(assertRunShape);
  runs.forEach(assertRunShape);
  for (const key of [
    "renderer",
    "browser",
    "node",
    "cpu",
    "host",
    "platform",
  ] as const) {
    expect(identity[key], `${key} differs from baseline`).toBe(baseline[key]);
  }
  const baselineBackdrop = baseline.bundle.find((asset) =>
    asset.includes("/assets/galactic-starfield-"),
  );
  const finalBackdrop = identity.bundle.find((asset) =>
    asset.includes("/assets/galactic-starfield-"),
  );
  expect(baselineBackdrop).toBeDefined();
  expect(finalBackdrop).toBe(baselineBackdrop);
  const baselineMedian = median(baseline.runs.map((run) => run.median_ms));
  const baselineP95 = median(baseline.runs.map((run) => run.p95_ms));
  const baselineLongFrames = median(
    baseline.runs.map((run) => run.median_over_50_ms),
  );
  const finalMedian = median(runs.map((run) => run.median_ms));
  const finalP95 = median(runs.map((run) => run.p95_ms));
  const finalLongFrames = median(runs.map((run) => run.median_over_50_ms));
  console.log(
    `BOB034_MAP_BUDGETS=${JSON.stringify({
      baseline_median_ms: baselineMedian,
      baseline_p95_ms: baselineP95,
      baseline_median_over_50_ms: baselineLongFrames,
      maximum_final_median_ms: maximumFinalMedianMs,
      maximum_final_p95_ms: baselineP95 * 1.15,
      maximum_final_median_over_50_ms: baselineLongFrames + 2,
      maximum_final_interval_ms: 100,
    })}`,
  );
  expect(finalMedian).toBeLessThanOrEqual(maximumFinalMedianMs);
  expect(finalP95).toBeLessThanOrEqual(baselineP95 * 1.15);
  expect(finalLongFrames).toBeLessThanOrEqual(baselineLongFrames + 2);
  expect(Math.max(...runs.map((run) => run.maximum_ms))).toBeLessThanOrEqual(
    100,
  );
});

declare global {
  interface Window {
    __bob034Intervals?: number[];
    __bob034StopIntervals?: () => void;
  }
}
