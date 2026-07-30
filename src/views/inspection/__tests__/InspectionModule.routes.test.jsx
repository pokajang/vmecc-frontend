// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import InspectionModule from '../InspectionModule'

const inspectionHarness = vi.hoisted(() => {
  const baseRecord = {
    id: 'inspection-1',
    displayId: 'INSP-2026-001',
    status: 'Submitted',
    incidentType: 'General Inspection',
    location: 'Zone A',
    selectedLocation: 'Zone A',
    mainLocation: 'Zone A',
    ownerUserId: 'user-1',
    version: 2,
    photos: [],
    checklist: [{ id: 'hk', label: 'Housekeeping checked', selected: true }],
    description: 'Inspection summary',
    timeline: [],
  }

  return {
    baseRecord,
    records: [baseRecord],
    activeDraftRows: [],
    activeDraftPayload: null,
    offlineWorkspaceByUser: {},
    queuedRecordRows: [],
    queueSummary: { count: 0, failedCount: 0, syncingCount: 0, lastError: '' },
    offlineHealth: { warnings: [], localDraftExists: false },
    persistInspectionRecord: vi.fn(async () => true),
    downloadInspectionReportPdf: vi.fn(async () => ({
      blob: new Blob(),
      filename: 'inspection.pdf',
    })),
    saveInspectionDraft: vi.fn(async () => ({ saved: true, synced: false })),
    clearInspectionDraft: vi.fn(async () => true),
    refreshInspectionOfflineAssets: vi.fn(async () => true),
    openWorkflowActionModal: vi.fn(),
    closeWorkflowActionModal: vi.fn(),
    deleteQueuedSubmission: vi.fn(),
    reloadRecords: vi.fn(async () => true),
    useInspectionRecords: vi.fn(),
  }
})

const originalMatchMedia = window.matchMedia

