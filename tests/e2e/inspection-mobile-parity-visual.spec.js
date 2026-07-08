import { expect, test } from '@playwright/test'
import path from 'node:path'

const CASES = [
  { id: 'fire-extinguisher', openText: 'CAN-001' },
  { id: 'hydraulic', openText: 'Hydraulic Pump Motor 1' },
  { id: 'er-aux', openText: 'Radio Tetra' },
  { id: 'scba', openText: 'MSA 06' },
  { id: 'high-angle', openText: 'Rescue Rope', openSequence: ['Locker A', 'Rescue Rope'] },
  { id: 'frt', openText: 'Pump Panel' },
  { id: 'hse', openLabel: 'Edit HSE observation' },
  { id: 'general', openText: 'Add finding' },
]

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
})

test('captures inspection mobile parity states', async ({ page }, testInfo) => {
  await page.goto('/tests/visual/inspection-mobile-parity.html')
  await expect(page.getByText('Inspection Mobile UI Parity')).toBeVisible()

  const outputDir = path.join(testInfo.outputDir, 'inspection-mobile-parity')

  for (const visualCase of CASES) {
    const section = page.locator(`[data-visual-case="${visualCase.id}"]`)
    await expect(section).toBeVisible()
    await section.screenshot({
      path: path.join(outputDir, `${visualCase.id}-list.png`),
    })

    if (visualCase.openSequence) {
      for (const itemText of visualCase.openSequence) {
        await section.getByText(itemText, { exact: true }).click()
      }
    } else if (visualCase.openLabel) {
      await section.getByLabel(visualCase.openLabel).click()
    } else {
      await section.getByText(visualCase.openText, { exact: true }).click()
    }

    const drawer = page.locator('.offcanvas.show').last()
    await expect(drawer).toBeVisible()
    await drawer.screenshot({
      path: path.join(outputDir, `${visualCase.id}-drawer.png`),
    })
    await drawer.getByLabel(/close/i).click()
    await expect(drawer).toBeHidden()

    for (const extraDrawer of visualCase.extraDrawers || []) {
      if (extraDrawer.openLabel) {
        await section.getByLabel(extraDrawer.openLabel).click()
      } else {
        await section.getByText(extraDrawer.openText, { exact: true }).click()
      }

      const extra = page.locator('.offcanvas.show').last()
      await expect(extra).toBeVisible()
      await extra.screenshot({
        path: path.join(outputDir, `${visualCase.id}-${extraDrawer.name}-drawer.png`),
      })
      await extra.getByLabel(/close/i).click()
      await expect(extra).toBeHidden()
    }
  }
})
