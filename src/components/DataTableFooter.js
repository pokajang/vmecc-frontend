import React from 'react'
import { CFormSelect } from '@coreui/react'

const ALL_ROWS_VALUE = 'all'

const DEFAULT_OPTIONS = [
  { value: 5, label: '5' },
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: ALL_ROWS_VALUE, label: 'All' },
]

const DataTableFooter = ({
  rowsToShow = 5,
  onRowsToShowChange = () => {},
  filteredCount = 0,
  totalCount = 0,
  visibleCount: visibleCountOverride = null,
  options = DEFAULT_OPTIONS,
  showFilteredFrom = true,
  currentPage = 1,
  lastPage = 1,
  onPageChange = null,
  className = '',
}) => {
  if (!filteredCount) return null

  const isShowingAll = rowsToShow === ALL_ROWS_VALUE || rowsToShow >= filteredCount
  const visibleCount =
    visibleCountOverride === null
      ? isShowingAll
        ? filteredCount
        : rowsToShow
      : visibleCountOverride
  const showFiltered = showFilteredFrom && totalCount > 0 && totalCount !== filteredCount
  const showPagination = typeof onPageChange === 'function' && lastPage > 1

  return (
    <div
      className={`d-flex flex-wrap justify-content-end align-items-center gap-2 text-muted small mt-2 ${className}`.trim()}
    >
      <span>Show</span>
      <CFormSelect
        size="sm"
        value={
          rowsToShow === ALL_ROWS_VALUE || rowsToShow >= filteredCount ? ALL_ROWS_VALUE : rowsToShow
        }
        onChange={(e) => {
          const raw = e.target.value
          onRowsToShowChange(raw === ALL_ROWS_VALUE ? ALL_ROWS_VALUE : Number(raw))
        }}
        style={{ width: 90 }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </CFormSelect>
      <span>
        Showing {visibleCount} of {filteredCount}
        {showFiltered ? <span className="ms-1">(filtered from {totalCount})</span> : null}
      </span>
      {showPagination ? (
        <>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {lastPage}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary"
            disabled={currentPage >= lastPage}
            onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}
          >
            Next
          </button>
        </>
      ) : null}
    </div>
  )
}

export default DataTableFooter
