// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RepeatableTextList from '../RepeatableTextList'

afterEach(cleanup)

describe('RepeatableTextList', () => {
  it('supports adding, editing, and removing rows without helper copy', () => {
    const onAdd = vi.fn()
    const onChange = vi.fn()
    const onRemove = vi.fn()

    render(
      <RepeatableTextList
        id="strengths"
        label="Strengths"
        rows={['Fast mobilisation', 'Clear command']}
        maxRows={3}
        onAdd={onAdd}
        onChange={onChange}
        onRemove={onRemove}
      />,
    )

    expect(screen.getByText('2/3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Strengths entry 1' }), {
      target: { value: 'Rapid mobilisation' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove Strengths entry 2' }))

    expect(onAdd).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(0, 'Rapid mobilisation', 'Fast mobilisation')
    expect(onRemove).toHaveBeenCalledWith(1, 'Clear command')
  })

  it('prevents adding beyond the configured limit', () => {
    render(
      <RepeatableTextList
        id="improvements"
        label="Improvements"
        rows={['First', 'Second']}
        maxRows={2}
      />,
    )

    expect(screen.getByRole('button', { name: 'Add' }).disabled).toBe(true)
  })
})
