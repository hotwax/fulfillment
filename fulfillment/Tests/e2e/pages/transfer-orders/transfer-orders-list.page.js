export default class TransferOrdersListPage {
  constructor(page, baseUrl) {
    this.page = page;
    this.baseUrl = baseUrl;
  }

  async wait2s() {
    await this.page.waitForTimeout(2000);
  }

  async navigateToTransferOrders() {
    await this.page.goto(`${this.baseUrl}/transfer-orders`, {
      waitUntil: "domcontentloaded",
    });
    await this.wait2s();

    if (this.page.url().includes("launchpad.hotwax.io")) {
      throw new Error(
        "Not authenticated for Fulfillment app. Setup project did not produce a valid storage state.",
      );
    }

    await this.page.getByText("Transfer Orders", { exact: true }).click();
    await this.wait2s();
  }
}
