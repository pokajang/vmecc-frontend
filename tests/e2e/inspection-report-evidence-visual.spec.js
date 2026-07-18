import { expect, test } from '@playwright/test'
import path from 'node:path'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../src/views/inspection/inspectionReportEvidenceCopy.js'
import { installAppShellApiStubs } from './support/app-shell-stubs'

const apiBaseUrl = process.env.VMECC_E2E_API_URL || 'http://localhost:8000/api'
const smokeEmail = process.env.VMECC_SMOKE_EMAIL || 'codex.smoke.sysadmin@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_PASSWORD || 'SmokeRole!2026'

const openGeneralMatrixCase = async (page, viewport) => {
  const loginResponse = await page.context().request.post(`${apiBaseUrl}/auth/login`, {
    headers: { Accept: 'application/json' },
    data: { email: smokeEmail, password: smokePassword, remember: true },
  })
  expect(loginResponse.status(), await loginResponse.text()).toBe(200)

  await installAppShellApiStubs(page, apiBaseUrl)
  await page.goto(
    `/inspection/ux-matrix?viewport=${viewport}&state=complete-with-next-location&type=general-inspection`,
    { waitUntil: 'domcontentloaded' },
  )
  await expect(page.getByRole('heading', { name: 'Inspection UX Matrix' })).toBeVisible({
    timeout: 60_000,
  })

  const section = page.locator(
    `[data-matrix-case="general-inspection:complete-with-next-location:${viewport}"]`,
  )
  await expect(section).toBeVisible()
  return section
}

test.describe('inspection report-level evidence', () => {
  test('desktop form shows report-level photos and remarks without overlap', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 900, height: 900 })
    const section = await openGeneralMatrixCase(page, 'desktop')
    const evidenceCard = section.locator('.inspection-general-evidence-card')

    await expect(
      evidenceCard.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle, { exact: true }),
    ).toBeVisible()
    await expect(
      evidenceCard.getByText(INSPECTION_REPORT_EVIDENCE_COPY.helperText, { exact: true }),
    ).toBeVisible()
    await expect(
      evidenceCard.getByLabel(INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel),
    ).toBeVisible()
    await expect(evidenceCard.getByRole('button', { name: 'Take photo' })).toBeVisible()
    await expect(evidenceCard.getByRole('button', { name: 'Upload photo' })).toBeVisible()

    await evidenceCard.screenshot({
      path: path.join(testInfo.outputDir, 'inspection-report-evidence-desktop.png'),
    })
  })

  test('mobile compact report evidence drawer keeps photo and finding actions scoped', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const section = await openGeneralMatrixCase(page, 'mobile')

    await section
      .getByRole('button', {
        name: new RegExp(`^${INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel}`, 'i'),
      })
      .click()

    const reportDrawer = page.locator('.offcanvas.show').last()
    await expect(reportDrawer).toBeVisible()
    await expect(
      reportDrawer.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle, { exact: true }),
    ).toBeVisible()
    await expect(
      reportDrawer.getByText(INSPECTION_REPORT_EVIDENCE_COPY.helperText, { exact: true }),
    ).toBeVisible()
    await expect(
      reportDrawer.getByLabel(INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel),
    ).toBeVisible()
    await expect(reportDrawer.getByRole('button', { name: 'Take photo' })).toBeVisible()
    await expect(reportDrawer.getByRole('button', { name: 'Upload photo' })).toBeVisible()
    await reportDrawer.screenshot({
      path: path.join(testInfo.outputDir, 'inspection-report-evidence-mobile-drawer.png'),
    })
    await reportDrawer.getByRole('button', { name: /Close/i }).click()
    await expect(reportDrawer).toBeHidden()

    await section.getByText('Add finding', { exact: true }).click()
    const findingDrawer = page.locator('.offcanvas.show').last()
    await expect(findingDrawer).toBeVisible()
    await expect(findingDrawer.getByText('Add finding photos', { exact: true })).toBeVisible()
  })
})
