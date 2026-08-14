// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import AppButton from '../AppButton'

afterEach(cleanup)

describe('AppButton', () => {
  it.each([
    ['neutral', 'soft', 'btn-outline-secondary'],
    ['primary', 'solid', 'btn-primary'],
    ['primary', 'soft', 'btn-outline-primary'],
    ['success', 'soft', 'btn-outline-success'],
    ['warning', 'soft', 'btn-outline-warning'],
    ['danger', 'soft', 'btn-outline-danger'],
    ['danger', 'solid', 'btn-danger'],
  ])('maps %s %s to the shared semantic classes', (intent, presentation, coreClass) => {
    render(
      <AppButton intent={intent} presentation={presentation}>
        Run action
      </AppButton>,
    )

    const button = screen.getByRole('button', { name: 'Run action' })
    expect(button.className).toContain(`app-button--${intent}`)
    expect(button.className).toContain(`app-button--${presentation}`)
    expect(button.className).toContain(coreClass)
  })

  it('preserves behavior, disabled state, accessibility attributes, and custom classes', () => {
    const onClick = vi.fn()
    render(
      <AppButton
        intent="primary"
        className="consumer-class"
        aria-busy="true"
        disabled
        onClick={onClick}
      >
        Saving
      </AppButton>,
    )

    const button = screen.getByRole('button', { name: 'Saving' })
    fireEvent.click(button)

    expect(button.className).toContain('consumer-class')
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.disabled).toBe(true)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('keeps icon-only actions square and explicitly named', () => {
    render(
      <AppButton iconOnly aria-label="Open tools">
        <svg aria-hidden="true" />
      </AppButton>,
    )

    expect(screen.getByRole('button', { name: 'Open tools' }).className).toContain(
      'app-button--icon-only',
    )
  })
})
