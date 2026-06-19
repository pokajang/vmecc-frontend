// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SalaryAssignmentFormPage from '../SalaryAssignmentFormPage'

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
  vi.clearAllMocks()
})

const buildVm = (overrides = {}) => ({
  isEditing: true,
  isReadOnly: false,
  draft: {
    selectedStaffKey: 'staff-1',
    employeeId: 'staff-1',
    employee: 'Jane Tester',
    email: 'jane@example.test',
    icNumber: '900101-10-1234',
    phone: '0123456789',
    team: 'Alpha',
    effectiveFrom: '2026-04',
    basicSalary: '5000',
    allowances: [{ id: 'allowance-1', name: 'Transport', amount: '200' }],
    employeeContributions: {},
    notes: 'Existing remark text',
    notesHistory: [
      {
        id: 'remark-1',
        text: 'Existing remark text',
        createdAt: '2026-04-17T08:00:00.000Z',
        createdBy: 'HR Admin',
      },
    ],
  },
  payComponentsEditMode: false,
  payComponentsDraft: {},
  staffOptions: [
    {
      key: 'staff-1',
      name: 'Jane Tester',
      team: 'Alpha',
      isActive: true,
    },
  ],
  staffDirectoryLoading: false,
  assignmentFound: true,
  salaryDetailTotals: {
    gross: 5200,
  },
  calculatedDeductions: {
    rows: [
      { key: 'epf', label: 'EPF', employeeAmount: 550 },
      { key: 'perkeso', label: 'PERKESO', employeeAmount: 25 },
      { key: 'sip', label: 'SIP', employeeAmount: 10 },
    ],
  },
  formatCurrency: (value) => `RM ${Number(value || 0).toFixed(2)}`,
  formatMonth: (value) => value,
  formatDateTime: (value) => value,
  actorName: 'HR Admin',
  assignmentRows: [],
  currentAssignmentId: 'assignment-1',
  statutoryRatesFeatureEnabled: true,
  ...overrides,
})

const buildHandlers = () => ({
  onBack: vi.fn(),
  onStaffChange: vi.fn(),
  onDraftFieldChange: vi.fn(),
  onSaveDraft: vi.fn(async () => true),
  onSetSalary: vi.fn(),
  onEditPayComponents: vi.fn(),
  onSavePayComponents: vi.fn(),
  onCancelPayComponents: vi.fn(),
  onAddAllowanceRow: vi.fn(),
  onUpdateComponentRow: vi.fn(),
  onDeleteComponentRow: vi.fn(),
  onOpenEdit: vi.fn(),
})

const renderForm = ({ vm = buildVm(), handlers = buildHandlers() } = {}) => {
  render(
    <MemoryRouter>
      <SalaryAssignmentFormPage vm={vm} handlers={handlers} />
    </MemoryRouter>,
  )
  return { handlers, vm }
}

describe('SalaryAssignmentFormPage', () => {
  it('renders a three-step flow with active step semantics', () => {
    renderForm()

    expect(
      screen.getByRole('button', { name: '1. Staff and Month' }).getAttribute('aria-current'),
    ).toBe('step')
    expect(screen.getByRole('button', { name: '2. Pay Package' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: '3. Review' }).disabled).toBe(false)
  })

  it('edits pay components directly without nested edit controls', () => {
    const { handlers } = renderForm()

    fireEvent.click(screen.getByRole('button', { name: '2. Pay Package' }))
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancel Remarks' })).toBeNull()

    fireEvent.change(screen.getAllByDisplayValue('5000')[0], { target: { value: '5300' } })
    expect(handlers.onDraftFieldChange).toHaveBeenCalledWith('basicSalary', '5300')
  })

  it('shows review details and allows submit without hidden section blockers', () => {
    renderForm()

    fireEvent.click(screen.getByRole('button', { name: '3. Review' }))

    expect(screen.getByText('Pay Summary')).toBeTruthy()
    expect(screen.getByText('Jane Tester')).toBeTruthy()
    expect(screen.getByText('RM 5200.00')).toBeTruthy()
    expect(screen.getByText('-RM 585.00')).toBeTruthy()
    expect(screen.getAllByText('Existing remark text').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Update Salary' }).disabled).toBe(false)
  })

  it('renders read-only assignments as step-based inspection with edit action', () => {
    const handlers = buildHandlers()
    renderForm({ vm: buildVm({ isReadOnly: true }), handlers })

    expect(screen.getByRole('button', { name: '3. Review' }).getAttribute('aria-current')).toBe(
      'step',
    )
    expect(screen.getByText('Pay Summary')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Edit Salary' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Salary' }))
    expect(handlers.onOpenEdit).toHaveBeenCalled()
  })
})
