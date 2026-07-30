// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DrillForm from '../DrillForm'

const storageMocks = vi.hoisted(() => ({
  save: vi.fn(),
  load: vi.fn(),
}))

vi.mock('../../reportStorage', async () => {
  const actual = await vi.importActual('../../reportStorage')
  return {
    ...actual,
    saveReportDraft: storageMocks.save,
    loadReportDraft: storageMocks.load,
    loadReportDraftRow: vi.fn(async () => {
      const payload = await storageMocks.load()
      return payload ? { draftId: 'drf_drill_test', version: 1, payload } : null
    }),
  }
})

const completeSeed = {
  setupConfirmed: true,
  reportDate: '2026-07-11',
  reportTime: '09:00',
  weather: 'Clear',
  incidentType: 'Fire Drill',
  exerciseCategories: ['Fire'],
  location: 'Workshop',
  exerciseTitle: 'Workshop response exercise',
  details: 'A simulated fire was raised in the workshop.',
  summary: 'The team completed the exercise.',
  chronology: [{ id: 'c1', time: '09:00', action: 'Exercise started' }],
}

const renderForm = (props = {}) =>
  render(
    <MemoryRouter initialEntries={['/report/drill/new/analysis']}>
      <DrillForm
        user={{ id: 1, name: 'Reporter' }}
        reportTypeSlug="drill"
        reportTypeIdPrefix="DR"
        nextReportSequence={1}
        reportTypeLabel="Drill"
        reportBasePath="/report/drill"
        newSection="analysis"
        datePresetOptions={[]}
        timePresetOptions={[]}
        pushToast={vi.fn()}
        onDirtyChange={vi.fn()}
        skipDraftLoad
        initialFormSeed={completeSeed}
        onRequestReview={vi.fn()}
        {...props}
      />
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

afterEach(() => {
  cleanup()
  delete window.matchMedia
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1024,
  })
})

beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
  })
  storageMocks.save.mockReset().mockResolvedValue(true)
  storageMocks.load.mockReset().mockResolvedValue(null)
})

