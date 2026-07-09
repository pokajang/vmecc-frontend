import { expect, test } from '@playwright/test'
import path from 'node:path'
import { INSPECTION_REPORT_EVIDENCE_COPY } from '../../src/views/inspection/inspectionReportEvidenceCopy.js'

const REPORT_REMARKS_VALUE = 'Whole office accessible except the archive room.'

test.describe('inspection report-level evidence', () => {
  test('desktop form shows report-level photos and remarks without overlap', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 900, height: 900 })
    await page.goto('/tests/visual/inspection-mobile-parity.html')

    const section = page.locator('[data-visual-case="general"]')
    await expect(section).toBeVisible()
    await expect(
      section.getByText(INSPECTION_REPORT_EVIDENCE_COPY.sectionTitle, { exact: true }),
    ).toBeVisible()
    await expect(
      section.getByText(INSPECTION_REPORT_EVIDENCE_COPY.helperText, { exact: true }),
    ).toBeVisible()
    await expect(section.getByLabel(INSPECTION_REPORT_EVIDENCE_COPY.remarksLabel)).toHaveValue(
      REPORT_REMARKS_VALUE,
    )
    await expect(section.getByRole('button', { name: 'Take photo' })).toBeVisible()
    await expect(section.getByRole('button', { name: 'Upload photo' })).toBeVisible()

    await section.screenshot({
      path: path.join(testInfo.outputDir, 'inspection-report-evidence-desktop.png'),
    })
  })

  test('mobile compact report evidence drawer keeps photo and finding actions scoped', async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/tests/visual/inspection-mobile-parity.html')

    const section = page.locator('[data-visual-case="general"]')
    await expect(section).toBeVisible()
    await section
      .getByText(INSPECTION_REPORT_EVIDENCE_COPY.mobileActionLabel, { exact: true })
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
    ).toHaveValue(REPORT_REMARKS_VALUE)
    await expect(reportDrawer.getByRole('button', { name: 'Take photo' })).toBeVisible()
    await expect(reportDrawer.getByRole('button', { name: 'Upload photo' })).toBeVisible()
    await reportDrawer.screenshot({
      path: path.join(testInfo.outputDir, 'inspection-report-evidence-mobile-drawer.png'),
    })
    await reportDrawer.getByLabel(/close/i).click()
    await expect(reportDrawer).toBeHidden()

    await section.getByText('Add finding', { exact: true }).click()
    const findingDrawer = page.locator('.offcanvas.show').last()
    await expect(findingDrawer).toBeVisible()
    await expect(findingDrawer.getByText('Add finding photos', { exact: true })).toBeVisible()
  })
})
