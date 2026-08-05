// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ResponsiveRecordCollection from '../ResponsiveRecordCollection'

afterEach(() => {
  cleanup()
})

describe('ResponsiveRecordCollection contract', () => {
  it('gives loading precedence and forwards a caller-provided message', () => {
    render(
      <ResponsiveRecordCollection
        isLoading
        isEmpty
        loadingMessage="Loading holidays..."
        emptyMessage="No holidays found."
        mobileSections={[{ key: 'records', items: [{ key: 'REC-1', title: 'REC-1' }] }]}
        renderDesktop={<div>Desktop table</div>}
        footer={<div>Collection footer</div>}
      >
        <div>Collection controls</div>
      </ResponsiveRecordCollection>,
    )

    expect(screen.getByRole('status').textContent).toContain('Loading holidays...')
    expect(screen.queryByText('No holidays found.')).toBeNull()
    expect(screen.queryByText('REC-1')).toBeNull()
    expect(screen.queryByText('Desktop table')).toBeNull()
    expect(screen.queryByText('Collection footer')).toBeNull()
    expect(screen.queryByText('Collection controls')).toBeNull()
  })

  it('retains the standard table loading message when no override is supplied', () => {
    render(<ResponsiveRecordCollection isLoading />)

    expect(screen.getByRole('status').textContent).toContain('Loading')
  })

  it('renders string and element empty states without collection content', () => {
    const { rerender } = render(
      <ResponsiveRecordCollection
        isEmpty
        emptyMessage="No filtered records."
        mobileSections={[{ key: 'records', items: [{ key: 'REC-1', title: 'REC-1' }] }]}
        renderDesktop={<div>Desktop table</div>}
        footer={<div>Collection footer</div>}
      />,
    )

    const standardEmpty = screen.getByText('No filtered records.').parentElement
    expect(standardEmpty.style.minHeight).toBe('160px')
    expect(screen.queryByText('REC-1')).toBeNull()
    expect(screen.queryByText('Desktop table')).toBeNull()
    expect(screen.queryByText('Collection footer')).toBeNull()

    rerender(
      <ResponsiveRecordCollection
        isEmpty
        emptyMessage={<div data-testid="custom-empty">Clear filters to see records.</div>}
      />,
    )

    expect(screen.getByTestId('custom-empty')).toBeTruthy()
    expect(screen.queryByText('No filtered records.')).toBeNull()
  })

  it('preserves child, mobile, desktop, and footer order and forwards the mobile variant', () => {
    const renderDesktop = vi.fn(() => <div data-order="desktop">Desktop table</div>)
    const { container } = render(
      <ResponsiveRecordCollection
        mobileSections={[
          {
            key: 'records',
            items: [
              {
                key: 'REC-1',
                title: <span data-order="mobile">REC-1</span>,
              },
            ],
          },
        ]}
        mobileVariant="list-group"
        renderDesktop={renderDesktop}
        footer={<div data-order="footer">Collection footer</div>}
      >
        <div data-order="children">Collection controls</div>
      </ResponsiveRecordCollection>,
    )

    expect(
      Array.from(container.querySelectorAll('[data-order]')).map((node) => node.dataset.order),
    ).toEqual(['children', 'mobile', 'desktop', 'footer'])
    expect(document.querySelector('.list-group')).toBeTruthy()
    expect(renderDesktop).toHaveBeenCalledTimes(1)
  })

  it('allows long mobile list-group content to shrink within the collection width', () => {
    const { container } = render(
      <ResponsiveRecordCollection
        mobileSections={[
          {
            key: 'records',
            items: [
              {
                key: 'REC-1',
                title: 'An unusually long user-provided record title that must stay contained',
                status: 'Pending review by a long-named operational role',
              },
            ],
          },
        ]}
        mobileVariant="list-group"
      />,
    )

    const mobileSection = container.querySelector('.mobile-record-list__section')
    expect(mobileSection.style.minWidth).toBe('0px')
  })
})
