// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import SalaryRecordsTab from '../SalaryRecordsTab'

describe('SalaryRecordsTab contract-incomplete UI', () => {
  it('shows warning and non-misleading placeholders for incomplete salary fields', () => {
    const row = {
      id: 'CLM-100',
      ownerId: '7',
      ownerLabel: 'User 7',
      period: 'April 2026',
      status: 'Pending',
      submittedAt: '2026-04-20T08:00:00Z',
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
      approvalHistory: [],
    }

    render(
      <SalaryRecordsTab
        vm={{
          salarySearch: '',
          salaryPeriod: 'all',
          salarySort: 'submittedAt:desc',
          salaryStatusFilter: 'All',
          salarySortOptions: [{ value: 'submittedAt:desc', label: 'Latest submitted' }],
          salaryStatusOptions: [{ value: 'All', label: 'All status' }],
          filteredSalaryRows: [row],
          groupedVisibleSalaryRows: [
            {
              key: 'period:2026-04',
              periodLabel: 'April 2026',
              rows: [row],
              totalAmount: 0,
              ownerGroups: [
                {
                  key: 'period:2026-04::7',
                  ownerLabel: 'User 7',
                  rows: [row],
                  totalAmount: 0,
                },
              ],
            },
          ],
          salaryRowsToShow: 10,
          totalCount: 1,
          formatCurrency: (value) => `RM ${Number(value).toFixed(2)}`,
          formatDate: () => '20 Apr 2026',
          parseAmount: (value) => Number(value || 0),
          getSalaryAdjustmentsTotal: () => null,
          getSalaryProjectedNet: () => null,
          isLoading: false,
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
          canBulkActOnSalaryClaim: () => false,
          getClaimKey: (entry) => `${entry.ownerId}::${entry.id}`,
          isClaimKeySelected: () => false,
          toggleSalaryGroupSelection: vi.fn(),
          openClaimDetail: vi.fn(),
          buildClaimRowActionItems: () => [],
          setSalaryRowsToShow: vi.fn(),
        }}
      />,
    )

    expect(screen.getByText(/contain incomplete backend contract fields/i)).toBeTruthy()
    expect(screen.getByText('Partial total')).toBeTruthy()
    expect(screen.getByText('Partial subtotal')).toBeTruthy()
    expect(screen.getByText('Incomplete backend salary data')).toBeTruthy()

    const dataRow = screen.getByText('CLM-100').closest('tr')
    const cells = within(dataRow).getAllByRole('cell')
    expect(cells[3].textContent.trim()).toBe('-')
    expect(cells[4].textContent.trim()).toBe('-')
    expect(cells[5].textContent.trim()).toBe('-')
    expect(cells[6].textContent.trim()).toBe('-')
  })
})
