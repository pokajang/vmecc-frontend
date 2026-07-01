// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { resolveAiHelperRouteContext } from '../routeContext'

describe('resolveAiHelperRouteContext', () => {
  it('maps the current location to route metadata without reading page DOM content', () => {
    const context = resolveAiHelperRouteContext({
      pathname: '/inspection/INS-001',
      search: '?tab=records',
    })

    expect(context.path).toBe('/inspection/INS-001')
    expect(context.search).toBe('?tab=records')
    expect(context.route_name).toBe('Inspection Detail')
    expect(context.params.reportId).toBe('INS-001')
  })
})
