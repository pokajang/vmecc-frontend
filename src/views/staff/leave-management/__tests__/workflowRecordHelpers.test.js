import { describe, expect, it } from 'vitest'
import {
  buildReviewWorkflowActionItems,
  buildWorkflowMobileSections,
  buildWorkflowMonthUserGroups,
  formatWorkflowTeamSuffix,
  formatWorkflowTotal,
  getWorkflowGroupSelectionState,
  toWorkflowTestIdToken,
} from '../workflowRecordHelpers'

describe('workflowRecordHelpers', () => {
  it('groups workflow rows by month and user with stable keys and totals', () => {
    const rows = [
      {
        id: 'LV-1',
        ownerUserId: '10',
        employee: 'Asha',
        team: 'Alpha',
        appliedAt: '2026-04-10T00:00:00.000Z',
        days: 1,
      },
      {
        id: 'LV-2',
        ownerUserId: '10',
        employee: 'Asha',
        team: 'Alpha',
        appliedAt: '2026-04-15T00:00:00.000Z',
        days: 1.5,
      },
      {
        id: 'LV-3',
        employee: '',
        appliedAt: null,
        days: 2,
      },
    ]

    const groups = buildWorkflowMonthUserGroups({
      entries: rows,
      unknownGroupLabel: 'Unknown month',
      includeUserGroups: true,
      createMonthExtras: () => ({ totalDays: 0 }),
      createUserExtras: () => ({ totalDays: 0 }),
      onAddToMonth: (group, row) => {
        group.totalDays += Number(row.days || 0)
      },
      onAddToUser: (group, row) => {
        group.totalDays += Number(row.days || 0)
      },
    })

    expect(groups).toHaveLength(2)
    expect(groups[0]).toMatchObject({ key: 'month:2026-04', totalDays: 2.5 })
    expect(groups[0].userGroups[0]).toMatchObject({
      key: 'month:2026-04:user:10',
      ownerLabel: 'Asha',
      teamLabel: 'Alpha',
      totalDays: 2.5,
    })
    expect(groups[1]).toMatchObject({ key: 'month:unknown', label: 'Unknown month' })
  })

  it('derives eligible selected state without counting ineligible rows', () => {
    const rows = [
      { id: '1', status: 'Pending' },
      { id: '2', status: 'Approved' },
      { id: '3', status: 'Pending' },
    ]

    expect(
      getWorkflowGroupSelectionState({
        rows,
        canActOnRow: (row) => row.status === 'Pending',
        getRowKey: (row) => row.id,
        isSelectedKey: (key) => key === '1' || key === '3',
      }),
    ).toEqual({
      eligibleKeys: ['1', '3'],
      selectedCount: 2,
      allSelected: true,
    })
  })

  it('builds mobile sections from grouped rows and preserves item callbacks', () => {
    const open = () => {}
    const sections = buildWorkflowMobileSections({
      groups: [
        {
          key: 'month:2026-04',
          label: 'April 2026',
          entries: [{ row: { id: 'A' } }],
        },
      ],
      buildGroupLabel: ({ group }) => group.label,
      buildGroupSummary: () => '1 record',
      buildItem: ({ row }) => ({ key: row.id, title: row.id, onOpen: open }),
    })

    expect(sections).toEqual([
      {
        key: 'mobile-month:2026-04',
        label: 'April 2026',
        summary: '1 record',
        items: [{ key: 'A', title: 'A', onOpen: open }],
      },
    ])
  })

  it('formats shared workflow labels consistently', () => {
    expect(toWorkflowTestIdToken('Month: 2026/04')).toBe('month-2026-04')
    expect(formatWorkflowTeamSuffix('Alpha')).toBe('- Alpha')
    expect(formatWorkflowTeamSuffix('Unassigned')).toBe('')
    expect(formatWorkflowTotal(2.5)).toBe('2.5')
  })

  it('builds review workflow action items with disabled reasons', () => {
    const row = { id: 'A' }
    const approve = () => {}
    const items = buildReviewWorkflowActionItems({
      row,
      actionKeyPrefix: 'leave',
      actionConfig: {
        approveLabel: 'Review',
        approveDisabled: false,
        rejectDisabled: true,
        requiredRole: 'Contract Manager',
      },
      onApprove: approve,
    })

    expect(items[0]).toMatchObject({
      key: 'leave-approve',
      label: 'Review',
      disabled: false,
      disabledReason: 'This stage requires Contract Manager role.',
    })
    expect(items[1]).toMatchObject({
      key: 'leave-reject',
      label: 'Reject',
      className: 'text-danger',
      disabled: true,
    })
  })
})
