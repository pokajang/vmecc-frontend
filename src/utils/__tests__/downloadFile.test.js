// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { triggerBlobDownload } from '../downloadFile'

describe('triggerBlobDownload', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:report-pdf')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('clicks an attached link and revokes the object URL after a delay', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const blob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' })

    triggerBlobDownload(blob, 'report.pdf')

    expect(click).toHaveBeenCalledOnce()
    expect(document.querySelector('a[download="report.pdf"]')).toBeNull()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report-pdf')
  })

  it('rejects empty files before creating an object URL', () => {
    expect(() => triggerBlobDownload(new Blob([]), 'empty.pdf')).toThrow('empty file')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
