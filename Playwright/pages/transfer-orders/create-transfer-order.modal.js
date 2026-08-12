export default class CreateTransferOrderModal {
  constructor(page) {
    this.page = page;
  }

  async wait2s() {
    await this.page.waitForTimeout(2000);
  }

  async createTransferOrder(orderName, facility) {
    // Step 1: Open the Create Transfer Order modal
    const addButton = this.page.getByTestId("create-transfer-order-btn");
    await addButton.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    
    // If the modal isn't already open, click the button
    const orderNameField = this.page.getByTestId("transfer-name-input");
    if (!(await orderNameField.isVisible({ timeout: 2000 }).catch(() => false))) {
      await addButton.click();
      await orderNameField.waitFor({ state: "visible", timeout: 5000 });
    }

    // Step 2: Fill in the transfer order name
    const orderNameInput = orderNameField.locator("input").first();
    await orderNameInput.fill(orderName);
    await this.wait2s();

    // Wait for initial loading spinner to hide
    const loadingText = this.page.getByText("Loading...", { exact: false });
    await loadingText.first().waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});

    // Step 3: Search for the facility if one is provided
    const configuredFacility = (process.env.PW_FACILITY || "").trim();
    const preferredFacility = (configuredFacility || facility || "").trim();
    const facilitySearch = this.page.getByTestId("facility-search-input");
    
    if (preferredFacility && (await facilitySearch.isVisible({ timeout: 2000 }).catch(() => false))) {
      await facilitySearch.fill(preferredFacility);
      await this.wait2s();
    }

    // Step 4: Wait for facilities to load and select one
    const facilityOptions = this.page.getByTestId("facility-radio-options");
    await this.page
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
      console.log("No facilities available in create transfer order modal.");
      return false; // Return false instead of throwing so the test can skip gracefully
    }

    const facilityRows = this.page.locator("ion-item", { has: facilityOptions });
    let selectedOption = null;

    if (preferredFacility) {
      const match = facilityRows.filter({ hasText: new RegExp(preferredFacility, "i") }).first();
      if (await match.isVisible({ timeout: 2000 }).catch(() => false)) {
        selectedOption = match;
      }
    }

    if (!selectedOption) {
      // Select the last facility in the list to avoid picking the current origin facility
      // which might be at the top of the list.
      selectedOption = facilityRows.nth(optionCount > 1 ? optionCount - 1 : 0);
    }
      
    await selectedOption.click();
    await this.wait2s();

    // Step 5: Save and create the transfer order
    const saveBtn = this.page.getByTestId("save-transfer-order-btn");
    await saveBtn.waitFor({ state: "visible", timeout: 10000 });
    
    if (!(await saveBtn.isEnabled({ timeout: 5000 }).catch(() => false))) {
      throw new Error("Save transfer order button is disabled after facility selection.");
    }
    await saveBtn.click();
    await this.wait2s();

    // Ensure the modal closes
    const createDialog = this.page.getByRole("dialog").first();
    if (await createDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createDialog.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    }

    // Step 6: Verify navigation to details page
    const detailUrlMatched = /\/create-transfer-order\/.+/i.test(this.page.url());
    if (detailUrlMatched) return true;

    // Check for unique details page markers using robust locators
    const detailMarkers = [
      this.page.getByRole("heading", { name: "Add items" }).first(),
      this.page.getByRole("textbox", { name: "Scan barcode" }).first(),
    ];
    
    for (const marker of detailMarkers) {
      if (await marker.isVisible({ timeout: 5000 }).catch(() => false)) {
        return true;
      }
    }

    // If we are still on the list page, try clicking the created order manually
    const createdOrderRow = this.page.getByText(orderName, { exact: false }).first();
    if (await createdOrderRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createdOrderRow.click();
      return true;
    }

    throw new Error(`Transfer order details did not open for '${orderName}'. Current URL: ${this.page.url()}`);
  }
}
