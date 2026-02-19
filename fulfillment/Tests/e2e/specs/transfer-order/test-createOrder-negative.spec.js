import { test, expect } from "@playwright/test";
import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";

test.describe("transfer order - create negative", () => {
  test("should keep Ship later disabled before adding items", async ({ page }) => {
    await page.goto("https://fulfillment-dev.hotwax.io/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    await flow.createTransferOrder("NEG-Create-01");

    await expect(page.getByRole("button", { name: "Ship later" })).toBeDisabled();
  });

  test("should keep Pack and ship order disabled before adding items", async ({
    page,
  }) => {
    await page.goto("https://fulfillment-dev.hotwax.io/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    await flow.createTransferOrder("NEG-Create-02");

    await expect(
      page.getByRole("button", { name: "Pack and ship order" }),
    ).toBeDisabled();
  });
});
