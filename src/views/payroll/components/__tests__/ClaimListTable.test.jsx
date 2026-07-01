// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ClaimListTable from '../ClaimListTable'

vi.mock('src/components/RowActions', () => ({
  default: ({ items = [] }) => (
    <div onClick={(event) => event.stopPropagation()}>
      {items.map((item) => (
        <button
          key={item.key || item.label}
          type="button"
          disabled={Boolean(item.disabled)}
          title={item.disabled ? item.disabledReason : undefined}
          aria-label={item.disabled ? `${item.label}. ${item.disabledReason}` : item.label}
          onClick={(event) => {
            event.stopPropagation()
            if (!item.disabled) item.onClick?.()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

afterEach(() => {
  cleanup()
})

const formatCurrency = (value) => `RM ${Number(value || 0).toFixed(2)}`
const formatDate = (value) => value

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
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />,
    )

    expect(screen.getByTestId('month-group-label-month').textContent).toBe('APRIL 2026')
    expect(screen.getAllByText('2 records').length).toBeGreaterThan(0)
    expect(screen.getAllByText('RM 150.00').length).toBeGreaterThan(0)
    expect(screen.getByText('2 records - RM 150.00')).toBeTruthy()
    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(document.querySelector('.list-group-item')).toBeTruthy()
  })

  it('renders payroll claim mobile cards with key details and keyboard open behavior', () => {
    const openClaim = vi.fn()
    const claim = {
      id: 'CLM-101',
      period: 'April 2026',
      periodValue: '2026-04',
      type: 'expense',
      category: 'Expense',
      categoryDetail: 'Mileage',
      submittedAt: '2026-04-18',
      amount: 240,
      status: 'Pending',
      approvalHistory: [],
      attachmentAvailable: true,
    }

    render(
      <ClaimListTable
        claims={[claim]}
        onOpenClaim={openClaim}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />,
    )

    const mobileCard = screen.getByRole('button', { name: 'Open claim CLM-101 summary' })
    expect(mobileCard.textContent).toContain('CLM-101')
    expect(mobileCard.textContent).toContain('Expense')
    expect(mobileCard.textContent).toContain('Mileage')
    expect(mobileCard.textContent).toContain('April 2026')
    expect(mobileCard.textContent).toContain('2026-04-18')
    expect(mobileCard.textContent).toContain('RM 240.00')
    expect(mobileCard.textContent).toContain('Pending Checked')

    fireEvent.keyDown(mobileCard, { key: 'Enter' })
    fireEvent.keyDown(mobileCard, { key: ' ' })
    expect(openClaim).toHaveBeenCalledTimes(2)
    expect(openClaim).toHaveBeenCalledWith(claim)
  })

  it('keeps payroll mobile row actions from triggering card navigation', () => {
    const openClaim = vi.fn()
    const editClaim = vi.fn()
    const claim = {
      id: 'CLM-DRAFT',
      isDraft: true,
      period: 'April 2026',
      periodValue: '2026-04',
      type: 'salary',
      category: 'Salary',
      submittedAt: '2026-04-20',
      projectedNetPayout: 1800,
      status: 'Draft',
    }

    render(
      <ClaimListTable
        claims={[claim]}
        onOpenClaim={openClaim}
        onEditClaim={editClaim}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />,
    )

    const mobileCard = screen.getByRole('button', { name: 'Open claim CLM-DRAFT summary' })
    const mobileArticle = mobileCard.closest('article')
    fireEvent.click(within(mobileArticle).getByRole('button', { name: 'Edit' }))

    expect(editClaim).toHaveBeenCalledWith(claim)
    expect(openClaim).not.toHaveBeenCalled()
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
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />,
    )

    const deleteAction = screen.getAllByText('Delete')[0]
    expect(deleteAction.getAttribute('title')).toBe('Please cancel this claim before deleting it.')
    expect(deleteAction.getAttribute('aria-label')).toBe(
      'Delete. Please cancel this claim before deleting it.',
    )
  })
})
