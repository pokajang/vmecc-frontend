import { describe, expect, it } from 'vitest'
import {
  buildClaimHistoryEntries,
  buildWorkflowHistoryEntries,
  normalizeHistoryEntries,
} from '../auditHistory'

describe('auditHistory', () => {
  it('normalizes common history fields into the canonical shape', () => {
    const [entry] = normalizeHistoryEntries([
      {
        id: 'row-1',
        at: '2026-04-20T10:00:00.000Z',
        by: 'Admin User',
        label: 'Reviewed',
        employee: 'Alicia Tan',
        remarks: 'Looks correct',
      },
    ])

    expect(entry).toEqual({
      id: 'row-1',
      occurredAt: '2026-04-20T10:00:00.000Z',
      actorName: 'Admin User',
      targetLabel: 'Alicia Tan',
      action: 'Reviewed',
      details: {},
      summary: '',
      remarks: 'Looks correct',
    })
  })

  it('builds claim history without duplicating the submitted approval entry', () => {
    const rows = buildClaimHistoryEntries({
      id: 'CLM-001',
      submittedAt: '2026-04-20T08:00:00.000Z',
      ownerLabel: 'Alicia Tan',
      approvalHistory: [
        {
          action: 'Submitted',
          at: '2026-04-20T08:00:00.000Z',
          by: 'Alicia Tan',
        },
        {
          action: 'Approved',
          at: '2026-04-21T08:00:00.000Z',
          by: 'Manager',
        },
      ],
    })

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      action: 'Approved',
      actorName: 'Manager',
      targetLabel: 'CLM-001',
    })
    expect(rows[1]).toMatchObject({
      action: 'Submitted',
      actorName: 'Alicia Tan',
      targetLabel: 'CLM-001',
    })
  })

  it('builds workflow history entries with canonical target, actor, time, and remarks', () => {
    const rows = buildWorkflowHistoryEntries(
      {
        id: 'LV-AL-2026-001',
        appliedAt: '2026-04-18T13:28:44+00:00',
        submittedBy: 'Jang',
      },
      [
        {
          action: 'Submitted',
          at: '2026-04-18T13:28:44+00:00',
          by: 'Jang',
        },
      ],
      {
        targetLabel: 'LV-AL-2026-001',
        submittedRemarks: 'Leave request submitted.',
      },
    )

    expect(rows).toEqual([
      expect.objectContaining({
        action: 'Submitted',
        actorName: 'Jang',
        occurredAt: '2026-04-18T13:28:44+00:00',
        targetLabel: 'LV-AL-2026-001',
        remarks: 'Leave request submitted.',
      }),
    ])
  })
})
