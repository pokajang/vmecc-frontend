// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useClaimsWorkflow from '../useClaimsWorkflow'

const runStaffPayrollClaimWorkflowApi = vi.fn()

vi.mock('src/services/payrollClaimsApi', () => ({
  runStaffPayrollClaimWorkflowApi: (...args) => runStaffPayrollClaimWorkflowApi(...args),
}))

describe('useClaimsWorkflow backend-truth transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses backend-updated pending status/role in success message', async () => {
    const selectedClaim = {
      id: 'CLM-100',
      serverId: 100,
      ownerId: '7',
      status: 'Pending Approval',
      workflowStage: 'review',
      nextActionRole: 'Approver',
    }
    const pushToast = vi.fn()

    const getClaimWorkflowState = vi.fn((row) => {
      const status = String(row?.status || '').trim()
      if (status === 'Pending Review') {
        return {
          stage: 'review',
          nextRole: 'Senior Reviewer',
          canRespond: true,
          pending: true,
          blockedReason: '',
        }
      }
      return {
        stage: 'review',
        nextRole: 'Approver',
        canRespond: true,
        pending: true,
        blockedReason: '',
      }
    })
    const applyClaimApiUpdate = vi.fn((base, apiRow) => ({ ...base, ...apiRow }))

    runStaffPayrollClaimWorkflowApi.mockResolvedValue({
      ok: true,
      data: {
        id: 'CLM-100',
        status: 'Pending Review',
        workflowStage: 'review',
        nextActionRole: 'Senior Reviewer',
      },
    })

    const { result } = renderHook(() =>
      useClaimsWorkflow({
        selectedClaim,
        getClaimWorkflowState,
        getClaimActionConfig: () => ({ approveDisabled: false, rejectDisabled: false }),
        applyClaimApiUpdate,
        pushToast,
      }),
    )

    await act(async () => {
      const ok = await result.current.runClaimWorkflowAction(selectedClaim, {
        decision: 'approve',
        remarks: '',
        declarationChecked: false,
      })
      expect(ok).toBe(true)
    })

    expect(runStaffPayrollClaimWorkflowApi).toHaveBeenCalledWith(
      selectedClaim,
      'review',
      'Claim reviewed and routed for approval.',
    )
    expect(pushToast).toHaveBeenCalledWith(
      'Claim CLM-100 moved to Pending Review and routed to Senior Reviewer.',
      {
        title: 'Claim updated',
        color: 'info',
      },
    )
  })

  it('uses backend-approved status for terminal success messaging', async () => {
    const selectedClaim = {
      id: 'CLM-200',
      serverId: 200,
      ownerId: '9',
      status: 'Pending Approval',
      workflowStage: 'approve',
      nextActionRole: 'Approver',
    }
    const pushToast = vi.fn()

    const getClaimWorkflowState = vi.fn((row) => {
      const status = String(row?.status || '').trim()
      if (status === 'Approved') {
        return {
          stage: 'done',
          nextRole: null,
          canRespond: false,
          pending: false,
          blockedReason: 'This claim is no longer pending workflow action.',
        }
      }
      return {
        stage: 'approve',
        nextRole: 'Approver',
        canRespond: true,
        pending: true,
        blockedReason: '',
      }
    })

    runStaffPayrollClaimWorkflowApi.mockResolvedValue({
      ok: true,
      data: {
        id: 'CLM-200',
        status: 'Approved',
        workflowStage: 'done',
        nextActionRole: null,
      },
    })

    const { result } = renderHook(() =>
      useClaimsWorkflow({
        selectedClaim,
        getClaimWorkflowState,
        getClaimActionConfig: () => ({ approveDisabled: false, rejectDisabled: false }),
        applyClaimApiUpdate: (base, apiRow) => ({ ...base, ...apiRow }),
        pushToast,
      }),
    )

    await act(async () => {
      const ok = await result.current.runClaimWorkflowAction(selectedClaim, {
        decision: 'approve',
      })
      expect(ok).toBe(true)
    })

    expect(runStaffPayrollClaimWorkflowApi).toHaveBeenCalledWith(
      selectedClaim,
      'approve',
      'Final approval granted.',
    )
    expect(pushToast).toHaveBeenCalledWith('Claim CLM-200 approved.', {
      title: 'Claim updated',
      color: 'success',
    })
  })
})
