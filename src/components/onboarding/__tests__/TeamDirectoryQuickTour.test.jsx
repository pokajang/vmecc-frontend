// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { teamDirectoryQuickTour } from 'src/onboarding/teamDirectoryQuickTourConfig'
import {
  TEAM_DIRECTORY_TOUR_KEY,
  TEAM_DIRECTORY_TOUR_REPLAY_EVENT,
  TEAM_DIRECTORY_TOUR_VERSION,
} from 'src/onboarding/teamDirectoryTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [TEAM_DIRECTORY_TOUR_KEY]: {
          version: TEAM_DIRECTORY_TOUR_VERSION,
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
        if (stepIndex < steps.length - 1) {
          setStepIndex((current) => current + 1)
        }
        onEvent?.({
          action: 'next',
          index: stepIndex,
          type: 'step:after',
        })
      }

      const moveBack = () => {
        setStepIndex((current) => Math.max(0, current - 1))
        onEvent?.({
          action: 'prev',
          index: stepIndex,
          type: 'step:after',
        })
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

const teamUser = {
  id: 88,
  name: 'Team Admin',
  email: 'team-admin@example.test',
  permissions: ['teams.view', 'teams.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const TeamDirectoryRouteAnchors = ({ includeAnchors = true }) => {
  const location = useLocation()
  const pathname = location.pathname
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showEditModal, setShowEditModal] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)

  const isIncludedRoute = pathname === '/team/details' || /^\/team\/details\/[^/]+$/i.test(pathname)

  if (!isIncludedRoute) {
    return <main data-testid="outside-route">Outside route</main>
  }

  if (!includeAnchors) {
    return <main>Team directory loading</main>
  }

  if (pathname === '/team/details') {
    return (
      <main data-tour-id="team-directory-module">
        <section data-tour-id="team-directory-teams">Teams</section>
        <div data-tour-id="team-directory-grid">Team grid</div>
        <button
          type="button"
          data-tour-id="team-directory-create-action"
          onClick={() => setShowCreateModal(true)}
        >
          Add Team
        </button>
        {showCreateModal ? (
          <div data-tour-id="team-directory-create-modal">
            <div data-tour-id="team-directory-create-defaults">Default teams</div>
            <div data-tour-id="team-directory-create-custom">Custom teams</div>
          </div>
        ) : null}
      </main>
    )
  }

  return (
    <main data-tour-id="team-directory-module">
      <section data-tour-id="team-directory-detail">Team detail</section>
      <button
        type="button"
        data-tour-id="team-directory-detail-edit-action"
        onClick={() => {
          setShowDeleteModal(false)
          setShowEditModal(true)
        }}
      >
        Edit Team
      </button>
      {showEditModal ? (
        <div data-tour-id="team-directory-edit-modal">
          <div data-tour-id="team-directory-members-editor">Members editor</div>
          <div data-tour-id="team-directory-image-picker">Image picker</div>
          <button
            type="button"
            data-tour-id="team-directory-delete-action"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete team
          </button>
        </div>
      ) : null}
      {showDeleteModal ? (
        <div data-tour-id="team-directory-delete-modal">Delete team modal</div>
      ) : null}
    </main>
  )
}

const renderTour = ({
  authUser = teamUser,
  initialPath = '/team/details',
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
          <TeamDirectoryRouteAnchors includeAnchors={includeAnchors} />
          <OnboardingTourRunner config={teamDirectoryQuickTour} />
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

describe('teamDirectoryQuickTour', () => {
  it('shows the prompt on /team/details and continues into the create-team subset', async () => {
    renderTour({ initialPath: '/team/details' })

    expect(screen.getByText('Start Team Directory tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Team directory workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Team records' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Team cards' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Add team' })
    fireEvent.click(screen.getByRole('button', { name: 'Open create team modal' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Create team modal' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Create team modal' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Default team picks' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Default team picks' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Custom team names' })
  })

  it('does not show the prompt on /team/details/:id because prompt routes stay list-only', () => {
    renderTour({ initialPath: '/team/details/8' })

    expect(screen.queryByText('Start Team Directory tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays in place on /team/details/:id and continues through edit and delete shells', async () => {
    renderTour({ initialPath: '/team/details/8' })

    window.dispatchEvent(
      new CustomEvent(TEAM_DIRECTORY_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: teamUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Team directory workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/team/details/8')
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Team detail' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Edit team' })
    fireEvent.click(screen.getByRole('button', { name: 'Open edit team modal' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Edit team modal' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 4')).toBeTruthy()
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Edit team modal' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Members editor' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Members editor' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Team image' })
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Team image' })).getByRole('button', {
        name: 'Next',
      }),
    )
    await screen.findByRole('dialog', { name: 'Delete team shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Open delete team modal' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Delete team modal' })).toBeTruthy(),
    )
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ initialPath: '/team/details', includeAnchors: false })

    window.dispatchEvent(
      new CustomEvent(TEAM_DIRECTORY_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: teamUser.id },
      }),
    )

    expect(await screen.findByText('Preparing tutorial...', {}, { timeout: 1000 })).toBeTruthy()
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  }, 8000)
})
