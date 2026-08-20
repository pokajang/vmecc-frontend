const fs = require('node:fs')
const path = require('node:path')
const { expect, test } = require('@playwright/test')
const { buildFormRecordSeed } = require('./inspection-live-smoke.helpers')
const {
  getControlledBrowserApiBaseUrl,
  installControlledApiRequestGuard,
} = require('./support/controlled-api-stubs')
const { INSPECTION_TYPES, MATRIX_STATES } = require('./live-uat/inspection-cross-type-matrix')

const apiBaseUrl = getControlledBrowserApiBaseUrl()
const fixedDate = '2026-08-12T04:30:00.000Z'
const auditUser = {
  id: 903,
  name: 'Inspection UIUX Auditor',
  email: 'inspection.uiux.audit@example.test',
  status: 'active',
  permissions: ['*'],
  roles: ['System Administrator'],
}

const slug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const records = INSPECTION_TYPES.map((type, index) => {
  const seed = buildFormRecordSeed(type.label, `uiux-${index + 1}`)
  const payload = {
    ...seed.payload,
    inspectionType: type.formType || seed.payload.inspectionType,
    incidentType: type.formType || seed.payload.incidentType,
  }
  return {
    report_uid: `inspection-uiux-${type.key}`,
    display_id: `INS-UIUX-${String(index + 1).padStart(2, '0')}`,
    report_type: 'inspection',
    status: 'Submitted',
    submitted_at: fixedDate,
    inspected_at: fixedDate,
    created_at: fixedDate,
    updated_at: fixedDate,
    payload,
    record_actions_version: 1,
    record_actions: {
      view: { applicable: true, allowed: true },
      download: { applicable: true, allowed: true, format: 'pdf' },
      back: { applicable: true, allowed: true },
    },
  }
})

const json = (route, body, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

const installInspectionApiStubs = async (page) => {
  await installControlledApiRequestGuard(page, apiBaseUrl)
  let draftVersion = 0
  // Match the compiled browser API origin as well as the configured guard origin.
  // Local Vite and preview builds may use localhost or 127.0.0.1 interchangeably.
  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const pathname = url.pathname.replace(/^\/api/, '')
    const method = request.method().toUpperCase()

    if (pathname === '/auth/session') {
      return json(route, { user: auditUser, csrf_token: 'inspection-uiux-controlled-token' })
    }
    if (pathname === '/settings/modules') {
      return json(route, {
        data: { registry: [], configured: {}, effective: {}, fallbackMode: true },
      })
    }
    if (pathname === '/settings/system-maintenance') {
      return json(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (pathname === '/workflow/notifications/unread-count') {
      return json(route, { data: { unread_count: 0 } })
    }
    if (pathname === '/reports/draft' && method === 'GET') {
      return json(route, { data: null })
    }
    if (pathname === '/reports/drafts' && method === 'POST') {
      draftVersion += 1
      const body = request.postDataJSON() || {}
      return json(route, {
        data: {
          draft_id: 'inspection-uiux-controlled-draft',
          version: draftVersion,
          saved_at: fixedDate,
          payload: body.payload || {},
        },
      })
    }
    if (/^\/reports\/drafts\//.test(pathname) && ['PUT', 'DELETE'].includes(method)) {
      draftVersion += 1
      const body = request.postDataJSON?.() || {}
      return json(route, {
        data:
          method === 'DELETE'
            ? null
            : {
                draft_id: 'inspection-uiux-controlled-draft',
                version: draftVersion,
                saved_at: fixedDate,
                payload: body.payload || {},
              },
      })
    }
    if (pathname === '/reports' && method === 'GET') {
      return json(route, { data: records, meta: { total: records.length } })
    }
    if (pathname === '/reports/inspection/checklist-summary') {
      return json(route, {
        data: { totalReports: 8, withChecklist: 8, withoutChecklist: 0, items: [] },
      })
    }
    if (pathname === '/inspection/sessions' && method === 'POST') {
      return json(route, {
        data: {
          sessionUid: 'inspection-uiux-controlled-session',
          status: 'active',
          version: 1,
          results: [],
          progress: { total: 1, completed: 0, sessionVersion: 1 },
        },
      })
    }
    if (/^\/inspection\/sessions\/[^/]+\/extinguishers$/.test(pathname) && method === 'GET') {
      return json(route, {
        data: [],
        meta: { total: 1, completed: 0, sessionVersion: 1 },
      })
    }
    if (/^\/inspection\/sessions\/[^/]+$/.test(pathname) && method === 'GET') {
      return json(route, {
        data: {
          sessionUid: 'inspection-uiux-controlled-session',
          status: 'active',
          version: 1,
          results: [],
          progress: { total: 1, completed: 0, sessionVersion: 1 },
        },
      })
    }
    if (
      /^\/inspection\/sessions\/[^/]+\/extinguishers\/[^/]+\/complete$/.test(pathname) &&
      method === 'POST'
    ) {
      const body = request.postDataJSON() || {}
      return json(route, {
        data: {
          id: `inspection-uiux-result-${Date.now()}`,
          status: 'completed',
          version: 1,
          checkPayload: body.checkPayload || {},
          checkedByUserId: auditUser.id,
          checkedBy: auditUser.name,
          checkedAt: fixedDate,
        },
        meta: { total: 1, completed: 1, sessionVersion: 1 },
      })
    }
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      return json(route, { message: `Unexpected controlled mutation: ${method} ${pathname}` }, 409)
    }
    return json(route, { data: [], meta: {} })
  })
}

