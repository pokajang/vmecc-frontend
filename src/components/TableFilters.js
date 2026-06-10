import React, { useEffect, useMemo, useState } from 'react'
import {
  CBadge,
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  COffcanvas,
  COffcanvasBody,
  COffcanvasHeader,
  COffcanvasTitle,
  CRow,
} from '@coreui/react'
import { Filter, X } from 'lucide-react'
import TablePeriodSelect, { getPeriodOptions } from 'src/components/TablePeriodSelect'

/**
 * Generic filter bar with search + selects + clear.
 * Props:
 *  - searchValue, onSearchChange, searchPlaceholder
 *  - filters: [{ key, label, value, onChange, options: [{label, value}] }]
 *  - onClear, clearLabel
 */
const TableFilters = ({
  searchValue = '',
  onSearchChange = () => {},
  searchPlaceholder = 'Search',
  filters = [],
  periodValue = 'all',
  onPeriodChange = () => {},
  periodOptions = null,
  showPeriod = true,
  onClear = () => {},
  clearLabel = 'Clear',
  rowClassName = '',
  autoWidth = true,
  searchColMd = 4,
  periodColMd = 2,
  filterColMd = 3,
  clearColMd = 2,
}) => {
  const [localSearch, setLocalSearch] = useState(searchValue)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    setLocalSearch(searchValue)
  }, [searchValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchValue) {
        onSearchChange(localSearch)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [localSearch, onSearchChange, searchValue])

  const isStructuredFilterActive = useMemo(() => {
    if (showPeriod && periodValue && periodValue !== 'all') return true
    return filters.some((f) => {
      const firstOptionValue = f.options?.[0]?.value
      return f.value !== undefined && f.value !== firstOptionValue
    })
  }, [showPeriod, periodValue, filters])

  const activeStructuredFilterCount = useMemo(() => {
    let count = showPeriod && periodValue && periodValue !== 'all' ? 1 : 0
    filters.forEach((f) => {
      const firstOptionValue = f.options?.[0]?.value
      if (f.value !== undefined && f.value !== firstOptionValue) count += 1
    })
    return count
  }, [showPeriod, periodValue, filters])

  const isAnyFilterActive = useMemo(() => {
    if (localSearch.trim()) return true
    return isStructuredFilterActive
  }, [localSearch, isStructuredFilterActive])

  const resolvedPeriodOptions = periodOptions || getPeriodOptions()
  const selectClassName = autoWidth ? 'w-auto' : ''
  const buttonClassName = autoWidth ? 'w-auto' : 'w-100 w-md-auto'
  const searchColProps = autoWidth
    ? { xs: 12, md: true, className: 'flex-grow-1' }
    : { xs: 12, md: searchColMd }
  const periodColProps = autoWidth ? { xs: 6, md: 'auto' } : { xs: 6, md: periodColMd }
  const filterColProps = autoWidth ? { xs: 6, md: 'auto' } : { xs: 6, md: filterColMd }
  const clearColProps = autoWidth ? { xs: 12, md: 'auto' } : { xs: 12, md: clearColMd }
  const mobileSearchColProps = autoWidth ? { xs: true, className: 'flex-grow-1' } : { xs: true }

  const handleClear = () => {
    onClear()
    setMobileFiltersOpen(false)
  }

  const renderPeriodControl = ({ mobile = false } = {}) =>
    showPeriod ? (
      <div className={mobile ? 'd-grid gap-1' : ''}>
        {mobile ? <CFormLabel className="small text-body-secondary mb-0">Period</CFormLabel> : null}
        <TablePeriodSelect
          value={periodValue}
          onChange={onPeriodChange}
          options={resolvedPeriodOptions}
          className={mobile ? 'w-100' : selectClassName}
        />
      </div>
    ) : null

  const renderFilterControl = (filter, { mobile = false } = {}) => (
    <div key={filter.key} className={mobile ? 'd-grid gap-1' : ''}>
      {mobile ? (
        <CFormLabel className="small text-body-secondary mb-0">
          {filter.label || 'Filter'}
        </CFormLabel>
      ) : null}
      <CFormSelect
        size="sm"
        value={filter.value}
        onChange={(e) => filter.onChange(e.target.value)}
        className={mobile ? 'w-100' : selectClassName}
      >
        {filter.options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </CFormSelect>
    </div>
  )

  return (
    <>
      <CRow className={`g-2 mb-3 align-items-center ${rowClassName}`.trim()}>
        <CCol
          {...mobileSearchColProps}
          className={`${mobileSearchColProps.className || ''} d-md-none`.trim()}
        >
          <CFormInput
            size="sm"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </CCol>
        {(showPeriod || filters.length > 0 || isAnyFilterActive) && (
          <CCol xs="auto" className="d-md-none">
            <CButton
              size="sm"
              color={isStructuredFilterActive ? 'primary' : 'secondary'}
              variant={isStructuredFilterActive ? undefined : 'outline'}
              className="position-relative d-inline-flex align-items-center justify-content-center"
              style={{ width: 34, height: 34 }}
              onClick={() => setMobileFiltersOpen(true)}
              aria-label="Open filters"
            >
              <Filter size={16} />
              {activeStructuredFilterCount > 0 ? (
                <CBadge
                  color="danger"
                  className="position-absolute top-0 start-100 translate-middle rounded-pill"
                  style={{ fontSize: '0.6rem' }}
                >
                  {activeStructuredFilterCount}
                </CBadge>
              ) : null}
            </CButton>
          </CCol>
        )}

        <CCol
          {...searchColProps}
          className={`${searchColProps.className || ''} d-none d-md-block`.trim()}
        >
          <CFormInput
            size="sm"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </CCol>

        {showPeriod && (
          <CCol {...periodColProps} className="d-none d-md-block">
            {renderPeriodControl()}
          </CCol>
        )}

        {filters.map((filter) => (
          <CCol key={filter.key} {...filterColProps} className="d-none d-md-block">
            {renderFilterControl(filter)}
          </CCol>
        ))}

        {isAnyFilterActive && (
          <CCol {...clearColProps} className="d-none d-md-flex justify-content-md-end">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              className={buttonClassName}
              onClick={onClear}
            >
              {clearLabel}
            </CButton>
          </CCol>
        )}
      </CRow>

      <COffcanvas
        visible={mobileFiltersOpen}
        onHide={() => setMobileFiltersOpen(false)}
        placement="bottom"
        className="table-filter-drawer d-md-none"
      >
        <COffcanvasHeader>
          <COffcanvasTitle>Filters</COffcanvasTitle>
          <CButton
            color="link"
            className="p-1 text-body-secondary"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          >
            <X size={18} />
          </CButton>
        </COffcanvasHeader>
        <COffcanvasBody>
          <div className="d-grid gap-3">
            {renderPeriodControl({ mobile: true })}
            {filters.map((filter) => renderFilterControl(filter, { mobile: true }))}
            {isAnyFilterActive ? (
              <CButton size="sm" color="secondary" variant="outline" onClick={handleClear}>
                {clearLabel}
              </CButton>
            ) : null}
          </div>
        </COffcanvasBody>
      </COffcanvas>
    </>
  )
}

export default TableFilters
