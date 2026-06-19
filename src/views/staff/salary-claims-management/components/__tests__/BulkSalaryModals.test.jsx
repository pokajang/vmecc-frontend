// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import BulkClaimActionModal from '../BulkClaimActionModal'
import SalaryClaimPaymentModal from '../SalaryClaimPaymentModal'

const summary = {
  count: 2,
  sampleItems: [
    {
      key: '1::CLM-1',
      id: 'CLM-1',
      owner: 'Asha',
      period: 'April 2026',
      amount: 'RM 1000.00',
    },
    {
      key: '2::CLM-2',
      id: 'CLM-2',
      owner: 'Bo',
      period: 'April 2026',
      amount: 'RM 1500.00',
    },
  ],
  remainingCount: 1,
  totalLabel: 'RM 2500.00',
}

describe('bulk salary modals', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders workflow modal summary with eligible sampled claims', () => {
    render(
      <BulkClaimActionModal
        vm={{
          visible: true,
          action: 'approve',
          selectedCount: 5,
          summary,
          remarks: '',
          declarationChecked: false,
          declarationLabel: 'I confirm.',
          declarationError: '',
          rejectError: '',
        }}
        handlers={{
          onClose: vi.fn(),
          onSubmit: vi.fn(),
          onRemarksChange: vi.fn(),
          onDeclarationChange: vi.fn(),
          onClearRejectError: vi.fn(),
          onClearDeclarationError: vi.fn(),
        }}
      />,
    )

    expect(screen.getByText(/2 eligible claims selected/i)).toBeTruthy()
    expect(screen.getByText(/CLM-1/)).toBeTruthy()
    expect(screen.getByText(/\+1 more selected/i)).toBeTruthy()
    expect(screen.queryByText(/5 claims selected/i)).toBeNull()
  })

  it('renders payment modal summary with eligible count and total payable', () => {
    render(
      <SalaryClaimPaymentModal
        visible
        mode="mark"
        scope="bulk"
        selectedCount={5}
        summary={summary}
        values={{ paymentDate: '2026-04-30' }}
        onChange={vi.fn()}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText(/2 eligible claims selected/i)).toBeTruthy()
    expect(screen.getByText(/Total payable: RM 2500.00/i)).toBeTruthy()
    expect(screen.queryByText(/5 claims selected/i)).toBeNull()
  })
})
