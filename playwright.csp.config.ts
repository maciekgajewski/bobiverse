import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e-csp",
  testMatch: "csp.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 180_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4202",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "CSP_PREVIEW_PORT=4202 CSP_PREVIEW_HOST=127.0.0.1 node scripts/serve-csp-preview.mjs",
    cwd: import.meta.dirname,
    url: "http://127.0.0.1:4202",
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "firefox",
      // Firefox's native headless WebGL path is not portable across Linux GL
      // drivers (Mozilla 1375585). The npm wrapper already supplies Xvfb.
      use: { ...devices["Desktop Firefox"], headless: false },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
