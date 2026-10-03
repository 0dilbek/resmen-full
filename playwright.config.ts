import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.E2E_PRODUCTION ? "pnpm start" : "pnpm dev",
    url: "http://localhost:3000/en",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
