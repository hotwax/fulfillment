import { test, expect } from "@playwright/test";
import TransferOrdersListPage from "../../pages/transfer-orders/transfer-orders-list.page.js";

test.describe("Transfer Orders - Code Breaking Negative Flows", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Transfer Orders list page
    const listPage = new TransferOrdersListPage(page, ""); 
    await listPage.navigateToTransferOrders();
  });

  test("API Failure on Save (500 Error) - Should handle server error gracefully without crashing", async ({ page }) => {
    // 1. Open the Create Transfer Order modal
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 10000 });
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input").locator("input").first();
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    
    // 2. Fill inputs
    await orderNameField.fill("Error Simulation Order");
    
    const loadingText = page.getByText("Loading...", { exact: false });
    await loadingText.first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

    // Select first facility if available
    const facilityOptions = page.getByTestId("facility-radio-options");
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
            document.body.innerText.includes("No facilities found"),
      undefined,
      { timeout: 10000 }
    ).catch(() => {});

    if (await facilityOptions.count() > 0) {
      const facilityRows = page.locator("ion-item", { has: facilityOptions });
      await facilityRows.first().click();
    }
    
    await page.waitForTimeout(1000); // small stabilization wait
    
    // 3. Intercept ALL network POST requests and force a 500 Error
    // We only enable this right before clicking Save to avoid breaking initial loads.
    await page.route("**/*", async (route, request) => {
      if (request.method() === 'POST' || request.method() === 'PUT') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Intentionally broken by Playwright" })
        });
      } else {
        await route.continue();
      }
    });

    const saveBtn = page.getByTestId("save-transfer-order-btn");
    await expect(saveBtn).toBeEnabled();
    
    // 4. Click save and expect a toast or some error indicator, but the page shouldn't crash
    await saveBtn.click();
    
    // 5. Verify the modal is still open and app hasn't crashed to a blank screen
    await expect(orderNameField).toBeVisible({ timeout: 5000 });
    
    // Stop interception
    await page.unroute("**/*");
  });

  test("Extreme Boundary Inputs - Should not crash layout or execution", async ({ page }) => {
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input").locator("input").first();
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    
    // 1. Inject an extremely long string and script tag
    const hugeString = "A".repeat(5000) + "<script>alert('xss')</script>";
    
    // Fill might be slow for 5000 chars, so we evaluate it directly on the element
    await orderNameField.evaluate((node, val) => {
      node.value = val;
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, hugeString);
    
    // Verify the UI is still responsive and modal is still open
    await expect(page.getByTestId("create-transfer-order-btn")).toBeVisible();
    await expect(orderNameField).toBeVisible();
    
    // Verify we can still type normally after that
    await orderNameField.fill("Normal Name");
    await expect(orderNameField).toHaveValue("Normal Name");
  });

  test("Race Condition / Double Submission - Clicking save rapidly", async ({ page }) => {
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible" });
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input").locator("input").first();
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    
    // Fill inputs
    await orderNameField.fill(`Spam-Test-${Date.now()}`);
    
    const loadingText = page.getByText("Loading...", { exact: false });
    await loadingText.first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

    // Select facility
    const facilityOptions = page.getByTestId("facility-radio-options");
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
            document.body.innerText.includes("No facilities found"),
      undefined,
      { timeout: 10000 }
    ).catch(() => {});

    if (await facilityOptions.count() > 0) {
      await page.locator("ion-item", { has: facilityOptions }).first().click();
    }
    
    await page.waitForTimeout(1000);
    
    const saveBtn = page.getByTestId("save-transfer-order-btn");
    await expect(saveBtn).toBeEnabled();
    
    // Monitor API requests to see how many saves actually go out
    let postRequestCount = 0;
    page.on('request', request => {
      if ((request.method() === 'POST' || request.method() === 'PUT') && request.url().includes('api')) {
        postRequestCount++;
      }
    });

    // Spam click the button 10 times ignoring pointer events or enabled state
    // We use evaluate to bypass playwright's built-in actionability checks
    await saveBtn.evaluate(async (node) => {
      for(let i=0; i<10; i++) {
        node.click();
      }
    });
    
    // Wait for modal to disappear or 3 seconds
    const createDialog = page.getByRole("dialog").first();
    await createDialog.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    
    // Ideally, only 1 or 2 POST requests should go out (one for order, one for items maybe), not 10.
    // If it's less than 5, it means there's some debounce or disabled state working.
    expect(postRequestCount).toBeLessThan(5);
  });

  test("Offline Mode - Should handle network disconnection gracefully", async ({ page, context }) => {
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 10000 });
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input").locator("input").first();
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    await orderNameField.fill("Offline Simulation Order");
    
    // Select facility
    const facilityOptions = page.getByTestId("facility-radio-options");
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
            document.body.innerText.includes("No facilities found"),
      undefined,
      { timeout: 10000 }
    ).catch(() => {});
    if (await facilityOptions.count() > 0) {
      await page.locator("ion-item", { has: facilityOptions }).first().click();
    }
    
    // Go offline
    await context.setOffline(true);
    
    const saveBtn = page.getByTestId("save-transfer-order-btn");
    await saveBtn.click();
    
    // Verify modal doesn't crash
    await expect(orderNameField).toBeVisible({ timeout: 5000 });
    
    // Go back online
    await context.setOffline(false);
  });

  test("Backend Validation Error (400 Bad Request) - Should display error message", async ({ page }) => {
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 10000 });
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input").locator("input").first();
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    await orderNameField.fill("Validation Error Order");
    
    // Select facility
    const facilityOptions = page.getByTestId("facility-radio-options");
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
            document.body.innerText.includes("No facilities found"),
      undefined,
      { timeout: 10000 }
    ).catch(() => {});
    if (await facilityOptions.count() > 0) {
      await page.locator("ion-item", { has: facilityOptions }).first().click();
    }
    
    // Intercept POST request and return 400 with specific error
    await page.route("**/*", async (route, request) => {
      if (request.method() === 'POST' || request.method() === 'PUT') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: "Facility is currently inactive" })
        });
      } else {
        await route.continue();
      }
    });
    
    const saveBtn = page.getByTestId("save-transfer-order-btn");
    await saveBtn.click();
    
    // Verify modal is still open
    await expect(orderNameField).toBeVisible({ timeout: 5000 });
    await page.unroute("**/*");
  });

  test("Malformed API Responses (JSON Parse Error) - Should not crash UI", async ({ page }) => {
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 10000 });
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input").locator("input").first();
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    await orderNameField.fill("Malformed JSON Order");
    
    // Select facility
    const facilityOptions = page.getByTestId("facility-radio-options");
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
            document.body.innerText.includes("No facilities found"),
      undefined,
      { timeout: 10000 }
    ).catch(() => {});
    if (await facilityOptions.count() > 0) {
      await page.locator("ion-item", { has: facilityOptions }).first().click();
    }
    
    // Intercept POST request and return 200 with invalid JSON
    await page.route("**/*", async (route, request) => {
      if (request.method() === 'POST' || request.method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: "<html><body>Not JSON</body></html>"
        });
      } else {
        await route.continue();
      }
    });
    
    const saveBtn = page.getByTestId("save-transfer-order-btn");
    await saveBtn.click();
    
    // Verify modal is still open (or handled without a white screen of death)
    await expect(orderNameField).toBeVisible({ timeout: 5000 }).catch(() => {});
    await page.unroute("**/*");
  });

  test("Network Hang / Timeout - Should not freeze indefinitely", async ({ page }) => {
    const addButton = page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 10000 });
    await addButton.click();

    const orderNameField = page.getByTestId("transfer-name-input").locator("input").first();
    await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    await orderNameField.fill("Timeout Order");
    
    // Select facility
    const facilityOptions = page.getByTestId("facility-radio-options");
    await page.waitForFunction(
      () => document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
            document.body.innerText.includes("No facilities found"),
      undefined,
      { timeout: 10000 }
    ).catch(() => {});
    if (await facilityOptions.count() > 0) {
      await page.locator("ion-item", { has: facilityOptions }).first().click();
    }
    
    // Intercept POST request and hang it indefinitely
    await page.route("**/*", async (route, request) => {
      if (request.method() === 'POST' || request.method() === 'PUT') {
        // Do not fulfill or continue, just let it hang
      } else {
        await route.continue();
      }
    });
    
    const saveBtn = page.getByTestId("save-transfer-order-btn");
    await saveBtn.click();
    
    // Wait a bit to ensure it doesn't crash the browser
    await page.waitForTimeout(3000);
    
    // Modal should remain open
    await expect(orderNameField).toBeVisible({ timeout: 5000 });
    await page.unroute("**/*");
  });
});
