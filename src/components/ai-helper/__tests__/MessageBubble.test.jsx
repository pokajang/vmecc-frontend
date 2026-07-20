// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import MessageBubble from '../MessageBubble'

vi.mock('@coreui/react', async () => {
  const actual = await vi.importActual('@coreui/react')
  return {
    ...actual,
    CTooltip: ({ children }) => children,
  }
})

afterEach(() => {
  cleanup()
})

describe('MessageBubble', () => {
  const baseProps = {
    copied: false,
    onCopy: vi.fn(),
    onReport: vi.fn(),
    onRetry: vi.fn(),
    retryDisabled: false,
  }

  it('keeps repeated markdown step numbers in one ordered list with nested bullets', () => {
    const { container } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-1',
          role: 'assistant',
          status: 'completed',
          content: [
            '1. Kenal pasti skop kerja',
            '    - Contoh: demolition, partition, painting',
            '1. Senaraikan langkah kerja',
            '    - Kerja dibuat secara sistematik',
            '1. Nyatakan alat dan bahan',
            '    - Contoh: hand tools',
          ].join('\n'),
        }}
      />,
    )

    const orderedLists = container.querySelectorAll('ol')
    expect(orderedLists).toHaveLength(1)
    expect(Array.from(orderedLists[0].children)).toHaveLength(3)
    expect(Array.from(orderedLists[0].querySelectorAll(':scope > li > ul'))).toHaveLength(3)
  })

  it('preserves the starting number for explicit ordered steps', () => {
    const { container } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-2',
          role: 'assistant',
          status: 'completed',
          content: ['3. Third step', '    - Detail item', '4. Fourth step'].join('\n'),
        }}
      />,
    )

    const orderedList = container.querySelector('ol')
    expect(orderedList).toBeTruthy()
    expect(orderedList.getAttribute('start')).toBe('3')
    expect(Array.from(orderedList.children)).toHaveLength(2)
  })

  it('preserves mixed three-level nested lists', () => {
    const { container } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-nested',
          role: 'assistant',
          status: 'completed',
          content: [
            '- First level',
            '    1. Second level',
            '        - Third level',
            '- Another first-level item',
          ].join('\n'),
        }}
      />,
    )

    expect(container.querySelectorAll('ul > li')).toHaveLength(3)
    expect(container.querySelector('ul > li > ol > li > ul > li')).toBeTruthy()
  })

  it('does not render raw assistant HTML', () => {
    const { container } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-html',
          role: 'assistant',
          status: 'completed',
          content: '<script>window.compromised = true</script>\n\nSafe text',
        }}
      />,
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('Safe text')
  })

  it('renders retrieved-source markers as compact non-link citations', () => {
    const { container, getByLabelText } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-citations',
          role: 'assistant',
          status: 'completed',
          content: 'Open Overtime. [S1] Then review the request. [S2]',
        }}
      />,
    )

    expect(getByLabelText('Retrieved source S1').textContent).toBe('S1')
    expect(getByLabelText('Retrieved source S2').textContent).toBe('S2')
    expect(container.querySelectorAll('.ai-helper-message__citation')).toHaveLength(2)
    expect(container.querySelector('a')).toBeNull()
  })

  it('shows verifier progress without adding it to the final answer content', () => {
    const { getByText } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-verifying',
          role: 'assistant',
          status: 'streaming',
          content: '',
          pipeline_status: 'Checking the answer against its sources...',
        }}
      />,
    )

    expect(getByText('Checking the answer against its sources...')).toBeTruthy()
  })

  it('renders direct, page-aware links for server-provided sources', () => {
    const { getByRole } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-3',
          role: 'assistant',
          status: 'completed',
          content: 'Refer to the procedure.',
          sources: [
            {
              document_id: 79,
              title: 'Emergency Response Plan',
              page_start: 12,
              page_end: 13,
            },
          ],
        }}
      />,
    )

    const link = getByRole('link', { name: 'Open source Emergency Response Plan - pages 12-13' })
    expect(link.getAttribute('href')).toBe(
      'http://localhost:8000/api/ai-helper/documents/79/file#page=12',
    )
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('renders system-guide citations as non-clickable internal guidance', () => {
    const { getByLabelText, queryByRole } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-guide',
          role: 'assistant',
          status: 'completed',
          content: 'Open the Leave page.',
          sources: [
            {
              source_id: 'S2',
              source_type: 'system_guide',
              document_id: null,
              title: 'Applying for Leave',
              guide_version: 3,
              display_label: 'VMECC System Guide',
              source_path: 'seed:system-guide:leave-self-service',
            },
          ],
        }}
      />,
    )

    const guide = getByLabelText('Internal application guidance: Applying for Leave')
    expect(guide.textContent).toContain('S2 — VMECC System Guide: Applying for Leave (v3)')
    expect(guide.textContent).not.toContain('seed:system-guide')
    expect(queryByRole('link')).toBeNull()
  })

  it('renders mixed PDF and system-guide sources independently', () => {
    const { getAllByRole, getByLabelText } = render(
      <MessageBubble
        {...baseProps}
        message={{
          id: 'assistant-mixed',
          role: 'assistant',
          status: 'completed',
          content: 'Mixed answer.',
          sources: [
            {
              source_id: 'S1',
              source_type: 'reference_document',
              document_id: 9,
              title: 'ERP',
              page_start: 2,
            },
            {
              source_id: 'S2',
              source_type: 'system_guide',
              document_id: null,
              title: 'Dashboard Basics',
              guide_version: 3,
            },
          ],
        }}
      />,
    )

    expect(getAllByRole('link')).toHaveLength(1)
    expect(getByLabelText('Internal application guidance: Dashboard Basics')).toBeTruthy()
  })
})
