import { test, expect } from "@playwright/test";
import TransferOrdersListPage from "../../pages/transfer-orders/transfer-orders-list.page.js";

test.describe("Network Failures", () => {
  test("Transfer Order Creation - 500 Internal Server Error Graceful Handling", async ({ page }) => {
    // 1. Intercept the TO Creation API call and return a 500 error
    await page.route("**/oms/transferOrders", async (route) => {
      // Allow preflight OPTIONS requests to pass through normally
      if (route.request().method() === "OPTIONS") {
        await route.continue();
        return;
      }
      // Force 500 error on the POST request
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    // 2. Navigate to Transfer Orders list
    const listPage = new TransferOrdersListPage(page, "");
    await listPage.navigateToTransferOrders();

    // 3. Open Create TO Modal
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 5000 });
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input");
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    const orderNameInput = orderNameField.locator("input").first();
    await orderNameInput.fill(`NegativeTest-TO-${Date.now()}`);

    // Wait for initial loading spinner to hide
    const loadingText = page.getByText("Loading...", { exact: false });
    await loadingText.first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

    // 4. Wait for facilities to load and select one
    const facilityOptions = page.getByTestId("facility-radio-options");
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
          document.body.innerText.includes("No facilities found"),
        undefined,
        { timeout: 15000 },
      )
      .catch(() => {});

    const optionCount = await facilityOptions.count();
    if (optionCount === 0) {
      test.skip(true, "No facilities available in create transfer order modal.");
      return;
    }

    const facilityRows = page.locator("ion-item", { has: facilityOptions });
    await facilityRows.first().click();

    // 5. Save and create the transfer order
    const saveBtn = page.getByTestId("save-transfer-order-btn");
    await saveBtn.waitFor({ state: "visible", timeout: 10000 });
    await expect(saveBtn).toBeEnabled();
    
    // We expect this to fail due to our network mock
    await saveBtn.click();

    // 6. Verify that the app catches the 500 error gracefully
    const errorToast = page.locator("ion-toast, [role='status']").filter({ hasText: /Failed to create order/i }).first();
    await expect(errorToast).toBeVisible({ timeout: 10000 });
  });
});
