import { test as setup, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const TARGET_URL = "https://fulfillment-dev.hotwax.io/open";
const LAUNCHPAD_LOGIN_URL =
  "https://launchpad.hotwax.io/login?redirectUrl=https://fulfillment-dev.hotwax.io/login";
const AUTH_FILE = path.resolve(__dirname, "../.auth/dev.user.json");
const APP_URL_PATTERN = /fulfillment-dev\.hotwax\.io\/(open|settings)/i;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value.trim();
}

const OMS_VALUE = getRequiredEnv("PW_OMS");
const USERNAME_VALUE = getRequiredEnv("PW_USERNAME");
const PASSWORD_VALUE = getRequiredEnv("PW_PASSWORD");

const sleep2s = async (page) => {
  if (!page || page.isClosed()) return;
  await page.waitForTimeout(2000).catch(() => {});
};

async function clearAndFill(page, locator, value) {
  await locator.waitFor({ state: "visible", timeout: 20000 });
  await locator.click({ force: true });
  await page.keyboard.press("Meta+A").catch(() => {});
  await page.keyboard.press("Control+A").catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await locator.fill("").catch(() => {});
  await locator.type(value, { delay: 30 });
  await sleep2s(page);
}

async function fillOms(page) {
  const omsField = page.getByRole("textbox", { name: /oms/i }).first();
  await clearAndFill(page, omsField, OMS_VALUE);
  await expect(omsField).toHaveValue(OMS_VALUE, { timeout: 10000 });

  const nextButton = page.getByRole("button", { name: /^next$/i }).first();
  await nextButton.click({ force: true });
  await sleep2s(page);
}

async function fillCredentials(page) {
  const username = page.getByRole("textbox", { name: /username/i }).first();
  const password = page.getByRole("textbox", { name: /password/i }).first();

  await clearAndFill(page, username, USERNAME_VALUE);
  await clearAndFill(page, password, PASSWORD_VALUE);

  const loginButton = page.getByRole("button", { name: /^login$/i }).first();
  await loginButton.click({ force: true });
  await sleep2s(page);
}

async function openFulfillmentApp(page) {
  const fulfillmentApp = page
    .locator('a:has-text("Fulfillment app"), button:has-text("Fulfillment app")')
    .first();

  if (await fulfillmentApp.isVisible({ timeout: 15000 }).catch(() => false)) {
    await fulfillmentApp.click({ force: true });
    await sleep2s(page);
  }
}

async function loginToDev(page) {
  await page.goto(LAUNCHPAD_LOGIN_URL, { waitUntil: "domcontentloaded" });
  await sleep2s(page);

  for (let attempt = 0; attempt < 20; attempt++) {
    if (APP_URL_PATTERN.test(page.url())) return;

    const omsVisible = await page
      .getByRole("textbox", { name: /oms/i })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (omsVisible) {
      await fillOms(page);
      await page.waitForTimeout(3000).catch(() => {});
      continue;
    }

    const usernameVisible = await page
      .getByRole("textbox", { name: /username/i })
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);
    if (usernameVisible) {
      await fillCredentials(page);
      await page.waitForTimeout(3000).catch(() => {});
      continue;
    }

    if (page.url().includes("launchpad.hotwax.io/home")) {
      await openFulfillmentApp(page);
      continue;
    }

    if (!APP_URL_PATTERN.test(page.url())) {
      await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
      await sleep2s(page);
    }

    await page.waitForTimeout(1000).catch(() => {});
  }

  await expect(page).toHaveURL(APP_URL_PATTERN, { timeout: 20000 });
}

setup("authenticate dev and save storage state", async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await loginToDev(page);

  await page.context().storageState({ path: AUTH_FILE });
});
