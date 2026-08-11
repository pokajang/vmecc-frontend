// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useInspectionRecords from '../state/useInspectionRecords'

const { fetchInspectionRecords } = vi.hoisted(() => ({
  fetchInspectionRecords: vi.fn(),
}))

vi.mock('../domain/api/inspectionApi', () => ({
  deleteInspectionRecord: vi.fn(),
  fetchInspectionRecords: (...args) => fetchInspectionRecords(...args),
  isInspectionApiEnabled: () => true,
  loadInspectionRecordsForScope: () => [],
  persistInspectionRecord: vi.fn(),
  persistInspectionRecords: vi.fn(),
}))

describe('useInspectionRecords actionable scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps inspections assigned to the reviewer even when another user owns them', async () => {
    fetchInspectionRecords.mockResolvedValue([
      {
        id: 52,
        displayId: 'INS-52',
        status: 'Submitted',
        ownerId: 99,
        submittedBy: 'Other employee',
        reportedAt: '2026-07-28T00:00:00Z',
      },
    ])

    const { result } = renderHook(() =>
      useInspectionRecords({
        user: { id: 7, name: 'Assigned AIC' },
        userId: 7,
        actionFilter: 'review',
      }),
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchInspectionRecords).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'actionable', action: 'review' }),
    )
    expect(result.current.filteredRecords).toHaveLength(1)
    expect(result.current.filteredRecords[0].id).toBe(52)
  })

  it('loads the normalized initial All scope', async () => {
    fetchInspectionRecords.mockResolvedValue([])

    const { result } = renderHook(() =>
      useInspectionRecords({
        user: { id: 7, name: 'Incident Commander' },
        userId: 7,
        initialRecordScope: 'all',
      }),
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.recordScope).toBe('all')
    expect(fetchInspectionRecords).toHaveBeenCalledWith(expect.objectContaining({ scope: 'all' }))
  })

  it('does not let a stale Mine response replace a newer All response', async () => {
    let resolveMine
    let resolveAll
    fetchInspectionRecords
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveMine = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveAll = resolve
          }),
      )

    const { result } = renderHook(() =>
      useInspectionRecords({
        user: { id: 7, name: 'Incident Commander' },
        userId: 7,
      }),
    )

    await waitFor(() => expect(fetchInspectionRecords).toHaveBeenCalledTimes(1))
    act(() => result.current.setRecordScope('all'))
    await waitFor(() => expect(fetchInspectionRecords).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolveAll([{ id: 'all-record', submittedBy: 'Another user' }])
    })
    await waitFor(() => expect(result.current.records[0]?.id).toBe('all-record'))

    await act(async () => {
      resolveMine([{ id: 'mine-record', submittedBy: 'Incident Commander' }])
    })
    expect(result.current.records[0]?.id).toBe('all-record')
  })
})
