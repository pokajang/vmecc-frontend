// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { legacy_createStore as createStore } from 'redux'

import AiHelperKnowledge from '../AiHelperKnowledge'

vi.mock('src/services/apiClient', () => ({
  buildAiHelperKnowledgeFileUrl: vi.fn(),
  deleteAiHelperKnowledgeReview: vi.fn(),
  fetchAiHelperDiagnostics: vi.fn(),
  fetchAiHelperKnowledgeReview: vi.fn(),
  fetchAiHelperKnowledgeReviewDetail: vi.fn(),
  updateAiHelperKnowledgeReview: vi.fn(),
}))

import {
  buildAiHelperKnowledgeFileUrl,
  deleteAiHelperKnowledgeReview,
  fetchAiHelperDiagnostics,
  fetchAiHelperKnowledgeReview,
  fetchAiHelperKnowledgeReviewDetail,
  updateAiHelperKnowledgeReview,
} from 'src/services/apiClient'

const authUser = {
  id: 1,
  name: 'System Admin',
  roles: ['System Administrator'],
  permissions: ['*'],
}

const listPayload = {
  data: [
    {
      id: 21,
      title: 'Operations overview',
      summary: 'How the operations pages are organized for the field teams.',
      source_filename: 'operations-overview.pdf',
      uploader_name: 'System',
      scope_type: 'module',
      module_key: 'teams',
      route_key: null,
      created_at: '2026-06-24T10:25:31Z',
      review_status: 'pending',
      visibility: 'shared',
      active: true,
      status: 'active',
    },
  ],
  meta: {
    counts: { pending: 1, approved: 0, rejected: 0, processing: 0, failed: 0, all: 1 },
  },
}

const detailPayload = {
  data: {
    ...listPayload.data[0],
    content_preview: 'Extracted overview content',
    chunks: [{ id: 301, chunk_index: 0, content: 'Chunk body' }],
    review_note: '',
    source_size: 4096,
  },
}

const diagnosticsPayload = {
  data: {
    enabled: true,
    configured: true,
    queue: { default_connection: 'sync' },
    storage: { used_bytes: 8192, max_total_bytes: 20000000000 },
    recent_failed_uploads: [],
  },
}

const renderPage = () => {
  const reducer = (state = { authUser }, action) =>
    action.type === 'set' ? { ...state, ...action } : state
  const store = createStore(reducer)

  render(
    <Provider store={store}>
      <MemoryRouter>
        <AiHelperKnowledge />
      </MemoryRouter>
    </Provider>,
  )
}

describe('AiHelperKnowledge action column', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    fetchAiHelperDiagnostics.mockResolvedValue(diagnosticsPayload)
    fetchAiHelperKnowledgeReview.mockResolvedValue(listPayload)
    fetchAiHelperKnowledgeReviewDetail.mockResolvedValue(detailPayload)
    updateAiHelperKnowledgeReview.mockResolvedValue({
      data: {
        ...detailPayload.data,
        review_status: 'approved',
        review_note: 'Ready to use',
      },
    })
    deleteAiHelperKnowledgeReview.mockResolvedValue({})
    buildAiHelperKnowledgeFileUrl.mockReturnValue('/api/ai-helper/knowledge/21/file')
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('opens review details from the kebab action menu and saves changes', async () => {
    renderPage()

    await waitFor(() =>
      expect(fetchAiHelperKnowledgeReview).toHaveBeenCalledWith({
        status: 'all',
        per_page: 50,
        page: 1,
      }),
    )

    const actionCell = await screen.findByTestId('ai-helper-knowledge-row-actions-21')
    fireEvent.click(within(actionCell).getByRole('button', { name: 'Row actions' }))
    fireEvent.click(await screen.findByText('Review details'))

    await waitFor(() => expect(fetchAiHelperKnowledgeReviewDetail).toHaveBeenCalledWith(21))
    expect(await screen.findByText('Review controls')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Review'), { target: { value: 'approved' } })
    fireEvent.change(screen.getByLabelText('Review note'), {
      target: { value: 'Ready to use' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(updateAiHelperKnowledgeReview).toHaveBeenCalledWith(21, {
        review_status: 'approved',
        review_note: 'Ready to use',
        status: 'active',
      }),
    )
  })

  it('opens the original file from the kebab action menu', async () => {
    renderPage()

    const actionCell = await screen.findByTestId('ai-helper-knowledge-row-actions-21')
    fireEvent.click(within(actionCell).getByRole('button', { name: 'Row actions' }))
    fireEvent.click(await screen.findByText('Open original'))

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        '/api/ai-helper/knowledge/21/file',
        '_blank',
        'noopener,noreferrer',
      ),
    )
  })

  it('deletes a record from the kebab action menu after confirmation', async () => {
    fetchAiHelperKnowledgeReview.mockResolvedValueOnce(listPayload).mockResolvedValueOnce({
      data: [],
      meta: {
        counts: { pending: 0, approved: 0, rejected: 0, processing: 0, failed: 0, all: 0 },
      },
    })

    renderPage()

    const actionCell = await screen.findByTestId('ai-helper-knowledge-row-actions-21')
    fireEvent.click(within(actionCell).getByRole('button', { name: 'Row actions' }))
    fireEvent.click(await screen.findByText('Delete'))

    expect(await screen.findByText('Delete Knowledge')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleteAiHelperKnowledgeReview).toHaveBeenCalledWith(21))
    await waitFor(() =>
      expect(screen.queryByTestId('ai-helper-knowledge-row-actions-21')).toBeNull(),
    )
  })
})
