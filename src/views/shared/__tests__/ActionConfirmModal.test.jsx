// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ActionConfirmModal from '../ActionConfirmModal'

const setMobileViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === '(max-width: 575.98px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('ActionConfirmModal', () => {
  it('uses a mobile bottom drawer when requested on compact screens', () => {
    setMobileViewport()
    const onConfirm = vi.fn()

    render(
      <ActionConfirmModal
        visible
        mobileDrawer
        title="Delete Equipment"
        message="Delete this equipment?"
        confirmLabel="Delete"
        confirmColor="danger"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    )

    const drawer = document.querySelector('.offcanvas')
    expect(drawer).toBeTruthy()
    expect(drawer.classList.contains('mobile-bottom-drawer--confirm')).toBe(true)
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(within(drawer).getByText('Delete Equipment')).toBeTruthy()
    expect(within(drawer).getByText('Delete this equipment?')).toBeTruthy()

    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
