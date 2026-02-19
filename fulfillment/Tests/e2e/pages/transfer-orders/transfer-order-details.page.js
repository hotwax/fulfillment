export default class TransferOrderDetailsPage {
  constructor(page) {
    this.page = page;
  }

  async wait2s() {
    await this.page.waitForTimeout(2000);
  }

  async openSearchTab() {
    await this.page.getByRole("button", { name: "Search products" }).click();
    await this.wait2s();
  }

  async searchAndAddProduct(query) {
    await this.page.getByRole("searchbox", { name: "search text" }).fill(query);
    await this.wait2s();
    const addToTransfer = this.page.getByRole("button", { name: "Add to Transfer" }).first();
    if (!(await addToTransfer.isVisible({ timeout: 10000 }).catch(() => false))) {
      throw new Error(`Add to Transfer not visible after searching '${query}'.`);
    }
    await addToTransfer.click();
    await this.wait2s();
  }

  async setProductQuantity(productButtonId, quantity) {
    const productButton = this.page.locator(`#${productButtonId}`);
    if (await productButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productButton.click();
      await this.wait2s();
      await this.page.getByRole("spinbutton").fill(quantity);
      await this.page.getByRole("button", { name: "Save" }).click();
      await this.wait2s();
    }
  }

  async bookProductByQoh(productButtonId) {
    const productButton = this.page.locator(`#${productButtonId}`);
    if (await productButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productButton.click();
      await this.page.getByRole("button", { name: "Book by QOH" }).click();
      await this.wait2s();
    }
  }

  async removeProduct(productButtonId) {
    const productButton = this.page.locator(`#${productButtonId}`);
    if (await productButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productButton.click();
      await this.page.getByRole("button", { name: "Remove" }).click();
      await this.wait2s();
    }
  }

  async searchUsingViewMore(query, resultText) {
    await this.page.getByRole("searchbox", { name: "search text" }).fill(query);
    await this.wait2s();

    const viewMore = this.page.getByRole("button", { name: "View more" });
    if (await viewMore.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewMore.click();
      await this.wait2s();

      const addToTransfer = this.page
        .getByRole("button", { name: "Add to Transfer" })
        .first();
      if (await addToTransfer.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addToTransfer.click();
        await this.wait2s();
      } else {
        const result = this.page.getByText(resultText, { exact: false }).first();
        if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
          await result.click();
          await this.wait2s();
        }
      }
    }
  }

  async resetProductSearch() {
    const resetBtn = this.page.getByRole("button", { name: "Reset" });
    if (await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resetBtn.click();
      await this.wait2s();
    }
  }

  async searchAndAddByResult(query, resultText) {
    await this.page.getByRole("searchbox", { name: "search text" }).fill(query);
    await this.wait2s();
    const result = this.page.getByText(resultText, { exact: false }).first();
    if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
      await result.click();
      await this.wait2s();
    }
  }

  async closeViewMoreModal() {
    const closeBtn = this.page.getByRole("button", { name: "Close" });
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await this.wait2s();
    }
  }

  async packAndShipOrder(boxNumber, shipmentMethod) {
    const packButton = this.page.getByRole("button", { name: "Pack" });
    if (
      !(await packButton.isVisible({ timeout: 3000 }).catch(() => false)) ||
      !(await packButton.isEnabled().catch(() => false))
    ) {
      return;
    }

    await packButton.click();
    const boxNumberInput = this.page.getByPlaceholder("Box number");
    if (!(await boxNumberInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      return;
    }

    await boxNumberInput.fill(boxNumber);
    await this.page.getByRole("combobox", { name: "Shipment method" }).click();
    await this.page.getByRole("option", { name: shipmentMethod, exact: false }).click();
    await this.page.getByRole("button", { name: "Ship", exact: true }).click();
  }

  async goToCompletedTransfers() {
    const completedTab = this.page.getByRole("tab", { name: "Completed" });
    if (await completedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await completedTab.click();
    }
  }

  async discardOrder() {
    await this.page.getByRole("button", { name: "Discard order" }).click();
    await this.page.getByRole("button", { name: "Discard", exact: true }).click();
  }

  async editTransferOrderName(orderName) {
    const editDetailsBtn = this.page.getByRole("button", { name: "Edit details" });
    if (await editDetailsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editDetailsBtn.click();
    } else {
      await this.page.getByRole("button", { name: "Edit" }).first().click();
    }

    const orderNameInput = this.page.getByRole("textbox", { name: "Transfer name" });
    if (await orderNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await orderNameInput.fill(orderName);
    } else {
      await this.page.getByPlaceholder("Enter order name").fill(orderName);
    }
    await this.page.getByRole("button", { name: "Save" }).click();
  }

  async updateStoreForTransferOrder(storeName) {
    const combobox = this.page.getByRole("combobox").first();
    if (await combobox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await combobox.click();
      await this.page.getByRole("option", { name: storeName, exact: false }).click();
      await this.page.getByRole("button", { name: "Save" }).click();
      return;
    }

    const editButtons = this.page.getByRole("button", { name: "Edit" });
    if ((await editButtons.count()) > 1) {
      await editButtons.nth(1).click();
    }

    if (await combobox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await combobox.click();
      await this.page.getByRole("option", { name: storeName, exact: false }).click();
      await this.page.getByRole("button", { name: "Save" }).click();
    }
  }

  async markOrderToShipLater() {
    const addToTransfer = this.page.getByRole("button", { name: "Add to Transfer" }).first();
    if (await addToTransfer.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addToTransfer.click();
    }

    const shipLater = this.page.getByRole("button", { name: "Ship later" });
    if (
      (await shipLater.isVisible({ timeout: 3000 }).catch(() => false)) &&
      (await shipLater.isEnabled().catch(() => false))
    ) {
      await shipLater.click();
    }
  }

  async fulfillShipLaterOrder(orderName) {
    const searchOrders = this.page.getByPlaceholder("Search orders");
    if (await searchOrders.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchOrders.fill(orderName);
      await this.page.getByRole("button", { name: "Fulfill" }).click();
    }
  }
}
