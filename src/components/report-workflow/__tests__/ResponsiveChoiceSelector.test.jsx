// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ResponsiveChoiceSelector from '../ResponsiveChoiceSelector'

afterEach(cleanup)

const options = [
  { value: 'fire', title: 'Fire Drill' },
  { value: 'rescue', title: 'Rescue Drill' },
]

describe('ResponsiveChoiceSelector', () => {
  it('uses the shared list contract on mobile', () => {
    const { container } = render(
      <ResponsiveChoiceSelector
        isMobile
        options={options}
        value="fire"
        onChange={() => {}}
        ariaLabel="Choose drill type"
      />,
    )

    expect(screen.getByRole('radiogroup', { name: 'Choose drill type' })).toBeTruthy()
    expect(container.querySelector('.mobile-choice-list')).toBeTruthy()
    expect(container.querySelector('.row')).toBeNull()
  })

  it('preserves the existing option grid on desktop', () => {
    const { container } = render(
      <ResponsiveChoiceSelector
        isMobile={false}
        options={options}
        value="fire"
        onChange={() => {}}
        ariaLabel="Choose drill type"
      />,
    )

    expect(screen.getByRole('radiogroup', { name: 'Choose drill type' })).toBeTruthy()
    expect(container.querySelector('.row')).toBeTruthy()
    expect(container.querySelector('.mobile-choice-list')).toBeNull()
  })
})
