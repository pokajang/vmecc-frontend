import { expect, test } from '@playwright/test'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../src/views/inspection/inspectionReportEvidenceCopy.js'
import { installAppShellApiStubs } from './support/app-shell-stubs'

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.sysadmin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeRole!2026'
const minimumTouchTarget = 43.5

const expectComfortableTargets = async (locator) => {
  const targets = await locator.all()
  expect(targets.length).toBeGreaterThan(0)

  for (const target of targets) {
    await expect(target).toBeVisible()
    const box = await target.boundingBox()
    expect(box).not.toBeNull()
    expect(box.height).toBeGreaterThanOrEqual(minimumTouchTarget)
  }
}

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
})

const authenticate = async (page) => {
  const loginResponse = await page.context().request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: { email: smokeEmail, password: smokePassword, remember: true },
  })
  expect(loginResponse.status(), await loginResponse.text()).toBe(200)
  await installAppShellApiStubs(page, apiBaseUrl)
}

test('inspection mobile controls preserve touch comfort, wrapping, and narrow-width fit', async ({
  page,
}) => {
  await authenticate(page)
  await page.goto(
    '/inspection/ux-matrix?viewport=mobile&state=complete-with-next-location&type=fire-extinguisher-inspection',
    { waitUntil: 'domcontentloaded' },
  )

  const inspectionCase = page.locator(
    '[data-matrix-case="fire-extinguisher-inspection:complete-with-next-location:mobile"]',
  )
  await expect(inspectionCase).toBeVisible({ timeout: 60_000 })

  await expectComfortableTargets(inspectionCase.locator('.inspection-next-location-btn'))
  await expectComfortableTargets(inspectionCase.locator('.inspection-compact-action-btn'))
  await expectComfortableTargets(inspectionCase.locator('.inspection-form-inline-actions .btn'))

  const validationMessage = inspectionCase.locator(
    '.inspection-form-inline-actions-row-status, .action-row-thumb-status',
  )
  await expect(validationMessage).toBeVisible()
  await expect(validationMessage).toHaveCSS('white-space', 'normal')

  const previewFits = await inspectionCase
    .locator('.inspection-ux-matrix-preview-shell')
    .evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
  expect(previewFits).toBe(true)

  await inspectionCase
    .getByRole('button', {
      name: `${INSPECTION_REPORT_EVIDENCE_COPY.mobilePopulatedActionLabel} (1)`,
      exact: true,
    })
    .click()
  const drawer = page.locator('.offcanvas.show').last()
  await expect(drawer).toBeVisible()
  await expectComfortableTargets(drawer.locator('.mobile-bottom-drawer__close'))

  await page.setViewportSize({ width: 320, height: 700 })
  const narrowDrawerFits = await drawer.evaluate(
    (element) => element.scrollWidth <= element.clientWidth + 1,
  )
  expect(narrowDrawerFits).toBe(true)
})

test('resetting inspection type restores the fresh, overflow-safe picker', async ({ page }) => {
  await authenticate(page)
  await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Conduct Inspection', exact: true })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByText('Choose Type', { exact: true })).toBeVisible()

  const typePicker = page.getByRole('radiogroup')
  const initialTypeCount = await typePicker.getByRole('radio').count()
  const showMore = typePicker.getByRole('radio', { name: /Show more/i })
  if (await showMore.count()) {
    await showMore.click()
  }

  const selectableType = typePicker
    .getByRole('radio')
    .filter({ hasNotText: /Show (more|less)/i })
    .first()
  await selectableType.click()

  const summary = page.getByRole('group', { name: 'Type' })
  await expect(summary).toBeVisible()
  await expectComfortableTargets(summary.getByRole('button'))
  await expect(summary).toHaveCSS('border-top-style', 'none')

  await summary.getByRole('button', { name: 'Reset type' }).click()

  const restoredPicker = page.getByRole('radiogroup')
  await expect(restoredPicker).toBeVisible()
  expect(await restoredPicker.getByRole('radio').count()).toBe(initialTypeCount)

  await page.setViewportSize({ width: 320, height: 700 })
  const pickerMetrics = await restoredPicker.evaluate((element) => ({
    clientWidth: element.clientWidth,
    right: element.getBoundingClientRect().right,
    scrollWidth: element.scrollWidth,
    viewportWidth: window.innerWidth,
  }))
  expect(pickerMetrics.scrollWidth).toBeLessThanOrEqual(pickerMetrics.clientWidth + 1)
  expect(pickerMetrics.right, JSON.stringify(pickerMetrics)).toBeLessThanOrEqual(
    pickerMetrics.viewportWidth + 1,
  )
})
