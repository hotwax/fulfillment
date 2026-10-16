import { test, expect } from "@playwright/test";
import TransferOrdersListPage from "../../pages/transfer-orders/transfer-orders-list.page.js";
import CreateTransferOrderModal from "../../pages/transfer-orders/create-transfer-order.modal.js";

test.describe("Negative Flows - Input Validation", () => {
  test("Invalid Barcode - Display Error When Scanning Unknown Item", async ({ page }) => {
    // 1. Navigate to Transfer Orders
    const listPage = new TransferOrdersListPage(page, ""); // Base URL is handled by playwright.config.ts
    await listPage.navigateToTransferOrders();

    // 2. Create a dummy transfer order to reach the scan screen
    const createModal = new CreateTransferOrderModal(page);
    const orderName = `NegativeTest-InvalidScan-${Date.now()}`;
    const creationSuccess = await createModal.createTransferOrder(orderName, "");
    
    if (!creationSuccess) {
      test.skip(true, "Could not create Transfer Order to test scanning (likely no facilities found).");
      return;
    }

    // 3. We are now on the "Add items" page. Find the scan barcode input.
    const scanInput = page.getByRole("textbox", { name: /Scan barcode|Scan items/i }).first();
    await scanInput.waitFor({ state: "visible", timeout: 10000 });

    // 4. Scan a definitively invalid barcode
    const invalidBarcode = "INVALID_BARCODE_999";
    await scanInput.fill(invalidBarcode);
    await scanInput.press("Enter");

    // 5. Verify that the UI catches the invalid barcode and displays the correct error
    const notFoundText = page.getByText(`${invalidBarcode} not found`, { exact: false }).first();
    await expect(notFoundText).toBeVisible({ timeout: 10000 });

    const trySearchingText = page.getByText("Try searching using a keyword instead", { exact: false }).first();
    await expect(trySearchingText).toBeVisible();

    const searchFallbackBtn = page.getByRole("button", { name: /^Search$/i }).first();
    await expect(searchFallbackBtn).toBeVisible();
  });
});
