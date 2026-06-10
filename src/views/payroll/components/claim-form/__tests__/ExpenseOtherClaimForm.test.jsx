// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ExpenseOtherClaimForm from '../ExpenseOtherClaimForm'
import * as payrollClaimsApi from 'src/services/payrollClaimsApi'

vi.mock('src/contexts/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({
    registerGuard: vi.fn(),
    unregisterGuard: vi.fn(),
    requestNavigation: (action) => {
      if (typeof action === 'function') action()
    },
  }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const baseProps = {
  user: { id: 1, name: 'Test User' },
  claimType: 'expense',
  onBack: vi.fn(),
  onChangeType: vi.fn(),
  onEditType: vi.fn(),
  periodValue: '2026-04',
  periodConfirmed: true,
  onPeriodChange: vi.fn(),
  onPeriodConfirmedChange: vi.fn(),
  draftPayload: {
    id: 'draft-1',
    period: '2026-04',
    periodConfirmed: true,
    savedItems: [
      {
        category: 'Fuel',
        expenseDate: '2026-04-11',
        amount: '10.00',
        attachmentName: 'receipt.pdf',
        lineNotes: 'KEEP_THIS_EXPENSE_NOTE',
      },
    ],
    draftItem: {
      category: 'Fuel',
      expenseDate: '2026-04-12',
      amount: '5.00',
      lineNotes: 'draft note',
      attachmentName: '',
    },
  },
}

describe('ExpenseOtherClaimForm', () => {
  it('shows thumb action group in back/clear/submit order without manual draft save', async () => {
    render(
      <MemoryRouter>
        <ExpenseOtherClaimForm {...baseProps} />
      </MemoryRouter>,
    )

    const actionBar = screen.getByRole('group', { name: 'Form actions' })
    const actionButtons = within(actionBar).getAllByRole('button')
    expect(actionButtons.map((button) => button.textContent.trim())).toEqual([
      'Back to claims',
      'Clear form',
      'Submit request',
    ])
    expect(within(actionBar).queryByRole('button', { name: 'Save draft' })).toBeNull()
    await act(async () => {})
  })

  it('clears only current editor state and keeps saved items', () => {
    render(
      <MemoryRouter>
        <ExpenseOtherClaimForm {...baseProps} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }))
    const notesField = screen.getByLabelText('Item Notes')
    fireEvent.change(notesField, { target: { value: 'temporary draft change' } })
    fireEvent.click(screen.getByRole('button', { name: 'Clear form' }))

    expect(screen.getByLabelText('Item Notes').value).toBe('')
    expect(screen.getByText('KEEP_THIS_EXPENSE_NOTE')).toBeTruthy()
  })

  it('locks submit actions while submit request is in-flight', async () => {
    let resolveSubmit
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve
    })
    const submitSpy = vi
      .spyOn(payrollClaimsApi, 'submitMyPayrollClaimApiFirst')
      .mockImplementation(() => submitPromise)

    const submitReadyProps = {
      ...baseProps,
      draftPayload: {
        ...baseProps.draftPayload,
        savedItems: [
          {
            ...baseProps.draftPayload.savedItems[0],
            attachmentId: 99,
            attachmentUploadState: 'uploaded',
          },
        ],
      },
    }

    render(
      <MemoryRouter>
        <ExpenseOtherClaimForm {...submitReadyProps} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }))

    await waitFor(() => {
      const submittingButtons = screen.getAllByRole('button', { name: 'Submitting...' })
      expect(submittingButtons.length).toBeGreaterThan(0)
      submittingButtons.forEach((button) => {
        expect(button.hasAttribute('disabled')).toBe(true)
      })
    })
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()

    resolveSubmit({
      ok: true,
      data: {
        id: 'CLM-LOCK-001',
      },
    })

    await act(async () => {
      await submitPromise
    })

    submitSpy.mockRestore()
  })

  it('blocks submit when hydrated saved item is invalid', async () => {
    const submitSpy = vi
      .spyOn(payrollClaimsApi, 'submitMyPayrollClaimApiFirst')
      .mockResolvedValue({ ok: true, data: { id: 'CLM-BLOCK-001' } })

    render(
      <MemoryRouter>
        <ExpenseOtherClaimForm
          {...baseProps}
          draftPayload={{
            ...baseProps.draftPayload,
            savedItems: [
              {
                ...baseProps.draftPayload.savedItems[0],
                amount: '0',
                attachmentId: 99,
                attachmentUploadState: 'uploaded',
              },
            ],
          }}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }))

    await waitFor(() => {
      expect(submitSpy).not.toHaveBeenCalled()
    })
  })
})
