// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'

import App from '../App'
import { fetchModuleActivation, fetchSession } from '../services/apiClient'

vi.mock('../services/apiClient', () => ({
  fetchModuleActivation: vi.fn(),
  fetchSession: vi.fn(),
  SYSTEM_MAINTENANCE_EVENT: 'vmecc:system-maintenance',
}))

vi.mock('../views/settings/systemMaintenanceStorage', () => ({
  loadSystemMaintenanceSetting: vi.fn(async () => ({ ok: false })),
  normalizeSystemMaintenanceSetting: vi.fn((value, fallback = {}) => value || fallback),
}))

vi.mock('../layout/DefaultLayout', () => ({
  default: () => <div>Authenticated shell</div>,
}))

const reducer = (
  state = {
    authStatus: 'unknown',
    authUser: null,
    systemMaintenance: { enabled: false },
    theme: 'light',
  },
  action,
) => (action.type === 'set' ? { ...state, ...action } : state)

const renderApp = () => {
  const store = createStore(reducer)
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  )
  return store
}

beforeEach(() => {
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
})
