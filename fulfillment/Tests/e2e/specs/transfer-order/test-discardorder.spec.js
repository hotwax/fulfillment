import { test } from "@playwright/test";

import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";


test("test-discardorder", async ({ page }) => {
  await page.goto("https://fulfillment-dev.hotwax.io/open", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});

  const transferOrderFlow = new TransferOrderFlowPage(page);

  await transferOrderFlow.navigateToTransferOrders();
  await transferOrderFlow.createTransferOrder("Discard Order Test 01");
  await transferOrderFlow.openSearchTab();
  await transferOrderFlow.searchAndAddProduct("MH09");
  await transferOrderFlow.discardOrder();
});
