// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ActionConfirmModal from '../ActionConfirmModal'

const setViewportMatch = (matchedQuery = '') => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn((query) => ({
      matches: query === matchedQuery,
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
  document.body.className = ''
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('ActionConfirmModal canonical contract', () => {
  it('renders the desktop contract and forwards both actions', async () => {
    setViewportMatch()
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ActionConfirmModal
        visible
        mobileDrawer={false}
        title="Archive record"
        message={<span>Archive this record?</span>}
        confirmLabel="Archive"
        cancelLabel="Keep record"
        confirmColor="danger"
        testId="archive-confirmation"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    const dialog = await screen.findByTestId('archive-confirmation')
    expect(within(dialog).getByText('Archive record')).toBeTruthy()
    expect(within(dialog).getByText('Archive this record?')).toBeTruthy()
    expect(
      within(dialog).getByRole('button', { name: 'Archive' }).classList.contains('btn-danger'),
    ).toBe(true)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Archive' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep record' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks every desktop dismissal path while cancellation is disabled', async () => {
    setViewportMatch()
    const onClose = vi.fn()

    render(
      <ActionConfirmModal
        visible
        mobileDrawer={false}
        cancelDisabled
        title="Saving changes"
        message="Please wait."
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    )

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Cancel' }).disabled).toBe(true)
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    fireEvent.mouseUp(dialog)

    await new Promise((resolve) => window.setTimeout(resolve, 0))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('uses only the canonical confirmation body class in the mobile composition', async () => {
    setViewportMatch('(max-width: 575.98px)')
    const onClose = vi.fn()
    const onConfirm = vi.fn()

    render(
      <ActionConfirmModal
        visible
        title="Delete equipment"
        message="Delete this equipment?"
        confirmLabel="Delete"
        confirmColor="danger"
        testId="delete-confirmation"
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    )

    const drawer = await screen.findByTestId('delete-confirmation')
    const body = drawer.querySelector('.action-confirm-modal__body')
    expect(body).toBeTruthy()
    expect(body.classList.contains('inspection-mobile-detail-drawer-body')).toBe(false)
    expect(body.classList.contains('inspection-equipment-detail-drawer-body')).toBe(false)

    fireEvent.click(within(drawer).getByRole('button', { name: 'Delete' }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cancel' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('honors a caller-provided mobile breakpoint', async () => {
    const mobileDrawerQuery = '(max-width: 767.98px)'
    setViewportMatch(mobileDrawerQuery)

    render(
      <ActionConfirmModal
        visible
        mobileDrawerQuery={mobileDrawerQuery}
        title="Reset report"
        message="Reset this report?"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    )

    expect(await screen.findByRole('dialog', { name: 'Reset report' })).toBeTruthy()
    expect(window.matchMedia).toHaveBeenCalledWith(mobileDrawerQuery)
    expect(document.querySelector('.modal.show')).toBeNull()
  })

  it('does not leave a wrapper when an initially closed mobile confirmation is rendered', () => {
    setViewportMatch('(max-width: 575.98px)')
    const { container } = render(
      <ActionConfirmModal visible={false} onClose={vi.fn()} onConfirm={vi.fn()} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('restores mobile focus to the trigger after closing', async () => {
    setViewportMatch('(max-width: 575.98px)')
    const trigger = document.createElement('button')
    trigger.textContent = 'Open confirmation'
    document.body.appendChild(trigger)
    trigger.focus()

    const renderModal = (visible) => (
      <ActionConfirmModal
        visible={visible}
        title="Archive record"
        message="Archive this record?"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    const { rerender } = render(renderModal(true))
    await screen.findByRole('dialog', { name: 'Archive record' })

    rerender(renderModal(false))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })
})
