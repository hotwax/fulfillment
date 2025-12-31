import { test, expect } from '@playwright/test';

const ensureAlertAction = async (page, actionLabel: RegExp) => {
  const alertButton = page.getByRole('button', { name: actionLabel });
  await expect(alertButton).toBeVisible();
  await alertButton.click();
};

test.describe('Sales order flow sanity', () => {
  test('Open orders list shows order details', async ({ page }) => {
    await page.goto('/open');

    const orderCard = page.getByTestId('open-order-card').first();
    await expect(orderCard).toBeVisible();

    await orderCard.getByTestId('open-order-actions').click();
    await page.getByRole('button', { name: /view details/i }).click();

    await expect(page).toHaveURL(/\/open\/order-detail\//);
    await expect(page.getByTestId('order-detail-card')).toBeVisible();
    await expect(page.getByText(/Ordered/i)).toBeVisible();
  });

  test('In progress order can be packed, unpacked, and shipped', async ({ page }) => {
    await page.goto('/in-progress');

    const orderCard = page.getByTestId('in-progress-order-card').first();
    await expect(orderCard).toBeVisible();

    await orderCard.getByTestId('in-progress-order-actions').click();
    await page.getByRole('button', { name: /view details/i }).click();

    await expect(page).toHaveURL(/\/in-progress\/shipment-detail\//);

    const addBoxButton = page.getByTestId('order-add-box-btn');
    await expect(addBoxButton).toBeVisible();
    await expect(addBoxButton).toBeEnabled();

    const boxChipCount = await page.getByTestId('order-box-chip').count();
    await addBoxButton.click();
    await expect(page.getByTestId('order-box-chip')).toHaveCount(boxChipCount + 1);

    const packButton = page.getByTestId('order-pack-btn');
    await expect(packButton).toBeVisible();
    await expect(packButton).toBeEnabled();
    await packButton.click();

    await ensureAlertAction(page, /^Pack$/i);
    await expect(page).toHaveURL(/\/completed\/shipment-detail\//);

    const unpackButton = page.getByTestId('order-unpack-btn');
    await expect(unpackButton).toBeVisible();
    await expect(unpackButton).toBeEnabled();
    await unpackButton.click();
    await ensureAlertAction(page, /^Unpack$/i);

    await expect(page).toHaveURL(/\/in-progress\/shipment-detail\//);

    await expect(packButton).toBeEnabled();
    await packButton.click();
    await ensureAlertAction(page, /^Pack$/i);
    await expect(page).toHaveURL(/\/completed\/shipment-detail\//);

    const shipButton = page.getByTestId('order-ship-btn');
    await expect(shipButton).toBeVisible();
    await expect(shipButton).toBeEnabled();
    await shipButton.click();

    await expect(page.getByText(/Order shipped successfully/i)).toBeVisible();
  });
});
