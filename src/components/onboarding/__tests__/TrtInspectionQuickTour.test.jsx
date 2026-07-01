// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import TrtInspectionQuickTour from '../TrtInspectionQuickTour'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { updateOnboardingState } from 'src/services/apiClient'
import { inspectionQuickTour } from 'src/onboarding/inspectionQuickTourConfig'
import { ONBOARDING_LOCALE_STORAGE_KEY } from 'src/onboarding/onboardingLocale'
import {
  INSPECTION_TOUR_SOURCE_REQUEST,
  INSPECTION_TOUR_SOURCE_REPLAY,
  INSPECTION_TOUR_SOURCE_TUTORIAL_HUB,
} from 'src/onboarding/inspectionOnboardingContract'
import {
  TRT_INSPECTION_TOUR_KEY,
  TRT_INSPECTION_TOUR_REPLAY_EVENT,
  TRT_INSPECTION_TOUR_REQUEST_EVENT,
  TRT_INSPECTION_TOUR_VERSION,
  getTrtInspectionTourStorageKey,
} from 'src/onboarding/trtInspectionTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(),
}))

vi.mock('react-joyride', async () => {
  const ReactModule = await import('react')
  return {
    ACTIONS: {
      CLOSE: 'close',
      NEXT: 'next',
      PREV: 'prev',
      SKIP: 'skip',
    },
    EVENTS: {
      STEP_AFTER: 'step:after',
      TOOLTIP: 'tooltip',
      TARGET_NOT_FOUND: 'error:target_not_found',
    },
    STATUS: {
      FINISHED: 'finished',
      SKIPPED: 'skipped',
    },
    Joyride: ({ onEvent, run, steps, tooltipComponent: TooltipComponent }) => {
      const [stepIndex, setStepIndex] = ReactModule.useState(0)

      ReactModule.useEffect(() => {
        if (run) setStepIndex(0)
      }, [run, steps])

      if (!run) return null

      const moveNext = () => {
        onEvent?.({
          action: 'next',
          index: stepIndex,
          type: 'step:after',
        })
        if (stepIndex < steps.length - 1) {
          setStepIndex((current) => current + 1)
        }
      }

      const moveBack = () => {
        onEvent?.({
          action: 'prev',
          index: stepIndex,
          type: 'step:after',
        })
        setStepIndex((current) => Math.max(0, current - 1))
      }

      return (
        <div data-testid="joyride-running">
          <span>{steps.map((step) => step.title).join(', ')}</span>
          {TooltipComponent ? (
            <TooltipComponent
              backProps={{ onClick: moveBack }}
              closeProps={{ onClick: () => onEvent?.({ action: 'close', index: stepIndex }) }}
              continuous
              index={stepIndex}
              primaryProps={{ onClick: moveNext }}
              skipProps={{ onClick: () => onEvent?.({ status: 'skipped', index: stepIndex }) }}
              size={steps.length}
              step={steps[stepIndex]}
              tooltipProps={{}}
            />
          ) : null}
          <button
            type="button"
            onClick={() =>
              onEvent?.({ status: 'finished', type: 'tour:end', index: steps.length - 1 })
            }
          >
            Done mock tour
          </button>
          <button
            type="button"
            onClick={() =>
              onEvent?.({ status: 'skipped', action: 'skip', type: 'tour:end', index: 0 })
            }
          >
            Skip mock tour
          </button>
          <button
            type="button"
            onClick={() =>
              onEvent?.({
                action: 'next',
                index: stepIndex,
                type: 'error:target_not_found',
              })
            }
          >
            Target missing mock
          </button>
        </div>
      )
    },
    __esModule: true,
    React: ReactModule,
  }
})

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

