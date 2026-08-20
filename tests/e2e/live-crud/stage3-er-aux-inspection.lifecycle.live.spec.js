const { expect, test } = require('@playwright/test')
const {
  captureEvidenceScreenshot,
  gotoApprovedRoute,
  loginPersonaThroughUi,
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

test.describe('controlled live CRUD Stage 3 — ER Auxiliary Equipment Inspection lifecycle', () => {
  test('TRT creates, reads, edits, and deletes one marker-owned ER Aux inspection', async ({
    page,
    context,
  }, testInfo) => {
    test.setTimeout(18 * 60_000)
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

    const ensureLocation = async () => {
      const selectedMain = page.getByRole('button', { name: /^Edit Main Location:/i })
      for (let attempt = 0; attempt < 20; attempt++) {
        if (await selectedMain.isVisible().catch(() => false)) return
        await page.waitForTimeout(200)
      }

      const clickFirstInRadioGroup = async (group) => {
        const isDefined = await group.count()
        if (!isDefined) return
        const radio = group
          .getByRole('radio', { checked: false })
          .filter({ hasNot: page.locator('[disabled]') })
        if ((await radio.count()) === 0) return
        await expect(radio.first(), 'no location option').toBeVisible()
        await radio.first().click()
      }

      const preferredMain = [/^Zone 1(?:\s|$)/i, /^Zone 1$/i, /^Store$/i, /^Office$/i]

      const preferredSub = [/^Canteen(?:\s|$)/i, /^Dry Store(?:\s|$)/i]

      let groups = page.getByRole('radiogroup')
      const initialGroupCount = await groups.count()
      if (initialGroupCount > 0) {
        for (const label of preferredMain) {
          const candidate = page.getByRole('radio', { name: label }).first()
          if (await candidate.isVisible().catch(() => false)) {
            await candidate.click()
            break
          }
        }
        if (
          !(await page
            .getByRole('radio', { checked: true })
            .first()
            .isVisible()
            .catch(() => false))
        ) {
          await clickFirstInRadioGroup(groups.first())
        }
      } else {
        const addMain = page.getByRole('button', { name: /Add main location/i })
        if (await addMain.isVisible().catch(() => false)) {
          await addMain.click()
          const postAddGroups = page.getByRole('radiogroup')
          if ((await postAddGroups.count()) > 0) {
            await clickFirstInRadioGroup(postAddGroups.first())
          }
        }
      }

      // Re-query after main location selection; some flows expose a second locator group for sub-location.
      groups = page.getByRole('radiogroup')
      const secondGroupCount = await groups.count()
      if (secondGroupCount > 1) {
        const secondGroup = groups.nth(1)
        let picked = false
        for (const label of preferredSub) {
          const candidate = secondGroup.getByRole('radio', { name: label }).first()
          if (await candidate.isVisible().catch(() => false)) {
            await candidate.click()
            picked = true
            break
          }
        }
        if (!picked) {
          await clickFirstInRadioGroup(secondGroup)
        }
      }
    }

    const pickPrimaryRow = async () => {
      const rows = page
        .locator('[data-inspection-er-aux-row-id]')
        .or(page.getByRole('button', { name: /Open .* inspection details/i }))
      for (let attempt = 0; attempt < 60; attempt++) {
        if ((await rows.count()) > 0) break
        await page.waitForTimeout(500)
      }
      const count = await rows.count()
      if (count < 1) {
        throw new Error('No ER Aux inspection rows available')
      }
      return rows.first()
    }

    const expectMarkerInBodyText = async () => {
      const bodyText = String((await page.locator('body').textContent()) || '')
      expect(bodyText.includes(marker)).toBeTruthy()
    }

    const openMobileRowDetail = async (row) => {
      const inlineQuantity = row.getByRole('textbox', { name: 'Equipment quantity', exact: true })
      if (await inlineQuantity.isVisible().catch(() => false)) {
        return row
      }

      const fallbackOpenButton = row.locator('.inspection-entity-card__toggle').first()
      const explicitButton = row
        .getByRole('button', { name: /Open .* inspection details/i })
        .first()
      const openButton = (await explicitButton.isVisible().catch(() => false))
        ? explicitButton
        : fallbackOpenButton
      if (await openButton.isVisible().catch(() => false)) {
        await openButton.click()
      } else {
        await row.click()
      }

      const drawer = page.locator('.offcanvas.show').last()
      const rowScope = drawer.locator('.inspection-item-drawer')
      const inRowSave = row.locator('.mobile-bottom-drawer__footer button', { hasText: 'Save' })
      for (let attempt = 0; attempt < 30; attempt++) {
        if (await inlineQuantity.isVisible().catch(() => false)) return row
        if (await drawer.isVisible().catch(() => false)) {
          if (
            (await rowScope.isVisible().catch(() => false)) ||
            (await drawer
              .getByRole('button', { name: /^Save$/i })
              .isVisible()
              .catch(() => false)) ||
            (await inRowSave.isVisible().catch(() => false))
          )
            return drawer
        }
        await page.waitForTimeout(500)
      }

      throw new Error('Row detail scope did not become editable (drawer or inline inputs missing)')
    }

    const saveMobileRowDetail = async (drawer) => {
      const saveButton = drawer.getByRole('button', { name: /^Save$/i }).first()
      await expect(saveButton).toBeVisible()
      await saveButton.click()
      await expect(drawer).toBeHidden()
    }

    const fillOneDefectiveRow = async (row) => {
      const inlineQuantity = row.getByRole('textbox', { name: 'Equipment quantity', exact: true })
      let rowScope = row
      let drawer = null

      if (!(await inlineQuantity.isVisible().catch(() => false))) {
        drawer = await openMobileRowDetail(row)
        rowScope = drawer
      }

      const quantityInput = rowScope.getByRole('textbox', {
        name: 'Equipment quantity',
        exact: true,
      })
      await expect(quantityInput).toBeVisible()
      await quantityInput.clear()
      await quantityInput.fill('1')

      const defectButton = rowScope.getByRole('button', { name: 'Defect', exact: true })
      if (await defectButton.isVisible().catch(() => false)) {
        await defectButton.click()
      }

      const defectTextarea = rowScope.getByRole('textbox', {
        name: 'Defect and corrective action',
        exact: true,
      })
      await expect(defectTextarea).toBeVisible()
      await defectTextarea.fill(marker + ' - ER Aux lifecycle defect')

      if (drawer) {
        await saveMobileRowDetail(drawer)
      }
    }

    const expectReportMarkerInPayload = async () => {
      const markerInPayload = await page.evaluate(
        async (id, markerText) => {
          try {
            const response = await fetch(
              `https://vmecc-api.amiosh.com/api/reports/${encodeURIComponent(id)}`,
              {
                credentials: 'include',
                headers: { Accept: 'application/json' },
              },
            )
            if (!response.ok) return false
            const payload = await response.json().catch(() => ({}))
            return JSON.stringify(payload).includes(markerText)
          } catch {
            return false
          }
        },
        reportUid,
        marker,
      )
      expect(markerInPayload).toBeTruthy()
    }

    const setRowForUpdate = async () => {
      const isMobile = testInfo.project.name.includes('mobile')
      const row = await pickPrimaryRow()
      if (!isMobile) {
        const qty = row.getByRole('textbox', { name: 'Equipment quantity', exact: true })
        await expect(qty).toBeVisible()
        await qty.clear()
        await qty.fill('2')
      } else {
        const drawer = await openMobileRowDetail(row)
        const qty = drawer.getByRole('textbox', { name: 'Equipment quantity', exact: true })
        await expect(qty).toBeVisible()
        await qty.clear()
        await qty.fill('2')
        await saveMobileRowDetail(drawer)
      }
    }

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

      const confirmSurface = page
        .locator(isMobile ? '.mobile-bottom-drawer--confirm' : '.modal')
        .filter({ hasText: /Delete Report/i })
      const confirmDelete = confirmSurface.getByRole('button', { name: 'Delete', exact: true })
      await expect(confirmDelete).toBeVisible()
      await confirmDelete.click()
      await expect(page.getByText(new RegExp(marker, 'i'))).toBeHidden({ timeout: 30_000 })
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

    context.on('response', registerCreatedResponse)

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

      const editType = page.getByRole('button', { name: /^Edit type:/i }).first()
      if (await editType.isVisible().catch(() => false)) {
        await editType.click()
      } else {
        const desktopEditType = page.getByRole('button', { name: 'Edit', exact: true }).first()
        if (await desktopEditType.isVisible().catch(() => false)) await desktopEditType.click()
      }

      await page
        .getByRole('radio', { name: /^Emergency Response Auxiliary Equipment(?:\s|$)/i })
        .first()
        .click()
      await expect(
        page.getByText('Emergency Response Auxiliary Equipment', { exact: true }).first(),
      ).toBeVisible()

      await ensureLocation()

      const row = await pickPrimaryRow()
      await fillOneDefectiveRow(row)
      evidence.push(
        await captureEvidenceScreenshot(
          page,
          testInfo,
          `er-aux-lifecycle-${testInfo.project.name}-filled`,
        ),
      )

      const draftSyncFailure = page.getByText('Draft sync failed', { exact: false }).first()
      const syncWarning = page
        .locator('[role="alert"]')
        .filter({ hasText: /Draft|sync/i })
        .first()
      if (await draftSyncFailure.isVisible().catch(() => false)) {
        throw new Error(`Draft sync failed: ${JSON.stringify(guard.ledger)}`)
      }

      const reviewAction = page.getByRole('button', { name: /Continue to Review$/i }).first()
      await expect(reviewAction).toBeEnabled()
      await reviewAction.click()
      await expect(page).toHaveURL(/\/inspection\/review$/)

      const createReport = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/reports',
      )
      const submitButton = page.getByRole('button', { name: /^Submit$/i }).first()
      await expect(submitButton).toBeVisible({ timeout: 45_000 })
      await submitButton.click()
      await expect(
        page.getByText(/Submit Emergency Response Auxiliary Equipment Inspection/i),
      ).toBeVisible()
      await page.getByRole('button', { name: 'Confirm Submit', exact: true }).click()
      const createdResponse = await createReport
      expect([200, 201]).toContain(createdResponse.status())
      await expect.poll(() => reportUid).not.toBe('')
      evidence.push(
        await captureEvidenceScreenshot(
          page,
          testInfo,
          `er-aux-lifecycle-${testInfo.project.name}-submitted`,
        ),
      )

      await expect(page).toHaveURL(/\/inspection$/)
      await gotoApprovedRoute(page, `/inspection/${encodeURIComponent(reportUid)}`)
      await waitForApplicationReady(page)
      await waitForRouteSettled(page)
      await expect(async () => {
        const bodyText = String((await page.locator('body').textContent()) || '')
        if (bodyText.includes(marker)) return
        await expectReportMarkerInPayload()
      }).toPass({ timeout: 30_000 })
      evidence.push(
        await captureEvidenceScreenshot(
          page,
          testInfo,
          `er-aux-lifecycle-${testInfo.project.name}-detail`,
        ),
      )

      await gotoApprovedRoute(page, `/inspection/${encodeURIComponent(reportUid)}/edit`)
      await waitForApplicationReady(page)
      await waitForRouteSettled(page)
      await setRowForUpdate()
      evidence.push(
        await captureEvidenceScreenshot(
          page,
          testInfo,
          `er-aux-lifecycle-${testInfo.project.name}-edit`,
        ),
      )

      const reviewUpdatesButton = page
        .getByRole('button', { name: 'Continue to Review Updates', exact: true })
        .or(page.getByRole('button', { name: /Continue to Review$/i }))
      await expect(reviewUpdatesButton).toBeVisible()
      await reviewUpdatesButton.click()

      const updateButton = page.getByRole('button', { name: /^Update$/i }).first()
      await expect(updateButton).toBeVisible({ timeout: 45_000 })
      await updateButton.click()
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
      await testInfo.attach('er-aux-lifecycle-evidence', {
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
