import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/performance",
  testMatch: "map-interaction.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 300_000,
  use: {
    baseURL: "http://127.0.0.1:4174",
    browserName: "chromium",
    deviceScaleFactor: 1,
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command:
      "./node_modules/.bin/vite preview --host 127.0.0.1 --port 4174 --strictPort",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
