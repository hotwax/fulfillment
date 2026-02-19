import { test } from "@playwright/test";
import SalesOrderAddBoxPom from "../../pages/sales-orders/salesorder-add-box.pom.js";

if (process.env.CI) {
  test.describe.configure({ retries: 1 });
}

test("Sanity | Sales Order - add Box logic ", async ({ page }) => {
  const salesOrderAddBox = new SalesOrderAddBoxPom(page);
  test.skip(!(await salesOrderAddBox.prepare()), "No open sales orders available for this facility.");
  await salesOrderAddBox.run();
});

test("Negative | Sales Order | Print picklist save remains disabled without selection", async ({
  page,
}) => {
  const salesOrderAddBox = new SalesOrderAddBoxPom(page);
  test.skip(!(await salesOrderAddBox.prepare()), "No open sales orders available for this facility.");
  await salesOrderAddBox.runNegative();
});
