// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import KnowledgeReaderModal from '../KnowledgeReaderModal'
import {
  KNOWLEDGE_READER_TAB_EXTRACTED,
  KNOWLEDGE_READER_TAB_METADATA,
  KNOWLEDGE_READER_TAB_ORIGINAL,
} from '../constants'

afterEach(() => {
  cleanup()
})

describe('KnowledgeReaderModal', () => {
  const baseDetail = {
    id: 3,
    title: 'Guide',
    source_filename: 'guide.pdf',
    source_mime: 'application/pdf',
    source_size: 4096,
    visibility: 'shared',
    review_status: 'approved',
    status: 'active',
    active: true,
    uploader_name: 'System',
    scope_type: 'global',
    created_at: '2026-06-24T00:00:00Z',
    original_available: true,
    extracted_content_available: true,
    extracted_content: 'Full extracted content',
    processing_warnings: [],
    review_note: '',
    summary: 'Summary text',
  }

  it('renders the original PDF iframe and new tab link', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_ORIGINAL}
        detail={baseDetail}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        markdownError={null}
        markdownLoading={false}
        markdownSource=""
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByTitle('Guide').getAttribute('src')).toBe('blob:http://localhost/pdf-preview')
    expect(screen.getByRole('link', { name: /open in new tab/i }).getAttribute('href')).toBe(
      'http://localhost:8000/api/ai-helper/knowledge/3/file',
    )
  })

  it('renders raw markdown source in the original tab', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_ORIGINAL}
        detail={{
          ...baseDetail,
          source_filename: 'guide.md',
          source_mime: 'text/markdown',
        }}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl=""
        markdownError={null}
        markdownLoading={false}
        markdownSource={'---\ntitle: Guide\n---\n\n# Heading'}
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Original Markdown source').textContent).toContain('title: Guide')
    expect(screen.getByLabelText('Original Markdown source').textContent).toContain('# Heading')
  })

  it('renders extracted markdown headings as heading elements', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={{
          ...baseDetail,
          source_mime: 'text/markdown',
          extracted_content: '# Heading One\n\nBody paragraph line one.\nLine two.',
          extracted_content_available: true,
          original_available: false,
        }}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl=""
        markdownError={null}
        markdownLoading={false}
        markdownSource=""
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Heading One' })).toBeTruthy()
    expect(screen.getByText('Body paragraph line one.')).toBeTruthy()
    expect(screen.getByText('Line two.')).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 2, name: 'Body paragraph line one.' })).toBeNull()
  })

  it('hides the Original tab for knowledge entries without original source', () => {
    const detail = {
      ...baseDetail,
      source_mime: 'text/markdown',
      original_available: false,
      extracted_content_available: true,
      extracted_content: 'Extracted content',
    }

    const { rerender } = render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={detail}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        markdownError={null}
        markdownLoading={false}
        markdownSource="seed source"
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: /original/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /open in new tab/i })).toBeNull()
    expect(screen.getByText('Extracted content')).toBeTruthy()

    rerender(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_METADATA}
        detail={detail}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        markdownError={null}
        markdownLoading={false}
        markdownSource="seed source"
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Shared guidance')).toBeTruthy()
    expect(screen.queryByText('Unknown size')).toBeNull()
  })

  it('renders metadata for non-markdown entries without original source', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_METADATA}
        detail={{
          ...baseDetail,
          original_available: false,
          extracted_content_available: false,
          extracted_content: '',
        }}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl=""
        markdownError={null}
        markdownLoading={false}
        markdownSource=""
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Shared guidance')).toBeTruthy()
    expect(screen.getByText('Summary text')).toBeTruthy()
  })

  it('renders extracted text and metadata tabs', () => {
    const { rerender } = render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={baseDetail}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        markdownError={null}
        markdownLoading={false}
        markdownSource=""
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Full extracted content')).toBeTruthy()

    rerender(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_METADATA}
        detail={baseDetail}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        markdownError={null}
        markdownLoading={false}
        markdownSource=""
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Shared guidance')).toBeTruthy()
    expect(screen.getByText('Summary text')).toBeTruthy()
  })

  it('shows processing and failed extracted states', () => {
    const { rerender } = render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={{
          ...baseDetail,
          status: 'processing',
          extracted_content_available: false,
          extracted_content: '',
        }}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        markdownError={null}
        markdownLoading={false}
        markdownSource=""
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByText(/still processing/i)).toBeTruthy()

    rerender(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={{
          ...baseDetail,
          status: 'failed',
          extracted_content_available: false,
          extracted_content: '',
          error: 'Could not process this knowledge source.',
          processing_warnings: ['This PDF contains images.'],
        }}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl="blob:http://localhost/pdf-preview"
        markdownError={null}
        markdownLoading={false}
        markdownSource=""
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Could not process this knowledge source.')).toBeTruthy()
    expect(screen.getByText('This PDF contains images.')).toBeTruthy()
  })
})
