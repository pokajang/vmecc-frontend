// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import MobileBottomDrawer from '../MobileBottomDrawer'

const renderDrawer = (visible) => (
  <MobileBottomDrawer visible={visible} title="Change Location" onClose={vi.fn()}>
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
})
