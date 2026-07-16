// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { KNOWLEDGE_READER_TAB_EXTRACTED, KNOWLEDGE_READER_TAB_ORIGINAL } from '../constants'

const {
  fetchAiHelperKnowledge,
  fetchAiHelperKnowledgeDetail,
  fetchAiHelperKnowledgeFileBlob,
  fetchAiHelperKnowledgeFileText,
  uploadAiHelperKnowledge,
  uploadAiHelperMarkdownKnowledge,
} = vi.hoisted(() => ({
  fetchAiHelperKnowledge: vi.fn(),
  fetchAiHelperKnowledgeDetail: vi.fn(),
  fetchAiHelperKnowledgeFileBlob: vi.fn(),
  fetchAiHelperKnowledgeFileText: vi.fn(),
  uploadAiHelperKnowledge: vi.fn(),
  uploadAiHelperMarkdownKnowledge: vi.fn(),
}))

vi.mock('src/services/apiClient', () => ({
  deleteAiHelperKnowledge: vi.fn(),
  fetchAiHelperKnowledge,
  fetchAiHelperKnowledgeDetail,
  fetchAiHelperKnowledgeFileBlob,
  fetchAiHelperKnowledgeFileText,
  uploadAiHelperKnowledge,
  uploadAiHelperMarkdownKnowledge,
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
    fetchAiHelperKnowledge.mockReset()
    fetchAiHelperKnowledge.mockResolvedValue({ data: [] })
    fetchAiHelperKnowledgeDetail.mockReset()
    fetchAiHelperKnowledgeFileBlob.mockReset()
    fetchAiHelperKnowledgeFileText.mockReset()
    uploadAiHelperKnowledge.mockReset()
    uploadAiHelperMarkdownKnowledge.mockReset()
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/knowledge-preview')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('turns a malformed knowledge list response into a visible load error', async () => {
    fetchAiHelperKnowledge.mockResolvedValue({ data: null })

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
      await result.current.loadKnowledge({ force: true })
    })

    expect(result.current.knowledgeEntries).toEqual([])
    expect(result.current.knowledgeError).toBe('Could not load knowledge sources.')
  })

  it('rejects a malformed knowledge detail without rendering it', async () => {
    fetchAiHelperKnowledgeDetail.mockResolvedValue({ data: [] })

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
      await result.current.openKnowledgeReader(10)
    })

    expect(result.current.selectedKnowledgeDetail).toBe(null)
    expect(result.current.knowledgeReaderError).toBe('Could not load this knowledge source.')
    expect(result.current.knowledgeReaderLoading).toBe(false)
  })

  it('keeps the selected file when an upload returns no knowledge entry', async () => {
    const refreshCurrentContext = vi.fn()
    const setNotice = vi.fn()
    uploadAiHelperKnowledge.mockResolvedValue({ data: null })

    const { result } = renderHook(() =>
      useAiHelperKnowledge({
        authUser: { id: 7 },
        currentPageContext: { path: '/inspection' },
        isSysAdmin: false,
        refreshCurrentContext,
        routeContext: { path: '/inspection' },
        visibleKnowledgeModules: [],
      }),
    )

    const file = new File(['pdf'], 'guide.pdf', { type: 'application/pdf' })
    act(() => {
      result.current.handleKnowledgeFileChange({ target: { files: [file] } })
      result.current.setKnowledgeAcknowledged(true)
    })

    await act(async () => {
      await result.current.uploadKnowledge(setNotice)
    })

    expect(result.current.knowledgeFile).toBe(file)
    expect(result.current.knowledgeError).toBe('Could not upload knowledge.')
    expect(setNotice).not.toHaveBeenCalled()
    expect(refreshCurrentContext).not.toHaveBeenCalled()
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
      expect(result.current.knowledgeReaderTab).toBe(KNOWLEDGE_READER_TAB_ORIGINAL)
    })

    expect(fetchAiHelperKnowledgeFileBlob).toHaveBeenCalledWith(11)
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1)
  })

  it('defaults uploaded Markdown to rendered content while retaining its source', async () => {
    fetchAiHelperKnowledgeDetail.mockResolvedValue({
      data: {
        id: 13,
        title: 'Uploaded Markdown',
        source_filename: 'guide.md',
        source_mime: 'text/plain',
        original_available: true,
        extracted_content_available: true,
      },
    })
    fetchAiHelperKnowledgeFileText.mockResolvedValue('---\ntitle: Guide\n---\n\n# Guide')

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
      await result.current.openKnowledgeReader(13)
    })

    await waitFor(() => {
      expect(result.current.knowledgeReaderTab).toBe(KNOWLEDGE_READER_TAB_EXTRACTED)
      expect(result.current.knowledgeReaderHasOriginal).toBe(true)
      expect(result.current.knowledgeReaderMarkdownSource).toContain('# Guide')
    })

    expect(fetchAiHelperKnowledgeFileText).toHaveBeenCalledWith(13)
    expect(fetchAiHelperKnowledgeFileBlob).not.toHaveBeenCalled()
  })

  it('keeps rendered Markdown available when its original source cannot be loaded', async () => {
    fetchAiHelperKnowledgeDetail.mockResolvedValue({
      data: {
        id: 14,
        title: 'Uploaded Markdown',
        source_filename: 'guide.md',
        source_mime: 'text/markdown',
        original_available: true,
        extracted_content_available: true,
        extracted_content: '# Available guide',
      },
    })
    fetchAiHelperKnowledgeFileText.mockRejectedValue(new Error('Source unavailable'))

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
      await result.current.openKnowledgeReader(14)
    })

    expect(result.current.knowledgeReaderTab).toBe(KNOWLEDGE_READER_TAB_EXTRACTED)
    expect(result.current.selectedKnowledgeDetail?.extracted_content).toBe('# Available guide')
    expect(result.current.knowledgeReaderMarkdownError).toBe(
      'Could not load the original Markdown file.',
    )
  })

  it('defaults PDFs without an original file to extracted text', async () => {
    fetchAiHelperKnowledgeDetail.mockResolvedValue({
      data: {
        id: 15,
        title: 'Extracted PDF',
        source_mime: 'application/pdf',
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
      await result.current.openKnowledgeReader(15)
    })

    expect(result.current.knowledgeReaderTab).toBe(KNOWLEDGE_READER_TAB_EXTRACTED)
    expect(fetchAiHelperKnowledgeFileBlob).not.toHaveBeenCalled()
    expect(fetchAiHelperKnowledgeFileText).not.toHaveBeenCalled()
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
