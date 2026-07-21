// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useReportRouteActions from '../useReportRouteActions'
import { clearReportDraft, deleteErcoDraft, deleteReportDraft } from '../../reportStorage'

vi.mock('../../reportStorage', () => ({
  clearReportDraft: vi.fn(async () => true),
  createErcoDraft: vi.fn(),
  deleteErcoDraft: vi.fn(async () => true),
  deleteReportDraft: vi.fn(async () => true),
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
  activeDraftRows: [],
  isFormDirty: false,
  location: { pathname: '/report/fitness-test', search: '', state: null },
  navigate: vi.fn(),
  persistRecord: vi.fn(async (row) => ({ saved: true, record: { ...row, version: 1 } })),
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
  beforeEach(() => vi.clearAllMocks())

  it('submits one ERCO record without passing sibling reports to bulk persistence', async () => {
    const sibling = {
      id: 'erco-reviewed',
      displayId: 'ERCO-REVIEWED',
      reportType: 'erco',
      status: 'Reviewed',
      version: 7,
    }
    const persistRecord = vi.fn(async (row) => ({ saved: true, record: { ...row, version: 1 } }))
    const persistRecords = vi.fn()
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'erco',
          reportBasePath: '/report/erco',
          reportTypeLabel: 'ERCO',
          persistRecord,
          persistRecords,
          records: [sibling],
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.erco.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'erco-new',
        displayId: 'ERCO-NEW',
        reportType: 'erco',
        status: 'Submitted',
        submissionKey: 'erco-submit-stable',
        sourceDraftId: 'drf_erco_resumed',
      })
    })

    await waitFor(() => expect(persistRecord).toHaveBeenCalledTimes(1))
    expect(persistRecord.mock.calls[0][0].id).toBe('erco-new')
    expect(persistRecord.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        isUpdate: false,
        submissionKey: 'erco-submit-stable',
        sourceDraftId: 'drf_erco_resumed',
      }),
    )
    expect(deleteErcoDraft).toHaveBeenCalledWith('user-1', 'drf_erco_resumed')
    expect(persistRecords).not.toHaveBeenCalled()
    expect(sibling).toEqual(expect.objectContaining({ status: 'Reviewed', version: 7 }))
  })

  it('keeps the resumed ERCO draft identity while moving from analysis to review', () => {
    const navigate = vi.fn()
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'erco',
          reportBasePath: '/report/erco',
          reportTypeLabel: 'ERCO',
          location: {
            pathname: '/report/erco/new/analysis',
            search: '?draft=drf_erco_resumed',
            state: null,
          },
          queryDraftId: 'drf_erco_resumed',
          navigate,
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.erco.view'] },
        }),
      ),
    )

    act(() => {
      result.current.requestReview(
        { id: 'erco-new', reportType: 'erco', status: 'Submitted' },
        'analysis',
      )
    })

    expect(navigate).toHaveBeenCalledWith('/report/erco/new/review?draft=drf_erco_resumed', {
      state: {
        reviewRecord: expect.objectContaining({ sourceDraftId: 'drf_erco_resumed' }),
        reviewBackSection: 'analysis',
      },
    })
  })

  it('submits one Drill record without rewriting an approved Drill sibling', async () => {
    const persistRecord = vi.fn(async (row) => ({ saved: true, record: { ...row, version: 1 } }))
    const persistRecords = vi.fn()
    const sibling = {
      id: 'drill-approved',
      reportType: 'drill',
      status: 'Approved',
      version: 9,
    }
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'drill',
          reportBasePath: '/report/drill',
          reportTypeLabel: 'Drill',
          persistRecord,
          persistRecords,
          records: [sibling],
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.drill.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'drill-new',
        displayId: 'DRILL-NEW',
        reportType: 'drill',
        status: 'Submitted',
        submissionKey: 'drill-submit-stable',
      })
    })

    await waitFor(() => expect(persistRecord).toHaveBeenCalledTimes(1))
    expect(persistRecords).not.toHaveBeenCalled()
    expect(sibling).toEqual(expect.objectContaining({ status: 'Approved', version: 9 }))
  })

  it('keeps a successful ERCO submission successful when exact draft cleanup fails', async () => {
    deleteErcoDraft.mockRejectedValueOnce(new Error('Network unavailable'))
    const navigate = vi.fn()
    const pushToast = vi.fn()
    const persistRecord = vi.fn(async (row) => ({ saved: true, record: { ...row, version: 1 } }))
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'erco',
          reportBasePath: '/report/erco',
          reportTypeLabel: 'ERCO',
          queryDraftId: 'drf_erco_1',
          navigate,
          pushToast,
          persistRecord,
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.erco.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'erco-new',
        displayId: 'ERCO-NEW',
        reportType: 'erco',
        status: 'Submitted',
        submissionKey: 'erco-submit-stable',
      })
    })

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/report/erco'))
    expect(pushToast).toHaveBeenCalledWith(
      'Report saved, but the old draft could not be removed. You can delete it later.',
      expect.objectContaining({ title: 'Draft cleanup pending', color: 'warning' }),
    )
  })

  it('does not perform type-wide draft cleanup for Drill when no source draft id exists', async () => {
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'drill',
          reportBasePath: '/report/drill',
          reportTypeLabel: 'Drill',
          queryDraftId: '',
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.drill.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'drill-new',
        displayId: 'DRILL-NEW',
        reportType: 'drill',
        status: 'Submitted',
        submissionKey: 'drill-submit-stable',
      })
    })

    expect(clearReportDraft).not.toHaveBeenCalled()
    expect(deleteErcoDraft).not.toHaveBeenCalled()
  })

  it('clears one Drill draft record during submit when draft exists without a draft id identity', async () => {
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'drill',
          reportBasePath: '/report/drill',
          reportTypeLabel: 'Drill',
          activeDraftRows: [{ draftId: '', displayId: 'Drill draft' }],
          queryDraftId: '',
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.drill.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'drill-new',
        displayId: 'DRILL-NEW',
        reportType: 'drill',
        status: 'Submitted',
        submissionKey: 'drill-submit-stable',
      })
    })

    expect(clearReportDraft).toHaveBeenCalledWith('user-1', 'drill')
    expect(deleteErcoDraft).not.toHaveBeenCalled()
  })

  it('removes one Drill draft by active draft id fallback when source draft id is missing', async () => {
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'drill',
          reportBasePath: '/report/drill',
          reportTypeLabel: 'Drill',
          activeDraftRows: [{ draftId: 'drf_drill_fallback', displayId: 'Drill fallback draft' }],
          queryDraftId: '',
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.drill.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'drill-new',
        displayId: 'DRILL-NEW',
        reportType: 'drill',
        status: 'Submitted',
        submissionKey: 'drill-submit-stable',
      })
    })

    expect(deleteReportDraft).toHaveBeenCalledWith('user-1', 'drf_drill_fallback')
    expect(clearReportDraft).not.toHaveBeenCalled()
    expect(deleteErcoDraft).not.toHaveBeenCalled()
  })

  it('removes one Drill draft by draft id during submit when draft identity is known', async () => {
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'drill',
          reportBasePath: '/report/drill',
          reportTypeLabel: 'Drill',
          queryDraftId: 'drf_drill_resumed',
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.drill.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'drill-new',
        displayId: 'DRILL-NEW',
        reportType: 'drill',
        status: 'Submitted',
        submissionKey: 'drill-submit-stable',
        sourceDraftId: 'drf_drill_resumed',
      })
    })

    expect(deleteReportDraft).toHaveBeenCalledWith('user-1', 'drf_drill_resumed')
    expect(clearReportDraft).not.toHaveBeenCalled()
  })

  it('does not clear unrelated ERCO drafts when the submitted report has no source draft', async () => {
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'erco',
          reportBasePath: '/report/erco',
          reportTypeLabel: 'ERCO',
          queryDraftId: '',
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.erco.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'erco-new',
        displayId: 'ERCO-NEW',
        reportType: 'erco',
        status: 'Submitted',
        submissionKey: 'erco-submit-stable',
      })
    })

    expect(clearReportDraft).not.toHaveBeenCalled()
  })

  it('removes one Fitness draft by draft id during submit when draft identity is known', async () => {
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'fitness-test',
          reportBasePath: '/report/fitness-test',
          reportTypeLabel: 'Fitness Test',
          queryDraftId: 'drf_fitness_resumed',
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.fitness.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'fitness-new',
        displayId: 'FIT-NEW',
        reportType: 'fitness-test',
        status: 'Submitted',
        submissionKey: 'fitness-submit-stable',
        sourceDraftId: 'drf_fitness_resumed',
      })
    })

    expect(deleteReportDraft).toHaveBeenCalledWith('user-1', 'drf_fitness_resumed')
    expect(clearReportDraft).not.toHaveBeenCalledWith('user-1', 'fitness-test')
  })

  it('removes one Fitness draft by active draft id fallback when source draft id is missing', async () => {
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          activeFormSlug: 'fitness-test',
          reportBasePath: '/report/fitness-test',
          reportTypeLabel: 'Fitness Test',
          activeDraftRows: [
            { draftId: 'drf_fitness_fallback', displayId: 'Fitness fallback draft' },
          ],
          queryDraftId: '',
          user: { id: 'user-1', name: 'Alex Tan', permissions: ['reports.fitness.view'] },
        }),
      ),
    )

    await act(async () => {
      result.current.confirmReviewSubmit({
        id: 'fitness-new',
        displayId: 'FIT-NEW',
        reportType: 'fitness-test',
        status: 'Submitted',
        submissionKey: 'fitness-submit-stable',
      })
    })

    expect(deleteReportDraft).toHaveBeenCalledWith('user-1', 'drf_fitness_fallback')
    expect(clearReportDraft).not.toHaveBeenCalledWith('user-1', 'fitness-test')
  })

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

  it('updates one Fitness report using the current server version without client-side revision edits', async () => {
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
    const persistRecord = vi.fn(async (row) => ({
      saved: true,
      record: { ...row, version: 3, revision: 5 },
    }))
    const persistRecords = vi.fn()
    const pushToast = vi.fn()
    const { result } = renderHook(() =>
      useReportRouteActions(
        baseProps({
          persistRecords,
          persistRecord,
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

    await waitFor(() => expect(persistRecord).toHaveBeenCalled())
    const savedRow = persistRecord.mock.calls[0][0]
    expect(savedRow).toEqual(
      expect.objectContaining({
        id: 'fit-1',
        ownerUserId: 'user-1',
        submittedAt: '2026-07-01T01:00:00.000Z',
        submittedBy: 'Alex Tan',
        version: 2,
        revision: 4,
      }),
    )
    expect(persistRecord.mock.calls[0][1]).toEqual(
      expect.objectContaining({ isUpdate: true, expectedVersion: 2 }),
    )
    expect(persistRecords).not.toHaveBeenCalled()
    expect(pushToast).toHaveBeenCalledWith(
      'Fitness Test report FIT-001 updated.',
      expect.objectContaining({ title: 'Updated', color: 'success' }),
    )
  })
})
