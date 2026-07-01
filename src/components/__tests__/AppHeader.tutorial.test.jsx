// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import AppHeader from '../AppHeader'
import { NavigationGuardProvider } from 'src/contexts/NavigationGuardContext'
import { TRT_INSPECTION_TOUR_REPLAY_EVENT } from 'src/onboarding/trtInspectionTour'
import { ONBOARDING_LOCALE_STORAGE_KEY } from 'src/onboarding/onboardingLocale'
import { INSPECTION_TOUR_SOURCE_TUTORIAL_HUB } from 'src/onboarding/inspectionOnboardingContract'
import { createFeedbackReport } from 'src/services/apiClient'

vi.mock('src/hooks/useWorkflowNotificationCounts', () => ({
  default: () => 0,
}))

vi.mock('src/hooks/useMessageUnreadCount', () => ({
  default: () => 3,
}))

vi.mock('src/hooks/useOnDutyTeam', () => ({
  default: () => null,
}))

vi.mock('src/hooks/useOvertimeEligibility', () => ({
  default: () => ({ eligible: false, isResolved: true }),
}))

vi.mock('src/hooks/usePwaInstallPrompt', () => ({
  default: () => ({
    showNavInstallItem: false,
    openInstallExperience: vi.fn(),
  }),
}))

vi.mock('src/views/notifications/workflow/WorkflowNotifications', () => ({
  default: () => <div>Workflow notifications</div>,
}))

vi.mock('src/services/apiClient', () => ({
  logoutRequest: vi.fn(),
  createFeedbackReport: vi.fn(),
}))

const completeTrtUser = {
  id: 12,
  name: 'TRT User',
  roles: ['Tactical Response Team'],
  permissions: [
    'reports.inspection.view',
    'reports.erco.view',
    'reports.drill.view',
    'reports.fitness.view',
    'self.messages',
  ],
  ic_number: '900101-10-1234',
  phone: '012 345 6789',
  address: 'Lot 1',
  state: 'Selangor',
  emergency_contact: {
    name: 'Emergency Contact',
    relationship: 'Sibling',
    phone: '013 345 6789',
  },
  medical_info: {
    noKnownCriticalMedicalInfo: true,
  },
}

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

const LocationProbe = () => {
  const location = useLocation()
  return <span data-testid="location-path">{location.pathname}</span>
}

const getStartButtonInModuleRow = (moduleName) => {
  const tutorialDialog = screen.getByRole('dialog', { name: 'Tutorial' })
  const moduleLabel = within(tutorialDialog).getByText(moduleName)
  const moduleRow =
    moduleLabel.closest('.onboarding-hub-row') || moduleLabel.closest('.mobile-overlay-item')

  return within(moduleRow || tutorialDialog).getByRole('button', { name: 'Start' })
}

const mockMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === '(max-width: 767.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

const mockDesktopViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query === '(min-width: 768px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

const renderHeader = (authUser = completeTrtUser, initialState = {}) => {
  const reducer = (
    state = {
      sidebarShow: true,
      aiHelperOpen: false,
      authUser,
      moduleActivation: {
        registry: [],
        configured: {},
        effective: {},
        forceAllEnabled: false,
        fallbackMode: true,
      },
      ...initialState,
    },
    action,
  ) => (action.type === 'set' ? { ...state, ...action } : state)
  const store = createStore(reducer)

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <NavigationGuardProvider>
          <AppHeader />
          <LocationProbe />
        </NavigationGuardProvider>
      </MemoryRouter>
    </Provider>,
  )

  return store
}

