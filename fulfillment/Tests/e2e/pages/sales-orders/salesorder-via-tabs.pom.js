import SalesOrderFlowPage from "./sales-order-flow.page.js";

export default class SalesOrderViaTabsPom {
  constructor(page) {
    this.flow = new SalesOrderFlowPage(page);
  }

  async prepare() {
    await this.flow.gotoOpenOrders();
    return this.flow.hasOpenOrders();
  }

  async run() {
    await this.flow.expectOpenOrdersLoadedByPrintPicklist();
    await this.flow.printPicklistForFirstTwoOrders();
    await this.flow.goToInProgressTab();
    await this.flow.bulkPackAndShipFromTabs();
  }

  async runNegative() {
    await this.flow.expectOpenOrdersLoadedByPrintPicklist();
    await this.flow.printPicklistForFirstTwoOrders();
    await this.flow.goToInProgressTab();
    await this.flow.assertPackDisabledBeforeDocumentSelection();
  }
}
