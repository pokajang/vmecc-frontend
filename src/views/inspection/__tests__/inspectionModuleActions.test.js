import { describe, expect, it, vi } from 'vitest'
import { saveInspectionDraftAction } from '../app/inspectionModuleActions'

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
