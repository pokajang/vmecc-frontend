// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MobileBottomDrawer from '../MobileBottomDrawer'

const renderDrawer = (visible, onClose = vi.fn()) => (
  <MobileBottomDrawer visible={visible} title="Change Location" onClose={onClose}>
    <div>Drawer body</div>
  </MobileBottomDrawer>
)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  document.body.className = ''
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
})

describe('MobileBottomDrawer', () => {
  it('keeps CoreUI mounted long enough to unlock page scroll after close', async () => {
    const { rerender } = render(renderDrawer(true))

    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'))
    expect(screen.getByRole('dialog')).toBeTruthy()

    rerender(renderDrawer(false))

    await waitFor(() => expect(document.body.style.overflow).toBe(''))
    expect(screen.getByRole('dialog')).toBeTruthy()

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('')
  })

  it('provides a named dialog and close action', async () => {
    render(renderDrawer(true))

    expect(await screen.findByRole('dialog', { name: 'Change Location' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Close Change Location' })).toBeTruthy()
  })

  it('restores focus to its trigger after closing', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'Open location drawer'
    document.body.appendChild(trigger)
    trigger.focus()

    const { rerender } = render(renderDrawer(true))
    await screen.findByRole('dialog', { name: 'Change Location' })

    rerender(renderDrawer(false))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('requests dismissal when Escape is pressed', async () => {
    const onClose = vi.fn()
    render(renderDrawer(true, onClose))

    const dialog = await screen.findByRole('dialog', { name: 'Change Location' })
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' })

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
