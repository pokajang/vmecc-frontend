// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { rosterManagementQuickTour } from 'src/onboarding/rosterManagementQuickTourConfig'
import {
  ROSTER_MANAGEMENT_TOUR_KEY,
  ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT,
  ROSTER_MANAGEMENT_TOUR_VERSION,
} from 'src/onboarding/rosterManagementTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn(() =>
    Promise.resolve({
      data: {
        [ROSTER_MANAGEMENT_TOUR_KEY]: {
          version: ROSTER_MANAGEMENT_TOUR_VERSION,
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

const createRect = ({ top = 0, left = 0, width = 120, height = 40 } = {}) => ({
  width,
  height,
  top,
  right: left + width,
  bottom: top + height,
  left,
  x: left,
  y: top,
  toJSON: () => ({}),
})

const rosterUser = {
  id: 71,
  name: 'Roster Manager',
  email: 'roster-manager@example.test',
  permissions: ['rosters.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const RosterManagementRouteAnchors = ({
  includeAnchors = true,
  editActionInitiallyDisabled = false,
  scheduleVariant = 'read',
}) => {
  const location = useLocation()
  const pathname = location.pathname
  const [editMode, setEditMode] = React.useState(scheduleVariant !== 'read')
  const [editActionDisabled, setEditActionDisabled] = React.useState(editActionInitiallyDisabled)
  const [showCancelModal, setShowCancelModal] = React.useState(scheduleVariant === 'cancelModal')
  const [showPublishModal, setShowPublishModal] = React.useState(scheduleVariant === 'publishModal')

  const isIncludedRoute = pathname === '/roster/overview' || pathname === '/roster/schedule'

  React.useEffect(() => {
    if (!editActionInitiallyDisabled) return undefined

    const timer = window.setTimeout(() => setEditActionDisabled(false), 100)
    return () => window.clearTimeout(timer)
  }, [editActionInitiallyDisabled])

  if (!isIncludedRoute) {
    return <main data-testid="outside-route">Outside route</main>
  }

  if (!includeAnchors) {
    return <main>Roster management loading</main>
  }

  return (
    <main data-tour-id="roster-management-module">
      <nav data-tour-id="roster-management-nav">Roster tabs</nav>

      {pathname === '/roster/overview' ? (
        <section data-tour-id="roster-management-overview">Roster overview</section>
      ) : (
        <>
          <section data-tour-id="roster-management-schedule">Roster schedule</section>
          <div data-tour-id="roster-management-filters">Roster filters</div>

          {!editMode ? (
            <div data-tour-id="roster-management-read-actions">
              <button type="button">Print / PDF</button>
              <button type="button">Export</button>
              <button
                type="button"
                data-tour-id="roster-management-edit-action"
                onClick={() => setEditMode(true)}
                disabled={editActionDisabled}
              >
                Edit Roster
              </button>
            </div>
          ) : (
            <>
              <div data-tour-id="roster-management-edit-actions">
                <button type="button" data-tour-id="roster-management-save-draft-action">
                  Save Draft
                </button>
                <button
                  type="button"
                  data-tour-id="roster-management-publish-action"
                  onClick={() => setShowPublishModal(true)}
                >
                  Publish
                </button>
                <button
                  type="button"
                  data-tour-id="roster-management-cancel-action"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel
                </button>
              </div>
              {scheduleVariant === 'mobile' ? (
                <div data-tour-id="roster-management-mobile-editor">Mobile roster editor</div>
              ) : (
                <div data-tour-id="roster-management-grid">Roster grid</div>
              )}
            </>
          )}

          {showCancelModal ? (
            <div data-tour-id="roster-management-cancel-modal">
              <button type="button" data-tour-id="roster-management-cancel-modal-close-action">
                Keep editing
              </button>
            </div>
          ) : null}

          {showPublishModal ? (
            <div data-tour-id="roster-management-publish-modal">Publish roster modal</div>
          ) : null}
        </>
      )}
    </main>
  )
}

const renderTour = ({
  authUser = rosterUser,
  editActionInitiallyDisabled = false,
  initialPath = '/roster/overview',
  includeAnchors = true,
  scheduleVariant = 'read',
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
          <RosterManagementRouteAnchors
            includeAnchors={includeAnchors}
            editActionInitiallyDisabled={editActionInitiallyDisabled}
            scheduleVariant={scheduleVariant}
          />
          <OnboardingTourRunner config={rosterManagementQuickTour} />
        </NavigationGuardProvider>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createStorageMock())
  vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() =>
    createRect(),
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('rosterManagementQuickTour', () => {
  it('shows the prompt on /roster/overview and mounts the overview subset', async () => {
    renderTour({ initialPath: '/roster/overview' })

    expect(screen.getByText('Start Roster Management tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Roster management workspace' })).toBeTruthy(),
    )
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    expect(screen.getByTestId('location-path').textContent).toBe('/roster/overview')
    expect(screen.getByText('Roster overview')).toBeTruthy()
  })

  it('does not show the prompt on /roster/schedule because prompt routes stay overview-only', () => {
    renderTour({ initialPath: '/roster/schedule' })

    expect(screen.queryByText('Start Roster Management tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays in place on /roster/schedule and continues through edit, discard, and publish shells', async () => {
    renderTour({ initialPath: '/roster/schedule' })

    window.dispatchEvent(
      new CustomEvent(ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: rosterUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Roster management workspace' })).toBeTruthy(),
    )
    expect(screen.getByTestId('location-path').textContent).toBe('/roster/schedule')
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster schedule' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Schedule filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Read-only actions' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Edit roster' })
    fireEvent.click(screen.getByRole('button', { name: 'Open roster editor' }))
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Editor actions' })).toBeTruthy())
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
    expect(screen.getByText('Roster grid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Editable assignment surface' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Save draft' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Cancel edit shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Publish shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Open publish dialog' }))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Publish modal shell' })).toBeTruthy(),
    )
  })

  it('continues into the edit subset when the editor action bar is mounted offscreen', async () => {
    vi.spyOn(window.HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const tourId = this.getAttribute?.('data-tour-id')
      if (
        [
          'roster-management-edit-actions',
          'roster-management-save-draft-action',
          'roster-management-publish-action',
          'roster-management-cancel-action',
        ].includes(tourId)
      ) {
        return createRect({ top: -180 })
      }

      return createRect()
    })

    renderTour({ initialPath: '/roster/schedule' })

    window.dispatchEvent(
      new CustomEvent(ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: rosterUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Roster management workspace' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(/Step 2 of/)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster schedule' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Schedule filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Read-only actions' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Edit roster' })
    fireEvent.click(screen.getByRole('button', { name: 'Open roster editor' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Editor actions' })).toBeTruthy())
    expect(screen.getByText(/Step 1 of/)).toBeTruthy()
  })

  it('waits for the edit action to become enabled before continuing the replay subset', async () => {
    renderTour({ initialPath: '/roster/schedule', editActionInitiallyDisabled: true })

    window.dispatchEvent(
      new CustomEvent(ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: rosterUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Roster management workspace' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster schedule' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Schedule filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Read-only actions' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Edit roster' })
    fireEvent.click(screen.getByRole('button', { name: 'Open roster editor' }))

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Editor actions' })).toBeTruthy())
  })

  it('falls back to the mobile editor anchor when the desktop grid is not mounted', async () => {
    renderTour({ initialPath: '/roster/schedule', scheduleVariant: 'mobile' })

    window.dispatchEvent(
      new CustomEvent(ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: rosterUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Roster management workspace' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster schedule' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Schedule filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Editor actions' })
    expect(screen.getByText('Mobile roster editor')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Editable assignment surface' })
  })

  it('replays in place on /roster/schedule when the discard modal is already open', async () => {
    renderTour({ initialPath: '/roster/schedule', scheduleVariant: 'cancelModal' })

    window.dispatchEvent(
      new CustomEvent(ROSTER_MANAGEMENT_TOUR_REPLAY_EVENT, {
        detail: { source: 'tutorial_hub', userId: rosterUser.id },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Roster management workspace' })).toBeTruthy(),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster sections' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Roster schedule' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Schedule filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Editor actions' })
    expect(screen.getByText('Roster grid')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Editable assignment surface' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Save draft' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Cancel edit shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Publish shell' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Discard changes modal' })
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ initialPath: '/roster/overview', includeAnchors: false })

    expect(screen.getByText('Start Roster Management tutorial?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start tutorial' }))

    expect(await screen.findByText('Preparing tutorial...', {}, { timeout: 1000 })).toBeTruthy()
    expect(
      await screen.findByText('Tutorial is not ready yet.', {}, { timeout: 6500 }),
    ).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  }, 8000)
})
