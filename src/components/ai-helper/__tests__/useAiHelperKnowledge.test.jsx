// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { KNOWLEDGE_READER_TAB_EXTRACTED } from '../constants'

const {
  fetchAiHelperKnowledgeDetail,
  fetchAiHelperKnowledgeFileBlob,
  fetchAiHelperKnowledgeFileText,
} = vi.hoisted(() => ({
  fetchAiHelperKnowledgeDetail: vi.fn(),
  fetchAiHelperKnowledgeFileBlob: vi.fn(),
  fetchAiHelperKnowledgeFileText: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  deleteAiHelperKnowledge: vi.fn(),
  fetchAiHelperKnowledge: vi.fn(() => Promise.resolve({ data: [] })),
  fetchAiHelperKnowledgeDetail,
  fetchAiHelperKnowledgeFileBlob,
  fetchAiHelperKnowledgeFileText,
  uploadAiHelperKnowledge: vi.fn(),
  uploadAiHelperMarkdownKnowledge: vi.fn(),
}))

import useAiHelperKnowledge from '../useAiHelperKnowledge'

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useAiHelperKnowledge', () => {
  beforeEach(() => {
    fetchAiHelperKnowledgeDetail.mockReset()
    fetchAiHelperKnowledgeFileBlob.mockReset()
    fetchAiHelperKnowledgeFileText.mockReset()
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/knowledge-preview')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('ignores stale detail responses after the reader is closed', async () => {
    const detailRequest = deferred()
    fetchAiHelperKnowledgeDetail.mockReturnValue(detailRequest.promise)

    const { result } = renderHook(() =>
      useAiHelperKnowledge({
        authUser: { id: 7 },
        currentPageContext: { path: '/inspection' },
        isSysAdmin: false,
        refreshCurrentContext: vi.fn(),
        routeContext: { path: '/inspection' },
        visibleKnowledgeModules: [],
      }),
    )

    await act(async () => {
      void result.current.openKnowledgeReader(10)
    })

    expect(result.current.knowledgeReaderOpen).toBe(true)
    expect(result.current.knowledgeReaderLoading).toBe(true)

    act(() => {
      result.current.closeKnowledgeReader()
    })

    await act(async () => {
      detailRequest.resolve({
        data: {
          id: 10,
          title: 'Late knowledge',
          source_mime: 'application/pdf',
          original_available: true,
        },
      })
      await detailRequest.promise
    })

    await waitFor(() => {
      expect(result.current.knowledgeReaderOpen).toBe(false)
      expect(result.current.selectedKnowledgeDetail).toBe(null)
      expect(result.current.knowledgeReaderLoading).toBe(false)
    })
  })

  it('loads PDF knowledge into a blob URL for inline preview', async () => {
    fetchAiHelperKnowledgeDetail.mockResolvedValue({
      data: {
        id: 11,
        title: 'Guide',
        source_mime: 'application/pdf',
        original_available: true,
      },
    })
    fetchAiHelperKnowledgeFileBlob.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))

    const { result } = renderHook(() =>
      useAiHelperKnowledge({
        authUser: { id: 7 },
        currentPageContext: { path: '/inspection' },
        isSysAdmin: false,
        refreshCurrentContext: vi.fn(),
        routeContext: { path: '/inspection' },
        visibleKnowledgeModules: [],
      }),
    )

    await act(async () => {
      await result.current.openKnowledgeReader(11)
    })

    await waitFor(() => {
      expect(result.current.knowledgeReaderPdfUrl).toBe('blob:http://localhost/knowledge-preview')
      expect(result.current.knowledgeReaderPdfLoading).toBe(false)
      expect(result.current.knowledgeReaderPdfError).toBe(null)
    })

    expect(fetchAiHelperKnowledgeFileBlob).toHaveBeenCalledWith(11)
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('defaults to extracted tab for seeded markdown without original source', async () => {
    fetchAiHelperKnowledgeDetail.mockResolvedValue({
      data: {
        id: 12,
        title: 'Seeded Markdown',
        source_mime: 'text/markdown',
        original_available: false,
        extracted_content_available: true,
      },
    })

    const { result } = renderHook(() =>
      useAiHelperKnowledge({
        authUser: { id: 7 },
        currentPageContext: { path: '/inspection' },
        isSysAdmin: false,
        refreshCurrentContext: vi.fn(),
        routeContext: { path: '/inspection' },
        visibleKnowledgeModules: [],
      }),
    )

    await act(async () => {
      await result.current.openKnowledgeReader(12)
    })

    await waitFor(() => {
      expect(result.current.knowledgeReaderTab).toBe(KNOWLEDGE_READER_TAB_EXTRACTED)
      expect(result.current.knowledgeReaderHasOriginal).toBe(false)
      expect(result.current.knowledgeReaderLoading).toBe(false)
    })

    expect(fetchAiHelperKnowledgeFileText).not.toHaveBeenCalled()
  })
})
