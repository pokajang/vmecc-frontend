import { describe, expect, it, vi } from 'vitest'
import {
  saveInspectionDraftAction,
  submitInspectionRecordAction,
} from '../app/inspectionModuleActions'

const buildDraftActionHarness = ({ saveResult, saveError } = {}) => {
  let draftVersion = 1
  const sessionForm = {
    inspectionType: 'General Inspection',
    description: 'Checked walkway.',
  }
  const payload = {
    reportType: 'inspection',
    payload: sessionForm,
  }
  const saveInspectionDraft = vi.fn(async () => {
    if (saveError) throw saveError
    return saveResult
  })
  const setDraftVersion = vi.fn((updater) => {
    draftVersion = typeof updater === 'function' ? updater(draftVersion) : updater
  })
  const args = {
    nextForm: { inspectionType: 'General Inspection' },
    context: null,
    loadWorkspace: vi.fn(() => ({ mode: 'new', recordId: '' })),
    userId: 7,
    routeMode: 'new',
    routeRecordId: '',
    applySessionInspector: vi.fn(() => sessionForm),
    user: { id: 7, name: 'Inspector' },
    buildInspectionDraftPayload: vi.fn(() => payload),
    saveInspectionDraft,
    createInspectionFormSignature: vi.fn(() => 'signature-after-save'),
    lastPersistedSignatureRef: { current: 'signature-before-save' },
    setIsFormDirty: vi.fn(),
    setDraftVersion,
    setDraftStatus: vi.fn(),
    pushToast: vi.fn(),
  }

  return {
    args,
    getDraftVersion: () => draftVersion,
  }
}

const buildSubmitActionHarness = ({
  record,
  editingRecord = null,
  persistError,
  inspectSessionError,
} = {}) => {
  const draftRecord = {
    id: 'inspection-record-1',
    displayId: 'INS-1',
    inspectionType: 'FRT Daily Inspection',
    version: 0,
    ...record,
  }
  const persistInspectionRecord = vi.fn(async () => {
    if (persistError) throw persistError
    return { displayId: 'INS-1' }
  })
  const submitInspectionSessionReport = vi.fn(async () => {
    if (inspectSessionError) throw inspectSessionError
    return { displayId: 'INS-1' }
  })
  const submitLockRef = { current: false }
  const clearInspectionDraft = vi.fn()
  const refreshQueueRows = vi.fn()
  const clearWorkingState = vi.fn()
  const setDraftVersion = vi.fn((updater) => (typeof updater === 'function' ? updater(1) : updater))
  const setIsSubmitting = vi.fn()
  const pushToast = vi.fn()
  const enqueueInspectionSubmission = vi.fn(() => null)
  const args = {
    record: draftRecord,
    submitLockRef,
    setIsSubmitting,
    makeInspectionSubmissionKey: vi.fn(() => 'inspection-submission-key'),
    userId: 7,
    persistInspectionRecord,
    submitInspectionSessionReport,
    prepareContinuationPrompt: vi.fn(() => null),
    reloadRecords: vi.fn(),
    clearInspectionDraft,
    setDraftVersion,
    clearWorkingState,
    pushToast,
    reportTypeLabel: 'Inspection',
    navigate: vi.fn(),
    reportBasePath: '/inspection',
    setContinuationPrompt: vi.fn(),
    isInspectionQueueableError: vi.fn((error) => Number(error?.status || 0) >= 500),
    enqueueInspectionSubmission,
    editingRecord,
    refreshQueueRows,
    onSubmitted: vi.fn(),
  }

  return {
    args,
    draftRecord,
    submitInspectionSessionReport,
    persistInspectionRecord,
    enqueueInspectionSubmission,
    pushToast,
    setIsSubmitting,
    clearWorkingState,
    clearInspectionDraft,
    refreshQueueRows,
    setDraftVersion,
  }
}

