// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ClaimRecordsTab from '../ClaimRecordsTab'

const makeRow = (overrides = {}) => ({
  id: 'CLM-200',
  ownerId: '12',
  ownerLabel: 'Asha Lim',
  type: 'expense',
  period: 'April 2026',
  category: 'Travel',
  amount: 250,
  status: 'Pending',
  submittedAt: '2026-04-20T08:00:00Z',
  approvalHistory: [],
  ...overrides,
})

const renderClaimRecordsTab = ({ rows, selectedKeys = new Set(), handlers = {}, vm = {} } = {}) => {
  const claimRows = rows || [makeRow()]
  const groupedVisibleClaimRows = [
    {
      key: 'period:2026-04',
      periodLabel: 'April 2026',
      rows: claimRows,
      totalAmount: claimRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
      ownerGroups: [
        {
          key: 'period:2026-04::staff',
          ownerLabel: 'Claim Team',
          rows: claimRows,
          totalAmount: claimRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
        },
      ],
    },
  ]

  const defaultHandlers = {
    setSearch: vi.fn(),
    setPeriod: vi.fn(),
    setSort: vi.fn(),
    setTypeFilter: vi.fn(),
    setStatusFilter: vi.fn(),
    clearClaimFilters: vi.fn(),
    clearSelection: vi.fn(),
    openBulkActionModal: vi.fn(),
    canBulkActOnClaim: (row) => row.status === 'Pending',
    getClaimKey: (entry) => `${entry.ownerId}::${entry.id}`,
    isClaimKeySelected: (key) => selectedKeys.has(key),
    toggleClaimGroupSelection: vi.fn(),
    openClaimDetail: vi.fn(),
    buildClaimRowActionItems: () => [],
    setRowsToShow: vi.fn(),
    ...handlers,
  }

  return {
    handlers: defaultHandlers,
    ...render(
      <ClaimRecordsTab
        vm={{
          search: '',
          period: 'all',
          sort: 'submittedAt:desc',
          typeFilter: 'All',
          statusFilter: 'All',
          claimSortOptions: [{ value: 'submittedAt:desc', label: 'Latest submitted' }],
          claimTypeOptions: [{ value: 'All', label: 'All types' }],
          claimStatusOptions: [{ value: 'All', label: 'All statuses' }],
          filteredClaimRows: claimRows,
          groupedVisibleClaimRows,
          rowsToShow: 10,
          totalCount: claimRows.length,
          formatCurrency: (value) => `RM ${Number(value).toFixed(2)}`,
          formatDate: () => '20 Apr 2026',
          toTypeLabel: (type) => (type === 'expense' ? 'Expense' : type),
          isLoading: false,
          ...vm,
        }}
        handlers={defaultHandlers}
      />,
    ),
  }
}

describe('ClaimRecordsTab shared record primitives', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders mobile cards, desktop table, footer, and selected bulk actions', () => {
    renderClaimRecordsTab({
      selectedKeys: new Set(['12::CLM-200']),
    })

    expect(screen.getAllByText('CLM-200').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Expense').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Travel').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 250.00').length).toBeGreaterThan(0)
    expect(screen.getByText('1 claim selected')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reject selected' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve selected' })).toBeTruthy()
    expect(screen.getByText(/Showing 1 of 1/i)).toBeTruthy()
  })

  it('keeps row action clicks from opening the claim row', () => {
    const rowAction = vi.fn()
    const { handlers } = renderClaimRecordsTab({
      handlers: {
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
    expect(handlers.openClaimDetail).not.toHaveBeenCalled()
  })

  it('opens claim detail from mobile card keyboard activation', () => {
    const { handlers } = renderClaimRecordsTab()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open claim record CLM-200' }), {
      key: 'Enter',
    })

    expect(handlers.openClaimDetail).toHaveBeenCalledTimes(1)
  })
})
