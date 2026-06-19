// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import SalaryRecordsTab from '../SalaryRecordsTab'

const makeRow = (overrides = {}) => ({
  id: 'CLM-100',
  ownerId: '7',
  ownerLabel: 'User 7',
  period: 'April 2026',
  status: 'Pending',
  submittedAt: '2026-04-20T08:00:00Z',
  payrollSnapshot: { net: 1000 },
  adjustmentsTotal: 0,
  approvedOvertimePayout: 0,
  projectedNetPayout: 1000,
  approvalHistory: [],
  ...overrides,
})

const renderSalaryRecordsTab = ({
  rows,
  selectedKeys = new Set(),
  handlers = {},
  vm = {},
} = {}) => {
  const salaryRows = rows || [makeRow()]
  const groupedVisibleSalaryRows = [
    {
      key: 'period:2026-04',
      periodLabel: 'April 2026',
      rows: salaryRows,
      totalAmount: salaryRows.reduce((sum, row) => sum + Number(row.projectedNetPayout || 0), 0),
      ownerGroups: [
        {
          key: 'period:2026-04::staff',
          ownerLabel: 'Salary Team',
          rows: salaryRows,
          totalAmount: salaryRows.reduce(
            (sum, row) => sum + Number(row.projectedNetPayout || 0),
            0,
          ),
        },
      ],
    },
  ]

  const canBulkActOnClaim = (row) => row.status === 'Pending'
  const canMarkClaimPaid = (row) => row.status === 'Approved'
  const canUnmarkClaimPaid = (row) => row.status === 'Paid'
  const canBulkActOnSalaryClaim = (row) =>
    canBulkActOnClaim(row) || canMarkClaimPaid(row) || canUnmarkClaimPaid(row)

  return render(
    <SalaryRecordsTab
      vm={{
        salarySearch: '',
        salaryPeriod: 'all',
        salarySort: 'submittedAt:desc',
        salaryStatusFilter: 'All',
        salarySortOptions: [{ value: 'submittedAt:desc', label: 'Latest submitted' }],
        salaryStatusOptions: [{ value: 'All', label: 'All status' }],
        filteredSalaryRows: salaryRows,
        groupedVisibleSalaryRows,
        salaryRowsToShow: 10,
        totalCount: salaryRows.length,
        formatCurrency: (value) => `RM ${Number(value).toFixed(2)}`,
        formatDate: () => '20 Apr 2026',
        parseAmount: (value) => Number(value || 0),
        getSalaryAdjustmentsTotal: (row) => row.adjustmentsTotal,
        getSalaryProjectedNet: (row) => row.projectedNetPayout,
        isLoading: false,
        ...vm,
      }}
      handlers={{
        setSalarySearch: vi.fn(),
        setSalaryPeriod: vi.fn(),
        setSalarySort: vi.fn(),
        setSalaryStatusFilter: vi.fn(),
        clearSalaryFilters: vi.fn(),
        clearSelection: vi.fn(),
        openBulkActionModal: vi.fn(),
        openBulkPaymentModal: vi.fn(),
        canBulkActOnSalaryClaim,
        canBulkActOnClaim,
        canMarkClaimPaid,
        canUnmarkClaimPaid,
        getClaimKey: (entry) => `${entry.ownerId}::${entry.id}`,
        isClaimKeySelected: (key) => selectedKeys.has(key),
        toggleSalaryGroupSelection: vi.fn(),
        openClaimDetail: vi.fn(),
        buildClaimRowActionItems: () => [],
        setSalaryRowsToShow: vi.fn(),
        ...handlers,
      }}
    />,
  )
}

