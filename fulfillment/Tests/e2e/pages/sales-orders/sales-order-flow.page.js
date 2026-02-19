import { expect } from "@playwright/test";

export default class SalesOrderFlowPage {
  constructor(page) {
    this.page = page;
  }

  async runWithNetworkRetry(action, attempts = 2) {
    let lastError;
    for (let i = 0; i < attempts; i++) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        await this.page.waitForTimeout(2000);
      }
    }
    throw lastError;
  }

  async getHeaderOrderCount() {
    const label = this.page.locator("text=/^\\d+\\s+orders$/").first();
    if (!(await label.isVisible({ timeout: 3000 }).catch(() => false))) return null;
    const text = (await label.textContent()) || "";
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  async gotoOpenOrders() {
    await this.runWithNetworkRetry(async () => {
      await this.page.goto("https://fulfillment-dev.hotwax.io/open", {
        waitUntil: "domcontentloaded",
      });
      await this.page.waitForLoadState("networkidle").catch(() => {});
    });
  }

  async hasOpenOrders() {
    const zeroOrdersLabel = this.page.getByText("0 orders").first();
    if (await zeroOrdersLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      return false;
    }

    const emptyState = this.page
      .locator("main")
      .getByText("doesn't have any outstanding orders right now.")
      .first();
    if (await emptyState.isVisible({ timeout: 3000 }).catch(() => false)) {
      return false;
    }

    return true;
  }

  async expectOpenOrdersLoadedByPrintPicklist() {
    await expect(this.page.getByRole("button", { name: "Print Picklist" })).toBeVisible();
  }

  async expectOpenOrdersLoadedByRejectAll() {
    await expect(this.page.getByRole("button", { name: "Reject all" })).toBeVisible();
  }

  async assertPicklistSaveDisabledBeforeSelection() {
    await this.page.getByRole("button", { name: "Print Picklist" }).click();
    await this.page.waitForTimeout(2000);

    const modal = this.page.locator("ion-modal:visible");
    await expect(modal).toBeVisible();

    const saveBtn = modal.locator("ion-fab-button");
    await expect(saveBtn).toBeVisible();
    await this.page.waitForTimeout(2000);

    const disabled = await saveBtn.evaluate((el) => {
      const className = (el.className || "").toString();
      return (
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        className.includes("disabled")
      );
    });

    expect(disabled).toBeTruthy();
  }

  async printPicklistForFirstTwoOrders() {
    await this.runWithNetworkRetry(async () => {
      await this.page.getByRole("button", { name: "Print Picklist" }).click();
    });
    await this.page.waitForTimeout(2000);

    const modal = this.page.locator("ion-modal:visible");
    const checkboxes = this.page.locator("ion-list ion-item ion-checkbox");

    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(1);

    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();

    await this.page.waitForTimeout(2000);

    const saveBtn = modal.locator("ion-fab-button");
    await expect(saveBtn).toBeVisible();
    await this.page.waitForTimeout(2000);

    const pagesBefore = this.page.context().pages().length;
    await this.runWithNetworkRetry(async () => {
      await saveBtn.click();
    });
    await this.page.waitForTimeout(2000);

    const pagesAfter = this.page.context().pages();
    if (pagesAfter.length > pagesBefore) {
      const pdfPage = pagesAfter[pagesAfter.length - 1];
      if (pdfPage !== this.page) {
        await pdfPage.waitForLoadState().catch(() => {});
        await pdfPage.close().catch(() => {});
      }
    }

    await expect(modal).toBeHidden({ timeout: 15000 });
    await this.page.waitForTimeout(2000);
  }

  async goToInProgressTab() {
    const inProgressTab = this.page.locator("ion-item", { hasText: "In Progress" });
    await expect(inProgressTab).toBeVisible();
    await this.runWithNetworkRetry(async () => {
      await inProgressTab.click();
    });
    await this.page.waitForTimeout(2000);
  }

  async clickAddBoxForFirstEligibleOrder() {
    const orders = this.page.locator("ion-card.order");
    const orderCount = await orders.count();

    await this.page.waitForTimeout(2000);

    let addBoxClicked = false;

    for (let i = 0; i < orderCount; i++) {
      const order = orders.nth(i);

      await this.page.waitForTimeout(2000);

      const lineItems = order.locator(".order-line-item");
      const itemCount = await lineItems.count();

      await this.page.waitForTimeout(2000);

      if (itemCount >= 2) {
        const addBoxBtn = order.locator(
          'ion-button:has-text("Add Box"):not([disabled]):not([aria-disabled="true"])',
        );

        if ((await addBoxBtn.count()) > 0) {
          await this.page.waitForTimeout(2000);
          await addBoxBtn.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(2000);
          await expect(addBoxBtn).toBeVisible();
          await this.page.waitForTimeout(2000);
          await addBoxBtn.click();
          await this.page.waitForTimeout(2000);
          addBoxClicked = true;
          break;
        }
      } else {
        await this.page.waitForTimeout(2000);
      }
    }

    await this.page.waitForTimeout(2000);
    expect(addBoxClicked).toBeTruthy();
    await this.page.waitForTimeout(2000);
  }

  async bulkPackAndShipFromTabs() {
    const beforePackCount = await this.getHeaderOrderCount();

    const packOrdersBtn = this.page.getByRole("button", { name: "Pack orders" });
    await expect(packOrdersBtn).toBeVisible();
    await this.runWithNetworkRetry(async () => {
      await packOrdersBtn.click();
    });
    await this.page.waitForTimeout(2000);

    const packAlert = this.page
      .locator("ion-alert, .alert-wrapper")
      .filter({ hasText: "Pack orders" })
      .first();

    await packAlert.getByRole("checkbox", { name: "Shipping labels" }).click();
    await packAlert.getByRole("checkbox", { name: "Packing slip" }).click();
    await this.page.waitForTimeout(2000);

    await this.page.waitForTimeout(2000);

    const pagesBefore = this.page.context().pages().length;
    await this.runWithNetworkRetry(async () => {
      await this.page.getByRole("button", { name: "Pack" }).click();
    });

    await this.page.waitForTimeout(2000);

    const pagesAfter = this.page.context().pages();
    if (pagesAfter.length > pagesBefore) {
      const pdfPage2 = pagesAfter[pagesAfter.length - 1];
      if (pdfPage2 !== this.page) {
        await pdfPage2.waitForLoadState().catch(() => {});
        await pdfPage2.close().catch(() => {});
      }
    }

    await this.page.waitForTimeout(2000);

    await this.page.bringToFront();

    const completedTab = this.page.locator("ion-item", { hasText: "Completed" });
    await expect(completedTab).toBeVisible();
    await this.runWithNetworkRetry(async () => {
      await completedTab.click();
    });
    await this.page.waitForTimeout(2000);

    const shipBtn = this.page.locator("ion-button.bulk-action", { hasText: "Ship" });
    await expect(shipBtn).toBeVisible();
    await this.runWithNetworkRetry(async () => {
      await shipBtn.click();
    });

    await this.page.waitForTimeout(2000);

    const alert = this.page.locator("div.alert-wrapper");
    await expect(alert).toBeVisible();

    const shipAlertBtn = alert.getByText("Ship", { exact: true });
    await this.runWithNetworkRetry(async () => {
      await shipAlertBtn.click();
    });
    await this.page.waitForTimeout(2000);

    const afterShipCount = await this.getHeaderOrderCount();
    if (beforePackCount !== null && afterShipCount !== null) {
      expect(afterShipCount).toBeLessThanOrEqual(beforePackCount);
    }
  }

  async assertPackDisabledBeforeDocumentSelection() {
    const packOrdersBtn = this.page.getByRole("button", { name: "Pack orders" });
    await expect(packOrdersBtn).toBeVisible();
    await packOrdersBtn.click();
    await this.page.waitForTimeout(2000);

    const packAlert = this.page
      .locator("ion-alert, .alert-wrapper")
      .filter({ hasText: "Pack orders" });
    await expect(packAlert).toBeVisible();

    const packBtn = packAlert
      .locator('button:has-text("Pack"), ion-button:has-text("Pack")')
      .first();
    await expect(packBtn).toBeVisible();

    const disabled = await packBtn.evaluate((el) => {
      const className = (el.className || "").toString();
      return (
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        className.includes("disabled")
      );
    });

    expect(disabled).toBeTruthy();
  }

  async rejectAllOpenOrders() {
    const rejectAllBtn = this.page.getByRole("button", { name: "Reject all" });
    await expect(rejectAllBtn).toBeVisible();
    await expect(rejectAllBtn).toBeEnabled();
    await rejectAllBtn.click();

    await this.page.waitForTimeout(2000);

    const rejectConfirmBtn = this.page.getByRole("button", {
      name: "Reject",
      exact: true,
    });

    await this.page.waitForTimeout(2000);
    await expect(rejectConfirmBtn).toBeVisible();
    await rejectConfirmBtn.click();
  }

  async assertRejectConfirmationNotVisibleBeforeAction() {
    const rejectConfirmBtn = this.page.getByRole("button", {
      name: "Reject",
      exact: true,
    });
    await expect(rejectConfirmBtn).not.toBeVisible();
  }

  async openFirstOrderDetails() {
    const orderCard = this.page.locator("ion-chip").nth(0);
    await expect(orderCard).toBeVisible();
    await orderCard.click();
    await this.page.waitForTimeout(2000);

    const viewDetailsBtn = this.page.getByRole("button", { name: "View details" });
    await expect(viewDetailsBtn).toBeVisible();
    await viewDetailsBtn.click();
  }

  async pickOrderAndPrint() {
    const pickOrderBtn = this.page.getByRole("button", { name: "Pick order" });
    await expect(pickOrderBtn).toBeVisible();
    await pickOrderBtn.click();
    await this.page.waitForTimeout(2000);

    const modal = this.page.locator("ion-modal:visible");
    const checkboxes = this.page.locator("ion-list ion-item ion-checkbox");

    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(1);

    await checkboxes.nth(0).click();
    await checkboxes.nth(1).click();

    await this.page.waitForTimeout(2000);

    const saveBtn = modal.locator("ion-fab-button");
    await expect(saveBtn).toBeVisible();

    await this.page.waitForTimeout(2000);

    const pagesBefore = this.page.context().pages().length;
    await saveBtn.click();

    await this.page.waitForTimeout(2000);

    const pagesAfter = this.page.context().pages();
    if (pagesAfter.length > pagesBefore) {
      const pdfPage = pagesAfter[pagesAfter.length - 1];
      if (pdfPage !== this.page) {
        await pdfPage.waitForLoadState().catch(() => {});
        await pdfPage.close().catch(() => {});
      }
    }

    await expect(modal).toBeHidden();
    await this.page.waitForTimeout(2000);
  }

  async reportIssueAndRejectSingleOrder() {
    const reportIssueBtn = this.page
      .locator("ion-button", { hasText: "Report an issue" })
      .filter({ has: this.page.locator(":not([aria-disabled='true'])") })
      .first();

    await reportIssueBtn.click();

    await this.page
      .locator("ion-popover:visible ion-item", { hasText: "FOR TESTING" })
      .click();

    await this.page.waitForTimeout(2000);

    const persistedReason = this.page
      .locator("ion-chip, ion-item, ion-label, ion-note")
      .filter({ hasText: "FOR TESTING" })
      .first();
    await expect(persistedReason).toBeVisible();

    const rejectOrderBtn = this.page
      .locator("div.actions")
      .locator("ion-button", { hasText: "Reject order" });

    await expect(rejectOrderBtn).toBeVisible();
    await expect(rejectOrderBtn).not.toHaveAttribute("aria-disabled", "true");
    await rejectOrderBtn.click();

    await this.page.waitForTimeout(2000);

    const reportBtn = this.page
      .locator(".alert-wrapper")
      .locator("button.alert-button-role-confirm");

    await expect(reportBtn).toBeVisible();
    await reportBtn.click();
    await this.page.waitForTimeout(2000);
  }

  async assertRejectOrderDisabledBeforeIssueSelection() {
    const rejectOrderBtn = this.page
      .locator("div.actions")
      .locator("ion-button", { hasText: "Reject order" });

    await expect(rejectOrderBtn).toBeVisible();

    const disabled = await rejectOrderBtn.evaluate((el) => {
      const className = (el.className || "").toString();
      return (
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        className.includes("disabled")
      );
    });

    expect(disabled).toBeTruthy();
    await this.page.waitForTimeout(2000);
  }
}
