import { describe, expect, it } from 'vitest'

import { AI_HELPER_PAGE_CONTEXT_LIMITS, buildAiHelperPageContext } from '../pageContextContract'

describe('AI helper page context contract', () => {
  it('emits only the backend allow-listed keys and scalar string params', () => {
    const context = buildAiHelperPageContext({
      path: '/inspection/general',
      routeKey: 'inspection.form.finding',
      moduleKey: 'inspection',
      title: 'Inspection Finding',
      params: {
        inspection_type: 'general',
        chronology_count: 4,
        summary_present: true,
        nested_location: { zone: 'A' },
        empty_value: null,
      },
    })

    expect(context).toEqual({
      path: '/inspection/general',
      search: '',
      route_key: 'inspection.form.finding',
      route_name: '',
      module_key: 'inspection',
      title: 'Inspection Finding',
      params: {
        inspection_type: 'general',
        chronology_count: '4',
        summary_present: 'true',
      },
    })
  })

  it('bounds parameter count and value lengths to the backend contract', () => {
    const params = Object.fromEntries(
      Array.from({ length: 25 }, (_, index) => [`key_${index}`, 'x'.repeat(200)]),
    )
    const context = buildAiHelperPageContext({ params })

    expect(Object.keys(context.params)).toHaveLength(AI_HELPER_PAGE_CONTEXT_LIMITS.params)
    expect(context.params.key_0).toHaveLength(AI_HELPER_PAGE_CONTEXT_LIMITS.paramValue)
    expect(context.params).not.toHaveProperty('key_20')
  })
})
