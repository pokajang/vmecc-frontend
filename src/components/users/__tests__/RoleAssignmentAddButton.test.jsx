// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RoleAssignmentAddButton from '../RoleAssignmentAddButton'

afterEach(() => {
  cleanup()
})

describe('RoleAssignmentAddButton', () => {
  it('owns the role-assignment presentation and forwards the click event', () => {
    const onClick = vi.fn()
    render(<RoleAssignmentAddButton onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Add assignment' })
    expect(button.type).toBe('button')
    expect(button.className).toContain('btn-sm')
    expect(button.className).toContain('btn-outline-secondary')
    expect(button.querySelector('.lucide-plus')?.getAttribute('width')).toBe('14')
    expect(button.querySelector('.lucide-plus')?.classList.contains('me-1')).toBe(true)

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0][0]?.type).toBe('click')
  })

  it('supports caller labels and state without weakening fixed button invariants', () => {
    const onClick = vi.fn()
    render(
      <RoleAssignmentAddButton
        label="Add"
        disabled
        onClick={onClick}
        type="submit"
        size="lg"
        color="danger"
        variant="ghost"
        aria-label="Add another role assignment"
      />,
    )

    const button = screen.getByRole('button', { name: 'Add another role assignment' })
    expect(button.type).toBe('button')
    expect(button.className).toContain('btn-sm')
    expect(button.className).toContain('btn-outline-secondary')
    expect(button.className).not.toContain('btn-lg')
    expect(button.className).not.toContain('btn-danger')
    expect(button.className).not.toContain('btn-ghost')
    expect(button.disabled).toBe(true)

    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })
})
