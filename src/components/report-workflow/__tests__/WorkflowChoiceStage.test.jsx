// @vitest-environment jsdom
import React, { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowChoiceStage from '../WorkflowChoiceStage'

afterEach(cleanup)

const options = [
  { value: 'one', title: 'First option' },
  { value: 'two', title: 'Second option' },
]

describe('WorkflowChoiceStage', () => {
  it('keeps one primary Continue action and sends the selected value', () => {
    const onContinue = vi.fn()
    const Wrapper = () => {
      const [value, setValue] = useState('')
      return (
        <WorkflowChoiceStage
          title="Request type"
          options={options}
          value={value}
          onChange={setValue}
          onContinue={onContinue}
        />
      )
    }

    render(<Wrapper />)

    expect(screen.getByRole('button', { name: 'Continue' }).disabled).toBe(true)
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
    fireEvent.click(screen.getByText('Second option').closest('[role="radio"]'))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(onContinue).toHaveBeenCalledWith('two')
  })

  it('supports an opt-in action stage that advances directly without Continue', () => {
    const onChange = vi.fn()
    const onContinue = vi.fn()

    render(
      <WorkflowChoiceStage
        title="Request type"
        options={options}
        value=""
        onChange={onChange}
        onContinue={onContinue}
        advanceOnSelect
      />,
    )

    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Second option' }))
    expect(onChange).toHaveBeenCalledWith('two', expect.objectContaining({ value: 'two' }))
    expect(onContinue).toHaveBeenCalledWith('two', expect.objectContaining({ value: 'two' }))
  })
})
