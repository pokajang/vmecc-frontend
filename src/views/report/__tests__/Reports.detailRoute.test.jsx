// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Reports from '../Reports'

const mocks = vi.hoisted(() => ({
  refreshReportRecord: vi.fn(),
  useReportRecords: vi.fn(),
  useReportRouteActions: vi.fn(),
  setActiveDraftRows: vi.fn(),
  setWorkflowDeclarationError: vi.fn(),
  setWorkflowRejectError: vi.fn(),
}))

vi.mock('react-redux', () => ({
  useSelector: (selector) =>
    selector({
      authUser: {
        id: 7,
        name: 'Route User',
        permissions: ['reports.erco.view', 'reports.drill.view', 'reports.fitness.view'],
      },
    }),
}))

vi.mock('src/utils/authz', () => ({
  hasPermission: () => true,
}))

vi.mock('../reportApi', async () => {
  const actual = await vi.importActual('../reportApi')
  return {
    ...actual,
    refreshReportRecord: mocks.refreshReportRecord,
  }
})

vi.mock('../hooks/useReportRecords', () => ({
  default: (...args) => mocks.useReportRecords(...args),
}))

vi.mock('../hooks/useActiveReportDraftRows', () => ({
  default: () => ({
    activeDraftRows: [],
    setActiveDraftRows: mocks.setActiveDraftRows,
  }),
}))

vi.mock('../hooks/useUnsavedChangesGuard', () => ({
  default: () => {},
}))

vi.mock('../hooks/useReportRouteActions', () => ({
  default: (...args) => mocks.useReportRouteActions(...args),
}))

vi.mock('../formRegistry', () => ({
  FORM_REGISTRY: {},
}))

vi.mock('../components/ReportDetailSection', () => ({
  default: ({ selectedRecord }) => (
    <section data-testid="report-detail-section">
      <div>{selectedRecord?.displayId}</div>
      <div>{selectedRecord?.incidentType}</div>
    </section>
  ),
}))

vi.mock('../components/ReportRecordsSection', () => ({
  default: () => <div data-testid="records-section" />,
}))

vi.mock('../erco/ErcoMobileHome', () => ({
  default: () => <div data-testid="erco-mobile-home" />,
}))

vi.mock('../drill/DrillMobileHome', () => ({
  default: () => <div data-testid="drill-mobile-home" />,
}))

vi.mock('../fitness-test/FitnessTestMobileHome', () => ({
  default: () => <div data-testid="fitness-mobile-home" />,
}))

vi.mock('src/components/TableLoader', () => ({
  default: ({ message }) => <div>{message}</div>,
}))

vi.mock('src/components/CreateActionButton', () => ({
  default: ({ label }) => <button type="button">{label}</button>,
}))

