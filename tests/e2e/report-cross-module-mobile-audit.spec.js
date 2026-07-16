const { expect, test } = require('@playwright/test')
const { writeFile } = require('node:fs/promises')
const { REPORT_MOBILE_AUDIT_MATRIX } = require('./support/report-mobile-audit-matrix')

const baseUrl = process.env.VMECC_E2E_BASE_URL || 'http://localhost:3000'
const smokeEmail =
  process.env.VMECC_MOBILE_AUDIT_EMAIL || 'codex.smoke.tactical-response-team@vmecc.local'
const smokePassword = process.env.VMECC_SMOKE_RBAC_PASSWORD || 'SmokeRole!2026'
const requiredHeaderActionNames = [
  'Toggle sidebar',
  'Ask AI',
  'Report issue',
  'Notifications',
  'Account',
]

const viewports = [
  { key: 'mobile-320', width: 320, height: 568 },
  { key: 'mobile-390', width: 390, height: 844 },
  { key: 'mobile-landscape-844', width: 844, height: 390 },
  { key: 'tablet-768', width: 768, height: 1024 },
  { key: 'tablet-820', width: 820, height: 1180 },
  { key: 'tablet-912', width: 912, height: 1368 },
  { key: 'tablet-landscape-1024', width: 1024, height: 768 },
  { key: 'desktop-1440', width: 1440, height: 1000 },
]

const collectPageMetrics = () => {
  const isVisibleElement = (element) => {
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return (
      !element.closest('[aria-hidden="true"], [inert]') &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || 1) > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > 0 &&
      rect.left < window.innerWidth
    )
  }
  const accessibleLabel = (element) =>
    String(
      element.getAttribute('aria-label') ||
        element.getAttribute('title') ||
        element.textContent ||
        element.getAttribute('name') ||
        element.id ||
        element.tagName,
    )
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)
  const root = document.documentElement
  const body = document.body
  const viewportWidth = window.innerWidth
  const documentWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0)
  const interactiveSelector = [
    'button',
    'a[href]',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    '[role="button"]',
    '[role="radio"]',
    '[role="checkbox"]',
  ].join(',')

  const interactiveElements = [...document.querySelectorAll(interactiveSelector)].filter(
    isVisibleElement,
  )
  const undersizedTouchTargets = interactiveElements
    .map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        label: accessibleLabel(element),
        tag: element.tagName.toLowerCase(),
        className: String(element.className || '').slice(0, 160),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      }
    })
    .filter((row) => row.width < 44 || row.height < 44)

  const sharedHeaderActions = [...document.querySelectorAll('.header .app-header-action')]
    .filter(isVisibleElement)
    .map((element) => {
      const rect = element.getBoundingClientRect()
      return {
        label: accessibleLabel(element),
        tag: element.tagName.toLowerCase(),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      }
    })

  const undersizedNativeChoices = interactiveElements
    .filter(
      (element) =>
        element.tagName === 'INPUT' &&
        /(^|\s)form-check-input(\s|$)/.test(String(element.className || '')),
    )
    .map((element) => {
      const labelledTarget = element.closest('.form-check') || element
      const rect = labelledTarget.getBoundingClientRect()
      return {
        label: accessibleLabel(element),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      }
    })
    .filter((row) => row.width < 44 || row.height < 44)

  const clippedCriticalText = [
    ...document.querySelectorAll(
      '.report-mobile-context__value, .erco-mobile-context__value, .workflow-detail-field__value',
    ),
  ]
    .filter(isVisibleElement)
    .filter((element) => element.scrollWidth > element.clientWidth + 1)
    .map((element) => ({
      text: accessibleLabel(element),
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }))

  const actionGroups = [
    ...document.querySelectorAll(
      '.report-setup-actions, .erco-setup-actions, .inspection-form-inline-actions',
    ),
  ]
    .filter(isVisibleElement)
    .map((group) => {
      const groupRect = group.getBoundingClientRect()
      const buttons = [...group.querySelectorAll('button')].filter(isVisibleElement)
      const buttonRects = buttons.map((button) => {
        const rect = button.getBoundingClientRect()
        return {
          label: accessibleLabel(button),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })
      return {
        className: group.className,
        left: Math.round(groupRect.left),
        width: Math.round(groupRect.width),
        buttons: buttonRects,
        loneButtonWidthRatio:
          buttonRects.length === 1 && groupRect.width
            ? Math.round((buttonRects[0].width / groupRect.width) * 1000) / 1000
            : null,
      }
    })

  const setupWhitespace = [
    ...document.querySelectorAll('.report-setup-grid, .erco-mobile-setup-grid'),
  ]
    .filter(isVisibleElement)
    .map((grid) => {
      const action = grid.querySelector('.report-setup-actions, .erco-setup-actions')
      if (!action || !isVisibleElement(action)) return null
      const actionRect = action.getBoundingClientRect()
      const priorBottom = [...grid.querySelectorAll('*')]
        .filter(
          (element) => element !== action && !action.contains(element) && isVisibleElement(element),
        )
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.bottom <= actionRect.top + 1)
        .reduce((maximum, rect) => Math.max(maximum, rect.bottom), grid.getBoundingClientRect().top)
      return {
        className: grid.className,
        gapBeforeActions: Math.max(0, Math.round(actionRect.top - priorBottom)),
        gridHeight: Math.round(grid.getBoundingClientRect().height),
      }
    })
    .filter(Boolean)

  return {
    viewport: { width: viewportWidth, height: window.innerHeight },
    documentWidth,
    horizontalOverflow: Math.max(0, documentWidth - viewportWidth),
    interactiveCount: interactiveElements.length,
    undersizedTouchTargets,
    undersizedNativeChoices,
    sharedHeaderActions,
    clippedCriticalText,
    actionGroups,
    setupWhitespace,
  }
}

