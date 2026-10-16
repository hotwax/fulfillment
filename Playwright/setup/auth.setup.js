import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { getClientConfig } from "../config/clients";

/**
 * Perform login using the OMS backend (webtools) first, then navigate to Launchpad / Fulfillment
 */
async function performLogin(page, config) {
  // Log all console errors and failed network requests
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`Page [Type: error] - Encountered error: ${msg.text()}`);
  });
  page.on('requestfailed', request => {
    console.log(`Request [URL: ${request.url()}] - Failed: ${request.failure().errorText}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`API [URL: ${response.url()}, Status: ${response.status()}] - Error returned`);
    }
  });

  // Mock the appVersions API to prevent the 404 error on UAT from crashing the Login UI
  await page.route('**/appVersions**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({})
  }));

  const { clientId, username, password, oms, baseUrl } = config;

  if (!username || !password) {
    throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  }

  console.log(`\nAuthentication [Client: ${clientId}] - Starting direct login flow for Fulfillment`);
  await page.goto(`${baseUrl}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Give Vue router time to settle

  // Handle Launchpad redirect for OMS input
  const nextBtn = page.locator('ion-button:has-text("NEXT"), button:has-text("NEXT")').first();
  if (await nextBtn.isVisible().catch(() => false)) {
    console.log(`Authentication [Client: ${clientId}] - Launchpad OMS screen detected, filling OMS`);
    // Locate the OMS input.
    const omsInput = page.locator('ion-input, input[type="text"]').first();
    // Pass the full URL to prevent the frontend from auto-appending .hotwax.io
    const omsUrl = oms || `https://${clientId}.hotwax.io`;
    
    await omsInput.click();
    await page.keyboard.type(omsUrl, { delay: 50 });
    await page.waitForTimeout(1000); // Wait for Vue to detect input and enable the NEXT button
    
    await nextBtn.click({ force: true }).catch(() => {});
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);
  }

  // Fill login form (either Launchpad step 2 or direct Ionic login)
  // Ensure we specifically look for a username field, NOT just any text input
  const userField = page.locator('input[name="username"], input[name="USERNAME"], ion-input[name="username"] input, input[placeholder*="sername"]').first();
  await expect(userField).toBeVisible({ timeout: 15000 });
  
  console.log(`Authentication [Client: ${clientId}] - Filling credentials`);
  await userField.click();
  await page.keyboard.type(username, { delay: 50 });
  
  const passField = page.locator('input[name="password"], input[type="password"]').first();
  await passField.click();
  await page.keyboard.type(password, { delay: 50 });
  await passField.press('Enter');
  
  // Try to find OMS field if it's on the same screen (for non-Launchpad direct logins)
  const omsField = page.locator('input[name="oms"]').first();
  if (await omsField.isVisible().catch(() => false)) {
    await omsField.click();
    await page.keyboard.type(oms || `https://${clientId}.hotwax.io`, { delay: 50 });
  }

  await page.waitForTimeout(1000);
  const loginBtn = page.locator('ion-button:has-text("Login"), button:has-text("Login"), ion-button:has-text("LOGIN"), button:has-text("LOGIN")').first();
  await loginBtn.click({ force: true }).catch(() => {});
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(5000); // Give extra time for tokens to be saved in LocalStorage

  // Final verification that we are successfully logged in
  try {
    // Wait for the URL to change away from the login page, or wait for the main menu to appear
    await Promise.any([
      page.waitForURL(/.*\/(open|in-progress|completed|settings|order-lookup)/, { timeout: 15000 }),
      page.waitForSelector('ion-menu', { state: 'visible', timeout: 15000 })
    ]);
  } catch (e) {
     // Check for permission errors on screen
     const permissionError = page.locator(':has-text("You do not have permission")').first();
     if (await permissionError.isVisible().catch(() => false)) {
        throw new Error(`Login Failed for ${clientId}: You do not have permission to access the app.`);
     }
     
     const invalidAuth = page.locator(':has-text("Invalid username or password")').first();
     if (await invalidAuth.isVisible().catch(() => false)) {
        throw new Error(`Login Failed for ${clientId}: Invalid username or password.`);
     }

     throw new Error(`Login Failed for ${clientId}: Did not reach the dashboard after login.`);
  }

  console.log(`Authentication [Client: ${clientId}] - Successfully logged into Fulfillment`);
}

setup("authenticate and save storage state", async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;
  const clientId = projectName.replace("setup-", "");
  
  const config = getClientConfig(clientId);
  const authFilePath = path.resolve(__dirname, `../.auth/${clientId}.user.json`);

  await performLogin(page, config);

  fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
  await page.context().storageState({ path: authFilePath });
  console.log(`Authentication [Client: ${clientId}] - Saved authentication state to ${authFilePath}`);
});
