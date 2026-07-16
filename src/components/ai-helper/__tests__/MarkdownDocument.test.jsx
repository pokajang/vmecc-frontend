// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'

import MarkdownDocument from '../MarkdownDocument'

afterEach(() => {
  cleanup()
})

describe('MarkdownDocument', () => {
  it('renders headings, nested lists, emphasis, blockquotes, and code semantically', () => {
    render(
      <MarkdownDocument
        source={`# Emergency guide

**Important** response steps:

- Notify the IC
  - Record the time

> Keep communication concise.

Use \`999\` for an emergency.`}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Emergency guide' })).toBeTruthy()
    expect(screen.getByText('Important').tagName).toBe('STRONG')
    expect(screen.getAllByRole('list')).toHaveLength(2)
    expect(screen.getByText('Keep communication concise.').closest('blockquote')).toBeTruthy()
    expect(screen.getByText('999').tagName).toBe('CODE')
  })

  it('renders GFM tables inside a labelled scroll region', () => {
    render(
      <MarkdownDocument
        source={`| Term | Definition |
| --- | --- |
| AED | Automated External Defibrillator |`}
      />,
    )

    const tableRegion = screen.getByRole('region', { name: 'Scrollable table' })
    const table = within(tableRegion).getByRole('table')

    expect(within(table).getByRole('columnheader', { name: 'Term' })).toBeTruthy()
    expect(within(table).getByRole('columnheader', { name: 'Definition' })).toBeTruthy()
    expect(within(table).getByRole('cell', { name: 'AED' })).toBeTruthy()
    expect(tableRegion.getAttribute('tabindex')).toBe('0')
  })

  it('does not render raw HTML or remote images', () => {
    const { container } = render(
      <MarkdownDocument
        source={`<script>window.compromised = true</script>

![Remote diagram](https://example.com/diagram.png)`}
      />,
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Image: Remote diagram')).toBeTruthy()
  })

  it('keeps safe external links isolated and rejects unsafe protocols', () => {
    render(
      <MarkdownDocument
        source={`[Safety portal](https://example.com/safety)

[Unsafe](javascript:alert('x'))`}
      />,
    )

    const safeLink = screen.getByRole('link', { name: 'Safety portal' })
    const unsafeLink = screen.getByText('Unsafe').closest('a')

    expect(safeLink.getAttribute('target')).toBe('_blank')
    expect(safeLink.getAttribute('rel')).toBe('noopener noreferrer')
    expect(unsafeLink).toBeNull()
  })
})