const capture = async (pageOrLocator, testInfo, relativePath, options = {}) => {
  const target = testInfo.outputPath('inspection-cross-type-uat', relativePath)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await pageOrLocator.screenshot({ path: target, animations: 'disabled', ...options })
  return target
}

const waitForReady = async (page) => {
  await page.locator('#root').waitFor({ state: 'visible' })
  await page.waitForFunction(
    () => !/Loading application|Restoring session/i.test(document.body.innerText),
  )
  await page.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => {})
}

const revealAllTypes = async (page) => {
  const more = page.getByRole('button', { name: /Show more/i }).first()
  if (await more.isVisible().catch(() => false)) await more.click()
}

const captureTypeEntry = async ({ context, testInfo, type, mode }) => {
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  try {
    await installInspectionApiStubs(page)
    await page.goto('/inspection', { waitUntil: 'domcontentloaded' })
    await waitForReady(page)
    if (mode === 'desktop') {
      await page.locator('[data-testid="inspection-new"]:visible').first().click()
      await waitForReady(page)
    }
    await revealAllTypes(page)
    const chooserLabel = type.chooserLabel || type.label
    await page.getByRole('button', { name: chooserLabel, exact: true }).first().click()
    await page.waitForURL(/\/inspection\/new$/)
    await expect(page.getByText(type.label, { exact: true }).first()).toBeVisible()
    await capture(page, testInfo, `screenshots/${mode}/${type.key}/01-controlled-entry.png`, {
      fullPage: true,
    })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
    expect(pageErrors).toEqual([])
  } finally {
    await page.close()
  }
}

