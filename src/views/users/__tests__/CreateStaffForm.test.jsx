// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import CreateStaffForm from '../CreateStaffForm'

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

const renderForm = ({ loading = false, onAddAssignment = vi.fn(), onSubmit = vi.fn() } = {}) =>
  render(
    <CreateStaffForm
      visible
      form={{ name: 'Test User', email: 'test.user@example.test' }}
      submitStatus={{ loading }}
      onChange={vi.fn()}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      roleAssignments={[assignment]}
      teams={[]}
      onAddAssignment={onAddAssignment}
      onRemoveAssignment={vi.fn()}
      onChangeAssignment={vi.fn()}
    />,
  )

describe('CreateStaffForm role-assignment action', () => {
  it('uses the compact outlined presentation and forwards click without submitting', () => {
    const onAddAssignment = vi.fn()
    const onSubmit = vi.fn((event) => event.preventDefault())
    renderForm({ onAddAssignment, onSubmit })

    const button = screen.getByRole('button', { name: 'Add' })
    expect(button.type).toBe('button')
    expect(button.className).toContain('btn-sm')
    expect(button.className).toContain('btn-outline-secondary')
    expect(button.querySelector('.lucide-plus')?.getAttribute('width')).toBe('14')
    expect(button.querySelector('.lucide-plus')?.classList.contains('me-1')).toBe(true)

    fireEvent.click(button)
    expect(onAddAssignment).toHaveBeenCalledTimes(1)
    expect(onAddAssignment.mock.calls[0][0]?.type).toBe('click')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('locks the action while the create form is submitting', () => {
    const onAddAssignment = vi.fn()
    renderForm({ loading: true, onAddAssignment })

    const button = screen.getByRole('button', { name: 'Add' })
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onAddAssignment).not.toHaveBeenCalled()
  })
})
