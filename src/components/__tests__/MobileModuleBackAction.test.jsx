// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import MobileModuleBackAction from 'src/components/MobileModuleBackAction'

afterEach(() => {
  cleanup()
})

describe('MobileModuleBackAction', () => {
  it('uses the shared chrome-free mobile Back presentation and click event', () => {
    const onClick = vi.fn()
    render(
      <MobileModuleBackAction
        className="inspection-header-back-btn inspection-compact-action-btn"
        onClick={onClick}
      />,
    )

    const button = screen.getByRole('button', { name: 'Back' })
    expect(button.type).toBe('button')
    expect(button.className).toContain('back-button')
    expect(button.className).toContain('btn-link')
    expect(button.className).not.toContain('btn-outline')
    expect(button.className).toContain('btn-sm')
    expect(button.className).toContain('d-md-none')
    expect(button.className).toContain('inspection-header-back-btn')
    expect(button.className).toContain('inspection-compact-action-btn')
    expect(button.querySelector('.lucide-arrow-left')?.getAttribute('width')).toBe('18')

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onClick.mock.calls[0][0]?.type).toBe('click')
  })

  it('supports caller-owned content and state without weakening its fixed presentation', () => {
    render(
      <MobileModuleBackAction
        label="Return to records"
        size="lg"
        iconSize={18}
        className="consumer-action"
        disabled
        type="submit"
        color="danger"
        variant="ghost"
        onClick={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Return to records' })
    expect(button.type).toBe('button')
    expect(button.className).toContain('btn-link')
    expect(button.className).not.toContain('btn-danger')
    expect(button.className).not.toContain('btn-ghost')
    expect(button.className).toContain('btn-lg')
    expect(button.className).toContain('consumer-action')
    expect(button.disabled).toBe(true)
    expect(button.querySelector('.lucide-arrow-left')?.getAttribute('width')).toBe('18')
  })
})
