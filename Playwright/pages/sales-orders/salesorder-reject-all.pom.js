import SalesOrderFlowPage from "./sales-order-flow.page.js";

export default class SalesOrderRejectAllPom {
  constructor(page) {
    this.flow = new SalesOrderFlowPage(page);
  }

  async prepare() {
    await this.flow.gotoOpenOrders();
    return this.flow.hasOpenOrders();
  }

  async run() {
    await this.flow.expectOpenOrdersLoadedByRejectAll();
    await this.flow.rejectAllOpenOrders();
  }

  async runNegative() {
    await this.flow.expectOpenOrdersLoadedByRejectAll();
    await this.flow.assertRejectConfirmationNotVisibleBeforeAction();
  }
}
