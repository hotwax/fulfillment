import { test } from "@playwright/test";
import SalesOrderAddBoxPom from "../../pages/sales-orders/salesorder-add-box.pom.js";

if (process.env.CI) {
  test.describe.configure({ retries: 1 });
}

/**
 * Acceptance Criteria
 * 
 * - The **Add Box** button should be **disabled** when an order contains **only one item**, as only one box is required.
 * - The **Add Box** button should be **enabled** when an order contains **multiple items**.
 * - The **maximum number of boxes** that can be added must be equal to the **total number of items** in the order.
 * - Users are allowed to create **fewer boxes than the total number of items**.
 * - Users **must not** be allowed to create **more boxes than the total number of items**, but will be disabled when maximum boxes are added.
 */

test("Sanity | Sales Order - add Box logic for multiple items", async ({ page }) => {
  const salesOrderAddBox = new SalesOrderAddBoxPom(page);
  
  // Prepare the environment by navigating to Sales Orders and finding an eligible order.
  test.skip(!(await salesOrderAddBox.prepare()), "No open sales orders available for this facility.");
  
  // Execute the packing logic (adding a box and packing items into it)
  // This verifies that we can add boxes up to the item count, and then the button becomes disabled.
  const addBoxSuccess = await salesOrderAddBox.run();
  
  test.skip(!addBoxSuccess, "No multi-item order found to test Add Box logic");
});

test("Negative | Sales Order - add Box logic for single item", async ({ page }) => {
  const salesOrderAddBox = new SalesOrderAddBoxPom(page);
  
  // Prepare the environment by navigating to Sales Orders and finding an eligible order.
  test.skip(!(await salesOrderAddBox.prepare()), "No open sales orders available for this facility.");
  
  // This verifies that the Add Box button is disabled for orders with only 1 item.
  const addBoxSuccess = await salesOrderAddBox.runNegative();
  
  test.skip(!addBoxSuccess, "No single-item order found to test Add Box negative logic");
});
