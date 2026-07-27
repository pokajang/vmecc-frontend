import { describe, expect, it } from 'vitest'

import {
  ERCO_AI_MESSAGE_MAX_LENGTH,
  assertErcoAiMessageWithinLimit,
  buildErcoAiContext,
  buildErcoSummaryPrompt,
} from '../aiAssist'

describe('ERCO embedded AI request contract', () => {
  it('builds a canonical page context without embedding a record snapshot', () => {
    const context = buildErcoAiContext()

    expect(context).toEqual({
      path: expect.any(String),
      search: '',
      route_key: 'reports.erco.form',
      route_name: '',
      module_key: 'reports',
      title: 'ERCO Report Form',
      params: { report_type: 'erco' },
    })
    expect(context).not.toHaveProperty('form_snapshot')
  })

  it('uses compact record JSON and enforces the full embedded-message limit', () => {
    const prompt = buildErcoSummaryPrompt(
      {
        reportType: 'erco',
        summary: '',
        incident: {},
        response: {},
        chronology: [],
        postIncidentAnalysis: {},
      },
      'generate',
    )

    expect(prompt).toContain('{"reportType":"erco"')
    expect(prompt).not.toContain('{\n  "reportType"')
    expect(assertErcoAiMessageWithinLimit('x'.repeat(ERCO_AI_MESSAGE_MAX_LENGTH))).toHaveLength(
      ERCO_AI_MESSAGE_MAX_LENGTH,
    )

    try {
      assertErcoAiMessageWithinLimit('x'.repeat(ERCO_AI_MESSAGE_MAX_LENGTH + 1))
      throw new Error('Expected an oversized message to be rejected.')
    } catch (error) {
      expect(error.code).toBe('AI_HELPER_MESSAGE_TOO_LONG')
    }
  })
})
