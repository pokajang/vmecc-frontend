import React from 'react'
import { CTableHeaderCell } from '@coreui/react'

const SortableTableHeader = ({ field, sort = {}, onSort, children, className = '' }) => {
  const isActive = sort.field === field
  const ariaSort = isActive ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <CTableHeaderCell className={className} aria-sort={ariaSort}>
      <button
        type="button"
        className="btn btn-link btn-sm p-0 text-body fw-semibold text-decoration-none"
        onClick={() => onSort?.(field)}
      >
        {children}
      </button>
    </CTableHeaderCell>
  )
}

export default SortableTableHeader
