// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPayrollSensitiveState } from 'src/services/payrollPrivacy'
import useOvertimeData from '../useOvertimeData'

const apiMocks = vi.hoisted(() => ({
  loadMyOvertimeDraftApiFirst: vi.fn(),
  loadMyOvertimePolicyApiFirst: vi.fn(),
  loadMyOvertimeRecordsApiFirst: vi.fn(),
}))

vi.mock('src/services/overtimeApi', () => apiMocks)

const deferred = () => {
  let resolve
  const promise = new Promise((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

const propsFor = (userId) => ({
  userId,
  canUseOvertimeModule: true,
  isOvertimeEligibilityLoading: false,
  overtimeEligibilityResolved: true,
  isOvertimeEligibleEffective: true,
  pushToast: vi.fn(),
  onHydrationStart: vi.fn(),
})

describe('useOvertimeData sensitive identity boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearPayrollSensitiveState({ broadcast: false })
    apiMocks.loadMyOvertimePolicyApiFirst.mockResolvedValue({ ok: true, data: {} })
  })

  it('masks the previous employee data immediately while the next identity is loading', async () => {
    const nextRecords = deferred()
    const nextDraft = deferred()
    apiMocks.loadMyOvertimeRecordsApiFirst.mockImplementation((userId) =>
      userId === 'employee-b'
        ? nextRecords.promise
        : Promise.resolve({ ok: true, data: [{ id: 'OT-A' }] }),
    )
    apiMocks.loadMyOvertimeDraftApiFirst.mockImplementation((userId) =>
      userId === 'employee-b'
        ? nextDraft.promise
        : Promise.resolve({ ok: true, data: { reason: 'Employee A private draft' } }),
    )
    const { result, rerender } = renderHook((props) => useOvertimeData(props), {
      initialProps: propsFor('employee-a'),
    })

    await waitFor(() => expect(result.current.overtimeRecords[0]?.id).toBe('OT-A'))
    expect(result.current.overtimeDraft?.reason).toBe('Employee A private draft')

    rerender(propsFor('employee-b'))

    expect(result.current.overtimeRecords).toEqual([])
    expect(result.current.overtimeDraft).toBeNull()
    expect(result.current.isOvertimeLoading).toBe(true)

    await act(async () => {
      nextRecords.resolve({ ok: true, data: [{ id: 'OT-B' }] })
      nextDraft.resolve({ ok: true, data: { reason: 'Employee B private draft' } })
    })
    await waitFor(() => expect(result.current.overtimeRecords[0]?.id).toBe('OT-B'))
    expect(result.current.overtimeDraft?.reason).toBe('Employee B private draft')
  })

  it('ignores a late response from the previous identity after account switching', async () => {
    const previousRecords = deferred()
    const previousDraft = deferred()
    apiMocks.loadMyOvertimeRecordsApiFirst.mockImplementation((userId) =>
      userId === 'employee-a'
        ? previousRecords.promise
        : Promise.resolve({ ok: true, data: [{ id: 'OT-B' }] }),
    )
    apiMocks.loadMyOvertimeDraftApiFirst.mockImplementation((userId) =>
      userId === 'employee-a'
        ? previousDraft.promise
        : Promise.resolve({ ok: true, data: { reason: 'Employee B draft' } }),
    )
    const { result, rerender } = renderHook((props) => useOvertimeData(props), {
      initialProps: propsFor('employee-a'),
    })

    rerender(propsFor('employee-b'))
    await waitFor(() => expect(result.current.overtimeRecords[0]?.id).toBe('OT-B'))

    await act(async () => {
      previousRecords.resolve({ ok: true, data: [{ id: 'OT-A-LATE' }] })
      previousDraft.resolve({ ok: true, data: { reason: 'Employee A late private draft' } })
    })

    expect(result.current.overtimeRecords).toEqual([{ id: 'OT-B' }])
    expect(result.current.overtimeDraft?.reason).toBe('Employee B draft')
  })
})
