import TransferOrderFlowPage from "./transfer-order-flow.page.js";

export default class CreateOrderFlowPom {
  constructor(page) {
    this.flow = new TransferOrderFlowPage(page);
  }

  /**
   * Prepares the test by navigating to the Transfer Orders page and 
   * initiating the creation of a new transfer order.
   * @param {string} orderName - The internal name to assign to the transfer order
   * @returns {Promise<boolean>} True if order creation was successful, false if it failed (e.g. no facilities)
   */
  async prepare(orderName = "Order Test") {
    await this.flow.navigateToTransferOrders();
    return await this.flow.createTransferOrder(orderName);
  }

  /**
   * Executes the main transfer order workflow: searching for products,
   * adjusting quantities, and packing/shipping the order.
   * @param {Array<string>} skus - An array of exactly 3 SKUs to add to the order
   */
  async run(skus) {
    const [firstSku, secondSku, thirdSku] = skus;

    // 1. Add 3 distinct products to the transfer order
    await this.flow.openSearchTab();
    await this.flow.searchAndAddProduct(firstSku);
    await this.flow.searchAndAddProduct(secondSku);
    await this.flow.searchAndAddProduct(thirdSku);

    // 2. Perform various item-level operations to test the UI functionality
    await this.flow.setProductQuantity("product-card-btn-01", "12"); // Manually set quantity for first item
    await this.flow.bookProductByQoh("product-card-btn-02");         // Book max available QOH for second item
    await this.flow.removeProduct("product-card-btn-03");            // Remove the third item entirely
    await this.flow.resetProductSearch();                            // Clear search to view order summary

    // 3. Pack the finalized order and move it to shipped status using a tracking number
    await this.flow.packAndShipOrder("32563", "FEDEX TEST");
    
    // 4. Navigate back to the Completed transfers view to verify the order status
    await this.flow.goToCompletedTransfers();
  }
}
