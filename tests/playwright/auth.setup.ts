import { test as setup, expect } from '@playwright/test';

const username = process.env.PLAYWRIGHT_USERNAME;
const password = process.env.PLAYWRIGHT_PASSWORD;

setup('authenticate', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const passwordField = page.locator('input[type="password"]');
  const needsLogin = page.url().includes('/login') || (await passwordField.count()) > 0;

  if (needsLogin) {
    if (!username || !password) {
      throw new Error('PLAYWRIGHT_USERNAME and PLAYWRIGHT_PASSWORD must be set for login.');
    }

    const labeledUsername = page.getByLabel(/user(name| id)?|login|email/i);
    const usernameField = (await labeledUsername.count())
      ? labeledUsername.first()
      : page.locator('input[type="text"], input[type="email"]').first();

    await usernameField.fill(username);
    await passwordField.first().fill(password);

    const submitButton = page.getByRole('button', { name: /log in|login|sign in|continue/i });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      submitButton.click(),
    ]);
  }

  await expect(page).toHaveURL(/\/(open|settings)(\?.*)?$/);
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
