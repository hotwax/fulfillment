import SalesOrderFlowPage from "./sales-order-flow.page.js";

export default class SalesOrderRejectOrderDetailsPom {
  constructor(page) {
    this.flow = new SalesOrderFlowPage(page);
    this.startedFromInProgress = false;
  }

  async prepare() {
    await this.flow.gotoOpenOrders();
    if (await this.flow.hasOpenOrders()) {
      return true;
    }

    // Fallback to In Progress if Open is empty
    await this.flow.goToInProgressTab();
    if (await this.flow.hasOpenOrders()) {
      this.startedFromInProgress = true;
      return true;
    }

    return false;
  }

  async run() {
    if (!this.startedFromInProgress) {
      await this.flow.expectOpenOrdersLoadedByPrintPicklist();
      await this.flow.openFirstOrderDetails();
      await this.flow.pickOrderAndPrint();
    } else {
      await this.flow.openFirstOrderDetails();
    }
    await this.flow.reportIssueAndRejectSingleOrder();
  }

  async runNegative() {
    if (!this.startedFromInProgress) {
      await this.flow.expectOpenOrdersLoadedByPrintPicklist();
      await this.flow.openFirstOrderDetails();
      await this.flow.pickOrderAndPrint();
    } else {
      await this.flow.openFirstOrderDetails();
    }
    await this.flow.assertRejectOrderDisabledBeforeIssueSelection();
  }
}