describe('DrillForm V2 flow', () => {
  it('uses ERCO-style multi-select cards for optional exercise categories', async () => {
    renderForm({
      newSection: 'setup',
      initialFormSeed: { ...completeSeed, exerciseCategories: [] },
    })

    const fireCategory = await screen.findByRole('button', { name: /^Fire/ })
    const rescueCategory = screen.getByRole('button', { name: /^Rescue/ })

    expect(fireCategory.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(fireCategory)
    fireEvent.click(rescueCategory)
    expect(fireCategory.getAttribute('aria-pressed')).toBe('true')
    expect(rescueCategory.getAttribute('aria-pressed')).toBe('true')
  })

  it('falls back to the setup stage for an unknown editable sub-route', async () => {
    renderForm({ newSection: 'unknown-section', initialFormSeed: null })
    expect(await screen.findByText('Choose Drill Type')).toBeTruthy()
    expect(screen.queryByText('Exercise Setup')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull()
  })

  it('uses the type selected on mobile home without asking for it again', async () => {
    mockMobileViewport()
    renderForm({
      newSection: 'setup',
      initialFormSeed: { ...completeSeed, incidentType: 'Evacuation Drill' },
    })

    expect(await screen.findByText('Evacuation Drill')).toBeTruthy()
    expect(screen.queryByText('Choose Drill Type')).toBeNull()
    expect(screen.queryByText('Confirm Drill Type')).toBeNull()
    expect(screen.getByRole('button', { name: 'Edit Type' })).toBeTruthy()
  })

  it('stacks completed mobile setup selections in one shared list group', async () => {
    mockMobileViewport()
    renderForm({
      newSection: 'setup',
      initialFormSeed: completeSeed,
    })

    const summary = await screen.findByLabelText('Drill setup summary')
    expect(summary.querySelectorAll('.mobile-setup-summary-list__item')).toHaveLength(5)
    expect(within(summary).getByText('Type')).toBeTruthy()
    expect(within(summary).getByText('Exercise Categories')).toBeTruthy()
    expect(within(summary).getByText('Environment')).toBeTruthy()
    expect(within(summary).getByText('Location')).toBeTruthy()
    expect(within(summary).getByText('Date & Time')).toBeTruthy()
    expect(document.querySelector('.mobile-setup-summary')).toBeNull()

    fireEvent.click(within(summary).getByRole('button', { name: 'Edit Exercise Categories' }))

    expect(screen.getByRole('group', { name: 'Exercise categories' })).toBeTruthy()
    expect(summary.querySelectorAll('.mobile-setup-summary-list__item')).toHaveLength(4)
  })

  it('keeps a blank mobile setup type-first and uses full-width list rows', async () => {
    mockMobileViewport()
    renderForm({
      newSection: 'setup',
      initialFormSeed: { ...completeSeed, incidentType: '', exerciseCategories: [] },
    })

    const typePicker = await screen.findByRole('radiogroup', { name: 'Choose drill type' })
    expect(screen.getByText('Choose Drill Type')).toBeTruthy()
    expect(screen.queryByText('Exercise Categories (optional)')).toBeNull()
    expect(screen.queryByLabelText('Drill setup summary')).toBeNull()
    expect(
      Array.from(typePicker.children).every((item) =>
        item.classList.contains('mobile-choice-list__item'),
      ),
    ).toBe(true)

    fireEvent.click(within(typePicker).getByRole('radio', { name: /Evacuation Drill/i }))

    expect(await screen.findByText('Exercise Categories (optional)')).toBeTruthy()
    expect(screen.queryByText('Confirm Drill Type')).toBeNull()
  })

  it('edits a selected mobile drill type in the shared setup drawer', async () => {
    mockMobileViewport()
    renderForm({
      newSection: 'setup',
      initialFormSeed: { ...completeSeed, incidentType: 'Evacuation Drill' },
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Type' }))

    const typePicker = screen.getByRole('radiogroup', { name: 'Change drill type' })
    expect(document.querySelector('.mobile-bottom-drawer.show')).toBeTruthy()
    expect(
      Array.from(typePicker.children).every((item) =>
        item.classList.contains('mobile-choice-list__item'),
      ),
    ).toBe(true)

    fireEvent.click(within(typePicker).getByRole('radio', { name: /Rescue Drill/i }))

    await waitFor(() => expect(document.querySelector('.mobile-bottom-drawer')).toBeNull())
    expect(screen.queryByText('Confirm Drill Type')).toBeNull()
  })

  it('restores a normalized server draft directly into the requested stage', async () => {
    storageMocks.load.mockResolvedValue({ ...completeSeed, details: 'Restored server scenario' })
    renderForm({
      newSection: 'details',
      skipDraftLoad: false,
      initialFormSeed: null,
    })

    await waitFor(() =>
      expect(screen.getByLabelText('Drill scenario').value).toBe('Restored server scenario'),
    )
  })

  it('collapses restored server setup selections after asynchronous hydration', async () => {
    storageMocks.load.mockResolvedValue(completeSeed)
    renderForm({
      newSection: 'setup',
      skipDraftLoad: false,
      initialFormSeed: null,
    })

    expect((await screen.findByRole('group', { name: 'Type' })).textContent).toContain('Fire Drill')
    expect(screen.getByRole('group', { name: 'Exercise Categories' }).textContent).toContain('Fire')
    expect(screen.queryByText('Choose Drill Type')).toBeNull()
    expect(screen.queryByText('Confirm Drill Type')).toBeNull()
  })

  it('hands one normalized V2 candidate to the shared review route', async () => {
    const onRequestReview = vi.fn()
    renderForm({ onRequestReview })

    const reviewButtons = await screen.findAllByRole('button', { name: 'Review & Submit' })
    fireEvent.click(reviewButtons[0])

    await waitFor(() => expect(onRequestReview).toHaveBeenCalledTimes(1))
    expect(onRequestReview.mock.calls[0][0]).toMatchObject({
      reportType: 'drill',
      incidentType: 'Fire Drill',
      exerciseCategories: ['Fire'],
      exerciseTitle: 'Workshop response exercise',
    })
    expect(onRequestReview.mock.calls[0][1]).toBe('analysis')
  })

  it('attaches the exact resumed draft identity to the review candidate', async () => {
    storageMocks.load.mockResolvedValue({
      ...completeSeed,
      postIncidentAnalysis: {
        strengths: ['Restored strength'],
        resourcesMobilised: [],
        improvementOpportunities: [],
        photos: [],
      },
    })
    const onRequestReview = vi.fn()
    renderForm({
      onRequestReview,
      skipDraftLoad: false,
      initialFormSeed: null,
    })

    await screen.findByDisplayValue('Restored strength')
    const reviewButtons = await screen.findAllByRole('button', { name: 'Review & Submit' })
    fireEvent.click(reviewButtons[0])

    await waitFor(() =>
      expect(onRequestReview).toHaveBeenCalledWith(
        expect.objectContaining({ sourceDraftId: 'drf_drill_test' }),
        'analysis',
      ),
    )
  })

  it('shows a truthful inline server error when draft saving fails', async () => {
    storageMocks.save.mockResolvedValue(false)
    renderForm()

    const saveButtons = await screen.findAllByRole('button', { name: 'Save Draft' })
    fireEvent.click(saveButtons[0])

    expect(
      await screen.findByText(
        'Draft could not be saved to the server. Check your connection, then use Save Draft to retry.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('keeps newer edits dirty when an older draft snapshot finishes saving', async () => {
    let resolveSave
    storageMocks.save.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve
      }),
    )
    const onDirtyChange = vi.fn()
    renderForm({ onDirtyChange })
    const saveButtons = await screen.findAllByRole('button', { name: 'Save Draft' })
    fireEvent.click(saveButtons[0])
    fireEvent.change(screen.getByLabelText('Strengths entry 1'), {
      target: { value: 'New observation while saving' },
    })
    resolveSave(true)

    await waitFor(() => expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0))
    expect(onDirtyChange).toHaveBeenLastCalledWith(true)
  })
})