vi.mock('src/components/ModulePageHeader', () => ({
  default: ({ title, actions }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}))

vi.mock('src/components/ModuleNavTabs', () => ({
  default: () => <nav data-testid="module-tabs" />,
}))

vi.mock('src/views/shared/ActionConfirmModal', () => ({
  default: ({ visible, title, message, confirmLabel = 'Confirm', onConfirm, onClose }) =>
    visible ? (
      <section role="dialog" aria-label={title}>
        <div>{message}</div>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </section>
    ) : null,
}))

vi.mock('../components/ReportWorkflowActionModal', () => ({
  default: ({ visible, onRemarksChange, onDeclarationChange }) =>
    visible ? (
      <section role="dialog" aria-label="Workflow action">
        <textarea
          aria-label="Workflow remarks"
          onChange={(event) => onRemarksChange(event.target.value)}
        />
        <input
          aria-label="Workflow declaration"
          type="checkbox"
          onChange={(event) => onDeclarationChange(event.target.checked)}
        />
      </section>
    ) : null,
}))

const ercoRecord = {
  id: 'erco-001',
  displayId: 'ERCO-001',
  reportType: 'erco',
  incidentType: 'Hazmat',
  status: 'Submitted',
}

const buildRecordsState = (overrides = {}) => ({
  records: [],
  isLoading: false,
  search: '',
  setSearch: vi.fn(),
  period: 'all',
  setPeriod: vi.fn(),
  sort: 'reportedAt:desc',
  setSort: vi.fn(),
  typeFilter: 'All',
  setTypeFilter: vi.fn(),
  statusFilter: 'All',
  setStatusFilter: vi.fn(),
  filteredRecords: [],
  submittedRecordsInScope: [],
  selectedRecord: null,
  typeOptions: [{ value: 'All', label: 'All incident types' }],
  statusOptions: [{ value: 'All', label: 'All status' }],
  recordScope: 'mine',
  setRecordScope: vi.fn(),
  recordsInScopeCount: 0,
  rowsToShow: 10,
  setRowsToShow: vi.fn(),
  visibleRows: [],
  clearFilters: vi.fn(),
  persistRecords: vi.fn(),
  reloadRecords: vi.fn(),
  ...overrides,
})

const buildRouteActions = (overrides = {}) => ({
  backFromReview: vi.fn(),
  canApproveRecord: () => false,
  canDeleteRecord: () => true,
  canEditRecord: () => true,
  canRejectRecord: () => false,
  canReviewRecord: () => true,
  closeWorkflowActionModal: vi.fn(),
  confirmDeleteRecord: vi.fn(),
  confirmReviewSubmit: vi.fn(),
  continueEditWithDraft: vi.fn(),
  deleteTarget: null,
  discardEditDraftAndLoadOriginal: vi.fn(),
  downloadRecord: vi.fn(),
  downloadingId: null,
  editRecord: vi.fn(),
  isActionBusy: false,
  isDeleting: false,
  isSubmitting: false,
  pendingEditRow: null,
  openSavedDraft: vi.fn(),
  pendingAction: null,
  pendingReviewBackSection: '',
  pendingReviewRecord: null,
  removeDraft: vi.fn(),
  requestDeleteRecord: vi.fn(),
  requestReview: vi.fn(),
  runGuardedAction: (action) => action(),
  saveReviewDraft: vi.fn(),
  setDeleteTarget: vi.fn(),
  setPendingAction: vi.fn(),
  setShowDiscard: vi.fn(),
  setShowDraftChoice: vi.fn(),
  setShowEditDraftChoice: vi.fn(),
  setWorkflowDeclarationChecked: vi.fn(),
  setWorkflowDeclarationError: mocks.setWorkflowDeclarationError,
  setWorkflowRejectError: mocks.setWorkflowRejectError,
  setWorkflowRemarks: vi.fn(),
  showDiscard: false,
  showDraftChoice: false,
  showEditDraftChoice: false,
  startBlankReport: vi.fn(),
  startNew: vi.fn(),
  submit: vi.fn(),
  submitWorkflowAction: vi.fn(),
  transitionApprove: vi.fn(),
  transitionReject: vi.fn(),
  transitionReview: vi.fn(),
  workflowActionState: { visible: false },
  workflowDeclarationChecked: false,
  workflowDeclarationError: '',
  workflowRejectError: '',
  workflowRemarks: '',
  ...overrides,
})

const renderReportsRoute = (initialPath = '/report/erco/erco-001') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/report/:reportType/:reportId" element={<Reports />} />
        <Route path="/report/:reportType" element={<Reports />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  mocks.refreshReportRecord.mockReset()
  mocks.useReportRecords.mockReset()
  mocks.useReportRouteActions.mockReset()
  mocks.setActiveDraftRows.mockReset()
  mocks.setWorkflowDeclarationError.mockReset()
  mocks.setWorkflowRejectError.mockReset()

  mocks.useReportRecords.mockReturnValue(buildRecordsState())
  mocks.useReportRouteActions.mockReturnValue(buildRouteActions())
})

afterEach(() => {
  cleanup()
})

