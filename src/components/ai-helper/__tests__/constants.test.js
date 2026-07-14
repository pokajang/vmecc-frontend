import { describe, expect, it } from 'vitest'

import { knowledgeActionableFindings, knowledgeQualityLabel, safeAiHelperError } from '../constants'

describe('safeAiHelperError', () => {
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
})

describe('knowledge ingestion quality', () => {
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
