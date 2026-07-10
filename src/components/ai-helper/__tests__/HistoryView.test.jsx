// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import HistoryView from '../HistoryView'

const thread = {
  id: 7,
  title: 'How Many Files Are Uploaded To This Ai Knowledge?',
  updated_at: '2026-07-10T09:00:00.000Z',
  last_message: 'How many files are uploaded?',
}

describe('HistoryView', () => {
  it('renders delete confirmation inside the selected chat card', () => {
    const onCancelDelete = vi.fn()
    const onConfirmDelete = vi.fn()

    render(
      <HistoryView
        activeThreadId={null}
        backButtonRef={null}
        deleteTarget={thread}
        deletingThread={false}
        error={null}
        initialLoading={false}
        loading={false}
        threads={[thread]}
        onBack={vi.fn()}
        onCancelDelete={onCancelDelete}
        onConfirmDelete={onConfirmDelete}
        onDeleteTarget={vi.fn()}
        onOpenThread={vi.fn()}
        onRefresh={vi.fn()}
      />,
    )

    const confirmation = screen.getByRole('group', {
      name: `Delete ${thread.title} confirmation`,
    })
    expect(confirmation.closest('.ai-helper-history__item')).toBeTruthy()
    expect(document.querySelector('.ai-helper-history-confirm')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onCancelDelete).toHaveBeenCalledOnce()
    expect(onConfirmDelete).toHaveBeenCalledOnce()
  })
})
