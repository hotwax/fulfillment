export default class CreateTransferOrderModal {
  constructor(page) {
    this.page = page;
  }

  async wait2s() {
    await this.page.waitForTimeout(2000);
  }

  async createTransferOrder(orderName, facility) {
    const addButtonByTestId = this.page.getByTestId("create-transfer-order-btn");
    if (await addButtonByTestId.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButtonByTestId.click();
    } else {
      await this.page.locator('[data-testid="create-transfer-order-btn"]').click();
    }

    const orderNameField = this.page.getByTestId("transfer-name-input");
    const orderNameInput = orderNameField.locator("input").first();
    let formVisible = await orderNameField.isVisible({ timeout: 3000 }).catch(() => false);

    if (!formVisible) {
      const createTransferOrderButton = this.page.getByRole("button", {
        name: "Create transfer order",
      });
      if (
        await createTransferOrderButton.isVisible({ timeout: 5000 }).catch(() => false)
      ) {
        await createTransferOrderButton.click();
      }

      await orderNameField.waitFor({ state: "visible", timeout: 10000 });
      formVisible = true;
    }

    await orderNameInput.fill(orderName);
    await this.wait2s();

    const loadingText = this.page.getByText("Loading...", { exact: false });
    await loadingText.first().waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});

    const configuredFacility = (process.env.PW_FACILITY || "").trim();
    const preferredFacility = (configuredFacility || facility || "").trim();
    const facilitySearch = this.page.getByTestId("facility-search-input");
    if (preferredFacility && (await facilitySearch.isVisible({ timeout: 2000 }).catch(() => false))) {
      await facilitySearch.fill(preferredFacility);
      await this.wait2s();
    }

    const facilityOptions = this.page.getByTestId("facility-radio-options");
    await this.page
      .waitForFunction(
        () =>
          document.querySelectorAll('[data-testid="facility-radio-options"]').length > 0 ||
          document.body.innerText.includes("No facilities found"),
        undefined,
        { timeout: 60000 },
      )
      .catch(() => {});

    const optionCount = await facilityOptions.count();
    if (optionCount === 0) {
      throw new Error("No facilities available in create transfer order modal.");
    }

    const selectedOption = preferredFacility
      ? facilityOptions.filter({ hasText: new RegExp(preferredFacility, "i") }).first()
      : facilityOptions.first();
    if (await selectedOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectedOption.click();
    } else {
      await facilityOptions.first().click();
    }
    await this.wait2s();

    const saveBtn = this.page.getByTestId("save-transfer-order-btn");
    await saveBtn.waitFor({ state: "visible", timeout: 10000 });
    const saveEnabled = await saveBtn.isEnabled({ timeout: 5000 }).catch(() => false);
    if (!saveEnabled) {
      throw new Error("Save transfer order button is disabled after facility selection.");
    }
    await saveBtn.click();
    await this.wait2s();

    const createDialog = this.page.getByRole("dialog").first();
    if (await createDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createDialog.waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
    }

    const detailUrlMatched = /\/create-transfer-order\/.+/i.test(this.page.url());
    if (detailUrlMatched) return;

    const detailMarkers = [
      this.page.getByRole("heading", { name: "Add items" }).first(),
      this.page.getByRole("textbox", { name: "Scan barcode" }).first(),
      this.page.getByRole("button", { name: "Discard order" }).first(),
      this.page.getByRole("button", { name: "Start scanning" }).first(),
    ];
    for (const marker of detailMarkers) {
      if (await marker.isVisible({ timeout: 10000 }).catch(() => false)) {
        return;
      }
    }

    const createdOrderRow = this.page.getByText(orderName, { exact: false }).first();
    if (await createdOrderRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createdOrderRow.click();
      for (const marker of detailMarkers) {
        if (await marker.isVisible({ timeout: 10000 }).catch(() => false)) {
          return;
        }
      }
    }

    throw new Error(
      `Transfer order details did not open for '${orderName}'. Current URL: ${this.page.url()}`,
    );
  }
}
