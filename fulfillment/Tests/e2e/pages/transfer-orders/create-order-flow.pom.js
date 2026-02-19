import TransferOrderFlowPage from "./transfer-order-flow.page.js";

export default class CreateOrderFlowPom {
  constructor(page) {
    this.flow = new TransferOrderFlowPage(page);
  }

  async run() {
    await this.flow.navigateToTransferOrders();
    await this.flow.createTransferOrder("Order Test");

    await this.flow.openSearchTab();
    await this.flow.searchAndAddProduct("MH08");
    await this.flow.searchAndAddProduct("MH02");
    await this.flow.searchAndAddProduct("MH01");

    await this.flow.setProductQuantity("product-card-btn-01", "12");
    await this.flow.bookProductByQoh("product-card-btn-02");
    await this.flow.removeProduct("product-card-btn-03");

    await this.flow.searchUsingViewMore(
      "MH09",
      "MH09-M-Red10011Add to Transfer",
    );
    await this.flow.resetProductSearch();
    await this.flow.searchAndAddByResult(
      "SKU",
      "SKU11112121Add to Transfer",
    );
    await this.flow.resetProductSearch();
    await this.flow.closeViewMoreModal();

    await this.flow.packAndShipOrder("32563", "FEDEX TEST");
    await this.flow.goToCompletedTransfers();
  }
}
