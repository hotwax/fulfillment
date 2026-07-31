import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";
const { getAllClients } = require("./config/clients");

/**
 * Dynamically generate projects for each client found in environment
 */
const generateProjects = () => {
  const projects = [];
  let clients = getAllClients();

  // If a specific CLIENT is requested, filter the projects (supports comma-separated list)
  if (process.env.CLIENT) {
    const targets = process.env.CLIENT.toLowerCase().split(",").map((s) => s.trim());
    clients = clients.filter((c) => targets.includes(c.clientId.toLowerCase()));
  }

  for (const config of clients) {
    const clientId = config.clientId;

    // 1. Setup Auth
    projects.push({
      name: `setup-${clientId}`,
      testMatch: /.*auth\.setup\.js/,
    });

    // 2. Setup Logout (for negative test isolation)
    projects.push({
      name: `setup-logout-${clientId}`,
      testMatch: /.*logout\.setup\.js/,
    });

    // 3. Normal Test Execution
    projects.push({
      name: `chromium-${clientId}`,
      use: {
        ...devices["Desktop Chrome"],
        storageState: `./Tests/e2e/.auth/${clientId}.user.json`,
        baseURL: config.baseUrl,
      },
      dependencies: [`setup-${clientId}`],
      testIgnore: /.*logout.*\.spec\.js/,
    });

    // 4. Logout Test Execution
    projects.push({
      name: `chromium-logout-${clientId}`,
      use: {
        ...devices["Desktop Chrome"],
        storageState: `./Tests/e2e/.auth/${clientId}-logout.user.json`,
        baseURL: config.baseUrl,
      },
      dependencies: [`setup-logout-${clientId}`],
      testMatch: /.*logout.*\.spec\.js/,
    });
  }

  return projects;
};

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
  projects: generateProjects(),
});
