import { test, expect } from "@playwright/test";
import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";

test.describe("transfer order - ship later negative", () => {
  test("should keep Ship later disabled before adding any item", async ({
    page,
  }) => {
    await page.goto("https://fulfillment-dev.hotwax.io/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    await flow.createTransferOrder("NEG-ShipLater-01");

    await expect(page.getByRole("button", { name: "Ship later" })).toBeDisabled();
  });

  test("should not show Search orders field before ship-later move", async ({
    page,
  }) => {
    await page.goto("https://fulfillment-dev.hotwax.io/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    await flow.createTransferOrder("NEG-ShipLater-02");

    await expect(page.getByPlaceholder("Search orders")).toHaveCount(0);
  });
});
