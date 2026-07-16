// @vitest-environment jsdom
import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RecordDetailActions from '../RecordDetailActions'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('RecordDetailActions', () => {
  it('waits for the More actions drawer to close before running a destructive action', async () => {
    vi.useFakeTimers()
    const onDelete = vi.fn()
    render(
      <RecordDetailActions
        mode="mobile"
        record={{
          id: 'report-1',
          recordActionsVersion: 1,
          recordActions: {
            edit: { applicable: true, allowed: true },
            delete: { applicable: true, allowed: true },
          },
        }}
        handlers={{ edit: vi.fn(), delete: onDelete, back: vi.fn() }}
        testAnchorPrefix="report"
      />,
    )

    const more = screen.getByRole('button', { name: 'More actions' })
    more.focus()
    fireEvent.click(more)
    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    deleteButton.focus()
    fireEvent.click(deleteButton)

    expect(onDelete).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(document.activeElement).not.toBe(more)
  })
})
