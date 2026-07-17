import { describe, expect, it } from 'vitest'
import {
  buildReviewWorkflowTemplateForApplicantRoles,
  canActorPerformWorkflowAction,
  getReviewWorkflowApproveActionLabel,
  getWorkflowActionBlockedReason,
  normalizeReviewWorkflowStage,
  normalizeRoleList,
  normalizeRoleValue,
  resolveReviewWorkflowStateForRecord,
} from '../workflowDomain'

const policy = {
  options: { requireRecommendation: true },
}

const resolveApprovalRule = () => ({
  reviewRole: 'Contract Manager',
  recommendRole: 'Human Resource',
  approveRole: 'Client Contract Manager',
})

describe('workflow role normalization', () => {
  it('normalizes legacy aliases and removes duplicate actor roles', () => {
    expect(normalizeRoleValue(' system admin ')).toBe('System Administrator')
    expect(normalizeRoleList(['system admin', 'System Administrator', '', 'Finance'])).toEqual([
      'System Administrator',
      'Finance',
    ])
  })

  it('normalizes invalid stages and exposes the correct positive action label', () => {
    expect(normalizeReviewWorkflowStage('unknown')).toBe('review')
    expect(getReviewWorkflowApproveActionLabel('review')).toBe('Review')
    expect(getReviewWorkflowApproveActionLabel('recommend')).toBe('Recommend')
    expect(getReviewWorkflowApproveActionLabel('approve')).toBe('Approve')
  })
})

describe('canActorPerformWorkflowAction', () => {
  it('allows only the active stage role for pending records', () => {
    expect(
      canActorPerformWorkflowAction({
        status: 'Pending',
        nextActionRole: 'Human Resource',
        actorRoles: ['Human Resource'],
        isSystemAdmin: false,
      }),
    ).toBe(true)
    expect(
      canActorPerformWorkflowAction({
        status: 'Pending',
        nextActionRole: 'Human Resource',
        actorRoles: ['Finance'],
        isSystemAdmin: false,
      }),
    ).toBe(false)
  })

  it('does not expose an action for a terminal record, including to an administrator', () => {
    expect(
      canActorPerformWorkflowAction({
        status: 'Approved',
        nextActionRole: 'Human Resource',
        actorRoles: ['Human Resource'],
        isSystemAdmin: false,
      }),
    ).toBe(false)
    expect(
      canActorPerformWorkflowAction({
        status: 'Approved',
        nextActionRole: 'Human Resource',
        actorRoles: [],
        isSystemAdmin: true,
      }),
    ).toBe(false)
  })

  it('allows an administrator to act only while the record remains pending', () => {
    expect(
      canActorPerformWorkflowAction({
        status: 'Pending',
        nextActionRole: 'Human Resource',
        actorRoles: [],
        isSystemAdmin: true,
      }),
    ).toBe(true)
  })
})

describe('getWorkflowActionBlockedReason', () => {
  it('returns non-pending reason', () => {
    const reason = getWorkflowActionBlockedReason({
      status: 'Approved',
      nextActionRole: 'Reviewer',
      actorRoles: ['Reviewer'],
      isSystemAdmin: false,
    })
    expect(reason).toContain('no longer pending')
  })

  it('returns required role reason', () => {
    const reason = getWorkflowActionBlockedReason({
      status: 'Pending',
      nextActionRole: 'Manager',
      actorRoles: ['Reviewer'],
      isSystemAdmin: false,
    })
    expect(reason).toContain('Manager')
  })

  it('fails closed when no next action role is configured', () => {
    const reason = getWorkflowActionBlockedReason({
      status: 'Pending',
      nextActionRole: '',
      actorRoles: ['Human Resource'],
      isSystemAdmin: false,
    })

    expect(reason).toContain('no valid next action role')
  })

  it('does not block a pending action for an administrator', () => {
    expect(
      getWorkflowActionBlockedReason({
        status: 'Pending',
        nextActionRole: '',
        actorRoles: [],
        isSystemAdmin: true,
      }),
    ).toBe('')
  })
})

describe('review workflow state resolution', () => {
  it('builds the submission template from the resolved applicant rule', () => {
    expect(
      buildReviewWorkflowTemplateForApplicantRoles(
        policy,
        ['Tactical Response Team'],
        resolveApprovalRule,
      ),
    ).toEqual({
      workflowSnapshot: {
        reviewRole: 'Contract Manager',
        recommendRole: 'Human Resource',
        approveRole: 'Client Contract Manager',
        requireRecommendation: true,
      },
      workflowStage: 'review',
      nextActionRole: 'Contract Manager',
    })
  })

  it('uses the persisted snapshot instead of replacing in-flight role ownership', () => {
    const resolved = resolveReviewWorkflowStateForRecord(
      {
        status: 'Pending',
        workflowStage: 'approve',
        nextActionRole: 'Finance',
        workflowSnapshot: {
          reviewRole: 'Admin',
          recommendRole: 'Human Resource',
          approveRole: 'Finance',
          requireRecommendation: true,
        },
      },
      ['Tactical Response Team'],
      policy,
      resolveApprovalRule,
    )

    expect(resolved.workflowStage).toBe('approve')
    expect(resolved.nextActionRole).toBe('Finance')
    expect(resolved.workflowSnapshot.approveRole).toBe('Finance')
  })

  it('skips recommendation when the persisted workflow disables it', () => {
    const resolved = resolveReviewWorkflowStateForRecord(
      {
        status: 'Pending',
        workflowStage: 'recommend',
        workflowSnapshot: {
          reviewRole: 'Contract Manager',
          recommendRole: 'Human Resource',
          approveRole: 'Client Contract Manager',
          requireRecommendation: false,
        },
      },
      [],
      policy,
      resolveApprovalRule,
    )

    expect(resolved.workflowStage).toBe('approve')
    expect(resolved.nextActionRole).toBe('Client Contract Manager')
  })

  it('forces non-pending records into a terminal workflow state', () => {
    const resolved = resolveReviewWorkflowStateForRecord(
      {
        status: 'Rejected',
        workflowStage: 'approve',
        nextActionRole: 'Client Contract Manager',
      },
      [],
      policy,
      resolveApprovalRule,
    )

    expect(resolved.workflowStage).toBe('done')
    expect(resolved.nextActionRole).toBeNull()
  })
})
