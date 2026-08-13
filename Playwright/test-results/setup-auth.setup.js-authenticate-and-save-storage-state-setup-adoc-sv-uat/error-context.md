# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: setup/auth.setup.js >> authenticate and save storage state
- Location: setup/auth.setup.js:88:6

# Error details

```
Error: Login Failed for adoc-sv-uat: Did not reach the dashboard after login.
```

# Page snapshot

```yaml
- generic [ref=e5]:
  - main [ref=e7]:
    - generic [ref=e9]:
      - figure [ref=e10]:
        - img [ref=e11]
      - generic [ref=e12]:
        - generic [ref=e20]:
          - generic:
            - generic: Username
          - textbox [ref=e22]: admin.elsalvador
        - generic [ref=e28]:
          - generic:
            - generic: Password
          - textbox [ref=e30]: Hotwax@786
        - button [ref=e33] [cursor=pointer]:
          - generic [ref=e34]:
            - img:
              - generic:
                - img
  - button [ref=e37] [cursor=pointer]:
    - img [ref=e38]:
      - img [ref=e40]
    - img [ref=e43]:
      - img [ref=e45]
```

# Test source

```ts
  1   | import { test as setup, expect } from "@playwright/test";
  2   | import fs from "fs";
  3   | import path from "path";
  4   | import { getClientConfig } from "../config/clients";
  5   | 
  6   | /**
  7   |  * Perform login using the OMS backend (webtools) first, then navigate to Launchpad / Fulfillment
  8   |  */
  9   | async function performLogin(page, config) {
  10  |   const { clientId, username, password, oms, baseUrl } = config;
  11  | 
  12  |   if (!username || !password) {
  13  |     throw new Error(`Credentials missing for ${clientId}. Provide username/password in CLIENTS JSON or env.`);
  14  |   }
  15  | 
  16  |   console.log(`\nStarting direct login flow for Fulfillment (${clientId})...`);
  17  |   await page.goto(`${baseUrl}`);
  18  |   await page.waitForLoadState('networkidle');
  19  |   await page.waitForTimeout(2000); // Give Vue router time to settle
  20  | 
  21  |   // Handle Launchpad redirect for OMS input
  22  |   const nextBtn = page.locator('ion-button:has-text("NEXT"), button:has-text("NEXT")').first();
  23  |   if (await nextBtn.isVisible().catch(() => false)) {
  24  |     console.log(`Launchpad OMS screen detected. Filling OMS...`);
  25  |     // Locate the OMS input.
  26  |     const omsInput = page.locator('ion-input, input[type="text"]').first();
  27  |     // Clean up OMS to just the domain (e.g. adoc-sv-uat.hotwax.io)
  28  |     const omsDomain = oms ? oms.replace('https://', '').replace(':443', '').replace(/\/api\/?$/, '') : `${clientId}.hotwax.io`;
  29  |     
  30  |     await omsInput.click();
  31  |     // Simulate real typing so Ionic/Vue registers the input and enables the NEXT button
  32  |     await page.keyboard.type(omsDomain, { delay: 50 });
  33  |     await page.waitForTimeout(1000); // Wait for Vue to detect input and enable the NEXT button
  34  |     
  35  |     await nextBtn.click({ force: true }).catch(() => {});
  36  |     await page.keyboard.press('Enter').catch(() => {});
  37  |     await page.waitForLoadState('networkidle');
  38  |     await page.waitForTimeout(2000);
  39  |   }
  40  | 
  41  |   // Fill login form (either Launchpad step 2 or direct Ionic login)
  42  |   // Ensure we specifically look for a username field, NOT just any text input
  43  |   const userField = page.locator('input[name="username"], input[name="USERNAME"], ion-input[name="username"] input, input[placeholder*="sername"]').first();
  44  |   await expect(userField).toBeVisible({ timeout: 15000 });
  45  |   
  46  |   console.log(`Filling credentials for ${clientId}...`);
  47  |   await userField.click();
  48  |   await page.keyboard.type(username, { delay: 50 });
  49  |   await page.waitForTimeout(500);
  50  |   
  51  |   const passField = page.locator('input[name="password"], input[type="password"]').first();
  52  |   await passField.click();
  53  |   await page.keyboard.type(password, { delay: 50 });
  54  |   
  55  |   // Try to find OMS field if it's on the same screen (for non-Launchpad direct logins)
  56  |   const omsField = page.locator('input[name="oms"]').first();
  57  |   if (await omsField.isVisible().catch(() => false)) {
  58  |     await omsField.fill(oms || `https://${clientId}.hotwax.io`);
  59  |   }
  60  | 
  61  |   const loginBtn = page.locator('ion-button:has-text("Login"), button:has-text("Login")').first();
  62  |   await page.waitForTimeout(1000);
  63  |   await loginBtn.click({ force: true }).catch(() => {});
  64  |   await page.keyboard.press('Enter').catch(() => {});
  65  |   await page.waitForLoadState("networkidle").catch(() => {});
  66  |   await page.waitForTimeout(5000); // Give extra time for tokens to be saved in LocalStorage
  67  | 
  68  |   // Final verification that we are successfully logged in (dashboard or tabs visible)
  69  |   const tabs = page.locator('ion-tabs, ion-tab-bar, ion-menu').first();
  70  |   if (!(await tabs.isVisible({ timeout: 15000 }).catch(() => false))) {
  71  |      // Check for permission errors on screen
  72  |      const permissionError = page.locator(':has-text("You do not have permission")').first();
  73  |      if (await permissionError.isVisible().catch(() => false)) {
  74  |         throw new Error(`Login Failed for ${clientId}: You do not have permission to access the app.`);
  75  |      }
  76  |      
  77  |      const invalidAuth = page.locator(':has-text("Invalid username or password")').first();
  78  |      if (await invalidAuth.isVisible().catch(() => false)) {
  79  |         throw new Error(`Login Failed for ${clientId}: Invalid username or password.`);
  80  |      }
  81  | 
> 82  |      throw new Error(`Login Failed for ${clientId}: Did not reach the dashboard after login.`);
      |            ^ Error: Login Failed for adoc-sv-uat: Did not reach the dashboard after login.
  83  |   }
  84  | 
  85  |   console.log(`Successfully logged into Fulfillment for ${clientId}`);
  86  | }
  87  | 
  88  | setup("authenticate and save storage state", async ({ page }, testInfo) => {
  89  |   const projectName = testInfo.project.name;
  90  |   const clientId = projectName.replace("setup-", "");
  91  |   
  92  |   const config = getClientConfig(clientId);
  93  |   const authFilePath = path.resolve(__dirname, `../.auth/${clientId}.user.json`);
  94  | 
  95  |   await performLogin(page, config);
  96  | 
  97  |   fs.mkdirSync(path.dirname(authFilePath), { recursive: true });
  98  |   await page.context().storageState({ path: authFilePath });
  99  |   console.log(`Saved authentication state for ${clientId} to ${authFilePath}`);
  100 | });
  101 | 
```