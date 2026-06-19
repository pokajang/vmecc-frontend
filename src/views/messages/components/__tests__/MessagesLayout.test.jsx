// @vitest-environment jsdom
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import MessagesLayout from '../MessagesLayout'

vi.mock('src/components/messages/ChatList', () => ({
  default: () => <div>Chat list</div>,
}))

vi.mock('src/components/messages/ChatThread', () => ({
  default: () => <div>Chat thread</div>,
}))

vi.mock('src/components/messages/NewChatModal', () => ({
  default: () => null,
}))

const baseProps = {
  isMobile: false,
  mobileView: 'thread',
  onBackToList: vi.fn(),
  unreadTotal: 0,
  onOpenNewChat: vi.fn(),
  error: '',
  onClearError: vi.fn(),
  threadsError: '',
  onRefresh: vi.fn(),
  threads: [],
  drafts: [],
  authUserId: 1,
  activeUserId: 2,
  query: '',
  onQueryChange: vi.fn(),
  onSelectThread: vi.fn(),
  onDeleteThread: vi.fn(),
  onDeleteThreadForEveryone: vi.fn(),
  showListPanel: true,
  loading: false,
  activeThread: null,
  activeUserName: '',
  messages: [],
  threadLoading: false,
  firstUnreadId: null,
  compose: '',
  onComposeChange: vi.fn(),
  onComposerKeyDown: vi.fn(),
  onSend: vi.fn(),
  onDeleteMessage: vi.fn(),
  sending: false,
  sendError: '',
  composerRef: { current: null },
  showThreadPanel: true,
  imageFile: null,
  imagePreview: '',
  onImageSelect: vi.fn(),
  onImageClear: vi.fn(),
  imageError: '',
  showNewChat: false,
  onCloseNewChat: vi.fn(),
  contactQuery: '',
  onContactQueryChange: vi.fn(),
  contactsLoading: false,
  contactsError: '',
  contacts: [],
  onSelectContact: vi.fn(),
}

describe('MessagesLayout responsive shell', () => {
  it('uses the md breakpoint for the list/thread split', () => {
    const { container } = render(<MessagesLayout {...baseProps} />)

    expect(container.querySelector('.flex-md-row')).toBeTruthy()
    expect(container.querySelector('.flex-lg-row')).toBeNull()
  })
})
