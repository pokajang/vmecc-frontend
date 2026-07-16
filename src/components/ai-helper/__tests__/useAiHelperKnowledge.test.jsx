// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  deleteAiHelperDocument: vi.fn(),
  fetchAiHelperDocumentDetail: vi.fn(),
  fetchAiHelperDocumentFileBlob: vi.fn(),
  fetchAiHelperDocuments: vi.fn(),
  uploadAiHelperDocument: vi.fn(),
}))

vi.mock('src/services/apiClient', () => api)

import useAiHelperKnowledge from '../useAiHelperKnowledge'

describe('useAiHelperKnowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.fetchAiHelperDocuments.mockResolvedValue({ data: [] })
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/document-preview')
    global.URL.revokeObjectURL = vi.fn()
  })

  it('loads the reference document library', async () => {
    api.fetchAiHelperDocuments.mockResolvedValue({ data: [{ id: 4, title: 'Plan' }] })
    const { result } = renderHook(() => useAiHelperKnowledge({ authUser: { id: 7 } }))

    await act(async () => result.current.loadKnowledge())

    expect(result.current.knowledgeEntries).toEqual([{ id: 4, title: 'Plan' }])
  })

  it('turns a malformed document response into a visible error', async () => {
    api.fetchAiHelperDocuments.mockResolvedValue({ data: null })
    const { result } = renderHook(() => useAiHelperKnowledge({ authUser: { id: 7 } }))

    await act(async () => result.current.loadKnowledge())

    expect(result.current.knowledgeError).toBe('Could not load knowledge sources.')
  })

  it('uploads only document fields and no AI scope fields', async () => {
    api.uploadAiHelperDocument.mockResolvedValue({
      message: 'Uploaded',
      data: { id: 8, title: 'Reference plan' },
    })
    const notice = vi.fn()
    const { result } = renderHook(() => useAiHelperKnowledge({ authUser: { id: 7 } }))

    act(() => {
      result.current.handleKnowledgeFileChange({
        target: {
          files: [new File(['%PDF-1.4'], 'reference-plan.pdf', { type: 'application/pdf' })],
        },
      })
      result.current.setKnowledgeAcknowledged(true)
      result.current.setKnowledgeVisibility('shared')
    })
    await act(async () => result.current.uploadKnowledge(notice))

    const formData = api.uploadAiHelperDocument.mock.calls[0][0]
    expect(formData.get('file').name).toBe('reference-plan.pdf')
    expect(formData.get('visibility')).toBe('shared')
    expect(formData.get('scope_type')).toBeNull()
    expect(formData.get('module_key')).toBeNull()
    expect(result.current.knowledgeEntries[0].id).toBe(8)
  })

  it('opens the original PDF without requesting Markdown or extracted text', async () => {
    api.fetchAiHelperDocumentDetail.mockResolvedValue({
      data: { id: 11, title: 'Plan', source_mime: 'application/pdf', original_available: true },
    })
    api.fetchAiHelperDocumentFileBlob.mockResolvedValue(
      new Blob(['%PDF-1.4'], { type: 'application/pdf' }),
    )
    const { result } = renderHook(() => useAiHelperKnowledge({ authUser: { id: 7 } }))

    await act(async () => result.current.openKnowledgeReader(11))
    await waitFor(() => expect(result.current.knowledgeReaderPdfUrl).toBeTruthy())

    expect(api.fetchAiHelperDocumentDetail).toHaveBeenCalledWith(11)
    expect(api.fetchAiHelperDocumentFileBlob).toHaveBeenCalledWith(11)
  })
})
