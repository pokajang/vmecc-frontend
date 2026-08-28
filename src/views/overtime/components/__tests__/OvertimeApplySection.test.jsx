// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OvertimeApplySection from '../OvertimeApplySection'

afterEach(() => {
  cleanup()
})

const overtimeTypeOptions = [
  {
    value: 'weekday',
    title: 'Weekday Overtime',
    description: 'Overtime worked on regular weekdays.',
  },
  {
    value: 'weekend',
    title: 'Weekend Overtime',
    description: 'Overtime worked on weekend days.',
  },
  {
    value: 'publicHoliday',
    title: 'Public Holiday Overtime',
    description: 'Overtime worked on gazetted public holidays.',
  },
]

const baseProps = {
  overtimeTypeConfirmed: false,
  overtimeType: 'weekday',
  overtimeTypeOptions,
  onSelectOvertimeType: vi.fn(),
  onContinueOvertimeType: vi.fn(),
  onBackToOvertimeType: vi.fn(),
  onSubmit: vi.fn((event) => event.preventDefault()),
  onBack: vi.fn(),
  claimDate: '2026-04-13',
  startTime: '09:00',
  endTime: '10:30',
  reason: 'Worked overtime for shift handover.',
  fieldErrors: {},
  onClaimDateChange: vi.fn(),
  onStartTimeChange: vi.fn(),
  onEndTimeChange: vi.fn(),
  onReasonChange: vi.fn(),
  durationMinutes: 90,
  isOvernight: false,
  onClearForm: vi.fn(),
  onAttachmentRemove: vi.fn(),
  onDraft: vi.fn(),
}

describe('OvertimeApplySection', () => {
  it('advances from the fresh type selection as a direct action', () => {
    render(
      <MemoryRouter>
        <OvertimeApplySection {...baseProps} isResumeEditMode={false} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Choose overtime type')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    expect(screen.queryByLabelText('Reason / Work Done')).toBeNull()
    fireEvent.click(screen.getByTestId('overtime-type-weekday'))
    expect(baseProps.onSelectOvertimeType).toHaveBeenCalledWith(
      'weekday',
      expect.objectContaining({ value: 'weekday' }),
    )
    expect(baseProps.onContinueOvertimeType).toHaveBeenCalledWith(
      'weekday',
      expect.objectContaining({ value: 'weekday' }),
    )
  })

  it('uses a distinct change-type action instead of a second Back control', () => {
    render(
      <MemoryRouter>
        <OvertimeApplySection {...baseProps} overtimeTypeConfirmed isResumeEditMode={false} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Change overtime type' })).toBeTruthy()
    expect(
      screen.getByLabelText('Start time').closest('.workflow-compact-stack-field'),
    ).toBeTruthy()
    expect(screen.getByLabelText('End time').closest('.workflow-compact-stack-field')).toBeTruthy()
    expect(document.querySelectorAll('.workflow-compact-stack-field')).toHaveLength(2)
    expect(screen.getByTestId('overtime-utility-panel').textContent).toContain('Overtime duration')
  })

  it('mirrors the authoritative action busy state in controls and status feedback', () => {
    render(
      <MemoryRouter>
        <OvertimeApplySection
          {...baseProps}
          overtimeTypeConfirmed
          isResumeEditMode={false}
          isFormActionBusy
          formActionStatus="Checking overtime type..."
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Submit request' }).disabled).toBe(true)
    expect(screen.getByRole('button', { name: 'Clear form' }).disabled).toBe(true)
    expect(screen.getByRole('status').textContent).toContain('Checking overtime type...')
  })

  it('does not add a confirmation action when no overtime type is selected', () => {
    render(
      <MemoryRouter>
        <OvertimeApplySection
          {...baseProps}
          overtimeType=""
          overtimeTypeConfirmed={false}
          isResumeEditMode={false}
        />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    expect(screen.getByTestId('overtime-type-weekday')).toBeTruthy()
  })

  it('shows form immediately with inline type cards in resume/edit mode', () => {
    render(
      <MemoryRouter>
        <OvertimeApplySection
          {...baseProps}
          overtimeTypeConfirmed={false}
          isResumeEditMode
          submitButtonLabel="Update request"
        />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Choose Overtime Type')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    expect(screen.getByLabelText('Reason / work done')).toBeTruthy()
    expect(screen.getByText('Weekday Overtime')).toBeTruthy()
    expect(screen.getByText('Weekend Overtime')).toBeTruthy()
    expect(screen.getByText('Public Holiday Overtime')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Update request' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear form' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Save draft' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Add attachment' })).toBeTruthy()
    expect(document.querySelector('.action-row-thumb--terminal')).toBeTruthy()
    expect(document.querySelector('.action-row-thumb-spacer')).toBeNull()
  })

  it('renders the overnight confirmation control on cross-day requests', () => {
    render(
      <MemoryRouter>
        <OvertimeApplySection
          {...baseProps}
          overtimeTypeConfirmed
          isOvernight
          isOvernightConfirmed={false}
          onOvernightConfirmationChange={vi.fn()}
        />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('checkbox', {
        name: 'I confirm this overtime ends on the next day.',
      }),
    ).toBeTruthy()
  })
})