const completeTrtUser = {
  id: 44,
  name: 'TRT Member',
  email: 'trt@example.test',
  ic_number: '900101-01-1234',
  phone: '012 3456 789',
  address: 'Lot 1',
  state: 'Selangor',
  roles: ['Tactical Response Team'],
  permissions: ['reports.inspection.view'],
  emergency_contact: {
    name: 'Emergency Person',
    relationship: 'Sibling',
    phone: '013 3456 789',
  },
  medical_info: {
    noKnownCriticalMedicalInfo: true,
  },
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const InspectionAnchors = ({
  includeAnchors = true,
  includeFilters = true,
  includeHiddenDuplicates = false,
}) => {
  const location = useLocation()
  if (!location.pathname.startsWith('/inspection') || !includeAnchors) return null

  return (
    <div>
      <a href="/inspection" data-tour-id="inspection-nav">
        Inspection
      </a>
      <main data-tour-id="inspection-module">
        {includeHiddenDuplicates ? (
          <div style={{ display: 'none' }}>
            <section data-tour-id="inspection-records">Hidden records</section>
            <div data-tour-id="inspection-scope">Hidden scope</div>
            <div data-tour-id="inspection-filters">Hidden filters</div>
            <button type="button" data-tour-id="inspection-new">
              Hidden new
            </button>
          </div>
        ) : null}
        <section data-tour-id="inspection-records">Records</section>
        <div data-tour-id="inspection-scope">Scope</div>
        {includeFilters ? <div data-tour-id="inspection-filters">Filters</div> : null}
        <button type="button" data-tour-id="inspection-new">
          New
        </button>
      </main>
    </div>
  )
}

const renderTour = ({
  authUser = completeTrtUser,
  initialPath = '/inspection',
  includeAnchors = true,
  includeFilters = true,
  includeHiddenDuplicates = false,
} = {}) => {
  const reducer = (state = { authUser }, action) => {
    if (action.type !== 'set') return state
    const { type, ...rest } = action
    return { ...state, ...rest }
  }
  const store = createStore(reducer)
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <NavigationGuardProvider>
          <LocationProbe />
          <InspectionAnchors
            includeAnchors={includeAnchors}
            includeFilters={includeFilters}
            includeHiddenDuplicates={includeHiddenDuplicates}
          />
          <TrtInspectionQuickTour />
        </NavigationGuardProvider>
      </MemoryRouter>
    </Provider>,
  )
  return store
}

