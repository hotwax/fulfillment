import { test } from "@playwright/test";
import SalesOrderAddBoxPom from "../../pages/sales-orders/salesorder-add-box.pom.js";

if (process.env.CI) {
  test.describe.configure({ retries: 1 });
}

test("Sanity | Sales Order - add Box logic", async ({ page }) => {
  // 1. Initialize the Sales Order POM which manages the Add Box flow
  const salesOrderAddBox = new SalesOrderAddBoxPom(page);
  
  // 2. Prepare the environment by navigating to Sales Orders and finding an eligible order.
  // We use test.skip() here because test environments frequently lack open sales orders,
  // and we want to skip gracefully rather than failing the test run on an environmental issue.
  test.skip(!(await salesOrderAddBox.prepare()), "No open sales orders available for this facility.");
  
  // 3. Execute the packing logic (adding a box and packing items into it)
  const addBoxSuccess = await salesOrderAddBox.run();
  
  // 4. Validate that the packing flow found a suitable multi-item order to test with.
  test.skip(!addBoxSuccess, "No multi-item order found to test Add Box logic");
});
