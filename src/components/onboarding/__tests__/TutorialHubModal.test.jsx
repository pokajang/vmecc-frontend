// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import TutorialHubModal from '../TutorialHubModal'
import { TRT_INSPECTION_TOUR_REPLAY_EVENT } from 'src/onboarding/trtInspectionTour'
import { ONBOARDING_LOCALE_STORAGE_KEY } from 'src/onboarding/onboardingLocale'
import { INSPECTION_TOUR_SOURCE_TUTORIAL_HUB } from 'src/onboarding/inspectionOnboardingContract'

const createStorageMock = () => {
  let values = {}
  return {
    getItem: vi.fn((key) =>
      Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null,
    ),
    setItem: vi.fn((key, value) => {
      values[key] = String(value)
    }),
    removeItem: vi.fn((key) => {
      delete values[key]
    }),
    clear: vi.fn(() => {
      values = {}
    }),
  }
}

const mockMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 767.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

const user = { id: 7, name: 'TRT User' }

const tutorials = [
  {
    moduleId: 'inspection',
    localized: true,
    label: { en: 'Inspection', bm: 'Pemeriksaan' },
    description: {
      en: 'Learn where records, filters, and new inspection actions are located.',
      bm: 'Ketahui lokasi rekod, penapis dan tindakan pemeriksaan baharu.',
    },
    status: 'ready',
    actionLabel: { en: 'Start', bm: 'Mula' },
    actionType: 'start',
    replayEvent: TRT_INSPECTION_TOUR_REPLAY_EVENT,
    source: INSPECTION_TOUR_SOURCE_TUTORIAL_HUB,
  },
  {
    moduleId: 'erco',
    label: 'ERCO',
    description: 'Emergency response reporting tutorial.',
    status: 'coming_soon',
    statusLabel: 'Coming soon',
    actionLabel: 'Coming soon',
    actionType: 'disabled',
  },
]

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
})

afterEach(() => {
  cleanup()
  delete window.matchMedia
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('TutorialHubModal', () => {
  it('renders a localized Inspection row and a header language selector', () => {
    render(<TutorialHubModal visible onClose={vi.fn()} tutorials={tutorials} user={user} />)

    expect(screen.getByRole('dialog', { name: 'Tutorial' })).toBeTruthy()
    expect(screen.getByText('Choose a module to learn the main controls.')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Tutorial language' })).toBeTruthy()
    expect(screen.getByText('Inspection')).toBeTruthy()
    expect(screen.queryByText('Pemeriksaan')).toBeNull()
    expect(
      screen.getByText('Learn where records, filters, and new inspection actions are located.'),
    ).toBeTruthy()
    expect(
      screen.queryByText('Ketahui lokasi rekod, penapis dan tindakan pemeriksaan baharu.'),
    ).toBeNull()
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy()
    expect(screen.getByText('ERCO')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Coming soon' }).disabled).toBe(true)
  })

  it('switching to BM updates only localized tutorial text', () => {
    render(<TutorialHubModal visible onClose={vi.fn()} tutorials={tutorials} user={user} />)

    fireEvent.click(screen.getByRole('button', { name: 'BM' }))

    expect(localStorage.setItem).toHaveBeenCalledWith(ONBOARDING_LOCALE_STORAGE_KEY, 'bm')
    expect(screen.getByText('Pemeriksaan')).toBeTruthy()
    expect(screen.queryByText('Inspection')).toBeNull()
    expect(
      screen.getByText('Ketahui lokasi rekod, penapis dan tindakan pemeriksaan baharu.'),
    ).toBeTruthy()
    expect(screen.queryByText(tutorials[0].description.en)).toBeNull()
    expect(screen.getByRole('button', { name: 'Mula' })).toBeTruthy()
    expect(screen.getByText('ERCO')).toBeTruthy()
    expect(screen.getByText('Emergency response reporting tutorial.')).toBeTruthy()
  })

  it('uses the shared mobile overlay header actions on mobile viewports', () => {
    mockMobileViewport()

    render(<TutorialHubModal visible onClose={vi.fn()} tutorials={tutorials} user={user} />)

    const dialog = screen.getByRole('dialog', { name: 'Tutorial' })
    expect(dialog.classList.contains('mobile-overlay-shell')).toBe(true)
    expect(screen.getByText('Modules').closest('.mobile-overlay-section')).toBeTruthy()
    expect(within(dialog).getByRole('group', { name: 'Tutorial language' })).toBeTruthy()
    expect(screen.getByText('Inspection').closest('.mobile-overlay-item')).toBeTruthy()
  })

  it('hides the language selector when no visible tutorial is localized', () => {
    render(
      <TutorialHubModal
        visible
        onClose={vi.fn()}
        tutorials={[
          {
            moduleId: 'erco',
            label: 'ERCO',
            description: 'Emergency response reporting tutorial.',
            status: 'coming_soon',
            statusLabel: 'Coming soon',
            actionLabel: 'Coming soon',
            actionType: 'disabled',
          },
        ]}
        user={user}
      />,
    )

    expect(screen.queryByRole('group', { name: 'Tutorial language' })).toBeNull()
  })

  it('dispatches the replay event and closes when a ready tutorial starts', async () => {
    const handleClose = vi.fn()
    const replayHandler = vi.fn()
    window.addEventListener(TRT_INSPECTION_TOUR_REPLAY_EVENT, replayHandler)

    render(<TutorialHubModal visible onClose={handleClose} tutorials={tutorials} user={user} />)

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect(handleClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(replayHandler).toHaveBeenCalledTimes(1))
    expect(replayHandler.mock.calls[0][0].detail).toEqual({
      source: INSPECTION_TOUR_SOURCE_TUTORIAL_HUB,
      userId: user.id,
    })

    window.removeEventListener(TRT_INSPECTION_TOUR_REPLAY_EVENT, replayHandler)
  })

  it('shows an empty state when no tutorials are available', () => {
    render(<TutorialHubModal visible onClose={vi.fn()} tutorials={[]} user={user} />)

    expect(screen.getByText('No tutorials are available for your current access.')).toBeTruthy()
  })

  it('closes and navigates for blocked tutorial actions using the selected locale', async () => {
    const handleClose = vi.fn()
    const handleNavigate = vi.fn()

    render(
      <TutorialHubModal
        visible
        onClose={handleClose}
        onNavigate={handleNavigate}
        tutorials={[
          {
            moduleId: 'inspection',
            localized: true,
            label: { en: 'Inspection', bm: 'Pemeriksaan' },
            description: {
              en: 'Learn where records, filters, and new inspection actions are located.',
              bm: 'Ketahui lokasi rekod, penapis dan tindakan pemeriksaan baharu.',
            },
            status: 'blocked',
            statusLabel: 'Complete profile first',
            actionLabel: { en: 'Complete profile', bm: 'Lengkapkan profil' },
            actionType: 'navigate',
            actionTo: '/profile',
          },
        ]}
        user={user}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'BM' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lengkapkan profil' }))

    expect(handleClose).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(handleNavigate).toHaveBeenCalledWith('/profile'))
  })
})
