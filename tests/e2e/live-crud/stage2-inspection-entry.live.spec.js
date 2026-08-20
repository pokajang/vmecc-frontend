const { expect, test } = require('@playwright/test')
const {
  captureEvidenceScreenshot,
  gotoApprovedRoute,
  loginPersonaThroughUi,
  measureHorizontalOverflow,
  waitForApplicationReady,
  waitForRouteSettled,
} = require('../live-uat/live-uat-support')
const {
  createRunOwnedRegistry,
  installControlledCrudRequestGuard,
  requireControlledCrudEnvironment,
  serializeControlledCrudLedger,
} = require('../live-uat/live-crud-support')

const types = [
  'Emergency Response Auxiliary Equipment',
  'Fire Extinguisher',
  'Fire Truck Daily Readiness',
  'General',
  'Health Safety Environment',
  'High Angle Rescue Equipment',
  'Hydraulic Rescue Tools',
  'SCBA',
]

test.describe('controlled live CRUD Stage 2 — inspection entry and type setup', () => {
  test('TRT can open every implemented inspection type without creating a draft', async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(10 * 60_000)
    const { marker } = requireControlledCrudEnvironment()
    const registry = createRunOwnedRegistry({
      marker,
      selfStatePaths: ['/onboarding/states/profile_completion_trt'],
    })
    const guard = await installControlledCrudRequestGuard(context, registry)
    const ledger = []

    try {
      await loginPersonaThroughUi(page, 'trt')
      const onboardingPrompt = page.getByRole('button', { name: 'Remind me later', exact: true })
      if (await onboardingPrompt.isVisible().catch(() => false)) {
        await onboardingPrompt.click()
        await expect(onboardingPrompt).toBeHidden()
      }

      for (const type of types) {
        await gotoApprovedRoute(page, '/inspection/new')
        await waitForApplicationReady(page)
        await waitForRouteSettled(page)
        const showMore = page.getByRole('button', { name: /Show more/i }).first()
        if (await showMore.isVisible().catch(() => false)) await showMore.click()

        const editType = page.getByRole('button', { name: /^Edit type:/i }).first()
        if (await editType.isVisible().catch(() => false)) {
          await editType.click()
        } else {
          const desktopEditType = page.getByRole('button', { name: 'Edit', exact: true }).first()
          if (await desktopEditType.isVisible().catch(() => false)) await desktopEditType.click()
        }

        const escapedType = type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const typeOption = page
          .getByRole('radio', { name: new RegExp(`^${escapedType}(?:\\s|$)`, 'i') })
          .first()
        await expect(typeOption, `type chooser: ${type}`).toBeVisible()
        await typeOption.click()
        await expect(
          page.getByText(type, { exact: true }).first(),
          `selected type: ${type}`,
        ).toBeVisible()

        // Mobile condenses setup into an accessible summary list; desktop keeps the same
        // state in an editable form. The selected value is the cross-layout contract.
        const mobileSetupSummary = page.getByRole('list', { name: 'Inspection setup summary' })
        if (await mobileSetupSummary.isVisible().catch(() => false)) {
          await expect(mobileSetupSummary).toBeVisible()
        }

        const overflow = await measureHorizontalOverflow(page)
        const screenshot = await captureEvidenceScreenshot(
          page,
          testInfo,
          `inspection-${type.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${testInfo.project.name}`,
        )
        ledger.push({
          type,
          finalPath: new URL(page.url()).pathname,
          overflow: overflow.overflow,
          screenshot,
        })
        expect(overflow.overflow, `${type}: horizontal overflow`).toBeLessThanOrEqual(1)
      }
      expect(guard.ledger).toEqual([])
    } finally {
      await testInfo.attach('inspection-entry-ledger', {
        body: Buffer.from(JSON.stringify(ledger, null, 2)),
        contentType: 'application/json',
      })
      await testInfo.attach('controlled-crud-guard-ledger', {
        body: Buffer.from(serializeControlledCrudLedger({ registry, guardLedger: guard.ledger })),
        contentType: 'application/json',
      })
      await guard.dispose()
    }
  })
})