const captureActualTypeForm = async ({ browser, testInfo, type, profile }) => {
  const seed = buildFormRecordSeed(type.label, `actual-${profile.mode}`)
  const form = {
    ...seed.payload,
    inspectionType: type.formType || seed.payload.inspectionType,
    incidentType: type.formType || seed.payload.incidentType,
  }
  const context = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    isMobile: profile.mode === 'mobile',
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  try {
    await page.addInitScript(
      ({ userId, form }) => {
        sessionStorage.setItem(
          `inspection_workspace_v1_${userId}`,
          JSON.stringify({ mode: 'new', recordId: '', form }),
        )
      },
      { userId: auditUser.id, form },
    )
    await installInspectionApiStubs(page)
    await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
    await waitForReady(page)
    await expect(page.getByText(type.label, { exact: true }).first()).toBeVisible()
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    await capture(page, testInfo, `screenshots/${profile.mode}/${type.key}/11-actual-viewport.png`)
    await capture(
      page,
      testInfo,
      `screenshots/${profile.mode}/${type.key}/12-actual-complete-form.png`,
      { fullPage: true },
    )

    const formMetrics = await page.evaluate(() => {
      const inspectionCards = [...document.querySelectorAll('.inspection-check-card')]
      const stickyActions = document.querySelector(
        '.inspection-form-actions .action-row-thumb--compact-sticky .action-row-thumb-actions',
      )
      const actionButtons = [...(stickyActions?.querySelectorAll(':scope > .btn') || [])].filter(
        (button) => button.offsetParent !== null,
      )
      const primaryButton = actionButtons.find((button) =>
        button.classList.contains('workflow-stage-actions__primary'),
      )
      const stickyGroup = stickyActions?.closest('.action-row-thumb--compact-sticky')
      const stickyStyle = stickyGroup ? getComputedStyle(stickyGroup) : null
      const stickyStatus = stickyGroup?.querySelector('.action-row-thumb-status')
      const stickySpacer = stickyGroup?.nextElementSibling?.classList.contains(
        'action-row-thumb-spacer--compact',
      )
        ? stickyGroup.nextElementSibling
        : null
      const actionRects = actionButtons.map((button) => {
        const rect = button.getBoundingClientRect()
        return { label: button.textContent.trim(), top: rect.top, width: rect.width }
      })

      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        cardCount: inspectionCards.length,
        nestedCardCount: document.querySelectorAll('.inspection-check-card .inspection-check-card')
          .length,
        cardChevronCount: document.querySelectorAll(
          '.inspection-check-card .inspection-entity-card__chevron',
        ).length,
        cardActionCount: document.querySelectorAll(
          '.inspection-check-card > .card-header .inspection-fire-extinguisher-card-actions .row-actions',
        ).length,
        missingSummaryCount: inspectionCards
          .flatMap((card) => [...card.querySelectorAll('.badge')])
          .filter((badge) => /^\d+\s+missing$/i.test(badge.textContent.trim())).length,
        fieldCount: document.querySelectorAll('input, select, textarea').length,
        buttonCount: [...document.querySelectorAll('button')].filter(
          (button) => button.offsetParent !== null,
        ).length,
        actionContainerWidth: stickyActions?.getBoundingClientRect().width || 0,
        availableActionWidth: stickyGroup
          ? stickyGroup.getBoundingClientRect().width -
            parseFloat(stickyStyle.paddingLeft) -
            parseFloat(stickyStyle.paddingRight)
          : 0,
        actionRects,
        primaryTop: primaryButton?.getBoundingClientRect().top || 0,
        stickyHasStatus: Boolean(stickyStatus?.textContent.trim()),
        stickyBorderWidth: stickyStyle?.borderTopWidth || '',
        stickyBackground: stickyStyle?.backgroundColor || '',
        stickyBoxShadow: stickyStyle?.boxShadow || '',
        stickyPosition: stickyStyle?.position || '',
        stickySpacerHeight: stickySpacer?.getBoundingClientRect().height || 0,
        stickyDockedAtEnd: stickyGroup?.classList.contains('action-row-thumb--docked-at-end'),
      }
    })
    expect(formMetrics.overflow).toBeLessThanOrEqual(1)
    if (formMetrics.cardCount > 0) {
      expect(formMetrics.cardChevronCount).toBe(0)
      expect(formMetrics.cardActionCount).toBe(0)
      expect(formMetrics.missingSummaryCount).toBe(0)
    }
    if (formMetrics.actionRects.length > 0) {
      await expect(
        page.getByText('Saved locally. Backend sync pending', { exact: true }),
      ).toHaveCount(0)
      expect(
        Math.abs(formMetrics.actionContainerWidth - formMetrics.availableActionWidth),
      ).toBeLessThanOrEqual(2)
      for (const action of formMetrics.actionRects) {
        expect(Math.abs(action.width - formMetrics.actionContainerWidth)).toBeLessThanOrEqual(2)
      }
      expect(formMetrics.primaryTop).toBeGreaterThan(0)
      expect(formMetrics.primaryTop).toBe(
        Math.min(...formMetrics.actionRects.map(({ top }) => top)),
      )
      if (!formMetrics.stickyHasStatus) {
        expect(formMetrics.stickyBorderWidth).toBe('0px')
        expect(formMetrics.stickyBackground).toBe('rgba(0, 0, 0, 0)')
        expect(formMetrics.stickyBoxShadow).toBe('none')
        if (formMetrics.actionRects.length === 1) {
          expect(formMetrics.stickySpacerHeight).toBeLessThanOrEqual(132.5)
        }
      }
      expect(formMetrics.stickyDockedAtEnd).toBe(false)
      expect(formMetrics.stickyPosition).toBe('fixed')
    }

    expect(pageErrors).toEqual([])
    return formMetrics
  } finally {
    await context.close()
  }
}

