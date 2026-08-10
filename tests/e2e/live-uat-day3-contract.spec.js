const { expect, test } = require('@playwright/test')
const schedule = require('./live-uat/day3-route-schedule.json')
const {
  endpointFor,
  expandScheduledRoute,
  replaceParameters,
  rowIdentity,
  safeGetJson,
  unwrapRows,
} = require('./live-uat/live-uat-day3-support')
const {
  API_BASE_URL,
  assertNoReadOnlyViolations,
  installReadOnlyRequestGuard,
} = require('./live-uat/live-uat-support')

test.describe('Day 3 authenticated sweep contracts', () => {
  test('accounts for all canonical routes and subtype states', () => {
    expect(schedule.routes).toHaveLength(105)
    expect(new Set(schedule.routes.map((route) => route.routeId)).size).toBe(105)
    expect(schedule.inspectionStates.map((item) => item.key).sort()).toEqual([
      'er-aux',
      'fire-extinguisher',
      'frt-daily',
      'general',
      'high-angle',
      'hse',
      'hydraulic',
      'scba',
    ])
    expect(schedule.reportStates.map((item) => item.key).sort()).toEqual([
      'drill',
      'erco',
      'fitness-test',
    ])
    for (const route of schedule.routes.filter((item) => item.mutationRisk === 'controlled-only')) {
      expect(route.interactionMode).toBe('shell-only')
    }
    expect(
      schedule.routes.find((route) => route.routePattern === '/staff/overtime-management/rules'),
    ).toEqual(
      expect.objectContaining({
        primaryPersona: 'sysadmin',
        secondaryPersonas: [],
        plannedStatus: 'controlled-only',
        interactionMode: 'shell-only',
      }),
    )
  })

  test('normalizes supported response envelopes and stable route identities', () => {
    expect(unwrapRows([{ id: 1 }])).toEqual([{ id: 1 }])
    expect(unwrapRows({ data: { records: [{ report_uid: 'INS-1' }] } })).toHaveLength(1)
    expect(rowIdentity({ report_uid: 'INS-1', id: 9 })).toBe('INS-1')
    expect(
      replaceParameters('/staff/overtime-management/record/:overtimeRouteKey', 'overtime-record', {
        ownerUserId: 7,
        id: 9,
      }),
    ).toBe('/staff/overtime-management/record/7%3A%3A9')
    expect(endpointFor('leave-record', '/leave/:leaveId', 'trt')).toBe('/leave')
    expect(
      endpointFor('leave-record', '/staff/leave-management/record/:leaveId', 'humanResource'),
    ).toBe('/staff/leave/records')
    expect(endpointFor('submitted-report', '/report/drill/:reportId', 'incidentCommander')).toBe(
      '/reports?reportType=drill&scope=all',
    )
  })

  test('expands generic report patterns into all report modules', () => {
    const route = schedule.routes.find((item) => item.routePattern === '/report/:reportType')
    expect(expandScheduledRoute(route).map((item) => item.routePattern)).toEqual([
      '/report/erco',
      '/report/fitness-test',
      '/report/drill',
    ])
  })

  test('fixture discovery issues GET only and the guard rejects a mutation', async ({
    context,
    page,
  }) => {
    await context.route(`${API_BASE_URL}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"data":[{"id":1}]}' }),
    )
    const guard = await installReadOnlyRequestGuard(context)
    await page.goto('about:blank')
    const response = await safeGetJson(page, '/users?limit=1')
    expect(response.ok).toBe(true)
    expect(unwrapRows(response.body)).toHaveLength(1)
    const mutation = await page.evaluate(
      (url) => fetch(url, { method: 'PATCH' }).catch(() => null),
      `${API_BASE_URL}/users/1`,
    )
    expect(mutation).toBeNull()
    expect(guard.violations).toEqual([expect.objectContaining({ method: 'PATCH' })])
    expect(() => assertNoReadOnlyViolations(guard.violations)).toThrow(/blocked request/i)
    await guard.dispose()
  })
})
