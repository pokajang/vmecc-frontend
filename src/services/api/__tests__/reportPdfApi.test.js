import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildApiUrl, fetchWithCsrfRetry } from '../httpClient'
import { downloadReportPdf } from '../reportPdfApi'

vi.mock('../httpClient', () => ({
  buildApiUrl: vi.fn((path) => `https://api.test${path}`),
  fetchWithCsrfRetry: vi.fn(),
}))

describe('downloadReportPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests the latest report by UID and validates the PDF response', async () => {
    const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' })
    fetchWithCsrfRetry.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'application/pdf',
        'content-disposition': "attachment; filename*=UTF-8''INS-02-1372026.pdf",
        'x-report-version': '4',
      }),
      blob: vi.fn().mockResolvedValue(blob),
    })

    const result = await downloadReportPdf({
      endpoint: '/reports/inspection/pdf',
      reportUid: 'report-123',
    })

    expect(buildApiUrl).toHaveBeenCalledWith('/reports/inspection/pdf')
    expect(fetchWithCsrfRetry).toHaveBeenCalledWith(
      'https://api.test/reports/inspection/pdf',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ report_uid: 'report-123' }),
      }),
    )
    expect(result).toEqual({
      blob,
      filename: 'INS-02-1372026.pdf',
      reportVersion: '4',
    })
  })

  it('preserves structured API errors', async () => {
    fetchWithCsrfRetry.mockResolvedValue({
      ok: false,
      status: 403,
      text: vi
        .fn()
        .mockResolvedValue(JSON.stringify({ message: 'Forbidden', code: 'REPORT_PDF_FORBIDDEN' })),
    })

    await expect(
      downloadReportPdf({ endpoint: '/reports/erco/pdf', reportUid: 'report-123' }),
    ).rejects.toMatchObject({ message: 'Forbidden', status: 403, code: 'REPORT_PDF_FORBIDDEN' })
  })

  it('rejects non-PDF success responses', async () => {
    fetchWithCsrfRetry.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      blob: vi.fn(),
    })

    await expect(
      downloadReportPdf({ endpoint: '/reports/drill/pdf', reportUid: 'report-123' }),
    ).rejects.toThrow('invalid PDF response')
  })
})
