// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CalendarDays, Clock } from 'lucide-react'
import FitnessTestForm from '../FitnessTestForm'

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
})

const baseProps = (overrides = {}) => ({
  user: { id: 'user-1', name: 'Fitness User' },
  reportTypeSlug: 'fitness-test',
  reportTypeIdPrefix: 'FIT',
  nextReportSequence: 1,
  reportTypeLabel: 'Fitness Test',
  datePresetOptions: [
    { title: 'Today', description: 'Current date', value: '2026-04-29', icon: CalendarDays },
    { title: 'Yesterday', description: 'Previous date', value: '2026-04-28', icon: CalendarDays },
  ],
  timePresetOptions: [
    { title: 'Morning', description: 'Start at 08:00', value: '08:00', icon: Clock },
    { title: 'Afternoon', description: 'Start at 14:00', value: '14:00', icon: Clock },
  ],
  pushToast: vi.fn(),
  onDirtyChange: vi.fn(),
  skipDraftLoad: true,
  onRequestReview: vi.fn(),
  onDraftSaved: vi.fn(),
  ...overrides,
})

describe('FitnessTestForm', () => {
  it('preselects the initial seeded type and supports summary edit/done flow', async () => {
    render(
      <FitnessTestForm
        {...baseProps({
          initialFormSeed: {
            incidentType: 'Heat Stress Test',
          },
        })}
      />,
    )

    await waitFor(() => expect(screen.getByText('Heat Stress Test')).toBeTruthy())
    expect(screen.queryByText('Choose Fitness Test Type')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('Choose Fitness Test Type')).toBeTruthy()

    fireEvent.click(screen.getByText('Team Readiness Test'))
    await waitFor(() => expect(screen.getByText('Team Readiness Test')).toBeTruthy())
    expect(screen.queryByText('Choose Fitness Test Type')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByText('Choose Fitness Test Type')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByText('Choose Fitness Test Type')).toBeNull()
  })

  it('keeps setup validation blocking incomplete seeded forms', async () => {
    const pushToast = vi.fn()
    render(
      <FitnessTestForm
        {...baseProps({
          pushToast,
          initialFormSeed: {
            incidentType: 'Strength Test',
            weather: '',
            location: '',
            reportDate: '',
            reportTime: '',
          },
        })}
      />,
    )

    await waitFor(() => expect(screen.getByText('Strength Test')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(pushToast).toHaveBeenCalledWith(
      'Complete all setup selections before continuing.',
      expect.objectContaining({ title: 'Setup incomplete', color: 'warning' }),
    )
    expect(screen.queryByText('Fitness test setup')).toBeNull()
  })
})
