import { expect, test } from '@playwright/test'
import path from 'node:path'

const email = process.env.VMECC_QA_EMAIL || ''
const password = process.env.VMECC_QA_PASSWORD || ''

const login = async (page) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('textbox', { name: 'Password' }).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).not.toHaveURL(/\/login(?:$|\?)/, { timeout: 20_000 })
}

const attachScreenshot = async (page, testInfo, name) => {
  const screenshotPath = process.env.VMECC_VISUAL_EVIDENCE_DIR
    ? path.resolve(process.env.VMECC_VISUAL_EVIDENCE_DIR, `${name}.png`)
    : testInfo.outputPath(`${name}.png`)
  await page.screenshot({ fullPage: true, path: screenshotPath })
  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: 'image/png',
  })
}

test('Fire Extinguisher item drawer separates inspection and equipment editing', async ({
  page,
}, testInfo) => {
  test.skip(!email || !password, 'Set VMECC_QA_EMAIL and VMECC_QA_PASSWORD for local visual QA.')
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)

  await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Conduct Inspection', exact: true })).toBeVisible()
  await page.getByRole('radio', { name: /^Fire Extinguisher\b/i }).click()

  const byArea = page.getByRole('button', { name: 'By Area', exact: true })
  if (await byArea.isVisible().catch(() => false)) await byArea.click()

  await expect(page.getByText('Choose Zone')).toBeVisible()
  await page.getByText('Zone 1', { exact: true }).first().click()
  await expect(page.getByText('Choose Main Area')).toBeVisible()
  await page.getByText('Canteen', { exact: true }).first().click()
  await expect(page.getByText('Choose Location', { exact: true })).toBeVisible()
  await page.getByRole('radio', { name: /^Canteen \d+ FEs?$/i }).click()

  const card = page.locator('[data-fire-extinguisher-row-id]').first()
  await expect(card).toBeVisible({ timeout: 30_000 })
  await card.locator('button[aria-haspopup="dialog"]').first().click()

  const drawer = page.locator('.mobile-bottom-drawer.show').last()
  await expect(drawer).toHaveAttribute('data-inspection-drawer-mode', 'inspect')
  await expect(drawer.locator('.mobile-bottom-drawer__actions').getByRole('button')).toHaveCount(2)
  await expect(drawer.locator('.inspection-fire-extinguisher-drawer-title-action')).toHaveCount(0)
  await attachScreenshot(page, testInfo, 'fire-extinguisher-inspect-mode')

  await drawer.getByRole('button', { name: /Extinguisher actions for/i }).click()
  await expect(page.getByRole('button', { name: 'Edit equipment details' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit equipment details' }).click()

  await expect(drawer).toHaveAttribute('data-inspection-drawer-mode', 'edit-equipment')
  await expect(
    drawer.getByText(/Updates the equipment register and future inspections/i),
  ).toBeVisible()
  await expect(drawer.getByRole('button', { name: /Extinguisher actions for/i })).toHaveCount(0)
  await expect(drawer.getByRole('button', { name: 'Save equipment details' })).toBeVisible()
  await attachScreenshot(page, testInfo, 'fire-extinguisher-equipment-edit-mode')

  const feType = drawer.getByRole('textbox', { name: 'FE Type' })
  await feType.fill(`${await feType.inputValue()} QA`)
  await drawer.getByRole('button', { name: /Close Edit/i }).click()
  await expect(page.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await expect(drawer).toHaveAttribute('data-inspection-drawer-mode', 'edit-equipment')

  await drawer.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeVisible()
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(drawer).toHaveAttribute('data-inspection-drawer-mode', 'inspect')
})
