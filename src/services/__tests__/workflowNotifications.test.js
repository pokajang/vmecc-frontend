import { describe, expect, it } from 'vitest'
import { buildWorkflowNotificationDetailPath } from '../workflowNotifications'

describe('buildWorkflowNotificationDetailPath', () => {
  it('routes overtime action-required notifications to staff overtime detail', () => {
    const path = buildWorkflowNotificationDetailPath({
      event: {
        module: 'overtime',
        actionRequiredForViewer: true,
        ownerUserId: 12,
        recordId: 34,
        metadata: { detailRouteKey: '12::34' },
      },
    })
    expect(path).toBe('/staff/overtime-management/record/12%3A%3A34')
  })

  it('routes payroll owner notifications to payroll claim detail', () => {
    const path = buildWorkflowNotificationDetailPath({
      event: {
        module: 'salary',
        actionRequiredForViewer: false,
        recordDisplayId: 'SC-2026-001',
      },
    })
    expect(path).toBe('/payroll/claims/SC-2026-001')
  })

  it('routes salary assignment notifications by record type', () => {
    const staffPath = buildWorkflowNotificationDetailPath({
      event: {
        module: 'salary',
        recordType: 'salary_assignment',
        actionRequiredForViewer: true,
        recordId: 45,
        detailRouteKey: '45',
      },
    })
    expect(staffPath).toBe('/staff/set-salary/assignment/45/view')

    const ownerPath = buildWorkflowNotificationDetailPath({
      event: {
        module: 'salary',
        recordType: 'salary_assignment',
        actionRequiredForViewer: false,
        recordId: 45,
        detailRouteKey: '45',
      },
    })
    expect(ownerPath).toBe('/staff/set-salary/set-salary?assignmentId=45')
  })
})
