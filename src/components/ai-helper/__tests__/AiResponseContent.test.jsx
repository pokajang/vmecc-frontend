// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

import AiResponseContent from '../AiResponseContent'

afterEach(() => {
  cleanup()
})

describe('AiResponseContent', () => {
  it('normalizes every markdown heading to the compact response heading style', () => {
    const { container } = render(
      <AiResponseContent content={'# Main heading\n\n## Subheading\n\n###### Small heading'} />,
    )

    const headings = screen.getAllByRole('heading')
    expect(headings).toHaveLength(3)
    expect(
      headings.every((heading) => heading.classList.contains('ai-helper-message__section-heading')),
    ).toBe(true)
  })

  it('renders singular and grouped source markers as compact, non-link citations', () => {
    const { container } = render(
      <AiResponseContent content={'Follow this step [S1], then compare both sources [S2, S3].'} />,
    )

    expect(screen.getByLabelText('Retrieved source S1').textContent).toBe('S1')
    expect(screen.getByLabelText('Retrieved sources S2 and S3').textContent).toBe('S2, S3')
    expect(container.querySelectorAll('.ai-helper-message__citation')).toHaveLength(2)
    expect(container.querySelector('a')).toBeNull()
  })

  it('does not convert citation-like text inside inline or fenced code', () => {
    const { container } = render(
      <AiResponseContent
        content={'Use `[S1]` literally.\n\n```text\n[S2]\n```\n\nActual source [S3].'}
      />,
    )

    expect(container.querySelectorAll('.ai-helper-message__citation')).toHaveLength(1)
    expect(screen.getByLabelText('Retrieved source S3')).toBeTruthy()
    expect(container.querySelector('code')?.textContent).toBe('[S1]')
    expect(container.querySelector('pre')?.textContent).toContain('[S2]')
  })

  it('leaves unbounded citation-like content as ordinary wrapping text', () => {
    const excessiveGroup = `[${Array.from({ length: 13 }, (_, index) => `S${index + 1}`).join(', ')}]`
    const oversizedId = '[S12345]'
    const { container } = render(
      <AiResponseContent content={`Keep ${excessiveGroup} and ${oversizedId} as text.`} />,
    )

    expect(container.querySelector('.ai-helper-message__citation')).toBeNull()
    expect(container.textContent).toContain(excessiveGroup)
    expect(container.textContent).toContain(oversizedId)
  })

  it('allows only supported external links and adds safe new-tab behavior', () => {
    render(
      <AiResponseContent
        content={[
          '[Secure site](https://example.com/path)',
          '[Email support](mailto:support@example.com)',
          '[Unsafe site](javascript:alert(1))',
          '[Local path](/admin/users)',
        ].join('  \n')}
      />,
    )

    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0].getAttribute('href')).toBe('https://example.com/path')
    expect(links[0].getAttribute('target')).toBe('_blank')
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer')
    expect(links[1].getAttribute('href')).toBe('mailto:support@example.com')
    expect(screen.getByText('Unsafe site').className).toBe('ai-helper-message__unsafe-link')
    expect(screen.getByText('Local path').className).toBe('ai-helper-message__unsafe-link')
  })

  it('suppresses raw HTML and remote images', () => {
    const { container } = render(
      <AiResponseContent
        content={
          '<script>window.compromised = true</script>\n\n![Remote](https://example.com/a.png)\n\nSafe text'
        }
      />,
    )

    expect(container.querySelector('script, img')).toBeNull()
    expect(screen.getByRole('note').textContent).toBe('Image omitted from AI response: Remote')
    expect(screen.getByText('Safe text')).toBeTruthy()
  })

  it('wraps wide tables and code blocks in keyboard-scrollable regions', () => {
    render(
      <AiResponseContent
        content={[
          '| Field | Value |',
          '| --- | --- |',
          '| Document title | Emergency Response Plan |',
          '',
          '```text',
          'A long code or log line',
          '```',
        ].join('\n')}
      />,
    )

    const tableRegion = screen.getByRole('region', { name: 'Scrollable table in Ask AI response' })
    const codeRegion = screen.getByRole('region', { name: 'Code block in Ask AI response' })
    expect(tableRegion.getAttribute('tabindex')).toBe('0')
    expect(tableRegion.querySelector('table')).toBeTruthy()
    expect(codeRegion.getAttribute('tabindex')).toBe('0')
    expect(codeRegion.querySelector('pre')).toBeTruthy()
  })

  it('renders quotes, dividers, task lists, and empty content without leaking layout', () => {
    const { container, rerender } = render(
      <AiResponseContent content={'> Important note\n\n---\n\n- [x] Completed\n- [ ] Pending'} />,
    )

    expect(container.querySelector('.ai-helper-message__quote')).toBeTruthy()
    expect(container.querySelector('.ai-helper-message__divider')).toBeTruthy()
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(2)

    rerender(<AiResponseContent content={'   '} />)
    const emptyContent = container.querySelector('.ai-helper-message__content')
    expect(emptyContent).toBeTruthy()
    expect(emptyContent.getAttribute('dir')).toBe('auto')
    expect(emptyContent.childElementCount).toBe(0)
  })
})