describe('Reports direct detail route loading', () => {
  it('passes a returned-report queue filter to the records hook', () => {
    renderReportsRoute('/report/erco?status=Rejected')

    expect(mocks.useReportRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        actionFilter: '',
        initialStatusFilter: 'Rejected',
        reportTypeSlug: 'erco',
      }),
    )
  })

  it('passes an actionable review queue filter to the records hook', () => {
    renderReportsRoute('/report/erco?scope=actionable&action=review')

    expect(mocks.useReportRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        actionFilter: 'review',
        initialStatusFilter: 'All',
        reportTypeSlug: 'erco',
      }),
    )
  })

  it('renders a direct route record after loading it from the API', async () => {
    mocks.refreshReportRecord.mockResolvedValue(ercoRecord)

    renderReportsRoute()

    expect(screen.getByText('Loading report...')).toBeTruthy()
    expect(screen.queryByText('Report not found.')).toBeNull()

    await waitFor(() => expect(screen.getByTestId('report-detail-section')).toBeTruthy())
    expect(screen.getByText('ERCO-001')).toBeTruthy()
    expect(screen.getByText('Hazmat')).toBeTruthy()
  })

  it('does not show not-found while the direct route fetch is pending', () => {
    mocks.refreshReportRecord.mockReturnValue(new Promise(() => {}))

    renderReportsRoute()

    expect(screen.getByText('Loading report...')).toBeTruthy()
    expect(screen.queryByText('Report not found.')).toBeNull()
  })

  it('renders not-found when the fetched record belongs to another report type', async () => {
    mocks.refreshReportRecord.mockResolvedValue(ercoRecord)

    renderReportsRoute('/report/drill/erco-001')

    await waitFor(() => expect(screen.getByText('Report not found.')).toBeTruthy())
    expect(screen.queryByTestId('report-detail-section')).toBeNull()
  })

  it.each([403, 404])('renders not-found for %s route fetch failures', async (status) => {
    const error = new Error('Request failed')
    error.status = status
    mocks.refreshReportRecord.mockRejectedValue(error)

    renderReportsRoute()

    await waitFor(() => expect(screen.getByText('Report not found.')).toBeTruthy())
    expect(screen.queryByTestId('report-detail-section')).toBeNull()
  })

  it('renders a retryable load error for generic route fetch failures', async () => {
    mocks.refreshReportRecord.mockRejectedValue(new Error('Network failed'))

    renderReportsRoute()

    await waitFor(() =>
      expect(screen.getByText('Unable to load report. Please try again.')).toBeTruthy(),
    )
    expect(screen.queryByTestId('report-detail-section')).toBeNull()
  })

  it('prefers the selected record from the records list when it is available', async () => {
    const listRecord = {
      ...ercoRecord,
      displayId: 'ERCO-LIST',
      incidentType: 'List sourced record',
    }
    mocks.useReportRecords.mockReturnValue(
      buildRecordsState({
        records: [listRecord],
        selectedRecord: listRecord,
      }),
    )
    mocks.refreshReportRecord.mockResolvedValue({
      ...ercoRecord,
      displayId: 'ERCO-API',
      incidentType: 'API sourced record',
    })

    renderReportsRoute()

    expect(screen.getByText('ERCO-LIST')).toBeTruthy()
    expect(screen.getByText('List sourced record')).toBeTruthy()
    expect(screen.queryByText('ERCO-API')).toBeNull()
  })

  it('uses the shared chrome-free mobile Back action and returns detail to the mobile home', async () => {
    mocks.useReportRecords.mockReturnValue(
      buildRecordsState({
        records: [ercoRecord],
        selectedRecord: ercoRecord,
      }),
    )

    renderReportsRoute()

    const backButton = screen.getByRole('button', { name: 'Back' })
    expect(backButton.type).toBe('button')
    expect(backButton.className).toContain('back-button')
    expect(backButton.className).toContain('btn-link')
    expect(backButton.className).not.toContain('btn-outline')
    expect(backButton.className).toContain('inspection-header-back-btn')
    expect(backButton.className).toContain('inspection-compact-action-btn')
    expect(backButton.className).toContain('d-md-none')
    expect(backButton.querySelector('.lucide-arrow-left')?.getAttribute('width')).toBe('18')

    fireEvent.click(backButton)

    await waitFor(() => expect(screen.getByTestId('erco-mobile-home')).toBeTruthy())
  })

  it('discarding dirty form changes does not delete the saved draft', () => {
    const pendingAction = vi.fn()
    const removeDraft = vi.fn()
    mocks.useReportRouteActions.mockReturnValue(
      buildRouteActions({
        showDiscard: true,
        pendingAction,
        removeDraft,
      }),
    )

    renderReportsRoute('/report/erco')

    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))

    expect(removeDraft).not.toHaveBeenCalled()
    expect(pendingAction).toHaveBeenCalled()
  })

  it('clears workflow validation errors when the user corrects the modal inputs', () => {
    const setWorkflowRemarks = vi.fn()
    const setWorkflowDeclarationChecked = vi.fn()
    mocks.useReportRouteActions.mockReturnValue(
      buildRouteActions({
        setWorkflowRemarks,
        setWorkflowDeclarationChecked,
        workflowActionState: {
          visible: true,
          actionType: 'reject',
          record: ercoRecord,
        },
        workflowDeclarationError: 'Confirmation is required.',
        workflowRejectError: 'Remarks are required.',
      }),
    )

    renderReportsRoute('/report/erco')

    fireEvent.change(screen.getByRole('textbox', { name: 'Workflow remarks' }), {
      target: { value: 'Corrected rejection reason' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Workflow declaration' }))

    expect(setWorkflowRemarks).toHaveBeenCalledWith('Corrected rejection reason')
    expect(mocks.setWorkflowRejectError).toHaveBeenCalledWith('')
    expect(setWorkflowDeclarationChecked).toHaveBeenCalledWith(true)
    expect(mocks.setWorkflowDeclarationError).toHaveBeenCalledWith('')
  })
})
