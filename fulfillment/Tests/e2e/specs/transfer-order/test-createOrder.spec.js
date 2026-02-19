import { test } from "@playwright/test";

import CreateOrderFlowPom from "../../pages/transfer-orders/create-order-flow.pom.js";


test("test-create order", async ({ page }) => {
  await page.goto("https://fulfillment-dev.hotwax.io/open", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});

  const createOrderFlow = new CreateOrderFlowPom(page);
  await createOrderFlow.run();
});
