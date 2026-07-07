// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

import InspectionRecordsFilters from '../records/InspectionRecordsFilters'
import AllExtinguishersSection from '../records/AllExtinguishersSection'

let capturedTableFiltersProps = null

vi.mock('src/components/TableFilters', () => ({
  default: (props) => {
    capturedTableFiltersProps = props
    return <div data-testid="mock-table-filters" />
  },
}))

const getCapturedProps = () => capturedTableFiltersProps

afterEach(() => {
  cleanup()
  capturedTableFiltersProps = null
})

describe('Inspection shared desktop filter layout', () => {
  it('keeps records filters adaptive on desktop by avoiding explicit autoWidth=false', () => {
    render(
      <InspectionRecordsFilters
        search=""
        setSearch={vi.fn()}
        period="all"
        setPeriod={vi.fn()}
        sort="recent"
        setSort={vi.fn()}
        typeFilter="All"
        setTypeFilter={vi.fn()}
        typeOptions={[]}
        statusFilter="All"
        setStatusFilter={vi.fn()}
        statusOptions={[]}
        hasChecklistFilter="All"
        setHasChecklistFilter={vi.fn()}
        checklistFilter="All"
        setChecklistFilter={vi.fn()}
        checklistOptions={[]}
        sortOptions={[]}
        clearFilters={vi.fn()}
      />,
    )

    const props = getCapturedProps()
    expect(props).toBeTruthy()
    expect(props.autoWidth).not.toBe(false)
  })

  it('keeps all-extinguishers filters adaptive on desktop by avoiding explicit autoWidth=false', () => {
    render(<AllExtinguishersSection rows={[]} />)

    const props = getCapturedProps()
    expect(props).toBeTruthy()
    expect(props.autoWidth).not.toBe(false)
    expect(props.searchColMd).toBe(3)
    expect(props.periodColMd).toBe(2)
    expect(props.filterColMd).toBe(2)
  })
})
