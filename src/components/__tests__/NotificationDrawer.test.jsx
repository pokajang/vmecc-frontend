// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import NotificationDrawer from '../NotificationDrawer'

afterEach(() => cleanup())

describe('NotificationDrawer focus behavior', () => {
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
})
