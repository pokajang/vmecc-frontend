// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import FitnessTestForm from '../FitnessTestForm'

const storageMocks = vi.hoisted(() => ({ loadRow: vi.fn(), save: vi.fn() }))
vi.mock('../../reportStorage', async () => ({
  ...(await vi.importActual('../../reportStorage')),
  loadReportDraftRow: storageMocks.loadRow,
  saveReportDraft: storageMocks.save,
}))
vi.mock('src/services/apiClient', () => ({ fetchTeams: vi.fn().mockResolvedValue({ data: [] }) }))

const completedSeed = {
  workflowStep: 'signoff',
  reportingMonth: '2026-06',
  shiftGroups: [
    {
      id: 'alpha',
      shift: 'Alpha',
      assessor: { name: 'Assessor One' },
      participants: [
        {
          id: 'member-1',
          memberId: 'member-1',
          name: 'Member One',
          ageSnapshot: 31,
          fitness: { sitUps: 20, jumpingJacks: 50, pushUps: 20, testedOn: '2026-06-12' },
          proficiency: { durationSeconds: 240, testedOn: '2026-06-12' },
        },
      ],
    },
  ],
}

const props = (overrides = {}) => ({
  user: { id: 'user-1', name: 'Fitness User' },
  reportTypeSlug: 'fitness-test',
  reportTypeIdPrefix: 'FIT',
  nextReportSequence: 1,
  pushToast: vi.fn(),
  onDirtyChange: vi.fn(),
  skipDraftLoad: true,
  onRequestReview: vi.fn(),
  onDraftSaved: vi.fn(),
  ...overrides,
})

const renderForm = (formProps) =>
  render(
    <MemoryRouter>
      <FitnessTestForm {...formProps} />
    </MemoryRouter>,
  )

const mockMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 375,
  })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 767.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
}

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  storageMocks.loadRow.mockReset().mockResolvedValue(null)
  storageMocks.save.mockReset().mockResolvedValue({ draftId: 'draft-1', version: 1 })
})
afterEach(() => {
  cleanup()
  delete window.matchMedia
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  })
})

describe('FitnessTestForm', () => {
  it('starts with the ERCO-style reporting period and protocol instead of generic setup', () => {
    renderForm(props())
    expect(screen.getByLabelText('Reporting month')).toBeTruthy()
    expect(screen.getByText('View assessment protocol')).toBeTruthy()
    expect(screen.queryByText('Choose Fitness Test Type')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
    expect(screen.queryByText(/Chronology/i)).toBeNull()
  })

  it('uses the shared mobile setup list for its fixed type and completed reporting period', () => {
    mockMobileViewport()
    renderForm(props({ initialFormSeed: { reportingMonth: '2026-06' } }))

    const summary = screen.getByLabelText('Fitness Test setup summary')
    expect(summary.querySelectorAll('.mobile-setup-summary-list__item')).toHaveLength(2)
    expect(screen.getByText('Monthly Physical Test')).toBeTruthy()
    expect(screen.getByText('2026-06')).toBeTruthy()
    expect(screen.queryByLabelText('Reporting month')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Edit Reporting Period' }))
    expect(screen.getByLabelText('Reporting month').value).toBe('2026-06')
    expect(summary.querySelectorAll('.mobile-setup-summary-list__item')).toHaveLength(1)

    fireEvent.change(screen.getByLabelText('Reporting month'), {
      target: { value: '2026-07' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(screen.queryByLabelText('Reporting month')).toBeNull()
    expect(screen.getByText('2026-07')).toBeTruthy()
  })

  it('rewinds mobile setup to reporting period editor when possible', () => {
    let mobileBackHandler
    mockMobileViewport()
    renderForm(
      props({
        initialFormSeed: { reportingMonth: '2026-06' },
        onRegisterMobileBackHandler: (handler) => {
          mobileBackHandler = handler
        },
      }),
    )

    expect(screen.getByText('2026-06')).toBeTruthy()
    expect(typeof mobileBackHandler).toBe('function')

    act(() => expect(mobileBackHandler()).toBe(true))
    expect(screen.getByLabelText('Reporting month')).toBeTruthy()
  })

  it('reviews a complete shift-grouped report with calculated results', async () => {
    const onRequestReview = vi.fn()
    renderForm(props({ initialFormSeed: completedSeed, onRequestReview }))
    expect(await screen.findByText('Completion summary')).toBeTruthy()
    fireEvent.click(screen.getAllByRole('button', { name: 'Review & Submit' })[0])
    await waitFor(() =>
      expect(onRequestReview).toHaveBeenCalledWith(
        expect.objectContaining({
          reportingMonth: '2026-06',
          fitnessSchemaVersion: 3,
          shiftGroups: expect.arrayContaining([expect.objectContaining({ shift: 'Alpha' })]),
        }),
        'signoff',
      ),
    )
  })
})
