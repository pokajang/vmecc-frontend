// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { auditQuickTour } from 'src/onboarding/auditQuickTourConfig'
import {
  AUDIT_TOUR_KEY,
  AUDIT_TOUR_REPLAY_EVENT,
  AUDIT_TOUR_VERSION,
} from 'src/onboarding/auditTour'
import { updateOnboardingState } from 'src/services/apiClient'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [AUDIT_TOUR_KEY]: {
          version: AUDIT_TOUR_VERSION,
          lastStartedAt: new Date().toISOString(),
        },
      },
    }),
  ),
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
      }, [run])

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

const auditViewer = {
  id: 121,
  name: 'Audit Admin',
  email: 'audit-admin@example.test',
  permissions: ['audit.view'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const AuditRouteAnchors = ({ includeAnchors = true }) => {
  const location = useLocation()

  if (location.pathname !== '/admin/audit') {
    return <main data-testid="outside-route">Outside audit route</main>
  }

  if (!includeAnchors) {
    return <main>Audit loading</main>
  }

  return (
    <main data-tour-id="audit-module">
      <section data-tour-id="audit-records-card">
        <div data-tour-id="audit-filters">Filters</div>
        <div data-tour-id="audit-records">Records</div>
        <div data-tour-id="audit-results-footer">Footer</div>
      </section>
    </main>
  )
}

const renderTour = ({
  authUser = auditViewer,
  initialPath = '/admin/audit',
  includeAnchors = true,
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
          <AuditRouteAnchors includeAnchors={includeAnchors} />
          <OnboardingTourRunner config={auditQuickTour} />
        </NavigationGuardProvider>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1280,
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
    toJSON: () => ({}),
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('auditQuickTour', () => {
  it('shows the prompt on /admin/audit and advances through the 4-step walkthrough', async () => {
    renderTour()

    expect(screen.getByText('Start Audit tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Audit workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Audit workspace' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Search and filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Activity records' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Results footer' })
  })

  it('replays from outside the route family and navigates to /admin/audit', async () => {
    renderTour({ initialPath: '/messages' })

    window.dispatchEvent(
      new CustomEvent(AUDIT_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: auditViewer.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Audit workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/admin/audit')
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
  })

  it('persists target_not_found metadata without crashing the tour', async () => {
    renderTour()

    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Audit workspace' })).toBeTruthy(),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Target missing mock' }))

    await waitFor(() =>
      expect(updateOnboardingState).toHaveBeenCalledWith(
        AUDIT_TOUR_KEY,
        expect.objectContaining({
          event: 'started',
          payload: expect.objectContaining({
            moduleId: 'audit',
            targetNotFoundStepKeys: ['workspace'],
          }),
        }),
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Done mock tour' }))
    await waitFor(() => expect(screen.queryByTestId('joyride-running')).toBeNull())
  })

  it('does not render the prompt or start the tour for unauthorized users', async () => {
    renderTour({
      authUser: {
        id: 122,
        name: 'Unauthorized User',
        permissions: [],
      },
    })

    expect(screen.queryByText('Start Audit tutorial?')).toBeNull()

    window.dispatchEvent(
      new CustomEvent(AUDIT_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: 122,
        },
      }),
    )

    await waitFor(() => expect(screen.queryByTestId('joyride-running')).toBeNull())
  })

  it('resolves the critical anchors on mobile viewports', async () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    })
    window.dispatchEvent(new Event('resize'))

    renderTour()

    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Audit workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
  })
})
