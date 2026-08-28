const { expect, test } = require('@playwright/test')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const email =
  process.env.VMECC_APPLICATION_UAT_EMAIL || 'codex.smoke.tactical-response-team@vmecc.local'
const password = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'

const viewports = [
  { key: 'mobile-320', width: 320, height: 568 },
  { key: 'mobile-390', width: 390, height: 844 },
  { key: 'tablet-768', width: 768, height: 1024 },
  { key: 'desktop-1440', width: 1440, height: 1000 },
]

const themes = ['light', 'dark']

const login = async (page) => {
  const response = await page.request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    data: { email, password, remember: true },
  })
  expect(response.status(), await response.text()).toBe(200)

  const sessionResponse = await page.request.get(`${apiBaseUrl}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  const sessionBody = await sessionResponse.json()
  expect(sessionResponse.status(), JSON.stringify(sessionBody)).toBe(200)
  expect(sessionBody.user?.email).toBe(email)
  return sessionBody
}

const installIsolatedDraftRoutes = async (page, sessionBody) => {
  await page.route(`${apiBaseUrl}/auth/session`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(sessionBody),
    }),
  )

  await page.route(`${apiBaseUrl}/settings/modules`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { registry: [], configured: {}, effective: {}, fallbackMode: true },
      }),
    }),
  )

  await page.route(`${apiBaseUrl}/overtime/draft`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":null}' })
      return
    }
    const requestBody = route.request().postDataJSON() || {}
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { ...(requestBody.payload || {}), draft_version: 1 },
      }),
    })
  })

  await page.route(`${apiBaseUrl}/leave/draft`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"data":{"draft_data":null}}',
      })
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":{}}' })
  })

  await page.route(`${apiBaseUrl}/payroll/claims/drafts**`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[]}' })
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"data":{"id":"uat-isolated-draft","version":1}}',
    })
  })
}

const dismissOnboarding = async (page) => {
  const remindLater = page.getByRole('button', { name: 'Remind me later', exact: true })
  if (await remindLater.isVisible().catch(() => false)) await remindLater.click()
}

const openRoute = async (page, pathname, theme) => {
  await page.goto(`${baseUrl}${pathname}?theme=${theme}`, { waitUntil: 'domcontentloaded' })
  await dismissOnboarding(page)
  await expect(page).not.toHaveURL(/\/login(?:[/?]|$)/)
  await expect(page.getByText(/Unable to restore session/i)).toHaveCount(0)
}

const expectNoHorizontalOverflow = async (page, label) => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }))
  expect(
    dimensions.document,
    `${label} overflowed the ${dimensions.viewport}px viewport`,
  ).toBeLessThanOrEqual(dimensions.viewport + 1)
}

const expectSharedFormContract = async ({ page, form, actionLabel }) => {
  await expect(form).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /^Back to /i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Save Draft', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: actionLabel, exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Clear form', exact: true })).toBeVisible()
  expect(await form.evaluate((element) => element.parentElement?.classList.contains('card'))).toBe(
    false,
  )
  if ((page.viewportSize()?.width || 0) <= 390) {
    const actionPosition = await form
      .locator('.workflow-stage-actions__group')
      .evaluate((element) => window.getComputedStyle(element).position)
    expect(actionPosition).not.toBe('fixed')
  }
}

const openOvertimeForm = async (page, theme) => {
  await openRoute(page, '/overtime/new', theme)
  await expect(page.getByRole('heading', { name: 'Apply Overtime', exact: true })).toBeVisible()
  await expect(page.getByTestId('overtime-type-selection')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0)
  await page.getByTestId('overtime-type-weekday').click()
  const form = page.getByTestId('overtime-apply')
  await expectSharedFormContract({
    page,
    form,
    actionLabel: 'Submit request',
  })
  const nativeAttachmentInput = page.locator('#overtime-attachment')
  await expect(nativeAttachmentInput).toHaveClass(/visually-hidden/)
  const nativeAttachmentBox = await nativeAttachmentInput.boundingBox()
  expect(nativeAttachmentBox?.width || 0).toBeLessThanOrEqual(1)
  expect(nativeAttachmentBox?.height || 0).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: 'Add attachment', exact: true })).toBeVisible()
  if ((page.viewportSize()?.width || 0) <= 390) {
    const mobileMetrics = await page.evaluate(() => {
      const controlIds = ['overtime-claim-date', 'overtime-start-time', 'overtime-end-time']
      const controls = controlIds.map((id) => document.getElementById(id)?.getBoundingClientRect())
      const attachment = Array.from(document.querySelectorAll('button'))
        .find((button) => button.textContent?.trim() === 'Add attachment')
        ?.getBoundingClientRect()
      const actionElement = document.querySelector('[aria-label="Overtime form actions"]')
      const actionGroup = actionElement?.getBoundingClientRect()
      const date = document.getElementById('overtime-claim-date')?.getBoundingClientRect()
      return {
        heights: [...controls, attachment].filter(Boolean).map((rect) => rect.height),
        dateWidth: date?.width || 0,
        actionWidth: actionGroup?.width || 0,
      }
    })
    expect(Math.min(...mobileMetrics.heights)).toBeGreaterThanOrEqual(43.5)
    expect(Math.abs(mobileMetrics.actionWidth - mobileMetrics.dateWidth)).toBeLessThanOrEqual(1.5)
  }
  return form
}

const openLeaveForm = async (page, theme) => {
  await openRoute(page, '/leave/new', theme)
  await expect(page.getByTestId('leave-type-selection')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('leave-type-annual-leave').click()
  await page.getByTestId('leave-type-continue').click()
  const form = page.getByTestId('leave-apply')
  await expectSharedFormContract({
    page,
    form,
    actionLabel: 'Submit request',
  })
  return form
}

const openExpenseClaimForm = async (page, theme) => {
  await openRoute(page, '/payroll/claims/new', theme)
  await expect(page.getByTestId('payroll-claim-type-selection')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('claim-type-expense').click()
  await page.locator('[data-testid^="claim-period-"]:not([disabled])').first().click()
  await page.getByTestId('payroll-claim-type-continue').click()
  const form = page.getByTestId('payroll-claim-form')
  await expectSharedFormContract({
    page,
    form,
    actionLabel: 'Submit request',
  })
  return form
}

const openSalaryClaimForm = async (page, theme) => {
  await openRoute(page, '/payroll/claims/new', theme)
  await expect(page.getByTestId('payroll-claim-type-selection')).toBeVisible({ timeout: 30_000 })
  await page.getByTestId('claim-type-salary').click()
  await page.locator('[data-testid^="claim-period-"]:not([disabled])').first().click()
  await page.getByTestId('payroll-claim-type-continue').click()
  const form = page.getByTestId('payroll-claim-form')
  await expectSharedFormContract({
    page,
    form,
    actionLabel: 'Submit request',
  })
  const summaryCard = form
    .getByText('Salary Claim Summary', { exact: true })
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " card ")][1]')
  const addAdjustment = form.getByRole('button', { name: 'Add Adjustment', exact: true })
  const [summaryBox, addAdjustmentBox] = await Promise.all([
    summaryCard.boundingBox(),
    addAdjustment.boundingBox(),
  ])
  expect(summaryBox).not.toBeNull()
  expect(addAdjustmentBox).not.toBeNull()
  expect(addAdjustmentBox.x).toBeGreaterThanOrEqual(summaryBox.x - 1)
  expect(addAdjustmentBox.x + addAdjustmentBox.width).toBeLessThanOrEqual(
    summaryBox.x + summaryBox.width + 1,
  )
  return form
}

test.describe('employee application workflow visual parity', () => {
  test.use({ hasTouch: true, isMobile: true, deviceScaleFactor: 1 })

  test('overtime, leave, and payroll claims follow the shared application contract', async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000)
    const sessionBody = await login(page)
    await installIsolatedDraftRoutes(page, sessionBody)

    await page.addInitScript(() => {
      Object.keys(window.localStorage)
        .filter((key) => /claim.*(draft|autosave)/i.test(key))
        .forEach((key) => window.localStorage.removeItem(key))
    })

    const workflows = [
      { key: 'overtime', open: openOvertimeForm },
      { key: 'leave', open: openLeaveForm },
      { key: 'salary-claim', open: openSalaryClaimForm },
      { key: 'expense-claim', open: openExpenseClaimForm },
    ]

    for (const theme of themes) {
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })

        for (const workflow of workflows) {
          await workflow.open(page, theme)
          await expectNoHorizontalOverflow(page, `${workflow.key} ${viewport.key} ${theme}`)
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await page.screenshot({
            path: testInfo.outputPath(`${workflow.key}-${viewport.key}-${theme}.png`),
            fullPage: true,
          })
        }
      }
    }
  })
})
