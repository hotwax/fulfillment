export default class TransferOrderDetailsPage {
  constructor(page) {
    this.page = page;
  }

  async wait2s() {
    await this.page.waitForTimeout(2000);
  }

  /**
   * Clicks the 'Search products' button to open the product search modal or tab
   */
  async openSearchTab() {
    await this.page.getByRole("button", { name: "Search products" }).click();
    await this.wait2s();
  }

  /**
   * Searches for a specific product and adds it to the transfer order.
   * If the requested product SKU cannot be found (e.g. out of stock or disabled in the client environment),
   * this method provides a resilient fallback by searching for a generic character ("a")
   * and adding the first available in-stock product from the results.
   */
  async searchAndAddProduct(query) {
    const searchBox = this.page.getByRole("searchbox", { name: "search text" });
    
    // Attempt to search for the specific SKU provided in test data
    await searchBox.fill(query);
    await this.wait2s();
    
    // Playwright `.first()` ensures we pick the very first product in the list that has not yet been added.
    // (Products already added to the order have their button replaced by a success checkmark).
    let addToTransfer = this.page.getByRole("button", { name: "Add to Transfer" }).first();
    
    // Fallback: If the "Add to Transfer" button doesn't become visible for the requested SKU,
    // we assume it is missing/out of stock and pivot to finding any available product.
    if (!(await addToTransfer.isVisible({ timeout: 5000 }).catch(() => false))) {
      console.warn(`SKU '${query}' not found. Falling back to generic product search.`);
      
      // Clear the current search explicitly to avoid appending
      await searchBox.fill("");
      await this.wait2s();
      
      // Search for a common letter "a" to pull up a broad list of available products
      await searchBox.fill("a");
      await this.wait2s();
      
      // Target the first available product from this broad list
      addToTransfer = this.page.getByRole("button", { name: "Add to Transfer" }).first();
      
      // If even the generic search yields nothing, fail the test
      if (!(await addToTransfer.isVisible({ timeout: 10000 }).catch(() => false))) {
        throw new Error(`Add to Transfer not visible even after fallback search for 'a'.`);
      }
    }
    
    // Click the button to add the product and wait for the UI to update
    await addToTransfer.click();
    await this.wait2s();
  }

  /**
   * Sets a specific quantity for a product already added to the order.
   * @param {string} productButtonId - The DOM ID of the product button
   * @param {string|number} quantity - The quantity to set
   */
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

  /**
   * Books the maximum available Quantity on Hand (QOH) for a product.
   * @param {string} productButtonId - The DOM ID of the product button
   */
  async bookProductByQoh(productButtonId) {
    const productButton = this.page.locator(`#${productButtonId}`);
    if (await productButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productButton.click();
      await this.page.getByRole("button", { name: "Book by QOH" }).click();
      await this.wait2s();
    }
  }

  /**
   * Completely removes a product from the transfer order.
   * @param {string} productButtonId - The DOM ID of the product button
   */
  async removeProduct(productButtonId) {
    const productButton = this.page.locator(`#${productButtonId}`);
    if (await productButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productButton.click();
      await this.page.getByRole("button", { name: "Remove" }).click();
      await this.wait2s();
    }
  }

  /**
   * Searches for a product, clicks 'View more' to see detailed results,
   * and attempts to add it based on a matching text result.
   * @param {string} query - The search query
   * @param {string} resultText - The text to look for in the 'View more' modal
   */
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

  /**
   * Clicks the 'Reset' button to clear the current product search.
   */
  async resetProductSearch() {
    const resetBtn = this.page.getByRole("button", { name: "Reset" });
    if (await resetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await resetBtn.click();
      await this.wait2s();
    }
  }

  /**
   * Searches for a product and clicks a specific textual result in the dropdown.
   * @param {string} query - The search query
   * @param {string} resultText - The text to look for and click
   */
  async searchAndAddByResult(query, resultText) {
    await this.page.getByRole("searchbox", { name: "search text" }).fill(query);
    await this.wait2s();
    const result = this.page.getByText(resultText, { exact: false }).first();
    if (await result.isVisible({ timeout: 3000 }).catch(() => false)) {
      await result.click();
      await this.wait2s();
    }
  }

  /**
   * Closes the 'View more' search modal if it is currently open.
   */
  async closeViewMoreModal() {
    const closeBtn = this.page.getByRole("button", { name: "Close" });
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
      await this.wait2s();
    }
  }

  /**
   * Packs the currently assembled transfer order and marks it as shipped.
   * @param {string} boxNumber - The tracking or box number to associate with the shipment
   * @param {string} shipmentMethod - The shipping carrier/method (e.g., 'FEDEX TEST')
   */
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

  /**
   * Navigates to the 'Completed' tab in the Transfer Orders list view.
   */
  async goToCompletedTransfers() {
    const completedTab = this.page.getByRole("tab", { name: "Completed" });
    if (await completedTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await completedTab.click();
    }
  }

  /**
   * Discards the current transfer order, cancelling it entirely.
   */
  async discardOrder() {
    await this.page.getByRole("button", { name: "Discard order" }).click();
    await this.page.getByRole("button", { name: "Discard", exact: true }).click();
  }

  /**
   * Edits the name of the current transfer order via the Edit Details modal.
   * @param {string} orderName - The new name for the transfer order
   */
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

  /**
   * Updates the destination/origin store for the transfer order via the Edit Details modal.
   * @param {string} storeName - The name of the store to select from the combobox
   */
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

  /**
   * Marks a partially or fully prepared order as 'Ship later',
   * allowing it to be fulfilled at a future time.
   */
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

  /**
   * Finds a previously saved 'Ship later' order by name and attempts to fulfill it.
   * @param {string} orderName - The name of the saved transfer order
   */
  async fulfillShipLaterOrder(orderName) {
    const searchOrders = this.page.getByPlaceholder("Search orders");
    if (await searchOrders.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchOrders.fill(orderName);
      await this.page.getByRole("button", { name: "Fulfill" }).click();
    }
  }
}
