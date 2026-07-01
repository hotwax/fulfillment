import TransferOrderFlowPage from "./transfer-order-flow.page.js";

export default class CreateOrderFlowPom {
  constructor(page) {
    this.flow = new TransferOrderFlowPage(page);
  }

  async prepare(orderName = "Order Test") {
    await this.flow.navigateToTransferOrders();
    return await this.flow.createTransferOrder(orderName);
  }

  async run(skus) {
    const [firstSku, secondSku, thirdSku] = skus;

    await this.flow.openSearchTab();
    await this.flow.searchAndAddProduct(firstSku);
    await this.flow.searchAndAddProduct(secondSku);
    await this.flow.searchAndAddProduct(thirdSku);

    await this.flow.setProductQuantity("product-card-btn-01", "12");
    await this.flow.bookProductByQoh("product-card-btn-02");
    await this.flow.removeProduct("product-card-btn-03");
    await this.flow.resetProductSearch();

    await this.flow.packAndShipOrder("32563", "FEDEX TEST");
    await this.flow.goToCompletedTransfers();
  }
}
