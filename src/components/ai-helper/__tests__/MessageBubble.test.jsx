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
})
