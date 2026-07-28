// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useReportRecords from '../useReportRecords'

const { fetchReportRecords } = vi.hoisted(() => ({
  fetchReportRecords: vi.fn(),
}))

vi.mock('../../reportApi', () => ({
  fetchReportRecords: (...args) => fetchReportRecords(...args),
  isReportApiEnabled: () => true,
  persistReportRecord: vi.fn(),
  persistReportRecords: vi.fn(),
  runReportApiBackfillMigration: vi.fn(async () => true),
}))

vi.mock('../../reportStorage', () => ({
  loadReportRecords: () => [],
}))

describe('useReportRecords actionable scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps records assigned to the reviewer even when another user owns them', async () => {
    fetchReportRecords.mockResolvedValue([
      {
        id: 41,
        displayId: 'ERCO-41',
        reportType: 'erco',
        status: 'Submitted',
        ownerId: 99,
        submittedBy: 'Other employee',
        reportedAt: '2026-07-28T00:00:00Z',
      },
    ])

    const { result } = renderHook(() =>
      useReportRecords({
        user: { id: 7, name: 'Assigned AIC' },
        userId: 7,
        reportTypeSlug: 'erco',
        actionFilter: 'review',
      }),
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchReportRecords).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'actionable', action: 'review' }),
    )
    expect(result.current.filteredRecords).toHaveLength(1)
    expect(result.current.filteredRecords[0].id).toBe(41)
  })
})
