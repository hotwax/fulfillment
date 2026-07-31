import { test } from "@playwright/test";

import CreateOrderFlowPom from "../../pages/transfer-orders/create-order-flow.pom.js";
import { getClientIdFromProject, getClientSkus } from "../../data/client-skus.js";


test("test-create order", async ({ page }, testInfo) => {
  // 1. Navigate to the base application URL and wait for DOM and network to settle
  await page.goto("/open", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle").catch(() => {});

  // 2. Initialize the POM responsible for orchestrating the entire Transfer Order creation flow
  const createOrderFlow = new CreateOrderFlowPom(page);
  
  // 3. Determine the client ID from the Playwright project name (e.g., adoc-sv-uat)
  const clientId = getClientIdFromProject(testInfo.project.name);
  
  // 4. Attempt to prepare the transfer order (clicks through to creation modal). 
  // If no facilities are available (e.g., due to stale environment data), skip the test instead of failing.
  test.skip(!(await createOrderFlow.prepare()), "No facilities available to create transfer order");
  
  // 5. Execute the core Transfer Order item addition and packing workflow, passing in the client's test SKUs
  await createOrderFlow.run(getClientSkus(clientId));
});