test('captures consolidated inspection entry, state, evidence and detail views', async ({
  browser,
}, testInfo) => {
  test.setTimeout(12 * 60_000)
  const audit = { checkpoints: [], pageErrors: [] }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  })

  for (const type of INSPECTION_TYPES) {
    await captureTypeEntry({ context, testInfo, type, mode: 'mobile' })
    audit.checkpoints.push({ mode: 'mobile', type: type.key, checkpoint: 'entry' })
  }

  const page = await context.newPage()
  page.on('pageerror', (error) => audit.pageErrors.push(error.message))
  await installInspectionApiStubs(page)

  try {
    await page.goto('/inspection', { waitUntil: 'domcontentloaded' })
    await waitForReady(page)
    const recordsToolbar = page.locator('.mobile-workflow-home__records-toolbar')
    await expect(recordsToolbar).toBeVisible()
    const scopeContainer = recordsToolbar.locator('.workflow-scope-segmented')
    await expect(scopeContainer).toHaveCSS('border-top-width', '0px')
    const activeScopeChip = recordsToolbar.locator('.workflow-scope-segment[data-active="true"]')
    const viewAllChip = recordsToolbar.locator('.mobile-workflow-home__action-chip')
    await expect(activeScopeChip).toHaveCSS('border-top-left-radius', '999px')
    await expect(viewAllChip).toHaveCSS('border-top-left-radius', '999px')
    for (const chip of [activeScopeChip, viewAllChip]) {
      const chipBox = await chip.boundingBox()
      expect(chipBox?.height || 0).toBeGreaterThanOrEqual(43.5)
    }
    await capture(page, testInfo, 'screenshots/mobile/inspection-home-action-chips.png', {
      fullPage: true,
    })
    audit.checkpoints.push({ mode: 'mobile', checkpoint: 'inspection-home-action-chips' })

    for (const profile of [
      { mode: 'mobile', matrixViewport: 'mobile', width: 390, height: 844 },
      { mode: 'desktop', matrixViewport: 'desktop', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width: profile.width, height: profile.height })
      for (const type of INSPECTION_TYPES) {
        for (const state of MATRIX_STATES) {
          await page.goto(
            `/inspection/ux-matrix?viewport=${profile.matrixViewport}&state=${state}&type=${type.key}`,
            { waitUntil: 'domcontentloaded' },
          )
          await waitForReady(page)
          const matrixCase = page.locator(
            `[data-matrix-case="${type.key}:${state}:${profile.matrixViewport}"]`,
          )
          await expect(matrixCase).toBeVisible()
          await capture(
            matrixCase,
            testInfo,
            `screenshots/${profile.mode}/${type.key}/matrix-${state}.png`,
          )
          const metrics = await matrixCase.evaluate((element) => ({
            width: element.getBoundingClientRect().width,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            cardCount: element.querySelectorAll('.card').length,
            nestedCardCount: [...element.querySelectorAll('.card .card')].length,
            visibleButtonCount: [...element.querySelectorAll('button')].filter(
              (button) => button.offsetParent !== null,
            ).length,
          }))
          audit.checkpoints.push({
            mode: profile.mode,
            type: type.key,
            checkpoint: state,
            ...metrics,
          })

          if (profile.mode === 'mobile' && state === 'complete-with-next-location') {
            const evidenceAction = matrixCase
              .getByRole('button', { name: /^(General photos|Add observation photo)/i })
              .first()
            if (await evidenceAction.isVisible().catch(() => false)) {
              await evidenceAction.click()
              const drawer = page.locator('.offcanvas.show').last()
              await expect(drawer).toBeVisible()
              await capture(
                drawer,
                testInfo,
                `screenshots/mobile/${type.key}/09-evidence-drawer.png`,
              )
              await drawer.getByRole('button', { name: /Close/i }).click()
              await expect(drawer).toBeHidden()
            }
          }
        }

        if (profile.mode === 'mobile') {
          await page.evaluate(() =>
            document.documentElement.setAttribute('data-coreui-theme', 'dark'),
          )
          const darkCase = page.locator(
            `[data-matrix-case="${type.key}:complete-with-next-location:mobile"]`,
          )
          await capture(
            darkCase,
            testInfo,
            `screenshots/dark/${type.key}/matrix-complete-with-next-location.png`,
          )
          await page.evaluate(() =>
            document.documentElement.setAttribute('data-coreui-theme', 'light'),
          )
        }
      }
    }

    await page.setViewportSize({ width: 360, height: 800 })
    for (const type of INSPECTION_TYPES) {
      await page.goto(
        `/inspection/ux-matrix?viewport=mobile&state=complete-with-next-location&type=${type.key}`,
        { waitUntil: 'domcontentloaded' },
      )
      await waitForReady(page)
      const matrixCase = page.locator(
        `[data-matrix-case="${type.key}:complete-with-next-location:mobile"]`,
      )
      await capture(matrixCase, testInfo, `screenshots/narrow-mobile/${type.key}/complete.png`)
      const overflow = await matrixCase.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      )
      audit.checkpoints.push({
        mode: 'narrow-mobile',
        type: type.key,
        checkpoint: 'complete',
        overflow,
      })
    }

    for (const profile of [
      { mode: 'mobile', width: 390, height: 844 },
      { mode: 'desktop', width: 1440, height: 900 },
    ]) {
      await page.setViewportSize({ width: profile.width, height: profile.height })
      for (const type of INSPECTION_TYPES) {
        await page.goto(`/inspection/inspection-uiux-${type.key}`, {
          waitUntil: 'domcontentloaded',
        })
        await waitForReady(page)
        await expect(page.getByText('Inspection Details', { exact: true }).first()).toBeVisible()
        const detail = page.locator('.inspection-detail-section')
        if (profile.mode === 'mobile') {
          const reportInformation = detail.locator('.inspection-report-meta-disclosure')
          await expect(reportInformation).toBeVisible()
          await expect(reportInformation).not.toHaveAttribute('open', '')
          await expect(detail.getByText('Report Metadata', { exact: true })).toHaveCount(0)
          const reportInformationSummary = reportInformation.locator('summary')
          const summaryBox = await reportInformationSummary.boundingBox()
          expect(summaryBox?.height || 0).toBeGreaterThanOrEqual(43.5)
          await reportInformationSummary.click()
          await expect(reportInformation).toHaveAttribute('open', '')
          await expect(
            reportInformation.getByText('Inspection Date/Time', { exact: true }),
          ).toBeVisible()
          await reportInformationSummary.click()
          await expect(reportInformation).not.toHaveAttribute('open', '')
          const terminalActions = detail.locator('.action-row-thumb--terminal')
          await expect(terminalActions).toBeVisible()
          await expect(terminalActions).toHaveCSS('position', 'static')
          const terminalButtons = terminalActions.locator('.action-row-thumb-actions > .btn')
          const terminalButtonCount = await terminalButtons.count()
          for (let index = 0; index < terminalButtonCount; index += 1) {
            const buttonBox = await terminalButtons.nth(index).boundingBox()
            expect(buttonBox?.height || 0).toBeGreaterThanOrEqual(43.5)
          }
        } else {
          await expect(detail.getByText('Report Metadata', { exact: true })).toBeVisible()
          await expect(detail.locator('.inspection-report-meta-disclosure')).toHaveCount(0)
        }
        if (type.key === 'health-safety-environment-inspection') {
          const findings = page.locator('.inspection-detail-finding-accordion-item')
          await expect(findings).toHaveCount(1)
          await expect(page.getByText('Follow-up and evidence', { exact: true })).toHaveCount(0)
          await expect(findings.locator('.badge', { hasText: /^Finding$/i })).toHaveCount(0)
          const findingToggle = findings.locator('.accordion-button')
          await expect(findingToggle).toHaveAttribute('aria-expanded', 'false')
          await findingToggle.click()
          await expect(findingToggle).toHaveAttribute('aria-expanded', 'true')
          const evidence = findings.locator('.inspection-readonly-evidence')
          await expect(evidence).toBeVisible()
          await expect(evidence).not.toHaveClass(/\bborder\b|\bbg-light-subtle\b/)
          const preview = evidence.locator('.workflow-photo-preview--uncropped')
          await expect(preview).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
          await expect(preview).toHaveCSS('padding-top', '0px')
        }
        await capture(
          page,
          testInfo,
          `screenshots/${profile.mode}/${type.key}/18-controlled-detail.png`,
          {
            fullPage: true,
          },
        )
        audit.checkpoints.push({ mode: profile.mode, type: type.key, checkpoint: 'detail' })
      }
    }
  } finally {
    await context.close()
  }

  const auditPath = testInfo.outputPath('inspection-cross-type-uat', 'checkpoint-ledger.json')
  fs.mkdirSync(path.dirname(auditPath), { recursive: true })
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')
  expect(audit.pageErrors).toEqual([])
  expect(audit.checkpoints.filter((entry) => Number(entry.overflow || 0) > 1)).toEqual([])
})

