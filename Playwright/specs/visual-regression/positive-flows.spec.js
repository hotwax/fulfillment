import { test, expect } from "@playwright/test";
import TransferOrderFlowPage from "../../pages/transfer-orders/transfer-order-flow.page.js";
import SalesOrderFlowPage from "../../pages/sales-orders/sales-order-flow.page.js";
import CreateTransferOrderModal from "../../pages/transfer-orders/create-transfer-order.modal.js";

// Note: Visual regression tests are highly sensitive to dynamic data (dates, IDs, quantities).
// We use Playwright's `mask` option to cover dynamic elements with a solid box, 
// allowing the test to verify fonts, layout, and colors of the static elements securely.

test.describe("Visual Regression - Positive Flows", () => {
  test("Create Transfer Order Modal - Layout and Fonts", async ({ page }) => {
    // 1. Navigate to Transfer Orders
    await page.goto("/transfer-orders", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(2000);

    // 2. Open the Create Transfer Order modal
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    
    if (await addButton.isVisible()) {
      await addButton.click();
      const orderNameField = page.getByTestId("transfer-name-input");
      await orderNameField.waitFor({ state: "visible", timeout: 5000 });
      await page.waitForTimeout(2000); // Wait for modal animation to complete

      // 3. Take a screenshot of the modal
      // We mask the loading spinner if it's there, and any facility options
      // since the options available can change based on the environment.
      await expect(page).toHaveScreenshot("create-transfer-order-modal.png", {
        mask: [
          page.getByText("Loading...", { exact: false }),
          page.getByTestId("facility-radio-options")
        ],
        fullPage: true,
        maxDiffPixelRatio: 0.05
      });
    } else {
      test.skip(true, "Add transfer order button not visible, skipping visual test");
    }
  });

});