describe('AppHeader tutorial hub', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.stubGlobal('localStorage', createStorageMock())
  })

  afterEach(() => {
    cleanup()
    delete window.matchMedia
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders Tutorial actions and keeps Messages in the mobile menu', () => {
    renderHeader()

    expect(screen.getAllByText('Tutorial').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /open tutorial/i })).toHaveLength(2)
    expect(screen.queryByText('Messages')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /open menu/i }))
    expect(screen.getByRole('button', { name: /Messages/ })).toBeTruthy()
  })

  it('opens the tutorial modal with ready and coming-soon module rows', () => {
    renderHeader()

    fireEvent.click(screen.getAllByRole('button', { name: /open tutorial/i })[0])

    const tutorialDialog = screen.getByRole('dialog', { name: 'Tutorial' })
    expect(tutorialDialog).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Tutorial language' })).toBeTruthy()
    expect(screen.getByText('Inspection')).toBeTruthy()
    expect(getStartButtonInModuleRow('Inspection')).toBeTruthy()
    expect(screen.getByText('Messages')).toBeTruthy()
    expect(screen.getByText('ERCO')).toBeTruthy()
    expect(screen.getByText('Drill')).toBeTruthy()
    expect(screen.getByText('Fitness Test')).toBeTruthy()
    expect(within(tutorialDialog).queryAllByText('Coming soon')).toHaveLength(0)
    expect(within(tutorialDialog).getAllByRole('button', { name: 'Start' })).toHaveLength(5)
  })

  it('opens the tutorial modal without keeping a focus-triggered tooltip active', () => {
    renderHeader()
    const tutorialButton = screen.getAllByRole('button', { name: /open tutorial/i })[0]

    tutorialButton.focus()
    fireEvent.focus(tutorialButton)
    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.click(tutorialButton)

    expect(screen.getByRole('dialog', { name: 'Tutorial' })).toBeTruthy()
    expect(document.activeElement).not.toBe(tutorialButton)
  })

  it('keeps Menu, Tutorial, Alerts, and Account on one active mobile overlay controller', () => {
    mockMobileViewport()

    const store = renderHeader()
    const bottomNav = document.querySelector('.app-bottom-nav')
    const bottomButton = (name) => within(bottomNav).getByRole('button', { name })

    fireEvent.click(bottomButton(/open menu/i))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy()
    expect(bottomButton(/open menu/i).dataset.active).toBe('true')

    fireEvent.click(bottomButton(/open tutorial/i))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'Tutorial' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Tutorial language' })).toBeTruthy()
    expect(bottomButton(/open tutorial/i).dataset.active).toBe('true')
    expect(bottomButton(/open menu/i).dataset.active).toBe('false')

    fireEvent.click(bottomButton(/notifications/i))
    expect(screen.queryByRole('dialog', { name: 'Tutorial' })).toBeNull()
    expect(bottomButton(/notifications/i).dataset.active).toBe('true')
    expect(bottomButton(/open tutorial/i).dataset.active).toBe('false')

    fireEvent.click(bottomButton(/open account menu/i))
    expect(screen.getByRole('dialog', { name: 'Account' })).toBeTruthy()
    expect(bottomButton(/open account menu/i).dataset.active).toBe('true')
    expect(bottomButton(/notifications/i).dataset.active).toBe('false')

    const askAiButton = bottomButton(/ask ai/i)
    fireEvent.click(askAiButton)
    expect(screen.queryByRole('dialog', { name: 'Account' })).toBeNull()
    expect(store.getState().aiHelperOpen).toBe(true)
    expect(askAiButton.getAttribute('aria-pressed')).toBe('true')
    expect(bottomButton(/open account menu/i).dataset.active).toBe('false')
  })

  it('opens the report issue modal and submits current route context', async () => {
    createFeedbackReport.mockResolvedValue({ data: { id: 1 } })
    renderHeader()

    fireEvent.click(screen.getByRole('button', { name: /Report issue/i }))

    expect(screen.getByRole('dialog', { name: 'Report issue' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('What happened?'), {
      target: { value: 'The dashboard action queue spacing breaks on small screens.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    await waitFor(() => {
      expect(createFeedbackReport).toHaveBeenCalledWith({
        message: 'The dashboard action queue spacing breaks on small screens.',
        page_context: {
          path: '/dashboard',
          search: '',
          title: document.title || '',
        },
      })
    })
  })

  it('hides inaccessible module rows', () => {
    renderHeader({
      ...completeTrtUser,
      permissions: ['reports.inspection.view'],
    })

    fireEvent.click(screen.getAllByRole('button', { name: /open tutorial/i })[0])

    expect(screen.getByText('Inspection')).toBeTruthy()
    expect(screen.queryByText('ERCO')).toBeNull()
    expect(screen.queryByText('Drill')).toBeNull()
    expect(screen.queryByText('Fitness Test')).toBeNull()
  })

  it('keeps Inspection startable in the hub when the TRT profile is incomplete', () => {
    renderHeader({
      ...completeTrtUser,
      phone: '',
      permissions: ['reports.inspection.view', 'reports.erco.view'],
    })

    fireEvent.click(screen.getAllByRole('button', { name: /open tutorial/i })[0])

    expect(screen.getByText('Inspection')).toBeTruthy()
    expect(screen.queryByText('Complete profile first')).toBeNull()
    expect(screen.getByText('ERCO')).toBeTruthy()
    expect(getStartButtonInModuleRow('Inspection')).toBeTruthy()
  })

  it('persists the tutorial language selection across reopening the hub', () => {
    renderHeader()

    fireEvent.click(screen.getAllByRole('button', { name: /open tutorial/i })[0])
    const tutorialDialog = screen.getByRole('dialog', { name: 'Tutorial' })
    fireEvent.click(screen.getByRole('button', { name: 'BM' }))

    expect(localStorage.setItem).toHaveBeenCalledWith(ONBOARDING_LOCALE_STORAGE_KEY, 'bm')
    expect(screen.getByText('Pemeriksaan')).toBeTruthy()

    fireEvent.click(within(tutorialDialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Tutorial' })).toBeNull()

    fireEvent.click(screen.getAllByRole('button', { name: /open tutorial/i })[0])
    expect(screen.getByText('Pemeriksaan')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mula' })).toBeTruthy()
  })

  it('dispatches the inspection tutorial replay event from the modal', async () => {
    const replayHandler = vi.fn()
    window.addEventListener(TRT_INSPECTION_TOUR_REPLAY_EVENT, replayHandler)

    renderHeader()
    fireEvent.click(screen.getAllByRole('button', { name: /open tutorial/i })[0])
    const tutorialDialog = screen.getByRole('dialog', { name: 'Tutorial' })
    const inspectionStartButton = getStartButtonInModuleRow('Inspection')
    fireEvent.click(
      inspectionStartButton || within(tutorialDialog).getByRole('button', { name: 'Start' }),
    )

    await waitFor(() => expect(replayHandler).toHaveBeenCalledTimes(1))
    expect(replayHandler.mock.calls[0][0].detail).toEqual({
      source: INSPECTION_TOUR_SOURCE_TUTORIAL_HUB,
      userId: completeTrtUser.id,
    })
    expect(screen.queryByRole('dialog', { name: 'Tutorial' })).toBeNull()

    window.removeEventListener(TRT_INSPECTION_TOUR_REPLAY_EVENT, replayHandler)
  })

  it('does not force-open sidebar when closing Ask AI on mobile', () => {
    const store = renderHeader(completeTrtUser, {
      aiHelperOpen: true,
      sidebarShow: false,
    })

    const menuToggle = screen.getByRole('button', { name: /toggle sidebar/i })
    fireEvent.click(menuToggle)

    expect(store.getState().aiHelperOpen).toBe(false)
    expect(store.getState().sidebarShow).toBe(false)
  })

  it('reopens sidebar when closing Ask AI on desktop', () => {
    mockDesktopViewport()

    const store = renderHeader(completeTrtUser, {
      aiHelperOpen: true,
      sidebarShow: false,
    })

    const menuToggle = screen.getByRole('button', { name: /toggle sidebar/i })
    fireEvent.click(menuToggle)

    expect(store.getState().aiHelperOpen).toBe(false)
    expect(store.getState().sidebarShow).toBe(true)
  })
})
