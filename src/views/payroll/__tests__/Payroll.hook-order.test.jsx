// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Payroll from '../Payroll'

vi.mock('src/views/payroll/components/claim-form/ExpenseOtherClaimForm', () => ({
  default: () => <div data-testid="mock-claim-form">mock-claim-form</div>,
}))
vi.mock('src/views/payroll/components/claim-form/ClaimTypeSelection', () => ({
  default: () => <div data-testid="mock-type-selection">mock-type-selection</div>,
}))
vi.mock('src/views/payroll/components/claim-form/SalaryClaimForm', () => ({
  default: () => <div data-testid="mock-salary-form">mock-salary-form</div>,
}))
vi.mock('src/views/payroll/components/ClaimActionModals', () => ({
  default: () => <div data-testid="mock-claim-action-modals" />,
}))
vi.mock('src/views/payroll/components/ClaimDetailSection', () => ({
  default: () => <div data-testid="mock-claim-detail">mock-claim-detail</div>,
}))
vi.mock('src/views/payroll/components/ClaimsSection', () => ({
  default: () => <div data-testid="mock-claims-section">mock-claims-section</div>,
}))
vi.mock('src/views/payroll/components/PayrollNav', () => ({
  default: () => <div data-testid="mock-payroll-nav">mock-payroll-nav</div>,
}))
vi.mock('src/views/payroll/components/PayslipsSection', () => ({
  default: () => <div data-testid="mock-payslips">mock-payslips</div>,
}))
vi.mock('src/views/payroll/components/claimRecords', () => ({
  deleteClaimDraftEntry: () => true,
  deleteClaimRecord: () => true,
  loadClaimDraftEntryById: () => null,
  loadClaimDrafts: () => [],
  loadClaimRecords: () => [],
  updateClaimRecord: () => null,
}))
vi.mock('src/hooks/useTableRows', () => ({
  default: (rows) => ({ rowsToShow: 10, setRowsToShow: () => {}, visibleRows: rows }),
}))

vi.mock('src/utils/authz', () => ({
  hasPermission: (user) => Boolean(user),
}))

const reducer = (state = { authUser: null }, action) => {
  if (action.type === 'SET_AUTH_USER') {
    return { ...state, authUser: action.payload }
  }
  return state
}

describe('Payroll hook order safety', () => {
  it('rerenders from no user to signed-in user without hook-order crash', () => {
    const store = createStore(reducer)

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/payroll']}>
          <Routes>
            <Route path="*" element={<Payroll />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    )

    expect(screen.getByText('You do not have access to payroll management.')).toBeTruthy()

    act(() => {
      store.dispatch({
        type: 'SET_AUTH_USER',
        payload: { id: 'u1', name: 'Payroll User', email: 'user@example.com' },
      })
    })

    expect(screen.queryByText('Unable to load payroll. Please sign in again.')).toBeNull()
    expect(screen.getByTestId('mock-claims-section')).toBeTruthy()
  })
})
