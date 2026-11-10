import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    cwd: import.meta.dirname,
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
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
