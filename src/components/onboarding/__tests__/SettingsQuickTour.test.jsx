// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { settingsQuickTour } from 'src/onboarding/settingsQuickTourConfig'
import { SETTINGS_TOUR_REPLAY_EVENT } from 'src/onboarding/settingsTour'

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

const settingsAdmin = {
  id: 91,
  name: 'Settings Admin',
  email: 'settings@example.test',
  permissions: ['settings.manage'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const SettingsRouteAnchors = ({ includeAnchors = true }) => {
  const location = useLocation()
  const pathname = location.pathname

  if (!pathname.startsWith('/settings') && !pathname.startsWith('/reporting-settings')) {
    return <main data-testid="outside-route">Outside settings routes</main>
  }

  if (!includeAnchors) {
    return <main>Settings loading</main>
  }

  if (pathname === '/settings' || pathname === '/settings/') {
    return (
      <main data-tour-id="settings-module">
        <nav data-tour-id="settings-nav">Settings tabs</nav>
        <section data-tour-id="settings-general">General settings</section>
      </main>
    )
  }

  if (pathname === '/settings/role-permissions') {
    return (
      <main data-tour-id="settings-module">
        <nav data-tour-id="settings-nav">Settings tabs</nav>
        <section data-tour-id="settings-role-permissions">Role permissions</section>
      </main>
    )
  }

  if (pathname === '/settings/dashboard-visibility') {
    return (
      <main data-tour-id="settings-module">
        <nav data-tour-id="settings-nav">Settings tabs</nav>
        <section data-tour-id="settings-dashboard-visibility">Dashboard visibility</section>
      </main>
    )
  }

  if (pathname === '/settings/modules') {
    return (
      <main data-tour-id="settings-module">
        <nav data-tour-id="settings-nav">Settings tabs</nav>
        <section data-tour-id="settings-modules">Module activation</section>
      </main>
    )
  }

  return <main data-testid="outside-route">Outside settings routes</main>
}

const renderTour = ({
  authUser = settingsAdmin,
  includeAnchors = true,
  initialPath = '/settings',
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
          <SettingsRouteAnchors includeAnchors={includeAnchors} />
          <OnboardingTourRunner config={settingsQuickTour} />
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

describe('settingsQuickTour', () => {
  it('does not auto-prompt on /settings', () => {
    renderTour({ initialPath: '/settings' })

    expect(screen.queryByText('Start Settings tutorial?')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays in place on /settings and uses the general subset', async () => {
    renderTour({ initialPath: '/settings' })

    window.dispatchEvent(
      new CustomEvent(SETTINGS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: settingsAdmin.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Settings workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(
      'Use these tabs to switch between general settings, role permissions, dashboard visibility, and module activation.',
    )
    expect(screen.getByText('Step 2 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText(
      'Use the general settings area to review maintenance-related controls and the system-level status surface.',
    )
    expect(screen.getByText('Step 3 of 3')).toBeTruthy()
  })

  it('replays in place on /settings/role-permissions and uses the role subset', async () => {
    renderTour({ initialPath: '/settings/role-permissions' })

    window.dispatchEvent(
      new CustomEvent(SETTINGS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: settingsAdmin.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Settings workspace' })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Settings tabs' })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Role permissions' })
  })

  it('replays in place on /settings/dashboard-visibility and /settings/modules', async () => {
    for (const entry of [
      ['/settings/dashboard-visibility', 'Dashboard visibility'],
      ['/settings/modules', 'Module activation'],
    ]) {
      cleanup()
      renderTour({ initialPath: entry[0] })

      window.dispatchEvent(
        new CustomEvent(SETTINGS_TOUR_REPLAY_EVENT, {
          detail: {
            source: 'tutorial_hub',
            userId: settingsAdmin.id,
          },
        }),
      )

      await waitFor(() =>
        expect(screen.getByRole('dialog', { name: 'Settings workspace' })).toBeTruthy(),
      )
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByRole('dialog', { name: 'Settings tabs' })
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      await screen.findByRole('dialog', { name: entry[1] })
    }
  })

  it('replays from excluded settings-adjacent routes and resolves to /settings', async () => {
    renderTour({ initialPath: '/settings/inspection-workflow' })

    window.dispatchEvent(
      new CustomEvent(SETTINGS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: settingsAdmin.id,
        },
      }),
    )

    await waitFor(() => expect(screen.getByTestId('location-path').textContent).toBe('/settings'))
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: 'Settings workspace' })).toBeTruthy(),
    )
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({ includeAnchors: false, initialPath: '/settings' })

    window.dispatchEvent(
      new CustomEvent(SETTINGS_TOUR_REPLAY_EVENT, {
        detail: {
          source: 'tutorial_hub',
          userId: settingsAdmin.id,
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
