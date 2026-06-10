// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
  onDraft: vi.fn(),
}

describe('OvertimeApplySection', () => {
  it('keeps staged type selection in fresh mode', () => {
    render(
      <MemoryRouter>
        <OvertimeApplySection {...baseProps} isResumeEditMode={false} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Choose Overtime Type')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy()
    expect(screen.queryByLabelText('Reason / Work Done')).toBeNull()
  })

  it('disables Continue when no overtime type is selected', () => {
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

    const continueButton = screen.getByRole('button', { name: 'Continue' })
    expect(continueButton.disabled).toBe(true)
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
    expect(screen.getByLabelText('Reason / Work Done')).toBeTruthy()
    expect(screen.getByText('Weekday Overtime')).toBeTruthy()
    expect(screen.getByText('Weekend Overtime')).toBeTruthy()
    expect(screen.getByText('Public Holiday Overtime')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Update request' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Clear form' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeTruthy()
    expect(document.querySelector('.action-row-thumb')).toBeTruthy()
    expect(document.querySelector('.action-row-thumb-spacer.d-lg-none')).toBeTruthy()
  })
})