test('captures every real inspection type form with controlled data', async ({
  browser,
}, testInfo) => {
  test.setTimeout(12 * 60_000)
  const audit = { checkpoints: [] }
  const profile = { mode: 'mobile', width: 390, height: 844 }

  for (const type of INSPECTION_TYPES) {
    const metrics = await captureActualTypeForm({ browser, testInfo, type, profile })
    audit.checkpoints.push({ type: type.key, mode: profile.mode, ...metrics })
  }

  const auditPath = testInfo.outputPath('inspection-cross-type-uat', 'actual-form-ledger.json')
  fs.mkdirSync(path.dirname(auditPath), { recursive: true })
  fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')

  expect(audit.checkpoints).toHaveLength(INSPECTION_TYPES.length)
  expect(audit.checkpoints.some(({ actionRects }) => actionRects.length > 0)).toBe(true)
  expect(audit.checkpoints.some(({ stickyDockedAtEnd }) => stickyDockedAtEnd === false)).toBe(true)
  expect(audit.checkpoints.every(({ stickyDockedAtEnd }) => stickyDockedAtEnd === false)).toBe(true)
})

test('keeps structured scope selection consistent across Fire Truck, High Angle and SCBA', async ({
  browser,
}, testInfo) => {
  const scopedTypes = INSPECTION_TYPES.filter((type) =>
    ['frt-daily-inspection', 'high-angle-rescue-equipment-inspection', 'scba-inspection'].includes(
      type.key,
    ),
  )

  for (const profile of [
    { mode: 'mobile', width: 390, height: 844, isMobile: true },
    { mode: 'desktop', width: 1440, height: 900, isMobile: false },
  ]) {
    for (const type of scopedTypes) {
      const seed = buildFormRecordSeed(type.label, `scope-${profile.mode}`)
      const form = {
        ...seed.payload,
        inspectionType: type.formType || seed.payload.inspectionType,
        incidentType: type.formType || seed.payload.incidentType,
        subLocation: type.key === 'frt-daily-inspection' ? '' : seed.payload.subLocation,
      }
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        isMobile: profile.isMobile,
      })
      const page = await context.newPage()
      const pageErrors = []
      page.on('pageerror', (error) => pageErrors.push(error.message))

      try {
        await page.addInitScript(
          ({ userId, form }) => {
            sessionStorage.setItem(
              `inspection_workspace_v1_${userId}`,
              JSON.stringify({ mode: 'new', recordId: '', form }),
            )
          },
          { userId: auditUser.id, form },
        )
        await installInspectionApiStubs(page)
        await page.goto('/inspection/new', { waitUntil: 'domcontentloaded' })
        await waitForReady(page)

        const firstScope = page.locator('[data-inspection-scope-option]').first()
        await expect(firstScope).toBeVisible()
        await expect(firstScope).toContainText(/\d+ items?\s*•\s*\d+\/\d+ checked/i)
        await expect(firstScope).not.toContainText(/missing|issue\(s\)/i)
        await firstScope.click()

        const activeScopeContent = page.locator('[data-inspection-scope-content]').first()
        await expect(activeScopeContent).toBeVisible()
        await expect
          .poll(() =>
            page.evaluate(() =>
              document.activeElement?.hasAttribute('data-inspection-scope-content'),
            ),
          )
          .toBe(true)

        if (profile.isMobile) {
          await expect(page.locator('[data-inspection-scope-option]')).toHaveCount(0)
          await expect(
            page.getByText(/\d+\/\d+ checked(?:\s*•\s*\d+ issues?)?/i).first(),
          ).toBeVisible()
        } else {
          await expect(
            page.locator('[data-inspection-scope-option][aria-pressed="true"]'),
          ).toHaveCount(1)
          await expect(page.getByText('Selected', { exact: true })).toBeVisible()
        }

        expect(
          await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        ).toBeLessThanOrEqual(1)
        expect(pageErrors).toEqual([])
        await capture(
          page,
          testInfo,
          `screenshots/${profile.mode}/${type.key}/13-scope-selected.png`,
          { fullPage: true },
        )
      } finally {
        await context.close()
      }
    }
  }
})

