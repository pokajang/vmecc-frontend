// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const dispatch = vi.fn()
const closeKnowledgeReader = vi.fn()
const loadHistory = vi.fn(() => Promise.resolve())
const loadKnowledge = vi.fn(() => Promise.resolve())
let chatProps = null
let knowledgeProps = null
let knowledgeState = null

const createKnowledgeState = () => ({
  knowledgeAcknowledged: false,
  knowledgeDeleteTarget: null,
  knowledgeEntries: [],
  knowledgeError: null,
  knowledgeFile: null,
  knowledgeFileInputKey: 0,
  knowledgeInitialLoading: false,
  knowledgeLoading: false,
  knowledgeModuleKey: '',
  knowledgeScope: 'global',
  knowledgeTitle: '',
  knowledgeUpdatingId: null,
  knowledgeUploading: false,
  knowledgeView: 'list',
  knowledgeVisibility: 'personal',
  markdownAcknowledged: false,
  markdownFile: null,
  markdownFileInputKey: 0,
  markdownModuleKey: '',
  markdownScope: 'global',
  markdownTitle: '',
  markdownUploading: false,
  knowledgeReaderError: null,
  knowledgeReaderLoading: false,
  knowledgeReaderMarkdownError: null,
  knowledgeReaderMarkdownLoading: false,
  knowledgeReaderMarkdownSource: '',
  knowledgeReaderOpen: true,
  knowledgeReaderTab: 'original',
  selectedKnowledgeDetail: null,
  closeKnowledgeReader,
  confirmDeleteKnowledge: vi.fn(),
  handleKnowledgeFileChange: vi.fn(),
  handleMarkdownFileChange: vi.fn(),
  loadKnowledge,
  openKnowledgeReader: vi.fn(),
  setKnowledgeAcknowledged: vi.fn(),
  setKnowledgeDeleteTarget: vi.fn(),
  setKnowledgeError: vi.fn(),
  setKnowledgeModuleKey: vi.fn(),
  setKnowledgeReaderTab: vi.fn(),
  setKnowledgeScope: vi.fn(),
  setKnowledgeTitle: vi.fn(),
  setKnowledgeView: vi.fn(),
  setKnowledgeVisibility: vi.fn(),
  setMarkdownAcknowledged: vi.fn(),
  setMarkdownModuleKey: vi.fn(),
  setMarkdownScope: vi.fn(),
  setMarkdownTitle: vi.fn(),
  uploadKnowledge: vi.fn(),
  uploadMarkdownKnowledge: vi.fn(),
})

vi.mock('react-redux', () => ({
  useDispatch: () => dispatch,
  useSelector: (selector) =>
    selector({
      aiHelperOpen: true,
      authUser: { id: 1, name: 'Jang' },
      moduleActivation: {},
    }),
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/inspection', search: '' }),
}))

vi.mock('../AiHelperHeader', () => ({
  default: ({ onToggleKnowledge }) => (
    <button type="button" onClick={onToggleKnowledge}>
      toggle-knowledge
    </button>
  ),
}))

vi.mock('../KnowledgeView', () => ({
  default: (props) => {
    knowledgeProps = props
    return <div>knowledge-view</div>
  },
}))

vi.mock('../ChatView', () => ({
  default: (props) => {
    chatProps = props
    return <div>chat-view</div>
  },
}))

vi.mock('../HistoryView', () => ({
  default: () => <div>history-view</div>,
}))

vi.mock('../ReportModal', () => ({
  default: () => null,
}))

vi.mock('../useAiHelperContext', () => ({
  default: () => ({
    currentPageContext: { path: '/inspection' },
    contextPage: { path: '/inspection' },
    promptStarters: [],
    refreshCurrentContext: vi.fn(),
    routeContext: { path: '/inspection' },
  }),
}))

vi.mock('../useVisibleKnowledgeModules', () => ({
  default: () => ({
    isSysAdmin: false,
    visibleKnowledgeModules: [],
  }),
}))

vi.mock('../useAiHelperHistory', () => ({
  default: () => ({
    deleteTarget: null,
    deletingThread: false,
    historyError: null,
    historyInitialLoading: false,
    historyLoading: false,
    historyThreads: [],
    loadHistory,
    openHistoryThread: vi.fn(),
    recordThreadActivity: vi.fn(),
    setDeleteTarget: vi.fn(),
    setHistoryError: vi.fn(),
  }),
}))

vi.mock('../useAiHelperChat', () => ({
  default: () => ({
    closeReportModal: vi.fn(),
    copiedMessageId: null,
    draft: '',
    handleThreadOpened: vi.fn(),
    loadingThread: false,
    messages: [],
    reportError: null,
    reportReason: '',
    reportSubmitting: false,
    reportTarget: null,
    resetChat: vi.fn(),
    retryMessage: vi.fn(),
    sendError: null,
    sendMessage: vi.fn(),
    sending: false,
    setDraft: vi.fn(),
    setReportError: vi.fn(),
    setReportReason: vi.fn(),
    stopGeneration: vi.fn(),
    submitReport: vi.fn(),
    thread: null,
    threadLoadingLabel: '',
    copyMessage: vi.fn(),
    openReportModal: vi.fn(),
  }),
}))

vi.mock('../useAiHelperKnowledge', () => ({
  default: () => knowledgeState,
}))

vi.mock('../useAiHelperNotice', () => ({
  default: () => ({
    clearNotice: vi.fn(),
    notice: null,
    showNotice: vi.fn(),
    showPersistentNotice: vi.fn(),
  }),
}))

import AiHelperPanel from '../AiHelperPanel'

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  dispatch.mockReset()
  closeKnowledgeReader.mockReset()
  loadHistory.mockClear()
  loadKnowledge.mockClear()
  chatProps = null
  knowledgeProps = null
  knowledgeState = createKnowledgeState()
})

describe('AiHelperPanel', () => {
  it('closes the knowledge reader before leaving the knowledge view on Escape', () => {
    render(<AiHelperPanel />)

    fireEvent.click(screen.getByRole('button', { name: 'toggle-knowledge' }))
    expect(screen.getByText('knowledge-view')).toBeTruthy()

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(closeKnowledgeReader).toHaveBeenCalledTimes(1)
    expect(screen.getByText('knowledge-view')).toBeTruthy()
  })

  it('hides only non-shared markdown entries from non-sysadmin views', () => {
    knowledgeState.knowledgeEntries = [
      {
        id: 1,
        source_filename: 'shared-guidance.md',
        source_mime: 'text/markdown',
        title: 'Shared Markdown',
        visibility: 'shared',
      },
      {
        id: 3,
        source_filename: 'restricted-guidance.md',
        source_mime: 'text/markdown',
        title: 'Restricted Markdown',
        visibility: 'personal',
      },
      {
        id: 2,
        source_filename: 'staff-guide.pdf',
        source_mime: 'application/pdf',
        title: 'Staff PDF',
      },
    ]

    render(<AiHelperPanel />)

    expect(chatProps).toBeTruthy()
    expect(chatProps.knowledgeEntries).toHaveLength(2)
    expect(chatProps.knowledgeEntries.map((entry) => entry.id)).toEqual([1, 2])

    fireEvent.click(screen.getByRole('button', { name: 'toggle-knowledge' }))

    expect(knowledgeProps).toBeTruthy()
    expect(knowledgeProps.knowledgeEntries).toHaveLength(2)
    expect(knowledgeProps.knowledgeEntries.map((entry) => entry.id)).toEqual([1, 2])
  })
})
