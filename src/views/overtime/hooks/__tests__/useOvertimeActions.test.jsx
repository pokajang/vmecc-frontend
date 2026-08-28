// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import {
  deleteMyOvertimeAttachmentApiFirst,
  saveMyOvertimeDraftApiFirst,
  submitMyOvertimeApiFirst,
  uploadMyOvertimeAttachmentApiFirst,
} from 'src/services/overtimeApi'
import useOvertimeActions from '../useOvertimeActions'

vi.mock('src/services/overtimeApi', () => ({
  cancelMyOvertimeApiFirst: vi.fn(),
  clearMyOvertimeDraftApiFirst: vi.fn(async () => ({ ok: true })),
  deleteMyOvertimeAttachmentApiFirst: vi.fn(),
  deleteMyOvertimeApiFirst: vi.fn(),
  saveMyOvertimeDraftApiFirst: vi.fn(),
  submitMyOvertimeApiFirst: vi.fn(),
  uploadMyOvertimeAttachmentApiFirst: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const buildProps = (overrides = {}) => ({
  userId: 7,
  overtimeRecords: [],
  setOvertimeRecords: vi.fn(),
  setOvertimeDraft: vi.fn(),
  overtimeDraft: null,
  draftListRow: null,
  overtimeId: null,
  navigate: vi.fn(),
  pushToast: vi.fn(),
  overtimeTypeDerivedMode: false,
  isResumeEditMode: false,
  hasPersistedEditTarget: false,
  isResubmittingClaim: false,
  isLinkedDraftForEditing: false,
  editingRecordId: null,
  resetForm: vi.fn(),
  resetFormToSubmittedRecord: vi.fn(),
  isOvertimeGuidanceEnabled: true,
  isOvertimeTypeDeriving: false,
  form: {
    overtimeType: 'weekday',
    overtimeTypeConfirmed: true,
    claimDate: '2026-08-26',
    startTime: '18:00',
    endTime: '20:00',
    reason: 'Completed handover and incident log reconciliation.',
    durationMinutes: 120,
    isOvernight: false,
    isOvernightConfirmed: false,
    attachmentId: null,
    attachment: null,
    setAttachment: vi.fn(),
    setFieldErrors: vi.fn(),
    setFormBaseline: vi.fn(),
  },
  ...overrides,
})

describe('useOvertimeActions action acceptance', () => {
  it('keeps visual busy state aligned with a blocked draft action, then saves on first click', async () => {
    saveMyOvertimeDraftApiFirst.mockResolvedValue({
      ok: true,
      data: { payload: {}, draftVersion: 1 },
    })
    const busyProps = buildProps({ isOvertimeTypeDeriving: true })
    const { result, rerender } = renderHook((props) => useOvertimeActions(props), {
      initialProps: busyProps,
    })

    expect(result.current.isFormActionBusy).toBe(true)
    expect(result.current.formActionStatus).toBe('Checking overtime type...')
    await act(async () => result.current.handleDraft())
    expect(saveMyOvertimeDraftApiFirst).not.toHaveBeenCalled()
    expect(busyProps.pushToast).toHaveBeenCalledWith(
      'Checking overtime type...',
      expect.objectContaining({ title: 'Please wait' }),
    )

    const readyProps = { ...busyProps, isOvertimeTypeDeriving: false }
    rerender(readyProps)
    expect(result.current.isFormActionBusy).toBe(false)

    await act(async () => result.current.handleDraft())
    await waitFor(() => expect(saveMyOvertimeDraftApiFirst).toHaveBeenCalledTimes(1))
    expect(readyProps.navigate).toHaveBeenCalledWith('/overtime')
  })

  it('opens resubmission confirmation on the first accepted Update request submission', () => {
    submitMyOvertimeApiFirst.mockResolvedValue({ ok: true, data: {} })
    const existing = {
      id: 'OT-2026-001',
      serverId: 83,
      version: 1,
      status: 'Pending',
      reason: 'Original reason',
    }
    const props = buildProps({
      overtimeRecords: [existing],
      hasPersistedEditTarget: true,
      isResumeEditMode: true,
      isResubmittingClaim: true,
      editingRecordId: existing.id,
    })
    const { result } = renderHook(() => useOvertimeActions(props))

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }))

    expect(result.current.isSubmitConfirmVisible).toBe(true)
    expect(result.current.submitPreview).toEqual(
      expect.objectContaining({ editingRecordId: existing.id, isResubmission: true }),
    )
  })

  it('replaces an unlinked upload only after releasing the previous attachment', async () => {
    uploadMyOvertimeAttachmentApiFirst.mockResolvedValue({
      ok: true,
      data: { id: 91, original_name: 'replacement.pdf', mime_type: 'application/pdf', size: 9 },
    })
    deleteMyOvertimeAttachmentApiFirst.mockResolvedValue({ ok: true })
    const base = buildProps()
    const form = {
      ...base.form,
      attachmentId: 55,
      attachment: { id: 55 },
    }
    const { result } = renderHook(() => useOvertimeActions({ ...base, form }))
    const file = new File(['replacement'], 'replacement.pdf', { type: 'application/pdf' })

    await act(async () => result.current.handleAttachmentUpload(file))

    expect(deleteMyOvertimeAttachmentApiFirst).toHaveBeenCalledWith(55)
    expect(form.setAttachment).toHaveBeenCalledWith(expect.objectContaining({ id: 91 }))
  })

  it('clears a persisted attachment association without deleting the linked file early', async () => {
    const existing = { id: 'OT-2026-002', attachmentId: 55 }
    const base = buildProps({
      overtimeRecords: [existing],
      hasPersistedEditTarget: true,
      editingRecordId: existing.id,
    })
    const form = {
      ...base.form,
      attachmentId: 55,
      attachment: { id: 55 },
    }
    const { result } = renderHook(() => useOvertimeActions({ ...base, form }))

    await act(async () => result.current.handleAttachmentRemove())

    expect(deleteMyOvertimeAttachmentApiFirst).not.toHaveBeenCalled()
    expect(form.setAttachment).toHaveBeenCalledWith(null)
  })
})
