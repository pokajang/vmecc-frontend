// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { usersQuickTour } from 'src/onboarding/usersQuickTourConfig'
import {
  USERS_TOUR_KEY,
  USERS_TOUR_REPLAY_EVENT,
  USERS_TOUR_VERSION,
} from 'src/onboarding/usersTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [USERS_TOUR_KEY]: {
          version: USERS_TOUR_VERSION,
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

const usersManager = {
  id: 101,
  name: 'Users Admin',
  email: 'users-admin@example.test',
  permissions: ['users.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const UsersRouteAnchors = ({ includeAnchors = true }) => {
  const location = useLocation()
  const pathname = location.pathname

  const isUsersRoute = /^\/admin\/users(?:\/[^/]+(?:\/[^/]+)?)?\/?$/i.test(pathname)

  if (!isUsersRoute) {
    return <main data-testid="outside-route">Outside users routes</main>
  }

  if (!includeAnchors) {
    return <main>Users loading</main>
  }

  if (pathname === '/admin/users' || pathname === '/admin/users/') {
    return (
      <main data-tour-id="users-module">
        <section data-tour-id="users-list">
          <div>Users list</div>
          <div data-tour-id="users-filters">Filters</div>
          <div data-tour-id="users-create-action">Create user</div>
        </section>
      </main>
    )
  }

  return (
    <main data-tour-id="users-module">
      <section data-tour-id="users-profile-entry">User profile</section>
    </main>
  )
}

const renderTour = ({
  authUser = usersManager,
  initialPath = '/admin/users',
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
          <UsersRouteAnchors includeAnchors={includeAnchors} />
          <OnboardingTourRunner config={usersQuickTour} />
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

describe('usersQuickTour', () => {
  it('does not auto-prompt on /admin/users and starts on hub replay', async () => {
    renderTour({ initialPath: '/admin/users' })

    expect(screen.queryByText('Start Users tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()

    window.dispatchEvent(
      new CustomEvent(USERS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: usersManager.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'User management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 5')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'User management workspace' })).getByRole(
        'button',
        { name: 'Next' },
      ),
    )
    await screen.findByRole('dialog', { name: 'User management sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'User list' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Search and filters' })
  })

  it('does not show the prompt on non-canonical users routes', () => {
    const paths = ['/admin/users/12', '/admin/users/12/admin-user']

    for (const path of paths) {
      cleanup()
      renderTour({ initialPath: path })
      expect(screen.queryByText('Start Users tutorial?')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
    }
  })

  it('replays in place on /admin/users/:id and uses the profile subset', async () => {
    renderTour({ initialPath: '/admin/users/12' })

    window.dispatchEvent(
      new CustomEvent(USERS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: usersManager.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'User management workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/admin/users/12')
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'User profile' })
  })

  it('replays from unsupported routes and resolves to the canonical users route', async () => {
    renderTour({ initialPath: '/admin/users/12/admin/slugged' })

    window.dispatchEvent(
      new CustomEvent(USERS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: usersManager.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'User management workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/admin/users')
    expect(screen.getByText('Step 1 of 5')).toBeTruthy()
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ initialPath: '/admin/users', includeAnchors: false })

    window.dispatchEvent(
      new CustomEvent(USERS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: usersManager.id,
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
