// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LeaveApplySection from '../LeaveApplySection'

afterEach(() => {
  cleanup()
})

const baseProps = {
  leaveTypeConfirmed: true,
  leaveType: 'Annual Leave',
  onSelectLeaveType: vi.fn(),
  onContinueLeaveType: vi.fn(),
  onBack: vi.fn(),
  onBackToLeaveType: vi.fn(),
  onSubmit: vi.fn((event) => event.preventDefault()),
  selectedLeaveTypeOption: {
    title: 'Annual Leave',
    description: 'Planned leave for rest, personal matters, or vacation.',
  },
  SelectedLeaveIcon: null,
  balanceStats: [
    { key: 'available', label: 'Available', value: '10 day(s)' },
    { key: 'entitlement', label: 'Entitlement', value: '14 day(s)' },
    { key: 'used', label: 'Used', value: '2 day(s)' },
    { key: 'pending', label: 'Pending', value: '2 day(s)' },
  ],
  balanceSummary: {
    hasAssignment: true,
    isZeroEntitlement: false,
    year: 2026,
  },
  workShift: 'normal',
  handleShiftChange: vi.fn(),
  shiftOptions: [{ value: 'normal', label: 'Normal Shift' }],
  selectedShiftConfig: {
    label: 'Normal Shift',
    note: '',
    startOptions: [{ value: 'shift-start', label: 'Shift Start' }],
    endOptions: [{ value: 'shift-end', label: 'Shift End' }],
  },
  startDate: '2026-04-16',
  handleStartDateChange: vi.fn(),
  startTimeSlot: 'shift-start',
  handleStartTimeChange: vi.fn(),
  endDate: '2026-04-16',
  handleEndDateChange: vi.fn(),
  endTimeSlot: 'shift-end',
  handleEndTimeChange: vi.fn(),
  fieldErrors: {},
  activeFieldRule: {
    showCoverage: false,
    showAttachment: false,
    coverageRequired: false,
    attachmentRequired: false,
  },
  coverBy: '',
  onCoverByChange: vi.fn(),
  handleAttachmentChange: vi.fn(),
  openCameraCapture: vi.fn(),
  isAttachmentProcessing: false,
  cameraInputRef: { current: null },
  attachmentStatus: null,
  attachmentMeta: null,
  clearAttachment: vi.fn(),
  requestedDays: 1,
  formatDayCount: (value) => String(value),
  reason: 'Family matters',
  onReasonChange: vi.fn(),
  onClearForm: vi.fn(),
  onDraft: vi.fn(),
  isSubmitBlockedByBalance: false,
  editingRecordId: null,
}

describe('LeaveApplySection', () => {
  it('renders top Back and thumb action group in consistent order', () => {
    render(
      <MemoryRouter>
        <LeaveApplySection {...baseProps} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    const actionBar = document.querySelector('.action-row-thumb')
    expect(actionBar).toBeTruthy()
    expect(document.querySelector('.action-row-thumb-spacer.d-lg-none')).toBeTruthy()

    const actionButtons = within(actionBar).getAllByRole('button')
    expect(actionButtons.map((button) => button.textContent)).toEqual([
      'Clear form',
      'Save draft',
      'Submit request',
    ])
  })
})
