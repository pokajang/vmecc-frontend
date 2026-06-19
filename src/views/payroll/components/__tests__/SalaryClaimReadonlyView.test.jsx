// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import SalaryClaimReadonlyView from '../SalaryClaimReadonlyView'

vi.mock('src/views/staff/salary-claims-management/components/AttachmentPreviewModal', () => ({
  default: ({ visible, attachment, onClose }) =>
    visible ? (
      <div role="dialog">
        <span>Preview attachment: {attachment?.attachmentName}</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}))

afterEach(() => cleanup())

const formatCurrency = (value) => `RM ${Number(value || 0).toFixed(2)}`
const formatDate = (value) => value || '-'

const claimFixture = {
  id: 77,
  status: 'Approved',
  paymentDate: '',
  payrollSnapshot: {
    basic: 2000,
    gross: 2300,
    net: 1800,
    totalDeductions: 500,
    allowanceTotal: 300,
    allowanceItems: [{ key: 'transport', label: 'Transport', amount: 300 }],
    deductionItems: [{ key: 'epf', label: 'EPF', amount: 240 }],
    employeeContributions: { epf: 240, socso: 20 },
    employerContributions: { epf: 260, socso: 25 },
  },
  items: [
    {
      id: 1,
      claimType: 'Addition',
      amount: 100,
      lineNotes: 'Meal claim',
      claimDate: '2026-05-10',
      attachmentId: 10,
      attachmentName: 'receipt.pdf',
      attachmentDataUrl: 'data:application/pdf;base64,AAA',
      attachmentMimeType: 'application/pdf',
    },
    {
      id: 2,
      claimType: 'Deduction',
      amount: 40,
      lineNotes: 'Late deduction',
      claimDate: '2026-05-11',
    },
  ],
  adjustmentsTotal: 60,
  approvedOvertimePayout: 80,
  overtimeRateSnapshot: {
    hourlyBaseMode: 'statutory_divisor',
    monthlyDivisorUsed: 26,
    globalNormalHoursPerDayUsed: 8,
    weekdayMultiplier: 1.5,
  },
  overtimeRows: [
    {
      overtimeId: 'OT-1',
      overtimeType: 'weekday',
      claimDate: '2026-05-12',
      statusLabel: 'Approved',
      durationMinutes: 120,
      hourlyBaseRateUsed: 10,
      calculatedPayout: 30,
      payablePayout: 30,
      isApproved: true,
    },
  ],
}

describe('SalaryClaimReadonlyView', () => {
  it('renders summary-first payroll amounts from the shared breakdown', () => {
    render(
      <SalaryClaimReadonlyView
        claim={claimFixture}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />,
    )

    expect(screen.getAllByText('Final payable').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 1940.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 1800.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 60.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 80.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 2400.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM -540.00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 1860.00').length).toBeGreaterThan(0)
  })

  it('renders phone stacked detail sections and desktop table headers', () => {
    render(
      <SalaryClaimReadonlyView
        claim={claimFixture}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />,
    )

    expect(screen.getByText('Net Pay Summary')).toBeTruthy()
    expect(screen.getByText('Salary Baseline')).toBeTruthy()
    expect(screen.getByText('Deductions & Contributions')).toBeTruthy()
    expect(screen.getAllByText('Overtime Records').length).toBeGreaterThan(0)
    expect(screen.getByText('Adjustment Items')).toBeTruthy()
    expect(screen.getByText('Addition Adjustments')).toBeTruthy()
    expect(screen.getByText('Deduction Adjustments')).toBeTruthy()
    expect(screen.getByText('Item')).toBeTruthy()
    expect(screen.getAllByText('Amount').length).toBeGreaterThan(0)
    expect(screen.getByText('OT ID')).toBeTruthy()
    expect(screen.getByText('Payout Used')).toBeTruthy()
  })

  it('opens attachment preview from adjustment badges', () => {
    render(
      <SalaryClaimReadonlyView
        claim={claimFixture}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />,
    )

    fireEvent.click(screen.getAllByText('receipt.pdf')[0])

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Preview attachment: receipt.pdf')).toBeTruthy()
  })
})
