import { test, expect } from "@playwright/test";
import SalesOrderFlowPage from "../../pages/sales-orders/sales-order-flow.page.js";

test.describe("Network Failures", () => {
  test("Pack Order - 500 Internal Server Error Graceful Handling", async ({ page }) => {
    // 1. Intercept the bulk pack API request and force a 500 error
    await page.route("**/poorti/shipments/bulkPack", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    // 2. Navigate to Open Sales Orders and wait for load
    const salesOrderFlow = new SalesOrderFlowPage(page);
    await salesOrderFlow.gotoOpenOrders();

    // 3. Go to In Progress tab where packing usually happens
    await salesOrderFlow.goToInProgressTab();

    // 4. Click 'Pack orders' button to enter bulk pack mode
    const packOrdersBtn = page.locator("ion-button, button, [role='button']", { hasText: /Pack\s*orders/i }).first();
    await packOrdersBtn.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    
    if (!(await packOrdersBtn.isVisible())) {
       test.skip(true, "No 'Pack orders' button available, skipping network test");
       return;
    }
    
    await packOrdersBtn.click();

    // 5. Check the first order
    let dialog = page.locator("ion-alert, ion-modal, [role='alertdialog'], [role='dialog'], .alert-wrapper, .modal-wrapper").filter({ hasText: /Pack orders/i }).first();
    if ((await dialog.count().catch(() => 0)) === 0) {
      dialog = page.locator("ion-alert, ion-modal, [role='alertdialog'], [role='dialog'], .alert-wrapper, .modal-wrapper").first();
    }
    await dialog.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});

    const checkboxes = dialog.locator("ion-checkbox, input[type='checkbox'], [role='checkbox']").or(page.locator("ion-checkbox, input[type='checkbox'], [role='checkbox']"));
    
    if ((await checkboxes.count()) < 1) {
       test.skip(true, "No orders available to pack, skipping network test");
       return;
    }
    
    // Check the first one
    await checkboxes.first().click();
    await page.waitForTimeout(500);

    // 6. Click Pack
    let packBtn = dialog.locator("ion-button, button, [role='button']", { hasText: /^Pack$/i }).first();
    if ((await packBtn.count().catch(() => 0)) === 0) {
      packBtn = page.locator("ion-button, button, [role='button']", { hasText: /^Pack$/i }).first();
    }
    await expect(packBtn).toBeVisible({ timeout: 10000 });
    
    // Click and expect the error modal to appear
    await packBtn.click({ force: true, timeout: 5000 });

    // 7. Verify the UI handles the 500 error gracefully by showing an error message
    // When bulk packing fails, the app shows a toast with text "Failed to pack orders"
    const errorToast = page.locator("ion-toast, [role='status']").filter({ hasText: /Failed to pack orders/i }).first();
    await expect(errorToast).toBeVisible({ timeout: 10000 });
  });
});
