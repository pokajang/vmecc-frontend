const { expect, test } = require('@playwright/test')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokePassword = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'

const personas = {
  applicant: 'codex.smoke.tactical-response-team@vmecc.local',
  manager: 'codex.smoke.human-resource@vmecc.local',
}

const login = async (page, email) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(smokePassword)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).not.toHaveURL(/\/login/i)
}

const logout = async (page) => {
  const session = await page.request.get(`${apiBaseUrl}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  const csrfToken = (await session.json())?.csrf_token
  await page.request.post(`${apiBaseUrl}/auth/logout`, {
    headers: { Accept: 'application/json', 'X-CSRF-Token': csrfToken },
  })
  await page.context().clearCookies()
}

const dismissBlockingDialogs = async (page) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const closeButtons = page.getByRole('dialog').getByRole('button', { name: 'Close' })
    if ((await closeButtons.count()) === 0) return
    await closeButtons.last().click()
  }
}

test.describe('Leave remediation browser smoke', () => {
  test('manager correction is visible and editable to the applicant', async ({ page }) => {
    test.setTimeout(90000)
    test.skip(
      process.env.VMECC_LEAVE_E2E !== '1',
      'Set VMECC_LEAVE_E2E=1 after running the SmokeScenarioSeeder.',
    )

    await login(page, personas.manager)
    const recordsResponse = await page.request.get(`${apiBaseUrl}/staff/leave/records`, {
      headers: { Accept: 'application/json' },
    })
    expect(recordsResponse.status()).toBe(200)
    const rows = (await recordsResponse.json()).data || []
    const record = rows.find((row) => row.display_id === 'SMK-LV-1')
    expect(record, 'Missing seeded pending leave record SMK-LV-1.').toBeTruthy()

    if (record.status !== 'Needs Correction') {
      const session = await page.request.get(`${apiBaseUrl}/auth/session`, {
        headers: { Accept: 'application/json' },
      })
      const csrfToken = (await session.json())?.csrf_token
      const correction = await page.request.post(
        `${apiBaseUrl}/staff/leave/records/${record.user_id}/${record.id}/request-correction`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          data: { remarks: 'Smoke correction request.', expected_version: record.version },
        },
      )
      expect(await correction.text()).toContain('Needs Correction')
      expect(correction.status()).toBe(200)
    }
    await logout(page)

    await login(page, personas.applicant)
    const leaveApi = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8000/api/leave', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.text() }
    })
    expect(leaveApi.status, leaveApi.body).toBe(200)
    expect(leaveApi.body).toContain('SMK-LV-1')
    const balanceApi = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8000/api/leave/balance', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })
      return { status: response.status, body: await response.text() }
    })
    expect(balanceApi.status, balanceApi.body).toBe(200)
    await page.goto('/leave', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('leave-records')).toContainText('SMK-LV-1', { timeout: 15000 })
    await page.goto('/leave/SMK-LV-1', { waitUntil: 'domcontentloaded' })
    await expect(page.getByTestId('leave-detail')).toBeVisible()
    await expect(page.getByTestId('leave-detail')).toContainText('Needs Correction')
    await dismissBlockingDialogs(page)
    await page.getByTestId('leave-edit-action').click()
    await expect(page.getByTestId('leave-apply')).toBeVisible()
  })
})
