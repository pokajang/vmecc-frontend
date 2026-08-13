// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import InspectionStatusSegment from '../form/components/patterns/InspectionStatusSegment'

afterEach(cleanup)

describe('InspectionStatusSegment', () => {
  it('exposes the shared drawer choice contract and pressed state', () => {
    const onChange = vi.fn()
    render(
      <InspectionStatusSegment
        label="Physical condition"
        value="Good"
        options={['Good', 'Not Good', 'N/A']}
        onChange={onChange}
      />,
    )

    const group = screen.getByRole('group', { name: 'Physical condition' })
    const good = screen.getByRole('button', { name: 'Good' })
    const notGood = screen.getByRole('button', { name: 'Not Good' })

    expect(group.className).toContain('inspection-drawer-choice-group')
    expect(good.className).toContain('inspection-drawer-choice')
    expect(good.getAttribute('aria-pressed')).toBe('true')
    expect(good.getAttribute('data-selected')).toBe('true')
    expect(notGood.getAttribute('aria-pressed')).toBe('false')
    expect(notGood.hasAttribute('data-selected')).toBe(false)

    fireEvent.click(notGood)
    expect(onChange).toHaveBeenCalledWith('Not Good')
  })
})