const setViewportWidth = (width) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query) => ({
      matches: (() => {
        const minWidth = /\(min-width:\s*([\d.]+)px\)/.exec(query)
        if (minWidth) return width >= Number(minWidth[1])
        const maxWidth = /\(max-width:\s*([\d.]+)px\)/.exec(query)
        if (maxWidth) return width <= Number(maxWidth[1])
        return false
      })(),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

const setDesktopViewport = (isDesktop) => setViewportWidth(isDesktop ? 992 : 991)

vi.mock('src/components/ModulePageHeader', () => ({
  default: ({ title, actions }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
  ),
}))

vi.mock('src/components/ModuleNavTabs', () => ({
  default: ({ items = [], className = '' }) => (
    <div data-testid="module-nav-tabs" data-classname={className}>
      {items.map((item) => (
        <button key={item.key} type="button" data-active={item.active} onClick={item.onClick}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('src/components/TableLoader', () => ({
  default: ({ message = 'Loading...' }) => <div>{message}</div>,
}))

vi.mock('src/components/report-workflow/TypeManagerModal', () => ({
  default: () => null,
}))

vi.mock('../app/InspectionModuleHeaderActions', () => ({
  default: ({ onStartNew, showMobileBackAction, onMobileBack }) => (
    <div>
      <button type="button" onClick={onStartNew}>
        Start new
      </button>
      {showMobileBackAction ? (
        <button type="button" onClick={onMobileBack}>
          Mobile back
        </button>
      ) : null}
    </div>
  ),
}))

vi.mock('../InspectionRecordsSection', () => ({
  default: ({ filteredRecords = [], onViewRecord, startNew, onDeleteRecord }) => (
    <section>
      <div>Inspection records shell</div>
      <button type="button" onClick={startNew}>
        Records start new
      </button>
      {filteredRecords.map((row) => (
        <div key={row.id}>
          <span>{row.displayId}</span>
          <button type="button" onClick={() => onViewRecord(row.id)}>
            Open {row.displayId}
          </button>
          <button type="button" onClick={() => onDeleteRecord(row)}>
            Delete {row.displayId}
          </button>
        </div>
      ))}
    </section>
  ),
}))

vi.mock('../InspectionDetailSection', () => ({
  default: ({ selectedRecord, onBack, onEditRecord }) => (
    <section>
      <div>Inspection detail shell</div>
      <div>{selectedRecord?.displayId || 'Missing detail'}</div>
      <button type="button" onClick={onBack}>
        Back to records
      </button>
      <button type="button" onClick={() => onEditRecord(selectedRecord)}>
        Edit detail record
      </button>
    </section>
  ),
}))

vi.mock('../InspectionReviewSection', () => ({
  default: ({ selectedRecord, reviewActions, queueWarning = '' }) => (
    <section>
      <div>Inspection review shell</div>
      <div>{selectedRecord?.displayId || 'Missing review record'}</div>
      {queueWarning ? <div>{queueWarning}</div> : null}
      <button type="button" onClick={reviewActions?.onBackToEdit}>
        Back to Edit
      </button>
      <button type="button" onClick={reviewActions?.onSaveDraft}>
        Save Draft
      </button>
      <button type="button" onClick={reviewActions?.onConfirm}>
        {reviewActions?.confirmLabel || 'Confirm Submit'}
      </button>
    </section>
  ),
}))

vi.mock('../InspectionForm', () => ({
  default: ({ value, draftStatus = '', onChange, onRequestReview, onSaveDraft }) => (
    <section>
      <div>Inspection form shell</div>
      <div data-testid="form-type">{value?.inspectionType || 'No type'}</div>
      <div data-testid="form-location">
        {value?.selectedLocation || value?.mainLocation || '--'}
      </div>
      <div>{draftStatus}</div>
      <button
        type="button"
        onClick={() =>
          onChange?.({
            ...value,
            mainLocation: value?.mainLocation || 'Zone A',
            selectedLocation: value?.selectedLocation || value?.mainLocation || 'Zone A',
            inspectionType: value?.inspectionType || 'General Inspection',
            description: 'Dirty change',
          })
        }
      >
        Mutate form
      </button>
      <button type="button" onClick={() => onSaveDraft?.(value)}>
        Save draft
      </button>
      <button
        type="button"
        onClick={() =>
          onRequestReview?.({
            ...value,
            mainLocation: value?.mainLocation || 'Zone A',
            selectedLocation: value?.selectedLocation || value?.mainLocation || 'Zone A',
            inspectionType: value?.inspectionType || 'General Inspection',
            description: value?.description || 'Review payload',
          })
        }
      >
        Continue to Review
      </button>
    </section>
  ),
}))

vi.mock('../app/InspectionMobileHome', () => ({
  default: ({ onSelectType, onContinueDraft, onViewRecords, onViewExtinguishers }) => (
    <section>
      <div>Inspection mobile home</div>
      <button type="button" onClick={() => onSelectType('Hydraulic Rescue Tools Inspection')}>
        Start Hydraulic
      </button>
      <button type="button" onClick={onContinueDraft}>
        Continue draft
      </button>
      <button type="button" onClick={onViewRecords}>
        View records
      </button>
      {onViewExtinguishers ? (
        <button
          type="button"
          data-testid="inspection-all-extinguishers"
          onClick={onViewExtinguishers}
        >
          Open extinguisher catalogue
        </button>
      ) : null}
    </section>
  ),
}))

vi.mock('../app/InspectionConfirmModals', () => ({
  default: ({
    showDiscard,
    onConfirmDiscard,
    showDraftChoice,
    onCloseDraftChoice,
    onConfirmDraftChoice,
    deleteTarget,
    onConfirmDeleteTarget,
  }) => (
    <>
      {showDiscard ? (
        <div>
          <div>Discard changes modal</div>
          <button type="button" onClick={onConfirmDiscard}>
            Confirm discard
          </button>
        </div>
      ) : null}
      {showDraftChoice ? (
        <div>
          <div>Draft choice modal</div>
          <button type="button" onClick={onCloseDraftChoice}>
            Open saved draft
          </button>
          <button type="button" onClick={onConfirmDraftChoice}>
            Start blank
          </button>
        </div>
      ) : null}
      {deleteTarget ? (
        <div>
          <button type="button" onClick={onConfirmDeleteTarget}>
            Confirm delete
          </button>
        </div>
      ) : null}
    </>
  ),
}))

vi.mock('../app/InspectionContinuationModal', () => ({
  default: ({ prompt, onSelectLocation, onDismiss }) =>
    prompt ? (
      <div>
        <div>Continuation prompt</div>
        <button type="button" onClick={() => onSelectLocation({ value: 'Store' })}>
          Continue to Store
        </button>
        <button type="button" onClick={onDismiss}>
          Dismiss continuation
        </button>
      </div>
    ) : null,
}))

vi.mock('../app/InspectionQueueConflictModal', () => ({
  default: () => null,
}))

vi.mock('../ui/InspectionWorkflowActionModal', () => ({
  default: ({ visible }) => (visible ? <div>Workflow action modal</div> : null),
}))

vi.mock('../useIncidentTypeManager', () => ({
  INCIDENT_TYPE_TOGGLE_VALUE: '__inspection_toggle__',
  default: () => ({
    showAddTypeModal: false,
    closeAddModal: () => {},
    incidentEditMode: false,
    setIncidentEditMode: () => {},
    typeOptions: [
      { value: 'Hydraulic Rescue Tools Inspection', title: 'Hydraulic Rescue Tools Inspection' },
    ],
    visibleTypeOptions: [
      { value: 'Hydraulic Rescue Tools Inspection', title: 'Hydraulic Rescue Tools Inspection' },
    ],
    showAllIncidentTypes: false,
    setShowAllIncidentTypes: () => {},
    openAddModal: () => {},
    removeType: () => {},
    newTypeName: '',
    setNewTypeName: () => {},
    addTypeError: '',
    setAddTypeError: () => {},
    newTypeDescription: '',
    setNewTypeDescription: () => {},
    editingIncidentTypeKey: '',
    startEditType: () => {},
    saveType: () => {},
    iconOptions: [],
    newTypeIconKey: '',
    setNewTypeIconKey: () => {},
  }),
}))

vi.mock('../state/useInspectionDraftRows', () => ({
  default: () => ({
    setDraftVersion: vi.fn(),
    activeDraftRows: inspectionHarness.activeDraftRows,
    setActiveDraftRows: vi.fn(),
    activeDraftPayload: inspectionHarness.activeDraftPayload,
  }),
}))

vi.mock('../state/useInspectionQueueController', () => ({
  default: () => ({
    queueRows: inspectionHarness.queuedRecordRows,
    queuedRecordRows: inspectionHarness.queuedRecordRows,
    queueSummary: inspectionHarness.queueSummary,
    isQueueSyncing: false,
    refreshQueueRows: vi.fn(),
    syncQueuedSubmissions: vi.fn(),
    deleteQueuedSubmission: inspectionHarness.deleteQueuedSubmission,
    saveQueuedAsDraft: vi.fn(),
    keepServerConflict: vi.fn(),
    retryConflictWithLatest: vi.fn(),
  }),
}))

vi.mock('../state/useInspectionOfflineHealthController', () => ({
  default: () => ({
    offlineHealth: inspectionHarness.offlineHealth,
    isOfflineHealthLoading: false,
    isRefreshingOfflineAssets: false,
    setIsRefreshingOfflineAssets: vi.fn(),
    refreshOfflineHealth: vi.fn(),
  }),
}))

vi.mock('../state/useInspectionRecords', () => ({
  default: (options) => {
    inspectionHarness.useInspectionRecords(options)
    const { reportId, draftRows = [] } = options
    const rows = [...inspectionHarness.records, ...draftRows]
    const selectedRecord =
      rows.find((row) => String(row.id || '').trim() === String(reportId || '').trim()) || null
    return {
      records: inspectionHarness.records,
      loadError: null,
      isLoading: false,
      search: '',
      setSearch: vi.fn(),
      recordScope: 'mine',
      setRecordScope: vi.fn(),
      period: 'all',
      setPeriod: vi.fn(),
      sort: 'reportedAt:desc',
      setSort: vi.fn(),
      typeFilter: 'All',
      setTypeFilter: vi.fn(),
      statusFilter: 'All',
      setStatusFilter: vi.fn(),
      checklistFilter: 'All',
      setChecklistFilter: vi.fn(),
      hasChecklistFilter: 'All',
      setHasChecklistFilter: vi.fn(),
      scopedRecords: rows,
      filteredRecords: rows,
      selectedRecord,
      typeOptions: [{ value: 'All', label: 'All types' }],
      statusOptions: [{ value: 'All', label: 'All status' }],
      checklistOptions: [{ value: 'All', label: 'All checklist items' }],
      recordsInScopeCount: rows.length,
      rowsToShow: 20,
      setRowsToShow: vi.fn(),
      visibleRows: rows,
      clearFilters: vi.fn(),
      deleteRecord: vi.fn(async () => ({ saved: true })),
      reloadRecords: inspectionHarness.reloadRecords,
    }
  },
}))

vi.mock('../state/useInspectionUnsavedChangesGuard', () => ({
  default: () => {},
}))

vi.mock('../state/useInspectionWorkflowActions', () => ({
  default: () => ({
    workflowActionState: { visible: false, actionType: '', record: null },
    workflowRemarks: '',
    workflowDeclarationChecked: false,
    workflowDeclarationError: '',
    workflowRejectError: '',
    isActionBusy: false,
    canReviewRecord: () => false,
    canApproveRecord: () => false,
    canRejectRecord: () => false,
    closeWorkflowActionModal: inspectionHarness.closeWorkflowActionModal,
    openWorkflowActionModal: inspectionHarness.openWorkflowActionModal,
    handleWorkflowRemarksChange: vi.fn(),
    handleWorkflowDeclarationChange: vi.fn(),
    submitWorkflowAction: vi.fn(),
  }),
}))

vi.mock('../inspectionApi', () => ({
  downloadInspectionReportPdf: (...args) => inspectionHarness.downloadInspectionReportPdf(...args),
  persistInspectionRecord: (...args) => inspectionHarness.persistInspectionRecord(...args),
}))

vi.mock('../inspectionStorage', () => ({
  clearInspectionDraft: (...args) => inspectionHarness.clearInspectionDraft(...args),
  saveInspectionDraft: (...args) => inspectionHarness.saveInspectionDraft(...args),
}))

vi.mock('../inspectionOfflineStore', () => ({
  clearOfflineWorkspace: vi.fn((userId) => {
    delete inspectionHarness.offlineWorkspaceByUser[String(userId || 'unknown')]
  }),
  loadOfflineWorkspaceSync: vi.fn((userId) => {
    const workspace = inspectionHarness.offlineWorkspaceByUser[String(userId || 'unknown')]
    return workspace ? JSON.parse(JSON.stringify(workspace)) : null
  }),
  saveOfflineWorkspace: vi.fn((userId, workspace) => {
    inspectionHarness.offlineWorkspaceByUser[String(userId || 'unknown')] = JSON.parse(
      JSON.stringify(workspace || null),
    )
  }),
  loadOfflineDraftSync: vi.fn(() => null),
}))

vi.mock('../inspectionOfflineHealth', () => ({
  refreshInspectionOfflineAssets: (...args) =>
    inspectionHarness.refreshInspectionOfflineAssets(...args),
}))

vi.mock('../inspectionFormHelpers', () => {
  const defaultInspectionForm = {
    inspectionType: '',
    mainLocation: '',
    selectedLocation: '',
    description: '',
    photos: [],
  }

  const normalizeInspectionForm = (value = {}) => ({
    ...defaultInspectionForm,
    ...(value || {}),
  })

  return {
    defaultInspectionForm,
    normalizeInspectionForm,
    applySessionInspector: (form = {}, user = {}) => {
      const normalizedForm = normalizeInspectionForm(form)
      return {
        ...normalizedForm,
        inspectionActor: {
          userId: user?.id || normalizedForm.inspectionActor?.userId || null,
          name: user?.name || normalizedForm.inspectionActor?.name || '',
          email: user?.email || normalizedForm.inspectionActor?.email || '',
          role: user?.role || normalizedForm.inspectionActor?.role || '',
          roleCode: user?.roleCode || normalizedForm.inspectionActor?.roleCode || '',
        },
        submittedByRole: user?.role || normalizedForm.submittedByRole || '',
        submittedByRoleCode: user?.roleCode || normalizedForm.submittedByRoleCode || '',
      }
    },
    createInspectionFormSignature: (form) => JSON.stringify(normalizeInspectionForm(form)),
    buildInspectionDraftPayload: ({ form, mode, editReportId }) => ({
      ...normalizeInspectionForm(form),
      __draftMode: mode,
      __editReportId: editReportId,
    }),
    buildInspectionReviewRecord: ({ form, mode, editingRecord, sequence }) => ({
      id: editingRecord?.id || `inspection-review-${sequence || 1}`,
      displayId: editingRecord?.displayId || 'INSP-REVIEW-001',
      status: 'In Review',
      incidentType: form?.inspectionType || 'General Inspection',
      location: form?.selectedLocation || form?.mainLocation || 'Zone A',
      selectedLocation: form?.selectedLocation || form?.mainLocation || 'Zone A',
      mainLocation: form?.mainLocation || 'Zone A',
      description: form?.description || 'Review payload',
      photos: form?.photos || [],
      checklist: form?.checklist || [],
      hsePayloadVersion: form?.hsePayloadVersion,
      hseSelections: form?.hseSelections,
      hseUnsafeConditionDetails: form?.hseUnsafeConditionDetails,
      version: editingRecord?.version || 1,
      mode,
    }),
    buildInspectionSubmittedRecord: (record, user) => ({
      ...record,
      status: 'Submitted',
      submittedBy: user?.name || 'Inspector',
    }),
    getInspectionDraftMeta: (payload = {}) => ({
      mode: payload.__draftMode || 'new',
      editReportId: payload.__editReportId || '',
    }),
    selectInspectionInitialForm: ({
      routeMode,
      routeRecordId,
      workspace,
      draftPayload,
      record,
    }) => {
      if (workspace?.form) {
        return {
          source: 'workspace',
          form: normalizeInspectionForm(workspace.form),
        }
      }
      if (draftPayload) {
        return {
          source: 'draft',
          form: normalizeInspectionForm(draftPayload),
        }
      }
      if (routeMode === 'edit' && record) {
        return {
          source: 'record',
          form: normalizeInspectionForm({
            id: routeRecordId,
            displayId: record.displayId,
            inspectionType: record.incidentType,
            mainLocation: record.mainLocation || record.selectedLocation || record.location,
            selectedLocation: record.selectedLocation || record.location,
            description: record.description || '',
          }),
        }
      }
      return {
        source: 'default',
        form: normalizeInspectionForm(defaultInspectionForm),
      }
    },
  }
})

vi.mock('../inspectionContinuation', () => ({
  buildInspectionContinuationForm: ({ inspectionType, mainLocation }) => ({
    inspectionType,
    mainLocation,
    selectedLocation: mainLocation,
    description: '',
    photos: [],
  }),
  buildInspectionContinuationPrompt: vi.fn(() => null),
}))

vi.mock('../app/inspectionModuleUtils', () => ({
  REPORT_WORKFLOW_DECLARATION_LABEL: 'Declaration',
  buildInspectionPdfFilename: () => 'inspection.pdf',
  buildQueueConflictFields: () => [],
  copyTextToClipboard: vi.fn(async () => true),
  formatSelectedChecklistLabels: () => '',
  statusToneMap: {
    submitted: 'primary',
    reviewed: 'info',
    approved: 'success',
    rejected: 'danger',
  },
}))

const LocationProbe = () => {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <div data-testid="location-path">{location.pathname}</div>
      <button type="button" onClick={() => navigate(-1)}>
        Browser back
      </button>
    </>
  )
}

const renderModule = (initialPath = '/inspection') => {
  const authUser = {
    id: 'user-1',
    name: 'Inspector One',
    email: 'inspector@example.test',
    permissions: [
      'reports.inspection.view',
      'reports.inspection.conduct',
      'reports.inspection.extinguishers.manage',
    ],
  }
  const store = createStore((state = { authUser }) => state)

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationProbe />
        <Routes>
          <Route path="/inspection" element={<InspectionModule />} />
          <Route path="/inspection/new" element={<InspectionModule />} />
          <Route path="/inspection/new/:newSection" element={<InspectionModule />} />
          <Route path="/inspection/review" element={<InspectionModule />} />
          <Route path="/inspection/all-extinguishers" element={<InspectionModule />} />
          <Route path="/inspection/all-extinguishers/new" element={<InspectionModule />} />
          <Route
            path="/inspection/all-extinguishers/:extinguisherId"
            element={<InspectionModule />}
          />
          <Route path="/inspection/:reportId/edit" element={<InspectionModule />} />
          <Route path="/inspection/:reportId" element={<InspectionModule />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

beforeEach(() => {
  setDesktopViewport(true)
  sessionStorage.clear()
  inspectionHarness.records = [{ ...inspectionHarness.baseRecord }]
  inspectionHarness.activeDraftRows = []
  inspectionHarness.activeDraftPayload = null
  inspectionHarness.offlineWorkspaceByUser = {}
  inspectionHarness.queuedRecordRows = []
  inspectionHarness.queueSummary = { count: 0, failedCount: 0, syncingCount: 0, lastError: '' }
  inspectionHarness.offlineHealth = { warnings: [], localDraftExists: false }
  inspectionHarness.persistInspectionRecord.mockClear()
  inspectionHarness.downloadInspectionReportPdf.mockClear()
  inspectionHarness.saveInspectionDraft.mockClear()
  inspectionHarness.clearInspectionDraft.mockClear()
  inspectionHarness.refreshInspectionOfflineAssets.mockClear()
  inspectionHarness.openWorkflowActionModal.mockClear()
  inspectionHarness.closeWorkflowActionModal.mockClear()
  inspectionHarness.deleteQueuedSubmission.mockClear()
  inspectionHarness.reloadRecords.mockClear()
  inspectionHarness.useInspectionRecords.mockClear()
})

afterEach(() => {
  cleanup()
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    })
  } else {
    delete window.matchMedia
  }
})

describe('InspectionModule route family', () => {
  it.each([
    [390, true],
    [991, true],
    [992, true],
  ])('keeps the All Extinguishers route available at %ipx', (width, isAvailable) => {
    setViewportWidth(width)
    renderModule('/inspection')

    expect(screen.getAllByRole('button', { name: 'All Extinguishers' }).length > 0).toBe(
      isAvailable,
    )
  })

  it('keeps the desktop tab strip visually hidden on mobile', () => {
    setDesktopViewport(false)
    renderModule('/inspection')

    expect(screen.getByTestId('module-nav-tabs').getAttribute('data-classname')).toContain(
      'd-none d-md-flex',
    )
  })

  it('keeps the extinguisher catalogue out of the focused mobile inspection home', () => {
    setViewportWidth(390)
    renderModule('/inspection')

    expect(screen.queryByTestId('inspection-all-extinguishers')).toBeNull()
    expect(screen.getByTestId('location-path').textContent).toBe('/inspection')
  })

  it.each(['/inspection/all-extinguishers', '/inspection/all-extinguishers/new'])(
    'keeps the responsive extinguisher route open on mobile: %s',
    (path) => {
      setDesktopViewport(false)
      renderModule(path)

      expect(screen.getByTestId('location-path').textContent).toBe(path)
      expect(screen.getByTestId('all-extinguishers-section-mobile')).toBeTruthy()
      expect(screen.queryByText('Inspection records shell')).toBeNull()
    },
  )

  it('passes action-queue filters to the inspection records hook', () => {
    renderModule('/inspection?scope=actionable&action=approve')

    expect(inspectionHarness.useInspectionRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        actionFilter: 'approve',
        initialStatusFilter: 'All',
      }),
    )
  })

  it('passes returned inspections to the rejected status filter', () => {
    renderModule('/inspection?status=Rejected')

    expect(inspectionHarness.useInspectionRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        actionFilter: '',
        initialStatusFilter: 'Rejected',
      }),
    )
  })

  it('keeps the desktop module heading stable while mobile headings follow the active section', async () => {
    renderModule('/inspection')

    const heading = screen.getByRole('heading', { level: 1 })
    const desktopHeading = () => heading.querySelector('.d-none.d-md-inline')
    const mobileHeading = () => heading.querySelector('.d-md-none')

    expect(desktopHeading()?.textContent).toBe('Inspection')
    expect(mobileHeading()?.textContent).toBe('Conduct Inspection')

    fireEvent.click(screen.getByRole('button', { name: 'All Extinguishers' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/all-extinguishers'),
    )

    expect(desktopHeading()?.textContent).toBe('Inspection')
    expect(mobileHeading()?.textContent).toBe('All Extinguishers')

    fireEvent.click(screen.getByRole('button', { name: 'Conduct Inspection' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/new'),
    )

    expect(desktopHeading()?.textContent).toBe('Inspection')
    expect(mobileHeading()?.textContent).toBe('Conduct Inspection')
  })

  it('opens the All Extinguishers tab without treating it as a detail record', async () => {
    renderModule('/inspection')

    fireEvent.click(screen.getByRole('button', { name: 'All Extinguishers' }))

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/all-extinguishers'),
    )
    expect(screen.getByRole('button', { name: 'All Extinguishers' }).dataset.active).toBe('true')
    expect(screen.getByTestId('all-extinguishers-section')).toBeTruthy()
    expect(screen.queryByText('Inspection detail shell')).toBeNull()
  })

  it('keeps the extinguisher catalogue active behind the route-backed add drawer', () => {
    renderModule('/inspection/all-extinguishers/new')

    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.querySelector('.d-none.d-md-inline')?.textContent).toBe('Inspection')
    expect(heading.querySelector('.d-md-none')?.textContent).toBe('All Extinguishers')
    expect(screen.getByRole('button', { name: 'All Extinguishers' }).dataset.active).toBe('true')
    expect(screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })).toBeTruthy()
    expect(screen.queryByText('Inspection detail shell')).toBeNull()
  })

  it('preserves extinguisher filters when the add route opens and closes', async () => {
    renderModule('/inspection/all-extinguishers')

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'CAN-010' },
    })
    const catalogue = screen.getByTestId('all-extinguishers-section')
    fireEvent.click(within(catalogue).getByRole('button', { name: 'Add Extinguisher' }))

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe(
        '/inspection/all-extinguishers/new',
      ),
    )
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Add Fire Extinguisher' })).getByRole('button', {
        name: 'Cancel',
      }),
    )

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/all-extinguishers'),
    )
    expect(screen.getAllByDisplayValue('CAN-010').length).toBeGreaterThan(0)
  })

  it('preserves extinguisher filters when browser Back closes the add route', async () => {
    renderModule('/inspection/all-extinguishers')

    fireEvent.change(screen.getAllByPlaceholderText('Search extinguishers')[1], {
      target: { value: 'CAN-BACK' },
    })
    fireEvent.click(
      within(screen.getByTestId('all-extinguishers-section')).getByRole('button', {
        name: 'Add Extinguisher',
      }),
    )

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe(
        '/inspection/all-extinguishers/new',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Browser back' }))

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/all-extinguishers'),
    )
    expect(screen.getAllByDisplayValue('CAN-BACK').length).toBeGreaterThan(0)
  })

  it('opens a detail route from the records shell', async () => {
    renderModule('/inspection')

    expect(screen.getByText('Inspection records shell')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open INSP-2026-001' }))

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/inspection-1'),
    )
    expect(screen.getByText('Inspection detail shell')).toBeTruthy()
    expect(screen.getByText('INSP-2026-001')).toBeTruthy()
  })

  it('starts a new inspection, enters review, and returns to the new route', async () => {
    renderModule('/inspection')

    fireEvent.click(screen.getByRole('button', { name: 'Start new' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/new'),
    )
    expect(screen.getByText('Inspection form shell')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Review' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/review'),
    )
    expect(screen.getByText('Inspection review shell')).toBeTruthy()
    await waitFor(() =>
      expect(inspectionHarness.saveInspectionDraft).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          inspectionType: 'General Inspection',
          description: 'Review payload',
        }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to Edit' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/new'),
    )
    expect(screen.getByText('Inspection form shell')).toBeTruthy()
  })

  it('persists each form edit locally before the user can leave the route', () => {
    renderModule('/inspection/new')

    fireEvent.click(screen.getByRole('button', { name: 'Mutate form' }))

    expect(JSON.parse(sessionStorage.getItem('inspection_workspace_v1_user-1'))).toMatchObject({
      mode: 'new',
      recordId: '',
      form: {
        inspectionType: 'General Inspection',
        description: 'Dirty change',
      },
    })
  })

  it('returns to the edit route when backing out of review for an existing record', async () => {
    renderModule('/inspection/inspection-1/edit')

    expect(screen.getByText('Inspection form shell')).toBeTruthy()
    expect(screen.getByTestId('form-type').textContent).toBe('General Inspection')

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Review' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/review'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to Edit' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/inspection-1/edit'),
    )
  })

  it('updates an existing inspection record from the edit review flow', async () => {
    renderModule('/inspection/inspection-1/edit')

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Review' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/review'),
    )

    expect(screen.getByText('INSP-2026-001')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Update' }))

    await waitFor(() =>
      expect(inspectionHarness.persistInspectionRecord).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          id: 'inspection-1',
          displayId: 'INSP-2026-001',
          version: 2,
          status: 'Submitted',
        }),
        expect.objectContaining({
          submissionKey: expect.any(String),
        }),
      ),
    )
  })

  it('submits a reviewed inspection and returns to the records route', async () => {
    renderModule('/inspection/new')

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Review' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/review'),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Submit' }))

    await waitFor(() =>
      expect(inspectionHarness.persistInspectionRecord).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          displayId: 'INSP-REVIEW-001',
          status: 'Submitted',
          submittedBy: 'Inspector One',
        }),
        expect.objectContaining({
          submissionKey: expect.any(String),
        }),
      ),
    )
    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/inspection'))
    expect(inspectionHarness.clearInspectionDraft).toHaveBeenCalled()
  })

  it('persists a direct HSE v2 submission as submitted instead of draft', async () => {
    const workspace = {
      mode: 'new',
      recordId: '',
      form: {
        inspectionType: 'Health Safety Environment Inspection',
        hsePayloadVersion: 2,
        hseSelections: ['unsafeCondition'],
        hseUnsafeConditionDetails: 'Open edge without a protective barrier.',
        mainLocation: 'Zone A',
        selectedLocation: 'Zone A',
        photos: [{ id: 'hse-photo', url: 'data:image/png;base64,QUFB' }],
      },
    }
    inspectionHarness.offlineWorkspaceByUser['user-1'] = workspace
    sessionStorage.setItem('inspection_workspace_v1_user-1', JSON.stringify(workspace))
    renderModule('/inspection/new')

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Review' }))

    await waitFor(() =>
      expect(inspectionHarness.persistInspectionRecord).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          status: 'Submitted',
          submittedBy: 'Inspector One',
          hsePayloadVersion: 2,
          hseSelections: ['unsafeCondition'],
        }),
        expect.objectContaining({ submissionKey: expect.any(String) }),
      ),
    )
    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/inspection'))
    expect(inspectionHarness.clearInspectionDraft).toHaveBeenCalledWith('user-1')
  })

  it('blocks leaving a dirty form until discard is confirmed', async () => {
    renderModule('/inspection/new')

    fireEvent.click(screen.getByRole('button', { name: 'Mutate form' }))
    fireEvent.click(screen.getByRole('button', { name: 'Records' }))

    expect(screen.getByText('Discard changes modal')).toBeTruthy()
    expect(screen.getByTestId('location-path').textContent).toBe('/inspection/new')

    fireEvent.click(screen.getByRole('button', { name: 'Confirm discard' }))
    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/inspection'))
  })

  it('opens the draft-choice path before starting new work when a draft exists', async () => {
    inspectionHarness.activeDraftRows = [
      {
        id: 'draft-inspection-new',
        displayId: 'Draft',
        recordKind: 'draft',
      },
    ]

    renderModule('/inspection')

    fireEvent.click(screen.getByRole('button', { name: 'Start new' }))
    expect(screen.getByText('Draft choice modal')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open saved draft' }))
    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/new'),
    )
  })

  it('opens the mobile continue-draft card with draft data loaded in the form', async () => {
    const draftPayload = {
      __draftMode: 'new',
      formVersion: 'inspection',
      incidentType: 'Fire Extinguisher Inspection',
      mainLocation: 'Manjung Hub',
      selectedLocation: 'Zone 1 > Manjung Hub > Reception',
      description: 'Draft fire extinguisher payload',
    }
    inspectionHarness.activeDraftPayload = draftPayload
    inspectionHarness.activeDraftRows = [
      {
        id: 'draft-inspection-new',
        displayId: 'Draft',
        recordKind: 'draft',
        __rawDraftPayload: draftPayload,
      },
    ]

    renderModule('/inspection')

    fireEvent.click(screen.getByRole('button', { name: 'Continue draft' }))

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/inspection/new'),
    )
    expect(screen.getByText('Inspection form shell')).toBeTruthy()
    expect(screen.getByTestId('form-type').textContent).toBe('Fire Extinguisher Inspection')
    expect(screen.getByTestId('form-location').textContent).toBe('Manjung Hub')
  })
})
