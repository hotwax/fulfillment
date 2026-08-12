import { test, expect } from "@playwright/test";
import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";

test.describe("transfer order - edit details negative", () => {
  test("should not show transfer name editor before edit mode", async ({
    page,
  }) => {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    const created1 = await flow.createTransferOrder("NEG-Edit-01");
    test.skip(!created1, "No facilities available");

    await expect(page.getByRole("textbox", { name: "Transfer name" })).toHaveCount(0);
  });

  test("should not show store/facility combobox before edit mode", async ({
    page,
  }) => {
    await page.goto("/open", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle").catch(() => {});

    const flow = new TransferOrderFlowPage(page);
    await flow.navigateToTransferOrders();
    const created2 = await flow.createTransferOrder("NEG-Edit-02");
    test.skip(!created2, "No facilities available");

    await expect(page.getByRole("combobox")).toHaveCount(0);
  });
});
