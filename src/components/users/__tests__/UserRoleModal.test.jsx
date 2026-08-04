// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import UserRoleModal from '../UserRoleModal'

afterEach(() => {
  cleanup()
})

const assignment = {
  role: 'Contract Manager',
  scope_type: 'office',
  team_id: null,
  start_date: '2026-08-04',
  end_date: null,
  is_primary: true,
}

const renderModal = ({ loading = false, onAddAssignment = vi.fn() } = {}) =>
  render(
    <UserRoleModal
      visible
      roleAssignments={[assignment]}
      teams={[]}
      onAddAssignment={onAddAssignment}
      onRemoveAssignment={vi.fn()}
      onChangeAssignment={vi.fn()}
      onClose={vi.fn()}
      onConfirm={vi.fn()}
      loading={loading}
    />,
  )

describe('UserRoleModal role-assignment action', () => {
  it('uses the compact outlined presentation and forwards the click event', () => {
    const onAddAssignment = vi.fn()
    renderModal({ onAddAssignment })

    const button = screen.getByRole('button', { name: 'Add assignment' })
    expect(button.type).toBe('button')
    expect(button.className).toContain('btn-sm')
    expect(button.className).toContain('btn-outline-secondary')
    expect(button.querySelector('.lucide-plus')?.getAttribute('width')).toBe('14')
    expect(button.querySelector('.lucide-plus')?.classList.contains('me-1')).toBe(true)

    fireEvent.click(button)
    expect(onAddAssignment).toHaveBeenCalledTimes(1)
    expect(onAddAssignment.mock.calls[0][0]?.type).toBe('click')
  })

  it('locks the action while role assignments are updating', () => {
    const onAddAssignment = vi.fn()
    renderModal({ loading: true, onAddAssignment })

    const button = screen.getByRole('button', { name: 'Add assignment' })
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onAddAssignment).not.toHaveBeenCalled()
  })
})
