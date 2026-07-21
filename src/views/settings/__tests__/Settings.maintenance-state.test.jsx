// @vitest-environment jsdom
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Settings from '../Settings'

const loadSystemMaintenanceSetting = vi.fn()
const ENFORCED_SETTING = {
  enabled: true,
  phase: 'enforced',
  graceEndsAt: null,
  message: 'Maintenance message',
  updatedAt: '2026-07-21T00:01:00+00:00',
  updatedByUserId: 1,
}

vi.mock('src/views/settings/systemMaintenanceStorage', () => ({
  DEFAULT_SYSTEM_MAINTENANCE: {
    enabled: false,
    phase: 'off',
    graceEndsAt: null,
    message: 'System is under maintenance. Please try again later.',
    updatedAt: '',
    updatedByUserId: null,
  },
  loadSystemMaintenanceSetting: (...args) => loadSystemMaintenanceSetting(...args),
  saveSystemMaintenance: vi.fn(),
}))

const reducer = (state, action) => (action.type === 'set' ? { ...state, ...action } : state)

describe('Settings maintenance state', () => {
  it('uses the hydrated Redux state without issuing a duplicate maintenance request', () => {
    const store = createStore(reducer, {
      authUser: { id: 1, permissions: ['settings.manage'] },
      systemMaintenance: {
        enabled: false,
        phase: 'off',
        graceEndsAt: null,
        message: 'Maintenance message',
        updatedAt: '2026-07-21T00:00:00+00:00',
        updatedByUserId: 1,
      },
      systemMaintenanceHydrated: true,
      systemMaintenanceLoadError: null,
    })

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/settings']}>
          <Settings />
        </MemoryRouter>
      </Provider>,
    )

    expect(screen.getByRole('checkbox', { name: 'OFF' }).checked).toBe(false)

    act(() => {
      store.dispatch({ type: 'set', systemMaintenance: { ...ENFORCED_SETTING } })
    })
    expect(screen.getByRole('checkbox', { name: 'ON' }).checked).toBe(true)
    expect(loadSystemMaintenanceSetting).not.toHaveBeenCalled()
  })
})
