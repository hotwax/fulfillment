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
      await this.page.goto("/open", {
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
    // Try multiple strategies to find the Print Picklist button
    const button = this.page
      .locator("ion-button", { hasText: /Print\s*Picklist/i })
      .first();
    await expect(button).toBeVisible({ timeout: 5000 });
  }

  async expectOpenOrdersLoadedByRejectAll() {
    // Try multiple strategies to find the Reject all button
    const button = this.page
      .locator("ion-button", { hasText: /Reject\s*all/i })
      .first();
    await expect(button).toBeVisible({ timeout: 5000 });
  }

  async assertPicklistSaveDisabledBeforeSelection() {
    const printBtn = this.page.locator("ion-button", { hasText: /Print\s*Picklist/i }).first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();
    await this.page.waitForTimeout(1500);

    // Find the modal - it could be ion-modal or another modal container
    const modal = this.page.locator("ion-modal").first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    const saveBtn = modal.locator("ion-fab-button").first();
    await expect(saveBtn).toBeVisible({ timeout: 3000 });
    await this.page.waitForTimeout(500);

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

  async getPackOrderUIErrorText() {
    const errorModal = this.page.locator(
      "ion-modal, ion-alert, [role='dialog'], [role='alertdialog'], .modal-wrapper, .alert-wrapper"
    ).filter({ hasText: /Gateway error|Unable to automatically fetch|Failed to pack order/i }).first();

    if ((await errorModal.count().catch(() => 0)) === 0) {
      throw new Error("Pack order error modal was not found");
    }

    await expect(errorModal).toBeVisible({ timeout: 10000 });

    const errorTextLocator = errorModal.locator("ion-item ion-label, ion-label, .overline, p.overline").filter({ hasText: /Gateway error|Failed to pack order|Unable to automatically fetch/i }).first();
    await expect(errorTextLocator).toBeVisible({ timeout: 10000 });

    return (await errorTextLocator.textContent())?.trim() || "";
  }

  async getPackOrderUIErrorTextIfVisible() {
    const errorModal = this.page.locator(
      "ion-modal, ion-alert, [role='dialog'], [role='alertdialog'], .modal-wrapper, .alert-wrapper"
    ).filter({ hasText: /Gateway error|Unable to automatically fetch|Failed to pack order/i }).first();

    const count = await errorModal.count().catch(() => 0);
    if (count > 0 && await errorModal.isVisible().catch(() => false)) {
      const errorTextLocator = errorModal.locator("ion-item ion-label, ion-label, .overline, p.overline, .alert-message").filter({ hasText: /Gateway error|Failed to pack order|Unable to automatically fetch/i }).first();
      if (await errorTextLocator.isVisible().catch(() => false)) {
        return (await errorTextLocator.textContent().catch(() => null))?.trim() || "";
      }
    }
    return null;
  }

  async assertPackOrderUIErrorText(expectedText) {
    const errorText = await this.getPackOrderUIErrorText();
    if (expectedText instanceof RegExp) {
      expect(errorText).toMatch(expectedText);
    } else if (typeof expectedText === "string") {
      expect(errorText).toContain(expectedText);
    }
  }

  async printPicklistForFirstTwoOrders() {
    // Click Print Picklist and wait for the modal to open
    const printBtn = this.page.locator("ion-button", { hasText: /Print\s*Picklist/i }).first();
    await this.runWithNetworkRetry(async () => {
      await printBtn.click();
    });

    // Wait for modal to appear
    const modal = this.page.locator("ion-modal").first();
    await modal.waitFor({ state: "visible", timeout: 10000 });
    await this.page.waitForTimeout(500);

    // Find checkboxes more flexibly
    const checkboxes = modal.locator("ion-checkbox");
    await checkboxes.first().waitFor({ state: "visible", timeout: 3000 }).catch(() => {});

    const count = await checkboxes.count();
    if (count < 1) {
      throw new Error(`Expected at least 1 checkbox, but found ${count}`);
    }

    // Select up to the first two orders (or pickers) if not already selected
    const ordersToSelect = Math.min(2, count);
    for (let i = 0; i < ordersToSelect; i++) {
      const isChecked = await checkboxes.nth(i).isChecked().catch(() => false);
      if (isChecked) {
        // Uncheck to force change detection
        await checkboxes.nth(i).evaluate((el) => el.click());
        await this.page.waitForTimeout(300);
      }
      // Check it
      await checkboxes.nth(i).evaluate((el) => el.click());
      await this.page.waitForTimeout(300);
    }

    const html = await modal.innerHTML();
    console.log("MODAL HTML:", html);

    const saveBtn = modal.locator("ion-fab-button").first();
    await expect(saveBtn).toBeVisible({ timeout: 3000 });

    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
      this.runWithNetworkRetry(async () => {
        await saveBtn.evaluate((el) => el.click());
      })
    ]);

    if (newPage) {
      await newPage.waitForLoadState().catch(() => {});
      await newPage.close().catch(() => {});
    }

    // Try waiting for the modal to hide
    const isHidden = await modal.isHidden().catch(() => false);
    if (!isHidden) {
      // Fallback: click the close button in the header if it didn't close
      const closeBtn = modal.locator('ion-header ion-button').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.evaluate((el) => el.click());
      }
    }

    await expect(modal).toBeHidden({ timeout: 15000 });
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
    const orders = this.page.locator("ion-card, .order-card, .order-row, [data-testid='order-card'], [role='listitem']");
    await orders.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const orderCount = await orders.count();

    for (let i = 0; i < orderCount; i++) {
      const order = orders.nth(i);
      if (!(await order.isVisible({ timeout: 2000 }).catch(() => false))) continue;

      const addBoxBtn = order.locator("ion-button, button", { hasText: /Add\s*Box/i }).first();
      const isDisabled = await addBoxBtn.evaluate((el) => {
        if (!el) return true;
        return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || el.className.toString().includes("disabled");
      }).catch(() => true);
      if (isDisabled) continue;

      const lineItems = order.locator("ion-item, .order-line-item, .line-item, [data-testid='line-item']");
      const itemCount = await lineItems.count().catch(() => 0);
      if (itemCount <= 1) continue;

      await expect(addBoxBtn).toBeVisible({ timeout: 10000 });
      await expect(addBoxBtn).toBeEnabled();
      await addBoxBtn.scrollIntoViewIfNeeded();

      const boxChips = order.locator(".box-type ion-chip");
      let currentBoxCount = await boxChips.count();

      // Add boxes until the number of boxes equals the number of items
      while (currentBoxCount < itemCount) {
        await addBoxBtn.evaluate((el) => el.click());
        await expect(boxChips).toHaveCount(currentBoxCount + 1, { timeout: 10000 });
        currentBoxCount++;
      }

      // Verify that after reaching the item count, the "Add Box" button becomes disabled
      const isNowDisabled = await addBoxBtn.evaluate((el) => {
        return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || el.className.toString().includes("disabled");
      });
      expect(isNowDisabled).toBeTruthy();

      return true;
    }

    return false;
  }

  async assertAddBoxDisabledForIneligibleOrder() {
    const orders = this.page.locator("ion-card, .order-card, .order-row, [data-testid='order-card'], [role='listitem']");
    await orders.first().waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    const orderCount = await orders.count();

    for (let i = 0; i < orderCount; i++) {
      const order = orders.nth(i);
      if (!(await order.isVisible({ timeout: 2000 }).catch(() => false))) continue;

      const lineItems = order.locator("ion-item, .order-line-item, .line-item, [data-testid='line-item']");
      const itemCount = await lineItems.count().catch(() => 0);
      
      // An order is ineligible for "Add Box" if it has 1 or fewer items.
      if (itemCount <= 1) {
        const addBoxBtn = order.locator("ion-button, button", { hasText: /Add\s*Box/i }).first();
        if (await addBoxBtn.isVisible().catch(() => false)) {
          const isDisabled = await addBoxBtn.evaluate((el) => {
            return el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true" || el.className.toString().includes("disabled");
          });
          expect(isDisabled).toBeTruthy();
          return true; // found and asserted
        }
      }
    }
    return false;
  }

  async bulkPackAndShipFromTabs() {
    const beforePackCount = await this.getHeaderOrderCount();

    const packOrdersBtn = this.page.locator("ion-button, button, [role='button']", { hasText: /Pack\s*orders/i }).first();
    await expect(packOrdersBtn).toBeVisible({ timeout: 8000 });
    await this.runWithNetworkRetry(async () => {
      await packOrdersBtn.click();
    });

    let dialog = this.page.locator("ion-alert, ion-modal, [role='alertdialog'], [role='dialog'], .alert-wrapper, .modal-wrapper").filter({ hasText: /Pack orders/i }).first();
    if ((await dialog.count().catch(() => 0)) === 0) {
      dialog = this.page.locator("ion-alert, ion-modal, [role='alertdialog'], [role='dialog'], .alert-wrapper, .modal-wrapper").first();
    }
    await dialog.waitFor({ state: "visible", timeout: 10000 });

    const dialogCheckboxes = dialog.locator("ion-checkbox, input[type='checkbox'], [role='checkbox']");
    const pageCheckboxes = this.page.locator("ion-checkbox, input[type='checkbox'], [role='checkbox']");

    const actualCheckboxes = (await dialogCheckboxes.count().catch(() => 0)) >= 2 ? dialogCheckboxes : pageCheckboxes;
    if ((await actualCheckboxes.count().catch(() => 0)) >= 2) {
      await expect(actualCheckboxes.first()).toBeVisible({ timeout: 5000 });
      await this.page.waitForTimeout(300);
      await actualCheckboxes.nth(0).click();
      await this.page.waitForTimeout(300);
      await actualCheckboxes.nth(1).click();
      await this.page.waitForTimeout(500);
    }

    let packBtn = dialog.locator("ion-button, button, [role='button']", { hasText: /^Pack$/i }).first();
    if ((await packBtn.count().catch(() => 0)) === 0) {
      packBtn = this.page.locator("ion-button, button, [role='button']", { hasText: /^Pack$/i }).first();
    }
    await expect(packBtn).toBeVisible({ timeout: 10000 });

    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
      this.runWithNetworkRetry(async () => {
        await packBtn.click({ force: true, timeout: 5000 });
      })
    ]);

    await expect(dialog).toBeHidden({ timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(1500);

    if (newPage) {
      await newPage.waitForLoadState().catch(() => {});
      await newPage.close().catch(() => {});
    }

    await this.page.bringToFront();
    await this.page.waitForTimeout(1500);

    const packErrorText = await this.getPackOrderUIErrorTextIfVisible();
    if (packErrorText) {
      throw new Error(`Pack order UI error displayed: ${packErrorText}`);
    }

    const completedTab = this.page.locator("ion-item, button, [role='option']", { hasText: /Completed/i }).first();
    await expect(completedTab).toBeVisible({ timeout: 10000 });
    await this.runWithNetworkRetry(async () => {
      await completedTab.click();
    });
    await this.page.waitForTimeout(1500);

    const shipBtn = this.page.locator("ion-button, button, [role='button']", { hasText: /^Ship$/i }).first();
    await expect(shipBtn).toBeVisible({ timeout: 10000 });
    await this.runWithNetworkRetry(async () => {
      await shipBtn.click();
    });

    let shipDialog = this.page.locator("ion-alert, ion-modal, [role='alertdialog'], [role='dialog'], .alert-wrapper, .modal-wrapper").first();
    const shipDialogCount = await shipDialog.count().catch(() => 0);
    if (shipDialogCount > 0) {
      await shipDialog.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});
    } else {
      shipDialog = this.page.locator("body");
    }

    let shipConfirmBtn = shipDialog.locator("ion-button, button, [role='button']", { hasText: /Ship|Confirm|Yes|Proceed/i }).first();
    if ((await shipConfirmBtn.count().catch(() => 0)) === 0) {
      shipConfirmBtn = this.page.locator("ion-button, button, [role='button']", { hasText: /Ship|Confirm|Yes|Proceed/i }).first();
    }
    await expect(shipConfirmBtn).toBeVisible({ timeout: 10000 });
    await this.runWithNetworkRetry(async () => {
      await shipConfirmBtn.click({ force: true, timeout: 5000 });
    });

    await this.page.waitForTimeout(1500);
    const afterShipCount = await this.getHeaderOrderCount();
    if (beforePackCount !== null && afterShipCount !== null) {
      expect(afterShipCount).toBeLessThanOrEqual(beforePackCount);
    }
  }

  async assertPackDisabledBeforeDocumentSelection() {
    // Select first two orders to enable the Pack orders button
    const items = this.page.locator("ion-item.order-item, .order-item");
    if (await items.count() > 0) {
      for (let i = 0; i < Math.min(2, await items.count()); i++) {
        const checkbox = items.nth(i).locator("ion-checkbox, input[type='checkbox']").first();
        if (await checkbox.isVisible()) {
          await checkbox.click({ force: true }).catch(() => {});
        }
      }
    }

    const packOrdersBtn = this.page.locator("ion-button, button", { hasText: /Pack\s*orders/i }).first();
    await expect(packOrdersBtn).toBeVisible({ timeout: 5000 });
    await packOrdersBtn.click({ force: true, timeout: 5000 });
    await this.page.waitForTimeout(1500);

    // Wait for checkboxes to appear
    await this.page.waitForFunction(
      () => document.querySelectorAll('ion-checkbox, input[type="checkbox"]').length > 0,
      { timeout: 10000 }
    ).catch(() => {});

    const packBtn = this.page.locator("ion-button, button", { hasText: /^Pack$/i }).first();
    await expect(packBtn).toBeVisible({ timeout: 5000 });

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
    const rejectAllBtn = this.page.locator("ion-button", { hasText: /Reject\s*all/i }).first();
    await expect(rejectAllBtn).toBeVisible({ timeout: 5000 });
    await expect(rejectAllBtn).toBeEnabled();
    await rejectAllBtn.click();

    await this.page.waitForTimeout(1500);

    const rejectConfirmBtn = this.page.locator("ion-button, button", { hasText: /^Reject$/i }).first();
    await this.page.waitForTimeout(500);
    await expect(rejectConfirmBtn).toBeVisible({ timeout: 5000 });
    await rejectConfirmBtn.click();
  }

  async assertRejectConfirmationNotVisibleBeforeAction() {
    const rejectConfirmBtn = this.page.locator("ion-button, button", { hasText: /^Reject$/i }).first();
    await expect(rejectConfirmBtn).not.toBeVisible({ timeout: 3000 });
  }

  async openFirstOrderDetails() {
    const viewDetailsBtn = this.page.locator("button, ion-button, ion-item, [role='option'], [role='menuitem'], [aria-label*='View']", {
      hasText: /View\s*details/i,
    }).first();

    if ((await viewDetailsBtn.count().catch(() => 0)) > 0) {
      await expect(viewDetailsBtn).toBeVisible({ timeout: 8000 });
      await viewDetailsBtn.click();
      await this.page.waitForTimeout(1500);
      return;
    }

    const orderRow = this.page.locator("ion-card, .order-card, .order-row, [data-testid='order-card'], .order-item, ion-item, button", {
      hasText: /#|Order|KREWE|CREW|ASTOR|SKYLAR/i,
    }).first();
    await expect(orderRow).toBeVisible({ timeout: 10000 });
    await orderRow.scrollIntoViewIfNeeded();
    await orderRow.click();
    await this.page.waitForTimeout(1500);

    const popoverViewDetails = this.page.locator("button, ion-button, ion-item, [role='option'], [role='menuitem'], [aria-label*='View']", {
      hasText: /View\s*details/i,
    }).first();

    if ((await popoverViewDetails.count().catch(() => 0)) > 0) {
      await expect(popoverViewDetails).toBeVisible({ timeout: 8000 });
      await popoverViewDetails.click();
      await this.page.waitForTimeout(1500);
      return;
    }

    // If clicking the order row opens details directly, proceed.
    await this.page.waitForTimeout(1500);
  }

  async pickOrderAndPrint() {
    const pickOrderBtn = this.page.locator("ion-button, button", { hasText: /Pick\s*order/i }).first();
    await expect(pickOrderBtn).toBeVisible({ timeout: 10000 });
    await pickOrderBtn.click();
    await this.page.waitForTimeout(1500);

    const dialog = this.page.locator("ion-modal, ion-alert, [role='dialog'], [role='alertdialog'], .modal-wrapper, .alert-wrapper").first();
    await dialog.waitFor({ state: "visible", timeout: 10000 });

    const checkboxes = dialog.locator("ion-checkbox, input[type='checkbox']");
    await expect(checkboxes.first()).toBeVisible({ timeout: 10000 });

    const count = await checkboxes.count();
    if (count < 2) {
      throw new Error(`Expected at least 2 checkboxes in pick order dialog, but found ${count}`);
    }

    await checkboxes.nth(0).click();
    await this.page.waitForTimeout(300);
    await checkboxes.nth(1).click();
    await this.page.waitForTimeout(300);

    const saveBtn = dialog.locator("ion-fab-button, ion-button, button", { hasText: /Save|Print/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    await this.page.waitForTimeout(500);

    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null),
      saveBtn.click()
    ]);

    await this.page.waitForTimeout(1500);

    if (newPage) {
      await newPage.waitForLoadState().catch(() => {});
      await newPage.close().catch(() => {});
    }

    await expect(dialog).toBeHidden({ timeout: 10000 });
    await this.page.waitForTimeout(500);
  }

  async reportIssueAndRejectSingleOrder() {
    const reportIssueBtn = this.page.locator("ion-button, button", { hasText: /Report\s*an\s*issue/i }).first();
    await expect(reportIssueBtn).toBeVisible({ timeout: 10000 });
    await reportIssueBtn.click();
    await this.page.waitForTimeout(1200);

    const popup = this.page.locator("ion-popover, ion-alert, ion-modal, .popover, .modal, [role='dialog'], [role='alertdialog']").first();
    await popup.waitFor({ state: "visible", timeout: 10000 }).catch(() => {});

    let issueOption = popup.locator("button, ion-button, ion-item, [role='option'], [role='menuitem']", { hasText: /FOR\s*TESTING/i }).first();
    if ((await issueOption.count().catch(() => 0)) === 0) {
      issueOption = this.page.locator("button, ion-button, ion-item, [role='option'], [role='menuitem'], text=/FOR\\s*TESTING/i").first();
    }

    await expect(issueOption).toBeVisible({ timeout: 10000 });
    await issueOption.click();
    await this.page.waitForTimeout(1500);

    const persistedReason = this.page.locator("ion-chip, ion-item, ion-label, ion-note, .chip, .selected-reason", { hasText: /FOR\s*TESTING/i }).first();
    await expect(persistedReason).toBeVisible({ timeout: 10000 });

    const rejectOrderBtn = this.page.locator("ion-button, button, [role='button']", { hasText: /Reject\s*order/i }).first();
    await expect(rejectOrderBtn).toBeVisible({ timeout: 10000 });
    await expect(rejectOrderBtn).not.toHaveAttribute("aria-disabled", "true");
    await rejectOrderBtn.click();
    await this.page.waitForTimeout(1500);

    const confirmBtn = this.page.locator("ion-alert button, .alert-wrapper button, button", { hasText: /Reject|Confirm|Yes/i }).first();
    await expect(confirmBtn).toBeVisible({ timeout: 10000 });
    await confirmBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async assertRejectOrderDisabledBeforeIssueSelection() {
    const rejectOrderBtn = this.page.locator("ion-button", { hasText: /Reject\s*order/i }).first();
    await expect(rejectOrderBtn).toBeVisible({ timeout: 5000 });

    const disabled = await rejectOrderBtn.evaluate((el) => {
      const className = (el.className || "").toString();
      return (
        el.hasAttribute("disabled") ||
        el.getAttribute("aria-disabled") === "true" ||
        className.includes("disabled")
      );
    });

    expect(disabled).toBeTruthy();
    await this.page.waitForTimeout(500);
  }
}
