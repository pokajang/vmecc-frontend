// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import MobileNavSheet from '../MobileNavSheet'
import { PWA_INSTALL_ACTION } from 'src/constants/pwa'

afterEach(() => cleanup())

const baseProps = {
  open: true,
  mode: 'menu',
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  onLogout: vi.fn(),
  onReportIssue: vi.fn(),
  menuData: [{ name: 'Home', to: '/dashboard' }],
  user: { name: 'Admin', roles: ['Admin'] },
  canClaim: true,
  canLeave: true,
  canOvertime: false,
  isLoggingOut: false,
  returnFocusRef: { current: null },
}

it('does not render personal self-service shortcuts in the mobile menu', () => {
  render(<MobileNavSheet {...baseProps} />)

  expect(screen.queryByText('My Work')).toBeNull()
  expect(screen.queryByRole('button', { name: /Payroll/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /Leave/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /Overtime/ })).toBeNull()
  expect(screen.getByRole('button', { name: /Home/ })).toBeTruthy()
})

it('renders quick actions before my records in the mobile account sheet', () => {
  const handleNavigate = vi.fn()
  render(
    <MobileNavSheet
      {...baseProps}
      mode="account"
      canOvertime={false}
      onNavigate={handleNavigate}
    />,
  )

  const quickActions = screen.getByText('Quick Actions').closest('.mobile-overlay-section')
  const myRecords = screen.getByText('My Records').closest('.mobile-overlay-section')
  expect(screen.getByRole('dialog', { name: 'Account' })).toBeTruthy()
  const account = screen
    .getAllByText('Account')
    .map((element) => element.closest('.mobile-overlay-section'))
    .find(Boolean)
  const session = screen.getByText('Session').closest('.mobile-overlay-section')

  expect(quickActions.compareDocumentPosition(myRecords)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  expect(myRecords.compareDocumentPosition(account)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  expect(account.compareDocumentPosition(session)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

  const sharedActionGrid = quickActions.parentElement
  expect(sharedActionGrid.classList.contains('mobile-nav-sheet-action-grid-menu')).toBe(true)
  expect(myRecords.parentElement).toBe(sharedActionGrid)
  expect(account.parentElement).toBe(sharedActionGrid)
  expect(session.parentElement).toBe(sharedActionGrid)

  expect(screen.getByRole('button', { name: /New Claim/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Apply Leave/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Payroll Records/ })).toBeTruthy()
  expect(screen.getByRole('button', { name: /Leave Records/ })).toBeTruthy()
  expect(screen.queryByRole('button', { name: /Overtime Records/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /Messages/ })).toBeNull()

  fireEvent.click(screen.getByRole('button', { name: /Payroll Records/ }))
  expect(handleNavigate).toHaveBeenCalledWith({ to: '/payroll' })
})

it('renders report issue action in the mobile account sheet', () => {
  const onReportIssue = vi.fn()
  render(<MobileNavSheet {...baseProps} mode="account" onReportIssue={onReportIssue} />)

  fireEvent.click(screen.getByRole('button', { name: /Report Issue/ }))
  expect(onReportIssue).toHaveBeenCalledTimes(1)
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

it('passes install action items through the mobile menu', () => {
  const handleNavigate = vi.fn()
  render(
    <MobileNavSheet
      {...baseProps}
      onNavigate={handleNavigate}
      menuData={[{ name: 'Install VMECC', action: PWA_INSTALL_ACTION }]}
    />,
  )

  fireEvent.click(screen.getByRole('button', { name: /Install VMECC/ }))
  expect(handleNavigate).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'Install VMECC', action: PWA_INSTALL_ACTION }),
  )
})
