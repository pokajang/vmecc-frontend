const { expect, test } = require('@playwright/test')
const { installAppShellApiStubs } = require('./support/app-shell-stubs')

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.sysadmin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeRole!2026'

test.use({ viewport: { width: 390, height: 844 } })

test('inspection continuation cards are visible for completed eligible scopes', async ({
  page,
}) => {
  const loginResponse = await page.context().request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: {
      email: smokeEmail,
      password: smokePassword,
      remember: true,
    },
  })
  expect(loginResponse.status(), await loginResponse.text()).toBe(200)

  await installAppShellApiStubs(page, apiBaseUrl)
  await page.goto('/inspection/ux-matrix?viewport=mobile&state=complete-with-next-location', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.getByRole('heading', { name: 'Inspection UX Matrix' })).toBeVisible({
    timeout: 60_000,
  })

  const expectedCases = [
    ['fire-extinguisher-inspection', 'Next location', 'Cafeteria'],
    ['frt-daily-inspection', 'Next compartment', 'LOCKER 02'],
    ['er-aux-equipment-inspection', 'Next location', 'Office'],
    ['hydraulic-rescue-tools-inspection', 'Next location', 'Pump House'],
    ['scba-inspection', 'Next location', 'Breathing Air Room'],
    ['high-angle-rescue-equipment-inspection', 'Next kit', 'Response Kit #2'],
  ]

  for (const [typeKey, heading, nextAction] of expectedCases) {
    const section = page.locator(
      `[data-matrix-case="${typeKey}:complete-with-next-location:mobile"]`,
    )
    const continuationCard = section.locator('.inspection-next-location-card')
    await expect(section).toBeVisible()
    await expect(continuationCard.getByText(heading, { exact: true })).toBeVisible()
    await expect(
      continuationCard.getByRole('button', { name: nextAction, exact: true }),
    ).toBeVisible()
  }

  for (const typeKey of ['general-inspection', 'health-safety-environment-inspection']) {
    const section = page.locator(
      `[data-matrix-case="${typeKey}:complete-with-next-location:mobile"]`,
    )
    await expect(section).toBeVisible()
    await expect(section.getByText(/^Next /)).toHaveCount(0)
  }
})
