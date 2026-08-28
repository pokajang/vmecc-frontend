// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import DisclosureCard from '../DisclosureCard'

afterEach(cleanup)

describe('DisclosureCard', () => {
  it('supports a quiet section presentation without changing disclosure behavior', () => {
    render(
      <DisclosureCard variant="section" summary="Payroll details">
        <p>Breakdown content</p>
      </DisclosureCard>,
    )

    const disclosure = screen.getByText('Payroll details').closest('details')
    const trigger = screen.getByRole('button', { name: 'Payroll details' })

    expect(disclosure.classList).toContain('disclosure-card--section')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    disclosure.open = true
    fireEvent(disclosure, new Event('toggle', { bubbles: true }))

    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText('Breakdown content')).toBeTruthy()
  })
})
