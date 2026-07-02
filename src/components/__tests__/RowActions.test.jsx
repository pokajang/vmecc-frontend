// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RowActions from '../RowActions'

afterEach(() => {
  cleanup()
})

describe('RowActions', () => {
  it('does not bubble a portaled menu item click to row-level handlers', () => {
    const onRowClick = vi.fn()
    const onDelete = vi.fn()

    render(
      <div role="button" onClick={onRowClick}>
        <RowActions
          items={[
            {
              key: 'delete-user',
              label: 'Delete user',
              onClick: onDelete,
            },
          ]}
        />
      </div>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Row actions' }))
    fireEvent.click(screen.getByText('Delete user'))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onRowClick).not.toHaveBeenCalled()
  })
})
