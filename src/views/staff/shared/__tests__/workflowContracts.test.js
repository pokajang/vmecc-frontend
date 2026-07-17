import { describe, expect, it } from 'vitest'
import {
  createUnsavedChangesGuardConfig,
  toWorkflowActionCapability,
  toWorkflowStateSummary,
  toWorkflowTimelineEntry,
} from '../workflowContracts'

describe('workflow contracts', () => {
  it('normalizes enabled and blocked action capabilities', () => {
    expect(
      toWorkflowActionCapability({
        key: ' approve ',
        label: 'Approve',
        disabled: true,
        disabledReason: ' Wrong role ',
      }),
    ).toEqual({
      key: ' approve ',
      label: 'Approve',
      enabled: false,
      blockedReason: 'Wrong role',
    })

    expect(toWorkflowActionCapability({ key: 'review', disabledReason: 'ignored' })).toEqual({
      key: 'review',
      label: '',
      enabled: true,
      blockedReason: '',
    })
  })

  it('normalizes state summaries and attributed timeline entries', () => {
    expect(
      toWorkflowStateSummary({
        status: ' Pending ',
        owner: ' Human Resource ',
        nextAction: ' Review ',
      }),
    ).toEqual({ status: 'Pending', owner: 'Human Resource', nextAction: 'Review' })

    expect(
      toWorkflowTimelineEntry({
        action: ' Approved ',
        by: ' Finance User ',
        at: ' 2026-07-17T10:00:00Z ',
        remarks: ' Verified ',
      }),
    ).toEqual({
      action: 'Approved',
      by: 'Finance User',
      at: '2026-07-17T10:00:00Z',
      remarks: 'Verified',
    })
  })

  it('normalizes the unsaved-changes guard without sharing caller arrays', () => {
    const dirtySources = ['form', 7]
    const result = createUnsavedChangesGuardConfig({
      enabled: true,
      message: ' Unsaved workflow changes ',
      dirtySources,
    })

    dirtySources.push('late-change')

    expect(result).toEqual({
      enabled: true,
      message: 'Unsaved workflow changes',
      dirtySources: ['form', '7'],
    })
  })
})
