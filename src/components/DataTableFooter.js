import React, { useId } from 'react'
import { CFormLabel, CFormSelect } from '@coreui/react'

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
  showRowsPerPage = true,
  showFilteredFrom = true,
  currentPage = 1,
  lastPage = 1,
  onPageChange = null,
  compactMobile = false,
  className = '',
}) => {
  const rowsSelectId = useId()
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
      className={`data-table-footer${compactMobile ? ' data-table-footer--compact-mobile' : ''} vmecc-meta d-flex flex-wrap justify-content-end align-items-center gap-2 text-muted mt-2 ${className}`.trim()}
    >
      {showRowsPerPage ? (
        <div className="data-table-footer__page-size-control d-inline-flex align-items-center gap-2">
          <CFormLabel htmlFor={rowsSelectId} className="mb-0">
            {compactMobile ? <span className="d-md-none">View</span> : null}
            <span className={compactMobile ? 'd-none d-md-inline' : ''}>Rows per page</span>
          </CFormLabel>
          <CFormSelect
            id={rowsSelectId}
            size="sm"
            className="data-table-footer__page-size"
            value={rowsToShow}
            onChange={(e) => {
              const raw = e.target.value
              onRowsToShowChange(raw === ALL_ROWS_VALUE ? ALL_ROWS_VALUE : Number(raw))
            }}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </CFormSelect>
        </div>
      ) : null}
      <span className="data-table-footer__summary" aria-live="polite">
        {compactMobile ? (
          <>
            <span className="d-none d-md-inline">Showing </span>
            {visibleCount} of {filteredCount}
          </>
        ) : (
          `Showing ${visibleCount} of ${filteredCount}`
        )}
        {showFiltered ? (
          <span className="data-table-footer__filtered-context ms-1">
            (filtered from {totalCount})
          </span>
        ) : null}
      </span>
      {showPagination ? (
        <div
          className="d-inline-flex flex-wrap align-items-center justify-content-end gap-2"
          role="group"
          aria-label="Table pagination"
        >
          <button
            type="button"
            className="data-table-footer__page-action btn btn-sm btn-outline-secondary"
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
            className="data-table-footer__page-action btn btn-sm btn-outline-secondary"
            disabled={currentPage >= lastPage}
            onClick={() => onPageChange(Math.min(lastPage, currentPage + 1))}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default DataTableFooter
