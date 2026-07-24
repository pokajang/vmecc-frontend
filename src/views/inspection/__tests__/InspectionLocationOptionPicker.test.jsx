// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ChevronDown } from 'lucide-react'
import InspectionLocationOptionPicker from '../form/components/InspectionLocationOptionPicker'

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
      {
        value: '__inspection_location_types_toggle__',
        title: 'Show more',
        icon: ChevronDown,
      },
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
        isCompactViewport
      />,
    )

    expect(screen.getByPlaceholderText('Search main location...')).toBeTruthy()
    expect(screen.getByText('Show more')).toBeTruthy()
    expect(screen.getByLabelText('Show more icon')).toBeTruthy()
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

  it('can render the full option list without a show-more toggle', () => {
    const options = makeOptions(6)
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
        toggleValue="__inspection_location_types_toggle__"
        showAllOptions
      />,
    )

    expect(screen.getByText('Location 6')).toBeTruthy()
    expect(screen.queryByText('Show more')).toBeNull()
  })

  it('shows a collapsed mobile selector row after selection and reopens through the edit affordance', () => {
    const onRequestEdit = vi.fn()

    render(
      <InspectionLocationOptionPicker
        options={makeOptions(3)}
        visibleOptions={makeOptions(3)}
        value="Location 2"
        selectedLabel="Location 2"
        sectionLabel="Choose Main Location"
        isCompactViewport
        isExpanded={false}
        onChange={vi.fn()}
        onRequestEdit={onRequestEdit}
      />,
    )

    expect(screen.getByText('Choose Main Location')).toBeTruthy()
    expect(screen.getByText('Location 2')).toBeTruthy()
    expect(screen.queryByText('Location 1')).toBeNull()

    fireEvent.click(screen.getByLabelText('Edit Choose Main Location'))

    expect(onRequestEdit).toHaveBeenCalledTimes(1)
  })

  it('clears a previous mobile search when reset restores the fresh picker', () => {
    const options = makeOptions(14)
    const visibleOptions = options.slice(0, 3)
    const onRequestReset = vi.fn()
    const { rerender } = render(
      <InspectionLocationOptionPicker
        options={options}
        visibleOptions={visibleOptions}
        value=""
        sectionLabel="Main Location"
        isCompactViewport
        isExpanded
        onChange={vi.fn()}
        onRequestReset={onRequestReset}
        searchAriaLabel="Search main location"
      />,
    )

    fireEvent.change(screen.getByLabelText('Search main location'), {
      target: { value: 'remote pump' },
    })
    expect(screen.getByText('Location 14')).toBeTruthy()

    rerender(
      <InspectionLocationOptionPicker
        options={options}
        visibleOptions={visibleOptions}
        value="Location 14"
        selectedLabel="Location 14"
        sectionLabel="Main Location"
        isCompactViewport
        isExpanded={false}
        onChange={vi.fn()}
        onRequestReset={onRequestReset}
        searchAriaLabel="Search main location"
      />,
    )
    fireEvent.click(screen.getByLabelText('Reset Main Location'))

    expect(onRequestReset).toHaveBeenCalledTimes(1)

    rerender(
      <InspectionLocationOptionPicker
        options={options}
        visibleOptions={visibleOptions}
        value=""
        sectionLabel="Main Location"
        isCompactViewport
        isExpanded
        onChange={vi.fn()}
        onRequestReset={onRequestReset}
        searchAriaLabel="Search main location"
      />,
    )

    expect(screen.getByLabelText('Search main location').value).toBe('')
    expect(screen.getByText('Location 1')).toBeTruthy()
    expect(screen.queryByText('Location 14')).toBeNull()
  })
})
