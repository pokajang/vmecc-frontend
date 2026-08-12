import { devices, expect, test } from '@playwright/test'

const baseURL = process.env.VMECC_E2E_BASE_URL || 'http://127.0.0.1:3000'
const apiBaseUrl =
  process.env.VMECC_E2E_BROWSER_API_URL ||
  process.env.VMECC_E2E_API_URL ||
  'http://127.0.0.1:8000/api'

const auditUser = {
  id: 904,
  name: 'Inspection Device Auditor',
  email: 'inspection.device.audit@example.test',
  status: 'active',
  permissions: ['*'],
  roles: ['System Administrator'],
}

const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (page) => {
  await page.route(`${apiBaseUrl}/**`, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')

    if (path === '/auth/session') {
      return json(route, { user: auditUser, csrf_token: 'inspection-device-audit-token' })
    }
    if (path === '/settings/modules') {
      return json(route, {
        data: {
          registry: [],
          configured: {},
          effective: {},
          forceAllEnabled: true,
          fallbackMode: true,
        },
      })
    }
    if (path === '/settings/system-maintenance') {
      return json(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (path === '/workflow/notifications/unread-count') {
      return json(route, { data: { unread_count: 0 } })
    }

    return json(route, { data: [], meta: {} })
  })
}

const matrixPath = ({ viewport = 'mobile', state, type }) =>
  `/inspection/ux-matrix?viewport=${viewport}&state=${state}&type=${type}`

const expectNoHorizontalOverflow = async (locator) => {
  const metrics = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowingChildren: [...element.querySelectorAll('*')]
      .filter((child) => child.scrollWidth > child.clientWidth + 1)
      .slice(0, 8)
      .map((child) => ({
        className: child.className,
        clientWidth: child.clientWidth,
        scrollWidth: child.scrollWidth,
        text: child.textContent.trim().slice(0, 80),
      })),
  }))
  expect(metrics.scrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.clientWidth + 1)
}

const collectSemanticIssues = (element) => {
  const isVisible = (node) => {
    const style = getComputedStyle(node)
    return (
      style.display !== 'none' && style.visibility !== 'hidden' && node.getClientRects().length > 0
    )
  }
  const accessibleName = (node) =>
    String(
      node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '',
    ).trim()
  const references = (attribute) =>
    [...element.querySelectorAll(`[${attribute}]`)].flatMap((node) =>
      String(node.getAttribute(attribute) || '')
        .split(/\s+/)
        .filter(Boolean)
        .filter((id) => !document.getElementById(id))
        .map((id) => `${attribute}:${id}`),
    )

  return {
    unnamedControls: [
      ...element.querySelectorAll('button, a[href], input, select, textarea, [role="button"]'),
    ]
      .filter(isVisible)
      .filter((node) => {
        if (accessibleName(node)) return false
        if (node.labels?.length) return false
        const labelledBy = String(node.getAttribute('aria-labelledby') || '')
          .split(/\s+/)
          .filter(Boolean)
        return !labelledBy.some((id) => document.getElementById(id)?.textContent?.trim())
      })
      .map((node) => node.outerHTML.slice(0, 180)),
    imagesWithoutAlternatives: [...element.querySelectorAll('img')]
      .filter(isVisible)
      .filter((image) => !image.hasAttribute('alt'))
      .map((image) => image.outerHTML.slice(0, 180)),
    invalidAriaReferences: [
      ...references('aria-labelledby'),
      ...references('aria-describedby'),
      ...references('aria-controls'),
    ],
    nestedInteractiveControls: [
      ...element.querySelectorAll(
        'button button, button a[href], a[href] button, a[href] a[href], [role="button"] button, [role="button"] a[href]',
      ),
    ].map((node) => node.outerHTML.slice(0, 180)),
    positiveTabIndexes: [...element.querySelectorAll('[tabindex]')]
      .filter((node) => Number(node.getAttribute('tabindex')) > 0)
      .map((node) => node.outerHTML.slice(0, 180)),
  }
}

const deviceCases = [
  {
    deviceName: 'iPhone SE',
    state: 'complete-with-next-location',
    type: 'fire-extinguisher-inspection',
  },
  {
    deviceName: 'iPhone 13',
    state: 'partial',
    type: 'high-angle-rescue-equipment-inspection',
  },
  {
    deviceName: 'Pixel 5',
    state: 'missing-required',
    type: 'health-safety-environment-inspection',
  },
  {
    deviceName: 'iPad Mini',
    viewport: 'desktop',
    state: 'complete-with-next-location',
    type: 'frt-daily-inspection',
  },
]

