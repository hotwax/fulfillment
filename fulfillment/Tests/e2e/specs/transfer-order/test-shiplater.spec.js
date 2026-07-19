import { test } from "@playwright/test";

import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";
import { getClientIdFromProject, getClientSkus } from "../../data/client-skus.js";


test("test-ship later", async ({ page }, testInfo) => {
  try {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
  } catch {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
  }
  await page.waitForLoadState("networkidle").catch(() => {});

  const transferOrderFlow = new TransferOrderFlowPage(page);
  await transferOrderFlow.navigateToTransferOrders();
  const created = await transferOrderFlow.createTransferOrder("Ship Later Test 01");
  test.skip(!created, "No facilities available to create transfer order");
  await transferOrderFlow.openSearchTab();
  await transferOrderFlow.searchAndAddProduct(getClientSkus(getClientIdFromProject(testInfo.project.name))[0]);
  await transferOrderFlow.markOrderToShipLater();
  await transferOrderFlow.fulfillShipLaterOrder("Ship Later Test 01");
});
