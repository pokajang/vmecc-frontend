// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SalaryClaimForm from '../SalaryClaimForm'
import { loadMyOvertimeRecordsApiFirst } from 'src/services/overtimeApi'
import * as payrollClaimsApi from 'src/services/payrollClaimsApi'

vi.mock('src/services/salaryAssignmentsApi', () => ({
  loadSalaryAssignmentsApiFirst: vi.fn(async () => ({
    ok: true,
    data: [
      {
        employeeId: '1',
        employee: 'Test User',
        effectiveFrom: '2026-01',
        basicSalary: 1000,
        fixedAllowances: 0,
      },
    ],
  })),
}))

vi.mock('src/services/overtimeApi', () => ({
  loadMyOvertimeRecordsApiFirst: vi.fn(async () => ({ ok: true, data: [] })),
}))

vi.mock('src/services/apiClient', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    fetchOvertimeRateSettings: vi.fn(async () => ({ data: {} })),
  }
})

vi.mock('src/contexts/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({
    registerGuard: vi.fn(),
    unregisterGuard: vi.fn(),
    requestNavigation: (action) => {
      if (typeof action === 'function') action()
    },
  }),
}))

if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = () => {}
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const baseProps = {
  user: { id: 1, name: 'Test User' },
  claimType: 'salary',
  onBack: vi.fn(),
  onChangeType: vi.fn(),
  onEditType: vi.fn(),
  periodValue: '2026-04',
  periodConfirmed: true,
  onPeriodChange: vi.fn(),
  onPeriodConfirmedChange: vi.fn(),
  draftPayload: {
    id: 'draft-salary-1',
    period: '2026-04',
    periodConfirmed: true,
    payrollBaselineConfirmed: true,
    savedItems: [
      {
        claimType: 'Addition',
        claimDate: '2026-04-11',
        amount: '25.00',
        lineNotes: 'KEEP_THIS_SALARY_NOTE',
      },
    ],
    draftItem: {
      claimType: 'Addition',
      claimDate: '2026-04-12',
      amount: '5.00',
      lineNotes: 'draft salary note',
    },
  },
}

describe('SalaryClaimForm', () => {
  it('shows thumb action group in back/clear/submit order without manual draft save', async () => {
    render(
      <MemoryRouter>
        <SalaryClaimForm
          {...baseProps}
          overtimeEligibility={{ isResolved: true, eligible: true, error: null }}
        />
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
  })

  it('shows "Update request" label on submit button when editing a submitted claim', async () => {
    render(
      <MemoryRouter>
        <SalaryClaimForm
          {...baseProps}
          draftPayload={{ ...baseProps.draftPayload, sourceClaimId: 'CLAIM-001' }}
          overtimeEligibility={{ isResolved: true, eligible: true, error: null }}
        />
      </MemoryRouter>,
    )

    const actionBar = screen.getByRole('group', { name: 'Form actions' })
    expect(within(actionBar).getByRole('button', { name: 'Update request' })).toBeTruthy()
    expect(within(actionBar).queryByRole('button', { name: 'Submit request' })).toBeNull()
  })

  it('opens a blank editor on Add Adjustment and clears it without touching saved items', async () => {
    render(
      <MemoryRouter>
        <SalaryClaimForm {...baseProps} />
      </MemoryRouter>,
    )

    const addButton = screen.getByRole('button', { name: 'Add Adjustment' })
    await waitFor(() => {
      expect(addButton.hasAttribute('disabled')).toBe(false)
    })

    // handleAddItem calls resetDraft(), then setDraftItem(createSalaryItem()), always a blank slate.
    // draftPayload.draftItem is applied only during the initial mount hydration useEffect, so by
    // the time this click runs the editor opens empty regardless of what draftItem contains.
    fireEvent.click(addButton)
    expect(screen.getByLabelText('Remarks').value).toBe('')

    fireEvent.change(screen.getByLabelText('Remarks'), {
      target: { value: 'temporary salary draft change' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Clear form' }))

    expect(screen.getByLabelText('Remarks').value).toBe('')
    expect(screen.getByText('KEEP_THIS_SALARY_NOTE')).toBeTruthy()
  })

  it('loads overtime rows using backend-compatible month and status filters', async () => {
    render(
      <MemoryRouter>
        <SalaryClaimForm
          {...baseProps}
          overtimeEligibility={{ isResolved: true, eligible: true, error: null }}
        />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(loadMyOvertimeRecordsApiFirst).toHaveBeenCalledWith(1, {
        month: '2026-04',
        status: 'Approved',
      })
    })
  })

  it('shows role ineligibility message and skips overtime API when eligible is false', async () => {
    render(
      <MemoryRouter>
        <SalaryClaimForm
          {...baseProps}
          overtimeEligibility={{ isResolved: true, eligible: false, error: null }}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByText(/Overtime contribution is disabled for your current role/i),
    ).toBeTruthy()
    expect(loadMyOvertimeRecordsApiFirst).not.toHaveBeenCalled()
  })

  it('shows eligibility error message and skips overtime API when error is set', async () => {
    render(
      <MemoryRouter>
        <SalaryClaimForm
          {...baseProps}
          overtimeEligibility={{ isResolved: false, eligible: null, error: new Error('network') }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/eligibility could not be verified/i)).toBeTruthy()
    expect(loadMyOvertimeRecordsApiFirst).not.toHaveBeenCalled()
  })

  it('shows eligibility loading state and skips overtime API while unresolved', async () => {
    render(
      <MemoryRouter>
        <SalaryClaimForm
          {...baseProps}
          overtimeEligibility={{ isResolved: false, eligible: null, error: null }}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Checking overtime eligibility/i)).toBeTruthy()
    expect(loadMyOvertimeRecordsApiFirst).not.toHaveBeenCalled()
  })

  it('blocks submit when hydrated salary adjustment item is invalid', async () => {
    const submitSpy = vi
      .spyOn(payrollClaimsApi, 'submitMyPayrollClaimApiFirst')
      .mockResolvedValue({ ok: true, data: { id: 'CLM-SALARY-BLOCK-001' } })

    render(
      <MemoryRouter>
        <SalaryClaimForm
          {...baseProps}
          draftPayload={{
            ...baseProps.draftPayload,
            payrollBaselineConfirmed: true,
            savedItems: [
              {
                claimType: 'Addition',
                claimDate: '',
                amount: '25.00',
                lineNotes: 'invalid hydrated row',
              },
            ],
          }}
          overtimeEligibility={{ isResolved: true, eligible: true, error: null }}
        />
      </MemoryRouter>,
    )

    const actionBar = screen.getByRole('group', { name: 'Form actions' })
    await waitFor(() => {
      expect(
        within(actionBar).getByRole('button', { name: 'Submit request' }).hasAttribute('disabled'),
      ).toBe(false)
    })
    fireEvent.click(within(actionBar).getByRole('button', { name: 'Submit request' }))
    fireEvent.click(screen.getByLabelText(/I confirm the salary payout baseline/i))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }))

    await waitFor(() => {
      expect(submitSpy).not.toHaveBeenCalled()
    })
  })
})