const dismissIncidentalDialogs = async (page) => {
  for (const dialogName of ['Install VMECC', 'Notifications']) {
    const dialog = page.getByRole('dialog', { name: dialogName })
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Close' }).first().click()
    }
  }
}

const login = async (page) => {
  await page.goto(`${baseUrl}/login`)
  await page.getByLabel('Email address').fill(smokeEmail)
  await page.locator('#login-password').fill(smokePassword)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
  await dismissIncidentalDialogs(page)
}

test.use({
  viewport: { width: 320, height: 568 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 1,
})

test.describe('cross-module mobile UI audit', () => {
  test('captures responsive metrics and screenshots for every registered report form', async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000)
    await login(page)

    const auditRows = []
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })

      for (const module of REPORT_MOBILE_AUDIT_MATRIX) {
        await page.goto(`${baseUrl}${module.route}`)
        await dismissIncidentalDialogs(page)
        await expect(page.getByText(new RegExp(module.heading, 'i')).first()).toBeVisible({
          timeout: 30_000,
        })
        await expect(page.getByTestId(module.readyTestId)).toBeVisible({ timeout: 30_000 })
        await expect(page.getByText(/Unable to restore session/i)).toHaveCount(0)

        const metrics = await page.evaluate(collectPageMetrics)
        const row = {
          module: module.key,
          viewportKey: viewport.key,
          route: module.route,
          ...metrics,
        }
        auditRows.push(row)
        if (process.env.VMECC_MOBILE_AUDIT_PRINT_METRICS === '1') {
          console.log(`MOBILE_AUDIT ${JSON.stringify(row)}`)
        }

        await page.screenshot({
          path: testInfo.outputPath(`${module.key}-${viewport.key}.png`),
          fullPage: true,
        })

        expect(
          metrics.horizontalOverflow,
          `${module.key} has ${metrics.horizontalOverflow}px horizontal overflow at ${viewport.key}`,
        ).toBeLessThanOrEqual(1)

        if (viewport.width <= 912) {
          expect(
            metrics.undersizedNativeChoices,
            `${module.key} has native choices without a 44px labelled target at ${viewport.key}: ${JSON.stringify(
              metrics.undersizedNativeChoices,
            )}`,
          ).toEqual([])
        }

        if (viewport.width >= 768 && viewport.width <= 1024) {
          expect(
            metrics.sharedHeaderActions.length,
            `${module.key} did not expose any shared header actions at ${viewport.key}`,
          ).toBeGreaterThan(0)
          expect(
            metrics.sharedHeaderActions.map((action) => action.label),
            `${module.key} is missing a named shared header action at ${viewport.key}`,
          ).toEqual(expect.arrayContaining(requiredHeaderActionNames))
          const undersizedHeaderActions = metrics.sharedHeaderActions.filter(
            (action) => action.width < 44 || action.height < 44,
          )
          expect(
            undersizedHeaderActions,
            `${module.key} has undersized shared header actions at ${viewport.key}: ${JSON.stringify(
              undersizedHeaderActions,
            )}`,
          ).toEqual([])
        }
      }
    }

    const auditBody = Buffer.from(JSON.stringify(auditRows, null, 2))
    const auditPath = testInfo.outputPath('cross-module-mobile-audit.json')
    await writeFile(auditPath, auditBody)
    await testInfo.attach('cross-module-mobile-audit.json', {
      path: auditPath,
      contentType: 'application/json',
    })
  })
})
