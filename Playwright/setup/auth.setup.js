import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { getClientConfig } from "../config/clients";

/**
 * Perform login using the OMS backend (webtools) first, then navigate to Launchpad / Fulfillment
 */
async function performLogin(page, config) {
  const { clientId, username, password, oms, baseUrl } = config;

  if (!username || !password) {
    throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  }

  console.log(`\nStarting direct login flow for Fulfillment (${clientId})...`);
  await page.goto(`${baseUrl}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // Give Vue router time to settle

  // Handle Launchpad redirect for OMS input
  const nextBtn = page.locator('ion-button:has-text("NEXT"), button:has-text("NEXT")').first();
  if (await nextBtn.isVisible().catch(() => false)) {
    console.log(`Launchpad OMS screen detected. Filling OMS...`);
    // Locate the OMS input.
    const omsInput = page.locator('ion-input, input[type="text"]').first();
    // Clean up OMS to just the domain (e.g. adoc-sv-uat.hotwax.io)
    const omsDomain = oms ? oms.replace('https://', '').replace(':443', '').replace(/\/api\/?$/, '') : `${clientId}.hotwax.io`;
    
    await omsInput.click();
    // Simulate real typing so Ionic/Vue registers the input and enables the NEXT button
    await page.keyboard.type(omsDomain, { delay: 50 });
    await page.waitForTimeout(1000); // Wait for Vue to detect input and enable the NEXT button
    
    await nextBtn.click({ force: true }).catch(() => {});
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  // Fill login form (either Launchpad step 2 or direct Ionic login)
  // Ensure we specifically look for a username field, NOT just any text input
  const userField = page.locator('input[name="username"], input[name="USERNAME"], ion-input[name="username"] input, input[placeholder*="sername"]').first();
  await expect(userField).toBeVisible({ timeout: 15000 });
  
  console.log(`Filling credentials for ${clientId}...`);
  await userField.click();
  await page.keyboard.type(username, { delay: 50 });
  await page.waitForTimeout(500);
  
  const passField = page.locator('input[name="password"], input[type="password"]').first();
  await passField.click();
  await page.keyboard.type(password, { delay: 50 });
  
  // Try to find OMS field if it's on the same screen (for non-Launchpad direct logins)
  const omsField = page.locator('input[name="oms"]').first();
  if (await omsField.isVisible().catch(() => false)) {
    await omsField.fill(oms || `https://${clientId}.hotwax.io`);
  }

  const loginBtn = page.locator('ion-button:has-text("Login"), button:has-text("Login")').first();
  await page.waitForTimeout(1000);
  await loginBtn.click({ force: true }).catch(() => {});
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(5000); // Give extra time for tokens to be saved in LocalStorage

  // Final verification that we are successfully logged in (dashboard or tabs visible)
  const tabs = page.locator('ion-tabs, ion-tab-bar, ion-menu').first();
  if (!(await tabs.isVisible({ timeout: 15000 }).catch(() => false))) {
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

  console.log(`Successfully logged into Fulfillment for ${clientId}`);
}

setup("authenticate and save storage state", async ({ page }, testInfo) => {
  const projectName = testInfo.project.name;
  const clientId = projectName.replace("setup-", "");
  
  const config = getClientConfig(clientId);
  const authFilePath = path.resolve(__dirname, `../.auth/${clientId}.user.json`);

  await performLogin(page, config);

  fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
  await page.context().storageState({ path: authFilePath });
  console.log(`Saved authentication state for ${clientId} to ${authFilePath}`);
});
