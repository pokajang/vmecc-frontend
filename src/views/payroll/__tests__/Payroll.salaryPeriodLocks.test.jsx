// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Payroll from '../Payroll'

vi.mock('src/utils/authz', () => ({
  hasPermission: () => true,
}))

vi.mock('src/hooks/useOvertimeEligibility', () => ({
  default: () => ({ eligible: true }),
}))

vi.mock('src/views/payroll/hooks/usePayrollClaimSelection', () => ({
  default: () => ({
    selectedClaimType: 'salary',
    setSelectedClaimType: () => {},
    claimPeriod: '2026-04',
    setClaimPeriod: () => {},
    claimPeriodConfirmed: true,
    setClaimPeriodConfirmed: () => {},
    claimDraftPayload: null,
    setClaimDraftPayload: () => {},
    claimTypeLockedForSelection: false,
    isDraftSelectionMode: false,
    continueNewClaim: () => {},
    navigateClaimType: () => {},
    editClaimType: () => {},
    cancelClaimSelectionEdit: () => {},
  }),
}))

vi.mock('src/views/payroll/hooks/usePayrollClaimsData', () => ({
  default: () => ({
    claimRecords: [
      {
        id: 'CLM-001',
        type: 'salary',
        isDraft: false,
        status: 'Approved',
        periodValue: '2026-04',
      },
    ],
    draftEntriesById: {},
    isClaimsLoading: false,
    claimsError: '',
    payslipRows: [],
    isPayslipsLoading: false,
    payslipsError: '',
    filteredClaims: [],
    rowsToShow: 10,
    setRowsToShow: () => {},
    visibleClaims: [],
    selectedClaim: null,
    selectedClaimTypeMeta: { label: 'Salary Claim' },
    submittedClaimItems: [],
    salaryDetailSummary: null,
    submittedClaimTotalValue: 0,
    categoryOptions: [],
    statusOptions: [],
    refreshClaimRows: async () => {},
    downloadPayslip: async () => {},
  }),
}))

vi.mock('src/views/payroll/hooks/usePayrollClaimActions', () => ({
  default: () => ({
    cancelTarget: null,
    cancelModalVisible: false,
    deleteTarget: null,
    deleteModalVisible: false,
    deleteBlockedTarget: null,
    deleteBlockedModalVisible: false,
    openClaim: () => {},
    downloadAttachment: () => {},
    downloadClaimPackage: () => {},
    editSubmittedClaim: () => {},
    cancelClaim: () => {},
    confirmCancel: async () => {},
    deleteClaim: () => {},
    confirmDelete: async () => {},
    closeCancelModal: () => {},
    closeDeleteModal: () => {},
    closeDeleteBlockedModal: () => {},
  }),
}))

vi.mock('src/views/payroll/components/claim-form/ClaimTypeSelection', () => ({
  default: (props) => (
    <div data-testid="salary-period-lock-reason">
      {props.salaryPeriodLocks?.[props.periodValue] || ''}
    </div>
  ),
}))

vi.mock('src/views/payroll/components/claim-form/ExpenseOtherClaimForm', () => ({
  default: () => <div />,
}))
vi.mock('src/views/payroll/components/claim-form/SalaryClaimForm', () => ({
  default: () => <div />,
}))
vi.mock('src/views/payroll/components/ClaimActionModals', () => ({
  default: () => <div />,
}))
vi.mock('src/views/payroll/components/ClaimDetailSection', () => ({
  default: () => <div />,
}))
vi.mock('src/views/payroll/components/ClaimsSection', () => ({
  default: () => <div />,
}))
vi.mock('src/views/payroll/components/PayrollNav', () => ({
  default: () => <div />,
}))
vi.mock('src/views/payroll/components/PayslipsSection', () => ({
  default: () => <div />,
}))

const reducer = (state = { authUser: { id: 'u1' } }) => state

describe('Payroll salary period lock reason', () => {
  it('shows a clean bullet separator without mojibake artifacts', () => {
    const store = createStore(reducer)

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/payroll/claims/new']}>
          <Routes>
            <Route path="*" element={<Payroll />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    )

    const reason = screen.getByTestId('salary-period-lock-reason').textContent || ''
    expect(reason).toContain('Already claimed (CLM-001 • Approved)')
    expect(reason.includes('â€¢')).toBe(false)
  })
})
