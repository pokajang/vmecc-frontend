// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import ReportingRecordsSectionShell from '../ReportingRecordsSectionShell'

afterEach(cleanup)

const renderShell = (overrides = {}) =>
  render(
    <ReportingRecordsSectionShell
      recordScope="mine"
      onRecordScopeChange={vi.fn()}
      compactPresentation
      scopeTestId="records-scope"
      recordsTestId="records-region"
      filtersTestId="records-filters"
      filters={
        <label htmlFor="records-search">
          Search
          <input id="records-search" />
        </label>
      }
      emptyMessage={<p>No records.</p>}
      mobileRecords={<p>Mobile records</p>}
      desktopRecords={<p>Desktop records</p>}
      footer={<p>Records footer</p>}
      {...overrides}
    />,
  )

describe('ReportingRecordsSectionShell', () => {
  it('applies one compact records presentation to mobile and desktop regions', () => {
    const { container } = renderShell()

    expect(container.querySelector('.inspection-mobile-section')).toBeTruthy()
    expect(container.querySelectorAll('.workflow-scope-segmented--text')).toHaveLength(2)
    expect(screen.getAllByTestId('records-filters')).toHaveLength(2)
    expect(screen.getAllByTestId('records-region')).toHaveLength(2)
  })

  it('forwards scope changes without owning module state', () => {
    const onRecordScopeChange = vi.fn()
    renderShell({ onRecordScopeChange })

    fireEvent.click(screen.getAllByRole('button', { name: 'All' })[0])

    expect(onRecordScopeChange).toHaveBeenCalledTimes(1)
    expect(onRecordScopeChange).toHaveBeenCalledWith('all')
  })

  it('keeps loading, empty, and populated states mutually exclusive', () => {
    const { rerender } = renderShell({ isLoading: true })

    expect(screen.getAllByText('Loading records...').length).toBeGreaterThan(0)
    expect(screen.queryByText('Mobile records')).toBeNull()
    expect(screen.queryByText('Records footer')).toBeNull()

    rerender(
      <ReportingRecordsSectionShell
        filters={<span>Filters</span>}
        isEmpty
        emptyMessage={<p>No records.</p>}
        mobileRecords={<p>Mobile records</p>}
        desktopRecords={<p>Desktop records</p>}
        footer={<p>Records footer</p>}
      />,
    )

    expect(screen.getAllByText('No records.')).toHaveLength(2)
    expect(screen.queryByText('Mobile records')).toBeNull()
    expect(screen.queryByText('Records footer')).toBeNull()
  })
})
