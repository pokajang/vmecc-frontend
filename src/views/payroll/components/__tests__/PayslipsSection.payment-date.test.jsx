// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PayslipsSection from '../PayslipsSection'

vi.mock('src/components/ApprovalGates', () => ({
  default: () => <span>Approved</span>,
}))

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [] }) => (
    <div>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          disabled={item.disabled}
          onClick={(event) => {
            event.stopPropagation()
            item.onClick?.()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('src/components/TableLoader', () => ({
  default: () => <div>Loading...</div>,
}))

afterEach(() => cleanup())

describe('PayslipsSection payment date label', () => {
  it('shows Pending payment for approved rows without payment_date', () => {
    render(
      <MemoryRouter>
        <PayslipsSection
          rows={[
            {
              id: 'p1',
              payslipId: 1,
              month: 'April 2026',
              reference: 'CLM-1',
              status: 'Approved',
              paymentDate: '',
              issued: '22 Apr 2026',
              baselineNetSalary: 1000,
              adjustmentsTotal: 0,
              approvedOvertimePayout: 0,
              netPayable: 1000,
            },
          ]}
          formatCurrency={(value) => `RM ${value}`}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Payment date: Pending payment').length).toBeGreaterThan(0)
  })

  it('shows real payment_date for paid rows', () => {
    render(
      <MemoryRouter>
        <PayslipsSection
          rows={[
            {
              id: 'p2',
              payslipId: 2,
              month: 'April 2026',
              reference: 'CLM-2',
              status: 'Paid',
              paymentDate: '2026-04-22',
              issued: '22 Apr 2026',
              baselineNetSalary: 1000,
              adjustmentsTotal: 0,
              approvedOvertimePayout: 0,
              netPayable: 1000,
            },
          ]}
          formatCurrency={(value) => `RM ${value}`}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('Payment date: 2026-04-22').length).toBeGreaterThan(0)
  })

  it('renders phone payslip cards with key payroll fields', () => {
    render(
      <MemoryRouter>
        <PayslipsSection
          rows={[
            {
              id: 'p3',
              payslipId: 3,
              month: 'May 2026',
              reference: 'CLM-3',
              status: 'Approved',
              paymentDate: '',
              baselineNetSalary: 1200,
              adjustmentsTotal: 50,
              approvedOvertimePayout: 75,
              netPayable: 1325,
              baselineSource: 'salary_record',
            },
          ]}
          formatCurrency={(value) => `RM ${value}`}
        />
      </MemoryRouter>,
    )

    expect(screen.getAllByText('May 2026').length).toBeGreaterThan(0)
    expect(screen.getAllByText('CLM-3').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Baseline net').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 1200').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Adjustments').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 50').length).toBeGreaterThan(0)
    expect(screen.getAllByText('OT payout').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 75').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Net payable').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 1325').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Download payslip' }).length).toBeGreaterThan(0)
  })

  it('toggles phone payslip detail sections with keyboard activation', () => {
    render(
      <MemoryRouter>
        <PayslipsSection
          rows={[
            {
              id: 'p4',
              payslipId: 4,
              month: 'June 2026',
              reference: 'CLM-4',
              status: 'Approved',
              paymentDate: '',
              baselineNetSalary: 1200,
              adjustmentsTotal: 50,
              approvedOvertimePayout: 75,
              netPayable: 1325,
              baselineSource: 'salary_record',
            },
          ]}
          formatCurrency={(value) => `RM ${value}`}
        />
      </MemoryRouter>,
    )

    const cardOpenRegion = screen.getByRole('button', {
      name: 'Toggle payslip details for CLM-4',
    })
    fireEvent.keyDown(cardOpenRegion, { key: 'Enter' })

    expect(screen.getAllByText('Net Pay Summary').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Deductions & Contributions').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Salary Baseline').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Overtime Records').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Adjustment Items').length).toBeGreaterThan(0)
  })

  it('keeps mobile download actions from toggling the card and preserves notice behavior', () => {
    const handleDownload = vi.fn()
    render(
      <MemoryRouter>
        <PayslipsSection
          rows={[
            {
              id: 'p5',
              payslipId: 5,
              month: 'July 2026',
              reference: 'CLM-5',
              status: 'Approved',
              paymentDate: '',
              baselineNetSalary: 1200,
              adjustmentsTotal: 50,
              approvedOvertimePayout: 75,
              netPayable: 1325,
              baselineSource: 'salary_record',
              downloadable: false,
              downloadReason: 'Payroll profile is incomplete.',
            },
          ]}
          onDownloadPayslip={handleDownload}
          formatCurrency={(value) => `RM ${value}`}
        />
      </MemoryRouter>,
    )

    const cardOpenRegion = screen.getByRole('button', {
      name: 'Toggle payslip details for CLM-5',
    })
    const card = cardOpenRegion.closest('article')
    fireEvent.click(within(card).getByRole('button', { name: 'Download payslip' }))

    expect(handleDownload).not.toHaveBeenCalled()
    expect(within(card).queryByText('Net Pay Summary')).toBeNull()
    expect(screen.getByText('Payroll profile is incomplete.')).toBeTruthy()

    fireEvent.click(screen.getByText('Close', { selector: 'button' }))
    expect(screen.queryByText('Payroll profile is incomplete.')).toBeNull()
  })
})
