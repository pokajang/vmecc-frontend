// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useLeaveAdminWorkflow from '../useLeaveAdminWorkflow'

vi.mock('src/views/settings/overtimeApprovalRulesStorage', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    loadOvertimeApprovalRules: vi.fn(),
  }
})

vi.mock('src/services/apiClient', () => ({ apiRequest: vi.fn() }))
vi.mock('src/services/overtimeApi', () => ({ runStaffOvertimeWorkflowApi: vi.fn() }))

import { loadOvertimeApprovalRules } from 'src/views/settings/overtimeApprovalRulesStorage'

const renderWorkflow = (canLoadOvertimePolicy) =>
  renderHook(() =>
    useLeaveAdminWorkflow({
      actorRoles: ['Human Resource'],
      isSystemAdministrator: false,
      canLoadOvertimePolicy,
      pushToast: vi.fn(),
      refreshAllLeaveRecords: vi.fn(),
      refreshAllOvertimeRecords: vi.fn(),
      getApplicantRolesForRecord: () => [],
    }),
  )

describe('useLeaveAdminWorkflow overtime policy access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadOvertimeApprovalRules.mockResolvedValue({ ok: true, data: {} })
  })

  it('does not request settings policy without settings access', () => {
    renderWorkflow(false)

    expect(loadOvertimeApprovalRules).not.toHaveBeenCalled()
  })

  it('loads settings policy for an authorized settings manager', async () => {
    renderWorkflow(true)

    await waitFor(() => expect(loadOvertimeApprovalRules).toHaveBeenCalledTimes(1))
  })
})
