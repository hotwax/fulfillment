import TransferOrdersListPage from "./transfer-orders-list.page.js";
import CreateTransferOrderModal from "./create-transfer-order.modal.js";
import TransferOrderDetailsPage from "./transfer-order-details.page.js";

export default class TransferOrderFlowPage {
  constructor(page) {
    this.page = page;
    const configuredBase = process.env.PW_BASE_URL_DEV || "https://fulfillment-dev.hotwax.io";
    this.baseUrl = configuredBase.replace(/\/+$/, "");
    this.listPage = new TransferOrdersListPage(page, this.baseUrl);
    this.createModal = new CreateTransferOrderModal(page);
    this.detailsPage = new TransferOrderDetailsPage(page);
  }

  async navigateToTransferOrders() {
    await this.listPage.navigateToTransferOrders();
  }

  async createTransferOrder(orderName, facility = "") {
    await this.createModal.createTransferOrder(orderName, facility);
  }

  async openSearchTab() {
    await this.detailsPage.openSearchTab();
  }

  async searchAndAddProduct(query) {
    await this.detailsPage.searchAndAddProduct(query);
  }

  async setProductQuantity(productButtonId, quantity) {
    await this.detailsPage.setProductQuantity(productButtonId, quantity);
  }

  async bookProductByQoh(productButtonId) {
    await this.detailsPage.bookProductByQoh(productButtonId);
  }

  async removeProduct(productButtonId) {
    await this.detailsPage.removeProduct(productButtonId);
  }

  async searchUsingViewMore(query, resultText) {
    await this.detailsPage.searchUsingViewMore(query, resultText);
  }

  async resetProductSearch() {
    await this.detailsPage.resetProductSearch();
  }

  async searchAndAddByResult(query, resultText) {
    await this.detailsPage.searchAndAddByResult(query, resultText);
  }

  async closeViewMoreModal() {
    await this.detailsPage.closeViewMoreModal();
  }

  async packAndShipOrder(boxNumber, shipmentMethod) {
    await this.detailsPage.packAndShipOrder(boxNumber, shipmentMethod);
  }

  async goToCompletedTransfers() {
    await this.detailsPage.goToCompletedTransfers();
  }

  async discardOrder() {
    await this.detailsPage.discardOrder();
  }

  async editTransferOrderName(orderName) {
    await this.detailsPage.editTransferOrderName(orderName);
  }

  async updateStoreForTransferOrder(storeName) {
    await this.detailsPage.updateStoreForTransferOrder(storeName);
  }

  async markOrderToShipLater() {
    await this.detailsPage.markOrderToShipLater();
  }

  async fulfillShipLaterOrder(orderName) {
    await this.detailsPage.fulfillShipLaterOrder(orderName);
  }
}
