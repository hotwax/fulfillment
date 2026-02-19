import { test } from "@playwright/test";

import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";


test("test-edit details", async ({ page }) => {
  await page.goto("https://fulfillment-dev.hotwax.io/open", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});

  const transferOrderFlow = new TransferOrderFlowPage(page);
  await transferOrderFlow.navigateToTransferOrders();
  await transferOrderFlow.createTransferOrder("Order Test");
  await transferOrderFlow.editTransferOrderName("ty-02");
  await transferOrderFlow.updateStoreForTransferOrder("Miami2 MIAMI2");
});
