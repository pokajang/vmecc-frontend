// @vitest-environment jsdom
import React, { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider, useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import { payrollClaimsQuickTour } from 'src/onboarding/payrollClaimsQuickTourConfig'
import {
  PAYROLL_CLAIMS_TOUR_KEY,
  PAYROLL_CLAIMS_TOUR_REPLAY_EVENT,
  PAYROLL_CLAIMS_TOUR_VERSION,
} from 'src/onboarding/payrollClaimsTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [PAYROLL_CLAIMS_TOUR_KEY]: {
          version: PAYROLL_CLAIMS_TOUR_VERSION,
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

const payrollUser = {
  id: 72,
  name: 'Payroll User',
  email: 'payroll@example.test',
  permissions: ['self.payroll'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const GuardProbe = ({ activePath = null, message = 'Unsaved dashboard changes.' }) => {
  const location = useLocation()
  const { registerGuard, unregisterGuard } = useNavigationGuard()

  useEffect(() => {
    registerGuard('payroll-tour-test', {
      active: Boolean(activePath) && location.pathname === activePath,
      message,
    })
    return () => unregisterGuard('payroll-tour-test')
  }, [activePath, location.pathname, message, registerGuard, unregisterGuard])

  return null
}

const PayrollRouteAnchors = ({
  includeAnchors = true,
  formRoute = '/payroll/claims/new/expense',
}) => {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname

  if (!pathname.startsWith('/payroll')) {
    return <main data-testid="outside-route">Outside route</main>
  }

  if (!includeAnchors) {
    return <main>Payroll module loading</main>
  }

  if (pathname === '/payroll' || pathname === '/payroll/claims') {
    return (
      <main data-tour-id="payroll-module">
        <nav data-tour-id="payroll-nav">Payroll sections</nav>
        <section data-tour-id="payroll-claims">Claim records</section>
        <div data-tour-id="payroll-claims-filters">Claim filters</div>
        <button type="button" data-tour-id="payroll-new-claim-action">
          Apply Claim
        </button>
        <button type="button" data-tour-id="payroll-claim-draft-resume-action">
          Resume draft
        </button>
      </main>
    )
  }

  if (pathname === '/payroll/claims/new') {
    return (
      <main data-tour-id="payroll-module">
        <section data-tour-id="payroll-claim-type-selection">Claim type selection</section>
        <button
          type="button"
          data-tour-id="payroll-claim-type-continue"
          onClick={() => navigate(formRoute)}
        >
          Continue
        </button>
      </main>
    )
  }

  if (pathname === '/payroll/claims/new/expense' || pathname === '/payroll/claims/new/salary') {
    return (
      <main data-tour-id="payroll-module">
        <section data-tour-id="payroll-claim-form">Claim form</section>
        <section data-tour-id="payroll-claim-draft-panel">Draft panel</section>
        <section data-tour-id="payroll-claim-attachments">Attachments</section>
        <button type="button" data-tour-id="payroll-claim-submit-action">
          Submit request
        </button>
      </main>
    )
  }

  if (/^\/payroll\/claims\/\d+\/?$/i.test(pathname)) {
    return (
      <main data-tour-id="payroll-module">
        <section data-tour-id="payroll-claim-detail">Claim detail</section>
        <button type="button" data-tour-id="payroll-claim-edit-action">
          Edit claim
        </button>
        <button type="button" data-tour-id="payroll-claim-cancel-action">
          Cancel claim
        </button>
        <button type="button" data-tour-id="payroll-claim-delete-action">
          Delete claim
        </button>
        <div data-tour-id="payroll-claim-cancel-modal">Cancel modal</div>
        <div data-tour-id="payroll-claim-delete-modal">Delete modal</div>
      </main>
    )
  }

  if (pathname === '/payroll/payslips') {
    return (
      <main data-tour-id="payroll-module">
        <nav data-tour-id="payroll-nav">Payroll sections</nav>
        <section data-tour-id="payroll-payslips">Payslips</section>
        <button type="button" data-tour-id="payroll-payslip-download-action">
          Download payslip
        </button>
      </main>
    )
  }

  return <main data-testid="outside-route">Outside route</main>
}

const renderTour = ({
  authUser = payrollUser,
  initialPath = '/payroll',
  guardPath = null,
  includeAnchors = true,
  formRoute = '/payroll/claims/new/expense',
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
          <GuardProbe activePath={guardPath} />
          <LocationProbe />
          <PayrollRouteAnchors includeAnchors={includeAnchors} formRoute={formRoute} />
          <OnboardingTourRunner config={payrollClaimsQuickTour} />
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

describe('payrollClaimsQuickTour', () => {
  it('does not show the direct prompt on /payroll in hub-first mode', () => {
    renderTour({ initialPath: '/payroll' })

    expect(screen.queryByText('Start Payroll tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays in place on /payroll and uses the list-route subset', async () => {
    renderTour({ initialPath: '/payroll' })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll')
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.queryByTestId('joyride-running')).toBeNull())
  })

  it('replays in place on /payroll/claims and uses the list-route subset', async () => {
    renderTour({ initialPath: '/payroll/claims' })

    expect(screen.queryByText('Start Payroll tutorial?')).toBeNull()

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll/claims')
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.queryByTestId('joyride-running')).toBeNull())
  })

  it('replays in place on /payroll/claims/new and continues into the form subset', async () => {
    renderTour({ initialPath: '/payroll/claims/new' })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll/claims/new')
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Choose claim type' })
    fireEvent.click(screen.getByRole('button', { name: 'Open claim form' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Claim form' })).toBeTruthy())
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll/claims/new/expense')
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
  })

  it('replays in place on /payroll/claims/new/expense and uses the form subset', async () => {
    renderTour({ initialPath: '/payroll/claims/new/expense' })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll/claims/new/expense')
    expect(screen.getByText('Step 1 of 5')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Claim form' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Draft panel' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Supporting items and attachments' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Submit request' })
  })

  it('replays in place on /payroll/claims/new/salary and uses the form subset', async () => {
    renderTour({ initialPath: '/payroll/claims/new/salary' })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll/claims/new/salary')
    expect(screen.getByText('Step 1 of 5')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Claim form' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Draft panel' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Supporting items and attachments' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Submit request' })
  })

  it('replays in place on /payroll/claims/:claimId and uses the detail subset', async () => {
    renderTour({ initialPath: '/payroll/claims/44' })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll/claims/44')
    expect(screen.getByText('Step 1 of 7')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Payroll workspace' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Claim detail' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Edit action shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Cancel action shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Delete action shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Cancel modal shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Delete modal shell' })
  })

  it('replays in place on /payroll/payslips and uses the payslips subset', async () => {
    renderTour({ initialPath: '/payroll/payslips' })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/payroll/payslips')
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Payroll sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Payslips' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Payslip download shell' })
  })

  it('uses guarded navigation before cross-route replay leaves a dirty page', async () => {
    renderTour({ initialPath: '/dashboard', guardPath: '/dashboard' })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    await waitFor(() => expect(screen.getByText('Discard unsaved changes?')).toBeTruthy())
    expect(screen.getByTestId('location-path').textContent).toBe('/dashboard')
    expect(screen.queryByRole('dialog', { name: 'Payroll workspace' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))

    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/payroll'))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Payroll workspace' })).toBeTruthy(),
    )
  })

  it('shows preparing and not-ready recovery states when replay starts before anchors load', async () => {
    renderTour({ initialPath: '/payroll', includeAnchors: false })

    window.dispatchEvent(
      new CustomEvent(PAYROLL_CLAIMS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: payrollUser.id,
        },
      }),
    )

    expect(await screen.findByText('Preparing tutorial...', {}, { timeout: 1000 })).toBeTruthy()
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  }, 8000)
})
