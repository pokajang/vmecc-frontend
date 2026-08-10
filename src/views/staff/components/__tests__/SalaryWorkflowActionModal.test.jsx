// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import SalaryWorkflowActionModal from '../SalaryWorkflowActionModal'

afterEach(cleanup)

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
  it('does not retain sensitive claim content in the document while closed', () => {
    render(
      <SalaryWorkflowActionModal
        {...baseProps}
        visible={false}
        record={{
          id: 'PRIVATE-CLAIM-ID',
          ownerLabel: 'Private employee',
          type: 'salary',
          projectedNetPayout: 9876,
        }}
      />,
    )

    expect(screen.queryByText('PRIVATE-CLAIM-ID')).toBeNull()
    expect(screen.queryByText('Private employee')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

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

  it('keeps rejection and declaration errors local, described, and non-announcing', () => {
    render(
      <SalaryWorkflowActionModal
        {...baseProps}
        actionType="reject"
        declarationChecked={false}
        declarationError="Confirm responsibility before continuing."
        rejectError="Remarks are required when rejecting."
        record={{
          id: 'CLM-2026-021',
          ownerLabel: 'Jang',
          type: 'expense',
          period: 'April 2026',
          category: 'Travel',
          status: 'Pending',
          amount: 120,
          submittedAt: '2026-04-22T00:00:00.000Z',
          items: [],
        }}
      />,
    )

    const remarks = screen.getByLabelText('Remarks (required)')
    const remarksError = screen.getByText('Remarks are required when rejecting.')
    const declarationError = screen.getByText('Confirm responsibility before continuing.')

    expect(remarks.getAttribute('aria-describedby')).toBe('salary-workflow-remarks-error')
    expect(remarks.getAttribute('aria-invalid')).toBe('true')
    expect(remarksError.id).toBe('salary-workflow-remarks-error')
    expect(remarksError.className).toContain('invalid-feedback')
    expect(remarksError.getAttribute('role')).toBeNull()
    expect(declarationError.className).toContain('invalid-feedback')
    expect(declarationError.getAttribute('role')).toBeNull()
  })
})
