const { expect, test } = require('@playwright/test')

const systemAdministrator = {
  id: 1,
  name: 'System Admin',
  email: 'admin@example.test',
  roles: ['System Administrator'],
  permissions: ['*'],
}

const queuePayload = (kind) => ({
  data: [
    {
      id: kind === 'feedback' ? 8 : 17,
      status: 'new',
      message: kind === 'feedback' ? 'Responsive feedback report' : undefined,
      reason: kind === 'ai' ? 'Responsive Ask AI report' : undefined,
      reporter: { name: 'QA User', email: 'qa@example.test' },
      page: { title: 'Dashboard', path: '/dashboard' },
      created_at: '2026-08-10T10:00:00Z',
    },
  ],
  meta: { counts: { actionable: 1, new: 1, reviewing: 0, resolved: 0, dismissed: 0, all: 1 } },
})

const installApiMocks = async (page) => {
  const methods = []
  await page.route('http://localhost:8000/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    methods.push(request.method())
    let payload = { data: [] }
    if (url.pathname.endsWith('/auth/session')) {
      payload = { user: systemAdministrator, csrf_token: 'controlled-csrf-token' }
    } else if (url.pathname.endsWith('/feedback-reports')) {
      payload = queuePayload('feedback')
    } else if (url.pathname.endsWith('/ai-helper/reports')) {
      payload = queuePayload('ai')
    } else if (url.pathname.endsWith('/settings/system-maintenance')) {
      payload = { data: { enabled: false, phase: 'off' } }
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': 'http://127.0.0.1:4179',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(payload),
    })
  })
  return methods
}

const assertNoDocumentOverflow = async (page) => {
  const overflow = await page
    .locator('html')
    .evaluate((element) => Math.max(0, element.scrollWidth - element.clientWidth))
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe('shared admin review queue responsive contract', () => {
  for (const route of [
    { path: '/admin/feedback-reports', title: 'Feedback Reports' },
    { path: '/admin/ai-helper-reports', title: 'Ask AI Reports' },
  ]) {
    test(`${route.title} recomposes its status navigation without page overflow`, async ({
      page,
    }) => {
      const methods = await installApiMocks(page)

      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(route.path)
      await expect(page.getByRole('heading', { name: route.title })).toBeVisible()
      await expect(page.getByRole('combobox', { name: `${route.title} status` })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()
      await assertNoDocumentOverflow(page)

      await page.setViewportSize({ width: 1440, height: 900 })
      await expect(page.getByRole('combobox', { name: `${route.title} status` })).toBeHidden()
      await expect(page.getByRole('button', { name: /^Open/ })).toBeVisible()
      await assertNoDocumentOverflow(page)

      expect(methods.every((method) => ['GET', 'OPTIONS'].includes(method))).toBe(true)
    })
  }
})
