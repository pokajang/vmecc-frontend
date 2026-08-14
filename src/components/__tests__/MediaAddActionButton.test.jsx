// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import MediaAddActionButton from '../MediaAddActionButton'

afterEach(cleanup)

describe('MediaAddActionButton', () => {
  it('uses the shared chrome-free icon and label contract', () => {
    const onClick = vi.fn()
    render(<MediaAddActionButton label="Add photo (optional)" onClick={onClick} />)

    const button = screen.getByRole('button', { name: 'Add photo (optional)' })
    fireEvent.click(button)

    expect(button.className).toContain('media-add-action')
    expect(button.className).toContain('btn-link')
    expect(button.className).not.toContain('btn-outline')
    expect(button.querySelector('.create-action-button__icon')).toBeTruthy()
    expect(button.querySelector('.create-action-button__label')?.textContent).toBe(
      'Add photo (optional)',
    )
    expect(onClick).toHaveBeenCalledOnce()
  })
})
