import { describe, expect, it } from 'vitest'

import {
  buildFailedAssistantMessage,
  getMessageActions,
  isAiHelperErrorRetryable,
  knowledgeActionableFindings,
  knowledgeFindings,
  knowledgeQualityLabel,
  normalizeResponseLanguage,
  responseLanguageLabel,
  safeAiHelperError,
} from '../constants'

describe('response language defaults', () => {
  it('defaults missing or invalid preferences to the latest-message language', () => {
    expect(normalizeResponseLanguage(null)).toBe('auto')
    expect(normalizeResponseLanguage('unsupported')).toBe('auto')
    expect(responseLanguageLabel(normalizeResponseLanguage(null))).toBe('Auto')
    expect(normalizeResponseLanguage('bm')).toBe('bm')
  })
})

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
      'need a little more detail',
    )
  })

  it('keeps knowledge-readiness failures polite and uses the trusted server message when present', () => {
    expect(
      safeAiHelperError({
        status: 409,
        payload: {
          code: 'AI_HELPER_KNOWLEDGE_NOT_READY',
          message: 'Maaf, maklumat rujukan belum tersedia buat sementara waktu.',
        },
      }),
    ).toBe('Maaf, maklumat rujukan belum tersedia buat sementara waktu.')

    const fallback = safeAiHelperError({
      status: 409,
      payload: { code: 'AI_HELPER_KNOWLEDGE_NOT_READY' },
    })
    expect(fallback).toContain('temporarily unavailable')
    expect(fallback).not.toContain('corpus')
    expect(fallback).not.toContain('failed documents')
  })

  it('uses trusted bilingual input-safety responses and keeps clarification distinct from policy refusal', () => {
    expect(
      safeAiHelperError({
        status: 422,
        payload: {
          code: 'AI_HELPER_SENSITIVE_DATA_BLOCKED',
          message: 'Maaf, permintaan ini mungkin mengandungi maklumat sensitif.',
        },
      }),
    ).toBe('Maaf, permintaan ini mungkin mengandungi maklumat sensitif.')

    expect(
      safeAiHelperError({
        status: 422,
        payload: {
          code: 'AI_HELPER_INPUT_CLARIFICATION',
          message: 'I recognize ERCO but need a little more detail.',
        },
      }),
    ).toBe('I recognize ERCO but need a little more detail.')

    expect(
      safeAiHelperError({
        status: 422,
        payload: { code: 'AI_HELPER_RESTRICTED_REQUEST' },
      }),
    ).toContain('unauthorized data')
  })

  it('shows request validation failures accurately and prevents unchanged retries', () => {
    const error = {
      status: 422,
      payload: { code: 'AI_HELPER_VALIDATION_FAILED' },
    }

    expect(safeAiHelperError(error)).toBe(
      'The AI request could not be sent because some information was invalid. Refresh the page and try again.',
    )
    expect(isAiHelperErrorRetryable(error)).toBe(false)

    const message = buildFailedAssistantMessage(safeAiHelperError(error), {
      retry_prompt: 'same invalid request',
      retryable: isAiHelperErrorRetryable(error),
    })
    expect(getMessageActions({ ...message, role: 'assistant' }).canRetry).toBe(false)
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
