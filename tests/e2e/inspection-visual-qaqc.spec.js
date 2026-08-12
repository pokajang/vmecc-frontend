import { expect, test } from '@playwright/test'
import {
  getControlledBrowserApiBaseUrl,
  installControlledApiRequestGuard,
} from './support/controlled-api-stubs'

const apiBaseUrl = getControlledBrowserApiBaseUrl()

const auditUser = {
  id: 903,
  name: 'Inspection Visual Auditor',
  email: 'inspection.visual.audit@example.test',
  status: 'active',
  permissions: ['*'],
  roles: ['System Administrator'],
}

const json = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (page) => {
  await installControlledApiRequestGuard(page, apiBaseUrl)
  await page.route(`${apiBaseUrl}/**`, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')

    if (path === '/auth/session') {
      return json(route, { user: auditUser, csrf_token: 'inspection-visual-audit-token' })
    }
    if (path === '/settings/modules') {
      return json(route, {
        data: {
          registry: [],
          configured: {},
          effective: {},
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

const measureControlContrast = (element, selector) => {
  const parseColor = (value) => {
    const channels = value.match(/[\d.]+/g)?.map(Number) || []
    return {
      red: channels[0] || 0,
      green: channels[1] || 0,
      blue: channels[2] || 0,
      alpha: channels.length > 3 ? channels[3] : 1,
    }
  }
  const blend = (foreground, background) => ({
    red: foreground.red * foreground.alpha + background.red * (1 - foreground.alpha),
    green: foreground.green * foreground.alpha + background.green * (1 - foreground.alpha),
    blue: foreground.blue * foreground.alpha + background.blue * (1 - foreground.alpha),
    alpha: 1,
  })
  const effectiveBackground = (node) => {
    let current = node
    let result = { red: 255, green: 255, blue: 255, alpha: 1 }
    const layers = []
    while (current) {
      const color = parseColor(getComputedStyle(current).backgroundColor)
      if (color.alpha > 0) layers.push(color)
      if (color.alpha === 1) break
      current = current.parentElement
    }
    for (const layer of layers.reverse()) result = blend(layer, result)
    return result
  }
  const luminance = ({ red, green, blue }) =>
    [red, green, blue]
      .map((channel) => channel / 255)
      .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
      .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0)
  const ratio = (foreground, background) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
    return (values[0] + 0.05) / (values[1] + 0.05)
  }

  return [...element.querySelectorAll(selector)].map((control) => {
    const style = getComputedStyle(control)
    const background = effectiveBackground(control)
    const parentBackground = effectiveBackground(control.parentElement)
    return {
      label: control.textContent.trim(),
      checked:
        control.getAttribute('aria-checked') ??
        (control.control ? String(control.control.checked) : undefined),
      color: style.color,
      backgroundColor: style.backgroundColor,
      parentBackgroundColor: getComputedStyle(control.parentElement).backgroundColor,
      text: ratio(parseColor(style.color), background),
      border: ratio(parseColor(style.borderTopColor), parentBackground),
    }
  })
}

const cases = [
  {
    name: 'general-complete-mobile',
    width: 430,
    height: 932,
    viewport: 'mobile',
    state: 'complete-with-next-location',
    type: 'general-inspection',
  },
  {
    name: 'fire-extinguisher-complete-narrow',
    width: 320,
    height: 700,
    viewport: 'mobile',
    state: 'complete-with-next-location',
    type: 'fire-extinguisher-inspection',
  },
  {
    name: 'high-angle-partial-mobile',
    width: 390,
    height: 844,
    viewport: 'mobile',
    state: 'partial',
    type: 'high-angle-rescue-equipment-inspection',
  },
  {
    name: 'hydraulic-missing-required-narrow',
    width: 320,
    height: 700,
    viewport: 'mobile',
    state: 'missing-required',
    type: 'hydraulic-rescue-tools-inspection',
  },
  {
    name: 'scba-partial-mobile',
    width: 390,
    height: 844,
    viewport: 'mobile',
    state: 'partial',
    type: 'scba-inspection',
  },
  {
    name: 'hse-missing-required-tablet',
    width: 768,
    height: 1024,
    viewport: 'desktop',
    state: 'missing-required',
    type: 'health-safety-environment-inspection',
  },
  {
    name: 'hse-missing-required-mobile',
    width: 390,
    height: 844,
    viewport: 'mobile',
    state: 'missing-required',
    type: 'health-safety-environment-inspection',
  },
  {
    name: 'hse-complete-mobile',
    width: 390,
    height: 844,
    viewport: 'mobile',
    state: 'complete-with-next-location',
    type: 'health-safety-environment-inspection',
  },
  {
    name: 'frt-complete-desktop',
    width: 1440,
    height: 960,
    viewport: 'desktop',
    state: 'complete-with-next-location',
    type: 'frt-daily-inspection',
  },
  {
    name: 'er-aux-complete-tablet',
    width: 820,
    height: 1000,
    viewport: 'desktop',
    state: 'complete-with-next-location',
    type: 'er-aux-equipment-inspection',
  },
]

test('inspection matrix remains legible and overflow-safe across representative QA cases', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000)
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installApiStubs(page)

  for (const auditCase of cases) {
    await page.setViewportSize({ width: auditCase.width, height: auditCase.height })
    await page.goto(
      `/inspection/ux-matrix?viewport=${auditCase.viewport}&state=${auditCase.state}&type=${auditCase.type}`,
      { waitUntil: 'domcontentloaded' },
    )

    const inspectionCase = page.locator(
      `[data-matrix-case="${auditCase.type}:${auditCase.state}:${auditCase.viewport}"]`,
    )
    await expect(inspectionCase).toBeVisible()
    await expectNoHorizontalOverflow(page.locator('html'))
    await expectNoHorizontalOverflow(inspectionCase.locator('.inspection-ux-matrix-preview-shell'))
    await expect
      .poll(() => page.evaluate(() => document.fonts.check('16px "Manrope Variable"')))
      .toBe(true)

    const bodyFont = await page
      .locator('body')
      .evaluate((element) => getComputedStyle(element).fontFamily)
    expect(bodyFont).toContain('Manrope Variable')

    const accessibilityIssues = await inspectionCase.evaluate((element) => {
      const visible = (node) => {
        const style = getComputedStyle(node)
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          node.getClientRects().length > 0
        )
      }
      const ids = [...element.querySelectorAll('[id]')].map((node) => node.id).filter(Boolean)
      const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))]
      const unnamedButtons = [...element.querySelectorAll('button')]
        .filter(visible)
        .filter(
          (button) =>
            !button.textContent.trim() &&
            !button.getAttribute('aria-label') &&
            !button.getAttribute('aria-labelledby') &&
            !button.getAttribute('title'),
        )
        .map((button) => button.outerHTML.slice(0, 180))
      const unlabeledFields = [...element.querySelectorAll('input, select, textarea')]
        .filter((field) => field.type !== 'hidden' && visible(field))
        .filter(
          (field) =>
            field.labels?.length === 0 &&
            !field.getAttribute('aria-label') &&
            !field.getAttribute('aria-labelledby') &&
            !field.getAttribute('title'),
        )
        .map((field) => field.outerHTML.slice(0, 180))

      return { duplicateIds, unnamedButtons, unlabeledFields }
    })
    expect(accessibilityIssues).toEqual({
      duplicateIds: [],
      unnamedButtons: [],
      unlabeledFields: [],
    })

    if (auditCase.type === 'health-safety-environment-inspection') {
      const choiceContrast = await inspectionCase.evaluate(
        measureControlContrast,
        '.inspection-hse-choice-btn',
      )
      expect(choiceContrast).toHaveLength(2)
      if (auditCase.state === 'missing-required') {
        expect(choiceContrast.every(({ checked }) => checked === 'false')).toBe(true)
      } else {
        expect(choiceContrast.some(({ checked }) => checked === 'true')).toBe(true)
        expect(choiceContrast.some(({ checked }) => checked === 'false')).toBe(true)
      }
      expect(
        choiceContrast.filter(({ text }) => text < 4.5),
        JSON.stringify(choiceContrast),
      ).toEqual([])
      expect(
        choiceContrast.filter(({ border }) => border < 3),
        JSON.stringify(choiceContrast),
      ).toEqual([])
    }

    if (auditCase.viewport === 'mobile') {
      const fieldTypography = await inspectionCase.evaluate((element) => {
        const style = getComputedStyle(element)
        const remValue = (property) => Number.parseFloat(style.getPropertyValue(property))
        return {
          body: remValue('--vmecc-text-body'),
          label: remValue('--vmecc-text-label'),
          meta: remValue('--vmecc-text-meta'),
          caption: remValue('--vmecc-text-caption'),
        }
      })
      expect(fieldTypography).toEqual({
        body: 1.0625,
        label: 1,
        meta: 0.9375,
        caption: 0.8125,
      })

      const actionTargets = inspectionCase.getByRole('button', {
        name: /^(?:Continue to Review(?: Updates)?|Submit Report|Update Report|Save (?:Update )?Draft)$/,
      })
      const boxes = await actionTargets.evaluateAll((elements) =>
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
            label: element.getAttribute('aria-label') || element.textContent.trim(),
          })),
      )
      expect(boxes.length).toBeGreaterThan(0)
      expect(
        boxes.filter(({ height }) => height < 43.5),
        JSON.stringify(boxes),
      ).toEqual([])

      const bottomNavigation = page.locator('.app-bottom-nav')
      const statusMessage = inspectionCase
        .locator(
          '.inspection-form-inline-actions-row-status:visible, .inspection-draft-status:visible',
        )
        .last()
      if ((await bottomNavigation.count()) && (await statusMessage.count())) {
        await statusMessage.scrollIntoViewIfNeeded()
        const [navigationBox, statusBox] = await Promise.all([
          bottomNavigation.boundingBox(),
          statusMessage.boundingBox(),
        ])
        expect(navigationBox).not.toBeNull()
        expect(statusBox).not.toBeNull()
        expect(statusBox.y + statusBox.height).toBeLessThanOrEqual(navigationBox.y)
      }
    } else {
      const draftButton = inspectionCase.getByRole('button', { name: 'Save Draft' }).last()
      if (await draftButton.count()) {
        await expect(draftButton).toHaveCSS('white-space', 'nowrap')
      }
    }

    await inspectionCase.screenshot({
      path: testInfo.outputPath(`${auditCase.name}.png`),
    })
  }

  await page.evaluate(() => {
    const fixture = document.createElement('div')
    fixture.dataset.testid = 'outline-contrast-fixture'
    fixture.style.cssText =
      'position: fixed; inset: 1rem auto auto 1rem; display: flex; gap: 0.5rem; padding: 1rem; background: var(--cui-body-bg); z-index: 2000;'
    fixture.innerHTML = ['light', 'primary', 'success', 'info', 'warning', 'danger']
      .map(
        (color) =>
          `<button type="button" class="btn btn-outline-${color}">${color} action</button>`,
      )
      .join('')
    fixture.querySelectorAll('.btn').forEach((button) => {
      button.style.transition = 'none'
    })
    document.body.append(fixture)
  })
  const outlineFixture = page.getByTestId('outline-contrast-fixture')
  const originalTheme = await page.evaluate(() =>
    document.documentElement.getAttribute('data-coreui-theme'),
  )
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (nextTheme) => document.documentElement.setAttribute('data-coreui-theme', nextTheme),
      theme,
    )
    const contrasts = await outlineFixture.evaluate(measureControlContrast, '.btn')
    expect(
      contrasts.filter(({ text }) => text < 4.5),
      `${theme}: ${JSON.stringify(contrasts)}`,
    ).toEqual([])
    expect(
      contrasts.filter(({ border }) => border < 3),
      `${theme}: ${JSON.stringify(contrasts)}`,
    ).toEqual([])
  }
  await outlineFixture.evaluate((element) => element.remove())
  await page.evaluate((theme) => {
    if (theme === null) {
      document.documentElement.removeAttribute('data-coreui-theme')
      return
    }
    document.documentElement.setAttribute('data-coreui-theme', theme)
  }, originalTheme)

  expect(pageErrors).toEqual([])
})
