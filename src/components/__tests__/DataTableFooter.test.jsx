// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import DataTableFooter from '../DataTableFooter'

afterEach(cleanup)

describe('DataTableFooter', () => {
  it('keeps the explicitly selected numeric page size when All is also available', () => {
    render(<DataTableFooter rowsToShow={5} filteredCount={1} totalCount={1} compactMobile />)

    expect(screen.getByRole('combobox').value).toBe('5')
  })

  it('keeps a numeric remote page size selected when the current result is smaller', () => {
    render(
      <DataTableFooter
        rowsToShow={25}
        filteredCount={1}
        totalCount={1}
        visibleCount={1}
        options={[{ value: 25, label: '25' }]}
      />,
    )

    expect(screen.getByLabelText('Rows per page').value).toBe('25')
  })

  it('omits the page-size control when the consuming view uses a fixed server page size', () => {
    render(
      <DataTableFooter
        rowsToShow={25}
        filteredCount={50}
        totalCount={50}
        visibleCount={25}
        showRowsPerPage={false}
        currentPage={1}
        lastPage={2}
        onPageChange={() => {}}
      />,
    )

    expect(screen.queryByLabelText('Rows per page')).toBeNull()
    expect(screen.getByText('Showing 25 of 50')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Table pagination' })).toBeTruthy()
  })
})
