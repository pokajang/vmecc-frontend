// @vitest-environment jsdom
import React, { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import AppUpdateBanner from '../AppUpdateBanner'
import { NavigationGuardProvider, useNavigationGuard } from 'src/contexts/NavigationGuardContext'

afterEach(() => cleanup())

const renderBanner = ({
  updateAvailable = true,
  dismissUpdate = vi.fn(),
  reloadPage = vi.fn(),
  guard = false,
} = {}) => {
  const useUpdateState = () => ({
    updateAvailable,
    latestVersion: updateAvailable ? { buildId: 'new-build' } : null,
    dismissUpdate,
  })

  const DirtyGuard = ({ active }) => {
    const { registerGuard, unregisterGuard } = useNavigationGuard()
    useEffect(() => {
      if (!active) return undefined
      registerGuard('test-dirty-form', {
        active: true,
        message: 'You have unsaved test changes.',
      })
      return () => unregisterGuard('test-dirty-form')
    }, [active, registerGuard, unregisterGuard])
    return null
  }

  render(
    <MemoryRouter>
      <NavigationGuardProvider>
        <DirtyGuard active={guard} />
        <AppUpdateBanner useUpdateState={useUpdateState} reloadPage={reloadPage} />
      </NavigationGuardProvider>
    </MemoryRouter>,
  )

  return { dismissUpdate, reloadPage }
}

describe('AppUpdateBanner', () => {
  it('stays hidden when no update is available', () => {
    renderBanner({ updateAvailable: false })

    expect(screen.queryByText(/A new version is available/)).toBeNull()
  })

  it('shows the update prompt and snoozes with Later', () => {
    const dismissUpdate = vi.fn()
    renderBanner({ dismissUpdate })

    expect(screen.getByText(/A new version is available/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(dismissUpdate).toHaveBeenCalledTimes(1)
  })

  it('reloads immediately when no navigation guard is active', () => {
    const reloadPage = vi.fn()
    renderBanner({ reloadPage })

    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }))
    expect(reloadPage).toHaveBeenCalledTimes(1)
  })

  it('uses the unsaved-change modal before guarded refresh', async () => {
    const reloadPage = vi.fn()
    renderBanner({ reloadPage, guard: true })

    await waitFor(() => expect(screen.getByText(/A new version is available/)).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Refresh/ }))

    expect(reloadPage).not.toHaveBeenCalled()
    expect(screen.getByText('Discard unsaved changes?')).toBeTruthy()
    expect(screen.getByText('You have unsaved test changes.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Discard and leave' }))
    expect(reloadPage).toHaveBeenCalledTimes(1)
  })
})
