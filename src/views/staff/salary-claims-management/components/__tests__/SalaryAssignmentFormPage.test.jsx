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

const buildVm = () => ({
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
    basicSalary: 5000,
    allowances: [],
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
    gross: 5000,
  },
  calculatedDeductions: {
    rows: [],
  },
  formatCurrency: (value) => `RM ${Number(value || 0).toFixed(2)}`,
  formatDateTime: (value) => value,
  actorName: 'HR Admin',
  assignmentRows: [],
  currentAssignmentId: 'assignment-1',
  statutoryRatesFeatureEnabled: true,
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

describe('SalaryAssignmentFormPage', () => {
  it('preloads existing remark text when editing a remark', () => {
    render(
      <MemoryRouter>
        <SalaryAssignmentFormPage vm={buildVm()} handlers={buildHandlers()} />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Edit remark' }))

    expect(screen.getByPlaceholderText('Add assignment notes for HR/admin context').value).toBe(
      'Existing remark text',
    )
  })
})
