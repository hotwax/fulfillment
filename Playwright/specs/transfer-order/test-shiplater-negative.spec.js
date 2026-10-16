import { test, expect } from "@playwright/test";
import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";

test.describe("transfer order - ship later negative", () => {
  test("should keep Ship later disabled before adding any item", async ({
    page,
  }) => {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    const created1 = await flow.createTransferOrder("NEG-ShipLater-01");
    test.skip(!created1, "No facilities available");

    await expect(page.getByRole("button", { name: "Ship later" })).toBeDisabled();
  });

  test("should not show Search orders field before ship-later move", async ({
    page,
  }) => {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    const created2 = await flow.createTransferOrder("NEG-ShipLater-02");
    test.skip(!created2, "No facilities available");

    await expect(page.getByPlaceholder("Search orders")).toHaveCount(0);
  });
});
