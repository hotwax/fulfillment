import { test } from "@playwright/test";

import CreateOrderFlowPom from "../../pages/transfer-orders/create-order-flow.pom.js";
import { getClientIdFromProject, getClientSkus } from "../../data/client-skus.js";


test("test-create order", async ({ page }, testInfo) => {
  await page.goto("/open", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});

  const createOrderFlow = new CreateOrderFlowPom(page);
  const clientId = getClientIdFromProject(testInfo.project.name);
  test.skip(!(await createOrderFlow.prepare()), "No facilities available to create transfer order");
  await createOrderFlow.run(getClientSkus(clientId));
});
