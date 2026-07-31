import SalesOrderFlowPage from "./sales-order-flow.page.js";

export default class SalesOrderRejectOrderDetailsPom {
  constructor(page) {
    this.flow = new SalesOrderFlowPage(page);
  }

  async prepare() {
    await this.flow.gotoOpenOrders();
    return this.flow.hasOpenOrders();
  }

  async run() {
    await this.flow.expectOpenOrdersLoadedByPrintPicklist();
    await this.flow.openFirstOrderDetails();
    await this.flow.pickOrderAndPrint();
    await this.flow.reportIssueAndRejectSingleOrder();
  }

  async runNegative() {
    await this.flow.expectOpenOrdersLoadedByPrintPicklist();
    await this.flow.openFirstOrderDetails();
    await this.flow.pickOrderAndPrint();
    await this.flow.assertRejectOrderDisabledBeforeIssueSelection();
  }
}
