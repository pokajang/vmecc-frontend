import { describe, expect, it } from 'vitest'
import { resolveClaimWorkflowState } from '../helpers/claimWorkflowPolicy'
import { normalizeClaimWorkflowRecord } from '../utils'

describe('salary claim workflow normalization', () => {
  it('normalizes unknown status+stage into safe done state', () => {
    const normalized = normalizeClaimWorkflowRecord(
      {
        id: 'CLM-001',
        status: 'Escalated',
        workflowStage: '',
        nextActionRole: 'Manager',
      },
      { checkRole: 'Checker', reviewRole: 'Reviewer', approveRole: 'Approver' },
    )

    expect(normalized.status).toBe('Escalated')
    expect(normalized.workflowStage).toBe('done')
    expect(normalized.nextActionRole).toBeNull()
  })

  it('keeps explicit actionable stage even when status string is custom', () => {
    const normalized = normalizeClaimWorkflowRecord(
      {
        id: 'CLM-002',
        status: 'Escalated',
        workflowStage: 'review',
        nextActionRole: 'Senior Reviewer',
      },
      { checkRole: 'Checker', reviewRole: 'Reviewer', approveRole: 'Approver' },
    )

    expect(normalized.workflowStage).toBe('review')
    expect(normalized.nextActionRole).toBe('Senior Reviewer')
  })

  it('blocks actions for unknown workflow states in policy resolver', () => {
    const state = resolveClaimWorkflowState({
      claimRow: {
        id: 'CLM-003',
        status: 'Escalated',
        workflowStage: '',
      },
      salaryWorkflowRule: { checkRole: 'Checker', reviewRole: 'Reviewer', approveRole: 'Approver' },
      normalizedUserRoles: ['Checker'],
      isSystemAdmin: false,
    })

    expect(state.stage).toBe('done')
    expect(state.stageLabel).toBe('Unknown')
    expect(state.pending).toBe(false)
    expect(state.canRespond).toBe(false)
    expect(state.blockedReason).toContain('unknown workflow state')
  })

  it('enforces role gating for pending check stage', () => {
    const state = resolveClaimWorkflowState({
      claimRow: {
        id: 'CLM-004',
        status: 'Pending',
        workflowStage: 'check',
        nextActionRole: 'Checker',
      },
      salaryWorkflowRule: { checkRole: 'Checker', reviewRole: 'Reviewer', approveRole: 'Approver' },
      normalizedUserRoles: ['Reviewer'],
      isSystemAdmin: false,
    })

    expect(state.pending).toBe(true)
    expect(state.canRespond).toBe(false)
    expect(state.blockedReason).toContain('Checker')
  })
})
