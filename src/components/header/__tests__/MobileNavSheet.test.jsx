// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MobileNavSheet from '../MobileNavSheet'

afterEach(() => cleanup())

const baseProps = {
  open: true,
  mode: 'menu',
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  onLogout: vi.fn(),
  menuData: [{ name: 'Home', to: '/dashboard' }],
  user: { name: 'Admin', roles: ['Admin'] },
  canClaim: true,
  canLeave: true,
  canOvertime: false,
  isLoggingOut: false,
  returnFocusRef: { current: null },
}

it('renders permission-aware my work shortcuts in the mobile menu', () => {
  const handleNavigate = vi.fn()
  render(<MobileNavSheet {...baseProps} onNavigate={handleNavigate} />)

  expect(screen.getByText('My Work')).toBeTruthy()
  expect(screen.getByRole('button', { name: /Payroll/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Leave/ })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Overtime/ })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /Payroll/ }))
  expect(handleNavigate).toHaveBeenCalledWith({ to: '/payroll' })
})

it('restores focus to the trigger when the sheet closes', async () => {
  const trigger = document.createElement('button')
  trigger.textContent = 'Open menu'
  document.body.appendChild(trigger)
  const returnFocusRef = { current: trigger }
  const { rerender } = render(<MobileNavSheet {...baseProps} returnFocusRef={returnFocusRef} />)

  await waitFor(() => expect(document.activeElement).not.toBe(trigger))

  rerender(<MobileNavSheet {...baseProps} open={false} returnFocusRef={returnFocusRef} />)

  await waitFor(() => expect(document.activeElement).toBe(trigger))
  trigger.remove()
})

it('uses Escape to leave a submenu before closing the sheet', async () => {
  const handleClose = vi.fn()
  render(
    <MobileNavSheet
      {...baseProps}
      onClose={handleClose}
      menuData={[{ name: 'Reports', items: [{ name: 'ERCO', to: '/report/erco' }] }]}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: /Reports/ }))
  expect(screen.getByRole('button', { name: /ERCO/ })).toBeTruthy()

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(handleClose).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: /ERCO/ })).toBeNull()

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(handleClose).toHaveBeenCalledTimes(1)
})
