// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import TypeDurationSummaryChips from '../TypeDurationSummaryChips'

afterEach(() => {
  cleanup()
})

describe('TypeDurationSummaryChips', () => {
  it('renders known overtime types in canonical order and hides zero totals', () => {
    render(
      <TypeDurationSummaryChips
        typeDurationMinutes={{
          weekend: 120,
          weekday: 60,
          publicHoliday: 0,
        }}
      />,
    )

    const chips = screen.getAllByTestId(/ot-type-summary-chip-/)
    expect(chips.length).toBe(2)
    expect(chips[0].textContent || '').toContain('Weekday')
    expect(chips[1].textContent || '').toContain('Weekend')
    expect(screen.queryByTestId('ot-type-summary-chip-publicHoliday')).toBeNull()
  })

  it('appends unknown types alphabetically after known types', () => {
    render(
      <TypeDurationSummaryChips
        typeDurationMinutes={{
          weekend: 120,
          special_event: 30,
          nightShift: 45,
        }}
      />,
    )

    const chips = screen.getAllByTestId(/ot-type-summary-chip-/)
    expect(chips.length).toBe(3)
    expect(chips[0].textContent || '').toContain('Weekend')
    expect(chips[1].textContent || '').toContain('Night Shift')
    expect(chips[2].textContent || '').toContain('Special Event')
  })

  it('shows fallback label when there are no positive totals', () => {
    render(<TypeDurationSummaryChips typeDurationMinutes={{ weekday: 0 }} emptyLabel="Empty totals" />)

    expect(screen.getByText('Empty totals')).toBeTruthy()
  })
})

