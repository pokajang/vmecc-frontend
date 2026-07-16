// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import KnowledgeReaderModal from '../KnowledgeReaderModal'
import { KNOWLEDGE_READER_TAB_METADATA, KNOWLEDGE_READER_TAB_ORIGINAL } from '../constants'

afterEach(cleanup)

const detail = {
  id: 3,
  title: 'Emergency plan',
  source_filename: 'emergency-plan.pdf',
  source_size: 4096,
  visibility: 'shared',
  uploader_name: 'System',
  created_at: '2026-06-24T00:00:00Z',
  original_available: true,
}

describe('KnowledgeReaderModal', () => {
  it('renders the document loading state', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_ORIGINAL}
        loading
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Loading document...')).toBeTruthy()
  })

  it('renders only the original PDF and metadata tabs', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_ORIGINAL}
        detail={detail}
        loading={false}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByTitle('Emergency plan').getAttribute('src')).toBe(
      'blob:http://localhost/pdf-preview',
    )
    expect(screen.getByRole('tab', { name: 'Original PDF' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Metadata' })).toBeTruthy()
    expect(screen.queryByText('Extracted text')).toBeNull()
    expect(screen.queryByText('Rendered')).toBeNull()
  })

  it('states that the PDF is not ingested by Ask AI', () => {
    const onTabChange = vi.fn()
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_METADATA}
        detail={detail}
        loading={false}
        open
        onClose={vi.fn()}
        onTabChange={onTabChange}
      />,
    )

    expect(screen.getByText(/not ingested by Ask AI/i)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: 'Original PDF' }))
    expect(onTabChange).toHaveBeenCalledWith(KNOWLEDGE_READER_TAB_ORIGINAL)
  })
})
