// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ResponsiveReportDialog from '../ResponsiveReportDialog'
import { REPORT_MOBILE_QUERY } from 'src/hooks/useReportIsMobile'

const setViewport = (width) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === REPORT_MOBILE_QUERY && width <= 767.98,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  delete window.matchMedia
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
})

describe('ResponsiveReportDialog', () => {
  it('uses the report drawer contract at the mobile breakpoint', () => {
    setViewport(767)
    const onClose = vi.fn()

    render(
      <ResponsiveReportDialog
        visible
        title={<span>AI Review</span>}
        ariaLabel="AI Review"
        closeDisabled
        onClose={onClose}
        footer={<button type="button">Continue</button>}
      >
        Review body
      </ResponsiveReportDialog>,
    )

    const drawer = screen.getByRole('dialog', { name: 'AI Review' })
    expect(document.querySelector('.modal.show')).toBeNull()
    expect(within(drawer).getByText('Review body')).toBeTruthy()
    expect(within(drawer).getByRole('button', { name: 'Close' }).disabled).toBe(true)
    expect(within(drawer).getByRole('button', { name: 'Continue' })).toBeTruthy()
    fireEvent.click(within(drawer).getByRole('button', { name: 'Close' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('uses the requested modal contract above the mobile breakpoint', () => {
    setViewport(768)

    render(
      <ResponsiveReportDialog
        visible
        title="Edit event"
        onClose={vi.fn()}
        desktopFullscreen="sm"
        scrollable
        footer={<button type="button">Save</button>}
      >
        Event fields
      </ResponsiveReportDialog>,
    )

    const dialog = screen.getByRole('dialog')
    const modalDialog = dialog.querySelector('.modal-dialog')
    expect(document.querySelector('.mobile-bottom-drawer')).toBeNull()
    expect(modalDialog?.classList.contains('modal-dialog-centered')).toBe(true)
    expect(modalDialog?.classList.contains('modal-dialog-scrollable')).toBe(true)
    expect(modalDialog?.classList.contains('modal-fullscreen-sm-down')).toBe(true)
    expect(within(dialog).getByText('Event fields')).toBeTruthy()
  })
})
