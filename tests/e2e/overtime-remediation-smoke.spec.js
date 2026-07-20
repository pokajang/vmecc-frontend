const { expect, test } = require('@playwright/test')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://127.0.0.1:8000/api'
const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://127.0.0.1:3000'
const smokePassword = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'

const personas = {
  applicant: 'codex.smoke.tactical-response-team@vmecc.local',
  reviewer: 'codex.smoke.contract-manager@vmecc.local',
}

const login = async (page, email) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(smokePassword)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).not.toHaveURL(/\/login/i)
}

test.describe('Overtime remediation browser smoke', () => {
  test('manager correction is visible and resubmittable by the applicant', async ({
    page,
    browser,
  }) => {
    test.setTimeout(90_000)
    test.skip(
      process.env.VMECC_OVERTIME_E2E !== '1',
      'Set VMECC_OVERTIME_E2E=1 after running the SmokeScenarioSeeder.',
    )

    await login(page, personas.reviewer)
    const recordsResponse = await page.request.get(
      `${apiBaseUrl}/staff/overtime/records?per_page=100`,
      {
        headers: { Accept: 'application/json' },
      },
    )
    expect(recordsResponse.status()).toBe(200)
    const record = ((await recordsResponse.json()).data || []).find(
      (row) => row.display_id === 'SMK-OT-WORKFLOW',
    )
    expect(record, 'Missing seeded pending overtime record SMK-OT-WORKFLOW.').toBeTruthy()

    if (record.status !== 'Needs Correction') {
      expect(record.status, `Seeded record is not pending: ${record.status}`).toBe('Pending')
      const session = await page.request.get(`${apiBaseUrl}/auth/session`, {
        headers: { Accept: 'application/json' },
      })
      const csrfToken = (await session.json())?.csrf_token
      const correctionResponse = await page.request.post(
        `${apiBaseUrl}/staff/overtime/records/${record.user_id}/${record.id}/request-correction`,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          data: {
            remarks: 'Please clarify the documented handover work.',
            expected_version: record.version,
          },
        },
      )
      expect(correctionResponse.status(), await correctionResponse.text()).toBe(200)
    }

    await page.close()
    const applicantContext = await browser.newContext()
    const applicantPage = await applicantContext.newPage()
    await login(applicantPage, personas.applicant)
    const applicantOvertime = await applicantPage.evaluate(async (browserApiBaseUrl) => {
      const [eligibilityResponse, recordsResponse] = await Promise.all([
        fetch(`${browserApiBaseUrl}/overtime/eligibility`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        }),
        fetch(`${browserApiBaseUrl}/overtime`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        }),
      ])

      return {
        eligibility: {
          status: eligibilityResponse.status,
          body: await eligibilityResponse.json(),
        },
        records: {
          status: recordsResponse.status,
          body: await recordsResponse.json(),
        },
      }
    }, apiBaseUrl)
    expect(applicantOvertime.eligibility.status).toBe(200)
    expect(applicantOvertime.eligibility.body.data?.eligible).toBe(true)
    expect(applicantOvertime.records.status).toBe(200)
    expect(applicantOvertime.records.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ display_id: 'SMK-OT-WORKFLOW' })]),
    )
    const overtimeRecord = applicantOvertime.records.body.data.find(
      (row) => row.display_id === 'SMK-OT-WORKFLOW',
    )
    const resubmission = await applicantPage.evaluate(
      async ({ record, browserApiBaseUrl }) => {
        const sessionResponse = await fetch(`${browserApiBaseUrl}/auth/session`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const session = await sessionResponse.json()
        const response = await fetch(`${browserApiBaseUrl}/overtime/${record.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-CSRF-Token': session.csrf_token,
          },
          body: JSON.stringify({
            overtime_type: record.overtime_type,
            claim_date: record.claim_date,
            start_time: record.start_time,
            end_time: record.end_time,
            is_overnight: record.is_overnight,
            duration_minutes: record.duration_minutes,
            reason: 'Completed handover, asset checks, and incident log reconciliation.',
            expected_version: record.version,
          }),
        })
        return { status: response.status, body: await response.json() }
      },
      { record: overtimeRecord, browserApiBaseUrl: apiBaseUrl },
    )
    expect(resubmission.status).toBe(200)
    expect(resubmission.body.data?.status).toBe('Pending')
    expect(resubmission.body.data?.workflow_stage).toBe('review')
    await applicantContext.close()
  })
})
