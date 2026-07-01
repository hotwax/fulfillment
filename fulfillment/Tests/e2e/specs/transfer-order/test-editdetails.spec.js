import { test } from "@playwright/test";

import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";


test("test-edit details", async ({ page }) => {
  await page.goto("/open", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});

  const transferOrderFlow = new TransferOrderFlowPage(page);
  await transferOrderFlow.navigateToTransferOrders();
  const created = await transferOrderFlow.createTransferOrder("Order Test");
  test.skip(!created, "No facilities available to create transfer order");
  await transferOrderFlow.editTransferOrderName("ty-02");
  await transferOrderFlow.updateStoreForTransferOrder("Miami2 MIAMI2");
});
