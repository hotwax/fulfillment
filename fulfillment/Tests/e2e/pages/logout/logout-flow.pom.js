import { expect } from "@playwright/test";

export default class LogoutFlowPom {
  constructor(page) {
    this.page = page;
    const configuredBase = process.env.PW_BASE_URL_DEV || "https://fulfillment-dev.hotwax.io";
    this.baseUrl = configuredBase.replace(/\/+$/, "");
  }

  async runWithNetworkRetry(action, attempts = 2) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        await this.page.waitForTimeout(2000);
      }
    }
    throw lastError;
  }

  async gotoSettings() {
    await this.runWithNetworkRetry(async () => {
      await this.page.goto(`${this.baseUrl}/settings`, {
        waitUntil: "domcontentloaded",
      });
      await this.page.waitForLoadState("networkidle").catch(() => {});
    });
  }

  async clickLogout() {
    const logoutButton = this.page.getByRole("button", { name: "Logout" }).first();
    await expect(logoutButton).toBeVisible({ timeout: 20000 });
    await this.runWithNetworkRetry(async () => {
      await logoutButton.click();
    });
  }

  async assertLoggedOutRedirect() {
    await expect(this.page).toHaveURL(/launchpad\.hotwax\.io\/login/i, { timeout: 60000 });
    await expect(this.page).toHaveURL(/isLoggedOut=true/i, { timeout: 60000 });
    await expect(this.page).toHaveURL(/redirectUrl=/i, { timeout: 60000 });
  }

  async assertLoginRedirect() {
    await expect(this.page).toHaveURL(/launchpad\.hotwax\.io\/login/i, { timeout: 60000 });
  }

  async run() {
    await this.gotoSettings();
    await this.clickLogout();
    await this.assertLoggedOutRedirect();
  }

  async tryToOpenProtectedPage(pathname) {
    await this.page.goto(`${this.baseUrl}${pathname}`, {
      waitUntil: "domcontentloaded",
    });
    await this.page.waitForLoadState("networkidle").catch(() => {});
  }
}
