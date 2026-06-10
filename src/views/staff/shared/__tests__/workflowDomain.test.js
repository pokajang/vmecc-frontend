import { describe, expect, it } from 'vitest'
import { getWorkflowActionBlockedReason } from '../workflowDomain'

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
})
