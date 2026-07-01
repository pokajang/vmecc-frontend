export const MESSAGES_TOUR_MODULE_SELECTOR = '[data-tour-id="messages-module"]'

export const MESSAGES_TOUR_ANCHOR_SELECTORS = [
  MESSAGES_TOUR_MODULE_SELECTOR,
  '[data-tour-id="messages-header"]',
  '[data-tour-id="messages-create-action"]',
  '[data-tour-id="messages-list-panel"]',
  '[data-tour-id="messages-list-filters"]',
  '[data-tour-id="messages-thread-panel"]',
  '[data-tour-id="messages-thread-empty"]',
  '[data-tour-id="messages-composer"]',
]

export const MESSAGES_TOUR_STEPS = [
  {
    key: 'workspace',
    title: 'Messages workspace',
    targetSelector: MESSAGES_TOUR_MODULE_SELECTOR,
    content:
      'This workspace is where you move between conversations, start a chat, and send messages from one inbox surface.',
    placement: 'center',
    mobilePlacement: 'center',
  },
  {
    key: 'header',
    title: 'Messages header',
    targetSelector: '[data-tour-id="messages-header"]',
    fallbackSelector: MESSAGES_TOUR_MODULE_SELECTOR,
    content:
      'Use the header to confirm unread counts and open the create-chat entry when you need to start a new conversation.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'create',
    title: 'Start a chat',
    targetSelector: '[data-tour-id="messages-create-action"]',
    fallbackSelector: '[data-tour-id="messages-header"]',
    content:
      'Use this action to open the contact picker and start a new chat without leaving the inbox.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'list',
    title: 'Conversation list',
    targetSelector: '[data-tour-id="messages-list-panel"]',
    fallbackSelector: MESSAGES_TOUR_MODULE_SELECTOR,
    content:
      'Use the conversation list to reopen existing chats, scan unread items, and return to saved drafts.',
    placement: 'right',
    mobilePlacement: 'bottom',
  },
  {
    key: 'filters',
    title: 'Search and filters',
    targetSelector: '[data-tour-id="messages-list-filters"]',
    fallbackSelector: '[data-tour-id="messages-list-panel"]',
    content:
      'Use search and the quick filters to narrow the visible conversations before you open a thread.',
    placement: 'bottom',
    mobilePlacement: 'bottom',
  },
  {
    key: 'thread',
    title: 'Conversation thread',
    targetSelector: '[data-tour-id="messages-thread-panel"]',
    fallbackSelector: MESSAGES_TOUR_MODULE_SELECTOR,
    content:
      'Open any chat here to review the thread, unread history, and the current message flow.',
    placement: 'left',
    mobilePlacement: 'top',
  },
  {
    key: 'emptyThread',
    title: 'Empty thread state',
    targetSelector: '[data-tour-id="messages-thread-empty"]',
    content:
      'When no conversation is selected, this area stays ready for the next thread you choose from the inbox.',
    placement: 'top',
    mobilePlacement: 'top',
  },
  {
    key: 'composer',
    title: 'Message composer',
    targetSelector: '[data-tour-id="messages-composer"]',
    content:
      'Use the composer to write a message, attach an image when needed, and send the next update into the active thread.',
    placement: 'top',
    mobilePlacement: 'top',
  },
]
