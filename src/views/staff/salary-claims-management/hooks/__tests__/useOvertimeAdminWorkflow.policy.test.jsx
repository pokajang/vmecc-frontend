// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useOvertimeAdminWorkflow from '../useOvertimeAdminWorkflow'

vi.mock('src/views/settings/overtimeApprovalRulesStorage', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    loadOvertimeApprovalRules: vi.fn(),
  }
})

vi.mock('src/services/overtimeApi', () => ({
  runStaffOvertimeWorkflowApi: vi.fn(),
}))

import { loadOvertimeApprovalRules } from 'src/views/settings/overtimeApprovalRulesStorage'

const renderWorkflow = (canLoadOvertimePolicy) =>
  renderHook(() =>
    useOvertimeAdminWorkflow({
      normalizedUserRoles: ['Client Contract Manager'],
      isSystemAdmin: false,
      canLoadOvertimePolicy,
      getOvertimeApplicantRolesForRecord: () => [],
      hydrateOvertime: vi.fn(),
      pushToast: vi.fn(),
    }),
  )

describe('useOvertimeAdminWorkflow policy access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    loadOvertimeApprovalRules.mockResolvedValue({ ok: true, data: {} })
  })

  it('uses safe defaults without requesting settings for ordinary workflow managers', () => {
    renderWorkflow(false)

    expect(loadOvertimeApprovalRules).not.toHaveBeenCalled()
  })

  it('loads the managed policy when the actor has settings access', async () => {
    renderWorkflow(true)

    await waitFor(() => expect(loadOvertimeApprovalRules).toHaveBeenCalledTimes(1))
  })
})
