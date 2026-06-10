import { describe, expect, it } from 'vitest'
import {
  buildWorkflowNotificationDeepLink,
  toWorkflowNotificationPayload,
} from '../workflowNotificationMapper'

describe('workflowNotificationMapper', () => {
  it('builds staff overtime deep link for action-required events', () => {
    const path = buildWorkflowNotificationDeepLink({
      module: 'overtime',
      actionRequiredForViewer: true,
      detailRouteKey: '55::ot-100',
    })
    expect(path).toBe('/staff/overtime-management/record/55%3A%3Aot-100')
  })

  it('normalizes notification payload fields', () => {
    const payload = toWorkflowNotificationPayload({
      module: 'salary',
      recordDisplayId: 'SC-2026-009',
      read: false,
    })
    expect(payload.unread).toBe(true)
    expect(payload.deepLink).toBe('/payroll/claims/SC-2026-009')
  })

  it('treats backend read aliases as read notifications', () => {
    const fromReadAt = toWorkflowNotificationPayload({
      module: 'overtime',
      recordDisplayId: 'OT-2026-001',
      read_at: '2026-04-27T18:21:00Z',
    })
    expect(fromReadAt.read).toBe(true)
    expect(fromReadAt.unread).toBe(false)

    const fromIsRead = toWorkflowNotificationPayload({
      module: 'overtime',
      recordDisplayId: 'OT-2026-002',
      is_read: true,
    })
    expect(fromIsRead.read).toBe(true)
    expect(fromIsRead.unread).toBe(false)

    const fromUnreadFlag = toWorkflowNotificationPayload({
      module: 'overtime',
      recordDisplayId: 'OT-2026-003',
      unread: false,
    })
    expect(fromUnreadFlag.read).toBe(true)
    expect(fromUnreadFlag.unread).toBe(false)
  })

  it('builds salary claim staff deep link using composite key for action-required events', () => {
    const staffPath = buildWorkflowNotificationDeepLink({
      module: 'salary',
      ownerUserId: 'user-42',
      recordId: '101',
      actionRequiredForViewer: true,
    })
    expect(staffPath).toBe('/staff/salary-claims/claim/user-42%3A%3A101')
  })

  it('routes non-action-required salary claim to owner payroll view', () => {
    const ownerPath = buildWorkflowNotificationDeepLink({
      module: 'salary',
      recordDisplayId: 'CLM-2026-001',
      recordId: '101',
      actionRequiredForViewer: false,
    })
    expect(ownerPath).toBe('/payroll/claims/CLM-2026-001')
  })

  it('builds leave staff deep link from detail route key when action is required', () => {
    const path = buildWorkflowNotificationDeepLink({
      module: 'leave',
      recordType: 'leave',
      detailRouteKey: '31::55',
      actionRequiredForViewer: true,
    })
    expect(path).toBe('/staff/leave-management/record/31%3A%3A55')
  })

  it('builds salary assignment deep link using record type precedence', () => {
    const staffPath = buildWorkflowNotificationDeepLink({
      module: 'salary',
      recordType: 'salary_assignment',
      detailRouteKey: '77',
      recordId: '77',
      actionRequiredForViewer: true,
    })
    expect(staffPath).toBe('/staff/set-salary/assignment/77/view')

    const ownerPath = buildWorkflowNotificationDeepLink({
      module: 'salary',
      recordType: 'salary_assignment',
      detailRouteKey: '77',
      recordId: '77',
      actionRequiredForViewer: false,
    })
    expect(ownerPath).toBe('/staff/set-salary/set-salary?assignmentId=77')
  })
})
