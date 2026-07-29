// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ChatList from '../ChatList'

afterEach(() => {
  cleanup()
})

const threads = [
  {
    user: { id: 2, name: 'Asha', email: 'asha@example.com', roles: ['employee'] },
    unread_count: 2,
    last_message: {
      id: 10,
      body: 'Please review',
      created_at: '2026-06-12T08:00:00.000Z',
      sender: { id: 2 },
    },
  },
  {
    user: { id: 3, name: 'Ben', email: 'ben@example.com', roles: ['employee'] },
    unread_count: 0,
    last_message: {
      id: 11,
      body: 'Done',
      created_at: '2026-06-12T09:00:00.000Z',
      sender: { id: 1 },
    },
  },
]

const renderList = (props = {}) =>
  render(
    <ChatList
      threads={threads}
      drafts={{ 3: 'Draft reply' }}
      authUserId={1}
      activeUserId={null}
      query=""
      onQueryChange={vi.fn()}
      onSelectThread={vi.fn()}
      onDeleteThread={vi.fn()}
      onDeleteThreadForEveryone={vi.fn()}
      showListPanel
      isMobile
      loading={false}
      isCapped={false}
      {...props}
    />,
  )

describe('ChatList', () => {
  it('filters threads by unread and draft quick filters', () => {
    renderList()

    expect(screen.getByText('Asha')).toBeTruthy()
    expect(screen.getByText('Ben')).toBeTruthy()

    const unreadFilter = screen.getByRole('button', { name: 'Unread' })
    expect(unreadFilter.classList.contains('vmecc-choice-button')).toBe(true)
    expect(unreadFilter.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(unreadFilter)
    expect(unreadFilter.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Asha')).toBeTruthy()
    expect(screen.queryByText('Ben')).toBeNull()

    fireEvent.click(screen.getByText('Drafts'))
    expect(screen.queryByText('Asha')).toBeNull()
    expect(screen.getByText('Ben')).toBeTruthy()

    fireEvent.click(screen.getByText('All'))
    expect(screen.getByText('Asha')).toBeTruthy()
    expect(screen.getByText('Ben')).toBeTruthy()
  })
})
