// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

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

  it('renders the loading state before knowledge details are available', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={null}
        error={null}
        loading
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

    expect(screen.getByText('Loading knowledge...')).toBeTruthy()
  })

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
    expect(screen.getByRole('tab', { name: 'Original PDF' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Extracted text' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /open pdf in new tab/i }).getAttribute('href')).toBe(
      'http://localhost:8000/api/ai-helper/knowledge/3/file',
    )
  })

  it('preserves PDF extraction line breaks in a normal-sized text block', () => {
    const extractedContent =
      '# ANNEX 1: Terminologies and Definitions\n\n## 999\n\n999 is an official emergency number.\n\n- First point\n- Second point'

    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={{ ...baseDetail, extracted_content: extractedContent }}
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

    const extractedText = screen.getByLabelText('Extracted PDF text')
    expect(extractedText.tagName).toBe('PRE')
    expect(extractedText.classList.contains('ai-helper-knowledge-reader__extracted-text')).toBe(
      true,
    )
    expect(extractedText.textContent).toBe(extractedContent)
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

    expect(screen.getByRole('tab', { name: 'Rendered' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Source' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /open source in new tab/i })).toBeTruthy()
    expect(screen.getByLabelText('Markdown source').textContent).toContain('title: Guide')
    expect(screen.getByLabelText('Markdown source').textContent).toContain('# Heading')
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
    expect(
      screen.getByText(
        (_, element) =>
          element.tagName === 'P' && element.textContent === 'Body paragraph line one.\nLine two.',
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { level: 2, name: 'Body paragraph line one.' })).toBeNull()
  })

  it('renders extracted GFM tables and keeps frontmatter out of the rendered body', () => {
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
        detail={{
          ...baseDetail,
          source_filename: 'guide.md',
          source_mime: 'text/markdown',
          extracted_content:
            '# Guide\n\n| Term | Definition |\n| --- | --- |\n| AED | Defibrillator |',
          original_available: true,
        }}
        error={null}
        loading={false}
        pdfError={null}
        pdfLoading={false}
        pdfUrl=""
        markdownError={null}
        markdownLoading={false}
        markdownSource={'---\ntitle: Guide\n---\n\n# Guide'}
        open
        onClose={vi.fn()}
        onTabChange={vi.fn()}
      />,
    )

    const renderedPanel = screen.getByRole('tabpanel')
    expect(within(renderedPanel).getByRole('table')).toBeTruthy()
    expect(within(renderedPanel).queryByText('title: Guide')).toBeNull()
  })

  it('supports arrow, Home, and End keyboard navigation across Markdown tabs', () => {
    const onTabChange = vi.fn()
    render(
      <KnowledgeReaderModal
        activeTab={KNOWLEDGE_READER_TAB_EXTRACTED}
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
        markdownSource="# Guide"
        open
        onClose={vi.fn()}
        onTabChange={onTabChange}
      />,
    )

    const renderedTab = screen.getByRole('tab', { name: 'Rendered' })
    const sourceTab = screen.getByRole('tab', { name: 'Source' })
    const metadataTab = screen.getByRole('tab', { name: 'Metadata' })

    fireEvent.keyDown(renderedTab, { key: 'ArrowRight' })
    expect(onTabChange).toHaveBeenLastCalledWith(KNOWLEDGE_READER_TAB_ORIGINAL)
    expect(document.activeElement).toBe(sourceTab)

    fireEvent.keyDown(sourceTab, { key: 'End' })
    expect(onTabChange).toHaveBeenLastCalledWith(KNOWLEDGE_READER_TAB_METADATA)
    expect(document.activeElement).toBe(metadataTab)

    fireEvent.keyDown(metadataTab, { key: 'Home' })
    expect(onTabChange).toHaveBeenLastCalledWith(KNOWLEDGE_READER_TAB_EXTRACTED)
    expect(document.activeElement).toBe(renderedTab)
    const renderedPanel = screen.getByRole('tabpanel')
    expect(renderedTab.getAttribute('aria-controls')).toBe(renderedPanel.id)
    expect(renderedPanel.getAttribute('aria-labelledby')).toBe(renderedTab.id)
    for (const tab of [renderedTab, sourceTab, metadataTab]) {
      expect(document.getElementById(tab.getAttribute('aria-controls'))).toBeTruthy()
    }
  })

  it('hides the Source tab for Markdown entries without an original source', () => {
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

    expect(screen.queryByRole('tab', { name: 'Source' })).toBeNull()
    expect(screen.queryByRole('link', { name: /open source in new tab/i })).toBeNull()
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
