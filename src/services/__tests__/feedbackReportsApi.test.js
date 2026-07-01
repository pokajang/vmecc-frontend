import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createFeedbackReport,
  fetchFeedbackReport,
  fetchFeedbackReports,
  updateFeedbackReport,
} from '../api/feedbackReportsApi'

describe('feedbackReportsApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
    })
  })

  it('calls the feedback report endpoints with the expected methods', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        ),
      ),
    )

    await createFeedbackReport({ message: 'A useful report message', page_context: { path: '/' } })
    await fetchFeedbackReports({ status: 'new', per_page: 10 })
    await fetchFeedbackReport(12)
    await updateFeedbackReport(12, { status: 'reviewing', admin_note: 'Investigating' })

    expect(
      fetch.mock.calls.some(
        ([url, options]) => String(url).includes('/feedback-reports') && options?.method === 'POST',
      ),
    ).toBe(true)
    expect(
      fetch.mock.calls.some(
        ([url, options]) =>
          String(url).includes('/feedback-reports?status=new&per_page=10') &&
          options?.method === 'GET',
      ),
    ).toBe(true)
    expect(
      fetch.mock.calls.some(
        ([url, options]) =>
          String(url).includes('/feedback-reports/12') && options?.method === 'GET',
      ),
    ).toBe(true)
    expect(
      fetch.mock.calls.some(
        ([url, options]) =>
          String(url).includes('/feedback-reports/12') && options?.method === 'PATCH',
      ),
    ).toBe(true)
  })
})
