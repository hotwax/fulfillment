import { test } from "@playwright/test";
import SalesOrderRejectAllPom from "../../pages/sales-orders/salesorder-reject-all.pom.js";

if (process.env.CI) {
  test.describe.configure({ retries: 1 });
}

test("Sanity | Fulfillment- sales order bulk order flow - Rejectall", async ({
  page,
}) => {
  const salesOrderRejectAll = new SalesOrderRejectAllPom(page);
  test.skip(!(await salesOrderRejectAll.prepare()), "No open sales orders available for this facility.");
  await salesOrderRejectAll.run();
});

test("Negative | Sales Order | Reject confirmation should not show before clicking Reject all", async ({
  page,
}) => {
  const salesOrderRejectAll = new SalesOrderRejectAllPom(page);
  test.skip(!(await salesOrderRejectAll.prepare()), "No open sales orders available for this facility.");
  await salesOrderRejectAll.runNegative();
});
