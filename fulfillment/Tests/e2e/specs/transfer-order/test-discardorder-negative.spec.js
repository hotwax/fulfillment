import { test, expect } from "@playwright/test";
import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";

test.describe("transfer order - discard negative", () => {
  test("should not show Discard order action on transfer order list page", async ({
    page,
  }) => {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();

    await expect(
      page.getByRole("button", { name: "Discard order" }),
    ).toHaveCount(0);
  });

  test("should keep Ship later disabled before any item is added", async ({
    page,
  }) => {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    const created = await flow.createTransferOrder("NEG-Discard-01");
    test.skip(!created, "No facilities available");

    await expect(page.getByRole("button", { name: "Ship later" })).toBeDisabled();
  });
});
