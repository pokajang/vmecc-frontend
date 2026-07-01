// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { messagesQuickTour } from 'src/onboarding/messagesQuickTourConfig'
import { MESSAGES_TOUR_REPLAY_EVENT } from 'src/onboarding/messagesTour'

vi.mock('src/services/apiClient', () => ({
  updateOnboardingState: vi.fn((key, payload) =>
    Promise.resolve({
      data: {
        [key]: {
          version: payload?.version,
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

      return (
        <div data-testid="joyride-running">
          {TooltipComponent ? (
            <TooltipComponent
              backProps={{ onClick: () => {} }}
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

const messagesUser = {
  id: 95,
  name: 'Messages User',
  email: 'messages@example.test',
  permissions: ['self.messages'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const MessagesRouteAnchors = ({ includeAnchors = true, populatedThread = true }) => {
  const location = useLocation()
  const pathname = location.pathname

  if (pathname !== '/messages' && pathname !== '/messages/') {
    return <main data-testid="outside-route">Outside messages route</main>
  }

  if (!includeAnchors) {
    return <main>Messages loading</main>
  }

  return (
    <main data-tour-id="messages-module">
      <header data-tour-id="messages-header">
        <button type="button" data-tour-id="messages-create-action">
          Create chat
        </button>
      </header>
      <section data-tour-id="messages-list-panel">
        <div data-tour-id="messages-list-filters">Search and filters</div>
      </section>
      <section data-tour-id="messages-thread-panel">
        {populatedThread ? (
          <div data-tour-id="messages-composer">Composer</div>
        ) : (
          <div data-tour-id="messages-thread-empty">No active thread</div>
        )}
      </section>
    </main>
  )
}

const renderTour = ({
  authUser = messagesUser,
  includeAnchors = true,
  initialPath = '/messages',
  populatedThread = true,
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
          <MessagesRouteAnchors includeAnchors={includeAnchors} populatedThread={populatedThread} />
          <OnboardingTourRunner config={messagesQuickTour} />
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

describe('messagesQuickTour', () => {
  it('does not auto-prompt on /messages', () => {
    renderTour({ initialPath: '/messages' })

    expect(screen.queryByText('Start Messages tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays on /messages with a populated thread and reaches the composer subset', async () => {
    renderTour({ initialPath: '/messages', populatedThread: true })

    window.dispatchEvent(
      new CustomEvent(MESSAGES_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: messagesUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Messages workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 7')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Messages header' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Start a chat' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Conversation list' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Search and filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Conversation thread' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Message composer' })
  })

  it('replays on /messages with no active thread and uses the empty-thread subset', async () => {
    renderTour({ initialPath: '/messages', populatedThread: false })

    window.dispatchEvent(
      new CustomEvent(MESSAGES_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: messagesUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Messages workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 7')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Messages header' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Start a chat' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Conversation list' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Search and filters' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Conversation thread' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Empty thread state' })
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ includeAnchors: false, initialPath: '/messages' })

    window.dispatchEvent(
      new CustomEvent(MESSAGES_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: messagesUser.id,
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
