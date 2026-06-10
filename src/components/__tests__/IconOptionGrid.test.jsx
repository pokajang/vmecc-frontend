// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Clock3, CalendarDays } from 'lucide-react'
import IconOptionGrid from 'src/components/IconOptionGrid'

afterEach(() => {
  cleanup()
})

const options = [
  {
    value: 'weekday',
    title: 'Weekday Overtime',
    description: 'Overtime worked on regular weekdays.',
    icon: Clock3,
  },
  {
    value: 'weekend',
    title: 'Weekend Overtime',
    description: 'Overtime worked on weekends.',
    icon: CalendarDays,
  },
]

describe('IconOptionGrid', () => {
  it('renders option titles and descriptions', () => {
    render(
      <IconOptionGrid
        options={options}
        value="weekday"
        onChange={() => {}}
        ariaLabel="Choose option"
        testIdPrefix="option"
      />,
    )

    expect(screen.getByText('Weekday Overtime')).toBeTruthy()
    expect(screen.getByText('Overtime worked on weekends.')).toBeTruthy()
  })

  it('applies selected styling', () => {
    render(
      <IconOptionGrid
        options={options}
        value="weekend"
        onChange={() => {}}
        ariaLabel="Choose option"
        testIdPrefix="option"
      />,
    )

    const selectedCard = screen.getByTestId('option-weekend')
    expect(selectedCard.className).toContain('border-primary')
    expect(selectedCard.className).toContain('bg-primary')
  })

  it('triggers selection on click and keyboard', () => {
    const handleChange = vi.fn()
    render(
      <IconOptionGrid
        options={options}
        value="weekday"
        onChange={handleChange}
        ariaLabel="Choose option"
        testIdPrefix="option"
      />,
    )

    const weekendCard = screen.getByTestId('option-weekend')
    fireEvent.click(weekendCard)
    expect(handleChange).toHaveBeenCalledWith('weekend', expect.objectContaining({ value: 'weekend' }))

    const weekdayCard = screen.getByTestId('option-weekday')
    fireEvent.keyDown(weekdayCard, { key: 'Enter' })
    fireEvent.keyDown(weekdayCard, { key: ' ' })
    expect(handleChange).toHaveBeenCalledWith('weekday', expect.objectContaining({ value: 'weekday' }))
    expect(handleChange).toHaveBeenCalledTimes(3)
  })

  it('prevents interaction when disabled', () => {
    const handleChange = vi.fn()
    render(
      <IconOptionGrid
        options={options}
        value="weekday"
        onChange={handleChange}
        disabled
        ariaLabel="Choose option"
        testIdPrefix="option"
      />,
    )

    const weekendCard = screen.getByTestId('option-weekend')
    fireEvent.click(weekendCard)
    fireEvent.keyDown(weekendCard, { key: 'Enter' })

    expect(weekendCard.getAttribute('tabindex')).toBe('-1')
    expect(weekendCard.getAttribute('aria-disabled')).toBe('true')
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('supports hidden descriptions on mobile', () => {
    render(
      <IconOptionGrid
        options={options}
        value="weekday"
        onChange={() => {}}
        ariaLabel="Choose option"
        testIdPrefix="option"
        cardProps={{ hideDescriptionOnMobile: true }}
      />,
    )

    const description = screen.getByText('Overtime worked on regular weekdays.')
    expect(description.className).toContain('d-none')
    expect(description.className).toContain('d-md-block')
  })
})
