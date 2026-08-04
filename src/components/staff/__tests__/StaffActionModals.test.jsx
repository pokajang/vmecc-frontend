// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import StaffActionModals from '../StaffActionModals'

vi.mock('src/components/users/UserRoleModal', () => ({
  default: () => null,
}))

vi.mock('src/components/staff/StaffMessageModal', () => ({
  default: () => null,
}))

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

const createProps = (overrides = {}) => ({
  actionUser: { name: 'Alicia Tan' },
  actionUpdating: false,
  roleModalOpen: false,
  roleAssignments: [],
  teams: [],
  onAddAssignment: vi.fn(),
  onRemoveAssignment: vi.fn(),
  onChangeAssignment: vi.fn(),
  onCloseRole: vi.fn(),
  onConfirmRole: vi.fn(),
  confirmTerminateOpen: false,
  onCloseTerminate: vi.fn(),
  onConfirmTerminate: vi.fn(),
  confirmRehireOpen: false,
  onCloseRehire: vi.fn(),
  onConfirmRehire: vi.fn(),
  messageModalOpen: false,
  messageBody: '',
  onMessageBodyChange: vi.fn(),
  onCloseMessage: vi.fn(),
  onSendMessage: vi.fn(),
  ...overrides,
})

afterEach(() => {
  cleanup()
  document.body.className = ''
  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('padding-right')
  delete window.matchMedia
})

describe('StaffActionModals confirmation canary', () => {
  it('preserves the desktop terminate confirmation contract', async () => {
    setViewportMatch()
    const props = createProps({ confirmTerminateOpen: true })

    render(<StaffActionModals {...props} />)

    const dialog = await screen.findByTestId('staff-directory-terminate-modal')
    expect(within(dialog).getByText('Terminate Staff')).toBeTruthy()
    expect(
      within(dialog).getByText(
        'Terminate Alicia Tan? This will remove access and mark the staff as terminated.',
      ),
    ).toBeTruthy()
    expect(
      within(dialog).getByRole('button', { name: 'Terminate' }).classList.contains('btn-danger'),
    ).toBe(true)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Terminate' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(props.onConfirmTerminate).toHaveBeenCalledTimes(1)
    expect(props.onCloseTerminate).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('staff-directory-rehire-modal')).toBeNull()
  })

  it('preserves the mobile rehire confirmation contract', async () => {
    setViewportMatch('(max-width: 575.98px)')
    const props = createProps({ confirmRehireOpen: true })

    render(<StaffActionModals {...props} />)

    const drawer = await screen.findByTestId('staff-directory-rehire-modal')
    expect(drawer.classList.contains('mobile-bottom-drawer--confirm')).toBe(true)
    expect(within(drawer).getByText('Rehire Staff')).toBeTruthy()
    expect(within(drawer).getByText('Rehire Alicia Tan and restore system access?')).toBeTruthy()
    expect(
      within(drawer).getByRole('button', { name: 'Rehire' }).classList.contains('btn-success'),
    ).toBe(true)

    fireEvent.click(within(drawer).getByRole('button', { name: 'Rehire' }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cancel' }))

    expect(props.onConfirmRehire).toHaveBeenCalledTimes(1)
    expect(props.onCloseRehire).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.modal.show')).toBeNull()
  })

  it('retains the fallback copy and action lock while staff data is unavailable', async () => {
    setViewportMatch()
    const props = createProps({
      actionUser: null,
      actionUpdating: true,
      confirmTerminateOpen: true,
    })

    render(<StaffActionModals {...props} />)

    const dialog = await screen.findByTestId('staff-directory-terminate-modal')
    expect(
      within(dialog).getByText(
        'Terminate this staff member? This will remove access and mark the staff as terminated.',
      ),
    ).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Terminate' }).disabled).toBe(true)
    expect(within(dialog).getByRole('button', { name: 'Cancel' }).disabled).toBe(true)
    expect(within(dialog).queryByRole('button', { name: 'Close' })).toBeNull()

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(props.onCloseTerminate).not.toHaveBeenCalled()
  })
})
