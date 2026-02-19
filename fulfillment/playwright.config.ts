import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

export default defineConfig({
  globalTimeout: 900000,
  timeout: 120000,
  testDir: "./Tests/e2e",
  testMatch: /.*\.(spec|Spec)\.js/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 1,
  reporter: "html",
  use: {
    headless: process.env.HEADED ? false : true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    navigationTimeout: 60000,
    actionTimeout: 60000,
  },
  projects: [
    {
      name: "setup-dev",
      testMatch: /.*auth-dev\.setup\.js/,
    },
    {
      name: "chromium-dev",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./Tests/e2e/.auth/dev.user.json",
      },
      dependencies: ["setup-dev"],
    },
  ],
});
