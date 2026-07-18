import { expect, test } from '@playwright/test'
import { installAppShellApiStubs } from './support/app-shell-stubs'

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.sysadmin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeRole!2026'

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
})

const openHighAngleInspection = async (page) => {
  const loginResponse = await page.context().request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: {
      email: smokeEmail,
      password: smokePassword,
      remember: true,
    },
  })
  expect(loginResponse.status(), await loginResponse.text()).toBe(200)
  const loginBody = await loginResponse.json()

  await installAppShellApiStubs(page, apiBaseUrl)
  await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Conduct Inspection', exact: true })).toBeVisible({
    timeout: 60_000,
  })

  const typeRadio = page.getByRole('radio', { name: /High Angle Rescue Equipment/i })
  if (!(await typeRadio.isVisible().catch(() => false))) {
    await page.getByRole('radio', { name: /Show more/i }).click()
  }
  await typeRadio.click()
  await page.getByRole('radio', { name: /Response Kit #1/i }).click()
  await expect(page.getByText('Choose Compartment')).toBeVisible()

  return loginBody.csrf_token
}

const chooseFirstCompartment = async (page) => {
  await page.locator('.inspection-location-option-card').first().click()
  await expect(page.getByText('Equipment', { exact: true })).toBeVisible()
}

const cleanupDraft = async (page, csrfToken) => {
  if (!csrfToken) return
  await page.context().request.delete(`${apiBaseUrl}/reports/draft`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
  })
}

test('high angle mobile drawer stages changes until save', async ({ page }) => {
  test.setTimeout(3 * 60_000)
  let csrfToken = ''

  try {
    csrfToken = await openHighAngleInspection(page)
    await chooseFirstCompartment(page)

    const row = page.locator('[data-inspection-high-angle-row-id]').first()
    await expect(row).toBeVisible()
    await row.locator('.card-header[role="button"]').click()

    let drawer = page.locator('.offcanvas.show').last()
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()

    await drawer.getByRole('button', { name: 'Good', exact: true }).click()
    await expect(drawer.getByText('Unsaved changes', { exact: true })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
    await drawer.getByRole('button', { name: 'Cancel', exact: true }).click()

    let discardDrawer = page.locator('.offcanvas.show').last()
    await expect(discardDrawer.getByText('Discard changes?', { exact: true })).toBeVisible()
    await discardDrawer.getByRole('button', { name: 'Keep editing', exact: true }).click()
    await expect(drawer.getByText('Unsaved changes', { exact: true })).toBeVisible()

    await drawer.getByRole('button', { name: 'Cancel', exact: true }).click()
    discardDrawer = page.locator('.offcanvas.show').last()
    await discardDrawer.getByRole('button', { name: 'Discard', exact: true }).click()
    await expect(page.locator('.offcanvas.show')).toHaveCount(0)

    await row.locator('.card-header[role="button"]').click()
    drawer = page.locator('.offcanvas.show').last()
    await drawer.getByRole('button', { name: 'Good', exact: true }).click()
    await drawer.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(drawer).toBeHidden()
    await expect(row.getByText('Checked', { exact: true })).toBeVisible()
  } finally {
    await cleanupDraft(page, csrfToken)
  }
})

test('high angle add compartment and item use the mobile drawer', async ({ page }) => {
  test.setTimeout(3 * 60_000)
  let csrfToken = ''

  try {
    csrfToken = await openHighAngleInspection(page)

    await page.getByRole('button', { name: 'Add compartment', exact: true }).click()
    let drawer = page.locator('.offcanvas.show').last()
    await expect(drawer.getByText('Add Compartment', { exact: true })).toBeVisible()
    await expect(drawer.getByPlaceholder('e.g. Heavy Duty Organizer Bag')).toBeVisible()
    await expect(page.locator('.modal.show')).toHaveCount(0)
    await drawer.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(drawer).toBeHidden()

    await chooseFirstCompartment(page)
    await page.getByRole('button', { name: 'Add item', exact: true }).click()
    drawer = page.locator('.offcanvas.show').last()
    await expect(drawer.getByText('Add Item', { exact: true })).toBeVisible()
    await expect(drawer.getByPlaceholder('e.g. Rescue Pulley')).toBeVisible()
    await expect(page.locator('.modal.show')).toHaveCount(0)
    await drawer.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(drawer).toBeHidden()
  } finally {
    await cleanupDraft(page, csrfToken)
  }
})
