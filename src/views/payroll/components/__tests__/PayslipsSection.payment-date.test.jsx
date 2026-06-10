// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PayslipsSection from '../PayslipsSection'

vi.mock('src/components/ApprovalGates', () => ({
  default: () => <span>Approved</span>,
}))

vi.mock('src/components/RowActions', () => ({
  default: () => <button type="button">Action</button>,
}))

vi.mock('src/components/TableLoader', () => ({
  default: () => <div>Loading...</div>,
}))

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

    expect(screen.getByText('Payment date: Pending payment')).toBeTruthy()
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

    expect(screen.getByText('Payment date: 2026-04-22')).toBeTruthy()
  })
})
