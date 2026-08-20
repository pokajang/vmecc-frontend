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

const reportIdFromResponse = (body = {}) =>
  String(body?.data?.reportUid || body?.data?.report_uid || body?.data?.id || '').trim()

const draftIdFromResponse = (body = {}) =>
  String(body?.data?.draft_id || body?.data?.draftId || body?.data?.id || '').trim()

test.describe('controlled live CRUD Stage 2 — General Inspection lifecycle', () => {
  test('TRT creates, reads, edits, and deletes one marker-owned General Inspection', async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(12 * 60_000)
    const { marker } = requireControlledCrudEnvironment()
    const registry = createRunOwnedRegistry({
      marker,
      createPaths: ['/reports', '/reports/drafts'],
      selfStatePaths: ['/onboarding/states/profile_completion_trt'],
    })
    const guard = await installControlledCrudRequestGuard(context, registry)
    const evidence = []
    const cleanup = []
    const draftIds = new Set()
    let reportUid = ''
    let deleted = false

    const registerCreatedResponse = async (response) => {
      const url = new URL(response.url())
      if (url.origin !== 'https://vmecc-api.amiosh.com' || response.request().method() !== 'POST')
        return
      let body
      try {
        body = await response.json()
      } catch {
        return
      }
      if (url.pathname === '/api/reports/drafts') {
        const draftId = draftIdFromResponse(body)
        if (draftId) {
          draftIds.add(draftId)
          registry.register({ collectionPath: '/reports/drafts', id: draftId })
        }
      }
      if (url.pathname === '/api/reports') {
        const createdId = reportIdFromResponse(body)
        if (createdId) {
          reportUid = createdId
          registry.register({ collectionPath: '/reports', id: createdId })
        }
      }
    }

    context.on('response', registerCreatedResponse)

    const deleteOwnedReportThroughUi = async () => {
      if (!reportUid || deleted) return
      await gotoApprovedRoute(page, `/inspection/${encodeURIComponent(reportUid)}`)
      await waitForApplicationReady(page)
      await waitForRouteSettled(page)
      const isMobile = testInfo.project.name.includes('mobile')
      if (isMobile) {
        const moreActions = page.getByRole('button', { name: 'More actions', exact: true }).last()
        await expect(moreActions).toBeVisible()
        await moreActions.click()
      }
      const deleteAction = page.getByRole('button', { name: 'Delete', exact: true }).last()
      await expect(deleteAction).toBeVisible()
      await deleteAction.click()
      const confirmationSurface = page
        .locator(isMobile ? '.mobile-bottom-drawer--confirm' : '.modal')
        .filter({
          hasText: 'Delete Report',
        })
      const confirmDelete = confirmationSurface.getByRole('button', { name: 'Delete', exact: true })
      await expect(confirmDelete).toBeVisible()
      await confirmDelete.click()
      await expect(page.getByText(/Report deleted:/i)).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(marker, { exact: false }).first()).toBeHidden({ timeout: 30_000 })
      deleted = true
      cleanup.push({ action: 'delete', outcome: 'passed' })
    }

    const deleteOwnedReportViaApiFallback = async () => {
      if (!reportUid || deleted) return
      const result = await page.evaluate(async (id) => {
        const origin = 'https://vmecc-api.amiosh.com/api'
        const session = await fetch(`${origin}/auth/session`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        })
        const payload = await session.json().catch(() => ({}))
        const response = await fetch(`${origin}/reports/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            ...(payload?.csrf_token ? { 'X-CSRF-Token': payload.csrf_token } : {}),
          },
        })
        return response.status
      }, reportUid)
      if (![200, 204, 404].includes(result))
        throw new Error(`Report fallback cleanup returned ${result}`)
      deleted = true
      cleanup.push({
        action: 'delete-fallback',
        outcome: result === 404 ? 'already-deleted' : 'passed',
      })
    }

    const deleteOwnedDraftsThroughApi = async () => {
      for (const draftId of draftIds) {
        const result = await page.evaluate(async (id) => {
          const origin = 'https://vmecc-api.amiosh.com/api'
          const session = await fetch(`${origin}/auth/session`, {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          })
          const payload = await session.json().catch(() => ({}))
          const response = await fetch(`${origin}/reports/drafts/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              Accept: 'application/json',
              ...(payload?.csrf_token ? { 'X-CSRF-Token': payload.csrf_token } : {}),
            },
          })
          return response.status
        }, draftId)
        if (![200, 204, 404].includes(result)) throw new Error(`Draft cleanup returned ${result}`)
        cleanup.push({
          action: 'delete-draft',
          outcome: result === 404 ? 'already-consumed' : 'passed',
        })
      }
    }

    try {
      await loginPersonaThroughUi(page, 'trt')
      const onboardingPrompt = page.getByRole('button', { name: 'Remind me later', exact: true })
      if (await onboardingPrompt.isVisible().catch(() => false)) {
        await onboardingPrompt.click()
        await expect(onboardingPrompt).toBeHidden()
      }

      await gotoApprovedRoute(page, '/inspection/new')
      await waitForApplicationReady(page)
      await waitForRouteSettled(page)
      const showMore = page.getByRole('button', { name: /Show more/i }).first()
      if (await showMore.isVisible().catch(() => false)) await showMore.click()

      await page
        .getByRole('radio', { name: /^General(?:\s|$)/i })
        .first()
        .click()
      await page
        .getByRole('radio', { name: /^Zone 1(?:\s|$)/i })
        .first()
        .click()
      await page
        .getByRole('radio', { name: /^Canteen(?:\s|$)/i })
        .first()
        .click()
      await page
        .getByRole('radio', { name: /^Dry Store(?:\s|$)/i })
        .first()
        .click()
      await expect(page.getByRole('button', { name: 'Add finding', exact: true })).toBeVisible()

      await page.getByRole('button', { name: 'Add finding', exact: true }).click()
      await expect(
        page.getByRole('textbox', { name: 'Describe finding', exact: true }),
      ).toBeVisible()
      await page
        .getByRole('textbox', { name: 'Describe finding', exact: true })
        .fill(`${marker} — General Inspection lifecycle finding`)
      await page
        .getByRole('textbox', { name: 'Finding action required', exact: true })
        .fill(`${marker} — remove the temporary UAT finding after verification`)
      await page.getByRole('button', { name: 'Save finding', exact: true }).click()
      await expect(page.getByText(marker, { exact: false }).first()).toBeVisible()
      const draftSyncFailure = page.getByText('Draft sync failed', { exact: false }).first()
      if (await draftSyncFailure.isVisible().catch(() => false)) {
        throw new Error(`Draft sync failed: ${JSON.stringify(guard.ledger)}`)
      }

      const reviewAction = page.getByRole('button', { name: 'Continue to Review', exact: true })
      await expect(reviewAction).toBeEnabled()
      await reviewAction.click()
      await expect(page).toHaveURL(/\/inspection\/review$/)
      evidence.push(
        await captureEvidenceScreenshot(
          page,
          testInfo,
          `general-inspection-review-${testInfo.project.name}`,
        ),
      )

      const reportCreateResponse = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/reports',
      )
      await page.getByRole('button', { name: 'Submit', exact: true }).click()
      await page.getByRole('button', { name: /Confirm Submit/i }).click()
      const createdResponse = await reportCreateResponse
      expect([200, 201]).toContain(createdResponse.status())
      await expect.poll(() => reportUid).not.toBe('')
      await expect(page).toHaveURL(/\/inspection$/)

      await gotoApprovedRoute(page, `/inspection/${encodeURIComponent(reportUid)}`)
      await waitForApplicationReady(page)
      await waitForRouteSettled(page)
      await expect(page.getByText(marker, { exact: false }).first()).toBeVisible()
      evidence.push(
        await captureEvidenceScreenshot(
          page,
          testInfo,
          `general-inspection-detail-${testInfo.project.name}`,
        ),
      )

      await gotoApprovedRoute(page, `/inspection/${encodeURIComponent(reportUid)}/edit`)
      await waitForApplicationReady(page)
      await waitForRouteSettled(page)
      const editActions = page.getByRole('button', { name: 'Add finding', exact: true })
      await expect(editActions).toBeVisible()
      const findingActions = page.getByRole('button', { name: 'Finding 1 actions', exact: true })
      await findingActions.click()
      await page.getByRole('button', { name: 'Edit finding', exact: true }).click()
      const updatedFinding = `${marker} — General Inspection lifecycle finding updated`
      await page
        .getByRole('textbox', { name: 'Describe finding', exact: true })
        .fill(updatedFinding)
      await page.getByRole('button', { name: 'Save finding', exact: true }).click()
      await expect(page.getByText(updatedFinding, { exact: false }).first()).toBeVisible()
      await page.getByRole('button', { name: 'Continue to Review Updates', exact: true }).click()
      await page.getByRole('button', { name: 'Update', exact: true }).click()
      await page.getByRole('button', { name: /Confirm Update/i }).click()
      await expect(page).toHaveURL(/\/inspection$/)

      await deleteOwnedReportThroughUi()
      const unscopedDraftClearBlocks = guard.ledger.filter(
        (entry) =>
          entry.method === 'DELETE' &&
          entry.url.startsWith('https://vmecc-api.amiosh.com/api/reports/draft?report_type='),
      )
      const unexpectedBlocks = guard.ledger.filter(
        (entry) => !unscopedDraftClearBlocks.includes(entry),
      )
      expect(unexpectedBlocks).toEqual([])
      if (unscopedDraftClearBlocks.length > 0) {
        cleanup.push({ action: 'block-unscoped-draft-clear', outcome: 'blocked-as-designed' })
      }
    } finally {
      try {
        await deleteOwnedReportThroughUi()
      } catch (cleanupError) {
        cleanup.push({
          action: 'delete',
          outcome: 'failed',
          message: String(cleanupError?.message || cleanupError),
        })
        try {
          await deleteOwnedReportViaApiFallback()
        } catch (fallbackError) {
          cleanup.push({
            action: 'delete-fallback',
            outcome: 'failed',
            message: String(fallbackError?.message || fallbackError),
          })
        }
      }
      try {
        await deleteOwnedDraftsThroughApi()
      } catch (cleanupError) {
        cleanup.push({
          action: 'delete-draft',
          outcome: 'failed',
          message: String(cleanupError?.message || cleanupError),
        })
      }
      context.off('response', registerCreatedResponse)
      await testInfo.attach('general-inspection-lifecycle-evidence', {
        body: Buffer.from(JSON.stringify(evidence, null, 2)),
        contentType: 'application/json',
      })
      await testInfo.attach('controlled-crud-guard-ledger', {
        body: Buffer.from(
          serializeControlledCrudLedger({ registry, guardLedger: guard.ledger, cleanup }),
        ),
        contentType: 'application/json',
      })
      await guard.dispose()
    }
  })
})
