// @vitest-environment jsdom
import React, { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider, useNavigationGuard } from 'src/contexts/NavigationGuardContext'
import { myOvertimeQuickTour } from 'src/onboarding/myOvertimeQuickTourConfig'
import {
  MY_OVERTIME_TOUR_KEY,
  MY_OVERTIME_TOUR_REPLAY_EVENT,
  MY_OVERTIME_TOUR_VERSION,
} from 'src/onboarding/myOvertimeTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [MY_OVERTIME_TOUR_KEY]: {
          version: MY_OVERTIME_TOUR_VERSION,
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

const overtimeUser = {
  id: 61,
  name: 'Overtime User',
  email: 'overtime@example.test',
  permissions: ['self.overtime'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const GuardProbe = ({ activePath = null, message = 'Unsaved dashboard changes.' }) => {
  const location = useLocation()
  const { registerGuard, unregisterGuard } = useNavigationGuard()

  useEffect(() => {
    registerGuard('overtime-tour-test', {
      active: Boolean(activePath) && location.pathname === activePath,
      message,
    })
    return () => unregisterGuard('overtime-tour-test')
  }, [activePath, location.pathname, message, registerGuard, unregisterGuard])

  return null
}

const OvertimeRouteAnchors = ({ newOvertimeVariant = 'type' }) => {
  const location = useLocation()
  const [variant, setVariant] = useState(newOvertimeVariant)

  if (location.pathname === '/overtime') {
    return (
      <main data-tour-id="overtime-module">
        <section data-tour-id="overtime-records">Overtime records</section>
        <div data-tour-id="overtime-filters">Overtime filters</div>
        <button type="button" data-tour-id="overtime-new-action">
          Apply Overtime
        </button>
      </main>
    )
  }

  if (location.pathname === '/overtime/new') {
    if (variant === 'type') {
      return (
        <main data-tour-id="overtime-module">
          <section data-tour-id="overtime-type-selection">Overtime type selection</section>
          <button
            type="button"
            data-tour-id="overtime-type-continue"
            onClick={() => setVariant('form')}
          >
            Continue
          </button>
        </main>
      )
    }

    return (
      <main data-tour-id="overtime-module">
        <section data-tour-id="overtime-apply">Overtime form</section>
        <section data-tour-id="overtime-utility-panel">Duration summary</section>
        <div data-tour-id="overtime-draft-panel">
          <button type="button" data-tour-id="overtime-draft-action">
            Save draft
          </button>
          <button type="button" data-tour-id="overtime-submit-action">
            Submit request
          </button>
        </div>
      </main>
    )
  }

  if (/^\/overtime\/[^/]+\/?$/i.test(location.pathname)) {
    return (
      <main data-tour-id="overtime-module">
        <section data-tour-id="overtime-detail">Overtime detail</section>
        <button type="button" data-tour-id="overtime-edit-action">
          Edit
        </button>
        <button type="button" data-tour-id="overtime-cancel-action">
          Cancel
        </button>
        <button type="button" data-tour-id="overtime-delete-action">
          Delete
        </button>
        <div data-tour-id="overtime-cancel-modal">Cancel modal</div>
        <div data-tour-id="overtime-delete-modal">Delete modal</div>
      </main>
    )
  }

  return <main data-testid="outside-route">Outside route</main>
}

const renderTour = ({
  authUser = overtimeUser,
  initialPath = '/overtime',
  guardPath = null,
  newOvertimeVariant = 'type',
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
          <OvertimeRouteAnchors newOvertimeVariant={newOvertimeVariant} />
          <OnboardingTourRunner config={myOvertimeQuickTour} />
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

describe('myOvertimeQuickTour', () => {
  it('shows the prompt on /overtime only and starts the plain-string tour copy', async () => {
    renderTour({ initialPath: '/overtime' })

    expect(screen.getByText('Start Overtime tutorial?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start tutorial' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Skip' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.queryByTestId('joyride-running')).toBeNull())
  })

  it('does not show the prompt on /overtime/new because prompt routes stay list-only', () => {
    renderTour({ initialPath: '/overtime/new' })

    expect(screen.queryByText('Start Overtime tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays in place on /overtime/new before type confirmation and continues into the form subset', async () => {
    renderTour({ initialPath: '/overtime/new', newOvertimeVariant: 'type' })

    window.dispatchEvent(
      new CustomEvent(MY_OVERTIME_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: overtimeUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/overtime/new')
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Choose overtime type' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Open application form' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Application form' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 5')).toBeTruthy()
  })

  it('replays in place on /overtime/new after type confirmation and uses the form subset', async () => {
    renderTour({ initialPath: '/overtime/new', newOvertimeVariant: 'form' })

    window.dispatchEvent(
      new CustomEvent(MY_OVERTIME_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: overtimeUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/overtime/new')
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Application form' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Form utility panel' })).toBeTruthy(),
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

  it('replays in place on /overtime/:overtimeId and uses the detail subset', async () => {
    renderTour({ initialPath: '/overtime/OT-001' })

    window.dispatchEvent(
      new CustomEvent(MY_OVERTIME_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: overtimeUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/overtime/OT-001')
    expect(screen.getByText('Step 1 of 7')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Overtime workspace' })).getByRole('button', {
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
      new CustomEvent(MY_OVERTIME_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: overtimeUser.id,
        },
      }),
    )

    await waitFor(() => expect(screen.getByText('Discard unsaved changes?')).toBeTruthy())
    expect(screen.getByTestId('location-path').textContent).toBe('/dashboard')
    expect(screen.queryByRole('dialog', { name: 'Overtime workspace' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))

    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/overtime'))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Overtime workspace' })).toBeTruthy(),
    )
  })
})
