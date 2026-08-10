// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import ResponsiveKeyValueList from '../ResponsiveKeyValueList'

afterEach(cleanup)

describe('ResponsiveKeyValueList', () => {
  it('preserves ordered definition-list semantics, zero, null fallback, and long values', () => {
    render(
      <ResponsiveKeyValueList
        className="pilot-list"
        compact
        items={[
          { key: 'zero', label: 'Days', value: 0 },
          { key: 'missing', label: 'Coverage By', value: null },
          {
            key: 'long',
            label: 'Roster Impact',
            value: 'SHIFT-WITH-AN-EXCEPTIONALLY-LONG-UNBROKEN-OPERATIONAL-VALUE-1234567890',
          },
        ]}
      />,
    )

    const list = document.querySelector('dl.responsive-key-value-list')
    expect(list.className).toContain('responsive-key-value-list--compact')
    expect(list.className).toContain('pilot-list')
    expect([...list.querySelectorAll('dt')].map((node) => node.textContent)).toEqual([
      'Days',
      'Coverage By',
      'Roster Impact',
    ])
    expect(screen.getByText('0').tagName).toBe('DD')
    expect(screen.getByText('-').tagName).toBe('DD')
    expect(screen.getByText(/SHIFT-WITH/).className).toContain('text-break')
  })

  it('keeps embedded actions inside the value definition', () => {
    render(
      <ResponsiveKeyValueList
        items={[
          {
            key: 'evidence',
            label: 'Evidence',
            value: <a href="/evidence/1">Open evidence</a>,
          },
        ]}
      />,
    )

    const link = screen.getByRole('link', { name: 'Open evidence' })
    expect(link.closest('dd')).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/evidence/1')
  })
})
