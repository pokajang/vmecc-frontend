// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Flame } from 'lucide-react'
import MobileChoiceList from '../MobileChoiceList'

afterEach(cleanup)

const options = [
  {
    value: 'fire',
    title: 'Fire Drill',
    description: 'Emergency fire response exercise.',
    icon: Flame,
  },
  {
    value: 'rescue',
    title: 'Rescue Drill',
  },
]

describe('MobileChoiceList', () => {
  it('renders an action list and forwards the selected option', () => {
    const onChange = vi.fn()
    render(
      <MobileChoiceList
        mode="action"
        ariaLabel="Choose type"
        options={options}
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Fire Drill/ }))
    expect(onChange).toHaveBeenCalledWith('fire', expect.objectContaining({ value: 'fire' }))
    expect(screen.getByText('Emergency fire response exercise.')).toBeTruthy()
  })

  it('exposes single selection as a radio group and supports arrow navigation', () => {
    const onChange = vi.fn()
    render(
      <MobileChoiceList
        mode="single"
        ariaLabel="Choose drill type"
        options={options}
        value="fire"
        onChange={onChange}
      />,
    )

    const group = screen.getByRole('radiogroup', { name: 'Choose drill type' })
    const radios = within(group).getAllByRole('radio')
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
    expect(radios[1].getAttribute('tabindex')).toBe('-1')

    fireEvent.keyDown(radios[0], { key: 'ArrowDown' })
    expect(onChange).toHaveBeenCalledWith('rescue', expect.objectContaining({ value: 'rescue' }))
  })

  it('exposes multiple selection as checkboxes', () => {
    const onChange = vi.fn()
    render(
      <MobileChoiceList
        mode="multiple"
        ariaLabel="Exercise categories"
        options={options}
        value={['rescue']}
        onChange={onChange}
      />,
    )

    const choices = screen.getAllByRole('checkbox')
    expect(choices[0].getAttribute('aria-checked')).toBe('false')
    expect(choices[1].getAttribute('aria-checked')).toBe('true')
    fireEvent.click(choices[0])
    expect(onChange).toHaveBeenCalledWith('fire', expect.objectContaining({ value: 'fire' }))
  })

  it('keeps the footer action outside selection semantics', () => {
    const onFooter = vi.fn()
    render(
      <MobileChoiceList
        mode="single"
        ariaLabel="Choose type"
        options={options}
        value=""
        onChange={() => {}}
        footerAction={{
          label: 'Show more',
          expanded: false,
          onClick: onFooter,
        }}
      />,
    )

    expect(screen.getAllByRole('radio')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Show more' }))
    expect(onFooter).toHaveBeenCalledTimes(1)
  })

  it('prevents disabled choices from changing', () => {
    const onChange = vi.fn()
    render(
      <MobileChoiceList
        mode="single"
        ariaLabel="Choose type"
        options={[{ ...options[0], disabled: true }]}
        value=""
        onChange={onChange}
      />,
    )

    fireEvent.click(screen.getByRole('radio'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