test('keeps persistent and terminal mobile inspection actions full-width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await installInspectionApiStubs(page)
  await page.goto('/inspection/ux-matrix', { waitUntil: 'domcontentloaded' })
  await waitForReady(page)
  await page.locator('#root').evaluate((root) => {
    root.innerHTML = `
      <div class="inspection-form-actions">
        <div class="action-row-thumb action-row-thumb--compact-sticky">
          <div class="action-row-thumb-actions">
            <button class="btn btn-primary workflow-stage-actions__primary" type="button">
              Continue to Review
            </button>
            <button class="btn btn-outline-secondary" type="button">Save Draft</button>
          </div>
        </div>
        <div class="action-row-thumb-spacer action-row-thumb-spacer--compact"></div>
      </div>
      <div class="action-row-thumb action-row-thumb--terminal inspection-detail-inline-actions">
        <div class="action-row-thumb-actions">
          <button class="btn btn-outline-primary" type="button">Edit</button>
          <button class="btn btn-outline-secondary" type="button">More actions</button>
        </div>
      </div>
    `
  })

  const metrics = await page.locator('.action-row-thumb--compact-sticky').evaluate((group) => {
    const buttons = [...group.querySelectorAll('.action-row-thumb-actions > .btn')]
    const primary = group.querySelector('.workflow-stage-actions__primary')
    const secondary = buttons.find((button) => button !== primary)
    const actionContainer = group.querySelector('.action-row-thumb-actions')
    const style = getComputedStyle(group)
    const availableWidth =
      group.getBoundingClientRect().width -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)

    return {
      availableWidth,
      actionContainerWidth: actionContainer.getBoundingClientRect().width,
      buttonWidths: buttons.map((button) => button.getBoundingClientRect().width),
      primaryTop: primary.getBoundingClientRect().top,
      secondaryTop: secondary.getBoundingClientRect().top,
    }
  })

  expect(Math.abs(metrics.actionContainerWidth - metrics.availableWidth)).toBeLessThanOrEqual(2)
  for (const width of metrics.buttonWidths) {
    expect(Math.abs(width - metrics.actionContainerWidth)).toBeLessThanOrEqual(2)
  }
  expect(metrics.primaryTop).toBeLessThan(metrics.secondaryTop)

  const twoActionSpacerHeight = await page
    .locator('.action-row-thumb-spacer--compact')
    .evaluate((spacer) => spacer.getBoundingClientRect().height)
  expect(twoActionSpacerHeight).toBeLessThanOrEqual(172.5)

  await page.getByRole('button', { name: 'Save Draft' }).evaluate((button) => button.remove())
  const singleActionSpacerHeight = await page
    .locator('.action-row-thumb-spacer--compact')
    .evaluate((spacer) => spacer.getBoundingClientRect().height)
  expect(singleActionSpacerHeight).toBeLessThanOrEqual(132.5)
  expect(twoActionSpacerHeight - singleActionSpacerHeight).toBeGreaterThanOrEqual(39)

  const terminalMetrics = await page.locator('.action-row-thumb--terminal').evaluate((group) => {
    const container = group.querySelector('.action-row-thumb-actions')
    const buttons = [...container.querySelectorAll(':scope > .btn')]
    return {
      groupWidth: group.getBoundingClientRect().width,
      containerWidth: container.getBoundingClientRect().width,
      buttonWidths: buttons.map((button) => button.getBoundingClientRect().width),
      buttonHeights: buttons.map((button) => button.getBoundingClientRect().height),
      buttonTops: buttons.map((button) => button.getBoundingClientRect().top),
      position: getComputedStyle(group).position,
    }
  })
  expect(terminalMetrics.position).toBe('static')
  expect(Math.abs(terminalMetrics.containerWidth - terminalMetrics.groupWidth)).toBeLessThanOrEqual(
    2,
  )
  terminalMetrics.buttonWidths.forEach((width) => {
    expect(Math.abs(width - terminalMetrics.containerWidth)).toBeLessThanOrEqual(2)
  })
  terminalMetrics.buttonHeights.forEach((height) => expect(height).toBeGreaterThanOrEqual(43.5))
  expect(terminalMetrics.buttonTops[0]).toBeLessThan(terminalMetrics.buttonTops[1])
})
