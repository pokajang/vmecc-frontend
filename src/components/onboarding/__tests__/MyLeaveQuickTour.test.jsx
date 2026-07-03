// @vitest-environment jsdom
import React, { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider, useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import { myLeaveQuickTour } from 'src/onboarding/myLeaveQuickTourConfig'
import {
  MY_LEAVE_TOUR_KEY,
  MY_LEAVE_TOUR_REPLAY_EVENT,
  MY_LEAVE_TOUR_VERSION,
} from 'src/onboarding/myLeaveTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [MY_LEAVE_TOUR_KEY]: {
          version: MY_LEAVE_TOUR_VERSION,
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

const leaveUser = {
  id: 52,
  name: 'Leave User',
  email: 'leave@example.test',
  permissions: ['self.leave'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const GuardProbe = ({ activePath = null, message = 'Unsaved dashboard changes.' }) => {
  const location = useLocation()
  const { registerGuard, unregisterGuard } = useNavigationGuard()

  useEffect(() => {
    registerGuard('leave-tour-test', {
      active: Boolean(activePath) && location.pathname === activePath,
      message,
    })
    return () => unregisterGuard('leave-tour-test')
  }, [activePath, location.pathname, message, registerGuard, unregisterGuard])

  return null
}

const LeaveRouteAnchors = ({ newLeaveVariant = 'type' }) => {
  const location = useLocation()
  const [variant, setVariant] = useState(newLeaveVariant)

  if (location.pathname === '/leave') {
    return (
      <main data-tour-id="leave-module">
        <section data-tour-id="leave-records">Leave records</section>
        <div data-tour-id="leave-filters">Leave filters</div>
        <button type="button" data-tour-id="leave-new-action">
          Apply Leave
        </button>
      </main>
    )
  }

  if (location.pathname === '/leave/new') {
    if (variant === 'type') {
      return (
        <main data-tour-id="leave-module">
          <section data-tour-id="leave-type-selection">Leave type selection</section>
          <button
            type="button"
            data-tour-id="leave-type-continue"
            onClick={() => setVariant('form')}
          >
            Continue
          </button>
        </main>
      )
    }

    return (
      <main data-tour-id="leave-module">
        <section data-tour-id="leave-apply">Leave form</section>
        <section data-tour-id="leave-balance">Leave balance</section>
        <section data-tour-id="leave-attachments">Attachments</section>
        <div data-tour-id="leave-draft-panel">
          <button type="button" data-tour-id="leave-draft-action">
            Save draft
          </button>
          <button type="button" data-tour-id="leave-submit-action">
            Submit request
          </button>
        </div>
      </main>
    )
  }

  if (/^\/leave\/[^/]+\/?$/i.test(location.pathname)) {
    return (
      <main data-tour-id="leave-module">
        <section data-tour-id="leave-detail">Leave detail</section>
        <button type="button" data-tour-id="leave-edit-action">
          Edit
        </button>
        <button type="button" data-tour-id="leave-cancel-action">
          Cancel
        </button>
        <button type="button" data-tour-id="leave-delete-action">
          Delete
        </button>
        <div data-tour-id="leave-cancel-modal">Cancel modal</div>
        <div data-tour-id="leave-delete-modal">Delete modal</div>
      </main>
    )
  }

  return <main data-testid="outside-route">Outside route</main>
}

const renderTour = ({
  authUser = leaveUser,
  initialPath = '/leave',
  guardPath = null,
  newLeaveVariant = 'type',
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
          <LeaveRouteAnchors newLeaveVariant={newLeaveVariant} />
          <OnboardingTourRunner config={myLeaveQuickTour} />
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

describe('myLeaveQuickTour', () => {
  it('shows the prompt on /leave only and starts the plain-string tour copy', async () => {
    renderTour({ initialPath: '/leave' })

    expect(screen.getByText('Start Leave tutorial?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start tutorial' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Leave records' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Filters and search' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Apply leave' })
    fireEvent.click(screen.getByRole('button', { name: 'Continue to application' }))
    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/leave/new'))
    await screen.findByRole('dialog', { name: 'Choose leave type' })
    expect(screen.getByText('Step 1 of 1')).toBeTruthy()
  })

  it('does not show the prompt on /leave/new because prompt routes stay list-only', () => {
    renderTour({ initialPath: '/leave/new' })

    expect(screen.queryByText('Start Leave tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays in place on /leave/new before type confirmation and continues into the form subset', async () => {
    renderTour({ initialPath: '/leave/new', newLeaveVariant: 'type' })

    window.dispatchEvent(
      new CustomEvent(MY_LEAVE_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: leaveUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/leave/new')
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Choose leave type' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open application form' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Application form' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
  })

  it('replays in place on /leave/new after type confirmation and uses the form subset', async () => {
    renderTour({ initialPath: '/leave/new', newLeaveVariant: 'form' })

    window.dispatchEvent(
      new CustomEvent(MY_LEAVE_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: leaveUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/leave/new')
    expect(screen.getByText('Step 1 of 7')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Application form' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Balance review' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Attachments area' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Draft action panel' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Save draft' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Submit request' })).toBeTruthy())
  })

  it('replays in place on /leave/:leaveId and uses the detail subset', async () => {
    renderTour({ initialPath: '/leave/LEAVE-001' })

    window.dispatchEvent(
      new CustomEvent(MY_LEAVE_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: leaveUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/leave/LEAVE-001')
    expect(screen.getByText('Step 1 of 7')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Leave workspace' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Request detail' })
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

  it('uses guarded navigation before cross-route replay leaves a dirty page', async () => {
    renderTour({ initialPath: '/dashboard', guardPath: '/dashboard' })

    window.dispatchEvent(
      new CustomEvent(MY_LEAVE_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: leaveUser.id,
        },
      }),
    )

    await waitFor(() => expect(screen.getByText('Discard unsaved changes?')).toBeTruthy())
    expect(screen.getByTestId('location-path').textContent).toBe('/dashboard')
    expect(screen.queryByRole('dialog', { name: 'Leave workspace' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))

    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/leave'))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Leave workspace' })).toBeTruthy(),
    )
  })
})
