// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { overtimeManagementQuickTour } from 'src/onboarding/overtimeManagementQuickTourConfig'
import {
  OVERTIME_MANAGEMENT_TOUR_KEY,
  OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT,
  OVERTIME_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/overtimeManagementTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [OVERTIME_MANAGEMENT_TOUR_KEY]: {
          version: OVERTIME_MANAGEMENT_TOUR_VERSION,
          lastStartedAt: new Date().toISOString(),
        },
      },
    }),
  ),
}))

vi.mock('react-joyride', async () => {
  const ReactModule = await import('react')
  return {
    ACTIONS: { CLOSE: 'close', NEXT: 'next', PREV: 'prev', SKIP: 'skip' },
    EVENTS: {
      STEP_AFTER: 'step:after',
      TOOLTIP: 'tooltip',
      TARGET_NOT_FOUND: 'error:target_not_found',
    },
    STATUS: { FINISHED: 'finished', SKIPPED: 'skipped' },
    Joyride: ({ onEvent, run, steps, tooltipComponent: TooltipComponent }) => {
      const [stepIndex, setStepIndex] = ReactModule.useState(0)

      ReactModule.useEffect(() => {
        if (run) setStepIndex(0)
      }, [run])

      if (!run) return null

      const moveNext = () => {
        onEvent?.({ action: 'next', index: stepIndex, type: 'step:after' })
        if (stepIndex < steps.length - 1) setStepIndex((current) => current + 1)
      }

      const moveBack = () => {
        onEvent?.({ action: 'prev', index: stepIndex, type: 'step:after' })
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

const overtimeManagerUser = {
  id: 92,
  name: 'Overtime Manager',
  email: 'overtime-manager@example.test',
  permissions: ['staff.overtime.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const OvertimeManagementRouteAnchors = ({ includeAnchors = true }) => {
  const location = useLocation()
  const pathname = location.pathname

  const isIncludedRoute =
    pathname === '/staff/overtime-management/records' ||
    pathname === '/staff/overtime-management/rules' ||
    /^\/staff\/overtime-management\/record\/[^/]+$/i.test(pathname)

  if (!isIncludedRoute) {
    return <main data-testid="outside-route">Outside route</main>
  }

  if (!includeAnchors) {
    return <main>Overtime management loading</main>
  }

  if (pathname === '/staff/overtime-management/records') {
    return (
      <main data-tour-id="overtime-management-module">
        <nav data-tour-id="overtime-management-nav">Overtime tabs</nav>
        <section data-tour-id="overtime-management-records">Overtime records</section>
        <div data-tour-id="overtime-management-filters">Overtime filters</div>
      </main>
    )
  }

  if (pathname === '/staff/overtime-management/rules') {
    return (
      <main data-tour-id="overtime-management-module">
        <nav data-tour-id="overtime-management-nav">Overtime tabs</nav>
        <section data-tour-id="overtime-management-rules">Overtime rules</section>
      </main>
    )
  }

  return (
    <main data-tour-id="overtime-management-module">
      <section data-tour-id="overtime-management-detail">Overtime detail</section>
    </main>
  )
}

const renderTour = ({
  authUser = overtimeManagerUser,
  initialPath = '/staff/overtime-management/records',
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
          <OvertimeManagementRouteAnchors includeAnchors={includeAnchors} />
          <OnboardingTourRunner config={overtimeManagementQuickTour} />
        </NavigationGuardProvider>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
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

describe('overtimeManagementQuickTour', () => {
  it('shows the prompt on /staff/overtime-management/records only', async () => {
    renderTour({ initialPath: '/staff/overtime-management/records' })

    expect(screen.getByText('Start Overtime Management tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
  })

  it('does not show the prompt on overtime rules or detail routes', () => {
    const paths = ['/staff/overtime-management/rules', '/staff/overtime-management/record/abc-12']

    for (const path of paths) {
      cleanup()
      renderTour({ initialPath: path })
      expect(screen.queryByText('Start Overtime Management tutorial?')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
    }
  })

  it('replays in place on /staff/overtime-management/records and uses the records subset', async () => {
    renderTour({ initialPath: '/staff/overtime-management/records' })

    window.dispatchEvent(
      new CustomEvent(OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: overtimeManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Overtime management sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Overtime records' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Filters and search' })
  })

  it('replays in place on /staff/overtime-management/rules and uses the rules subset', async () => {
    renderTour({ initialPath: '/staff/overtime-management/rules' })

    window.dispatchEvent(
      new CustomEvent(OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: overtimeManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Overtime management sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Overtime rules' })
  })

  it('replays in place on /staff/overtime-management/record/:overtimeRouteKey and uses the detail subset', async () => {
    renderTour({ initialPath: '/staff/overtime-management/record/abc-12' })

    window.dispatchEvent(
      new CustomEvent(OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: overtimeManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Overtime management workspace' })).getByRole(
        'button',
        { name: 'Next' },
      ),
    )
    await screen.findByRole('dialog', { name: 'Overtime record detail' })
  })

  it('replays from legacy overtime routes and redirects to the canonical records route', async () => {
    renderTour({ initialPath: '/staff/overtime-management/legacy-route-key' })

    window.dispatchEvent(
      new CustomEvent(OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: overtimeManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime management workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe(
      '/staff/overtime-management/records',
    )
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ initialPath: '/staff/overtime-management/records', includeAnchors: false })

    window.dispatchEvent(
      new CustomEvent(OVERTIME_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: overtimeManagerUser.id },
      }),
    )

    expect(await screen.findByText('Preparing tutorial...', {}, { timeout: 1000 })).toBeTruthy()
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  }, 8000)
})
