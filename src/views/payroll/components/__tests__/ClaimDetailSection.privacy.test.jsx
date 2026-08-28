// @vitest-environment jsdom
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ClaimDetailSection from '../ClaimDetailSection'

vi.mock('../SalaryClaimReadonlyView', () => ({
  default: function MockSalaryClaimReadonlyView({ claim }) {
    const [revealed, setRevealed] = useState(false)

    return (
      <div>
        <span>Salary view for {claim.id}</span>
        <button type="button" onClick={() => setRevealed(true)}>
          Reveal local preview
        </button>
        {revealed ? <span>Local salary preview for {claim.id}</span> : null}
      </div>
    )
  },
}))

afterEach(() => cleanup())

const claim = (id, userId) => ({
  id,
  userId,
  type: 'salary',
  status: 'Pending',
  period: 'July 2026',
  approvalHistory: [],
})

const props = {
  selectedClaimTypeMeta: {
    label: 'Salary',
    icon: () => <span aria-hidden="true">S</span>,
  },
  submittedClaimItems: [],
  submittedTotalLabel: 'Total',
  submittedClaimTotalValue: 0,
  formatCurrency: (value) => `RM ${value}`,
  formatDate: (value) => value || '-',
  canEditSubmittedClaim: false,
  lastUpdatedByLabel: '-',
  approvedDateLabel: '-',
  onDownloadClaim: vi.fn(),
  onEditClaim: vi.fn(),
  onCancelClaim: vi.fn(),
  onDeleteClaim: vi.fn(),
}

describe('ClaimDetailSection privacy boundaries', () => {
  it('keeps Back available and presents a missing record as a terminal alert', () => {
    render(
      <MemoryRouter>
        <ClaimDetailSection {...props} selectedClaim={null} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('Claim record not found.')
  })

  it('renders the shared semantic detail header and action region', () => {
    render(
      <MemoryRouter>
        <ClaimDetailSection {...props} selectedClaim={claim('SAL-1', 'USER-1')} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Salary Claim' })).toBeTruthy()
    expect(screen.getByText('Claim ID: SAL-1')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Claim actions' })).toBeTruthy()
  })

  it('discards claim-local preview state when the selected user identity changes', () => {
    const { rerender } = render(
      <MemoryRouter>
        <ClaimDetailSection {...props} selectedClaim={claim('SAL-1', 'USER-1')} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal local preview' }))
    expect(screen.getByText('Local salary preview for SAL-1')).toBeTruthy()

    rerender(
      <MemoryRouter>
        <ClaimDetailSection {...props} selectedClaim={claim('SAL-2', 'USER-2')} />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Local salary preview for SAL-1')).toBeNull()
    expect(screen.queryByText('Local salary preview for SAL-2')).toBeNull()
    expect(screen.getByText('Salary view for SAL-2')).toBeTruthy()
  })
})
