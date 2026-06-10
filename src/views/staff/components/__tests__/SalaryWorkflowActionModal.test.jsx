// @vitest-environment jsdom
import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SalaryWorkflowActionModal from '../SalaryWorkflowActionModal'

const baseProps = {
  visible: true,
  actionLabel: 'Review',
  actionType: 'approve',
  actionDisabled: false,
  remarks: '',
  onRemarksChange: () => {},
  showDeclaration: true,
  declarationRequired: true,
  declarationChecked: true,
  onDeclarationChange: () => {},
  declarationLabel: 'I confirm this claim',
  declarationError: '',
  rejectError: '',
  statusColorMap: { Pending: 'warning' },
  formatDate: () => '22 Apr 2026',
  formatCurrency: (value) => `RM ${Number(value || 0).toFixed(2)}`,
  toTypeLabel: (value) => value,
  onClose: () => {},
  onSubmit: () => {},
}

describe('SalaryWorkflowActionModal', () => {
  it('uses salary projected net payout as workflow amount and renders salary breakdown', () => {
    render(
      <SalaryWorkflowActionModal
        {...baseProps}
        record={{
          id: 'CLM-2026-016',
          ownerLabel: 'Jang',
          type: 'salary',
          period: 'April 2026',
          category: 'Salary',
          status: 'Pending',
          amount: 0,
          submittedAt: '2026-04-22T00:00:00.000Z',
          payrollSnapshot: { net: 1744 },
          adjustmentsTotal: 222,
          approvedOvertimePayout: 0,
          projectedNetPayout: 1966,
        }}
      />,
    )

    expect(screen.getAllByText('RM 1966.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Salary Breakdown')).toBeTruthy()
    expect(screen.getByText('Baseline Net')).toBeTruthy()
    expect(screen.getByText('Adjustments')).toBeTruthy()
    expect(screen.getByText('Approved OT Payout')).toBeTruthy()
    expect(screen.getByText('Final Payable')).toBeTruthy()
  })

  it('uses expense item total as workflow amount and preserves claimed amount row', () => {
    render(
      <SalaryWorkflowActionModal
        {...baseProps}
        record={{
          id: 'CLM-2026-020',
          ownerLabel: 'Jang',
          type: 'expense',
          period: 'April 2026',
          category: 'Travel',
          status: 'Pending',
          amount: 120,
          submittedAt: '2026-04-22T00:00:00.000Z',
          items: [{ amount: 60 }, { amount: 40 }],
        }}
      />,
    )

    expect(screen.getAllByText('RM 100.00').length).toBeGreaterThan(0)
    expect(screen.getByText('Claim Breakdown')).toBeTruthy()
    expect(screen.getByText('Expense Items Total')).toBeTruthy()
    expect(screen.getByText('Claimed Amount')).toBeTruthy()
    expect(screen.getByText('RM 120.00')).toBeTruthy()
  })
})
