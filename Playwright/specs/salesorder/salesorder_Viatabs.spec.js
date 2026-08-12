import { test } from "@playwright/test";
import SalesOrderViaTabsPom from "../../pages/sales-orders/salesorder-via-tabs.pom.js";

if (process.env.CI) {
  test.describe.configure({ retries: 1 });
}

test("Sanity | Fulfillment bulk order flow - Print Picklist, Pack and Ship via tabs ", async ({
  page,
}) => {
  const salesOrderViaTabs = new SalesOrderViaTabsPom(page);
  test.skip(!(await salesOrderViaTabs.prepare()), "No open sales orders available for this facility.");
  await salesOrderViaTabs.run();
});

test("Negative | Sales Order | Pack stays disabled before selecting documents", async ({
  page,
}) => {
  const salesOrderViaTabs = new SalesOrderViaTabsPom(page);
  test.skip(!(await salesOrderViaTabs.prepare()), "No open sales orders available for this facility.");
  await salesOrderViaTabs.runNegative();
});
