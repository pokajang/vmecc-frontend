// @vitest-environment jsdom
import React, { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider, useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import { salaryClaimsManagementQuickTour } from 'src/onboarding/salaryClaimsManagementQuickTourConfig'
import {
  SALARY_CLAIMS_MANAGEMENT_TOUR_KEY,
  SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT,
  SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/salaryClaimsManagementTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [SALARY_CLAIMS_MANAGEMENT_TOUR_KEY]: {
          version: SALARY_CLAIMS_MANAGEMENT_TOUR_VERSION,
          lastStartedAt: new Date().toISOString(),
        },
      },
    }),
  ),
}))

vi.mock('react-joyride', () => import('./joyrideTestMock'))

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

const salaryManagerUser = {
  id: 93,
  name: 'Salary Manager',
  email: 'salary-manager@example.test',
  permissions: ['staff.salary.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const GuardProbe = ({ activePath = null, message = 'Unsaved salary settings changes.' }) => {
  const location = useLocation()
  const { registerGuard, unregisterGuard } = useNavigationGuard()

  useEffect(() => {
    registerGuard('salary-claims-tour-test', {
      active: Boolean(activePath) && location.pathname === activePath,
      message,
    })
    return () => unregisterGuard('salary-claims-tour-test')
  }, [activePath, location.pathname, message, registerGuard, unregisterGuard])

  return null
}

const SalaryClaimsManagementRouteAnchors = ({ includeAnchors = true }) => {
  const location = useLocation()
  const pathname = location.pathname

  const isIncludedRoute =
    pathname === '/staff/salary-claims/claims' ||
    pathname === '/staff/salary-claims/salary' ||
    pathname === '/staff/salary-claims/set-salary' ||
    /^\/staff\/salary-claims\/claim\/[^/]+$/i.test(pathname) ||
    /^\/staff\/(?:salary-claims|set-salary)\/assignment\/(?:new|[^/]+\/(?:edit|view))\/?$/i.test(
      pathname,
    )

  if (!isIncludedRoute) {
    return <main data-testid="outside-route">Outside route</main>
  }

  if (!includeAnchors) {
    return <main>Salary claims management loading</main>
  }

  if (pathname === '/staff/salary-claims/claims') {
    return (
      <main data-tour-id="salary-claims-management-module">
        <nav data-tour-id="salary-claims-management-nav">Salary claim tabs</nav>
        <section data-tour-id="salary-claims-management-claims">Claim records</section>
        <div data-tour-id="salary-claims-management-claims-filters">Claim filters</div>
      </main>
    )
  }

  if (pathname === '/staff/salary-claims/salary') {
    return (
      <main data-tour-id="salary-claims-management-module">
        <nav data-tour-id="salary-claims-management-nav">Salary claim tabs</nav>
        <section data-tour-id="salary-claims-management-salary">Salary records</section>
        <div data-tour-id="salary-claims-management-salary-filters">Salary filters</div>
      </main>
    )
  }

  if (pathname === '/staff/salary-claims/set-salary') {
    return (
      <main data-tour-id="salary-claims-management-module">
        <nav data-tour-id="salary-claims-management-nav">Salary claim tabs</nav>
        <section data-tour-id="salary-claims-management-assignment-list">
          Assignment records
        </section>
        <button type="button" data-tour-id="salary-claims-management-assignment-create-action">
          Assign salary
        </button>
        <button
          type="button"
          data-tour-id="salary-claims-management-assignment-draft-resume-action"
        >
          Resume assignment draft
        </button>
        <button type="button" data-tour-id="salary-claims-management-assignment-delete-action">
          Delete assignment
        </button>
        <section data-tour-id="salary-claims-management-assignment-history">
          Assignment history
        </section>
        <div data-tour-id="salary-claims-management-assignment-delete-modal">
          Assignment delete modal
        </div>
      </main>
    )
  }

  if (/^\/staff\/(?:salary-claims|set-salary)\/assignment\/[^/]+\/view\/?$/i.test(pathname)) {
    return (
      <main data-tour-id="salary-claims-management-module">
        <section data-tour-id="salary-claims-management-assignment-history">
          Assignment history
        </section>
        <section data-tour-id="salary-claims-management-assignment-form">Assignment form</section>
        <button type="button" data-tour-id="salary-claims-management-assignment-edit-action">
          Edit assignment
        </button>
      </main>
    )
  }

  if (
    /^\/staff\/(?:salary-claims|set-salary)\/assignment\/(?:new|[^/]+\/edit)\/?$/i.test(pathname)
  ) {
    return (
      <main data-tour-id="salary-claims-management-module">
        <section data-tour-id="salary-claims-management-assignment-form">Assignment form</section>
      </main>
    )
  }

  return (
    <main data-tour-id="salary-claims-management-module">
      <section data-tour-id="salary-claims-management-detail">Claim detail</section>
    </main>
  )
}

const renderTour = ({
  authUser = salaryManagerUser,
  initialPath = '/staff/salary-claims/claims',
  includeAnchors = true,
  guardPath = null,
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
          <SalaryClaimsManagementRouteAnchors includeAnchors={includeAnchors} />
          <OnboardingTourRunner config={salaryClaimsManagementQuickTour} />
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

describe('salaryClaimsManagementQuickTour', () => {
  it('shows the prompt on /staff/salary-claims/claims only', async () => {
    renderTour({ initialPath: '/staff/salary-claims/claims' })

    expect(screen.getByText('Start Salary Claims Management tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
  })

  it('does not show the prompt on salary, detail, or assignment routes', () => {
    const paths = [
      '/staff/salary-claims/salary',
      '/staff/salary-claims/claim/66',
      '/staff/salary-claims/set-salary',
      '/staff/set-salary/assignment/new',
    ]

    for (const path of paths) {
      cleanup()
      renderTour({ initialPath: path })
      expect(screen.queryByText('Start Salary Claims Management tutorial?')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
    }
  })

  it('replays in place on /staff/salary-claims/claims and uses the claims subset', async () => {
    renderTour({ initialPath: '/staff/salary-claims/claims' })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Step 2 of/)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Step 3 of/)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Step 4 of/)
  })

  it('replays in place on /staff/salary-claims/salary and uses the salary subset', async () => {
    renderTour({ initialPath: '/staff/salary-claims/salary' })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Step 2 of/)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Step 3 of/)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Step 4 of/)
  })

  it('replays in place on /staff/salary-claims/claim/:claimId and uses the detail subset', async () => {
    renderTour({ initialPath: '/staff/salary-claims/claim/66' })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Salary claims management workspace' })).getByRole(
        'button',
        { name: 'Next' },
      ),
    )
    await screen.findByRole('dialog', { name: 'Claim detail' })
  })

  it('replays in place on /staff/salary-claims/set-salary and uses the assignment-list subset', async () => {
    renderTour({ initialPath: '/staff/salary-claims/set-salary' })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Salary claims sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Salary assignment list' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assign salary' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Resume assignment draft' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assignment delete shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assignment history' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assignment delete modal' })
  })

  it('replays in place on assignment create routes and uses the assignment-form subset', async () => {
    renderTour({ initialPath: '/staff/set-salary/assignment/new' })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assignment form' })
  })

  it('replays in place on assignment view routes and uses the history/detail subset', async () => {
    renderTour({ initialPath: '/staff/set-salary/assignment/88/view' })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assignment history' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assignment form' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Assignment edit shell' })
  })

  it('uses guarded navigation before cross-route replay leaves a dirty page', async () => {
    renderTour({ initialPath: '/dashboard', guardPath: '/dashboard' })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    await waitFor(() => expect(screen.getByText('Discard unsaved changes?')).toBeTruthy())
    expect(screen.getByTestId('location-path').textContent).toBe('/dashboard')
    expect(screen.queryByRole('dialog', { name: 'Salary claims management workspace' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))

    await waitFor(() =>
      expect(screen.getByTestId('location-path').textContent).toBe('/staff/salary-claims/claims'),
    )
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Salary claims management workspace' }),
      ).toBeTruthy(),
    )
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ initialPath: '/staff/salary-claims/claims', includeAnchors: false })

    window.dispatchEvent(
      new CustomEvent(SALARY_CLAIMS_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: salaryManagerUser.id },
      }),
    )

    expect(await screen.findByText('Preparing tutorial...', {}, { timeout: 1000 })).toBeTruthy()
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  }, 8000)
})
