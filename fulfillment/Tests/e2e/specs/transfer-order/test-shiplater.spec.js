import { test } from "@playwright/test";

import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";


test("test-ship later", async ({ page }) => {
  try {
    await page.goto("https://fulfillment-dev.hotwax.io/open", {
      waitUntil: "domcontentloaded",
    });
  } catch {
    await page.goto("https://fulfillment-dev.hotwax.io/open", {
      waitUntil: "domcontentloaded",
    });
  }
  await page.waitForLoadState("networkidle").catch(() => {});

  const transferOrderFlow = new TransferOrderFlowPage(page);
  await transferOrderFlow.navigateToTransferOrders();
  await transferOrderFlow.createTransferOrder("Ship Later Test 01");
  await transferOrderFlow.openSearchTab();
  await transferOrderFlow.searchAndAddProduct("MH07");
  await transferOrderFlow.markOrderToShipLater();
  await transferOrderFlow.fulfillShipLaterOrder("Ship Later Test 01");
});
