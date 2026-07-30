// @vitest-environment jsdom
import React from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearPayrollSensitiveState } from 'src/services/payrollPrivacy'
import OvertimeManagement from '../OvertimeManagement'

const testState = vi.hoisted(() => ({
  user: null,
  loadRecords: vi.fn(),
}))

vi.mock('react-redux', () => ({
  useSelector: (selector) => selector({ authUser: testState.user }),
}))

vi.mock('src/utils/authz', () => ({
  hasAnyPermission: () => true,
  hasPermission: () => false,
}))

vi.mock('src/config/featureFlags', () => ({
  isHolidayGuidanceStaffVisibilityEnabledForUser: () => false,
}))

vi.mock('src/components/auditHistory', () => ({
  buildWorkflowHistoryEntries: () => [],
}))

vi.mock('src/components/ModulePageHeader', () => ({ default: () => null }))
vi.mock('src/components/RouteNavTabs', () => ({ default: () => null }))
vi.mock('src/views/overtime/components/OvertimeDetailSection', () => ({ default: () => null }))
vi.mock('../settings/components/OvertimeApprovalRules', () => ({ default: () => null }))
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

const renderManagement = () =>
  render(
    <MemoryRouter initialEntries={['/staff/overtime-management/records']}>
      <Routes>
        <Route path="/staff/overtime-management/records" element={<OvertimeManagement />} />
      </Routes>
    </MemoryRouter>,
  )

describe('OvertimeManagement sensitive identity boundary', () => {
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
})
