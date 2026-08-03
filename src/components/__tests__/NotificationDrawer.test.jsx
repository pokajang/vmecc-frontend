// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import NotificationDrawer from '../NotificationDrawer'

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

afterEach(() => {
  cleanup()
  delete window.matchMedia
})

describe('NotificationDrawer focus behavior', () => {
  it('does not leave closed notification content in the document', () => {
    render(
      <NotificationDrawer open={false} onClose={vi.fn()} title="Notifications" count={0}>
        <button type="button">Private notification action</button>
      </NotificationDrawer>,
    )

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Private notification action' })).toBeNull()
  })

  it('traps focus, closes on Escape, and restores focus to the trigger', async () => {
    const handleClose = vi.fn()
    const trigger = document.createElement('button')
    trigger.textContent = 'Alerts'
    document.body.appendChild(trigger)
    const returnFocusRef = { current: trigger }

    const { rerender } = render(
      <NotificationDrawer
        open
        onClose={handleClose}
        title="Notifications"
        count={0}
        returnFocusRef={returnFocusRef}
      >
        <button type="button">First action</button>
      </NotificationDrawer>,
    )

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' })),
    )
    expect(screen.getByRole('button', { name: 'Close' }).getAttribute('type')).toBe('button')

    screen.getByRole('button', { name: 'First action' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)

    rerender(
      <NotificationDrawer
        open={false}
        onClose={handleClose}
        title="Notifications"
        count={0}
        returnFocusRef={returnFocusRef}
      >
        <button type="button">First action</button>
      </NotificationDrawer>,
    )
    await waitFor(() => expect(document.activeElement).toBe(trigger))

    trigger.remove()
  })

  it('closes from the backdrop', () => {
    const handleClose = vi.fn()

    render(
      <NotificationDrawer open onClose={handleClose} title="Notifications" count={0}>
        Content
      </NotificationDrawer>,
    )

    fireEvent.click(document.querySelector('.notification-drawer-backdrop'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('uses the shared mobile overlay shell on mobile viewports', async () => {
    mockMobileViewport()
    const handleClose = vi.fn()

    render(
      <NotificationDrawer open onClose={handleClose} title="Notifications" count={3}>
        <button type="button">Review alert</button>
      </NotificationDrawer>,
    )

    expect(
      screen
        .getByRole('dialog', { name: 'Notifications' })
        .classList.contains('mobile-overlay-shell'),
    ).toBe(true)
    expect(screen.getByText('3').classList.contains('mobile-overlay-shell-count')).toBe(true)
    expect(document.querySelector('.offcanvas-backdrop')?.getAttribute('tabindex')).toBe('-1')
    expect(document.querySelector('.offcanvas-backdrop')?.getAttribute('aria-hidden')).toBe('true')

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' })),
    )

    fireEvent.click(document.querySelector('.offcanvas-backdrop'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
