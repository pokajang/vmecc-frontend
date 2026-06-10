// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import usePayrollClaimsData from '../usePayrollClaimsData'

const flushPayrollDraftRetryQueue = vi.fn()
const loadLocalPayrollAutosaveDrafts = vi.fn()
const loadMyPayrollClaimDraftsApiFirst = vi.fn()
const loadMyPayrollClaimsApiFirst = vi.fn()
const loadMyPayrollPayslipsApiFirst = vi.fn()
const downloadMyPayrollPayslipApiFirst = vi.fn()

vi.mock('src/hooks/useTableRows', () => ({
  default: (rows) => ({
    rowsToShow: 10,
    setRowsToShow: () => {},
    visibleRows: rows,
  }),
}))

vi.mock('src/services/payrollClaimsApi', () => ({
  flushPayrollDraftRetryQueue: (...args) => flushPayrollDraftRetryQueue(...args),
  loadLocalPayrollAutosaveDrafts: (...args) => loadLocalPayrollAutosaveDrafts(...args),
  loadMyPayrollClaimDraftsApiFirst: (...args) => loadMyPayrollClaimDraftsApiFirst(...args),
  loadMyPayrollClaimsApiFirst: (...args) => loadMyPayrollClaimsApiFirst(...args),
  loadMyPayrollPayslipsApiFirst: (...args) => loadMyPayrollPayslipsApiFirst(...args),
  downloadMyPayrollPayslipApiFirst: (...args) => downloadMyPayrollPayslipApiFirst(...args),
}))

describe('usePayrollClaimsData toast dedupe reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    flushPayrollDraftRetryQueue.mockResolvedValue({ ok: true, synced: 0, pending: 0 })
    loadLocalPayrollAutosaveDrafts.mockReturnValue([])
    loadMyPayrollClaimDraftsApiFirst.mockResolvedValue({ ok: true, data: [] })
    loadMyPayrollPayslipsApiFirst.mockResolvedValue({ ok: true, data: [] })
    downloadMyPayrollPayslipApiFirst.mockResolvedValue({ ok: false })
  })

  it('emits the same claims error toast again after an intervening successful refresh', async () => {
    loadMyPayrollClaimsApiFirst
      .mockResolvedValueOnce({ ok: false, data: [] })
      .mockResolvedValueOnce({ ok: true, data: [] })
      .mockResolvedValueOnce({ ok: false, data: [] })

    const pushToast = vi.fn()
    const { result } = renderHook(() =>
      usePayrollClaimsData({
        userId: 'u1',
        activeSection: 'claims',
        claimId: '',
        search: '',
        statusFilter: 'All',
        categoryFilter: 'All',
        period: 'all',
        sort: 'submittedAt:desc',
        pushToast,
      }),
    )

    await waitFor(() => {
      expect(result.current.isClaimsLoading).toBe(false)
    })

    const claimsErrorMessage = 'Unable to load payroll claims from API. Please retry.'
    const claimsToastsAfterHydrate = pushToast.mock.calls.filter(
      ([message]) => message === claimsErrorMessage,
    )
    expect(claimsToastsAfterHydrate).toHaveLength(1)

    await act(async () => {
      await result.current.refreshClaimRows()
    })

    await act(async () => {
      await result.current.refreshClaimRows()
    })

    const claimsToastsAfterSecondFailure = pushToast.mock.calls.filter(
      ([message]) => message === claimsErrorMessage,
    )
    expect(claimsToastsAfterSecondFailure).toHaveLength(2)
  })
})
