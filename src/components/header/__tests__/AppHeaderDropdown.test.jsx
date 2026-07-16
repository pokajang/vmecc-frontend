// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { MemoryRouter } from 'react-router-dom'
import AppHeaderDropdown from '../AppHeaderDropdown'

vi.mock('src/services/apiClient', () => ({ logoutRequest: vi.fn() }))

afterEach(() => cleanup())

const renderDropdown = () => {
  const state = {
    authUser: {
      id: 7,
      name: 'A deliberately long tablet account name',
      email: 'tablet@example.test',
      roles: ['Tactical Response Team'],
      permissions: ['self.payroll', 'self.leave', 'self.overtime'],
    },
  }
  const store = createStore((current = state) => current)
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <AppHeaderDropdown canClaim canOvertime />
      </MemoryRouter>
    </Provider>,
  )
}

describe('AppHeaderDropdown', () => {
  it('keeps the account trigger named and inside the shared tablet target contract', async () => {
    renderDropdown()

    const trigger = screen.getByRole('button', { name: 'Account' })
    expect(trigger.classList.contains('app-header-action')).toBe(true)
    expect(trigger.classList.contains('app-header-account-toggle')).toBe(true)

    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy())
    expect(screen.getByText('A deliberately long tablet account name')).toBeTruthy()
  })
})
