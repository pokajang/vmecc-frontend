// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPayrollSensitiveState } from 'src/services/payrollPrivacy'
import OvertimeManagement from '../OvertimeManagement'

const testState = vi.hoisted(() => ({
  user: null,
  loadRecords: vi.fn(),
  rulesMount: vi.fn(),
}))

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ authUser: testState.user }),
}))

vi.mock('src/utils/authz', () => ({
  hasAnyPermission: () => true,
  hasPermission: (user, permission) =>
    user?.permissions?.includes('*') || user?.permissions?.includes(permission),
}))

vi.mock('src/config/featureFlags', () => ({
  isHolidayGuidanceStaffVisibilityEnabledForUser: () => false,
}))

vi.mock('src/components/auditHistory', () => ({
  buildWorkflowHistoryEntries: () => [],
}))

vi.mock('src/components/ModulePageHeader', () => ({ default: () => null }))
vi.mock('src/components/RouteNavTabs', () => ({
  default: ({ items }) => (
    <nav>
      {items.map((item) => (
        <span key={item.key}>{item.label}</span>
      ))}
    </nav>
  ),
}))
vi.mock('src/views/overtime/components/OvertimeDetailSection', () => ({ default: () => null }))
vi.mock('src/views/settings/components/OvertimeApprovalRules', () => ({
  default: () => {
    testState.rulesMount()
    return <div>Rules editor</div>
  },
}))
vi.mock('../leave-management/components/OvertimeWorkflowActionModal', () => ({
  default: () => null,
}))
vi.mock('../leave-management/components/OvertimeRecordsTab', () => ({
  default: ({ vm }) => (
    <div data-testid="management-record-ids">{vm.rows.map((row) => row.id).join('|')}</div>
  ),
}))

vi.mock('src/services/apiClient', () => ({
  fetchStaffOvertimeRecord: vi.fn(),
}))

vi.mock('src/services/overtimeApi', () => ({
  loadStaffOvertimeRecordByPublicId: vi.fn(),
  loadStaffOvertimeRecordsApiFirst: (...args) => testState.loadRecords(...args),
  mapOvertimeApiRowToUi: (row) => row,
}))

vi.mock('../salary-claims-management/hooks/useOvertimeAdminWorkflow', () => ({
  default: () => ({
    getOvertimeReviewActionConfig: () => ({
      approveDisabled: true,
      rejectDisabled: true,
      approveLabel: 'Approve',
    }),
    overtimeWorkflowModalState: { visible: false, record: null },
    overtimeWorkflowModalActionLabel: '',
    isRejectOvertimeWorkflowModal: false,
    isCorrectionOvertimeWorkflowModal: false,
    overtimeWorkflowModalActionDisabled: true,
    overtimeWorkflowRemarks: '',
    overtimeWorkflowDeclarationChecked: false,
    overtimeWorkflowDeclarationError: '',
    overtimeWorkflowRejectError: '',
    handleOvertimeWorkflowRemarksChange: vi.fn(),
    handleOvertimeWorkflowDeclarationChange: vi.fn(),
    closeOvertimeWorkflowModal: vi.fn(),
    submitOvertimeWorkflowApprove: vi.fn(),
    submitOvertimeWorkflowReject: vi.fn(),
    submitOvertimeWorkflowCorrection: vi.fn(),
    approveOvertime: vi.fn(),
    rejectOvertime: vi.fn(),
    requestOvertimeCorrection: vi.fn(),
    runOvertimeWorkflowAction: vi.fn(),
  }),
}))

const deferred = () => {
  let resolve
  const promise = new Promise((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

const renderManagement = (initialEntry = '/staff/overtime-management/records') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/staff/overtime-management/:section" element={<OvertimeManagement />} />
      </Routes>
    </MemoryRouter>,
  )

describe('OvertimeManagement sensitive identity boundary', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    clearPayrollSensitiveState({ broadcast: false })
    testState.user = {
      id: 'manager-a',
      name: 'Manager A',
      permissions: ['staff.overtime.manage'],
      roles: ['Client Contract Manager'],
    }
  })

  it('does not render a previous manager query result during an identity switch', async () => {
    const nextIdentityRows = deferred()
    testState.loadRecords
      .mockResolvedValueOnce({
        ok: true,
        data: [{ id: 'OT-A', ownerUserId: 'employee-a', recordKey: 'public-a' }],
        meta: { page: 1, last_page: 1, filtered_count: 1, total_count: 1 },
        filters: {},
      })
      .mockReturnValueOnce(nextIdentityRows.promise)
    const view = renderManagement()

    await waitFor(() =>
      expect(screen.getByTestId('management-record-ids').textContent).toBe('OT-A'),
    )

    testState.user = {
      id: 'manager-b',
      name: 'Manager B',
      permissions: ['staff.overtime.manage'],
      roles: ['Client Contract Manager'],
    }
    view.rerender(
      <MemoryRouter initialEntries={['/staff/overtime-management/records']}>
        <Routes>
          <Route path="/staff/overtime-management/records" element={<OvertimeManagement />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByTestId('management-record-ids').textContent).toBe('')

    await act(async () => {
      nextIdentityRows.resolve({
        ok: true,
        data: [{ id: 'OT-B', ownerUserId: 'employee-b', recordKey: 'public-b' }],
        meta: { page: 1, last_page: 1, filtered_count: 1, total_count: 1 },
        filters: {},
      })
    })
    await waitFor(() =>
      expect(screen.getByTestId('management-record-ids').textContent).toBe('OT-B'),
    )
  })

  it('hides and does not mount settings-only overtime rules for a contract manager', async () => {
    testState.loadRecords.mockResolvedValue({ ok: true, data: [], meta: {}, filters: {} })

    renderManagement('/staff/overtime-management/rules')

    await waitFor(() => expect(testState.loadRecords).toHaveBeenCalled())
    expect(screen.queryByText('Overtime Rules')).toBeNull()
    expect(screen.queryByText('Rules editor')).toBeNull()
    expect(testState.rulesMount).not.toHaveBeenCalled()
    expect(screen.getAllByText('Overtime Records')).toHaveLength(1)
  })

  it('keeps the overtime rules editor available to settings managers', async () => {
    testState.user = {
      id: 'system-admin',
      name: 'System Admin',
      permissions: ['staff.overtime.manage', 'settings.manage'],
      roles: ['System Administrator'],
    }
    testState.loadRecords.mockResolvedValue({ ok: true, data: [], meta: {}, filters: {} })

    renderManagement('/staff/overtime-management/rules')

    await waitFor(() => expect(screen.getByText('Rules editor')).toBeTruthy())
    expect(screen.getByText('Overtime Rules')).toBeTruthy()
    expect(testState.rulesMount).toHaveBeenCalled()
  })
})
