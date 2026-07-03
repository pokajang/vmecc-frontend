// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import OnboardingTourRunner from '../OnboardingTourRunner'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { drillQuickTour } from 'src/onboarding/drillQuickTourConfig'
import { ercoQuickTour } from 'src/onboarding/ercoQuickTourConfig'
import { fitnessTestQuickTour } from 'src/onboarding/fitnessTestQuickTourConfig'

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

const reportUser = {
  id: 88,
  name: 'Report User',
  email: 'reports@example.test',
  permissions: ['reports.erco.view', 'reports.drill.view', 'reports.fitness.view'],
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const ReportRouteAnchors = ({ includeAnchors = true, slug, prefix }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const pathname = location.pathname
  const basePath = `/report/${slug}`

  if (!pathname.startsWith(basePath)) {
    return <main data-testid="outside-route">Outside report routes</main>
  }

  if (!includeAnchors) {
    return <main>Report route loading</main>
  }

  if (pathname === basePath || pathname === `${basePath}/`) {
    return (
      <main data-tour-id={`${prefix}-module`}>
        <section data-tour-id={`${prefix}-mobile-type-selection`}>Quick start types</section>
        <section data-tour-id={`${prefix}-records`}>Records</section>
        <div data-tour-id={`${prefix}-filters`}>Filters</div>
        <button
          type="button"
          data-tour-id={`${prefix}-new-action`}
          onClick={() => navigate(`${basePath}/new`)}
        >
          New report
        </button>
        <button type="button" data-tour-id={`${prefix}-draft-resume-action`}>
          Resume draft
        </button>
      </main>
    )
  }

  if (
    pathname === `${basePath}/new` ||
    /^\/report\/[^/]+\/new\/(?!review\/?$)[^/]+\/?$/i.test(pathname)
  ) {
    return (
      <main data-tour-id={`${prefix}-module`}>
        <section data-tour-id={`${prefix}-form`}>Report form</section>
      </main>
    )
  }

  if (pathname === `${basePath}/new/review`) {
    return (
      <main data-tour-id={`${prefix}-module`}>
        <section data-tour-id={`${prefix}-review`}>Review report</section>
      </main>
    )
  }

  if (new RegExp(`^${basePath.replace(/\//g, '\\/')}\\/[^/]+\\/?$`, 'i').test(pathname)) {
    return (
      <main data-tour-id={`${prefix}-module`}>
        <section data-tour-id={`${prefix}-detail`}>Report detail</section>
        <button type="button" data-tour-id={`${prefix}-edit-action`}>
          Edit report
        </button>
        <button type="button" data-tour-id={`${prefix}-download-action`}>
          Download report
        </button>
        <button type="button" data-tour-id={`${prefix}-delete-action`}>
          Delete report
        </button>
        <div data-tour-id={`${prefix}-delete-modal`}>Delete modal</div>
      </main>
    )
  }

  return <main data-testid="outside-route">Outside report routes</main>
}

const renderTour = ({
  authUser = reportUser,
  config,
  initialPath,
  includeAnchors = true,
  prefix,
  slug,
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
          <ReportRouteAnchors includeAnchors={includeAnchors} prefix={prefix} slug={slug} />
          <OnboardingTourRunner config={config} />
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

describe.each([
  {
    label: 'ERCO',
    config: ercoQuickTour,
    replayEvent: 'vmecc:onboarding:erco-tour-replay',
    slug: 'erco',
    prefix: 'erco-report',
  },
  {
    label: 'Drill',
    config: drillQuickTour,
    replayEvent: 'vmecc:onboarding:drill-tour-replay',
    slug: 'drill',
    prefix: 'drill-report',
  },
  {
    label: 'Fitness Test',
    config: fitnessTestQuickTour,
    replayEvent: 'vmecc:onboarding:fitness-test-tour-replay',
    slug: 'fitness-test',
    prefix: 'fitness-test-report',
  },
])('$label quick tour', ({ config, label, prefix, replayEvent, slug }) => {
  it('does not auto-prompt on the canonical list route', () => {
    renderTour({ config, initialPath: `/report/${slug}`, prefix, slug })

    expect(screen.queryByText(`Start ${label} tutorial?`)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start tutorial' })).toBeNull()
  })

  it('replays on the list route and opens the list subset', async () => {
    renderTour({ config, initialPath: `/report/${slug}`, prefix, slug })

    window.dispatchEvent(
      new CustomEvent(replayEvent, {
        detail: {
          source: 'tutorial_hub',
          userId: reportUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: `${label} workspace` })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    await waitFor(() => expect(screen.queryByTestId('joyride-running')).toBeNull())
  })

  it('replays in place on /new and uses the form subset', async () => {
    renderTour({ config, initialPath: `/report/${slug}/new`, prefix, slug })

    window.dispatchEvent(
      new CustomEvent(replayEvent, {
        detail: {
          source: 'tutorial_hub',
          userId: reportUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: `${label} workspace` })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('dialog', { name: 'Report form' })
  })

  it('replays in place on /new/review and uses the review subset', async () => {
    renderTour({ config, initialPath: `/report/${slug}/new/review`, prefix, slug })

    window.dispatchEvent(
      new CustomEvent(replayEvent, {
        detail: {
          source: 'tutorial_hub',
          userId: reportUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: `${label} workspace` })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Step 2 of 2')
  })

  it('replays in place on the detail route and uses the detail subset', async () => {
    renderTour({ config, initialPath: `/report/${slug}/42`, prefix, slug })

    window.dispatchEvent(
      new CustomEvent(replayEvent, {
        detail: {
          source: 'tutorial_hub',
          userId: reportUser.id,
        },
      }),
    )

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: `${label} workspace` })).toBeTruthy(),
    )
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Step 2 of 6')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Step 3 of 6')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Step 4 of 6')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Step 5 of 6')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Step 6 of 6')
  })

  it('shows preparing and not-ready recovery when anchors are missing', async () => {
    renderTour({
      config,
      includeAnchors: false,
      initialPath: `/report/${slug}`,
      prefix,
      slug,
    })

    window.dispatchEvent(
      new CustomEvent(replayEvent, {
        detail: {
          source: 'tutorial_hub',
          userId: reportUser.id,
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
