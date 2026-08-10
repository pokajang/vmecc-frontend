const { expect, test } = require('@playwright/test')
const {
  API_BASE_URL,
  AUTH_LOGIN_URL,
  assertNoReadOnlyViolations,
  classifyLiveUatRequest,
  getPersonaCredentials,
  getUnexpectedRouteDiagnostics,
  installReadOnlyRequestGuard,
  redactDiagnostic,
  serializeLedger,
} = require('./live-uat/live-uat-support')

test.describe('live UAT safety contract', () => {
  test('classifies safe, authentication, mutation, and foreign requests', () => {
    expect(classifyLiveUatRequest({ url: `${API_BASE_URL}/reports`, method: 'GET' })).toBe(
      'allow-safe-method',
    )
    expect(classifyLiveUatRequest({ url: AUTH_LOGIN_URL, method: 'POST' })).toBe('allow-auth-login')
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(classifyLiveUatRequest({ url: `${API_BASE_URL}/reports/1`, method })).toBe(
        'block-mutation',
      )
    }
    expect(classifyLiveUatRequest({ url: 'https://example.com/', method: 'GET' })).toBe(
      'block-origin',
    )
  })

  test('browser guard allows mocked reads and login but aborts a business mutation', async ({
    context,
    page,
  }) => {
    await context.route(`${API_BASE_URL}/**`, (route) =>
      route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: '{}',
      }),
    )
    const guard = await installReadOnlyRequestGuard(context)
    await page.goto('about:blank')

    const safeStatus = await page.evaluate(
      (url) => fetch(url).then((response) => response.status),
      `${API_BASE_URL}/health`,
    )
    expect(safeStatus).toBe(200)
    const loginStatus = await page.evaluate(
      (url) => fetch(url, { method: 'POST', body: '{}' }).then((response) => response.status),
      AUTH_LOGIN_URL,
    )
    expect(loginStatus).toBe(200)
    const mutationResult = await page.evaluate(
      (url) =>
        fetch(url, { method: 'POST', body: '{}' })
          .then(() => 'unexpected-success')
          .catch(() => 'blocked'),
      `${API_BASE_URL}/reports`,
    )
    expect(mutationResult).toBe('blocked')
    expect(guard.violations).toEqual([
      expect.objectContaining({ classification: 'block-mutation', method: 'POST' }),
    ])
    expect(() => assertNoReadOnlyViolations(guard.violations)).toThrow(
      /read-only guard blocked request/i,
    )
    await guard.dispose()
  })

  test('redacts secrets and writes ledger entries deterministically', () => {
    const sensitive =
      'user@example.com Bearer abc.def?token=secret&id=123456789 550e8400-e29b-41d4-a716-446655440000'
    const redacted = redactDiagnostic(sensitive)
    expect(redacted).not.toContain('user@example.com')
    expect(redacted).not.toContain('secret')
    expect(redacted).not.toContain('123456789')
    expect(redacted).not.toContain('550e8400-e29b-41d4-a716-446655440000')

    const left = serializeLedger([
      { routeId: 'B', routePattern: '/b', viewport: 'mobile', status: 'passed' },
      { routeId: 'A', routePattern: '/a', viewport: 'desktop', status: 'passed' },
    ])
    const right = serializeLedger([
      { routeId: 'A', routePattern: '/a', viewport: 'desktop', status: 'passed' },
      { routeId: 'B', routePattern: '/b', viewport: 'mobile', status: 'passed' },
    ])
    expect(left).toBe(right)
  })

  test('requested personas never fall back to default credentials', () => {
    expect(() => getPersonaCredentials('trt', {})).toThrow(
      /VMECC_LIVE_UAT_TRT_EMAIL, VMECC_LIVE_UAT_TRT_PASSWORD/,
    )
    expect(() => getPersonaCredentials('unknown', {})).toThrow(/Unknown live UAT persona/)
  })

  test('permission routes suppress only their expected 403 diagnostics', () => {
    const diagnostics = {
      consoleErrors: [
        'Failed to load resource: the server responded with a status of 403',
        'Unexpected rendering failure',
      ],
      clientErrors: [
        { status: 403, url: `${API_BASE_URL}/restricted` },
        { status: 404, url: `${API_BASE_URL}/missing` },
      ],
    }

    expect(getUnexpectedRouteDiagnostics(diagnostics, true)).toEqual({
      consoleErrors: ['Unexpected rendering failure'],
      clientErrors: [{ status: 404, url: `${API_BASE_URL}/missing` }],
    })
    expect(getUnexpectedRouteDiagnostics(diagnostics, false)).toEqual(diagnostics)
  })
})
