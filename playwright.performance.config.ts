import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/performance",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command:
      "./node_modules/.bin/vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
