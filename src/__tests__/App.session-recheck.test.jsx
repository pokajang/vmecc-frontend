// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'

import App from '../App'
import {
  fetchModuleActivation,
  fetchSession,
  SYSTEM_MAINTENANCE_EVENT,
} from '../services/apiClient'
import { markPendingCameraOperation } from '../utils/cameraRecovery'
import { loadSystemMaintenanceSetting } from '../views/settings/systemMaintenanceStorage'

vi.mock('../services/apiClient', () => ({
  fetchModuleActivation: vi.fn(),
  fetchSession: vi.fn(),
  SYSTEM_MAINTENANCE_EVENT: 'vmecc:system-maintenance',
}))

vi.mock('../views/settings/systemMaintenanceStorage', async (importOriginal) => ({
  ...(await importOriginal()),
  loadSystemMaintenanceSetting: vi.fn(async () => ({ ok: false })),
}))

vi.mock('../layout/DefaultLayout', () => ({
  default: () => <div>Authenticated shell</div>,
}))

const defaultState = {
  authStatus: 'unknown',
  authUser: null,
  systemMaintenance: {
    enabled: false,
    phase: 'off',
    graceEndsAt: null,
    message: 'System is under maintenance. Please try again later.',
    updatedAt: '',
    updatedByUserId: null,
  },
  systemMaintenanceHydrated: false,
  systemMaintenanceLoadError: null,
  theme: 'light',
}

const reducer = (state = defaultState, action) =>
  action.type === 'set' ? { ...state, ...action } : state

const renderApp = (stateOverrides = {}) => {
  const store = createStore(reducer, { ...defaultState, ...stateOverrides })
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  )
  return store
}

beforeEach(() => {
  window.history.pushState({}, '', '/')
  sessionStorage.clear()
  fetchModuleActivation.mockResolvedValue(null)
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    configurable: true,
  })
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible',
    configurable: true,
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('App session recheck', () => {
  it('bootstraps the session immediately after a successful Google callback', async () => {
    window.history.pushState({}, '', '/login?status=success')
    fetchSession.mockResolvedValueOnce({ user: { id: 1, email: 'user@example.test' } })

    const store = renderApp()

    await waitFor(() => expect(fetchSession).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(store.getState().authStatus).toBe('authenticated'))
    expect(store.getState().authUser).toEqual({ id: 1, email: 'user@example.test' })
  })

  it('starts one maintenance check only after authentication is confirmed', async () => {
    fetchSession.mockResolvedValueOnce({ user: { id: 1, email: 'user@example.test' } })

    const store = renderApp()

    await waitFor(() => expect(store.getState().authStatus).toBe('authenticated'))
    await waitFor(() => expect(loadSystemMaintenanceSetting).toHaveBeenCalledTimes(1))
    expect(store.getState().systemMaintenanceHydrated).toBe(true)
  })

  it('ignores stale maintenance events and preserves the current message for header-only events', async () => {
    fetchSession.mockResolvedValueOnce({ user: { id: 1, email: 'user@example.test' } })
    const currentSetting = {
      enabled: false,
      phase: 'off',
      graceEndsAt: null,
      message: 'Planned infrastructure work.',
      updatedAt: '2026-07-21T02:00:00+00:00',
      updatedByUserId: 1,
    }
    const store = renderApp({ systemMaintenance: currentSetting })
    await waitFor(() => expect(store.getState().authStatus).toBe('authenticated'))

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SYSTEM_MAINTENANCE_EVENT, {
          detail: {
            data: {
              enabled: true,
              phase: 'enforced',
              updatedAt: '2026-07-21T01:00:00+00:00',
            },
          },
        }),
      )
    })
    expect(store.getState().systemMaintenance).toEqual(currentSetting)

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SYSTEM_MAINTENANCE_EVENT, {
          detail: {
            data: {
              enabled: true,
              phase: 'enforced',
              updatedAt: '2026-07-21T03:00:00+00:00',
            },
          },
        }),
      )
    })
    expect(store.getState().systemMaintenance).toMatchObject({
      enabled: true,
      phase: 'enforced',
      message: 'Planned infrastructure work.',
      updatedAt: '2026-07-21T03:00:00+00:00',
      updatedByUserId: 1,
    })
  })

  it('silently rechecks the session when an anonymous app regains focus', async () => {
    fetchSession
      .mockRejectedValueOnce(Object.assign(new Error('Unauthenticated'), { status: 401 }))
      .mockResolvedValueOnce({ user: { id: 1, email: 'user@example.test' } })

    const store = renderApp()

    await waitFor(() => expect(store.getState().authStatus).toBe('anonymous'))
    expect(fetchSession).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('focus'))

    await waitFor(() => expect(fetchSession).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(store.getState().authStatus).toBe('authenticated'))
    expect(store.getState().authUser).toEqual({ id: 1, email: 'user@example.test' })
  })

  it('restores a camera session from the login route before rendering login', async () => {
    window.history.pushState({}, '', '/inspection/new')
    markPendingCameraOperation({ module: 'inspection', targetKind: 'fireExtinguisher' })
    window.history.pushState({}, '', '/login')
    fetchSession.mockResolvedValueOnce({ user: { id: 1, email: 'user@example.test' } })

    const store = renderApp()

    await waitFor(() => expect(fetchSession).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(store.getState().authStatus).toBe('authenticated'))
    await waitFor(() => expect(window.location.pathname).toBe('/inspection/new'))
    expect(screen.getByText('Authenticated shell')).toBeTruthy()
    expect(screen.queryByText(/sign in/i)).toBeNull()
  })

  it('retries one camera-session 401 before showing the login page', async () => {
    markPendingCameraOperation({ module: 'inspection', targetKind: 'fireExtinguisherDefect' })
    fetchSession
      .mockRejectedValueOnce(Object.assign(new Error('Unauthenticated'), { status: 401 }))
      .mockResolvedValueOnce({ user: { id: 1, email: 'user@example.test' } })

    const store = renderApp()

    await waitFor(() => expect(fetchSession).toHaveBeenCalledTimes(2), { timeout: 2000 })
    await waitFor(() => expect(store.getState().authStatus).toBe('authenticated'))
    expect(store.getState().authUser).toEqual({ id: 1, email: 'user@example.test' })
  })

  it('shows a retryable error when session bootstrap is temporarily unavailable', async () => {
    fetchSession.mockRejectedValueOnce(
      Object.assign(new Error('Server unavailable'), { status: 503 }),
    )

    const store = renderApp()

    await waitFor(() => expect(store.getState().authStatus).toBe('temporarily_unavailable'))
    expect(screen.getByRole('alert').textContent).toContain('Unable to restore session')
    expect(screen.getByRole('button', { name: /retry session check/i })).toBeTruthy()
  })
})
