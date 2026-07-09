// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useReportRouteActions from '../useReportRouteActions'

vi.mock('../../reportStorage', () => ({
  clearReportDraft: vi.fn(async () => true),
  createErcoDraft: vi.fn(),
  deleteErcoDraft: vi.fn(async () => true),
  listErcoDrafts: vi.fn(async () => []),
  loadReportDraft: vi.fn(async () => null),
  saveReportDraft: vi.fn(async () => true),
  updateErcoDraft: vi.fn(),
}))

vi.mock('../../reportApi', () => ({
  deleteReportRecord: vi.fn(),
  downloadDrillReportPdf: vi.fn(),
  downloadErcoReportPdf: vi.fn(),
  isReportApiEnabled: () => false,
}))

vi.mock('../useReportWorkflowActions', () => ({
  default: () => ({
    canApproveRecord: () => false,
    canRejectRecord: () => false,
    canReviewRecord: () => false,
    closeWorkflowActionModal: vi.fn(),
    isActionBusy: false,
    setWorkflowDeclarationChecked: vi.fn(),
    setWorkflowRemarks: vi.fn(),
    submitWorkflowAction: vi.fn(),
    transitionApprove: vi.fn(),
    transitionReject: vi.fn(),
    transitionReview: vi.fn(),
    workflowActionState: { type: '', record: null },
    workflowDeclarationChecked: false,
    workflowDeclarationError: '',
    workflowRejectError: '',
    workflowRemarks: '',
  }),
}))

const baseProps = (overrides = {}) => ({
  activeFormSlug: 'fitness-test',
  activeSection: 'records',
  isFormDirty: false,
  location: { pathname: '/report/fitness-test', search: '', state: null },
  navigate: vi.fn(),
  persistRecords: vi.fn(async () => ({ saved: true, trimmed: false })),
  pushToast: vi.fn(),
  queryDraftId: '',
  records: [],
  reloadRecords: vi.fn(),
  reportBasePath: '/report/fitness-test',
  reportId: '',
  reportTypeLabel: 'Fitness Test',
  setActiveDraftRows: vi.fn(),
  setDraftVersion: vi.fn(),
  setFormSessionKey: vi.fn(),
  setIsFormDirty: vi.fn(),
  user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.fitness.view'] },
  ...overrides,
})

describe('useReportRouteActions', () => {
  it('limits edit/delete to admins, explicit permissions, or own report rows', () => {
    const ownRow = {
      id: 'fit-1',
      reportType: 'fitness-test',
      ownerUserId: 'user-1',
      status: 'Submitted',
    }
    const otherRow = {
      id: 'fit-2',
      reportType: 'fitness-test',
      ownerUserId: 'user-2',
      status: 'Submitted',
    }

    const { result, rerender } = renderHook((props) => useReportRouteActions(props), {
      initialProps: baseProps(),
    })

    expect(result.current.canEditRecord(ownRow)).toBe(true)
    expect(result.current.canDeleteRecord(ownRow)).toBe(true)
    expect(result.current.canEditRecord(otherRow)).toBe(false)
    expect(result.current.canDeleteRecord(otherRow)).toBe(false)

    rerender(baseProps({ user: { id: 'admin', roles: ['System Administrator'] } }))

    expect(result.current.canEditRecord(otherRow)).toBe(true)
    expect(result.current.canDeleteRecord(otherRow)).toBe(true)
  })

  it('stores update metadata and uses update feedback when submitting an existing report', async () => {
    const existing = {
      id: 'fit-1',
      displayId: 'FIT-001',
      reportType: 'fitness-test',
      ownerUserId: 'user-1',
      submittedAt: '2026-07-01T01:00:00.000Z',
      submittedBy: 'Alex Tan',
      version: 2,
      revision: 4,
      timeline: [{ id: 't-submitted', action: 'Submitted', by: 'Alex Tan' }],
    }
    const persistRecords = vi.fn(async () => ({ saved: true, trimmed: false }))
    const pushToast = vi.fn()
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          persistRecords,
          pushToast,
          records: [existing],
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        ...existing,
        summary: 'Updated result.',
        timeline: existing.timeline,
      })
    })

    await waitFor(() => expect(persistRecords).toHaveBeenCalled())
    const savedRows = persistRecords.mock.calls[0][0]
    expect(savedRows[0]).toEqual(
      expect.objectContaining({
        id: 'fit-1',
        ownerUserId: 'user-1',
        submittedAt: '2026-07-01T01:00:00.000Z',
        submittedBy: 'Alex Tan',
        updatedBy: 'Alex Tan',
        version: 3,
        revision: 5,
      }),
    )
    expect(savedRows[0].timeline.map((entry) => entry.action)).toContain('Updated')
    expect(pushToast).toHaveBeenCalledWith(
      'Fitness Test report FIT-001 updated.',
      expect.objectContaining({ title: 'Updated', color: 'success' }),
    )
  })
})
