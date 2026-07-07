import { expect, test } from '@playwright/test'

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
})

test('high angle mobile drawer stages changes until save', async ({ page }) => {
  await page.goto('/tests/visual/inspection-mobile-parity.html')

  const section = page.locator('[data-visual-case="high-angle"]')
  await expect(section).toBeVisible()
  await expect(section.getByText('Locker A', { exact: true })).toBeVisible()
  await expect(section.getByText('Row 1 - Qty 2', { exact: true })).toHaveCount(0)
  await section.getByText('Locker A', { exact: true }).click()
  await expect(section.getByText('Not checked', { exact: true })).toBeVisible()
  await expect(section.getByText('Row 1 - Qty 2', { exact: true })).toBeVisible()
  await expect(section.getByText('Row 1 - Qty 2 | Locker A')).toHaveCount(0)

  await section.getByText('Rescue Rope', { exact: true }).click()
  let drawer = page.locator('.offcanvas.show').last()
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Row 1 - Qty 2 | Locker A - Top shelf')).toBeVisible()
  await expect(drawer.getByText('No changes')).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Save' })).toBeDisabled()

  await drawer.getByRole('button', { name: 'Good', exact: true }).click()
  await expect(drawer.getByText('Unsaved changes')).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Save' })).toBeEnabled()
  await drawer.getByRole('button', { name: 'Cancel' }).click()

  let discardDrawer = page.locator('.offcanvas.show').last()
  await expect(discardDrawer.getByText('Discard changes?', { exact: true })).toBeVisible()
  await expect(
    discardDrawer.getByText('Your high angle item changes have not been saved.', { exact: true }),
  ).toBeVisible()
  await discardDrawer.getByRole('button', { name: 'Keep editing' }).click()
  await expect(drawer.getByText('Unsaved changes')).toBeVisible()
  await drawer.getByRole('button', { name: 'Cancel' }).click()
  discardDrawer = page.locator('.offcanvas.show').last()
  await discardDrawer.getByRole('button', { name: 'Discard', exact: true }).click()
  await expect(page.locator('.offcanvas.show')).toHaveCount(0)
  await expect(section.getByText('Not checked', { exact: true })).toBeVisible()

  await section.getByText('Rescue Rope', { exact: true }).click()
  drawer = page.locator('.offcanvas.show').last()
  await expect(drawer).toBeVisible()
  await drawer.getByRole('button', { name: 'Good', exact: true }).click()
  await drawer.getByRole('button', { name: 'Save' }).click()

  await expect(drawer).toBeHidden()
  await expect(section.getByText('Checked', { exact: true })).toBeVisible()
})

test('high angle add compartment and item use the mobile drawer', async ({ page }) => {
  await page.goto('/tests/visual/inspection-mobile-parity.html')

  const section = page.locator('[data-visual-case="high-angle"]')
  await expect(section).toBeVisible()

  await section.getByRole('button', { name: 'Add compartment' }).click()
  let drawer = page.locator('.offcanvas.show').last()
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Add Compartment', { exact: true })).toBeVisible()
  await expect(page.locator('.modal.show')).toHaveCount(0)
  await drawer.getByPlaceholder('e.g. Heavy Duty Organizer Bag').fill('Rope Bag')
  await drawer.getByPlaceholder('e.g. Main Compartment').fill('Right Pocket')
  await drawer.getByRole('button', { name: 'Save' }).click()
  await expect(drawer).toBeHidden()
  await expect(section.getByText('Rope Bag - Right Pocket', { exact: true })).toBeVisible()

  await section.getByText('Locker A', { exact: true }).click()
  await section.getByRole('button', { name: 'Add item' }).click()
  drawer = page.locator('.offcanvas.show').last()
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Add Item', { exact: true })).toBeVisible()
  await expect(page.locator('.modal.show')).toHaveCount(0)
  await drawer.getByPlaceholder('e.g. Rescue Pulley').fill('Edge Protector')
  await drawer.getByPlaceholder('e.g. 1').fill('2')
  await drawer.getByRole('button', { name: 'Save' }).click()
  await expect(drawer).toBeHidden()
  await expect(section.getByText('Edge Protector', { exact: true })).toBeVisible()
})
