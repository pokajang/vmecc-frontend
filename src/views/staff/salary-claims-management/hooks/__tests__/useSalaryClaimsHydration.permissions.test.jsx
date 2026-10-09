// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadStaffOvertimeRecordsApiFirst = vi.fn()
const hydrateAssignments = vi.fn()
const setOtRateSettings = vi.fn()
const setOtRateDirty = vi.fn()
const assignmentState = {
  hydrateAssignments,
  setOtRateSettings,
  setOtRateDirty,
  assignmentRows: [],
  assignmentDraftRows: [],
}
const user = { id: 'finance-1' }
const pushToast = vi.fn()

vi.mock('src/hooks/useStaffDirectory', () => ({
  default: () => ({ loading: false, optionsAll: [] }),
}))
vi.mock('src/services/overtimeApi', () => ({
  loadStaffOvertimeRecordsApiFirst: (...args) => loadStaffOvertimeRecordsApiFirst(...args),
}))
vi.mock('src/services/payrollClaimsApi', () => ({
  loadStaffPayrollClaimsApiFirst: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}))
vi.mock('src/services/payrollPrivacy', () => ({
  createPayrollRequestContext: () => ({ isCurrent: () => true, release: vi.fn() }),
}))
vi.mock('src/services/apiClient', () => ({
  fetchOvertimeRateSettings: vi.fn().mockResolvedValue({ data: {} }),
  fetchSalaryWorkflowRules: vi.fn().mockResolvedValue({ data: {} }),
  saveOvertimeRateSettings: vi.fn().mockResolvedValue({}),
}))
vi.mock('../useSalaryAssignmentState', () => ({
  default: () => assignmentState,
}))

import useSalaryClaimsHydration from '../useSalaryClaimsHydration'

const renderHydration = (canLoadStaffOvertimeRecords) =>
  renderHook(() =>
    useSalaryClaimsHydration({
      user,
      isHrUser: true,
      pushToast,
      canLoadStaffOvertimeRecords,
    }),
  )

describe('useSalaryClaimsHydration overtime permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadStaffOvertimeRecordsApiFirst.mockResolvedValue({ ok: true, data: [{ id: 'OT-1' }] })
  })

  it('does not request overtime-management records without that permission', async () => {
    const { result } = renderHydration(false)

    await waitFor(() => expect(result.current.isClaimsLoading).toBe(false))
    expect(loadStaffOvertimeRecordsApiFirst).not.toHaveBeenCalled()
    expect(result.current.allOvertimeRecords).toEqual([])
  })

  it('loads overtime-management records for an authorized manager', async () => {
    const { result } = renderHydration(true)

    await waitFor(() => expect(loadStaffOvertimeRecordsApiFirst).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.allOvertimeRecords).toEqual([{ id: 'OT-1' }]))
  })
})
