// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ClaimListTable from '../ClaimListTable'

afterEach(() => {
  cleanup()
})

describe('ClaimListTable', () => {
  it('renders payroll month groups with the shared grouped-table label and total badge', () => {
    render(
      <ClaimListTable
        claims={[
          {
            id: 'CLM-001',
            isDraft: true,
            period: 'April 2026',
            periodValue: '2026-04',
            type: 'expense',
            category: 'Expense',
            submittedAt: '2026-04-11',
            amount: 100,
          },
          {
            id: 'CLM-002',
            isDraft: true,
            period: 'April 2026',
            periodValue: '2026-04',
            type: 'other',
            category: 'Exceptional',
            submittedAt: '2026-04-12',
            amount: 50,
          },
        ]}
        formatCurrency={(value) => `RM ${Number(value || 0).toFixed(2)}`}
        formatDate={(value) => value}
      />,
    )

    expect(screen.getByTestId('month-group-label-month').textContent).toBe('APRIL 2026')
    expect(screen.getByText('2 records')).toBeTruthy()
    expect(screen.getByText('RM 150.00')).toBeTruthy()
  })

  it('disables delete for approved claims and exposes the cancel-first reason', () => {
    render(
      <ClaimListTable
        claims={[
          {
            id: 'CLM-016',
            period: 'April 2026',
            periodValue: '2026-04',
            type: 'salary',
            category: 'Salary',
            submittedAt: '2026-04-22',
            projectedNetPayout: 1966,
            status: 'Approved',
            actionPermissions: {
              delete: { enabled: true, blockedReason: '' },
            },
          },
        ]}
        formatCurrency={(value) => `RM ${Number(value || 0).toFixed(2)}`}
        formatDate={(value) => value}
      />,
    )

    fireEvent.click(screen.getByLabelText('Row actions'))

    const deleteAction = screen.getByText('Delete')
    expect(deleteAction.getAttribute('title')).toBe('Please cancel this claim before deleting it.')
    expect(deleteAction.getAttribute('aria-label')).toBe(
      'Delete. Please cancel this claim before deleting it.',
    )
  })
})
