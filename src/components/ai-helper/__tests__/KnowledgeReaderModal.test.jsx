// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import KnowledgeReaderModal from '../KnowledgeReaderModal'

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
    render(<KnowledgeReaderModal loading open onClose={vi.fn()} />)

    expect(screen.getByText('Loading document...')).toBeTruthy()
  })

  it('renders metadata and an external PDF action without an inline preview', () => {
    render(<KnowledgeReaderModal detail={detail} loading={false} open onClose={vi.fn()} />)

    const openPdf = screen.getByRole('link', { name: 'Open PDF in new tab' })
    expect(openPdf.getAttribute('target')).toBe('_blank')
    expect(openPdf.getAttribute('rel')).toBe('noopener noreferrer')
    expect(screen.getByText('emergency-plan.pdf')).toBeTruthy()
    expect(document.querySelector('iframe')).toBeNull()
  })

  it('states that the PDF is not ingested by Ask AI', () => {
    render(<KnowledgeReaderModal detail={detail} loading={false} open onClose={vi.fn()} />)

    expect(screen.getByText(/not ingested by Ask AI/i)).toBeTruthy()
  })
})
