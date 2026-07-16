import { expect, test } from '@playwright/test'
import path from 'node:path'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../src/views/inspection/inspectionReportEvidenceCopy.js'
import { installAppShellApiStubs } from './support/app-shell-stubs'

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.admin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeAdmin!2026'

const CASES = [
  'fire-extinguisher-inspection',
  'hydraulic-rescue-tools-inspection',
  'er-aux-equipment-inspection',
  'scba-inspection',
  'high-angle-rescue-equipment-inspection',
  'frt-daily-inspection',
  'health-safety-environment-inspection',
  'general-inspection',
]

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
})

test('captures inspection mobile parity states', async ({ page }, testInfo) => {
  test.setTimeout(3 * 60_000)
  const loginResponse = await page.context().request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: { email: smokeEmail, password: smokePassword, remember: true },
  })
  expect(loginResponse.status(), await loginResponse.text()).toBe(200)

  await installAppShellApiStubs(page, apiBaseUrl)
  await page.goto('/inspection/ux-matrix?viewport=mobile&state=complete-with-next-location', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.getByRole('heading', { name: 'Inspection UX Matrix' })).toBeVisible({
    timeout: 60_000,
  })

  const outputDir = path.join(testInfo.outputDir, 'inspection-mobile-parity')

  for (const typeKey of CASES) {
    const section = page.locator(
      `[data-matrix-case="${typeKey}:complete-with-next-location:mobile"]`,
    )
    await expect(section).toBeVisible()
    await section.screenshot({ path: path.join(outputDir, `${typeKey}-list.png`) })

    await section
      .getByRole('button', {
        name: new RegExp(`^${INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel}`, 'i'),
      })
      .click()
    const drawer = page.locator('.offcanvas.show').last()
    await expect(drawer).toBeVisible()
    await expect(
      drawer.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle, { exact: true }),
    ).toBeVisible()
    await drawer.screenshot({ path: path.join(outputDir, `${typeKey}-evidence-drawer.png`) })
    await drawer.getByRole('button', { name: /Close/i }).click()
    await expect(drawer).toBeHidden()
  }
})
