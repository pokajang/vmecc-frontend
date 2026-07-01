// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { staffDirectoryQuickTour } from 'src/onboarding/staffDirectoryQuickTourConfig'
import {
  STAFF_DIRECTORY_TOUR_KEY,
  STAFF_DIRECTORY_TOUR_REPLAY_EVENT,
  STAFF_DIRECTORY_TOUR_VERSION,
} from 'src/onboarding/staffDirectoryTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [STAFF_DIRECTORY_TOUR_KEY]: {
          version: STAFF_DIRECTORY_TOUR_VERSION,
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

const staffUser = {
  id: 81,
  name: 'Staff User',
  email: 'staff@example.test',
  permissions: ['staff.view'],
}

const staffManagerUser = {
  id: 82,
  name: 'Staff Manager',
  email: 'manager@example.test',
  permissions: ['staff.view', 'users.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const StaffRouteAnchors = ({ includeAnchors = true, profileVariant = 'message' }) => {
  const location = useLocation()
  const pathname = location.pathname
  const [messageModalOpen, setMessageModalOpen] = React.useState(profileVariant === 'messageModal')
  const [terminateModalOpen, setTerminateModalOpen] = React.useState(
    profileVariant === 'terminateModal',
  )
  const [rehireModalOpen, setRehireModalOpen] = React.useState(profileVariant === 'rehireModal')

  if (!pathname.startsWith('/staff')) {
    return <main data-testid="outside-route">Outside route</main>
  }

  if (!includeAnchors) {
    return <main>Staff directory loading</main>
  }

  if (pathname === '/staff/details') {
    return (
      <main data-tour-id="staff-directory-module">
        <section data-tour-id="staff-directory-records">Staff records</section>
        <div data-tour-id="staff-directory-filters">Staff filters</div>
        <div data-tour-id="staff-directory-list">Staff directory list</div>
      </main>
    )
  }

  if (/^\/staff\/profile\/[^/]+\/?$/i.test(pathname)) {
    return (
      <main data-tour-id="staff-directory-module">
        <section data-tour-id="staff-directory-profile">Staff profile</section>
        {profileVariant === 'message' ? (
          <div data-tour-id="staff-directory-profile-primary-action">
            <button
              type="button"
              data-tour-id="staff-directory-send-message-action"
              onClick={() => setMessageModalOpen(true)}
            >
              Send message
            </button>
          </div>
        ) : null}
        {profileVariant === 'terminate' ? (
          <>
            <div data-tour-id="staff-directory-profile-primary-action">
              <button
                type="button"
                data-tour-id="staff-directory-terminate-action"
                onClick={() => setTerminateModalOpen(true)}
              >
                Terminate
              </button>
            </div>
            <div data-tour-id="staff-directory-more-actions">More actions</div>
          </>
        ) : null}
        {profileVariant === 'rehire' ? (
          <div data-tour-id="staff-directory-profile-primary-action">
            <button
              type="button"
              data-tour-id="staff-directory-rehire-action"
              onClick={() => setRehireModalOpen(true)}
            >
              Rehire
            </button>
          </div>
        ) : null}
        {messageModalOpen ? (
          <div data-tour-id="staff-directory-message-modal">
            <div data-tour-id="staff-directory-message-composer">Message composer</div>
          </div>
        ) : null}
        {terminateModalOpen ? (
          <div data-tour-id="staff-directory-terminate-modal">Terminate modal</div>
        ) : null}
        {rehireModalOpen ? (
          <div data-tour-id="staff-directory-rehire-modal">Rehire modal</div>
        ) : null}
      </main>
    )
  }

  return <main data-testid="outside-route">Outside route</main>
}

const renderTour = ({
  authUser = staffUser,
  initialPath = '/staff/details',
  includeAnchors = true,
  profileVariant = 'message',
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
          <StaffRouteAnchors includeAnchors={includeAnchors} profileVariant={profileVariant} />
          <OnboardingTourRunner config={staffDirectoryQuickTour} />
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

describe('staffDirectoryQuickTour', () => {
  it('shows the prompt on /staff/details only and starts the list-route subset', async () => {
    renderTour({ initialPath: '/staff/details' })

    expect(screen.getByText('Start Staff Directory tutorial?')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start tutorial' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Staff directory workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Staff directory workspace' })).getByRole(
        'button',
        {
          name: 'Next',
        },
      ),
    )
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Staff records' })).toBeTruthy())
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Staff records' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Filters and search' })).toBeTruthy(),
    )
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Filters and search' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Directory list' })).toBeTruthy())
  })

  it('does not show the prompt on /staff/profile/:id because prompt routes stay canonical', () => {
    renderTour({ initialPath: '/staff/profile/44' })

    expect(screen.queryByText('Start Staff Directory tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays from outside the route family and navigates to /staff/details', async () => {
    renderTour({ initialPath: '/dashboard' })

    window.dispatchEvent(
      new CustomEvent(STAFF_DIRECTORY_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: staffUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Staff directory workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/staff/details')
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
  })

  it('replays in place on /staff/profile/:id and continues through the message modal path', async () => {
    renderTour({ initialPath: '/staff/profile/44', profileVariant: 'message' })

    window.dispatchEvent(
      new CustomEvent(STAFF_DIRECTORY_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: staffUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Staff directory workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/staff/profile/44')
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Staff directory workspace' })).getByRole(
        'button',
        {
          name: 'Next',
        },
      ),
    )
    await screen.findByRole('dialog', { name: 'Staff profile' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Staff profile' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Send message' })
    fireEvent.click(screen.getByRole('button', { name: 'Open message modal' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Message modal shell' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Message modal shell' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Message composer' })
  })

  it('replays in place on /staff/profile/:id and continues through the terminate modal path', async () => {
    renderTour({
      authUser: staffManagerUser,
      initialPath: '/staff/profile/44',
      profileVariant: 'terminate',
    })

    window.dispatchEvent(
      new CustomEvent(STAFF_DIRECTORY_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: staffManagerUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Staff directory workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Staff profile' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'More profile actions' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Terminate staff shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Open terminate modal' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Terminate modal shell' })).toBeTruthy(),
    )
  })

  it('replays in place on /staff/profile/:id and continues through the rehire modal path', async () => {
    renderTour({
      authUser: staffManagerUser,
      initialPath: '/staff/profile/44',
      profileVariant: 'rehire',
    })

    window.dispatchEvent(
      new CustomEvent(STAFF_DIRECTORY_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: staffManagerUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Staff directory workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Staff profile' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Rehire staff shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Open rehire modal' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Rehire modal shell' })).toBeTruthy(),
    )
  })

  it('shows preparing and not-ready recovery states when replay starts before anchors load', async () => {
    renderTour({ initialPath: '/staff/details', includeAnchors: false })

    window.dispatchEvent(
      new CustomEvent(STAFF_DIRECTORY_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: staffUser.id,
        },
      }),
    )

    await screen.findByText('Preparing tutorial...')
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  }, 8000)
})
