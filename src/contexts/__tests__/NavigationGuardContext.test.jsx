// @vitest-environment jsdom
import React, { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { NavigationGuardProvider, useNavigationGuard } from '../NavigationGuardContext'

afterEach(() => cleanup())

const GuardHarness = ({ action, options }) => {
  const { registerGuard, unregisterGuard, requestNavigation } = useNavigationGuard()
  const [beforeUnloadPrevented, setBeforeUnloadPrevented] = useState(null)

  useEffect(() => {
    registerGuard('harness', {
      active: true,
      message: 'Unsaved harness changes.',
    })
    return () => unregisterGuard('harness')
  }, [registerGuard, unregisterGuard])

  const dispatchBeforeUnload = () => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    setBeforeUnloadPrevented(event.defaultPrevented)
  }

  return (
    <>
      <button type="button" onClick={() => requestNavigation(action, options)}>
        Request navigation
      </button>
      <button type="button" onClick={dispatchBeforeUnload}>
        Check unload
      </button>
      <span data-testid="beforeunload">{String(beforeUnloadPrevented)}</span>
    </>
  )
}

const renderHarness = (props) =>
  render(
    <MemoryRouter>
      <NavigationGuardProvider>
        <GuardHarness {...props} />
      </NavigationGuardProvider>
    </MemoryRouter>,
  )

describe('NavigationGuardContext', () => {
  it('keeps existing guarded navigation modal behavior', async () => {
    const action = vi.fn()
    renderHarness({ action })

    fireEvent.click(screen.getByRole('button', { name: 'Request navigation' }))

    expect(action).not.toHaveBeenCalled()
    expect(screen.getByText('Discard unsaved changes?')).toBeTruthy()
    expect(screen.getByText('Unsaved harness changes.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('prevents normal beforeunload while a guard is active', async () => {
    renderHarness({ action: vi.fn() })

    fireEvent.click(screen.getByRole('button', { name: 'Check unload' }))

    await waitFor(() => expect(screen.getByTestId('beforeunload').textContent).toBe('true'))
  })

  it('suppresses the next beforeunload when guarded reload is confirmed', async () => {
    const action = vi.fn(() => {
      const event = new Event('beforeunload', { cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    })
    renderHarness({ action, options: { allowUnload: true } })

    fireEvent.click(screen.getByRole('button', { name: 'Request navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))

    expect(action).toHaveBeenCalledTimes(1)
  })
})
