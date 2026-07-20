import { describe, expect, it } from 'vitest'

import {
  knowledgeActionableFindings,
  knowledgeFindings,
  knowledgeQualityLabel,
  safeAiHelperError,
} from '../constants'

describe('safeAiHelperError', () => {
  it.each([
    'AI_HELPER_PROVIDER_RATE_LIMITED',
    'AI_HELPER_PROVIDER_TIMEOUT',
    'AI_HELPER_PROVIDER_UNAVAILABLE',
    'AI_HELPER_PROVIDER_CIRCUIT_OPEN',
    'AI_HELPER_PROVIDER_STREAM_INTERRUPTED',
    'AI_HELPER_PROVIDER_OUTPUT_INCOMPLETE',
    'AI_HELPER_PROVIDER_RESPONSE_FAILED',
    'AI_HELPER_PROVIDER_INVALID_RESPONSE',
    'AI_HELPER_PROVIDER_CALL_BUDGET_EXCEEDED',
    'AI_HELPER_DEADLINE_EXCEEDED',
    'AI_HELPER_STREAM_FAILED',
  ])('offers retry guidance for the typed SSE error %s', (code) => {
    expect(safeAiHelperError({ code })).toBe(
      'Ask AI hit a temporary service issue before the response finished. Please try again.',
    )
  })

  it('shows the generation retry window for rate-limited Ask AI responses', () => {
    expect(
      safeAiHelperError({
        status: 429,
        payload: { code: 'AI_HELPER_RATE_LIMITED', retry_after: 17 },
      }),
    ).toBe('Ask AI is busy. Try again in 17s.')
  })

  it('uses a knowledge-specific message for upload rate limits', () => {
    expect(
      safeAiHelperError({
        status: 429,
        payload: { code: 'AI_HELPER_KNOWLEDGE_UPLOAD_RATE_LIMITED', retry_after: 12.2 },
      }),
    ).toBe('Too many knowledge uploads. Try again in 13s.')
  })

  it('distinguishes provider, capacity, and evidence failures', () => {
    expect(
      safeAiHelperError({ status: 503, payload: { code: 'AI_HELPER_PROVIDER_TEMPORARY' } }),
    ).toContain('temporarily unavailable')
    expect(
      safeAiHelperError({ status: 429, payload: { code: 'AI_HELPER_BUSY_RETRY', retry_after: 5 } }),
    ).toBe('Ask AI is busy. Try again in about 5s.')
    expect(safeAiHelperError({ payload: { code: 'AI_HELPER_EVIDENCE_INCOMPLETE' } })).toContain(
      'not sufficient to verify',
    )
  })
})

describe('knowledge ingestion quality', () => {
  it('handles an unavailable knowledge detail during loading transitions', () => {
    expect(knowledgeFindings(null)).toEqual([])
    expect(knowledgeFindings(null, null)).toEqual([])
    expect(knowledgeActionableFindings(null)).toEqual([])
    expect(knowledgeQualityLabel(null)).toBe('Not ready')
  })

  it('does not promote informational OCR notices to actionable warnings', () => {
    const entry = {
      extraction_complete: true,
      quality_status: 'ready_with_notices',
      pages_ocr: 2,
      processing_findings: [
        { severity: 'notice', code: 'OCR_APPLIED', page: 2, message: 'OCR applied.' },
      ],
    }

    expect(knowledgeQualityLabel(entry)).toBe('Complete - OCR applied to 2 pages')
    expect(knowledgeActionableFindings(entry)).toEqual([])
  })

  it('summarizes review-required page gaps and returns actionable findings', () => {
    const finding = {
      severity: 'warning',
      code: 'VISUAL_ONLY_PAGE',
      page: 2,
      message: 'Page 2 contains visual content but no readable text after OCR.',
    }
    const entry = {
      quality_status: 'review_required',
      pages_visual_only: 1,
      processing_findings: [finding],
    }

    expect(knowledgeQualityLabel(entry)).toBe('Review required - 1 page needs attention')
    expect(knowledgeActionableFindings(entry)).toEqual([finding])
  })
})
