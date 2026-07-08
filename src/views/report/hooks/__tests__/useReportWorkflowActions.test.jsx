// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import useReportWorkflowActions from '../useReportWorkflowActions'

vi.mock('../../reportApi', () => ({
  approveReportRecord: vi.fn(),
  rejectReportRecord: vi.fn(),
  reviewReportRecord: vi.fn(),
}))

const renderActions = () =>
  renderHook(() =>
    useReportWorkflowActions({
      navigate: vi.fn(),
      pushToast: vi.fn(),
      reloadRecords: vi.fn(),
      reportBasePath: '/report/erco',
    }),
  )

describe('useReportWorkflowActions', () => {
  it('uses backend workflow flags when present', () => {
    const { result } = renderActions()

    expect(result.current.canReviewRecord({ status: 'Submitted', canReview: false })).toBe(false)
    expect(result.current.canReviewRecord({ status: 'Draft', canReview: true })).toBe(true)
    expect(result.current.canApproveRecord({ status: 'Reviewed', canApprove: false })).toBe(false)
    expect(result.current.canRejectRecord({ status: 'Reviewed', canReject: false })).toBe(false)
  })

  it('keeps status fallback for local records without backend flags', () => {
    const { result } = renderActions()

    expect(result.current.canReviewRecord({ status: 'Submitted' })).toBe(true)
    expect(result.current.canApproveRecord({ status: 'Reviewed' })).toBe(true)
    expect(result.current.canRejectRecord({ status: 'Reviewed' })).toBe(true)
    expect(result.current.canReviewRecord({ status: 'Draft' })).toBe(false)
  })
})
