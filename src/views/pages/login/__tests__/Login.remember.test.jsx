// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { legacy_createStore as createStore } from 'redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Login from '../Login'
import { fetchGoogleAuthUrl, fetchModuleActivation, loginRequest } from 'src/services/apiClient'

vi.mock('src/services/apiClient', () => ({
  fetchGoogleAuthUrl: vi.fn(),
  fetchModuleActivation: vi.fn(),
  loginRequest: vi.fn(),
}))

const reducer = (
  state = { authStatus: 'anonymous', systemMaintenance: { enabled: false } },
  action,
) => (action.type === 'set' ? { ...state, ...action } : state)

const renderLogin = () =>
  render(
    <Provider store={createStore(reducer)}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  fetchModuleActivation.mockResolvedValue(null)
  loginRequest.mockResolvedValue({ user: { id: 1, email: 'user@example.test' } })
  fetchGoogleAuthUrl.mockResolvedValue({})
})

describe('Login remember me', () => {
  it('defaults checked and sends remember true for password login', async () => {
    renderLogin()

    const remember = screen.getByRole('checkbox', { name: /remember me/i })
    expect(remember.checked).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'user@example.test' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() =>
      expect(loginRequest).toHaveBeenCalledWith({
        email: 'user@example.test',
        password: 'password',
        remember: true,
      }),
    )
  })

  it('allows remember opt-out for password and Google login', async () => {
    renderLogin()

    fireEvent.click(screen.getByRole('checkbox', { name: /remember me/i }))
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'user@example.test' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password' },
    })
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))

    await waitFor(() =>
      expect(loginRequest).toHaveBeenCalledWith({
        email: 'user@example.test',
        password: 'password',
        remember: false,
      }),
    )

    cleanup()
    renderLogin()

    fireEvent.click(screen.getByRole('checkbox', { name: /remember me/i }))
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }))

    await waitFor(() => expect(fetchGoogleAuthUrl).toHaveBeenCalledWith({ remember: false }))
  })
})
