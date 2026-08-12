import { expect, test } from '@playwright/test'

const apiBaseUrl =
  process.env.VMECC_E2E_BROWSER_API_URL ||
  process.env.VMECC_E2E_API_URL ||
  'http://127.0.0.1:8000/api'

const auditUser = {
  id: 908,
  name: 'Day 8 Accessibility Auditor',
  email: 'day8.accessibility.audit@example.test',
  status: 'active',
  permissions: ['*'],
  roles: ['System Administrator'],
}

const fulfillJson = (route, body) =>
  route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })

const installApiStubs = async (page) => {
  await page.route(`${apiBaseUrl}/**`, (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '')
    if (path === '/auth/session') {
      return fulfillJson(route, { user: auditUser, csrf_token: 'day8-accessibility-token' })
    }
    if (path === '/settings/modules') {
      return fulfillJson(route, {
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
      return fulfillJson(route, { data: { enabled: false, phase: 'off', message: '' } })
    }
    if (path === '/workflow/notifications/unread-count') {
      return fulfillJson(route, { data: { unread_count: 0 } })
    }
    return fulfillJson(route, { data: [], meta: {} })
  })
}

const mandatoryViewports = [
  { key: 'mobile-360', width: 360, height: 800, preview: 'mobile' },
  { key: 'mobile-390', width: 390, height: 844, preview: 'mobile' },
  { key: 'tablet-768', width: 768, height: 1024, preview: 'mobile' },
  { key: 'drawer-928', width: 928, height: 900, preview: 'mobile' },
  { key: 'desktop-threshold-929', width: 929, height: 900, preview: 'desktop' },
  { key: 'desktop-1440', width: 1440, height: 900, preview: 'desktop' },
]

const matrixUrl = (preview, extra = '') =>
  `/inspection/ux-matrix?viewport=${preview}&state=complete-with-next-location&type=general-inspection${extra}`

const expectBoundedContent = async (page, section) => {
  const issues = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element)
      return (
        style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length
      )
    }
    const viewportWidth = document.documentElement.clientWidth
    return {
      documentOverflow: Math.max(0, document.documentElement.scrollWidth - viewportWidth),
      unnamedControls: [...document.querySelectorAll('button, a[href], input, select, textarea')]
        .filter(visible)
        .filter((element) => {
          if (element.labels?.length) return false
          if (
            String(
              element.getAttribute('aria-label') || element.title || element.textContent,
            ).trim()
          ) {
            return false
          }
          return !String(element.getAttribute('aria-labelledby') || '')
            .split(/\s+/)
            .filter(Boolean)
            .some((id) => document.getElementById(id)?.textContent?.trim())
        })
        .map((element) => element.outerHTML.slice(0, 160)),
    }
  })
  expect(issues.documentOverflow, JSON.stringify(issues)).toBeLessThanOrEqual(1)
  expect(issues.unnamedControls).toEqual([])

  const bounds = await section.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const imageIssues = [...element.querySelectorAll('img')].flatMap((image) => {
      const imageRect = image.getBoundingClientRect()
      if (imageRect.left < rect.left - 1 || imageRect.right > rect.right + 1) {
        return [{ alt: image.alt, left: imageRect.left, right: imageRect.right }]
      }
      return []
    })
    return { left: rect.left, right: rect.right, imageIssues }
  })
  expect(bounds.left).toBeGreaterThanOrEqual(-1)
  expect(bounds.right).toBeLessThanOrEqual((await page.viewportSize()).width + 1)
  expect(bounds.imageIssues).toEqual([])
}

test.describe('Day 8 accessibility and responsive contracts', () => {
  for (const viewport of mandatoryViewports) {
    test(`keeps the Inspection task bounded and named at ${viewport.key}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await installApiStubs(page)
      await page.goto(matrixUrl(viewport.preview), { waitUntil: 'domcontentloaded' })

      await expect(page.getByRole('heading', { name: 'Inspection UX Matrix' })).toBeVisible()
      const section = page.locator(
        `[data-matrix-case="general-inspection:complete-with-next-location:${viewport.preview}"]`,
      )
      await expect(section).toBeVisible()
      await expectBoundedContent(page, section)
      await expect(section.getByText('sample-photo', { exact: true })).toHaveCount(0)
    })
  }

  test('preserves dark-theme focus and reduced-motion behavior in the evidence drawer', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await installApiStubs(page)
    await page.goto(matrixUrl('mobile', '&theme=dark'), { waitUntil: 'domcontentloaded' })

    await expect(page.locator('html')).toHaveAttribute('data-coreui-theme', 'dark')
    const section = page.locator(
      '[data-matrix-case="general-inspection:complete-with-next-location:mobile"]',
    )
    const trigger = section.getByRole('button', { name: 'General photos (1)', exact: true })
    await trigger.focus()
    await trigger.click()

    const drawer = page.getByRole('dialog', { name: 'General photos and remarks' })
    await expect(drawer).toBeVisible()
    await expect
      .poll(() => drawer.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true)
    await expect(drawer.getByRole('button', { name: 'Take photo' })).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Upload photo' })).toBeVisible()

    const motion = await drawer.evaluate((element) => ({
      animationDuration: getComputedStyle(element).animationDuration,
      transitionDuration: getComputedStyle(element).transitionDuration,
    }))
    expect(motion.animationDuration).toMatch(/^(0s|0ms)$/)
    expect(motion.transitionDuration).toMatch(/^(0s|0ms)$/)

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