const setStoredLocale = (locale) => {
  localStorage.setItem(ONBOARDING_LOCALE_STORAGE_KEY, locale)
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  updateOnboardingState.mockImplementation((key, payload) => {
    const now = new Date().toISOString()
    const state = {
      version: payload.version,
      ...(payload.event === 'started' ? { lastStartedAt: now } : {}),
      ...(payload.event === 'completed' ? { completedAt: now } : {}),
      ...(payload.event === 'dismissed' ? { dismissedAt: now } : {}),
    }
    return Promise.resolve({ data: { [key]: state } })
  })
  vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 120,
    height: 40,
    top: 0,
    right: 120,
    bottom: 40,
    left: 0,
    x: 0,
    y: 0,
    toJSON: () => {},
  })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('TrtInspectionQuickTour', () => {
  it('shows a non-blocking prompt on direct inspection entry for eligible TRT users', async () => {
    renderTour()

    expect(await screen.findByText(/Start Inspection tutorial\?/i)).toBeTruthy()
    expect(screen.queryByText(/Mulakan tutorial Pemeriksaan\?/i)).toBeNull()
  })

  it('uses the stored BM locale for the prompt before the tour starts', async () => {
    setStoredLocale('bm')
    renderTour()

    expect(await screen.findByText(/Mulakan tutorial Pemeriksaan\?/i)).toBeTruthy()
    expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull()
  })

  it('does not show the prompt for incomplete TRT profiles', async () => {
    renderTour({ authUser: { ...completeTrtUser, phone: '' } })

    await waitFor(() => expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull())
  })

  it('does not show the automatic prompt for permitted non-TRT users', async () => {
    renderTour({ authUser: { ...completeTrtUser, roles: ['Admin'], phone: '' } })

    await waitFor(() => expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull())
  })

  it('does not show the prompt when the backend state is completed', async () => {
    renderTour({
      authUser: {
        ...completeTrtUser,
        onboarding: {
          [TRT_INSPECTION_TOUR_KEY]: {
            version: TRT_INSPECTION_TOUR_VERSION,
            completedAt: '2026-06-25T01:00:00.000Z',
          },
        },
      },
    })

    await waitFor(() => expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull())
  })

  it('does not show the prompt when the backend state is dismissed', async () => {
    renderTour({
      authUser: {
        ...completeTrtUser,
        onboarding: {
          [TRT_INSPECTION_TOUR_KEY]: {
            version: TRT_INSPECTION_TOUR_VERSION,
            dismissedAt: '2026-06-25T01:00:00.000Z',
          },
        },
      },
    })

    await waitFor(() => expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull())
  })

  it('uses local fallback suppression when backend state exists but is not suppressing', async () => {
    localStorage.setItem(
      getTrtInspectionTourStorageKey(completeTrtUser.id),
      JSON.stringify({ dismissedAt: '2026-06-25T01:00:00.000Z' }),
    )

    renderTour({
      authUser: {
        ...completeTrtUser,
        onboarding: {
          [TRT_INSPECTION_TOUR_KEY]: {
            version: TRT_INSPECTION_TOUR_VERSION,
            lastStartedAt: '2026-06-25T00:00:00.000Z',
          },
        },
      },
    })

    await waitFor(() => expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull())
  })

  it('does not show the direct prompt on nested inspection routes', async () => {
    renderTour({ initialPath: '/inspection/new' })

    await waitFor(() => expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull())
  })

  it('starts a replay tour even when backend state is completed', async () => {
    renderTour({
      authUser: {
        ...completeTrtUser,
        onboarding: {
          [TRT_INSPECTION_TOUR_KEY]: {
            version: TRT_INSPECTION_TOUR_VERSION,
            completedAt: '2026-06-25T01:00:00.000Z',
          },
        },
      },
    })

    window.dispatchEvent(
      new CustomEvent(TRT_INSPECTION_TOUR_REPLAY_EVENT, {
        detail: { source: INSPECTION_TOUR_SOURCE_REPLAY, userId: completeTrtUser.id },
      }),
    )

    expect(await screen.findByTestId('joyride-running')).toBeTruthy()
    expect(updateOnboardingState).toHaveBeenCalledWith(
      TRT_INSPECTION_TOUR_KEY,
      expect.objectContaining({
        event: 'started',
        payload: expect.objectContaining({ source: INSPECTION_TOUR_SOURCE_REPLAY }),
      }),
    )
  })

  it('starts a manual replay tour for permitted non-TRT users', async () => {
    renderTour({ authUser: { ...completeTrtUser, roles: ['Admin'], phone: '' } })

    window.dispatchEvent(
      new CustomEvent(TRT_INSPECTION_TOUR_REPLAY_EVENT, {
        detail: { source: INSPECTION_TOUR_SOURCE_TUTORIAL_HUB, userId: completeTrtUser.id },
      }),
    )

    expect(await screen.findByTestId('joyride-running')).toBeTruthy()
    expect(updateOnboardingState).toHaveBeenCalledWith(
      TRT_INSPECTION_TOUR_KEY,
      expect.objectContaining({
        event: 'started',
        payload: expect.objectContaining({ source: INSPECTION_TOUR_SOURCE_TUTORIAL_HUB }),
      }),
    )
  })

  it('ignores profile handoff events for permitted non-TRT users', async () => {
    renderTour({
      authUser: { ...completeTrtUser, roles: ['Admin'], phone: '' },
      initialPath: '/dashboard',
    })

    window.dispatchEvent(
      new CustomEvent(TRT_INSPECTION_TOUR_REQUEST_EVENT, {
        detail: { source: INSPECTION_TOUR_SOURCE_REQUEST, userId: completeTrtUser.id },
      }),
    )

    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/dashboard'))
    expect(screen.queryByTestId('joyride-running')).toBeNull()
  })

  it('shows preparing and not-ready recovery states when anchors never load', async () => {
    renderTour({ includeAnchors: false })

    fireEvent.click(screen.getByRole('button', { name: /start tutorial/i }))
    expect(await screen.findByText('Preparing tutorial...', {}, { timeout: 1000 })).toBeTruthy()
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.queryByText('Tutorial belum sedia lagi.')).toBeNull()
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy()
  }, 8000)

  it('starts the tour from the direct inspection prompt and records completion', async () => {
    renderTour()

    fireEvent.click(await screen.findByRole('button', { name: /start tutorial/i }))

    await waitFor(() =>
      expect(updateOnboardingState).toHaveBeenCalledWith(
        TRT_INSPECTION_TOUR_KEY,
        expect.objectContaining({
          version: TRT_INSPECTION_TOUR_VERSION,
          event: 'started',
        }),
      ),
    )
    expect(await screen.findByTestId('joyride-running')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: /inspection menu/i })).toBeTruthy()
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
    expect(screen.queryByText('Langkah 1 daripada 6')).toBeNull()
    expect(
      screen.getByText(
        /Inspection is where TRT members create and review site inspection records\./i,
      ),
    ).toBeTruthy()
    expect(screen.queryByText('Menu Pemeriksaan')).toBeNull()
    expect(document.querySelector('.onboarding-tour-tooltip .border-bottom')).toBeNull()
    expect(document.querySelector('.onboarding-tour-tooltip .border-top')).toBeNull()
    expect(document.querySelector('.onboarding-tour-tooltip .d-grid.gap-3.p-3')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /done mock tour/i }))

    await waitFor(() =>
      expect(updateOnboardingState).toHaveBeenCalledWith(
        TRT_INSPECTION_TOUR_KEY,
        expect.objectContaining({
          version: TRT_INSPECTION_TOUR_VERSION,
          event: 'completed',
        }),
      ),
    )
    expect(localStorage.getItem(getTrtInspectionTourStorageKey(completeTrtUser.id))).toBeNull()
  })

  it('renders the prompt and tooltip entirely in BM when BM is stored', async () => {
    setStoredLocale('bm')
    renderTour()

    fireEvent.click(await screen.findByRole('button', { name: /mula tutorial/i }))

    expect(await screen.findByRole('dialog', { name: /menu pemeriksaan/i })).toBeTruthy()
    expect(screen.getByText('Langkah 1 daripada 6')).toBeTruthy()
    expect(screen.queryByText('Step 1 of 6')).toBeNull()
    expect(
      screen.getByText(
        /Pemeriksaan ialah tempat ahli TRT mencipta dan menyemak rekod pemeriksaan tapak\./i,
      ),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Langkau' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Seterusnya' })).toBeTruthy()
    expect(screen.getByLabelText('Tutup tutorial')).toBeTruthy()
    expect(screen.queryByText('Inspection menu')).toBeNull()
  })

  it('falls back to English when the selected locale text is missing', async () => {
    const originalTitle = inspectionQuickTour.prompt.title

    inspectionQuickTour.prompt.title = {
      en: 'Start Inspection tutorial?',
      bm: '',
    }

    try {
      setStoredLocale('bm')
      renderTour()

      expect(await screen.findByText('Start Inspection tutorial?')).toBeTruthy()
      expect(screen.queryByText('Mulakan tutorial Pemeriksaan?')).toBeNull()
    } finally {
      inspectionQuickTour.prompt.title = originalTitle
    }
  })

  it('advances from the menu step when hidden duplicate anchors exist before visible anchors', async () => {
    renderTour({ includeHiddenDuplicates: true })

    fireEvent.click(await screen.findByRole('button', { name: /start tutorial/i }))

    expect(await screen.findByRole('dialog', { name: /inspection menu/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(await screen.findByRole('dialog', { name: /records area/i })).toBeTruthy()
    expect(screen.getByText('Step 2 of 6')).toBeTruthy()
    expect(screen.queryByText('Langkah 2 daripada 6')).toBeNull()
  })

  it('ends the tour when the visible Done action is clicked on the final step', async () => {
    renderTour()

    fireEvent.click(await screen.findByRole('button', { name: /start tutorial/i }))

    expect(await screen.findByRole('dialog', { name: /inspection menu/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /records area/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /scope control/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /filters/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /new inspection/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /ready to explore/i })).toBeTruthy()

    fireEvent.click(document.querySelector('.onboarding-tour-tooltip .btn-primary'))

    await waitFor(() => expect(screen.queryByTestId('joyride-running')).toBeNull())
    expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull()
    expect(updateOnboardingState).toHaveBeenCalledWith(
      TRT_INSPECTION_TOUR_KEY,
      expect.objectContaining({
        version: TRT_INSPECTION_TOUR_VERSION,
        event: 'completed',
      }),
    )
  })

  it('keeps the filters step when the dedicated filter anchor is not visible', async () => {
    renderTour({ includeFilters: false })

    fireEvent.click(await screen.findByRole('button', { name: /start tutorial/i }))

    expect(await screen.findByTestId('joyride-running')).toBeTruthy()
    expect(await screen.findByRole('dialog', { name: /inspection menu/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /records area/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /scope control/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(await screen.findByRole('dialog', { name: /filters/i })).toBeTruthy()
    expect(screen.getByText('Filters')).toBeTruthy()
  })

  it('records target-not-found metadata without ending the tour', async () => {
    renderTour()

    fireEvent.click(await screen.findByRole('button', { name: /start tutorial/i }))

    expect(await screen.findByRole('dialog', { name: /inspection menu/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /target missing mock/i }))

    expect(await screen.findByTestId('joyride-running')).toBeTruthy()
    await waitFor(() =>
      expect(updateOnboardingState).toHaveBeenCalledWith(
        TRT_INSPECTION_TOUR_KEY,
        expect.objectContaining({
          event: 'started',
          payload: expect.objectContaining({
            targetNotFoundStepKeys: ['menu'],
          }),
        }),
      ),
    )
  })

  it('navigates to inspection and starts the tour from the profile handoff event', async () => {
    renderTour({ initialPath: '/dashboard' })

    window.dispatchEvent(
      new CustomEvent(TRT_INSPECTION_TOUR_REQUEST_EVENT, {
        detail: { userId: completeTrtUser.id },
      }),
    )

    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/inspection'))
    expect(await screen.findByTestId('joyride-running')).toBeTruthy()
  })

  it('ignores quick tour events for another user', async () => {
    renderTour({ initialPath: '/dashboard' })

    window.dispatchEvent(
      new CustomEvent(TRT_INSPECTION_TOUR_REQUEST_EVENT, {
        detail: { userId: 'another-user' },
      }),
    )

    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/dashboard'))
    expect(screen.queryByTestId('joyride-running')).toBeNull()
  })

  it('dismisses the tour from the prompt', async () => {
    renderTour()

    fireEvent.click(await screen.findByRole('button', { name: /skip/i }))

    await waitFor(() =>
      expect(updateOnboardingState).toHaveBeenCalledWith(
        TRT_INSPECTION_TOUR_KEY,
        expect.objectContaining({
          version: TRT_INSPECTION_TOUR_VERSION,
          event: 'dismissed',
        }),
      ),
    )
    expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull()
    expect(localStorage.getItem(getTrtInspectionTourStorageKey(completeTrtUser.id))).toBeNull()
  })

  it('does not carry local terminal suppression across authenticated users', async () => {
    const store = renderTour()

    fireEvent.click(await screen.findByRole('button', { name: /skip/i }))
    await waitFor(() => expect(screen.queryByText(/Start Inspection tutorial\?/i)).toBeNull())

    store.dispatch({
      type: 'set',
      authUser: {
        ...completeTrtUser,
        id: 45,
        email: 'second-trt@example.test',
        onboarding: {},
      },
    })

    expect(await screen.findByText(/Start Inspection tutorial\?/i)).toBeTruthy()
  })

  it('falls back to local storage when inspection onboarding persistence fails', async () => {
    updateOnboardingState.mockRejectedValueOnce(new Error('offline'))
    renderTour()

    fireEvent.click(await screen.findByRole('button', { name: /skip/i }))

    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(getTrtInspectionTourStorageKey(completeTrtUser.id)))
          .dismissedAt,
      ).toBeTruthy(),
    )
  })
})
