// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import InspectionLocationOptionPicker from '../components/InspectionLocationOptionPicker'

const makeOptions = (count) =>
  Array.from({ length: count }, (_, index) => {
    const number = index + 1
    return {
      value: `Location ${number}`,
      title: `Location ${number}`,
      description: number === 14 ? 'Remote pump room' : '',
    }
  })

afterEach(() => {
  cleanup()
})

describe('InspectionLocationOptionPicker', () => {
  it('keeps small option lists as the existing button grid without search', () => {
    const onChange = vi.fn()
    render(
      <InspectionLocationOptionPicker
        options={makeOptions(3)}
        visibleOptions={makeOptions(3)}
        value=""
        onChange={onChange}
        searchPlaceholder="Search main location..."
      />,
    )

    expect(screen.queryByPlaceholderText('Search main location...')).toBeNull()

    fireEvent.click(screen.getByText('Location 2'))

    expect(onChange).toHaveBeenCalledWith(
      'Location 2',
      expect.objectContaining({ value: 'Location 2' }),
    )
  })

  it('searches the full option list and hides the show-more toggle while searching', () => {
    const options = makeOptions(14)
    const visibleOptions = [
      ...options.slice(0, 3),
      { value: '__inspection_location_types_toggle__', title: 'Show more' },
    ]

    render(
      <InspectionLocationOptionPicker
        options={options}
        visibleOptions={visibleOptions}
        value=""
        onChange={vi.fn()}
        searchPlaceholder="Search main location..."
        searchAriaLabel="Search main location"
        clearSearchAriaLabel="Clear main location search"
        toggleValue="__inspection_location_types_toggle__"
      />,
    )

    expect(screen.getByPlaceholderText('Search main location...')).toBeTruthy()
    expect(screen.getByText('Show more')).toBeTruthy()
    expect(screen.queryByText('Location 14')).toBeNull()

    fireEvent.change(screen.getByLabelText('Search main location'), {
      target: { value: 'remote pump' },
    })

    expect(screen.getByText('Location 14')).toBeTruthy()
    expect(screen.queryByText('Show more')).toBeNull()

    fireEvent.click(screen.getByLabelText('Clear main location search'))

    expect(screen.getByText('Show more')).toBeTruthy()
    expect(screen.queryByText('Location 14')).toBeNull()
  })

  it('shows a compact empty state when no searched locations match', () => {
    render(
      <InspectionLocationOptionPicker
        options={makeOptions(13)}
        visibleOptions={makeOptions(3)}
        value=""
        onChange={vi.fn()}
        searchAriaLabel="Search sub-location"
      />,
    )

    fireEvent.change(screen.getByLabelText('Search sub-location'), {
      target: { value: 'not present' },
    })

    expect(screen.getByText('No locations match this search.')).toBeTruthy()
  })
})