describe('SalaryRecordsTab contract-incomplete UI', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows warning and non-misleading placeholders for incomplete salary fields', () => {
    const row = makeRow({
      payrollSnapshot: {},
      adjustmentsTotal: null,
      approvedOvertimePayout: null,
      projectedNetPayout: null,
      salaryContractIncomplete: true,
      salaryContractMissingFields: [
        'payrollSnapshot',
        'adjustmentsTotal',
        'approvedOvertimePayout',
        'projectedNetPayout',
      ],
    })

    renderSalaryRecordsTab({
      rows: [row],
      handlers: { canBulkActOnSalaryClaim: () => false },
    })

    expect(screen.getByText(/contain incomplete backend contract fields/i)).toBeTruthy()
    expect(screen.getByText('Partial total')).toBeTruthy()
    expect(screen.getByText('Partial subtotal')).toBeTruthy()
    expect(screen.getAllByText('Incomplete backend salary data').length).toBeGreaterThan(0)

    const dataRow = screen
      .getAllByText('CLM-100')
      .map((node) => node.closest('tr'))
      .find(Boolean)
    const cells = within(dataRow).getAllByRole('cell')
    expect(cells[3].textContent.trim()).toBe('-')
    expect(cells[4].textContent.trim()).toBe('-')
    expect(cells[5].textContent.trim()).toBe('-')
    expect(cells[6].textContent.trim()).toBe('-')
  })

  it('separates mixed salary approval and payment bulk actions by intent', () => {
    renderSalaryRecordsTab({
      rows: [
        makeRow({ id: 'CLM-PENDING', ownerId: '1', ownerLabel: 'Asha', status: 'Pending' }),
        makeRow({
          id: 'CLM-APPROVED',
          ownerId: '2',
          ownerLabel: 'Bo',
          status: 'Approved',
          projectedNetPayout: 1500,
        }),
      ],
      selectedKeys: new Set(['1::CLM-PENDING', '2::CLM-APPROVED']),
    })

    expect(screen.getByRole('button', { name: 'Approval' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Payment' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reject selected' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve selected' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mark selected paid' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Payment' }))

    expect(screen.queryByRole('button', { name: 'Reject selected' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Approve selected' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Mark selected paid' })).toBeTruthy()
    expect(screen.getByText(/Total payable: RM 1500.00/i)).toBeTruthy()
  })

  it('shows a payment action switch when selected salary rows can mark and unmark paid', () => {
    renderSalaryRecordsTab({
      rows: [
        makeRow({
          id: 'CLM-APPROVED',
          ownerId: '2',
          ownerLabel: 'Bo',
          status: 'Approved',
          projectedNetPayout: 1500,
        }),
        makeRow({
          id: 'CLM-PAID',
          ownerId: '3',
          ownerLabel: 'Chen',
          status: 'Paid',
          projectedNetPayout: 1700,
        }),
      ],
      selectedKeys: new Set(['2::CLM-APPROVED', '3::CLM-PAID']),
    })

    expect(screen.queryByRole('button', { name: 'Approval' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Unmark paid' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mark selected paid' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Unmark selected paid' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Unmark paid' }))

    expect(screen.queryByRole('button', { name: 'Mark selected paid' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Unmark selected paid' })).toBeTruthy()
  })

  it('keeps group selection wired to all salary-actionable rows', () => {
    const toggleSalaryGroupSelection = vi.fn()
    renderSalaryRecordsTab({
      rows: [
        makeRow({ id: 'CLM-PENDING', ownerId: '1', status: 'Pending' }),
        makeRow({ id: 'CLM-APPROVED', ownerId: '2', status: 'Approved' }),
      ],
      handlers: { toggleSalaryGroupSelection },
    })

    const groupSelectors = screen.getAllByLabelText(/Select actionable salary claims/i)
    fireEvent.click(groupSelectors[groupSelectors.length - 1])

    expect(toggleSalaryGroupSelection).toHaveBeenCalledTimes(1)
  })

  it('keeps row action clicks from opening the salary row', () => {
    const rowAction = vi.fn()
    const openClaimDetail = vi.fn()
    renderSalaryRecordsTab({
      handlers: {
        openClaimDetail,
        buildClaimRowActionItems: () => [
          {
            key: 'download',
            label: 'Download attachment',
            onClick: rowAction,
          },
        ],
      },
    })

    const rowActionButtons = screen.getAllByRole('button', { name: 'Row actions' })
    fireEvent.click(rowActionButtons[rowActionButtons.length - 1])
    const downloadActions = screen.getAllByText('Download attachment')
    fireEvent.click(downloadActions[downloadActions.length - 1])

    expect(rowAction).toHaveBeenCalledTimes(1)
    expect(openClaimDetail).not.toHaveBeenCalled()
  })
})