describe('saveInspectionDraftAction', () => {
  it('sets inline synced status without showing a success toast', async () => {
    const { args, getDraftVersion } = buildDraftActionHarness({
      saveResult: { saved: true, synced: true },
    })

    const result = await saveInspectionDraftAction(args)

    expect(result).toEqual({ saved: true, synced: true })
    expect(args.setDraftStatus).toHaveBeenCalledWith('Draft synced')
    expect(args.pushToast).not.toHaveBeenCalled()
    expect(args.setIsFormDirty).toHaveBeenCalledWith(false)
    expect(args.lastPersistedSignatureRef.current).toBe('signature-after-save')
    expect(getDraftVersion()).toBe(2)
  })

  it('sets inline backend-pending status without showing an offline success toast', async () => {
    const { args } = buildDraftActionHarness({
      saveResult: { saved: true, synced: false },
    })

    const result = await saveInspectionDraftAction(args)

    expect(result).toEqual({ saved: true, synced: false })
    expect(args.setDraftStatus).toHaveBeenCalledWith('Saved locally. Backend sync pending')
    expect(args.pushToast).not.toHaveBeenCalled()
  })

  it('keeps danger toast feedback when draft save returns an unsaved result', async () => {
    const { args } = buildDraftActionHarness({
      saveResult: { saved: false, synced: false },
    })

    const result = await saveInspectionDraftAction(args)

    expect(result).toBe(false)
    expect(args.setDraftStatus).toHaveBeenCalledWith('Draft save failed')
    expect(args.pushToast).toHaveBeenCalledWith('Unable to save draft. Please try again.', {
      title: 'Draft save failed',
      color: 'danger',
    })
  })

  it('keeps danger toast feedback when draft save throws', async () => {
    const { args } = buildDraftActionHarness({
      saveError: new Error('Database unavailable.'),
    })

    const result = await saveInspectionDraftAction(args)

    expect(result).toBe(false)
    expect(args.setDraftStatus).toHaveBeenCalledWith('Draft save failed')
    expect(args.pushToast).toHaveBeenCalledWith('Database unavailable.', {
      title: 'Draft save failed',
      color: 'danger',
    })
  })
})

describe('submitInspectionRecordAction', () => {
  it('passes client inspection timestamps when submitting an inspection session report', async () => {
    const { args, submitInspectionSessionReport, persistInspectionRecord } =
      buildSubmitActionHarness({
        record: {
          inspectionSessionUid: 'inspection-session-123',
          inspectedAt: '2026-07-08T21:07',
          submittedAt: '2026-07-08T13:07:00.000Z',
          reportRemarks: 'General evidence retained.',
          photos: [{ id: 'general-photo', url: '/api/report-media/rpm-general' }],
        },
      })

    await submitInspectionRecordAction(args)

    expect(persistInspectionRecord).not.toHaveBeenCalled()
    expect(submitInspectionSessionReport).toHaveBeenCalledWith({
      sessionUid: 'inspection-session-123',
      displayId: 'INS-1',
      submissionKey: 'inspection-submission-key',
      reportRemarks: 'General evidence retained.',
      photos: [{ id: 'general-photo', url: '/api/report-media/rpm-general' }],
      inspectedAt: '2026-07-08T21:07',
      submittedAt: '2026-07-08T13:07:00.000Z',
    })
  })

  it('updates an existing session-derived report through the report API', async () => {
    const { args, submitInspectionSessionReport, persistInspectionRecord, draftRecord } =
      buildSubmitActionHarness({
        record: {
          inspectionSessionUid: 'inspection-session-123',
          version: 2,
        },
      })

    await submitInspectionRecordAction(args)

    expect(submitInspectionSessionReport).not.toHaveBeenCalled()
    expect(persistInspectionRecord).toHaveBeenCalledWith(7, draftRecord, {
      submissionKey: 'inspection-submission-key',
    })
  })

  it('submits a restored session draft through the active session endpoint', async () => {
    const { args, submitInspectionSessionReport, persistInspectionRecord } =
      buildSubmitActionHarness({
        record: {
          inspectionSessionUid: 'inspection-session-draft',
          version: 0,
        },
        editingRecord: {
          id: 'inspection-draft-1',
          recordKind: 'draft',
        },
      })

    await submitInspectionRecordAction(args)

    expect(persistInspectionRecord).not.toHaveBeenCalled()
    expect(submitInspectionSessionReport).toHaveBeenCalledWith(
      expect.objectContaining({ sessionUid: 'inspection-session-draft' }),
    )
  })

  it('surfaces an unexpected legacy FRT seeded-row validation error without implying all compartments are required', async () => {
    const seededRowsError = new Error('checklist must include 92 seeded rows')
    seededRowsError.status = 422
    const { args, pushToast } = buildSubmitActionHarness({ persistError: seededRowsError })

    await submitInspectionRecordAction(args)

    expect(pushToast).toHaveBeenCalledWith('checklist must include 92 seeded rows', {
      title: 'Save failed',
      color: 'danger',
    })
  })

  it('keeps raw message for non-FRT submission errors', async () => {
    const otherError = new Error('Some unrelated submit issue')
    otherError.status = 400
    const { args, pushToast } = buildSubmitActionHarness({
      record: { inspectionType: 'General Inspection' },
      persistError: otherError,
    })

    await submitInspectionRecordAction(args)

    expect(pushToast).toHaveBeenCalledWith('Some unrelated submit issue', {
      title: 'Save failed',
      color: 'danger',
    })
  })
})
