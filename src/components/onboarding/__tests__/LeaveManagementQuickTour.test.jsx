// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { leaveManagementQuickTour } from 'src/onboarding/leaveManagementQuickTourConfig'
import {
  LEAVE_MANAGEMENT_TOUR_KEY,
  LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT,
  LEAVE_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/leaveManagementTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [LEAVE_MANAGEMENT_TOUR_KEY]: {
          version: LEAVE_MANAGEMENT_TOUR_VERSION,
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

const leaveManagerUser = {
  id: 91,
  name: 'Leave Manager',
  email: 'leave-manager@example.test',
  permissions: ['staff.leave.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const LeaveManagementRouteAnchors = ({ includeAnchors = true }) => {
  const location = useLocation()
  const pathname = location.pathname
  const [assignmentFormOpen, setAssignmentFormOpen] = React.useState(false)
  const [assignmentDetailOpen, setAssignmentDetailOpen] = React.useState(false)
  const [assignmentDetailEntryReady, setAssignmentDetailEntryReady] = React.useState(false)

  const isIncludedRoute =
    pathname === '/staff/leave-management/leaves' ||
    pathname === '/staff/leave-management/set-leaves' ||
    pathname === '/staff/leave-management/set-holidays' ||
    pathname === '/staff/leave-management/rules' ||
    /^\/staff\/leave-management\/record\/[^/]+$/i.test(pathname)

  if (!isIncludedRoute) {
    return <main data-testid="outside-route">Outside route</main>
  }

  if (!includeAnchors) {
    return <main>Leave management loading</main>
  }

  if (pathname === '/staff/leave-management/leaves') {
    return (
      <main data-tour-id="leave-management-module">
        <nav data-tour-id="leave-management-nav">Leave tabs</nav>
        <section data-tour-id="leave-management-records">Leave records</section>
        <div data-tour-id="leave-management-records-filters">Leave filters</div>
      </main>
    )
  }

  if (pathname === '/staff/leave-management/set-leaves') {
    return (
      <main data-tour-id="leave-management-module">
        <nav data-tour-id="leave-management-nav">Leave tabs</nav>
        <section data-tour-id="leave-management-assignments">
          <button
            type="button"
            data-tour-id="leave-management-assignment-create-action"
            onClick={() => {
              setAssignmentDetailOpen(false)
              setAssignmentDetailEntryReady(false)
              setAssignmentFormOpen(true)
            }}
          >
            Assign entitlement
          </button>
          {assignmentFormOpen ? (
            <div data-tour-id="leave-management-assignment-form">
              <div>Assignment form</div>
              <div data-tour-id="leave-management-assignment-activity">Assignment activity</div>
              <button
                type="button"
                data-tour-id="leave-management-assignment-form-close-action"
                onClick={() => {
                  setAssignmentFormOpen(false)
                  setAssignmentDetailEntryReady(true)
                }}
              >
                Close assignment form
              </button>
            </div>
          ) : null}
          <button
            type="button"
            data-tour-id="leave-management-assignment-row-actions"
            onClick={() => {
              setAssignmentFormOpen(false)
              setAssignmentDetailEntryReady(false)
              setAssignmentDetailOpen(true)
            }}
          >
            Open assignment detail
          </button>
          {assignmentDetailEntryReady ? (
            <div data-tour-id="leave-management-assignment-detail-entry">
              Assignment detail entry
            </div>
          ) : null}
          {assignmentDetailOpen ? (
            <div data-tour-id="leave-management-assignment-detail">Assignment detail</div>
          ) : null}
        </section>
      </main>
    )
  }

  if (pathname === '/staff/leave-management/set-holidays') {
    return (
      <main data-tour-id="leave-management-module">
        <nav data-tour-id="leave-management-nav">Leave tabs</nav>
        <section data-tour-id="leave-management-holidays">Holidays</section>
      </main>
    )
  }

  if (pathname === '/staff/leave-management/rules') {
    return (
      <main data-tour-id="leave-management-module">
        <nav data-tour-id="leave-management-nav">Leave tabs</nav>
        <section data-tour-id="leave-management-rules">Rules</section>
      </main>
    )
  }

  return (
    <main data-tour-id="leave-management-module">
      <section data-tour-id="leave-management-detail">Leave detail</section>
    </main>
  )
}

const renderTour = ({
  authUser = leaveManagerUser,
  initialPath = '/staff/leave-management/leaves',
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
          <LeaveManagementRouteAnchors includeAnchors={includeAnchors} />
          <OnboardingTourRunner config={leaveManagementQuickTour} />
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

describe('leaveManagementQuickTour', () => {
  it('shows the prompt on /staff/leave-management/leaves and mounts the records subset', async () => {
    renderTour({ initialPath: '/staff/leave-management/leaves' })

    expect(screen.getByText('Start Leave Management tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    expect(screen.getByTestId('location-path').textContent).toBe('/staff/leave-management/leaves')
    expect(screen.getByText('Leave records')).toBeTruthy()
    expect(screen.getByText('Leave filters')).toBeTruthy()
  })

  it('does not show the prompt on non-canonical leave management routes', () => {
    const paths = [
      '/staff/leave-management/set-leaves',
      '/staff/leave-management/set-holidays',
      '/staff/leave-management/rules',
      '/staff/leave-management/record/12',
    ]

    for (const path of paths) {
      cleanup()
      renderTour({ initialPath: path })
      expect(screen.queryByText('Start Leave Management tutorial?')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
    }
  })

  it('replays in place on /staff/leave-management/set-leaves and continues through the assignment CRUD subset', async () => {
    renderTour({ initialPath: '/staff/leave-management/set-leaves' })

    window.dispatchEvent(
      new CustomEvent(LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: leaveManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave management workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe(
      '/staff/leave-management/set-leaves',
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Leave management workspace' })).getByRole(
        'button',
        { name: 'Next' },
      ),
    )
    await screen.findByRole('dialog', { name: 'Leave management sections' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Leave management sections' })).getByRole(
        'button',
        { name: 'Next' },
      ),
    )
    await screen.findByRole('dialog', { name: 'Leave entitlements' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Leave entitlements' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Existing assignments' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Existing assignments' })).getByRole('button', {
        name: 'Next',
      }),
    )
    const assignmentCreateDialog = await screen.findByRole('dialog', { name: 'Assign entitlement' })
    fireEvent.click(
      within(assignmentCreateDialog).getByRole('button', { name: 'Open assignment form' }),
    )
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Assignment form' })).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Assignment form' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Assignment activity' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Assignment activity' })).getByRole('button', {
        name: 'Next',
      }),
    )
    const closeAssignmentFormDialog = await screen.findByRole('dialog', {
      name: 'Return to assignments',
    })
    fireEvent.click(
      within(closeAssignmentFormDialog).getByRole('button', { name: 'Close assignment form' }),
    )
    const assignmentDetailDialog = await screen.findByRole('dialog', {
      name: 'Open assignment detail',
    })
    fireEvent.click(
      within(assignmentDetailDialog).getByRole('button', { name: 'Open assignment detail' }),
    )
    await waitFor(() => expect(screen.getByText(/Assignment detail/)).toBeTruthy())
  })

  it('replays in place on /staff/leave-management/set-holidays and mounts the shell-only subset', async () => {
    renderTour({ initialPath: '/staff/leave-management/set-holidays' })

    window.dispatchEvent(
      new CustomEvent(LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: leaveManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    expect(screen.getByTestId('location-path').textContent).toBe(
      '/staff/leave-management/set-holidays',
    )
    expect(screen.getByText('Holidays')).toBeTruthy()
  })

  it('replays in place on /staff/leave-management/rules and mounts the shell-only subset', async () => {
    renderTour({ initialPath: '/staff/leave-management/rules' })

    window.dispatchEvent(
      new CustomEvent(LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: leaveManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    expect(screen.getByTestId('location-path').textContent).toBe('/staff/leave-management/rules')
    expect(screen.getByText('Rules')).toBeTruthy()
  })

  it('replays in place on /staff/leave-management/record/:leaveId and uses the detail subset', async () => {
    renderTour({ initialPath: '/staff/leave-management/record/12' })

    window.dispatchEvent(
      new CustomEvent(LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: leaveManagerUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Leave management workspace' })).getByRole(
        'button',
        { name: 'Next' },
      ),
    )
    await waitFor(() => expect(screen.getByText(/Leave detail/)).toBeTruthy())
  })

  it('replays from excluded aliases and redirects to canonical leaves route', async () => {
    const paths = ['/staff/leave-management/overtime', '/staff/leave-management/legacy-44']

    for (const path of paths) {
      cleanup()
      renderTour({ initialPath: path })

      window.dispatchEvent(
        new CustomEvent(LEAVE_MANAGEMENT_TOUR_REPLAY_EVENT, {
          detail: { source: 'tutorial_hub', userId: leaveManagerUser.id },
        }),
      )

      await waitFor(() =>
        expect(screen.getByRole('dialog', { name: 'Leave management workspace' })).toBeTruthy(),
      )
      expect(screen.getByTestId('location-path').textContent).toBe('/staff/leave-management/leaves')
    }
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ initialPath: '/staff/leave-management/leaves', includeAnchors: false })

    expect(screen.getByText('Start Leave Management tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    expect(await screen.findByText('Preparing tutorial...', {}, { timeout: 1000 })).toBeTruthy()
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  }, 8000)
})
