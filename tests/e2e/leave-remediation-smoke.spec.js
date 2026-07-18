const { expect, test } = require('@playwright/test')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokePassword = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'
const smokeTimeoutMs = Number(process.env.VMECC_SMOKE_ROUTE_TIMEOUT_MS || 5 * 60_000)

const personas = {
  applicant: 'codex.smoke.tactical-response-team@vmecc.local',
  manager: 'codex.smoke.human-resource@vmecc.local',
}

const shellApiStubs = [
  ['/settings/modules', { data: { registry: [], configured: {}, effective: {} } }],
  [
    '/settings/system-maintenance',
    { data: { enabled: false, phase: 'off', graceEndsAt: null, message: '' } },
  ],
  ['/messages/threads**', { data: [] }],
  ['/rosters**', { data: [] }],
  [
    '/settings/shift-windows',
    {
      data: {
        normal_start: '08:00',
        normal_end: '17:00',
        day_start: '07:00',
        day_end: '19:00',
        night_start: '19:00',
        night_end: '07:00',
      },
    },
  ],
  ['/workflow/notifications/unread-count**', { data: { unread_count: 0 } }],
  ['/overtime/eligibility', { data: { eligible: false, applicableRoles: [], userRoles: [] } }],
]

const installShellApiStubs = async (page) => {
  await Promise.all(
    shellApiStubs.map(([path, body]) =>
      page.route(`${apiBaseUrl}${path}`, (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }),
      ),
    ),
  )
}

const login = async (page, email) => {
  await page.context().clearCookies()
  const response = await page.request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: { email, password: smokePassword, remember: true },
  })
  const body = await response.json()
  expect(response.status(), JSON.stringify(body)).toBe(200)

  const session = await page.request.get(`${apiBaseUrl}/auth/session`, {
    headers: { Accept: 'application/json' },
  })
  const sessionBody = await session.json()
  expect(session.status(), JSON.stringify(sessionBody)).toBe(200)
  expect(sessionBody.user?.email).toBe(email)
}

test.describe('Leave remediation browser smoke', () => {
  test('manager correction is visible and editable to the applicant', async ({ page, browser }) => {
    test.setTimeout(smokeTimeoutMs)
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
    await page.close()

    const applicantContext = await browser.newContext()
    const applicantPage = await applicantContext.newPage()
    await installShellApiStubs(applicantPage)
    await login(applicantPage, personas.applicant)
    const leaveApi = await applicantPage.request.get(`${apiBaseUrl}/leave`, {
      headers: { Accept: 'application/json' },
    })
    const leaveApiBody = await leaveApi.text()
    expect(leaveApi.status(), leaveApiBody).toBe(200)
    expect(leaveApiBody).toContain('SMK-LV-1')
    const balanceApi = await applicantPage.request.get(`${apiBaseUrl}/leave/balance`, {
      headers: { Accept: 'application/json' },
    })
    expect(balanceApi.status(), await balanceApi.text()).toBe(200)
    await applicantPage.goto('/leave', { waitUntil: 'domcontentloaded' })
    const leaveRecords = applicantPage.getByTestId('leave-records')
    await expect(leaveRecords).toBeVisible({ timeout: 60_000 })
    await leaveRecords.getByLabel('Rows per page').selectOption('all')
    await expect(leaveRecords).toContainText('SMK-LV-1', {
      timeout: 60_000,
    })
    await applicantPage.goto(`/leave/${record.display_id}`, { waitUntil: 'domcontentloaded' })
    await expect(applicantPage.getByTestId('leave-detail')).toBeVisible()
    await expect(applicantPage.getByTestId('leave-detail')).toContainText('Needs Correction', {
      timeout: 60_000,
    })
    await applicantPage.getByTestId('leave-edit-action').click()
    await expect(applicantPage.getByTestId('leave-apply')).toBeVisible()
    await applicantContext.close()
  })
})
