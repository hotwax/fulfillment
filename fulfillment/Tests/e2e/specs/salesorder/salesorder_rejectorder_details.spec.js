import { test } from "@playwright/test";
import SalesOrderRejectOrderDetailsPom from "../../pages/sales-orders/salesorder-reject-order-details.pom.js";

if (process.env.CI) {
  test.describe.configure({ retries: 1 });
}

test("Sanity | Fulfillment | Reject single order via details page", async ({
  page,
}) => {
  const salesOrderRejectDetails = new SalesOrderRejectOrderDetailsPom(page);
  test.skip(!(await salesOrderRejectDetails.prepare()), "No open sales orders available for this facility.");
  await salesOrderRejectDetails.run();
});

test("Negative | Sales Order | Reject order is disabled before issue selection", async ({
  page,
}) => {
  const salesOrderRejectDetails = new SalesOrderRejectOrderDetailsPom(page);
  test.skip(!(await salesOrderRejectDetails.prepare()), "No open sales orders available for this facility.");
  await salesOrderRejectDetails.runNegative();
});
