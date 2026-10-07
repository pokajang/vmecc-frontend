// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import useLeaveSubmissionActions from '../useLeaveSubmissionActions'

vi.mock('src/hooks/useWorkflowDraftAutosave', () => ({
  default: () => ({ feedback: null }),
}))

vi.mock('../../../leavePersistence', () => ({
  clearLeaveDraft: vi.fn(),
  loadLeaveAssignmentsForUser: vi.fn(),
  loadLeaveRecords: vi.fn(),
  saveLeaveDraft: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const buildProps = (overrides = {}) => ({
  user: { id: 7 },
  navigate: vi.fn(),
  leaveRecords: [],
  setLeaveRecords: vi.fn(),
  setAssignmentRows: vi.fn(),
  editingRecordId: null,
  setEditingRecordId: vi.fn(),
  originalAttachmentId: null,
  setOriginalAttachmentId: vi.fn(),
  leaveType: 'Annual Leave',
  setLeaveTypeConfirmed: vi.fn(),
  startDate: '2026-09-10',
  endDate: '2026-09-10',
  workShift: 'normal',
  startTimeSlot: 'start',
  endTimeSlot: 'end',
  reason: 'Personal appointment',
  coverBy: '',
  setFieldErrors: vi.fn(),
  resetForm: vi.fn(),
  attachmentName: '',
  attachmentId: null,
  attachmentMeta: null,
  isAttachmentProcessing: false,
  cleanupTransientOnly: vi.fn(),
  untrackTransientAttachment: vi.fn(),
  commitAttachmentReplacement: vi.fn(),
  requestedDays: 1,
  activeFieldRule: { coverageRequired: false, attachmentRequired: false },
  balanceSummary: { year: 2026 },
  selectedShiftConfig: {
    label: 'Normal Shift',
    startOptions: [{ value: 'start', label: '08:30 AM' }],
    endOptions: [{ value: 'end', label: '05:30 PM' }],
  },
  selectedAssignment: null,
  pushToast: vi.fn(),
  clearFeedback: vi.fn(),
  getDisplayLeaveId: vi.fn((record) => record?.id || 'Leave'),
  formatDayCount: vi.fn((days) => String(days)),
  calculateDays: vi.fn(() => 1),
  activeSection: 'new-leave',
  isFormDirty: false,
  ...overrides,
})

describe('useLeaveSubmissionActions validation recovery', () => {
  it('clears resolved feedback before opening confirmation', () => {
    const props = buildProps()
    const { result } = renderHook(() => useLeaveSubmissionActions(props))

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }))

    expect(props.clearFeedback).toHaveBeenCalledTimes(1)
    expect(result.current.isSubmitConfirmVisible).toBe(true)
    expect(result.current.submitPreview).toEqual(
      expect.objectContaining({ leaveType: 'Annual Leave', requestedDays: 1 }),
    )
  })

  it('retains validation feedback while required fields remain invalid', () => {
    const props = buildProps({ startDate: '', endDate: '', reason: '' })
    const { result } = renderHook(() => useLeaveSubmissionActions(props))

    act(() => result.current.handleSubmit({ preventDefault: vi.fn() }))

    expect(props.clearFeedback).not.toHaveBeenCalled()
    expect(result.current.isSubmitConfirmVisible).toBe(false)
    expect(props.pushToast).toHaveBeenCalledWith(
      'Start date, end date, and reason are required before submitting.',
      expect.objectContaining({ color: 'danger' }),
    )
  })
})