test('Inspection reflows and preserves semantics across representative touch devices', async ({
  browser,
  browserName,
}) => {
  test.setTimeout(120_000)

  for (const auditCase of deviceCases) {
    const context = await browser.newContext({
      ...devices[auditCase.deviceName],
      baseURL,
      serviceWorkers: 'block',
    })
    const page = await context.newPage()
    await installApiStubs(page)

    await page.goto(matrixPath(auditCase), { waitUntil: 'domcontentloaded' })
    const inspectionCase = page.locator(
      `[data-matrix-case="${auditCase.type}:${auditCase.state}:${auditCase.viewport || 'mobile'}"]`,
    )
    await expect(inspectionCase).toBeVisible()
    await expectNoHorizontalOverflow(page.locator('html'))
    await expectNoHorizontalOverflow(inspectionCase.locator('.inspection-ux-matrix-preview-shell'))
    if (browserName === 'chromium') {
      await expect.poll(() => page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0)
    }

    const semanticIssues = await inspectionCase.evaluate(collectSemanticIssues)
    expect(semanticIssues, auditCase.deviceName).toEqual({
      unnamedControls: [],
      imagesWithoutAlternatives: [],
      invalidAriaReferences: [],
      nestedInteractiveControls: [],
      positiveTabIndexes: [],
    })

    const undersizedTargets = await inspectionCase
      .locator('button, a[href]')
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element)
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              element.getClientRects().length > 0
            )
          })
          .map((element) => ({
            height: element.getBoundingClientRect().height,
            width: element.getBoundingClientRect().width,
            name: element.getAttribute('aria-label') || element.textContent.trim(),
            minHeight: getComputedStyle(element).minHeight,
            mobileControlHeight: getComputedStyle(element).getPropertyValue(
              '--inspection-mobile-control-height',
            ),
          }))
          .filter(({ height, width }) => height < 43.5 || width < 43.5),
      )
    expect(
      undersizedTargets,
      `${auditCase.deviceName}: ${JSON.stringify(undersizedTargets)}`,
    ).toEqual([])

    await context.close()
  }
})

test('Inspection remains usable with enlarged text and long localized content', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await installApiStubs(page)
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto(
    matrixPath({
      state: 'complete-with-next-location',
      type: 'fire-extinguisher-inspection',
    }),
    { waitUntil: 'domcontentloaded' },
  )

  const inspectionCase = page.locator(
    '[data-matrix-case="fire-extinguisher-inspection:complete-with-next-location:mobile"]',
  )
  await expect(inspectionCase).toBeVisible()
  await inspectionCase.locator('.inspection-next-location-btn').evaluate((button) => {
    button.textContent = 'Teruskan ke lokasi pemeriksaan seterusnya dengan nama yang sangat panjang'
  })

  for (const scale of [125, 150, 200]) {
    await page.locator('html').evaluate((element, fontScale) => {
      element.style.setProperty('font-size', `${fontScale}%`, 'important')
    }, scale)
    await expectNoHorizontalOverflow(page.locator('html'))
    await expectNoHorizontalOverflow(inspectionCase.locator('.inspection-ux-matrix-preview-shell'))
    await expect(inspectionCase.getByText(/Teruskan ke lokasi pemeriksaan/)).toBeVisible()
  }
})

test('Inspection keyboard order reaches named controls without positive tabindex overrides', async ({
  page,
}) => {
  await installApiStubs(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(
    matrixPath({
      state: 'complete-with-next-location',
      type: 'fire-extinguisher-inspection',
    }),
    { waitUntil: 'domcontentloaded' },
  )

  const inspectionCase = page.locator(
    '[data-matrix-case="fire-extinguisher-inspection:complete-with-next-location:mobile"]',
  )
  await expect(inspectionCase).toBeVisible()
  const controls = inspectionCase.locator('button, input, select, textarea, a[href]')
  const controlCount = Math.min(
    await controls.evaluateAll(
      (elements) =>
        elements.filter((element) => {
          const style = getComputedStyle(element)
          return (
            !element.disabled &&
            element.tabIndex >= 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            element.getClientRects().length > 0
          )
        }).length,
    ),
    8,
  )
  expect(controlCount).toBeGreaterThan(0)
  const firstControl = controls.first()
  await firstControl.focus()

  for (let index = 0; index < controlCount; index += 1) {
    const focusState = await inspectionCase.evaluate((element) => {
      const focused = document.activeElement
      return {
        insideCase: Boolean(focused && element.contains(focused)),
        name: String(
          focused?.getAttribute?.('aria-label') ||
            focused?.getAttribute?.('title') ||
            focused?.labels?.[0]?.textContent ||
            focused?.textContent ||
            '',
        ).trim(),
      }
    })
    expect(focusState.insideCase, JSON.stringify(focusState)).toBe(true)
    expect(focusState.name).not.toBe('')
    if (index < controlCount - 1) await page.keyboard.press('Tab')
  }
})
