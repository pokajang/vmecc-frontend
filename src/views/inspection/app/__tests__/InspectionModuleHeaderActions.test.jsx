// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import InspectionModuleHeaderActions from '../InspectionModuleHeaderActions'

afterEach(() => {
  cleanup()
})

const baseProps = {
  showMobileBackAction: false,
  onMobileBack: vi.fn(),
  isCreateSection: false,
  onStartNew: vi.fn(),
  canConduct: true,
}

describe('InspectionModuleHeaderActions', () => {
  it('omits the mobile Back action when the caller does not request it', () => {
    render(<InspectionModuleHeaderActions {...baseProps} />)

    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Conduct Inspection' })).toBeTruthy()
  })

  it('preserves the compact mobile Back presentation and callback', () => {
    const onMobileBack = vi.fn()
    render(
      <InspectionModuleHeaderActions
        {...baseProps}
        showMobileBackAction
        onMobileBack={onMobileBack}
      />,
    )

    const backButton = screen.getByRole('button', { name: 'Back' })
    expect(backButton.type).toBe('button')
    expect(backButton.className).toContain('btn-outline-secondary')
    expect(backButton.className).toContain('inspection-header-back-btn')
    expect(backButton.className).toContain('inspection-compact-action-btn')
    expect(backButton.className).toContain('d-md-none')
    expect(backButton.className).toContain('d-inline-flex')
    expect(backButton.querySelector('.lucide-arrow-left')?.getAttribute('width')).toBe('14')

    fireEvent.click(backButton)
    expect(onMobileBack).toHaveBeenCalledTimes(1)
    expect(onMobileBack.mock.calls[0][0]?.type).toBe('click')
  })

  it('keeps Back before the primary action and hides that action in create sections', () => {
    const { rerender } = render(
      <InspectionModuleHeaderActions {...baseProps} showMobileBackAction />,
    )

    expect(screen.getAllByRole('button').map((button) => button.textContent.trim())).toEqual([
      'Back',
      'Conduct Inspection',
    ])

    rerender(<InspectionModuleHeaderActions {...baseProps} showMobileBackAction isCreateSection />)
    expect(screen.getAllByRole('button').map((button) => button.textContent.trim())).toEqual([
      'Back',
    ])
  })
})
