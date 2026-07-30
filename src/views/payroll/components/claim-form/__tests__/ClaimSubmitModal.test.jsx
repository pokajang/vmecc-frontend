// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ClaimSubmitModal from '../ClaimSubmitModal'

afterEach(() => cleanup())

const props = {
  title: 'Confirm salary claim',
  summaryItems: [{ label: 'Employee', value: 'Private Employee' }],
  lineItems: [{ id: '1', title: 'Salary adjustment', amount: 'RM 900.00' }],
  totalLabel: 'Final payable',
  totalValue: 'RM 9,900.00',
  declarationId: 'confirm-private-claim',
  declarationLabel: 'I confirm this claim.',
  declarationChecked: false,
  onDeclarationChange: vi.fn(),
  onClose: vi.fn(),
  onConfirm: vi.fn(),
}

describe('ClaimSubmitModal privacy and semantics', () => {
  it('does not retain salary summary content in the document while closed', () => {
    render(<ClaimSubmitModal {...props} visible={false} />)

    expect(screen.queryByText('Private Employee')).toBeNull()
    expect(screen.queryByText('RM 9,900.00')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a titled confirmation dialog while open', () => {
    render(<ClaimSubmitModal {...props} visible />)

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('Confirm salary claim')).toBeTruthy()
    expect(screen.getByLabelText('I confirm this claim.')).toBeTruthy()
  })
})
